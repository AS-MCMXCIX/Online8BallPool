class SequenceAnimator {
    constructor(table) {
        this.table = table;
        this.balls = table.balls;
        this.fa = Constants.FRICTION_ACCELERATION * table.scale;
        this.ballsStates = null;
        this.collisions = null;
        this.animationState = null; // idx,
        this.onFinishArgs = null;
        this.isStatic = true;
    }

    setAnimationSequence(animationSequence) {
        if (this.animationState !== null)
            throw "Current Animation In Progress";
        this.isStatic = false;
        [this.ballsStates, this.collisions] = animationSequence;
    }


    /**
     * @returns boolean : is animation finished
     * */
    progress(deltaT) {
        if (this.isStatic)
            return true;
        if (this.animationState === null)
            this.animationState = [0, 0];
        let [idx, t] = this.animationState;
        let nextState = this.ballsStates[idx];
        let nextCollision = this.collisions[idx];

        let isFinalState = false;
        if (nextCollision[1] === 0) {
            deltaT = 0;
            isFinalState = true;
        } else if (deltaT > nextCollision[1] - t) {
            deltaT = nextCollision[1] - t;
            isFinalState = true;
        }
        this.animationState[1] += deltaT;
        if (deltaT > 0) {
            for (let i = 0; i < this.balls.length; ++i) {
                let ball = this.balls[i];
                if (!ball.existent)
                    continue;
                this.updateBall(ball, deltaT);
            }
        }
        if (isFinalState) {
            let v1, v2, n1 = -1;
            if (nextCollision[0] === CollisionTypes.BallBall || nextCollision[0] === CollisionTypes.BallRail) {
                n1 = nextCollision[2];
                v1 = this.balls[n1].velocity.clone();
            }
            this.assertFinalStates(nextState);
            if (nextCollision[0] === CollisionTypes.BallBall) {
                if (ballHitAudiosPlaying < 6) {
                    v2 = this.balls[n1].velocity;
                    ballHitAudiosPlaying++;
                    let volume = Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
                    volume /= 40;
                    let audio = ballHitAudio.cloneNode();
                    audio.volume = volume > 1 ? 1 : volume;
                    audio.play();
                    audio.onended = () => --ballHitAudiosPlaying;
                }
            } else if (nextCollision[0] === CollisionTypes.BallRail) {
                v2 = this.balls[n1].velocity;
                let volume = Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
                volume /= 40;
                let audio = ballHitRailAudio.cloneNode();
                audio.volume = volume > 1 ? 1 : volume;
                audio.play();
            } else if (nextCollision[0] === CollisionTypes.BallPocket) {
                this.table.removeBall(nextCollision[2], nextCollision[3]);
            }
            idx += 1;
            if (idx >= this.ballsStates.length) {
                this.animationState = null;
                this.isStatic = true;
                return true;
            }
            this.animationState[0] = idx;
            this.animationState[1] = 0;
        }
        return false;
    }

    assertFinalStates(ballsState) {
        let scale = this.table.scale;
        let x0 = this.table.playGround.x;
        let y0 = this.table.playGround.y;
        for (let i = 0; i < ballsState.length; ++i) {
            let state = ballsState[i];
            let j = state[4];
            this.balls[j].x = x0 + scale * state[0];
            this.balls[j].y = y0 + scale * state[1];
            this.balls[j].velocity.x = scale * state[2];
            this.balls[j].velocity.y = scale * state[3];
        }
    }

    updateBall(ball, deltaT) {
        let a = ball.velocity.direction();
        a.mul(-this.fa);

        let dx = ball.velocity.x * deltaT + 0.5 * a.x * deltaT * deltaT;
        let dy = ball.velocity.y * deltaT + 0.5 * a.y * deltaT * deltaT;
        ball.x += dx;
        ball.y += dy;
        a.mul(deltaT);
        if(a.magnitude() >= ball.velocity.magnitude()){
            ball.velocity.mul(0);
            return;
        }
        ball.velocity.add(a);
    }

    destruct() {
        this.table = null;
        this.balls = null;
        this.ballsStates = null;
        this.collisions = null;
        this.animationState = null; // idx,
        this.onFinishArgs = null;
        this.isStatic = true;
    }
}

// returns new ms vectors of balls after collision
// must not be inside each other
