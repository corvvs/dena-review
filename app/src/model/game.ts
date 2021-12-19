import _ from 'lodash';
import { v4 } from 'uuid';
import { M4Player } from '../model/player'
import * as FS from "firebase/firestore";
import * as FSUtil from '../utils/firestore';

const Prolong = 60 * 1000;

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
     * 今手番であるプレイヤー
     */
    player: Player;

    neutral: boolean;
  };

  export function initPVPGame(
    match_id: string,
    player: M4Player.PlayerData,
    opponent: M4Player.PlayerData,
    yourTurn: boolean,
    neutral: boolean,
  ): Game {
    return {
      match_id,
      player_id_you: player.id,
      player_id_opponent: opponent.id,
      playerYou: player,
      playerOpponent: opponent,
      player: yourTurn ? "You" : "Opponent",
      neutral,
    };
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
      if (action === "Place" && _.isFinite(i) && _.isFinite(j)) {
        if (log.player_id === player.id) {
          board[j!].push("You");
        } else {
          board[j!].push("Opponent");
        }
      }
    });
    return board;
  }

  export function scoreBoard(
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
          tables[dirUp][i][j] + tables[dirDown][i][j] + 1,
          tables[dirLeft][i][j] + tables[dirRight][i][j] + 1,
          tables[dirUL][i][j] + tables[dirDR][i][j] + 1,
          tables[dirUR][i][j] + tables[dirDL][i][j] + 1,
        );
      });
    });
  }

  export function longestLineLengths(
    exBoard: (Player | "empty")[][],
    playerFor: Player
  ) {
    const tables = scoreBoard(exBoard, playerFor);
    return _.range(Game.Row).map((i) => {
      return _.range(Game.Col).map((j) => {
        return tables[i][j];
      });
    });
  }

  export function verdictWon(extendedBoard: ExtendedBoard, lineLengths: number[][]) {
    return _.find(lineLengths, (row, i) => _.find(row, (n, j) => {
      return extendedBoard[i][j] !== "empty" && n >= WinLength;
    }));
  }

  export function extendedBoard(board: Board) {
    return _.range(Game.Row).map((i) => {
      return _.range(Game.Col).map((j) => {
        const occupation = i < board[j].length ? board[j][i] : "empty";
        return occupation;
      });
    });
  }

  export function winner(player: M4Player.PlayerData, logs: Game.ActualLog[]) {
    const board = logs2board(player, logs);
    const exBoard = extendedBoard(board);
    const longestLineLengthYou = Game.longestLineLengths(exBoard, "You");
    const longestLineLengthOpponent = Game.longestLineLengths(exBoard, "Opponent");
    const willYouWon = Game.verdictWon(exBoard, longestLineLengthYou);
    const willOpponentWon = Game.verdictWon(exBoard, longestLineLengthOpponent);
    const noVacant = !exBoard.find((row) => row.find((p) => p === "empty"));
    if (willYouWon) { return "You"; }
    if (willOpponentWon) { return "Opponent"; }
    if (noVacant) { return "Draw"; }
    return null;
  }
};

export type GameServer = {
  putYourHand: (
    i: number, j: number,
  ) => Promise<void>;
};

export class GameServerSingle {
  constructor(
    private game: Game.Game,
    private logs: Game.ActualLog[],
    private hookNewHand: (newLog: Game.ActualLog, logs: Game.ActualLog[]) => void,
  ) {
    console.log("Single Player");
    
  }

  async putYourHand(
    i: number, j: number,
  ) {
    if (this.game.neutral) { return; }
    if (!(0 <= i && i < Game.Row)) { throw new Error("out of bound"); }
    if (!(0 <= j && j < Game.Col)) { throw new Error("out of bound"); }
    this.flipPlayer();
    this.pushLog({
      action: "Place",
      player_id: this.game.player_id_you,
      i, j,
      time: new Date(),
    });
    const wnnr = Game.winner(this.game.playerYou, this.logs);
    Game.logs2virtualLogs(new Date(), this.game, this.logs, wnnr)
    if (wnnr) {
      return;
    }

    // Com の手番の処理を書く
    // ランダムハンド
    const ij = (() => {
      const board = Game.logs2board(this.game.playerOpponent, this.logs);
      const exBoard = Game.extendedBoard(board);
      const yourScoreBoard = Game.scoreBoard(exBoard, "You");
      const opponentScoreBoard = Game.scoreBoard(exBoard, "Opponent");
      const placables = _.range(board.length)
        .map(j => ({ i: board[j].length, j }))
        .filter(ij => ij.i < Game.Row);
      if (!placables) { throw new Error("no way"); }
      const p = _(placables).filter(ij => yourScoreBoard[ij.i][ij.j] >= Game.WinLength).sample();
      console.log(`for winning`, p);
      if (p) { return p; }
      const q = _(placables).filter(ij => opponentScoreBoard[ij.i][ij.j] >= Game.WinLength).sample();
      console.log(`for defending`, q)
      if (q) { return q; }
      const r = _(placables).filter(ij => ij.i + 1 >= Game.Row || opponentScoreBoard[ij.i + 1][ij.j] < Game.WinLength).sample();
      console.log(`for punishing`, r);
      if (r) { return r; }
      return _.shuffle(placables)[0];
    })();
    if (!ij) {
      return;
    }
    this.flipPlayer();
    this.pushLog({
      action: "Place",
      player_id: this.game.playerOpponent.id,
      i: ij.i, j: ij.j,
      time: new Date(),
    });
  }

  private pushLog(log: Game.ActualLog) {
    this.logs.unshift(log);
  }

  /**
   * プレイヤーを交代する
   */
  private flipPlayer() {
    if (this.game.player === "You") {
      this.game.player = "Opponent";
    } else if (this.game.player === "Opponent") {
      this.game.player = "You";
    }
  }
}

export class GameServerPVP {

  private docref: FS.DocumentReference<FS.DocumentData>;
  private unsubscriber: FS.Unsubscribe;

  constructor(
    private game: Game.Game,
    private logs: Game.ActualLog[],
    private hookNewHand: (newLog: Game.ActualLog, logs: Game.ActualLog[]) => void,
  ) {
    console.log("PVP");
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
    if (this.game.neutral) { return; }
    if (!(0 <= i && i < Game.Row)) { throw new Error("out of bound"); }
    if (!(0 <= j && j < Game.Col)) { throw new Error("out of bound"); }
    this.flipPlayer();
    this.pushLog({
      action: "Place",
      player_id: this.game.player_id_you,
      i, j,
      time: new Date(),
    });
    await FS.updateDoc(this.docref, {
      logs: this.logs,
      expires_at: new Date(Date.now() + Prolong),
    });
    if (this.logs.length > 0 && ["Defeat", "Draw", "Resign"].includes(this.logs[0].action)) {
      return;
    }
  }

  private pushLog(log: Game.ActualLog) {
    this.logs.unshift(log);
  }

  /**
   * プレイヤーを交代する
   */
  private flipPlayer() {
    if (this.game.player === "You") {
      this.game.player = "Opponent";
    } else if (this.game.player === "Opponent") {
      this.game.player = "You";
    }
  }
}
