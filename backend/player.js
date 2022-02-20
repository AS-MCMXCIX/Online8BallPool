import {BallGroup} from "./macros.js";

export default class Player {
    constructor(gameToken, id, username, avatar) {
        this.socket = null;
        this.gameToken = gameToken;
        this.username = username;
        this.id = username;
        this.avatar = avatar;
        this.scoredBalls = [];
        this.ballGroup = BallGroup.NO_GROUP;
        this.roundWins = 0;
        this.num = -1;
    }

    serialize() {
        return {username: this.username, avatar: this.avatar, num: this.num}
    }

    isLegalHit(ballNum) {
        if (this.ballGroup !== BallGroup.NO_GROUP) {
            return (
                ballNum === 8 && this.scoredBalls.length === 7 ||
                ballNum < 8 && this.ballGroup === BallGroup.SOLID ||
                ballNum > 8 && this.ballGroup === BallGroup.STRIPES
            );
        }
        return true;
    }

    serializeBalls() {
        let l = this.scoredBalls.slice();
        l.unshift(this.ballGroup);
        return l;
    }

    score(num) {
        this.scoredBalls.push(num);
    }

    reset() {
        this.scoredBalls = [];
        this.ballGroup = BallGroup.NO_GROUP;
    }
}