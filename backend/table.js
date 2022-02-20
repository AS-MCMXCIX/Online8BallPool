import {Collision, detectNextCollisionTime, resolveBallBallCollision, resolveBallRailCollision, Ball} from "./utilities.js";
import {CollisionTypes, Constants, States, BallGroup} from "./macros.js";

export const EIGHT_BALL_POOL_BALLS_POSITION = (() => {
    let eps = 5;
    let ball_positions = new Array(Constants.NUM_8_BALL_POOL_BALLS);
    let dx = Math.sqrt(3);
    let d = Constants.EIGHT_BALL_POOL_BALL_RADIUS + eps;
    let ballsOrder = [4, 12, 14, 5, 11, 10, 6, 13, 3, 9, 7, 2, 8, 1, 0];
    //let colors = ['pink', 'blueviolet', '#ccac00', '#0000cc', '#cc0000', '#3c0068', '#cc3700', '#1b6f1b', '#660000', '#000000'];

    let x0 = 0.75 * Constants.TABLE_WIDTH;
    let y0 = Constants.TABLE_HEIGHT / 2;
    let c = 0;
    for (let i = 0; i < 5; ++i) {
        let ballNum = ballsOrder[i];
        ball_positions[ballNum + 1] = [x0 + 4 * dx * d, y0 - 4 * d + i * 2 * d];
    }
    c = 5;
    for (let i = 0; i < 4; ++i) {
        let ballNum = ballsOrder[i + c];
        ball_positions[ballNum + 1] = [x0 + 3 * dx * d, y0 - 3 * d + i * 2 * d];
    }
    c = 9;
    for (let i = 0; i < 3; ++i) {
        let ballNum = ballsOrder[i + c];
        ball_positions[ballNum + 1] = [x0 + 2 * dx * d, y0 - 2 * d + i * 2 * d];
    }
    c = 12;
    for (let i = 0; i < 2; i++) {
        let ballNum = ballsOrder[i + c];
        ball_positions [ballNum + 1] = [x0 + dx * d, y0 - d + i * 2 * d];
    }
    let ballNum = ballsOrder[14];

    ball_positions[ballNum + 1] = [x0, y0];
    ball_positions[0] = [x0 - Constants.TABLE_WIDTH / 2, y0];
    return ball_positions;
})();

export class TableState {
    constructor(match) {
        this.balls = [];
        this.initBalls();
        this.match = match;
        this.unassignedBalls = [];
        this.breakShotDone = false;
        this.ballInHand = true;
    }

    initBalls() {
        let balls = new Array(Constants.NUM_8_BALL_POOL_BALLS);
        for (let i = 0; i < Constants.NUM_8_BALL_POOL_BALLS; ++i) {
            let p = EIGHT_BALL_POOL_BALLS_POSITION[i];
            balls[i] = new Ball(p[0], p[1], i);
        }
        this.balls = balls;
    }

    reset() {
        this.balls.length = 0;
        this.unassignedBalls.length = 0;
        this.breakShotDone = false;
        this.ballInHand = true;
    }

    get currPlayer() {
        return this.match.currPlayer;
    }

    /**
     * @returns boolean : is ball type the same as player ball group
     *
     * */
    setBallInHand(val = true) {
        this.ballInHand = val;
    }

    scoreBall(ballNum) {
        if (ballNum === 0)
            return false;
        let currPlayer = this.match.currPlayer;
        let otherPlayer = this.match.otherPlayer;

        if (currPlayer.ballGroup === BallGroup.SOLID) {
            if (ballNum <= 8) {
                currPlayer.score(ballNum);
                return true;
            } else {
                otherPlayer.score(ballNum);
            }
        } else if (currPlayer.ballGroup === BallGroup.STRIPES) {
            if (ballNum >= 8) {
                currPlayer.score(ballNum);
                return true;
            } else {
                otherPlayer.score(ballNum);
            }
        } else {
            this.unassignedBalls.push(ballNum);
            return true;
        }
        return false;
    }

    hitCueBall(vx, vy) {
        let cue = this.balls[0];
        cue.velocity.x = vx;
        cue.velocity.y = vy;
        return this.advanceTable();
    }

    captureBallsState() {
        let ballsState = new Array(this.balls.length);
        for (let i = 0; i < this.balls.length; ++i) {
            ballsState[i] = this.balls[i].serialize();
        }
        return ballsState;
    }

    // advance table until there is no movement
    advanceTable() {
        let ballsStates = [this.captureBallsState()];
        let collisions = [new Collision(CollisionTypes.NO_COLLISION, 0, [])];
        let pocketCue = false;
        while (true) {
            let collision = detectNextCollisionTime(this.balls,
                Constants.EIGHT_BALL_POOL_BALL_RADIUS,
                Constants.FRICTION_ACCELERATION,
                [0, 0],
                [Constants.TABLE_WIDTH, Constants.TABLE_HEIGHT],
                Constants.POCKETS_POSITIONS,
                Constants.POCKET_RADIUS);
            if (collision.collisionType === CollisionTypes.BallPocket && !pocketCue &&
                (collision.collisionParticipants[0] === 0)) {
                pocketCue = true;
            }
            let t = this.advanceToNextCollision(collision);
            collisions.push(collision);
            ballsStates.push(this.captureBallsState());
            if (collision.collisionType === CollisionTypes.NO_COLLISION && collision.collisionParticipants.length === 0) {
                collision.deltaT = t;
                break;
            }
        }
        if (pocketCue) {
            this.balls[0].state = States.ON_TABLE;
            this.balls[0].velocity.mul(0);
            this.balls[0].x = Constants.TABLE_WIDTH / 4;
            this.balls[0].y = Constants.TABLE_HEIGHT / 2;
        }
        return [collisions, ballsStates];
    }

    setBallVelocity(ballNumber, v) {
        this.balls[ballNumber].velocity.x = v.x;
        this.balls[ballNumber].velocity.y = v.y;
    }

    advanceToNextCollision(collision) {
        let max_t = -1;
        for (let i = 0; i < this.balls.length; ++i) {
            let ball = this.balls[i];
            if (ball.state === States.ON_TABLE) {
                let t = ball.advanceInTime(collision.deltaT);
                if (t > max_t)
                    max_t = t;
            }
        }
        let b1, b2;
        switch (collision.collisionType) {
            case CollisionTypes.BallBall:
                b1 = this.balls[collision.collisionParticipants[0]];
                b2 = this.balls[collision.collisionParticipants[1]];
                resolveBallBallCollision(b1, b2, Constants.EIGHT_BALL_POOL_BALL_RADIUS);
                break;
            case CollisionTypes.BallRail:
                b1 = this.balls[collision.collisionParticipants[0]];
                resolveBallRailCollision(b1, Constants.EIGHT_BALL_POOL_BALL_RADIUS, collision.collisionParticipants[1]);
                break;
            case CollisionTypes.BallPocket:
                b1 = this.balls[collision.collisionParticipants[0]];
                b1.state = States.IN_POCKET;
                break;
            case CollisionTypes.NO_COLLISION:
                if (collision.collisionParticipants.length === 0)
                    this.setTableStatic();
                break;
        }
        return max_t;
    }

    setTableStatic() {
        for (let i = 0; i < this.balls.length; ++i) {
            let ball = this.balls[i];
            ball.velocity.x = 0;
            ball.velocity.y = 0;
        }
    }
}