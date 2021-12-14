import _ from 'lodash';


export namespace Game {
  export const Row = 6;
  export const Col = 7;
  
  export type Player = "You" | "Opponent";
  
  export type Game = {
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
      board: _.range(Col).map(() => []),
      player: "You",
    };
  }

  export function counterPlayer(player: Player): Player {
    return player === "You" ? "Opponent" : "You";
  }

  export function longestLineLengths(
    exBoard: (Player | "empty")[][],
    playerFor: Player
  ) {
    const playerNotFor: Player = counterPlayer(playerFor);
    return _.range(Game.Row).map((i) => {
      return _.range(Game.Col).map((j) => {
        let ans = 0;
        if (exBoard[i][j] === playerNotFor) { return ans; }
        let k;
        // よこ
        for (k = 1; j + k < Game.Col; k += 1) {
          if (exBoard[i][j + k] !== playerFor) { break; }
        }
        if (k > ans) { ans = k; }
        for (k = 1; 0 <= j - k; k += 1) {
          if (exBoard[i][j - k] !== playerFor) { break; }
        }
        if (k > ans) { ans = k; }
        // たて
        for (k = 1; i + k < Game.Row; k += 1) {
          if (exBoard[i + k][j] !== playerFor) { break; }
        }
        if (k > ans) { ans = k; }
        for (k = 1; 0 <= i - k; k += 1) {
          if (exBoard[i - k][j] !== playerFor) { break; }
        }
        if (k > ans) { ans = k; }
        // ななめ
        for (k = 1; i + k < Game.Row && j + k < Game.Col; k += 1) {
          if (exBoard[i + k][j + k] !== playerFor) { break; }
        }
        if (k > ans) { ans = k; }
        for (k = 1; 0 <= i - k && j + k < Game.Col; k += 1) {
          if (exBoard[i - k][j + k] !== playerFor) { break; }
        }
        if (k > ans) { ans = k; }
        for (k = 1; i + k < Game.Row && 0 <= j - k; k += 1) {
          if (exBoard[i + k][j - k] !== playerFor) { break; }
        }
        if (k > ans) { ans = k; }
        for (k = 1; 0 <= i - k && 0 <= j - k; k += 1) {
          if (exBoard[i - k][j - k] !== playerFor) { break; }
        }
        if (k > ans) { ans = k; }
        return ans;
      });
    });
  }
};


