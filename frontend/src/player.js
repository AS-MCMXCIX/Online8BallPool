class Player {
    constructor(username, avatar) {
        this.username = username;
        this.avatar = avatar;
        this.scoredBalls = [];
        this.ballGroup = BallGroup.NO_GROUP;
        this.roundWins = 0;
        this.num = -1;
    }

    score(num) {
        this.scoredBalls.push(num);
    }

    canHit(ballNum) {
        if (this.ballGroup !== BallGroup.NO_GROUP) {
            return (
                (ballNum === 8 && this.scoredBalls.length === 7) ||
                (ballNum < 8 && this.ballGroup === BallGroup.SOLID) ||
                (ballNum > 8 && this.ballGroup === BallGroup.STRIPES)
            );
        }
        return true;
    }

    reset() {
        this.scoredBalls.length = 0;
        this.ballGroup = BallGroup.NO_GROUP;
    }
}