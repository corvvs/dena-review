<template lang="pug">
.game
  .header
  h3 MokuMokuMokuMoku
  .body

    .info
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
          :class="game.player"
        ) {{ game.player }}
      .game-logs
        .logitem(
          v-for="log in gameLogs"
          :class="log.player_id === game.player_id_you ? 'You' : log.player_id === game.player_id_opponent ? 'Opponent' : '' "
        )
          .action {{ log.action }}
          .at(
            v-if="log.action === 'Place'"
          ) at ({{ log.i }}, {{ log.j }})



    .board
      svg(
        :transform="geo.transform"  
        :viewBox="geo.viewBox.value"
        :width="geo.width"
        :height="geo.height"
      )
        template(
          v-for="(row, i) in geo.cellPlacements.value"
        )
          g(
            v-for="(placement, j) in row"
            :transform="`translate(${placement.x}, ${placement.y})`"
          )
            rect.cell(
              :x="placement.rx"
              :y="placement.ry"
              :width="placement.width"
              :height="placement.height"
              stroke="gray"
              fill="white"
              :class="geo.cellClasses.value[i][j]"
              @click="handlers.clickCell(i, j)"
            )
            text(
              :transform="geo.transform"  
              :x="text_geo.textPlacements.value[i][j].dx"
              :y="text_geo.textPlacements.value[i][j].dy"
              :font-size="text_geo.textPlacements.value[i][j].fontSize"
              v-if="text_geo.textVisibility.value[i][j]"
            ) {{ longestLineLength.value[i][j] }}
</template>

<script lang="ts">
import _, { flip } from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { Game } from '../model/game'

export default defineComponent({
  setup(prop: {
  }, context: SetupContext) {
    const game: Game.Game = reactive(Game.initGame());
    const gameLogs: Game.Log[] = reactive([]);

    const cellSize = 80;
    const span = 8;
    const width = cellSize * Game.Col + span * 2;
    const height = cellSize * Game.Row + span * 2;

    /**
     * セルの配置
     */
    const cellPlacements = computed(() => {
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          return {
            x: span + cellSize * (j + 0.5),
            y: span + cellSize * (i + 0.5),
            rx: -cellSize / 2,
            ry: -cellSize / 2,
            width: cellSize,
            height: cellSize,
          };
        });
      });
    });

    /**
     * セルの状態
     */
    const cellOccupations = computed(() => {
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          if (i < game.board[j].length) {
            return game.board[j][i];
          }
          return "empty";
        });
      });
    });
    /**
     * 今そのセルに置けるかどうか
     */
    const placabilities = computed(() => {
      // セル(i, j)に置けるかどうかの判定
      // 1. 自分の手番でない -> NO
      // 2. game.board[j].length != i -> NO
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          if (judge.winner.value) { return false; }
          return game.board[j].length == i;
        });
      });
    });

    const cellClasses = computed(() => {
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          const occupation = cellOccupations.value[i][j];
          const r: any = {
            "placable": placabilities.value[i][j],
            "non-placable": !placabilities.value[i][j],
          };
          r[occupation] = true;
          return r;
        });
      });
    });

    /**
     * テキストの配置
     */
    const textPlacements = computed(() => {
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          const fontSize = 36;
          return {
            dx: -fontSize / 2,
            dy: fontSize / 2,
            fontSize,
          };
        });
      });
    });

    /**
     * テキストの表示・非表示
     */
    const textVisibility = computed(() => {
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          return placabilities.value[i][j];
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
      const playerFor = game.player;
      return playerFor === "You" ? longestLineLengthYou : longestLineLengthOpponent;
    });

    const geo = {
      transform: "scale(1 -1)",

      width,
      height,
      viewBox: computed(() => {
        return `0 0 ${width} ${height}`;
      }),

      cellPlacements,
      cellOccupations,
      placabilities,
      cellClasses,
    };

    const text_geo = {
      textPlacements,
      textVisibility,
    };

    const willYouWon = computed(() => Game.verdictWon(extendedBoard.value, longestLineLengthYou.value));
    const willOpponentWon = computed(() => Game.verdictWon(extendedBoard.value, longestLineLengthOpponent.value));
    const judge = {
      willYouWon,
      willOpponentWon,
      winner: computed(() => willYouWon.value ? "You" : willOpponentWon.value ? "Opponent" : null),
    };

    const controller = {
      /**
       * ターンを進める
       */
      proceedTurn: function() {
        if (game.player === "You" && willYouWon.value) {
          gameLogs.unshift({
            action: "Defeat",
            player_id: game.player_id_you,
            time: new Date(),
          });
        } else if (game.player === "Opponent" && willOpponentWon.value) {
          gameLogs.unshift({
            action: "Defeat",
            player_id: game.player_id_opponent,
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
        if (Game.Row <= game.board[j].length) { return; }
        game.board[j].push(game.player);
        gameLogs.unshift({
          action: "Place",
          player_id: game.player === "You" ? game.player_id_you : game.player_id_opponent,
          i, j,
          time: new Date(),
        });
        this.proceedTurn();
      },
      /**
       * プレイヤーを交代する
       */
      flipPlayer: function() {
        if (game.player === "You") {
          game.player = "Opponent";
        } else if (game.player === "Opponent") {
          game.player = "You";
        }
      },
    };

    const handlers = {
      clickCell: (i: number, j: number) => {
        if (0 <= i && i < Game.Row && 0 <= j && j < Game.Col) {
          if (!geo.placabilities.value[i][j]) { return; }
          controller.placePiece(i, j);
        }
      },
    };

    Game.startGame(gameLogs);
    return {
      game,
      gameLogs,
      geo,
      text_geo,
      handlers,
      longestLineLength,
      judge,
    };
  },
});

</script>

<style lang="stylus" scoped>
.game
  height 100%
  display flex
  flex-direction column
  FrameBorderColor = #888
  FrameBorder = 1px solid FrameBorderColor

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

      .logitem
        padding 2px
        height 50px
        display flex
        flex-direction column
        justify-content center
        &.You
          color royalblue
        &.Opponent
          color orange
        .action
          font-weight bold
        &:hover
          background-color #dfd

  
  .board
    flex-grow 1
    flex-shrink 1
    padding 40px
    svg
      border 1px solid #888
      text
        pointer-events none
        fill #888
    .cell
      &.placable
        fill #ddf
        &:hover
          cursor pointer
          fill lightgreen

      &.You
        fill royalblue
      &.Opponent
        fill orange

  .player
    font-weight bold
    &.You
      color royalblue
    &.Opponent
      color orange
</style>
