import pkg from 'complex.js';
import {Constants, CollisionTypes} from "./macros.js";
import {CollisionTypesMeta, Rails, States} from "./macros.js";
import {Vector} from "./data_structures.js";
import crypto from "crypto"
const {Complex} = pkg;

const PI = 3.141592653589793238463;
const M_2PI = 2 * PI;
const eps = 1e-12;
const MAX_T = 999999;

function solveP3(x, a, b, c) {
    let a2 = a * a;
    let q = (a2 - 3 * b) / 9;
    let r = (a * (2 * a2 - 9 * b) + 27 * c) / 54;
    let r2 = r * r;
    let q3 = q * q * q;
    let A, B;
    if (r2 < q3) {
        let t = r / Math.sqrt(q3);
        if (t < -1) t = -1;
        if (t > 1) t = 1;
        t = Math.acos(t);
        a /= 3;
        q = -2 * Math.sqrt(q);
        x[0] = q * Math.cos(t / 3) - a;
        x[1] = q * Math.cos((t + M_2PI) / 3) - a;
        x[2] = q * Math.cos((t - M_2PI) / 3) - a;
        return 3;
    } else {
        A = -Math.pow(Math.abs(r) + Math.sqrt(r2 - q3), 1. / 3);
        if (r < 0) A = -A;
        B = (A === 0 ? 0 : q / A);

        a /= 3;
        x[0] = (A + B) - a;
        x[1] = -0.5 * (A + B) - a;
        x[2] = 0.5 * Math.sqrt(3.) * (A - B);
        if (Math.abs(x[2]) < eps) {
            x[2] = x[1];
            return 2;
        }

        return 1;
    }
}

export function solveQuartic(a, b, c, d) {
    let a3 = -b;
    let b3 = a * c - 4 * d;
    let c3 = -a * a * d - c * c + 4 * b * d;

    // cubic resolvent
    // y^3 − b*y^2 + (ac−4d)*y − a^2*d−c^2+4*b*d = 0

    let x3 = [0., 0., 0.];

    let iZeroes = solveP3(x3, a3, b3, c3);

    let q1, q2, p1, p2, D, sqD, y;

    y = x3[0];
    // THE ESSENCE - choosing Y with maximal absolute value !
    if (iZeroes !== 1) {
        if (Math.abs(x3[1]) > Math.abs(y))
            y = x3[1];
        if (Math.abs(x3[2]) > Math.abs(y))
            y = x3[2];
    }

    // h1+h2 = y && h1*h2 = d  <=>  h^2 -y*h + d = 0    (h === q)

    D = y * y - 4 * d;
    if (Math.abs(D) < eps) {
        q1 = q2 = y * 0.5;
        // g1+g2 = a && g1+g2 = b-y   <=>   g^2 - a*g + b-y = 0    (p === g)
        D = a * a - 4 * (b - y);
        if (Math.abs(D) < eps) //in other words - D==0
            p1 = p2 = a * 0.5;

        else {
            sqD = Math.sqrt(D);
            p1 = (a + sqD) * 0.5;
            p2 = (a - sqD) * 0.5;
        }
    } else {
        sqD = Math.sqrt(D);
        q1 = (y + sqD) * 0.5;
        q2 = (y - sqD) * 0.5;
        // g1+g2 = a && g1*h2 + g2*h1 = c       ( && g === p )  Krammer
        p1 = (a * q1 - c) / (q1 - q2);
        p2 = (c - a * q2) / (q1 - q2);
    }
    let retval = new Array(4);

    for (let i = 0; i < 4; ++i) {
        retval[i] = new Complex(0, 0);
    }

    // solving quadratic eq. - x^2 + p1*x + q1 = 0
    D = p1 * p1 - 4 * q1;
    if (D < 0.0) {
        retval[0].re = -p1 * 0.5;
        retval[0].im = Math.sqrt(-D) * 0.5;
        retval[1] = retval[0].conjugate();
    } else {
        sqD = Math.sqrt(D);
        retval[0].re = (-p1 + sqD) * 0.5;
        retval[1].re = (-p1 - sqD) * 0.5;
    }

    // solving quadratic eq. - x^2 + p2*x + q2 = 0
    D = p2 * p2 - 4 * q2;
    if (D < 0.0) {
        retval[2].re = -p2 * 0.5;
        retval[2].im = Math.sqrt(-D) * 0.5;
        retval[3] = retval[2].conjugate();
    } else {
        sqD = Math.sqrt(D);
        retval[2].re = (-p2 + sqD) * 0.5;
        retval[3].re = (-p2 - sqD) * 0.5;
    }

    return retval;
}

function solveQuadratic(a, b, c) {
    if (a < 0) {
        a *= -1;
        b *= -1;
        c *= -1;
    }
    let delta = b * b - 4 * a * c;
    if (delta < 0) {
        return [];
    } else if (delta === 0) {
        return [-b / (2 * a)];
    }
    b = -b / (2 * a);
    c = Math.sqrt(delta) / (2 * a);
    return [b - c, b + c];
}

export class Ball {
    constructor(x, y, number) {
        this.x = x;
        this.y = y;
        this.velocity = new Vector(0, 0);
        this.number = number;
        this.state = 0;
    }

    advanceInTime(t) {
        let v_hat = this.velocity.direction();
        let t2;
        let m = this.velocity.magnitude();
        t2 = m > Constants.EPS ? Math.min(m / (Constants.FRICTION_ACCELERATION), t) : 0;
        this.x += this.velocity.x * t2 - 0.5 * Constants.FRICTION_ACCELERATION * t2 * t2 * v_hat.x;
        this.y += this.velocity.y * t2 - 0.5 * Constants.FRICTION_ACCELERATION * t2 * t2 * v_hat.y;
        this.velocity.x -= Constants.FRICTION_ACCELERATION * t2 * v_hat.x;
        this.velocity.y -= Constants.FRICTION_ACCELERATION * t2 * v_hat.y;
        return t2;
    }

    serialize() {
        let ret = new Array(6);
        ret[0] = this.x;
        ret[1] = this.y;
        ret[2] = this.velocity.x;
        ret[3] = this.velocity.y;
        ret[4] = this.number;
        ret[5] = this.state;
        return ret;
    }

    static deserialize(args) {
        let ball = new Ball(args[0], args[1], args[4]);
        ball.velocity = new Vector(args[2], args[3]);
        ball.state = args[5];
        return ball;
    }

    ms() {
        let vx = this.velocity.x;
        let vy = this.velocity.y;
        return Math.sqrt(vx * vx + vy * vy);
    }
}

// pockets: [(x, y, number)...]
function isInBoundary(ball, ball_r, fa, boundary0, boundary1, t) {
    let v_hat = ball.velocity.direction();
    let x = ball.x + ball.velocity.x * t - 0.5 * fa * t * t * v_hat.x;
    let y = ball.y + ball.velocity.y * t - 0.5 * fa * t * t * v_hat.y;
    return (x <= boundary1[0] - ball_r && x >= boundary0[0] + ball_r) && (y <= boundary1[1] - ball_r && y >= boundary0[1] + ball_r)
}

export function detectNextCollisionTime(balls, ball_r, fa, boundary0, boundary1, pockets, pocket_r) {
    let min_t = MAX_T;
    let collision_participants = [];
    let min_collision_type = CollisionTypes.NO_COLLISION;
    let k = new Vector(0, 0);
    let v = new Vector(0, 0);
    let v2 = new Vector(0, 0);
    let v1 = new Vector(0, 0);
    let d = new Vector(0, 0);
    // detect collisions
    for (let i = 0; i < balls.length; ++i) {
        let ball_1 = balls[i];
        if (ball_1.state !== States.ON_TABLE)
            continue;
        v1.x = ball_1.velocity.x;
        v1.y = ball_1.velocity.y;

        if(v1.magnitude() > Constants.EPS){
            let t = v1.magnitude()/fa;
            if(t < min_t){
                min_t = t;
                min_collision_type = CollisionTypes.NO_COLLISION;
                collision_participants = [ball_1.number];
            }
        }

        // detects BallBall collision
        for (let j = i + 1; j < balls.length; ++j) {
            let ball_2 = balls[j];
            v2.x = ball_2.velocity.x;
            v2.y = ball_2.velocity.y;
            if (ball_2.state !== States.ON_TABLE || (v1.magnitude() < Constants.EPS && v2.magnitude() < Constants.EPS))
                continue;
            let ts = [];
            if (v1.magnitude() < Constants.EPS) {
                ts = getCollisionTime(ball_2, ball_1, ball_r, fa);
            } else if (v2.magnitude() < Constants.EPS) {
                ts = getCollisionTime(ball_1, ball_2, ball_r, fa);
            } else {
                let a = 0.5 * fa;
                k = v2.direction();
                k.sub(v1.direction());
                k.mul(a);
                v.x = v2.x - v1.x;
                v.y = v2.y - v1.y;
                d.x = ball_2.x - ball_1.x;
                d.y = ball_2.y - ball_1.y;
                let k_dot_k = k.dot(k);
                let tmp = solveQuartic(-2 * v.dot(k) / k_dot_k, (v.dot(v) - 2 * d.dot(k)) / k_dot_k,
                    2 * d.dot(v) / k_dot_k, (d.dot(d) - 4 * ball_r * ball_r) / k_dot_k);

                for (let l = 0; l < 4; ++l) {
                    if (tmp[l].im === 0 && tmp[l].re > 0) {
                        ts.push(tmp[l].re);
                    }
                }
            }
            let t = MAX_T;
            for (let tp of ts) {
                if (tp > 0 && t > tp)
                    t = tp;
            }
            if (t < min_t && isInBoundary(ball_2, ball_r, fa, boundary0, boundary1, t) && isInBoundary(ball_1, ball_r, fa, boundary0, boundary1, t)) {
                min_t = t;
                collision_participants = [ball_1.number, ball_2.number];
                min_collision_type = CollisionTypes.BallBall;
            }
        }
        // detect BallRail Collision
        if (v1.magnitude() <= Constants.EPS)
            continue;
        let v_hat = v1.direction();
        let ti = [
            solveQuadratic(-0.5 * fa * v_hat.x, v1.x, ball_1.x - (ball_r + boundary0[0])),
            solveQuadratic(-0.5 * fa * v_hat.y, v1.y, ball_1.y - (ball_r + boundary0[1])),
            solveQuadratic(-0.5 * fa * v_hat.x, v1.x, ball_1.x - boundary1[0] + ball_r),
            solveQuadratic(-0.5 * fa * v_hat.y, v1.y, ball_1.y - boundary1[1] + ball_r)
        ];

        for (let j = 0; j < 4; ++j) {
            let t = ti[j];
            switch (t.length) {
                case 2:
                    ti[j] = t[0] > 0 ? t[0] : t[1];
                    break;
                case 1:
                    ti[j] = t[0];
                    break;
                default:
                    ti[j] = -1;
                    break;
            }
        }

        for (let j = 0; j < 4; ++j) {
            let x, y;
            let t = ti[j];
            if (t <= 0 || t >= min_t || t > v1.magnitude() / fa)
                continue;
            y = ball_1.y + v1.y * t - 0.5 * fa * v_hat.y * t * t;
            x = ball_1.x + v1.x * t - 0.5 * fa * v_hat.x * t * t;
            if (j % 2 === 0 && y <= boundary1[1] - ball_r && y >= boundary0[1] + ball_r) {
                collision_participants = [ball_1.number, j];
                min_collision_type = CollisionTypes.BallRail;
                min_t = t;
            } else if (j % 2 === 1 && x <= boundary1[0] - ball_r && x >= boundary0[0] + ball_r) {
                collision_participants = [ball_1.number, j];
                min_collision_type = CollisionTypes.BallRail;
                min_t = t;
            }
        }
        // detect BallPocket Collision
        for (let j = 0; j < pockets.length; ++j) {
            let a = 0.5 * fa;
            k.x = a * (v1.x / v1.magnitude());
            k.y = a * (v1.y / v1.magnitude());
            d.x = ball_1.x - pockets[j][0];
            d.y = ball_1.y - pockets[j][1];
            let k_dot_k = k.dot(k);
            let ts = solveQuartic(-2 * v1.dot(k) / k_dot_k, (v1.dot(v1) - 2 * d.dot(k)) / k_dot_k,
                2 * d.dot(v1) / k_dot_k, (d.dot(d) - pocket_r * pocket_r) / k_dot_k);
            let t = MAX_T;
            for (let l = 0; l < 4; ++l) {
                if (ts[l].im === 0 && ts[l].re > 0) {
                    if (t > ts[l].re)
                        t = ts[l].re;
                }
            }
            if (t < min_t && t <= (v1.magnitude() / fa) && isInBoundary(ball_1, ball_r, fa, boundary0, boundary1, t)) {
                min_t = t;
                collision_participants = [ball_1.number, j];
                min_collision_type = CollisionTypes.BallPocket;
            }
        }
    }
    return new Collision(min_collision_type, min_t, collision_participants);
}

function getCollisionTime(b1, b2, r, fa) {
    let v1 = b1.velocity.direction();
    let dc = new Vector(b2.x - b1.x, b2.y - b1.y);
    let delta = dc.dot(v1) ** 2 + 4 * r * r - dc.dot(dc);
    if (delta < 0)
        return [];
    let d = dc.dot(v1) - Math.sqrt(delta);
    return solveQuadratic(0.5 * fa, -b1.velocity.magnitude(), d);
}

// noinspection SpellCheckingInspection
export function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
    );
}
export function generateToken(){
    return crypto.randomBytes(48).toString('hex');
}
export function resolveBallBallCollision(b1, b2, ball_r) {
    let dx = b1.x - b2.x;
    let dy = b1.y - b2.y;


    let v1_x = b1.velocity.x;
    let v1_y = b1.velocity.y;
    let v2_x = b2.velocity.x;
    let v2_y = b2.velocity.y;

    let a = ((v1_x - v2_x) * dx + (v1_y - v2_y) * dy) / ((dx * dx + dy * dy));
    b1.velocity.x = v1_x - a * dx;
    b1.velocity.y = v1_y - a * dy;
    b2.velocity.x = v2_x + a * dx;
    b2.velocity.y = v2_y + a * dy;

    let minBallsDist = 0.1;

    let d = Math.sqrt(dx * dx + dy * dy);
    let r = 2 * ball_r;
    dx = (dx / d) * (r + minBallsDist);
    dy = (dy / d) * (r + minBallsDist);
    b1.x = dx + b2.x;
    b1.y = dy + b2.y;

    // let delta = (minBallsDist - (Math.sqrt(dx * dx + dy * dy) - 2 * ball_r)) / 2;
    // if (delta > 0) {
    //     let d1 = b1.velocity.direction();
    //     let d2 = b2.velocity.direction();
    //     d1.mul(delta);
    //     d2.mul(delta);
    //     b1.x += d1.x;
    //     b1.y += d1.y;
    //     b2.x += d2.x;
    //     b2.y += d2.y;
    // }
}

export function resolveBallRailCollision(ball, ball_r, rail) {
    let r = rail % 2;
    let idx = 2 * r - 1;
    ball.velocity.x *= idx;
    ball.velocity.y *= -idx;
    let eps = 0.05;
    switch (rail) {
        case Rails.Left:
            ball.x = ball_r + eps;
            break;
        case Rails.Top:
            ball.y = ball_r + eps;
            break;
        case Rails.Right:
            ball.x = Constants.TABLE_WIDTH - (ball_r + eps);
            break;
        case Rails.Bottom:
            ball.y = Constants.TABLE_HEIGHT - (ball_r + eps);
            break;
    }
}

export class Collision {
    constructor(collisionType, deltaT, collisionParticipants) {
        this.collisionType = collisionType;
        this.deltaT = deltaT;
        this.collisionParticipants = collisionParticipants;
    }

    toString() {
        return `type: ${CollisionTypesMeta[this.collisionType]}\ndeltaT: ${this.deltaT}\nParticipants:${this.collisionParticipants}`
    }

    serialize() {
        let ret = [this.collisionType, this.deltaT];
        for (let i of this.collisionParticipants) {
            ret.push(i);
        }
        return ret;
    }

    static deserialize(args) {
        let collisionParticipants = [];
        for (let i = 2; i < args.length; ++i) {
            collisionParticipants.push(args[i]);
        }
        return new Collision(args[0], args[1], collisionParticipants);
    }
}
