<template lang="pug">
.logitem(
  :class="cssclass"
  @click="handlers.click(log)"
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
    isMarked: {
      type: Boolean,
      required: true,
    },
  },

  setup(prop: {
    game: Game.Game;
    log: Game.Log;
    isMarked: boolean;
  }, context: SetupContext) {
    const player = computed(() => {
      if (prop.log.player_id === prop.game.playerYou.id) { return 'You'; }
      if (prop.log.player_id === prop.game.playerOpponent.id) { return 'Opponent'; }
      return '';
    });
    const clickable = computed(() => {
      if (!prop.game.neutral) { return false }
      return (prop.log.action === 'GameStart' || prop.log.action === 'Place')
    });
    const cssclass = computed(() => {
      const r: any = {};
      r[player.value] = true;
      r["clickable"] = clickable.value;
      r["is-marked"] = prop.isMarked;
      return r;
    });

    return {
      player,
      cssclass,
      handlers: {
        click: (log: Game.Log) => {
          if (!clickable.value) { return; }
          context.emit("click-log", log);
        },
      },
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
  &.is-marked  
    background-color #ddd
  &.clickable:hover
    background-color #dfd
    cursor pointer

</style>
