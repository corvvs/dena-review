<template lang="pug">
.board
  .svg
    svg(
      :transform="cell_geo.transform"
      :viewBox="cell_geo.viewBox.value"
      :width="cell_geo.width"
      :height="cell_geo.height"
    )
      template(
        v-for="(row, i) in cell_geo.cellPlacements.value"
      )
        g(
          v-for="(placement, j) in row"
          :transform="`translate(${placement.x}, ${placement.y})`"
        )
          rect.frame(
            :x="placement.rx"
            :y="placement.ry"
            :width="placement.width"
            :height="placement.height"
            stroke="gray"
            fill="none"
            :class="cell_geo.cellClasses.value[i][j]"
            @click="handlers.clickCell(i, j)"
          )
          rect.cell(
            :x="placement.rx"
            :y="placement.ry"
            :width="placement.width"
            :height="placement.height"
            fill="white"
            :class="cell_geo.cellClasses.value[i][j]"
            @click="handlers.clickCell(i, j)"
          )
          rect.last-mark(
            :x="placement.lx"
            :y="placement.ly"
            rx="5"
            ry="5"
            :width="placement.lwidth"
            :height="placement.lheight"
            stroke="none"
            :class="cell_geo.cellClasses.value[i][j]"
          )
          text(
            :transform="cell_geo.transform"  
            :x="text_geo.textPlacements.value[i][j].dx"
            :y="text_geo.textPlacements.value[i][j].dy"
            :font-size="text_geo.textPlacements.value[i][j].fontSize"
            v-if="text_geo.textVisibility.value[i][j]"
          ) {{ longestLineLength[i][j] }}

</template>

<script lang="ts">
import _ from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { Game } from '../model/game'

export default defineComponent({
  props: {
    game: {
      type: Object as PropType<Game.Game>,
      required: true,
    },
    ongoing: {
      type: Boolean,
      required: true,
    },
    longestLineLength: {
      type: Array as PropType<number[][]>,
      required: true,
    },
    logs: {
      type: Array as PropType<Game.ActualLog[]>,
      required: true,
    },
  },

  setup(prop: {
    game: Game.Game;
    ongoing: boolean;
    logs: Game.ActualLog[];
  }, context: SetupContext) {

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
            lx: (-cellSize / 2) * 0.55,
            ly: (-cellSize / 2) * 0.55,
            width: cellSize,
            height: cellSize,
            lwidth: cellSize * 0.55,
            lheight: cellSize * 0.55,
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
          if (i < prop.game.board[j].length) {
            return prop.game.board[j][i];
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
          if (!prop.ongoing) { return false; }
          return prop.game.board[j].length == i;
        });
      });
    });

    const cellClasses = computed(() => {
      const lastLog = _.first(prop.logs);
      return _.range(Game.Row).map((i) => {
        return _.range(Game.Col).map((j) => {
          const occupation = cellOccupations.value[i][j];
          const r: any = {
            "placable": placabilities.value[i][j],
            "non-placable": !placabilities.value[i][j],
            "last": lastLog && lastLog.i === i && lastLog.j === j,
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
    const cell_geo = {
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

    const handlers = {
      clickCell: (i: number, j: number) => {
        if (0 <= i && i < Game.Row && 0 <= j && j < Game.Col) {
          if (!cell_geo.placabilities.value[i][j]) { return; }
          context.emit("place-cell", { i, j });
        }
      },
    };

    return {
      cell_geo,
      text_geo,
      handlers,
    };
  },
});
</script>

<style lang="stylus" scoped>
ColorYou = royalblue
ColorOpponent = orange
ColorLastYou = lightgreen
ColorLastOpponent = tomato

.board
  padding 40px
  padding-top 80px
  display flex
  flex-direction column

  .svg
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
        fill ColorLastYou

    &.You
      fill ColorYou
    &.Opponent
      fill ColorOpponent
  .frame
    pointer-events none
  .last-mark
    pointer-events none
    display none
    &.last
      display inline
      &.You
        fill ColorLastYou
      &.Opponent
        fill ColorLastOpponent

.cell, .last-mark
  &.last
    animation-name placingPanelAnime
    animation-duration 0.33s
    animation-fill-mode forwards
    animation-iteration-count 1
    animation-timing-function cubic-bezier(.64,1.82,.48,.73)



@keyframes placingPanelAnime
  from
    transform scale(0, 0)
  to
    transform scale(1,1)

</style>
