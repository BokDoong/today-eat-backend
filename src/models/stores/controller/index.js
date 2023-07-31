import { Router } from "express";
import { storeService } from "../service";
import { UserService } from "../../users/service";
import {storeData, campersData} from "../../../utils";

class StoreController{
    router;
    path = "/api/v1/stores";
    storeService;

    constructor(){
        this.router = new Router();
        this.storeService = storeService;
        this.userService = new UserService();
        this.init();
    }

    init(){
        this.router.get("/fetch-campers-data",campersData.bind(this));
        this.router.get("/fetch-store-data",storeData.bind(this));

        
        this.router.get("/rank-sample",this.getRankSample.bind(this));
        this.router.get("/rank",this.getRank.bind(this));
        this.router.get("/category",this.getStoreByCategory.bind(this));
        
        this.router.get("/search",this.searchStore.bind(this));
        this.router.get("/recommend",this.recommendStore.bind(this));
        
        this.router.get("/wishlist",this.getWishlist.bind(this));
        this.router.post("/wishlist",this.storeWishlist.bind(this));
        
        this.router.post("/map",this.getStoresOnMap.bind(this));
        this.router.get("/map/:id",this.getStoreOnMap.bind(this));
        
        this.router.get("/reviewed",this.getReviewedStores.bind(this));
        
        this.router.get("/:id",this.getStoreDetail.bind(this));
    }


    //랭킹 샘플 조회
    getRankSample = async (req,res,next) => {
        try{
            const user = await this.userService.findUserById(req.user.id);
            const result = await this.storeService.getRankSample(user);
            
            res.status(200).json(result);
        }catch(err){
            next(err);
        }
    }

    //랭킹 조회
    getRank = async (req,res,next) => {
        try{
            const user = await this.userService.findUserById(req.user.id);
            const result = await this.storeService.getRank(user.id,user.campersId);
            
            res.status(200).json(result);
        }catch(err){
            next(err);
        }
    }

    //가게 찜하기/찜 해제
    storeWishlist = async (req,res,next) => {
        try{
            const userId = req.user.id;
            const storeId = req.body.storeId;
            const isLike = req.body.isLike;
            const wishlist = await this.storeService.storeWishlist(userId,storeId,isLike);

            res.status(200).json(wishlist);
        }catch(err){
            next(err);
        }
    }

    //카테고리별 가게 조회
    getStoreByCategory = async (req,res,next) => {
        try{
            const user = await this.userService.findUserById(req.user.id);
            let {orderby} = req.query;
            if(!orderby)orderby = "distance";
            const result = await this.storeService.getStoreByCategory(user,orderby);
            res.status(200).json(result)
        }catch(err){
            next(err);
        }
    }

    //찜한 가게 목록 조회
    getWishlist = async (req,res,next) => {
        try{
            const user = await this.userService.findUserById(req.user.id);
            const result = await this.storeService.getWishlist(user.id);

            res.status(200).json(result);
        }catch(err){
            next(err);
        }
    }

    //지도에서 가게목록 조회
    getStoresOnMap = async (req,res,next) => {
        try{
            const user = await this.userService.findUserById(req.user.id);
            const { distance, keyword, category, isOpen } = req.body;
            const stores = await this.storeService.getStoresOnMap(user,distance,keyword,category,isOpen);

            res.status(200).json(stores);
        }catch(err){
            next(err);
        }
    }

    //지도에서 가게정보 조회
    getStoreOnMap = async (req,res,next) => {
        try{
            const storeId = req.params.id;
            const store = await this.storeService.getStoreOnMap(storeId);

            res.status(200).json(store);
        }catch(err){
            next(err);
        }
    }

    //가게 검색
    searchStore = async (req,res,next) => {
        try{
            let orderby = req.query.orderby;
            if(!orderby)orderby = "distance";
            const searchWord = req.query.keyword;
            const stores = await this.storeService.searchStore(searchWord,orderby);

            res.status(200).json(stores);
        }catch(err){
            next(err);
        }
    }

    //가게 추천
    recommendStore = async (req,res,next) => {
        try{
            const user = await this.userService.findUserById(req.user.id);
            const stores = await this.storeService.recommendStore(user.campersId);
            const result = Array.from(stores);
            res.status(200).json(result);
        }catch(err){

        }
    }

    //리뷰 작성한 가게 목록
    getReviewedStores = async (req,res,next) => {
        try{
            const stores = await this.storeService.getReviewedStore(req.user.id);

            res.status(200).json(stores);
        }catch(err){
            next(err);
        }
    }

    //가게 상세 페이지
    getStoreDetail = async (req,res,next) => {
        try{
            const storeId = req.params.id;
            const detail = await this.storeService.getStoreDetail(storeId);

            res.status(200).json(detail);
        }catch(err){
            next(err);
        }
    }
}

const storeController = new StoreController();
export default storeController;