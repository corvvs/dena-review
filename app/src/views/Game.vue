<template lang="pug">
.game
  h3 game
  .board
    h4 board
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
          ) {{ longestLineLength[i][j] }}
  .info
    h4 info
    | current player: {{ game.player }}
    | {{ longestLineLength }}
</template>

<script lang="ts">
import _, { flip } from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { Game } from '../model/game'

export default defineComponent({
  setup(prop: {
  }, context: SetupContext) {
    const game: Game.Game = reactive(Game.initGame());

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

    /**
     * 当該セルが敵の色の場合は0,
     * そうでない場合、当該セルが自分の色だと仮定した時の、最大の連続並びの長さ
     * (当該セルが本当に自分の色であり、かつこの値が4以上の場合、ゲームに勝利していることになる)
     */
    const longestLineLength = computed(() => {
      const exBoard = extendedBoard.value;
      const playerFor = game.player;
      return Game.longestLineLengths(exBoard, playerFor);
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

    const controller = {
      /**
       * コマを置く
       */
      placePiece: function(j: number) {
        if (!(0 <= j && j < Game.Col)) { return; }
        if (Game.Row <= game.board[j].length) { return; }
        game.board[j].push(game.player);
        this.flipPlayer();
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
          controller.placePiece(j);
        }
      },
    };

    return {
      game,
      geo,
      text_geo,
      handlers,
      longestLineLength,
    };
  },
});

</script>

<style lang="stylus" scoped>
.game
  height 100%
  display flex
  flex-direction column

  .board
    flex-grow 0
    flex-shrink 0
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

  .info
    flex-grow 1
    flex-shrink 1
</style>
