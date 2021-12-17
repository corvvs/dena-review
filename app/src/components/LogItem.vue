<template lang="pug">
.logitem(
  :class="player"
)
  .action {{ log.action }}
  .at(
    v-if="log.action === 'Place'"
  ) at ({{ log.i }}, {{ log.j }})
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
    log: {
      type: Object as PropType<Game.Log>,
      required: true,
    },
  },

  setup(prop: {
    game: Game.Game;
    log: Game.Log;
  }, context: SetupContext) {
    const player = computed(() => {
      if (prop.log.player_id === prop.game.playerYou.id) { return 'You'; }
      if (prop.log.player_id === prop.game.playerOpponent.id) { return 'Opponent'; }
      return '';
    });
    return {
      player,
    };
  }
});
</script>

<style lang="stylus" scoped>
ColorYou = royalblue
ColorOpponent = orange
.logitem
  padding 2px
  height 50px
  display flex
  flex-direction column
  justify-content center
  &.You
    color ColorYou
  &.Opponent
    color ColorOpponent
  .action
    font-weight bold
  &:hover
    background-color #dfd
</style>
