const AWAITING_SHOT = 0;
const AWAITING_OTHER_PLAYER_SHOT = 1;
const BALLS_MOVING = 2;
const SERVER_ANALYZING_EVENTS = 3;
const ANIMATING_STICK_HIT = 4;
const FINALIZING_TURN = 5;
const ANIMATING_EVENTS = 6;

const AppState = {ANIMATING_EVENTS: 0, AWAITING_ACTION_RESPONSE: 1}

const MAX_MOVEMENT_PER_FRAME = 9;
const MIN_MOVEMENT_PER_FRAME = 3;

let GLOBAL_TIME_MULTIPLIER = 0.8;
let DEFAULT_GLOBAL_TIME_MULTIPLIER = 0.8;
let PREF_GLOBAL_TIME_MULTIPLIER = 0.8;
let MAX_GTM = 20;
let DYNAMIC_GTM = false;
const DELTA_T_PER_FRAME = 0.7;

const foulsMeta = {
    CUE_HIT_NO_BALL: 0, POCKET_8: 1, HIT_NON_TARGET_BALL_FIRST: 2, NO_COLLISION_WITH_RAIL_OR_POCKET: 3,
    POCKET_CUE: 4, POCKET_NO_BALL_AND_LESS_THAN_4_HIT_RAIL: 5
};
const foulsMetaLen = Object.keys(foulsMeta).length;

const stateStrings = ['Awaiting Shot', 'Balls Moving', 'Balls Entering Pocket', 'Analyzing Events'];

const foulsMessages = [
    "Cue Hit No Ball.", "Illegally Pocket 8 Ball.", "Cue Hit Non-Target Ball First.",
    "No Ball Has Hit Rail Or Pocketed.", "Pocket Cue.", "Illegal Break."
];
const ballsColorMeta = [
    'white', 'yellow', 'blue', 'red', 'purple', 'orange', 'green', 'maroon', 'black',
    'yellow', 'blue', 'red', 'purple', 'orange', 'green', 'maroon'
];

const Constants = {
    NUM_8_BALL_POOL_BALLS: 16,
    EIGHT_BALL_POOL_BALL_RADIUS: 17,
    TABLE_WIDTH: 1020,
    TABLE_HEIGHT: 510,
    POCKETS_POSITIONS: new Array(6),
    POCKET_RADIUS: -1,
    FRICTION_ACCELERATION: 0.05,
    MAX_BALL_VELOCITY: -1,
    EPS: 0.0001
};
Constants.MAX_BALL_VELOCITY = 30 * Constants.TABLE_WIDTH / 890;
Constants.POCKET_RADIUS = Constants.TABLE_WIDTH * 0.0333;
const States = {
    ON_TABLE: 0,
    IN_POCKET: 1,
};

const BallGroup = {
    NO_GROUP: -1,
    SOLID: 0,
    STRIPES: 1
}

const Timeouts = {
    ACCEPT_MATCH_TIMEOUT: 12000,
    GAME_INITIALIZATION_TIMEOUT: 20 * 1000,
    ACK_TIMEOUT: 3000
};
const CollisionTypes = {BallBall: 0, BallRail: 1, BallPocket: 2, NO_COLLISION: 3};
const CollisionTypesMeta = ["BallBall", "BallRail", "BallPocket", "No Collision"];
const Rails = {Left: 0, Top: 1, Right: 2, Bottom: 3};

for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 3; i++) {
        Constants.POCKETS_POSITIONS[3 * j + i] = [i * (Constants.TABLE_WIDTH / 2), j * Constants.TABLE_HEIGHT];
    }
}
const Actions = {
    Break: 0,
    RepositionCue: 1
}
const EndOfTurnEvents = {
    NoEvent: 0, FoulDetected: 1, Loss: 2, Win: 3, GameLoss: 4, GameWin: 5
};
