class BilliardBall {
    constructor(x, y, r, boundary, number) {
        this.radius = r;
        this.velocity = new Vector(0, 0);
        this.boundary = boundary;
        this.m = 0.01 * this.radius ** 3;
        this.shape = null;
        this.number = number;
        this.existent = true;
        let shape = ImageLoader.loadBall(number);
        shape.scale(r * 2 / shape.bounds.width);
        shape.position = new Point(x, y);
        this.shape = shape;
    }

    get x() {
        return this.shape.position.x;
    }

    get y() {
        return this.shape.position.y;
    }

    set x(val) {
        this.shape.position.x = val;
    }

    set y(val) {
        this.shape.position.y = val;
    }

    collides(b) {
        let dx = this.x - b.x;
        let dy = this.y - b.y;
        let r = this.radius + b.radius;
        return dx * dx + dy * dy <= r * r;
    }
}

class BallContainer {
    constructor(r, x, y) {
        this.r = r;
        this.x = x;
        this.y = y;
        let shape = new Raster();
        shape.image = images.ballContainerImage;
        shape.scale(this.r * 2.26 / shape.bounds.width);
        shape.position += new Point(x, shape.bounds.height / 2 + r + y);
        this.ballsInside = 0;
        this.balls = new Map();
        this.shape = shape;
    }

    updateBallsList(list) {
        for (let i of list) {
            if (!this.balls.has(i)) {
                this.insertBall(i);
            }
        }
    }

    insertBall(num) {
        if (this.balls.has(num))
            throw "Ball Already Inside";
        let shape = ImageLoader.loadBall(num);
        shape.scale(2 * this.r / shape.bounds.width);
        shape.position.x = this.x;
        let dh = (8 - this.ballsInside) * 0.125 * this.shape.bounds.height;
        shape.position.y = this.y + dh - 2;
        this.balls.set(num, shape);
        ++this.ballsInside;
    }

    removeBall(num) {

    }

    clear() {
        for (let shape of this.balls.values()) {
            shape.remove();
        }
        this.ballsInside = 0;
        this.balls.clear();
    }
}


let ImageLoader = new function () {
    function ImageLoader() {
        return this;
    }

    let img = new window.Image();
    img.src = resAddress + '/balls/cue.png';
    let ballsImages = new Map([
        [0, img]
    ]);
    for (let i = 1; i <= 8; ++i) {
        img = new window.Image();
        img.src = resAddress + `/balls/solid${i}.png`;
        ballsImages.set(i, img);
    }
    for (let i = 9; i <= 15; ++i) {
        img = new window.Image();
        img.src = resAddress + `/balls/stripes${i}.png`;
        ballsImages.set(i, img);
    }
    ImageLoader.loadBall = function (number) {
        if (number < 0 || number > 15)
            throw "wrong number";
        let res = new Raster();
        res.image = ballsImages.get(number);
        return res;
    };
    return ImageLoader;
};

class StickPowerIndicator {
    constructor(x, y, w, h) {
        this.shape = this.createStickPowerIndicator(x, y, w, h);
        this.state = false;
        this.animation = this.createAnimation();
    }

    toggleState() {
        if (this.state === false) {
            this.animation.reset();
            animationRequests.add(this.animation);
        } else {
            this.animation.remove = true;
        }
        this.state = !this.state;
        return this.state;
    }

    createStickPowerIndicator(x, y, w, h) {
        let back = new Path.Rectangle(new Point(x, y), w, h);
        back.fillColor = 'white';
        this.hasActiveAnimation = false;
        this.maxP = h * 0.9;
        this._m = 1;
        this.powerIndicator = new Path.Rectangle(new Point(x + 0.25 * w, y + 0.05 * h), w / 2, this.maxP);
        this.powerIndicator.fillColor = new Color(this.m, 1 - this.m, 0);
        return new Group([back, this.powerIndicator]);
    }

    set m(m) {
        let h = m * this.maxP;
        this.powerIndicator.position.y += (this._m - m) * this.maxP;
        this.powerIndicator.bounds.height = h + 0.0001; // TODO: h wont work (why?????), had to manipulate it
        this.powerIndicator.fillColor = new Color(1, 1 - m, 0);
        this._m = m;
    }

    get m() {
        return this._m;
    }

    remove() {
        this.shape.remove();
        this.animation = null;
    }

    createAnimation() {
        if (this.hasActiveAnimation)
            return null;
        this.hasActiveAnimation = true;
        let indicator = this;
        return {
            remove: false,
            deltaM: 0.01,
            reset: function () {
                indicator.m = 0;
                this.remove = false;
                this.deltaM = 0.01;
            },
            progress: function () {
                let m = indicator.m;
                if (m + this.deltaM > 1 || m + this.deltaM < 0)
                    this.deltaM = -this.deltaM;
                indicator.m += this.deltaM;
                return this.remove;
            },
            onFinish: function () {
            }
        };
    }
}

class Stick {
    constructor(x, y, width) {
        this.x = x;
        this.y = y;
        let shape = new Raster();
        shape.image = images.stickImage;
        shape.scale(width / shape.bounds.width);
        this.width = shape.bounds.width;
        this.height = shape.bounds.height;
        this.shape = shape;
        this.draggable = true;
    }

    setRotation(angle) {
        this.shape.rotate(angle - this.shape.rotation);
    }
}

let init = false;

class Table {
    constructor(x, y, width) {
        this.playGround = new Rectangle(new Point(x, y), width, width / 2);
        this.x = x;
        this.y = y;
        this.scale = width / Constants.TABLE_WIDTH;
        this.width = width;
        this.ballRadius = Constants.EIGHT_BALL_POOL_BALL_RADIUS * this.scale;
        this.players = [];
        this.eventListeners = [];
        this.pockets = [];
        for (let j = 0; j < 2; j++) {
            for (let i = 0; i < 3; i++) {
                this.pockets.push(new Point(i * (width / 2) + x, j * (width / 2) + y));
                //new Path.Circle(this.holes[j], 10).fillColor = 'red';
            }
        }

        let img = images.tableImage;
        let shape = new Raster();
        shape.image = img;
        shape.scale(this.totalWidth / shape.bounds.width);
        shape.position += new Point(shape.bounds.width / 2 + x - this.outerWidth, shape.bounds.height / 2 + y - this.outerWidth);
        this.shape = shape;
        this.stick = new Stick(500, 500, width / 1.5);


        this.ballContainers = [
            new BallContainer(this.ballRadius, x - 2 * this.outerWidth, y),
            new BallContainer(this.ballRadius, x + this.totalWidth, y)
        ];
        this.resetStateVars();
        init = true;
    }

    resetStateVars() {
        this.balls = [];
        this.ballsEnteringPocket = 0;
        this.currMatch = null;
        this.state = null;
        this.breakShotDone = false;
        this.stick.shape.visible = false;
        this.stick.draggable = true;
        this.ballContainers.forEach(bc => bc.clear());
        this.ballInHand = false;
        this.freezeRequests = 0;
    }

    get currPlayer() {
        return this.players[this.currPlayerIdx];
    }

    get footSpot() {
        return new Point(this.x + this.playGround.width * 3 / 4, this.y + this.playGround.height / 2);
    }

    get centerSpot() {
        return new Point(this.x + this.playGround.width / 2, this.y + this.playGround.height / 2);
    }

    get headSpot() {
        return new Point(this.x + this.playGround.width / 4, this.y + this.playGround.height / 2);
    }

    initPlayers(p1, p2) {
        this.players = [p1, p2];
    }

    removeBall(idx, pocketIndex) {
        this.balls[idx].existent = false;
        return this.pocketBall(idx, pocketIndex);
    }

    fadeout(g) {
        animationRequests.add({
            type: 'fade-out', node: g, duration: 30, curr: 0, progress: function () {
                this.node.opacity = (this.duration - this.curr) / this.duration;
                ++this.curr;
                return this.curr > this.duration;
            }
        });
    }

    pocketBall(ballIndex, pocketIndex = 0) {
        if (this.balls.length <= ballIndex || ballIndex < 0)
            return false;
        let ball = this.balls[ballIndex];
        let pocketPosition = this.pockets[pocketIndex];
        let l = Math.min(60, Math.max(Math.round((ball.shape.position - pocketPosition).length * 3 / ball.velocity.magnitude()), 20));
        ++this.ballsEnteringPocket;
        if (ball.number === 0)
            this.removeCueListeners();
        let that = this;

        ball.velocity.mul(0);
        // ball.velocity=0;
        // this.events.add({
        //     collisionType: CollisionTypes.BallPocket,
        //     deltaT: 0,
        //     collisionParticipants: [ball.number, pocketIndex]
        // });

        // this animation translates and scales the ball to mimic ball entering pocket
        let animation = new PaperAnimation('transcale', l, ball.shape);
        animation.progress = function () {
            let c = (this.duration - this._curr) / this.duration;
            this.node.position += (pocketPosition - this.node.position) * (1 - c);
            this.node.scale(c);
            ++this._curr;
            // if (animation is finished)
            if (this._curr > this.duration) {
                this.node = null;
                return true;
            }
            return false;
        };
        animation.onFinish = function () {
            ball.shape.remove();
            --that.ballsEnteringPocket;
        };
        animationRequests.add(animation);
        return true;
    }

    get pocketRadius() {
        return this.scale * Constants.POCKET_RADIUS;
    }

    get railWidth() {
        return this.playGround.width * 0.02;
    }

    get outerWidth() {
        return this.playGround.width * 0.05;
    }

    get totalWidth() {
        return 1.1 * this.playGround.width;
    }

    get totalHeight() {
        return 0.6 * this.playGround.width;
    }

    isMyTurn() {
        return this.currPlayerIdx === globals.playerNum;
    }

    init8BallPoolMatch(currPlayerIdx) {
        // check if there is a match going on
        if (this.currMatch !== null)
            return;
        this.currPlayerIdx = 1 - currPlayerIdx;
        this.togglePlayer();
        this.currMatch = "8ballpool";

        this.breakShotDone = false;
        this.balls = this.make8BallPoolBalls(this.ballRadius);

        this.sequenceAnimator = new SequenceAnimator(this);
        let cueBall = this.balls[0];
        this.phantomCueBall = new Path.Circle(new Point(-100, -100), cueBall.radius);
        this.trackingLine = new Path.Line(new Point(0, 0), new Point(0, 0));
        this.trackingLine.strokeColor = 'white';
        this.trackingLine.strokeWidth = 1.5;
        this.trackingLine.dashArray = [10, 12];
        this.phantomCueBall.fillColor = 'white';

        this.phantomCueBall.opacity = 0.5;
        this.stickPowerIndicator = new StickPowerIndicator(100, 200, 20, 300);

        if (currPlayerIdx === globals.playerNum)
            this.setBallInHand(true);
        this.draggingCue = false;

        let mouseMoved;
        let mouseDown;
        let container = document.getElementById('container');

        this.addCueListeners();
        let downListener = () => {
            if (this.frozen)
                return;
            mouseMoved = false;
            mouseDown = true;
        };
        let moveListener = e => {
            if (this.frozen || !this.isMyTurn())
                return;
            let dx = mouseX - e.pageX;
            let dy = mouseY - e.pageY;
            // if it moved more than a bit
            if (dx * dx + dy * dy > 0.1) {
                mouseMoved = true;
                if (!this.draggingCue && mouseDown && this.state === AWAITING_SHOT && this.stick.draggable && cueBall.existent) {
                    this.repositionStickBehindCue();
                }
                mouseX = e.pageX;
                mouseY = e.pageY;
            }
        };
        let upListener = () => {
            if (this.frozen)
                return;
            mouseDown = false;
        };
        let e1 = e => {
            if (this.frozen)
                return;
            if (e.code === 'Space' && this.isMyTurn() && cueBall.existent && this.stick.draggable && this.sequenceAnimator.isStatic) {
                if (!this.stickPowerIndicator.toggleState()) {
                    let dx = cueBall.x - this.stick.shape.position.x;
                    let dy = cueBall.y - this.stick.shape.position.y;
                    let d2 = Math.sqrt(dx * dx + dy * dy);
                    let that = this;
                    this.ballInHand = false;
                    this.stick.draggable = false;
                    let animation = new PaperAnimation('translate', 40, this.stick.shape);
                    let delta = (cueBall.shape.position - this.stick.shape.position) * 0.05 * this.stickPowerIndicator.m;
                    animation.progress = function () {
                        let c = (this._curr) / this.duration;
                        let sgn = c < 0.5 ? 1 : -2;
                        this.node.position = this.node.position - delta * sgn;
                        this._curr += c < 0.5 ? 1.5 * GLOBAL_TIME_MULTIPLIER : 3 * GLOBAL_TIME_MULTIPLIER;
                        if (this._curr > this.duration) {
                            this.node = null;
                            return true;
                        }
                        return false;
                    };
                    let v_len = this.stickPowerIndicator.m * Constants.MAX_BALL_VELOCITY;
                    // Todo: await server response
                    this.updateState(SERVER_ANALYZING_EVENTS);

                    globals.requestSocket.emit('handlePlayerAction', {
                            matchId: globals.matchId,
                            gameToken: globals.gameToken,
                            action: {type: Actions.Break, args: [(dx / d2) * v_len, (dy / d2) * v_len]}
                        },
                        timeoutCallback(Timeouts.SERVER_ACTION_HANDLE, function (err, ackMessage) {
                            that.updateState(ANIMATING_STICK_HIT);
                            animation.onFinish = function () {
                                ballHitAudio.play();
                            };
                            animationRequests.add(animation);
                            console.log(`handlePlayerAction Message: ${ackMessage}`);
                        }));
                }
            }
        };

        //track mouse position as it is not possible to get it without an event
        this.eventListeners = [];
        this.eventListeners.push(['mousedown', downListener]);
        this.eventListeners.push(['mousemove', moveListener]);
        this.eventListeners.push(['mouseup', upListener]);
        this.eventListeners.push(['keydown', e1]);
        container.addEventListener('mousedown', downListener);
        container.addEventListener('mousemove', moveListener);
        container.addEventListener('mouseup', upListener);
        document.addEventListener('keydown', e1);
        this.updateState(AWAITING_SHOT);
    }

    play() {
        appState = 'play';
        if (this.isMyTurn()) {
            this.enableStick();
            this.repositionStickBehindCue();
        }
        this.unfreeze();
    }

    pause() {
        appState = 'pause';
        this.disableStick();
        this.freeze();
    }

    removeCueListeners() {
        let cueBall = this.balls[0];
        cueBall.shape.onMouseDrag = null;
        cueBall.shape.onMouseUp = null;
        this.draggingCue = false;
        this.ballInHand = false;
    }

    addCueListeners() {
        let cueBall = this.balls[0];
        this.draggingCue = false;
        cueBall.shape.onMouseDrag = () => {
            if (this.frozen)
                return;
            if (this.ballInHand && this.state !== ANIMATING_EVENTS) {
                this.draggingCue = true;
                this.repositionCueToMousePosition();
            } else {
                console.log("not able to drag cue");
            }
        };
        cueBall.shape.onMouseUp = () => {
            if (this.frozen || !this.ballInHand) {
                return;
            }
            globals.requestSocket.emit('handlePlayerAction', {
                    matchId: globals.matchId,
                    gameToken: globals.gameToken,
                    action: {type: Actions.RepositionCue, args: this.toBackendScale(cueBall.x, cueBall.y)}
                },
                timeoutCallback(Timeouts.SERVER_ACTION_HANDLE, function (err, ackMessage) {
                    console.log(`handlePlayerAction Message: ${ackMessage}`);
                }));
            this.draggingCue = false;
        };
    }

    toBackendScale(x, y) {
        return [(x - this.x) / this.scale, (y - this.y) / this.scale];
    }

    recreateCueShape() {
        let hs = this.headSpot;
        let cueBall = this.balls[0];
        let shape = ImageLoader.loadBall(0);
        shape.scale(cueBall.radius * 2 / shape.bounds.width);
        shape.position = hs;
        cueBall.shape = shape;
    }

    reset() {
        if (this.currMatch === "8ballpool") {
            appState = 'resetting_match';
            let l = this.eventListeners.length - 1;
            for (let i = 0; i < l; i++) {
                document.getElementById('container').removeEventListener(this.eventListeners[i][0], this.eventListeners[i][1]);
            }
            document.removeEventListener(this.eventListeners[l][0], this.eventListeners[l][1]);

            this.sequenceAnimator.destruct();
            this.removeCueListeners();
            for (let ball of this.balls) {
                ball.shape.remove();
            }
            this.phantomCueBall.remove();
            this.trackingLine.remove();
            this.stickPowerIndicator.remove();
            appState = 'pause';
            animationRequests.clear();
            this.players.forEach(p => p.reset());
            this.resetStateVars();
        }
    }

    isInside(x, y) {
        return x >= this.x + this.ballRadius && x <= this.x - this.ballRadius + this.playGround.width
            && y >= this.y + this.ballRadius && y <= this.y - this.ballRadius + this.playGround.height;

    }

    isOnOtherBall(x, y) {
        let r = this.ballRadius * 2;
        r *= r;
        for (let i = 1; i < this.balls.length; i++) {
            let ball = this.balls[i];
            if (ball.existent) {
                let dx = ball.x - x;
                let dy = ball.y - y;

                if (dx * dx + dy * dy <= r)
                    return true;
            }
        }
        return false;
    }

    repositionCueToMousePosition() {
        let cue = this.balls[0];
        if (this.isInside(mouseX, mouseY) && !this.isOnOtherBall(mouseX, mouseY)) {
            cue.shape.position.x = mouseX;
            cue.shape.position.y = mouseY;
        }
    }

    repositionStickBehindCue() {
        let cueBall = this.balls[0];
        if (!cueBall.existent)
            return;
        let dx = cueBall.x - mouseX;
        let dy = cueBall.y - mouseY;
        let angle = getAngle(dy, dx);
        let mouseLocation = new Point({
            angle: angle,
            length: this.stick.width / 2 + 30
        });
        this.stick.shape.position.x = cueBall.shape.position.x - mouseLocation.x;
        this.stick.shape.position.y = cueBall.shape.position.y - mouseLocation.y;
        this.stick.setRotation(angle);

        let points = this.getNextCollisionPoint(mouseLocation, cueBall.shape.position);
        let phPoint = points[0];
        this.trackingLine.segments[0].point = cueBall.shape.position;
        if (phPoint !== null && !isNaN(phPoint.x)) {
            this.phantomCueBall.position = phPoint;
            this.phantomCueBall.visible = true;
            this.phantomCueBall.bringToFront();
            if (this.currPlayer.canHit(points[1])) {
                this.phantomCueBall.fillColor = 'white';
            } else {
                this.phantomCueBall.fillColor = 'red';
            }
            this.trackingLine.segments[1].point = phPoint;
        } else {
            let pt = this.getBoundaryCollisionPoint(mouseLocation, cueBall.shape.position);
            this.phantomCueBall.visible = false;
            this.trackingLine.segments[1].point = pt;
        }
    }

    disableStick() {
        this.stick.draggable = false;
        this.trackingLine.visible = false;
        this.phantomCueBall.visible = false;
        this.stick.shape.visible = false;
    }

    get frozen() {
        return this.freezeRequests > 0;
    }

    freeze() {
        this.freezeRequests++;
    }

    unfreeze() {
        if (this.freezeRequests > 0)
            this.freezeRequests--;
    }

    enableStick() {
        this.stick.draggable = true;
        this.stick.shape.visible = true;
        this.trackingLine.visible = true;
        this.stick.shape.bringToFront();
    }

    applyState() {
        switch (this.state) {
            case ANIMATING_STICK_HIT:
                this.stick.shape.visible = true;
                break;
            case AWAITING_SHOT:
                if (this.currPlayerIdx !== globals.playerNum)
                    return;
                this.enableStick();
                this.repositionStickBehindCue();
                break;
            case ANIMATING_EVENTS:
                this.stick.shape.visible = false;
                break;
            case SERVER_ANALYZING_EVENTS:
                this.disableStick();
                break;
        }
    }

    getBoundaryCollisionPoint(v, p0) {
        let w = this.playGround.width;
        let h = this.playGround.height;
        let x1 = this.playGround.x;
        let x2 = this.playGround.x + w;
        let y1 = this.playGround.y;
        let y2 = this.playGround.y + h;

        let t, y, x;

        if (v.x !== 0) {
            if (v.x < 0) {
                x = x1;
                t = (x - p0.x) / v.x;
                y = t * v.y + p0.y;
                if (y >= y1 && y <= y2)
                    return new Point(x, y);
            } else {
                x = x2;
                t = (x - p0.x) / v.x;
                y = t * v.y + p0.y;
                if (y >= y1 && y <= y2)
                    return new Point(x, y);
            }
        }
        if (v.y !== 0) {
            if (v.y < 0) {
                y = y1;
                t = (y - p0.y) / v.y;
                x = t * v.x + p0.x;
                if (x >= x1 && x <= x2)
                    return new Point(x, y);
            } else {
                y = y2;
                t = (y - p0.y) / v.y;
                x = t * v.x + p0.x;
                if (x >= x1 && x <= x2)
                    return new Point(x, y);
            }
        }
        return null;
    }

    getNextCollisionPoint(vector, p0) {
        let chosenPoint = null;
        let neighborBall = null;
        for (let i = 1; i < this.balls.length; i++) {
            let ball = this.balls[i];
            if (!ball.existent)
                continue;
            let dp = new Point(ball.x - p0.x, ball.y - p0.y);

            let cos = Vector.innerProduct(vector, dp) / (vector.length * dp.length);
            let angle = Math.acos(cos);
            let t;
            if (angle < Math.PI / 2 && dp.length * Math.sin(angle) < 2 * ball.radius) {
                let a = vector.length * vector.length;
                let b = -2 * Vector.innerProduct(vector, dp);
                let c = dp.length * dp.length - 4 * ball.radius * ball.radius;
                t = solveQuadratic(a, b, c);
                if (t.length > 0)
                    t = t[0];
                else
                    t = NaN;
            } else
                continue;
            if (isNaN(t))
                continue;
            let chosenCandidate = new Point(t * vector.x + p0.x, t * vector.y + p0.y);
            if (chosenPoint == null) {
                chosenPoint = chosenCandidate;
                neighborBall = ball.number;
                continue;
            }
            if ((chosenCandidate - p0).length < (chosenPoint - p0).length) {
                chosenPoint = chosenCandidate;
                neighborBall = ball.number;
            }
        }
        return [chosenPoint, neighborBall];
    }

    // triangular
    make8BallPoolBalls() {
        let eps = 5 * this.scale;
        let balls = new Array(Constants.NUM_8_BALL_POOL_BALLS);
        let dx = 3 ** 0.5;
        let d = this.ballRadius + eps;
        //TODO SOOOOOON
        let ballsOrder = [4, 12, 14, 5, 11, 10, 6, 13, 3, 9, 7, 2, 8, 1, 0];
        //let colors = ['pink', 'blueviolet', '#ccac00', '#0000cc', '#cc0000', '#3c0068', '#cc3700', '#1b6f1b', '#660000', '#000000'];
        let footSpot = this.footSpot;
        let x0 = footSpot.x;
        let y0 = footSpot.y;
        let c = 0;
        for (let i = 0; i < 5; ++i) {
            let ballNum = ballsOrder[i];
            let ball = new BilliardBall(x0 + 4 * dx * d, y0 - 4 * d + i * 2 * d, this.ballRadius, this.playGround, ballNum + 1);
            balls[ballNum + 1] = ball;
        }
        c = 5;
        for (let i = 0; i < 4; ++i) {
            let ballNum = ballsOrder[i + c];
            let ball = new BilliardBall(x0 + 3 * dx * d, y0 - 3 * d + i * 2 * d, this.ballRadius, this.playGround, ballNum + 1);
            balls[ballNum + 1] = ball;
        }
        c = 9;
        for (let i = 0; i < 3; ++i) {
            let ballNum = ballsOrder[i + c];
            let ball = new BilliardBall(x0 + 2 * dx * d, y0 - 2 * d + i * 2 * d, this.ballRadius, this.playGround, ballNum + 1);
            balls[ballNum + 1] = ball;
        }
        c = 12;
        for (let i = 0; i < 2; i++) {
            let ballNum = ballsOrder[i + c];
            let ball = new BilliardBall(x0 + dx * d, y0 - d + i * 2 * d, this.ballRadius, this.playGround, ballNum + 1);
            balls[ballNum + 1] = ball;
        }
        let ballNum = ballsOrder[14];
        let meta = ballsColorMeta[ballNum];

        let ball = new BilliardBall(x0, y0, this.ballRadius, this.playGround, ballNum + 1);
        balls[ballNum + 1] = ball;
        let cueBall = new BilliardBall(x0 - this.playGround.width / 2, y0, this.ballRadius, this.playGround, 0);
        balls[0] = cueBall;

        return balls;
    }

    togglePlayer() {
        this.currPlayerIdx = -this.currPlayerIdx + 1;
        document.getElementById(`p${this.currPlayerIdx + 1}-div`).style.backgroundColor = '#da0606';
        document.getElementById(`p${-this.currPlayerIdx + 2}-div`).style.backgroundColor = '#343a40';
    }

    updateScoreBoard() {
        document.getElementById("score").innerHTML = `${this.players[0].roundWins} - ${this.players[1].roundWins}`;

    }

    declareRoundLoss(p, nextPlayer) {
        this.announce(`${this.players[-p + 1].username} Wins Round.`, 3000);
        this.players[1 - p].roundWins++;
        this.updateScoreBoard();
        this.reset();
        this.init8BallPoolMatch(nextPlayer);
        this.play();
    }

    declareGameLoss() {
        let p = globals.playerNum;
        this.announce(`${this.players[1-p].username} Wins Game.`, 3000);
        this.players[p].roundWins++;
        this.updateScoreBoard();
        this.reset();
        setTimeout(()=>window.location.href = "/queue", 4000);
    }

    declareGameWin() {
        let p = globals.playerNum;
        this.announce(`${this.players[p].username} Wins Game.`, 3000);
        this.players[p].roundWins++;
        this.updateScoreBoard();
        this.reset();
        setTimeout(()=>window.location.href = "/queue", 4000);
    }

    declareRoundWin(p, nextPlayer) {
        this.announce(`${this.players[p].username} Wins Round.`, 3000);
        this.players[p].roundWins++;
        this.updateScoreBoard();
        this.reset();
        this.init8BallPoolMatch(nextPlayer);
        this.play();
    }

    declareFouls(fouls) {
        console.log("declaring fouls");
        let t = 100;
        let dt = 1000;
        for (const foul of fouls) {
            setTimeout(() => {
                this.announce(foulsMessages[foul], dt);
            }, t);
            t += dt + 30;
        }
    }

    setBallInHand(val = true) {
        this.ballInHand = val;
    }

    announce(msg, timeout) {
        document.getElementById('game-events-announcer').style.visibility = "visible";
        document.getElementById('game-event-text').innerText = msg;
        setTimeout(() => {
            document.getElementById('game-events-announcer').style.visibility = "hidden";
        }, timeout);
    }

    updatePlayerBalls(playerNum, balls) {
    }

    updateState(state) {
        if (state === this.state)
            return;
        if (state === SERVER_ANALYZING_EVENTS && this.state !== AWAITING_SHOT)
            return;
        if (state === ANIMATING_EVENTS) {
        }
        this.state = state;
        this.applyState();
    }

    update() {
        if (this.state === SERVER_ANALYZING_EVENTS) {
        } else if (this.state === ANIMATING_EVENTS) {
            let animationFinished = this.sequenceAnimator.progress(DELTA_T_PER_FRAME);
            if (animationFinished && this.ballsEnteringPocket === 0) {
                this.updateState(FINALIZING_TURN);
            }
        } else if (this.state === FINALIZING_TURN) {
            if (animationFinishedAck !== null) {
                animationFinishedAck("done");
                animationFinishedAck = null;
            }
            let [result, nextPlayerNum, fouls, player0Balls, player1Balls] = this.sequenceAnimator.onFinishArgs;
            let currPlayer = this.currPlayer;

            if (currPlayer.ballGroup === BallGroup.NO_GROUP && player0Balls[0] !== BallGroup.NO_GROUP) {
                this.players[0].ballGroup = player0Balls[0];
                this.players[1].ballGroup = player1Balls[0];
            }
            if (currPlayer.ballGroup !== BallGroup.NO_GROUP) {
                player0Balls.splice(0, 1);
                player1Balls.splice(0, 1);
                this.ballContainers[0].updateBallsList(player0Balls);
                this.ballContainers[1].updateBallsList(player1Balls);
                this.players[0].scoredBalls = player0Balls;
                this.players[1].scoredBalls = player1Balls;
            }

            this.breakShotDone = true;
            switch (result) {
                case EndOfTurnEvents.FoulDetected:
                    this.declareFouls(fouls);
                    if (globals.playerNum === nextPlayerNum)
                        this.setBallInHand();
                    break;
                case EndOfTurnEvents.Loss:
                    this.declareRoundLoss(currPlayer.num, nextPlayerNum);
                    break;
                case EndOfTurnEvents.Win:
                    this.declareRoundWin(currPlayer.num, nextPlayerNum);
                    break;
                case EndOfTurnEvents.GameWin:
                    this.declareGameWin();
                    return;
                    break;
                case EndOfTurnEvents.GameLoss:
                    this.declareGameLoss();
                    return;
                    break;
            }
            if (result < 2 && currPlayer.num !== nextPlayerNum)
                this.togglePlayer();

            this.updateState(AWAITING_SHOT);
        } else if (this.state === AWAITING_SHOT) {
            // if cue was pocketed
            if (!this.balls[0].existent) {
                this.balls[0].existent = true;
                this.recreateCueShape();
                this.addCueListeners();
                this.repositionStickBehindCue();
            }
        }
    }
}

function getAngle(dy, dx) {
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;   //radians
    angle = 360 + angle;
    return angle;
}

let animationRequests = new LinkedList();
let table;
let appState = null;
let fpsMeter = new FPSMeter(document.getElementById("fps"), 15);
let animationFinishedAck = null;
let eventsData = null;

function main() {
    let x = (windowWidth - tableWidth) / 2;
    let y = 0.25 * windowHeight;
    appState = 'pause';
    table = new Table(x, y, tableWidth);
    window.table = table;
    fpsMeter.start();
    listenToEvents();
}

function listenToEvents() {
    globals.requestSocket.on('handleTurnEvents', (data, ack) => {
        let [result, nextPlayer, fouls, player0Balls, player1Balls, animationSequence] = data;
        table.sequenceAnimator.setAnimationSequence(animationSequence);
        table.sequenceAnimator.onFinishArgs = [result, nextPlayer, fouls, player0Balls, player1Balls];
        animationFinishedAck = ack;
        table.updateState(ANIMATING_EVENTS);
    });
    globals.requestSocket.on('repositionCue', (data, ack) => {
        let cue = table.balls[0];
        cue.shape.position.x = data[0] * table.scale + table.x;
        cue.shape.position.y = data[1] * table.scale + table.y;
        ack("done");
    });
}

function onFrame() {
    frame = (frame + 1) % 60;
    fpsMeter.update();
    if (appState !== 'play') {
        return;
    }
    if (table.frozen) {
        return;
    }
    table.update();
    if (animationRequests.size > 0) {
        let it = animationRequests.iterator();
        while (it.hasNext()) {
            let animation = it.next();
            if (animation.progress()) {
                animation.onFinish();
                it.remove();
            }
        }
    }
}

globals.main = main;

