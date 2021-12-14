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
        rect.cell(
          v-for="(placement, j) in row"
          :x="placement.x"
          :y="placement.y"
          :width="placement.width"
          :height="placement.height"
          stroke="gray"
          fill="white"
          :class="geo.cellClasses.value[i][j]"
          @click="handlers.clickCell(i, j)"
        )
  .info
    h4 info
    | current player: {{ game.player }}
</template>

<script lang="ts">
import _, { flip } from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { Game } from '@/model/game'

export default defineComponent({
  setup(prop: {
  }, context: SetupContext) {
    const game = reactive(Game.initGame());

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
              x: span + cellSize * j,
              y: span + cellSize * i,
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

    const controller = {
      place: function(j: number) {
        if (!(0 <= j && j < Game.Col)) { return; }
        if (Game.Row <= game.board[j].length) { return; }
        game.board[j].push(game.player);
        this.flip();
      },
      flip: function() {
        if (game.player === "You") {
          game.player = "Opponent";
        } else if (game.player === "Opponent") {
          game.player = "You";
        }
      }
    };

    const handlers = {
      clickCell: (i: number, j: number) => {
        if (0 <= i && i < Game.Row && 0 <= j && j < Game.Col) {
          if (!geo.placabilities.value[i][j]) { return; }
          console.log(i, j);
          controller.place(j);
        }
      },
    };

    return {
      game,
      geo,
      handlers,
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
  .info
    flex-grow 1
    flex-shrink 1
  .cell
    &.placable
      fill lightblue
      &:hover
        cursor pointer
        fill lightgreen

    &.You
      fill royalblue
    &.Opponent
      fill orange
</style>
