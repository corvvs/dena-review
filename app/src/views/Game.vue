<template lang="pug">
.game
  .body
    .info
      MatchUp.matchup(
        :game="viewData.game"
        :winner="judge.winner.value || ''"
      )
      .game-logs
        LogItem.logitem(
          v-for="log in virtualLogs"
          :game="viewData.game"
          :log="log"
          :isMarked="!!(markedLog && markedLog.action === log.action && markedLog.i === log.i && markedLog.j === log.j)"
          @click-log="handlers.clickLogItem"
        )

    .board
      .match-id
        h3 Match ID: {{ game.match_id }}
      Board(
        :game="viewData.game"
        :ongoing="!judge.winner.value && viewData.game.player === 'You'"
        :logs="boardLogs"
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

    const initViewData = () => {
      return {
        game: prop.game,
        logs: reactive([]),
        logMarked: -1,
      };
    };

    const viewData: {
      game: Game.Game,
      logs: Game.ActualLog[];
      logMarked: number;
    } = initViewData();

    const gameServer = new GameServer(
      prop.game,
      viewData.logs,
      (newLog, logs) => {
      console.log(newLog, logs, prop.game.playerYou.id, prop.game.playerOpponent.id);
      viewData.logs.splice(0, viewData.logs.length, ...logs);
      const board = Game.logs2board(prop.game.playerYou, logs);
      viewData.game.board.splice(0, viewData.game.board.length, ...board);
      if (newLog.action === "Place") {
        if (newLog.player_id === prop.game.playerOpponent.id) {
          if (viewData.game.player !== "You") {
            console.log("flipped")
            viewData.game.player = "You";
          } else {
            console.log("same?")
          }
        }
      }
      console.log(viewData.game, viewData.game.player);
    });

    /**
     * セルの状態
     */
    const cellOccupations = computed(() => {
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          if (i < viewData.game.board[j].length) {
            return viewData.game.board[j][i];
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

      clickLogItem: (event: Game.Log) => {
        if (event.action !== "GameStart" && event.action !== "Place") { return }
        const n = (() => {
          if (event.action === "GameStart") { return 0; }
          const m = _.findLastIndex(viewData.logs, (log => log.action === event.action && log.i === event.i && log.j === event.j));
          return m >= 0 ? viewData.logs.length - m : m;
        })();
        if (viewData.logMarked === n) {
          viewData.logMarked = -1;
        } else {
          viewData.logMarked = n;
        }
      },
    };

    const markedLog = computed(() => {
      if (viewData.logMarked < 0) { return null; }
      return viewData.logs[viewData.logs.length - viewData.logMarked];
    });

    return {
      viewData,
      virtualLogs: computed(() => {
        return Game.logs2virtualLogs(
          new Date(),
          viewData.game,
          viewData.logs,
          judge.winner.value,
        );
      }),
      boardLogs: computed(() => {
        if (viewData.logMarked < 0) { return viewData.logs; }
        if (viewData.logMarked === 0) { return []; }
        return _.slice(viewData.logs, viewData.logs.length - viewData.logMarked, viewData.logs.length);
      }),
      markedLog,
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
