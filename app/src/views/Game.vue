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
        h3 Match ID: {{ viewData.game.match_id }}
      Board(
        :game="viewData.game"
        :ongoing="!judge.winner.value && viewData.game.player === 'You'"
        :logs="boardLogs"
        @place-cell="handlers.clickCell"
      )
      
      .panel.gameend(
        v-if="judge.winner.value"
      )
        GameStat(
          :game="viewData.game"
          :winner="judge.winner.value"
        )

        .inner-panel(
          v-if="!viewData.game.neutral"
        )
          v-btn(
            @click="handlers.clickMatchAgain"
          ) Match Again
</template>

<script lang="ts">
import _ from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { M4Player } from '../model/player'
import { Game, GameServer, GameServerPVP, GameServerSingle } from '../model/game'
import MatchUp from '../components/MatchUp.vue'
import Board from '../components/Board.vue'
import LogItem from '../components/LogItem.vue'
import GameStat from '../components/GameStat.vue'

export default defineComponent({
  components: {
    MatchUp, LogItem, Board, GameStat,
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

    const makeGameServer: (game: Game.Game, logs: Game.ActualLog[]) => GameServer = (game: Game.Game, logs: Game.ActualLog[]) => {
      if (game.playerOpponent.com) {
        return new GameServerSingle(
          game,
          logs,
          (newLog, allLogs) => {
            console.log(newLog, logs, game.playerYou.id, game.playerOpponent.id);
            logs.splice(0, logs.length, ...allLogs);
            if (newLog.action === "Place") {
              if (newLog.player_id === game.playerOpponent.id) {
                if (game.player !== "You") {
                  console.log("flipped")
                  game.player = "You";
                } else {
                  console.log("same?")
                }
              }
            }
            console.log(game, game.player);
          },
        )
      }
      return new GameServerPVP(
        game,
        logs,
        (newLog, allLogs) => {
          console.log(newLog, logs, game.playerYou.id, game.playerOpponent.id);
          logs.splice(0, logs.length, ...allLogs);
          if (newLog.action === "Place") {
            if (newLog.player_id === game.playerOpponent.id) {
              if (game.player !== "You") {
                console.log("flipped")
                game.player = "You";
              } else {
                console.log("same?")
              }
            }
          }
          console.log(game, game.player);
        },
      );
    };

    const initViewData = () => {
      const game = prop.game;
      const logs: Game.ActualLog[] = reactive([]);
      return {
        game,
        logs,
        logMarked: -1,
        server: makeGameServer(game, logs),
      };
    };

    const viewData: {
      game: Game.Game,
      logs: Game.ActualLog[];
      logMarked: number;
      server: GameServer,
    } = initViewData();

    const board = computed(() => Game.logs2board(viewData.game.playerYou, viewData.logs));

    /**
     * フルサイズに拡張したgame.board
     * 空きマスにはemptyが置かれている。
     */
    const extendedBoard = computed(() => Game.extendedBoard(board.value));

    const judge = {
      winner: computed(() => {
        const exBoard = extendedBoard.value;
        const longestLineLengthYou = Game.longestLineLengths(exBoard, "You");
        const longestLineLengthOpponent = Game.longestLineLengths(exBoard, "Opponent");
        const willYouWon = Game.verdictWon(exBoard, longestLineLengthYou);
        const willOpponentWon = Game.verdictWon(exBoard, longestLineLengthOpponent);
        const noVacant = !extendedBoard.value.find((row) => row.find((p) => p === "empty"));
        if (willYouWon) { return "You"; }
        if (willOpponentWon) { return "Opponent"; }
        if (noVacant) { return "Draw"; }
        return null;
      }),
    };

    const controller = {
      /**
       * コマを置く
       */
      placePiece: async function(i: number, j: number) {
        await viewData.server.putYourHand(i, j);
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
