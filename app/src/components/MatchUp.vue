<template lang="pug">
.matchup(
)
  .player.round.You(
    :class="cssclass.you"
  )
    span.name {{ game.playerYou.name || "You" }}
  .vs vs
  .player.round.Opponent(
    :class="cssclass.opponent"
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

    const cssclass = computed(() => {
      const you: any = { You: true };
      const opponent: any = { Opponent: true };
      if (!prop.winner) {
        you.turn = prop.game.player === "You";
        opponent.turn = prop.game.player === "Opponent";
      } else if (prop.winner === "You") {
        opponent.lose = true;
      } else if (prop.winner === "Opponent") {
        you.lose = true;
      }
      return {
        you,
        opponent,
      };
    });
    return {
      cssclass,
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
