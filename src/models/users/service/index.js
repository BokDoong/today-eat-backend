import e from "express";
import database from "../../../database";
import { NoticesDTO, UserDetailDTO, UserDTO } from "../dto";
import { InquiryDTO } from "../dto/inquiry/inquiry.dto";
import { InquirysDTO } from "../dto/inquiry/inquirys.dto";

export class UserService {

  // 회원정보 상세조회
  async getUserDetail(userId) {
    const user = await database.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        campers: {
          include: {
            university: true,
          },
        },
      },
    });

    if(!user) throw { status: 404, message: "사용자를 찾을 수 없습니다."};

    return new UserDetailDTO(user);
  }

  // 회원정보 조회
  async getUser(userId) {
    const user = await database.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        campers: {
          include: {
            university: true,
          },
        },
      },
    });

    if(!user) throw { status: 404, message: "사용자를 찾을 수 없습니다."};

    return new UserDTO(user);
  }

  // 닉네임 수정
  async updateNickName(newNickName, userId) {

    const user = await database.user.findUnique({
      where: {
        id: userId,
      },
    });

    if(!user) throw { status: 404, message: "사용자를 찾을 수 없습니다."};

    // 닉네임 중복여부 확인
    const check = await database.user.findUnique({
      where: {
        nickname: newNickName
      },
    });

    if(check == null) {
      await database.user.update({
        where: {
          id: user.id,
        },
        data: {
          nickname: newNickName,
        },
      });
    } else {
      throw { status: 405, message: "중복된 닉네임입니다."};
    }
  }

  // 이메일 수정
  async updateEmail(newEmail, userId) {

    const user = await database.user.findUnique({
      where: {
        id: userId,
      },
    });

    if(!user) throw { status: 404, message: "사용자를 찾을 수 없습니다."};

    // 이메일 중복여부 확인
    const check = await database.user.findUnique({
      where: {
        email: newEmail
      },
    });

    if(check == null) {
      await database.user.update({
        where: {
          id: user.id,
        },
        data: {
          email: newEmail,
        },
      });
    } else {
      throw { status: 405, message: "중복된 이메일입니다."};
    }
  }

  // 비밀번호 수정
  async updatePassword(props, userId) {

    const user = await database.user.findUnique({
      where: {
        id: userId,
      },
    });

    if(!user) throw { status: 404, message: "사용자를 찾을 수 없습니다."};

    // 기존의 비밀번호와 같은지 검사
    const check = await props.comparePassword(user.password);
    if(check) {
      await database.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: await props.hashPassword(),
        },
      });
    } else {
      throw { status: 400, message: "기존의 비밀번호와 일치하지 않습니다."};
    }
  }

  // 프로필 이미지 변경
  async updateImage(updateImageUrl, userId) {

    const user = await database.user.findUnique({
      where: {
        id: userId,
      },
    });

    if(!user) throw { status: 404, message: "사용자를 찾을 수 없습니다."};

    await database.user.update({
      where: {
        id: user.id,
      },
      data: {
        imageURL: updateImageUrl,
      },
    });
  }

  // 문의 답변하기
  async createInquiryResponse(props) {

    const inquiry = await database.inquiry.findUnique({
      where: {
        id: props.inquiryId,
      },
    });

    if(!inquiry) throw { status: 404, message: "문의글을 찾을 수 없습니다."};

    // 이미 있으면 수정
    if(inquiry.inquiryResponse !== null) {
      const updatedInquiryResponse = await database.inquiryResponse.update({
        where: {
          inquiryId: inquiry.id,
        },
        data: {
          content: props.content,
        },
      });

      return updatedInquiryResponse.id;
    }

    // 답변 생성
    const newInquiryResponse = await database.inquiryResponse.create({
      data: {
        content: props.content,
        inquiry: {
          connect: {
            id: inquiry.id,
          },
        },
      },
    });

    // 상태 변경
    await database.inquiry.update({
      where: {
        id: inquiry.id,
      },
      data: {
        status: 'DONE',
      },
    });

    return newInquiryResponse.id;
  }

  // 개별 문의확인
  async getInquiry(id) {
    const inquiry = await database.inquiry.findUnique({
      where: {
        id,
      },
      include: {
        inquiryImages: true,
        inquiryResponse: true,
      },
    });

    if(!inquiry) throw { status: 404, message: "문의글을 찾을 수 없습니다." };

    return new InquiryDTO(inquiry);
  }

  // 전체 문의확인
  async getInquirys(statusValue, userId) {

    // 쿼리파라미터 검사
    if (statusValue !== 'WAITING' && statusValue !== 'DONE')
      throw {status: 404, message: "잘못된 Status 입니다."};

    const inquirys = await database.inquiry.findMany({
      where: {
        status: statusValue,
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { inquirys: inquirys.map((inquiry) => new InquirysDTO(inquiry)) }
  }

  // 문의하기, props: CreateInquiryDTO
  async createInquiry(props) {
    const user = await this.findUserById(props.userId);

    const newInquiry = await database.inquiry.create({
      data: {
        title: props.title,
        content: props.content,
        status: props.status,
        user: {
          connect: {
            id: user.id,
          },
        },
        inquiryImages: {
          createMany: {
            data: props.inquiryImages.map((inquiryImage) => ({ imageUrl: inquiryImage})),
          },
        },
      },
    });

    return newInquiry.id;
  }

  // 마케팅 수신 동의
  async marketingAgree(userId, isAgree) {
    const user = await this.findUserById(userId);

    // isAgree 타입변형
    if(isAgree === "true") {
      isAgree = true;
    } else if(isAgree == "false") {
      isAgree = false;
    } else { 
      throw { status: 402, message: "입력 형식이 올바르지 않습니다."};
    }

    const isAgreed = await database.user.findMany({
      where: {
        id: userId,
      },
      select: {
        agreement: true,
      },
    });

    const isAgreedValue = isAgreed[0].agreement;
    console.log(isAgreedValue);
    console.log(isAgree);

    // 동의
    if(!isAgreedValue && isAgree) {
      await database.user.update({
        where: {
          id: user.id,
        },
        data: {
          agreement: true,
        },
      });
    }

    // 미동의
    if(isAgreedValue && !isAgree) {
      await database.user.update({
        where: {
          id: user.id,
        },
        data: {
          agreement: false,
        },
      });
    }
  }

  // 공지사항 확인
  async getNotice(typeValue) {

    // 쿼리파라미터 검사
    if (typeValue !== 'TERMS' && typeValue !== 'FAQ' && typeValue !== 'NOTICE' && typeValue !== 'MARKETING')
      throw {status: 404, message: "잘못된 Type 입니다."};

    const notices = await database.notices.findMany({
      where: {
        type: typeValue,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { notices: notices.map((notice) => new NoticesDTO(notice)) };
  }

  //유저 확인
  async findUserById(id){
    const user = await database.user.findUnique({
      where: {
        id,
      },
    });

    if(!user) throw { status: 404, message:"유저를 찾을 수 없습니다."};
    return user;
  }
  
  // 이메일 확인
  async checkUserByEmail(email){
    const user = await database.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) return false;

    return user;
  }

  // 닉네임 중복 확인
  async checkUserByNickname(nickname){
    const user = await database.user.findUnique({
      where: {
        nickname,
      },
    });

    if(!user) return false;

    return user;
  }

  //학교 이메일 확인
  async checkUserByUniEmail(university_email){
    const user = await database.user.findUnique({
      where: {
        university_email,
      },
    });

    if (!user) return false;

    return user;
  }

  // 회원가입
  async createUser(props){
    const newUser = await database.user.create({
      data: {
        email: props.email,
        name: props.name,
        nickname: props.nickname,
        university_email: props.university_email,
        imageURL:props.imageURL,
        password:props.password,
        campersId:props.campersId,
        isEmailAuth: props.isEmailAuth,
        agreement: props.agreement,
      },
    });
    
    return newUser.id;
  }

  //학교 이메일 인증 상태
  async updateEmailAuthStatus(userId, university_email){

    const user = await database.user.findUnique({
      where: {
        id: userId,
      },
    });

    if(!user) throw {status: 404, message:"사용자를 찾을 수 없습니다."}

    await database.user.update({
      where: {
        id:user.id,
       },
      data: {
        isEmailAuth: 1,
        university_email:university_email,
      },
    });
    return user.isEmailAuth;
  }

}