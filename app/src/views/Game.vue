<template lang="pug">
.game
  .body
    .info
      .header
        h3 MMMM
      .winner(
        v-if="judge.winner.value"
      )
        | Winner:
        br
        span.player(
          :class="judge.winner.value"
        ) {{ judge.winner.value }}
      .current-player(
        v-else
      )
        | Current Player:
        br
        span.player(
          :class="gameData.game.player"
        ) {{ gameData.game.player }}
      .game-logs
        LogItem.logitem(
          v-for="log in gameData.logs"
          :game="gameData.game"
          :log="log"
        )

    .board
      Board(
        :game="gameData.game"
        :ongoing="!judge.winner.value"
        :longestLineLength="longestLineLength"
        @place-cell="handlers.clickCell"
      )
        
</template>

<script lang="ts">
import _ from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { Game } from '../model/game'
import Board from '../components/Board.vue'
import LogItem from '../components/LogItem.vue'

export default defineComponent({
  components: {
    LogItem, Board,
  },

  setup(prop: {
  }, context: SetupContext) {

    const initGameData = () => {
      return {
        game: reactive(Game.initGame()),
        logs: reactive([]),
      };
    };

    const gameData: {
      game: Game.Game;
      logs: Game.Log[];
    } = initGameData();

    /**
     * セルの状態
     */
    const cellOccupations = computed(() => {
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          if (i < gameData.game.board[j].length) {
            return gameData.game.board[j][i];
          }
          return "empty";
        });
      });
    });

    /**
     * フルサイズに拡張したgame.board
     * 空きマスにはemptyが置かれている。
     */
    const extendedBoard = computed(() => {
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          const occupation = cellOccupations.value[i][j];
          return occupation;
        });
      });
    });

    const longestLineLengthYou = computed(() => {
      const exBoard = extendedBoard.value;
      return Game.longestLineLengths(exBoard, "You");
    });
    const longestLineLengthOpponent = computed(() => {
      const exBoard = extendedBoard.value;
      return Game.longestLineLengths(exBoard, "Opponent");
    });

    /**
     * 当該セルが敵の色の場合は0,
     * そうでない場合、当該セルが自分の色だと仮定した時の、最大の連続並びの長さ
     * (当該セルが本当に自分の色であり、かつこの値が4以上の場合、ゲームに勝利していることになる)
     */
    const longestLineLength = computed(() => {
      const playerFor = gameData.game.player;
      return playerFor === "You" ? longestLineLengthYou.value : longestLineLengthOpponent.value;
    });

    const willYouWon = computed(() => Game.verdictWon(extendedBoard.value, longestLineLengthYou.value));
    const willOpponentWon = computed(() => Game.verdictWon(extendedBoard.value, longestLineLengthOpponent.value));
    const noVacant = computed(() => !extendedBoard.value.find((row) => row.find((p) => p === "empty")));
    const judge = {
      willYouWon,
      willOpponentWon,
      noVacant,
      winner: computed(() => {
        if (willYouWon.value) { return "You"; }
        if (willOpponentWon.value) { return "Opponent"; }
        if (noVacant.value) { return "Draw"; }
        return null;
      }),
    };

    const controller = {
      /**
       * ゲームを初期化する
       */
      initializeGame: function() {
        const gd = initGameData();
        gameData.game = gd.game;
        gameData.logs = gd.logs;
      },
      /**
       * ターンを進める
       */
      proceedTurn: function() {
        if (gameData.game.player === "You" && willYouWon.value) {
          gameData.logs.unshift({
            action: "Defeat",
            player_id: gameData.game.player_id_you,
            time: new Date(),
          });
        } else if (gameData.game.player === "Opponent" && willOpponentWon.value) {
          gameData.logs.unshift({
            action: "Defeat",
            player_id: gameData.game.player_id_opponent,
            time: new Date(),
          });
        } else if (judge.winner.value === "Draw") {
          gameData.logs.unshift({
            action: "Draw",
            time: new Date(),
          });
        } else {
          this.flipPlayer();
        }
      },
      /**
       * コマを置く
       */
      placePiece: function(i: number, j: number) {
        if (!(0 <= i && i < Game.Row)) { return; }
        if (!(0 <= j && j < Game.Col)) { return; }
        if (Game.Row <= gameData.game.board[j].length) { return; }
        gameData.game.board[j].push(gameData.game.player);
        gameData.logs.unshift({
          action: "Place",
          player_id: gameData.game.player === "You" ? gameData.game.player_id_you : gameData.game.player_id_opponent,
          i, j,
          time: new Date(),
        });
        this.proceedTurn();
      },
      /**
       * プレイヤーを交代する
       */
      flipPlayer: function() {
        if (gameData.game.player === "You") {
          gameData.game.player = "Opponent";
        } else if (gameData.game.player === "Opponent") {
          gameData.game.player = "You";
        }
      },
    };

    const handlers = {
      clickCell: (event: { i: number, j: number }) => {
        const { i, j } = event;
        controller.placePiece(i, j);
      },
    };

    Game.startGame(gameData.logs);
    return {
      gameData,
      handlers,
      longestLineLength,
      judge,
    };
  },
});

</script>

<style lang="stylus" scoped>
FrameBorderColor = #888
FrameBorder = 1px solid FrameBorderColor
ColorYou = royalblue
ColorOpponent = orange

.game
  height 100%
  display flex
  flex-direction column

  .header
    flex-grow 0
    flex-shrink 0
  .body
    flex-grow 1
    flex-shrink 1
    display flex
    flex-direction row
    border-top FrameBorder
    border-bottom FrameBorder
    height 100%

  .info
    height 100%
    flex-grow 0
    flex-shrink 0
    flex-basis 200px
    border-right FrameBorder
    display flex
    flex-direction column

    .current-player
      flex-grow 0
      flex-shrink 0
    .game-logs
      border-top FrameBorder
      flex-grow 1
      flex-shrink 1
      overflow-y scroll

  .board
    flex-grow 1
    flex-shrink 1

  .player
    font-weight bold
    &.You
      color ColorYou
    &.Opponent
      color ColorOpponent
</style>
