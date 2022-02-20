import {BallGroup, CollisionTypes, foulsMeta, foulsMetaLen} from "./macros.js";

export class GameEventHandler {
    constructor(tableState) {
        this.ballsCollidedWithRail = new Set();
        this.tableState = tableState;
    }

    cue_collide_no_ball(e) {
        if (e.collisionType === CollisionTypes.BallBall && (e.collisionParticipants[0] === 0 || e.collisionParticipants[1] === 0))
            return false;
        return null;
    }

    cue_collide_no_target_ball_first(e) {
        if (this.tableState.currPlayer.ballGroup === BallGroup.NO_GROUP)
            return false;
        if (e.collisionType === CollisionTypes.BallBall) {
            if (e.collisionParticipants[0] === 0) {
                return this.isOtherGroup(e.collisionParticipants[1]);
            }
            if (e.collisionParticipants[1] === 0) {
                return this.isOtherGroup(e.collisionParticipants[0]);
            }
        }
        return null;
    }

    no_ball_collide_rail_or_pocket(e) {
        if (e.collisionType === CollisionTypes.BallPocket || e.collisionType === CollisionTypes.BallRail)
            return false;
        return null;
    }

    pocket_no_ball_and_less_than_4_collide_rail(e) {
        if (e.collisionType === CollisionTypes.BallRail) {
            if (e.collisionParticipants[0] !== 0) {
                this.ballsCollidedWithRail.add(e.collisionParticipants[0]);
                if (this.ballsCollidedWithRail.size > 3)
                    return false;
            }
        } else if (e.collisionType === CollisionTypes.BallPocket && e.collisionParticipants[0] !== 0)
            return false;
        return null;
    }

    pocket_8(e) {
        if (e.collisionType === CollisionTypes.BallPocket && e.collisionParticipants[0] === 8)
            return true;
        return null;
    }

    pocket_cue(e) {
        if (e.collisionType === CollisionTypes.BallPocket && e.collisionParticipants[0] === 0)
            return true;
        return null;
    }

    isOtherGroup(num) {
        let oneRemaining = this.tableState.currPlayer.scoredBalls.length === 7;
        if (this.playerGroup === BallGroup.STRIPES)
            return oneRemaining ? num < 8 : num <= 8;
        else
            return oneRemaining ? num > 8 : num >= 8;
    }

    detectPocketedBalls(events) {
        let pocketedBalls = [];
        for (let e of events) {
            if (e.collisionType === CollisionTypes.BallPocket)
                pocketedBalls.push(e.collisionParticipants[0]);
        }
        return pocketedBalls;
    }

    detectFouls(events, playerGroup) {
        this.playerGroup = playerGroup;
        let rulesToCheck =
            [
                [this.cue_collide_no_ball.bind(this), foulsMeta.CUE_HIT_NO_BALL],
                [this.pocket_8.bind(this), foulsMeta.POCKET_8],
                [this.cue_collide_no_target_ball_first.bind(this), foulsMeta.HIT_NON_TARGET_BALL_FIRST],
                [this.no_ball_collide_rail_or_pocket.bind(this), foulsMeta.NO_COLLISION_WITH_RAIL_OR_POCKET],
                [this.pocket_cue.bind(this), foulsMeta.POCKET_CUE]
            ];
        if (!this.tableState.breakShotDone) {
            rulesToCheck.push([this.pocket_no_ball_and_less_than_4_collide_rail.bind(this), foulsMeta.POCKET_NO_BALL_AND_LESS_THAN_4_HIT_RAIL])
        }

        let fLen = this.tableState.breakShotDone ? foulsMetaLen - 1 : foulsMetaLen;
        let answers = new Array(foulsMetaLen);
        let default_answers = [true, false, true, true, false, true];

        for (let e of events) {
            for (const f of rulesToCheck) {
                if (answers[f[1]] != null)
                    continue;
                let ans = f[0](e);
                if (ans !== null) {
                    answers[f[1]] = ans;
                }
            }
        }
        let fouls = new Set();
        for (let i = 0; i < fLen; i++) {
            if (answers[i] === true) {
                fouls.add(i);
            } else if (answers[i] == null) {
                if (default_answers[i]) {
                    fouls.add(i);
                }
            }
        }
        return fouls;
    }

    handleEvents(events) {
        let fouls = this.detectFouls(events, this.tableState.currPlayer.ballGroup);
        let that = this;
        return {fouls: fouls, pocketedBalls: that.detectPocketedBalls(events)};
    }

    reset() {
        this.ballsCollidedWithRail.clear();
    }
}
