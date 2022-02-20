import {Actions, BallGroup, Constants, EndOfTurnEvents, foulsMeta, MatchStates, Timeouts, States} from "./macros.js";
import {Match} from "./match_making.js";
import {MatchmakingQueue} from "./data_structures.js";
import Player from './player.js'
import {uuidv4, generateToken} from "./utilities.js";
import AsyncLock from "async-lock";
import timeoutCallback from "timeout-callback";

const queueLock = "queueLock";
const promptLock = "promptLock";

export class GameHandler {
    constructor() {
        this.matchmakingQueue = new MatchmakingQueue();
        this.matchPrompts = new Map();
        this.matches = new Map();
        this.lock = new AsyncLock();
    }

    queuePlayer(playerId, socket) {
        this.lock.acquire(queueLock, (done) => {
            this.matchmakingQueue.NQNode(playerId, {socket: socket});
            done(null, null);
        }, {}).then(() => {
        });
    }


    dequeuePlayer(playerId) {
        return new Promise((resolve, reject) => {
            this.lock.acquire(queueLock, (done) => {
                this.matchmakingQueue.removeNodeFromQueue(playerId);
                done(null, null);
            }, {}).then(() => {
                resolve();
            });
        });
    }

    promptNextMatch() {
        if (this.matchmakingQueue.size < 2)
            throw "Not Enough Players";

        let matchId = uuidv4();
        return new Promise((resolve, reject) => {
            this.lock.acquire([queueLock, promptLock], (done) => {
                let p1 = this.matchmakingQueue.DQLastNode();
                let p2 = this.matchmakingQueue.DQLastNode();
                this.matchPrompts.set(matchId, [p1, p2]);
                done(null, [matchId, p1, p2]);
            }, {}).then((ret) => {
                resolve(ret);
            });
        });
    }

    unpromptMatch(matchId) {
        this.lock.acquire(queueLock, (done) => {
            if (this.matchPrompts.has(matchId)) {
                this.matchPrompts.delete(matchId);
            }
            done(null);
        }, (err, ret) => {
        }, {});
    }

    restoreNode(node) {
        this.lock.acquire(queueLock, (done) => {
            this.matchmakingQueue.restoreNode(node);
            done(null);
        }, (err, ret) => {
        }, {});
    }

    async initNextMatch(p1, p2, id) {
        let u1 = Parse.Object.extend("_User");
        let u2 = u1.createWithoutData(p2.id);
        u1 = u1.createWithoutData(p1.id);

        let p1Query = await new Parse.Query("Profile").equalTo('user', u1).include(["avatar", "user"]).first();
        let p2Query = await new Parse.Query("Profile").equalTo('user', u2).include(["avatar", "user"]).first();
        let player1Username = p1Query.get("user").get('username');
        let player2Username = p2Query.get("user").get('username');

        let avatar1 = p1Query.get("avatar").get("image")._url;
        let avatar2 = p2Query.get("avatar").get("image")._url;

        let gameToken1 = generateToken();
        let gameToken2 = generateToken();
        let players = new Array(2);
        players[0] = new Player(gameToken1, p1.id, player1Username, avatar1);
        players[1] = new Player(gameToken2, p2.id, player2Username, avatar2);
        players[0].num = 0;
        players[1].num = 1;
        let match = new Match(id);
        match.players = players;
        match.currPlayer = players[Math.random() > 0.5 ? 0 : 1];
        this.matches.set(id, match);
        match.state = MatchStates.AWAITING_PLAYER_ACTION;
        return match;
    }

    initTestMatch() {
        let playerIds = ["aaa", "bbb"];
        this.queuePlayer(playerIds[0]);
        this.queuePlayer(playerIds[1]);
        return this.initNextMatch();
    }

    normalizeVelocity(vx, vy) {
        let m = Constants.MAX_BALL_VELOCITY;
        let v_len = Math.sqrt(vx * vx + vy * vy);
        if (v_len > m) {
            vx *= m / v_len;
            vy *= m / v_len;
        }
        return [vx, vy]
    }

    handlePlayerAction(matchId, playerNumber, action) {
        //Todo: convert to switch case
        let match = this.matches.get(matchId);
        if (match.state === MatchStates.PLAYERS_ANIMATING_EVENTS)
            return;
        let tableState = match.tableState;
        if (action.type === Actions.Break) {
            if (playerNumber !== match.currPlayer.num)
                throw `Illegal Request:${playerNumber} != ${match.currPlayer.num}`;
            if (action.args === undefined || action.args.length < 2 || typeof action.args[0] != "number" || typeof action.args[1] != "number") {
                throw "Illegal Arguments";
            }

            let [vx, vy] = this.normalizeVelocity(action.args[0], action.args[1]);
            let [collisions, ballsStates] = tableState.hitCueBall(vx, vy);
            let [result, nextPlayer, detectedEvents] = this.handleFouls(match, collisions);
            let endOfMatch = false;
            switch (result) {
                case EndOfTurnEvents.NoEvent:
                    break;
                case EndOfTurnEvents.FoulDetected:
                    tableState.setBallInHand();
                    break;
                case EndOfTurnEvents.Loss:
                    ++match.otherPlayer.roundWins;
                    endOfMatch = match.endRound();
                    if (!endOfMatch) {
                        match.startNextRound();
                        nextPlayer = match.currPlayer;
                    }
                    break;
                case EndOfTurnEvents.Win:
                    ++match.currPlayer.roundWins;
                    endOfMatch = match.endRound();
                    if (!endOfMatch) {
                        match.startNextRound();
                        nextPlayer = match.currPlayer;
                    }
                    break;
            }
            match.currPlayer = nextPlayer;
            match.state = MatchStates.PLAYERS_ANIMATING_EVENTS;
            if (endOfMatch) {
                this.sendTurnResultsToClients([result + 2, nextPlayer.num,
                    Array.from(detectedEvents.fouls),
                    match.players[0].serializeBalls(),
                    match.players[1].serializeBalls(),
                    [ballsStates, collisions.map(c => c.serialize())]], match);
                this.finalizeMatch(match);
                return;
            }
            this.sendTurnResultsToClients([result, nextPlayer.num,
                Array.from(detectedEvents.fouls),
                match.players[0].serializeBalls(),
                match.players[1].serializeBalls(),
                [ballsStates, collisions.map(c => c.serialize())]], match);
        } else if (action.type === Actions.RepositionCue) {
            let [x, y] = action.args;
            let r = Constants.EIGHT_BALL_POOL_BALL_RADIUS * 2;
            r *= r;
            let isLegalPlacement = true;
            for (let i = 1; i < tableState.balls.length; ++i) {
                let ball = match.tableState.balls[i];
                if (ball.state === States.ON_TABLE) {
                    let dx = ball.x - x;
                    let dy = ball.y - y;
                    if (dx * dx + dy * dy <= r)
                        isLegalPlacement = false;
                }
            }
            r = Constants.EIGHT_BALL_POOL_BALL_RADIUS;
            isLegalPlacement = isLegalPlacement && (x >= r) && (x <= Constants.TABLE_WIDTH - r) && (y >= r) && (y <= Constants.TABLE_HEIGHT - r);
            if (isLegalPlacement) {
                tableState.balls[0].x = x;
                tableState.balls[0].y = y;
                this.repositionCueForClients(match, [x, y])
            }
            //TODO: inform Clients of Acceptance
        }
    }

    repositionCueForClients(match, position) {
        let players = match.players;
        let socket1 = players[0].socket;
        let socket2 = players[1].socket;
        socket1.emit('repositionCue', position, timeoutCallback(Timeouts.ANIMATING_EVENTS_TIMEOUT, function (err, ackMessage, arg2) {
            console.log(ackMessage);
        }));
        socket2.emit('repositionCue', position, timeoutCallback(Timeouts.ANIMATING_EVENTS_TIMEOUT, function (err, ackMessage, arg2) {
            console.log(ackMessage);
        }));
    }

    sendTurnResultsToClients(results, match) {
        let players = match.players;
        let socket1 = players[0].socket;
        let socket2 = players[1].socket;
        let ansCount = 0;
        socket1.emit('handleTurnEvents', results, timeoutCallback(Timeouts.ANIMATING_EVENTS_TIMEOUT, function (err, ackMessage, arg2) {
            if (ackMessage) {
                ++ansCount;
                if (ansCount === 2) {
                    match.state = MatchStates.AWAITING_PLAYER_ACTION;
                }
            }
            console.log(ackMessage);
        }));
        socket2.emit('handleTurnEvents', results, timeoutCallback(Timeouts.ANIMATING_EVENTS_TIMEOUT, function (err, ackMessage, arg2) {
            if (ackMessage) {
                ++ansCount;
                if (ansCount === 2) {
                    match.state = MatchStates.AWAITING_PLAYER_ACTION;
                }
            }
            console.log(ackMessage);
        }));
    }

    finalizeMatch(match) {
        this.matches.delete(match.id);
    }

    getPlayer(matchId, gameToken) {
        if (this.matches.has(matchId)) {
            let players = this.matches.get(matchId).players;
            for (let player of players) {
                if (player.gameToken === gameToken) {
                    return player;
                }
            }
        }
        return null;
    }

    /**
     * @returns [result, nextPlayer, detectedEvents]
     * */
    handleFouls(match, collisions) {
        let detectedEvents = match.eventHandler.handleEvents(collisions);
        let currPlayer = match.currPlayer;
        let otherPlayer = match.otherPlayer;
        let scoredBalls = 0;
        let tableState = match.tableState;
        if (tableState.breakShotDone && currPlayer.ballGroup !== BallGroup.NO_GROUP) {
            for (const ball of detectedEvents.pocketedBalls) {
                if (tableState.scoreBall(ball))
                    ++scoredBalls;
            }
        } else if (tableState.breakShotDone && currPlayer.ballGroup === BallGroup.NO_GROUP) {
            if (detectedEvents.pocketedBalls.length > 0) {
                for (const ballNum of detectedEvents.pocketedBalls) {
                    if (ballNum === 0)
                        continue;
                    if (ballNum > 8) {
                        currPlayer.ballGroup = BallGroup.STRIPES;
                        otherPlayer.ballGroup = BallGroup.SOLID;
                    } else if (ballNum < 8) {
                        currPlayer.ballGroup = BallGroup.SOLID;
                        otherPlayer.ballGroup = BallGroup.STRIPES;
                    } else {
                        tableState.breakShotDone = true;
                        // this.declareLoss(currPlayer);
                        return [EndOfTurnEvents.Loss, otherPlayer, detectedEvents]
                    }
                }
                if (currPlayer.ballGroup !== BallGroup.NO_GROUP) {
                    for (const ballNum of detectedEvents.pocketedBalls) {
                        if (tableState.scoreBall(ballNum))
                            ++scoredBalls;
                    }
                    for (const ballNum of tableState.unassignedBalls) {
                        if (tableState.scoreBall(ballNum))
                            ++scoredBalls;
                    }
                    tableState.unassignedBalls.length = 0;
                }
            }
        } else if (!tableState.breakShotDone) {
            for (const ball of detectedEvents.pocketedBalls) {
                if (ball === 0)
                    continue;
                tableState.unassignedBalls.push(ball);
                ++scoredBalls;
            }
        }

        if (detectedEvents.fouls.has(foulsMeta.POCKET_8)) {
            tableState.breakShotDone = true;
            if (currPlayer.scoredBalls.length < 8) {
                return [EndOfTurnEvents.Loss, currPlayer, detectedEvents]
            }
            return [EndOfTurnEvents.Win, currPlayer, detectedEvents];
        }

        tableState.breakShotDone = true;
        if (detectedEvents.fouls.size > 0) {
            return [EndOfTurnEvents.FoulDetected, otherPlayer, detectedEvents];
        } else if (scoredBalls !== 0) {
            return [EndOfTurnEvents.NoEvent, currPlayer, detectedEvents];
        }
        return [EndOfTurnEvents.NoEvent, otherPlayer, detectedEvents];
    }
}