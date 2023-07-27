export class StoreWishlistDTO{
    storeId;
    name;
    rank;
    status;
    score;
    reviewCount;
    distance;
    imageUrl;
    reviewSample;

    constructor(props){
        this.storeId = props.id;
        this.name = props.name;
        this.distance = props.distance;
        this.imageUrl = props.imageUrl;
        this.rank = props.rank;
        this.status = props.status;
        this.score = props.score;
        this.reviewCount = props.reviewCount;
        this.reviewSample = props.reviewSample;
    }
}