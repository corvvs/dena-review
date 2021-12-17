<template lang="pug">
.matchup(
)
  .player.round.You(
    :class="(winner && winner !== 'You') ? 'lose' : game.player === 'You' ? 'turn' : ''"
  )
    span.name {{ game.playerYou.name || "You" }}
  .vs vs
  .player.round.Opponent(
    :class="(winner && winner !== 'Opponent') ? 'lose' : game.player === 'Opponent' ? 'turn' : ''"
  )
    span.name {{ game.playerOpponent.name || "Opponent" }}
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
    winner: string | null;
  }, context: SetupContext) {

    return {
    };
  }
});
</script>

<style lang="stylus" scoped>
ColorYou = royalblue
ColorOpponent = orange

.matchup
  padding 4px
.vs
  font-weight bold

.round
  text-align center
  .name
    padding 2px 8px
    border-radius 4px
    font-weight bold
  &.turn
    &.You
      .name
        color white
        background-color ColorYou
    &.Opponent
      .name
        color white
        background-color ColorOpponent
  &.lose
    opacity 0.5
    .name
      color #ddd

.player
  font-weight bold
  &.You
    background-color none
    color ColorYou
  &.Opponent
    background-color none
    color ColorOpponent
</style>
