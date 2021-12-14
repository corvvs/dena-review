import _ from 'lodash';


export namespace Game {
  export const Row = 6;
  export const Col = 7;
  
  type Player = "You" | "Opponent";
  
  type Game = {
    /**
     * 盤面 列 -> 行
     */
    board: string[][];
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
}


