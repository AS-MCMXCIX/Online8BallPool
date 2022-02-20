import {TableState} from "./table.js";
import {uuidv4} from "./utilities.js";
import {GameEventHandler} from "./game_events_handler.js"

export class Match {
    constructor(id) {
        this.tableState = new TableState(this);
        this.eventHandler = new GameEventHandler(this.tableState);
        this.players = [];
        this.currPlayer = null;
        this.id = id;
        this.state = -1;
    }

    get otherPlayer() {
        return this.players[1 - this.currPlayer.num];
    }

    startNextRound() {
        this.tableState.initBalls();
        this.currPlayer = Math.random() > 0.5 ? this.players[0] : this.players[1];
    }

    endRound() {
        this.players.forEach(p => p.reset());
        this.tableState.reset();
        return this.players[0].roundWins === 1 || this.players[1].roundWins === 1;
    }
}

