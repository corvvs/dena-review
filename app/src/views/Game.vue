<template lang="pug">
.game
  .body
    .info
      .header
        h3 MMMM
      MatchUp.matchup(
        :game="gameData.game"
        :winner="judge.winner.value || ''"
      )
      .game-logs
        LogItem.logitem(
          v-for="log in virtualLogs"
          :game="gameData.game"
          :log="log"
        )

    .board
      Board(
        :game="gameData.game"
        :ongoing="!judge.winner.value && gameData.game.player === 'You'"
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
          v-else-if="judge.winner.value === 'Draw'"
        ) Draw Game.

        .inner-panel
          v-btn(
            @click="handlers.clickMatchAgain"
          ) Match Again
</template>

<script lang="ts">
import _ from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { M4Player } from '../model/player'
import { Game, GameServer } from '../model/game'
import MatchUp from '../components/MatchUp.vue'
import Board from '../components/Board.vue'
import LogItem from '../components/LogItem.vue'

export default defineComponent({
  components: {
    MatchUp, LogItem, Board,
  },

  props: {
    player: {
      type: Object as PropType<M4Player.PlayerData>,
      required: true,
    },
    game: {
      type: Object as PropType<Game.Game>,
      required: true,
    },
  },

  setup(prop: {
    player: M4Player.PlayerData;
    game: Game.Game;
  }, context: SetupContext) {

    const initGameData = () => {
      return {
        game: prop.game,
        logs: reactive([]),
      };
    };

    const gameData: {
      game: Game.Game,
      logs: Game.ActualLog[];
    } = initGameData();

    const gameServer = new GameServer(
      prop.game,
      gameData.logs,
      (newLog, logs) => {
      console.log(newLog, logs, prop.game.playerYou.id, prop.game.playerOpponent.id);
      gameData.logs.splice(0, gameData.logs.length, ...logs);
      const board = Game.logs2board(prop.game.playerYou, logs);
      gameData.game.board.splice(0, gameData.game.board.length, ...board);
      if (newLog.action === "Place") {
        if (newLog.player_id === prop.game.playerOpponent.id) {
          if (gameData.game.player !== "You") {
            console.log("flipped")
            gameData.game.player = "You";
          } else {
            console.log("same?")
          }
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
       * コマを置く
       */
      placePiece: async function(i: number, j: number) {
        await gameServer.putYourHand(i, j);
        await gameServer.proceedTurn(gameData.logs);
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
      virtualLogs: computed(() => {
        return Game.logs2virtualLogs(
          new Date(),
          gameData.game,
          gameData.logs,
          judge.winner.value,
        );
      }),
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

    .matchup
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
