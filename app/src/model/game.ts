import _ from 'lodash';
import { v4 } from 'uuid';

export namespace Game {
  export const Row = 6;
  export const Col = 7;
  
  export type Player = "You" | "Opponent";
  export type Action =
    "GameStart" | // ゲーム開始
    "Place" | // 手
    "Resign" | // 投了
    "Defeat"; // 勝利

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

    /**
     * 盤面 列 -> 行
     */
    board: Player[][];
    /**
     * 今手番であるプレイヤー
     */
    player: Player;
  };

  export function initGame(): Game {
    return {
      match_id: v4(),
      player_id_you: v4(),
      player_id_opponent: v4(),
      board: _.range(Col).map(() => []),
      player: "You",
    };
  }

  export function startGame(gameLogs: Log[]) {
    gameLogs.unshift({
      action: "GameStart",
      time: new Date(),
    });
  }

  export function counterPlayer(player: Player): Player {
    return player === "You" ? "Opponent" : "You";
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
};


