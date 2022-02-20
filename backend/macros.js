export const Constants = {
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
export const States = {
    ON_TABLE: 0,
    IN_POCKET: 1,
};

export const BallGroup = {
    NO_GROUP: -1,
    SOLID: 0,
    STRIPES: 1
}

export const Timeouts = {
    ACCEPT_MATCH_TIMEOUT: 12000,
    GAME_INITIALIZATION_TIMEOUT: 20 * 1000,
    ACK_TIMEOUT: 3000,
    SERVER_ACTION_HANDLE: 10000,
    ANIMATING_EVENTS_TIMEOUT: 60 * 1000
};
export const MatchStates = {
    AWAITING_PLAYER_ACTION: 0,
    PLAYERS_ANIMATING_EVENTS: 1
}
export const CollisionTypes = {BallBall: 0, BallRail: 1, BallPocket: 2, NO_COLLISION: 3};
export const CollisionTypesMeta = ["BallBall", "BallRail", "BallPocket", "No Collision"];
export const Rails = {Left: 0, Top: 1, Right: 2, Bottom: 3};

for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 3; i++) {
        Constants.POCKETS_POSITIONS[3 * j + i] = [i * (Constants.TABLE_WIDTH / 2), j * Constants.TABLE_HEIGHT];
    }
}
export const Actions = {
    Break: 0,
    RepositionCue: 1
}
export const EndOfTurnEvents = {
    NoEvent: 0, FoulDetected: 1, Loss: 2, Win: 3, GameLoss: 4, GameWin: 5
};

export const foulsMeta = {
    CUE_HIT_NO_BALL: 0, POCKET_8: 1, HIT_NON_TARGET_BALL_FIRST: 2, NO_COLLISION_WITH_RAIL_OR_POCKET: 3,
    POCKET_CUE: 4, POCKET_NO_BALL_AND_LESS_THAN_4_HIT_RAIL: 5
};
export const foulsMetaLen = Object.keys(foulsMeta).length;