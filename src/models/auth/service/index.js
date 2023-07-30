import database from "../../../database";
import { CreateUserDTO } from "../../users/dto"
import { UserService } from "../../users/service"
import { redisClient, smtpTransport } from "../../../utils";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export class AuthService{
    userService;

    constructor(){
        this.userService = new UserService();
    }

    async register(props){
        const emailExist = await this.userService.checkUserByEmail(props.email);
        
        if(emailExist) throw { status: 400, message: "이미 가입되어있는 이메일 입니다."};

        //createDTO사용해서 유저 생성
        const newUserId = await this.userService.createUser(
            new CreateUserDTO({
                ...props,

                password: await props.hashPassword(),
            })
        );
        
        const accessToken = jwt.sign({ id: newUserId }, process.env.JWT_KEY,{

            expiresIn:"2h",
        });
        const refreshToken = jwt.sign({ id: newUserId }, process.env.JWT_KEY,{
            expiresIn:"14d",
        });
        console.log({ accessToken, refreshToken });

        await redisClient.set(newUserId, refreshToken);
        await redisClient.expire(newUserId, 60 * 60 * 24 * 14);

        return { accessToken, refreshToken };
    }

    async login(props){
        const emailExist = await this.userService.checkUserByEmail(props.email);

        if(!emailExist) throw { status:404, message:"이메일을 잘못 입력했습니다."};

        const isPasswdCorrect = await props.comparePassword(emailExist.password);

        if(!isPasswdCorrect) throw { status:400, message:"비밀번호를 잘못 입력했습니다."};
        
        const accessToken = jwt.sign({ id: emailExist.id }, process.env.JWT_KEY,{
            expiresIn:"2h",
        });
        const refreshToken = jwt.sign({ id: emailExist.id }, process.env.JWT_KEY,{
            expiresIn:"14d",
        });
        
        await redisClient.set(emailExist.id, refreshToken);
        await redisClient.expire(emailExist.id, 60 * 60 * 24 * 14);

        return { accessToken, refreshToken };
    }

    async logout(email, accessToken) {
        const emailExist = await this.userService.checkUserByEmail(email);
        const expiration = await this.getExpiration(accessToken);

        console.log(expiration);
        await redisClient.del(emailExist.id);
        await redisClient.set(accessToken, "logout");
        await redisClient.expire(accessToken, expiration);
    }


    async refresh(accessToken, refreshToken) {
        const accessTokenPayload = jwt.verify(accessToken, process.env.JWT_KEY,{
            ignoreExpiration: true,
        });
        const refreshTokenPayload = jwt.verify(refreshToken, process.env.JWT_KEY);

        if (accessTokenPayload.id !== refreshTokenPayload.id){
            throw { status: 403, message:"권한이 없습니다."};
        }

        const user = await this.userService.findUserById(accessTokenPayload.id);

        const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_KEY,{
            expiresIn:"2h",
        });
        const newRefreshToken = jwt.sign({ id: user.id }, process.env.JWT_KEY,{
            expiresIn:"14d",
        });

        return{
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }

    async deleteUser(userId){
        const user = await database.user.findUnique({
            where: {
              id: userId,
            },
          });
        
        await database.user.delete({
            where:{
                id:user.id
            }
        });
    }

    async sendMail(university_email, authNum) {
        const mailOptions = {
            from: "5959kop@naver.com",
            to: university_email,
            subject:"이메일 인증 번호",
            html: '<h1>인증번호를 입력해주세요</h1>' + authNum
        }

        const emailExist = await this.userService.checkUserByUniEmail(university_email);
        
        if(emailExist) throw { status: 400, message: "이미 가입되어있는 이메일 입니다."};
        
        const emailPattern = /@.*ac\.kr$/;
        const isEmailVaild = emailPattern.test(university_email);
        
        if(!isEmailVaild) throw {status: 404, message: "학교 이메일 형식이 아닙니다."};

        await smtpTransport.sendMail(mailOptions);
        await redisClient.set(university_email, authNum);
        await redisClient.expire(university_email, 180);
    }

    async generateRandomNum(){
        const min = 1000;
        const max = 9999;

        const randomNum = Math.floor(Math.random()*(max-min+1)) + min;
        return randomNum;
    }

    async getExpiration(accessToken){
        try {
            const decodedToken = jwt.verify(accessToken, process.env.JWT_KEY);
            const now = Math.floor(Date.now() / 1000);
        
            if (decodedToken.exp) {

                const remainingTime = decodedToken.exp - now;
                return remainingTime;
            } else {
                throw new Error('Token has no "exp" claim');
            }

        } catch(err){
            console.log("Error", err.message);
            throw err;
        }
    }
}
