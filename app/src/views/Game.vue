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
        :ongoing="gameData.game.player === 'You'"
        :longestLineLength="longestLineLength"
        @place-cell="handlers.clickCell"
      )
      
      .panel.gameend(
        v-if="judge.winner.value"
      )
        h3.player.You(
          v-if="judge.winner.value === 'You'"
        ) You Won!!
        h3.player.Opponent(
          v-else-if="judge.winner.value === 'Opponent'"
        ) You Lose...
        h3(
          v-if="judge.winner.value === 'Draw'"
        ) Draw Game.

        .inner-panel
          v-btn(
            @click="handlers.clickMatchAgain"
          ) Match Again
</template>

<script lang="ts">
import _ from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { Game, GameServer } from '../model/game'
import Board from '../components/Board.vue'
import LogItem from '../components/LogItem.vue'

export default defineComponent({
  components: {
    LogItem, Board,
  },

  props: {
    game: {
      type: Object as PropType<Game.Game>,
      required: true,
    },
  },

  setup(prop: {
    game: Game.Game,
  }, context: SetupContext) {

    const initGameData = () => {
      return {
        game: prop.game,
        logs: reactive([]),
      };
    };

    const gameData: {
      game: Game.Game,
      logs: Game.Log[];
    } = initGameData();

    const gameServer = new GameServer(prop.game, gameData.logs, (newLog, logs) => {
      console.log(newLog, logs, prop.game.player_id_you, prop.game.player_id_opponent);
      gameData.logs.splice(0, gameData.logs.length, ...logs);
      const board = Game.logs2board({ id: prop.game.player_id_you }, logs);
      gameData.game.board.splice(0, gameData.game.board.length, ...board);
      if (newLog.action === "Place") {
        if (newLog.player_id === prop.game.player_id_opponent) {
          gameData.game.player = "You";
        }
      }
      console.log(gameData.game, gameData.game.player);
    });

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
       * ターンを進める
       */
      proceedTurn: function() {
        if (gameData.game.player === "You" && willYouWon.value) {
          this.pushLog({
            action: "Defeat",
            player_id: gameData.game.player_id_you,
            time: new Date(),
          });
        } else if (gameData.game.player === "Opponent" && willOpponentWon.value) {
          this.pushLog({
            action: "Defeat",
            player_id: gameData.game.player_id_opponent,
            time: new Date(),
          });
        } else if (judge.winner.value === "Draw") {
          this.pushLog({
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
      placePiece: async function(i: number, j: number) {
        await gameServer.putYourHand(i, j);
        await gameServer.proceedTurn(judge.winner.value);
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

      pushLog: function(log: Game.Log) {
        gameData.logs.unshift(log);
      },
    };

    const handlers = {
      clickCell: (event: { i: number, j: number }) => {
        const { i, j } = event;
        controller.placePiece(i, j);
      },

      clickMatchAgain: () => {
        context.emit("match-again");
      },
    };

    Game.startGame(gameData.logs);
    return {
      gameData,
      longestLineLength,
      judge,
      handlers,
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
