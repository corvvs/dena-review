<template lang="pug">
.game-stat
  h3.player(
    :class="cssclass"
    v-if="textValue"
  ) {{ textValue }}

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
    winner: {
      type: String,
      required: true,
    },
  },

  setup(prop: {
    game: Game.Game;
    winner: string;
  }, context: SetupContext) {
    const cssclass = computed(() => {
      const r: any = {};
      if (prop.winner) {
        r[prop.winner] = true;
      }
      return r;
    });
    const textValue = computed(() => {
      if (!prop.winner) { return ""; }
      if (prop.game.neutral) {
        if (prop.winner === "You") {
          return `${prop.game.playerYou.name} Won!!`;
        }
        if (prop.winner === "Opponent") {
          return `${prop.game.playerOpponent.name} Won!!`;
        }
      } else {
        if (prop.winner === "You") {
          return `You Won!!`;
        }
        if (prop.winner === "Opponent") {
          return `You Lose...`;
        }
      }
      return "Draw Game."
    });
    return {
      cssclass,
      textValue,
    };
  }
});
</script>

<style lang="stylus" scoped>
ColorYou = royalblue
ColorOpponent = orange

.player
  font-weight bold
  &.You
    color ColorYou
  &.Opponent
    color ColorOpponent
</style>
