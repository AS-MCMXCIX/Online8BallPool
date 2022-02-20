import dotenv from 'dotenv';
import express from 'express';
import {ParseServer} from 'parse-server';
import ParseDashboard from 'parse-dashboard';
import {createServer} from 'http';
import cors from 'cors'
import cloudCode from './cloud/main.js';
import path from "path";
import bodyParser from 'body-parser';
import {GameHandler} from "./main.js";
import {Server} from "socket.io"
import timeoutCallback from "timeout-callback"
import {Timeouts} from "./macros.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

dotenv.config();

const app = express();

const init = () => {
    const redisConn = {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    };

    // const addJobScheduler = () => {
    //     const opts = { connection: redisConn, JOB_QUEUE_NAME: process.env.JOB_QUEUE_NAME };
    //     Parse.JobScheduler = {
    //         scheduler: new ParseJobScheduler(opts),
    //         worker: new ParseJobWorker(opts),
    //     };
    //     Parse.JobScheduler.worker.run();
    // };
    //
    // addJobScheduler(); // Parse job scheduler

};


const configServer = () => {
    const api = new ParseServer({
        databaseURI: process.env.PARSE_SERVER_DATABASE_URI,
        cloud: cloudCode,
        appId: process.env.PARSE_APP_ID,
        masterKey: process.env.PARSE_MASTER_KEY,
        fileKey: process.env.PARSE_FILE_KEY,
        serverURL: process.env.PARSE_SERVER_URL,
        publicServerURL: process.env.PARSE_SERVER_URL,
        liveQuery: {
            classNames: (process.env.PARSE_LIVE_QUERY || '').split(','),
            redisURL: 'redis://' + process.env.REDIS_HOST + ':' + process.env.REDIS_PORT,
        },
        idempotencyOptions: {
            paths: ['.*'],       // enforce for all requests
            ttl: 300             // keep request IDs for 300s
        },
        appName: process.env.APP_NAME,
        verifyUserEmails: false,
        enableAnonymousUsers: false,
        allowClientClassCreation: false,
        schemaCacheTTL: 720000, // 12*60*1000
        emailVerifyTokenValidityDuration: 24 * 60 * 60, // in seconds (2 hours = 7200 seconds)
        preventLoginWithUnverifiedEmail: false,
        // emailAdapter: emailAdapter({
        //     from: process.env.SUPPORT_EMAIL,
        // })
    });
    app.use(process.env.SERVER_PATH, api);
};

const configDashboard = () => {
    var options = {allowInsecureHTTP: true};
    var dashboard = new ParseDashboard(
        {
            apps: [
                {
                    serverURL: process.env.PARSE_SERVER_URL,
                    appId: process.env.PARSE_APP_ID,
                    masterKey: process.env.PARSE_MASTER_KEY,
                    appName: process.env.APP_NAME,
                },
            ],
            users: [
                {
                    user: process.env.DASHBOARD_ADMIN,
                    pass: process.env.DASHBOARD_PASS,
                },
            ],
        },
        options
    );


    app.use(process.env.DASHBOARD_PATH, dashboard);
};

function initMatchPrompter() {
    let f = () => {
        setTimeout(() => {
            promptMatchToPlayers();
            f();
        }, 100);
    };
    f();
}

async function initializeMatch(p1, p2, matchId) {
    let match = await gameHandler.initNextMatch(p1, p2, matchId);
    let emitData1 = {
        playerNum:0,
        gameToken: match.players[0].gameToken,
        matchId: matchId,
        players: [match.players[0].serialize(), match.players[1].serialize()],
        firstPlayerNum: match.currPlayer.num
    };
    let emitData2 = {
        playerNum:1,
        gameToken: match.players[1].gameToken,
        matchId: matchId,
        players: [match.players[0].serialize(), match.players[1].serialize()],
        firstPlayerNum: match.currPlayer.num
    };
    p1.args.socket.emit('goToGame', emitData1, timeoutCallback(Timeouts.ACK_TIMEOUT, function (err, ackMessage, arg2) {
        console.log(`goToGame Message: ${ackMessage}`);
    }));
    p2.args.socket.emit('goToGame', emitData2, timeoutCallback(Timeouts.ACK_TIMEOUT, function (err, ackMessage, arg2) {
        console.log(`goToGame Message: ${ackMessage}`);
    }));
}

function promptMatchToPlayers() {
    if (gameHandler.matchmakingQueue.size < 2)
        return;
    gameHandler.promptNextMatch().then((args) => {

        let [matchId, p1, p2] = args;
        console.log(`Prompting match ${matchId} to ${p1.id}, ${p2.id}`);
        let responses = [-1, -1]

        async function handler() {
            switch (responses[1] * 2 + responses[0]) {
                case 0:
                    gameHandler.unpromptMatch(matchId);
                    console.log("Both Refused.")
                    break;
                case 1 :
                    p1.args.socket.emit("stayInQueue");
                    gameHandler.unpromptMatch(matchId);
                    gameHandler.restoreNode(p1);
                    console.log(`player ${p2.id} refused`);
                    break;
                case 2:
                    p2.args.socket.emit("stayInQueue");
                    gameHandler.unpromptMatch(matchId);
                    gameHandler.restoreNode(p2);
                    console.log(`player ${p1.id} refused`);
                    break;
                case 3:
                    p1.args.socket.emit("awaitMatchInitialization");
                    p2.args.socket.emit("awaitMatchInitialization");
                    initializeMatch(p1, p2, matchId);
                    break;
            }
        }

        p1.args.socket.emit('matchPrompt', timeoutCallback(Timeouts.ACCEPT_MATCH_TIMEOUT, async function (err, ackMessage, arg2) {
            console.log(`matchPrompt Message: ${ackMessage}`);
            if (ackMessage === "OK") {
                responses[0] = 1;
                if (responses[1] !== -1) {
                    await handler();
                }
            } else {
                responses[0] = 0;
                if (responses[1] !== -1) {
                    await handler();
                }
            }
        }));
        p2.args.socket.emit('matchPrompt', timeoutCallback(Timeouts.ACCEPT_MATCH_TIMEOUT, async function (err, ackMessage, arg2) {
            console.log(`matchPrompt Message: ${ackMessage}`);
            if (ackMessage === "OK") {
                responses[1] = 1;
                if (responses[0] !== -1) {
                    await handler();
                }
            } else {
                responses[1] = 0;
                if (responses[0] !== -1) {
                    await handler();
                }
            }
        }));
    });
}

const listen = () => {
    let httpServer = createServer(app);
    httpServer.listen(process.env.PARSE_PORT, () => console.log(`Server running on port ${process.env.PARSE_PORT}.`));
    let parseLiveQueryServer = ParseServer.createLiveQueryServer(httpServer, {
        redisURL: 'redis://' + process.env.REDIS_HOST + ':' + process.env.REDIS_PORT,
    });
    let urlencodedParser = bodyParser.json();
    app.use("/css", express.static(path.resolve(__dirname + "/../frontend/css/").toString()));
    app.use("/lib", express.static(path.resolve(__dirname + "/../frontend/lib/").toString()));
    app.use("/fonts", express.static(path.resolve(__dirname + "/../frontend/fonts/").toString()));
    app.use("/login", express.static(path.resolve(__dirname + "/../frontend/login.html").toString()));
    app.use("/game", express.static(path.resolve(__dirname + "/../frontend/game.html").toString()));
    app.use("/main", express.static(path.resolve(__dirname + "/../frontend/main.html").toString()));
    app.use("/queue", express.static(path.resolve(__dirname + "/../frontend/matchmaking_queue.html").toString()));
    app.use("/res", express.static(path.resolve(__dirname + "/../frontend/res/").toString()));
    app.use("/src", express.static(path.resolve(__dirname + "/../frontend/src/").toString()));
    app.use("/signup", express.static(path.resolve(__dirname + "/../frontend/signup.html").toString()));
    // app.post('/calc', urlencodedParser, (req, res) => {
    //     req.setTimeout(3 * 1000);
    //     console.log(res.send(({ans: req.body.that * 2})));
    // });
    // app.post('/nq', urlencodedParser, (req, res) => {
    //     req.setTimeout(3 * 1000);
    //     gameHandler.queuePlayer();
    //     console.log(res.send(({ans: req.body.that * 2})));
    // });
    const notificationServer = createServer(app);
    notificationServer.listen(1337);
    notificationSocket = new Server(notificationServer, {
        cors: {
            origin: "http://localhost:1338",
            methods: ["GET", "POST"],
        }
    });
    notificationSocket.on('connection', (socket) => {
        if (socket.handshake.query.reason === 'game') {
            let {matchId, gameToken} = socket.handshake.query;
            let player = gameHandler.getPlayer(matchId, gameToken);
            if (player !== null) {
                player.socket = socket;
            }
        }
        socket.emit('notify', 'connected to queue'); //message sent from server to client
        socket.on('handlePlayerAction', (data, ack) => {
            let {matchId, gameToken, action} = data;
            let res;
            if (gameHandler.matches.has(matchId)) {
                let num = gameHandler.getPlayer(matchId, gameToken).num;
                gameHandler.handlePlayerAction(matchId, num, action);
            }
            if (ack) {
                ack("OK");
            }
        });
        socket.on('nq', async function (data) {
            let query = await new Parse.Query("_Session")
                .equalTo('sessionToken', data)
                .first({useMasterKey: true});
            if (query) {
                try {
                    await gameHandler.queuePlayer(query.get("user").id, socket);
                    socket.emit('nqd', timeoutCallback(Timeouts.ACCEPT_MATCH_TIMEOUT, function (err, ackMessage, arg2) {
                        console.log(ackMessage);
                    }));
                } catch (e) {
                    console.log(e);
                }
            }
        });
        socket.on('dq', async function (data) {
            let query = await new Parse.Query("_Session")
                .equalTo('sessionToken', data)
                .first({useMasterKey: true});
            if (query) {
                try {
                    let id = query.get('user').id;
                    await gameHandler.dequeuePlayer(id);
                    console.log(`dequeued player with id ${id}`);
                    socket.emit('dqd', 'removed from queue');
                } catch (e) {
                    console.log(e);
                }
            }
        });

    });
    notificationSocket.on('disconnect', (socket) => {
        socket.emit('notify', 'disconnected from queue'); //message sent from server to client
    });

};
export let gameHandler;
export let notificationSocket;
const run = () => {
    gameHandler = new GameHandler();
    init();
    app.use(cors());
    configServer();
    configDashboard();
    listen();
    initMatchPrompter();
};

run();
