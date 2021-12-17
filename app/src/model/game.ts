import _ from 'lodash';
import { v4 } from 'uuid';
import { M4Player } from '../model/player'
import * as FS from "firebase/firestore";
import * as FSUtil from '../utils/firestore';

export namespace Game {
  export const Row = 6;
  export const Col = 7;
  export const WinLength = 4; // 何目並べなのか？
  
  export type Player = "You" | "Opponent";

  export type ActualAction =
    "Place" |
    "Resign";

  export type Action =
    ActualAction | 
    "GameStart" | // ゲーム開始
    "Draw" | // 引き分け
    "Defeat"; // 勝利

  type Board = Player[][];
  type ExtendedBoard = (Player | "empty")[][];


  export type ActualLog = {
    time: Date;
    action: ActualAction;
    player_id: string;
    i?: number;
    j?: number;
  };

  export type Log = {
    time: Date;
    action: Action;
    player_id?: string;
    i?: number;
    j?: number;
  };
  
  export type Game = {
    /**
     * マッチID
     */
    match_id: string;
    /**
     * あなたのプレイヤーID
     */
    player_id_you: string;
    /**
      * 相手のプレイヤーID
      */
    player_id_opponent: string;


    playerYou: M4Player.PlayerData,
    playerOpponent: M4Player.PlayerData,

    /**
     * 盤面 列 -> 行
     */
    board: Board;
    /**
     * 今手番であるプレイヤー
     */
    player: Player;
  };

  export function init2pGame(
    match_id: string,
    player: M4Player.PlayerData,
    opponent: M4Player.PlayerData,
    yourTurn: boolean,
  ): Game {
    return {
      match_id,
      player_id_you: player.id,
      player_id_opponent: opponent.id,
      playerYou: player,
      playerOpponent: opponent,
      board: _.range(Col).map(() => []),
      player: yourTurn ? "You" : "Opponent",
    };
  }

  export function startGame(gameLogs: Log[]) {
  }

  export function counterPlayer(player: Player): Player {
    return player === "You" ? "Opponent" : "You";
  }

  export function logs2virtualLogs(
    gameStartTime: Date,
    game: Game.Game,
    logs: Game.ActualLog[],
    winner: "You" | "Opponent" | "Draw" | null,
  ): Game.Log[] {
    const virtualLogs: Game.Log[] = [];
    virtualLogs.unshift({
      time: gameStartTime,
      action: "GameStart",
    });
    _.eachRight(logs, (log) => {
      virtualLogs.unshift(log);
    });
    const topLog = virtualLogs[0];
    if (topLog.action === "Place") {
      if (winner === "You")  {
        virtualLogs.unshift({
          action: "Defeat",
          player_id: game.player_id_you,
          time: topLog.time,
        });
      } else if (winner === "Opponent") {
        virtualLogs.unshift({
          action: "Defeat",
          player_id: game.player_id_opponent,
          time: topLog.time,
        });
      } else if (winner === "Draw") {
        virtualLogs.unshift({
          action: "Draw",
          time: topLog.time,
        });
      }
    }
    return virtualLogs;
  }

  export function logs2board(player: M4Player.PlayerData, logs: Log[]): Board {
    const board: Board = _.range(Game.Col).map(() => []);
    _.eachRight(logs, (log) => {
      const { i, j, action } = log;
      if (log.action === "Place" && _.isFinite(i) && _.isFinite(j)) {
        if (log.player_id === player.id) {
          board[j!].push("You");
        } else {
          board[j!].push("Opponent");
        }
      }
    });
    return board;
  }

  export function longestLineLengths(
    exBoard: (Player | "empty")[][],
    playerFor: Player
  ) {
    const playerNotFor: Player = counterPlayer(playerFor);
    const dirUp = 0;
    const dirDown = 1;
    const dirLeft = 2;
    const dirRight = 3;
    const dirUL = 4;
    const dirDR = 5;
    const dirUR = 6;
    const dirDL = 7;
    const tables = [
      dirUp, dirDown, dirLeft, dirRight,
      dirUL, dirDR, dirUR, dirDL,
    ].map(() => {
      return _.range(Row).map((i) => {
        return _.range(Col).map((j) => 0);
      });
    });
    // 「行き」のDP
    for (let i = 0; i < Row; i += 1) {
      for (let j = 0; j < Col; j += 1) {
        if (exBoard[i][j] === playerNotFor) { continue; }
        if (0 < i && exBoard[i - 1][j] === playerFor) {
            tables[dirUp][i][j] = tables[dirUp][i - 1][j] + 1;
        }
        if (0 < j && exBoard[i][j - 1] === playerFor) {
            tables[dirLeft][i][j] = tables[dirLeft][i][j - 1] + 1;
        }
        if (0 < i && 0 < j && exBoard[i - 1][j - 1] === playerFor) {
            tables[dirUL][i][j] = tables[dirUL][i - 1][j - 1] + 1;
        }
        if (0 < i && j < Col - 1 && exBoard[i - 1][j + 1] === playerFor) {
            tables[dirUR][i][j] = tables[dirUR][i - 1][j + 1] + 1;
        }
      }
    }
    // 「帰り」のDP
    for (let i = Row - 1; 0 <= i; i -= 1) {
      for (let j = Col - 1; 0 <= j; j -= 1) {
        if (exBoard[i][j] === playerNotFor) { continue; }
        if (i < Row - 1 && exBoard[i + 1][j] === playerFor) {
            tables[dirDown][i][j] = tables[dirDown][i + 1][j] + 1;
        }
        if (j < Col - 1 && exBoard[i][j + 1] === playerFor) {
            tables[dirRight][i][j] = tables[dirRight][i][j + 1] + 1;
        }
        if (i < Row - 1 && j < Col - 1 && exBoard[i + 1][j + 1] === playerFor) {
            tables[dirDR][i][j] = tables[dirDR][i + 1][j + 1] + 1;
        }
        if (i < Row - 1 && 0 <= j && exBoard[i + 1][j - 1] === playerFor) {
            tables[dirDL][i][j] = tables[dirDL][i + 1][j - 1] + 1;
        }
      }
    }

    return _.range(Game.Row).map((i) => {
      return _.range(Game.Col).map((j) => {
        if (exBoard[i][j] === playerNotFor) { return 0; }
        return Math.max(
          tables[dirUp][i][j] + tables[dirDown][i][j],
          tables[dirLeft][i][j] + tables[dirRight][i][j],
          tables[dirUL][i][j] + tables[dirDR][i][j],
          tables[dirUR][i][j] + tables[dirDL][i][j],
        ) + 1;
      });
    });
  }

  export function verdictWon(extendedBoard: ExtendedBoard, lineLengths: number[][]) {
    return _.find(lineLengths, (row, i) => _.find(row, (n, j) => {
      return extendedBoard[i][j] !== "empty" && n >= WinLength;
    }));
  }
};

export class GameServer {

  private docref: FS.DocumentReference<FS.DocumentData>;
  private unsubscriber: FS.Unsubscribe;

  constructor(
    private game: Game.Game,
    private logs: Game.ActualLog[],
    private hookNewHand: (newLog: Game.ActualLog, logs: Game.ActualLog[]) => void,
  ) {
    const db = FS.getFirestore();
    this.docref = FS.doc(db, FSUtil.Collection.ColClosed, game.match_id);
    let logn = logs.length;
    this.unsubscriber = FS.onSnapshot(this.docref, {
      next: (snapshot) => {
        if (!snapshot.exists) { throw new Error("doc deleted"); }
        const logs = snapshot.get("logs") as Game.ActualLog[];
        if (logs.length <= logn) { return; }
        const newLog = logs[0];
        this.hookNewHand(newLog, logs);
      },
    });
  }

  async putYourHand(
    i: number, j: number,
  ) {
    console.log(i, j);
    if (!(0 <= i && i < Game.Row)) { throw new Error("out of bound"); }
    if (!(0 <= j && j < Game.Col)) { throw new Error("out of bound"); }
    if (Game.Row <= this.game.board[j].length) { return; }
    this.flipPlayer();
    this.pushLog({
      action: "Place",
      player_id: this.game.player_id_you,
      i, j,
      time: new Date(),
    });
    await FS.updateDoc(this.docref, { logs: this.logs });
    if (this.logs.length > 0 && ["Defeat", "Draw", "Resign"].includes(this.logs[0].action)) {
      return;
    }
  }

  pushLog(log: Game.ActualLog) {
    this.logs.unshift(log);
  }

  /**
   * プレイヤーを交代する
   */
  flipPlayer() {
    if (this.game.player === "You") {
      this.game.player = "Opponent";
    } else if (this.game.player === "Opponent") {
      this.game.player = "You";
    }
  }
}
