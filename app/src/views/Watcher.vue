<template lang="pug">
.watcher
  .head
    v-btn(
      x-large
      @click="handlers.clickBack"
    )
      v-icon arrow_back
      | 戻る

  .game-list
    .game-item(
      v-for="game in viewData.games"
      @click="handlers.clickItem(game)"
    )
      .id               {{ game.match_id }}
      .player.You       {{ game.playerYou.name }}
      .player.vs        vs
      .player.Opponent  {{ game.playerOpponent.name }}
      .hands            {{ game.logs.length }} hands
      .time             {{ game.expires_at }}

</template>

<script lang="ts">
import _ from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import useRouter from 'vue-router'
import { Game } from '../model/game'
import { M4Player } from '../model/player'
import { M4Match } from '../model/match'
import GameView from './Game.vue'
import Router from '../router/index'

export default defineComponent({
  components: {
    GameView,
  },

  setup(prop: {
  }, context: SetupContext) {
    
    const viewData: {
      games: Game.Game[];
    } = reactive({
      games: [],
    });

    M4Match.listGames(games => {
      viewData.games.splice(0, viewData.games.length, ...games);
    });
    return {
      viewData,
      handlers: {
        clickBack: () => Router.push('/'),
        clickItem: (game: Game.Game) => {
          Router.push(`/w/${game.match_id}`);
        },
      },
    };
  },
});
</script>

<style lang="stylus" scoped>
.watcher
  height 100%
  display flex
  flex-direction column
  align-content center
  justify-content center

  .head
    flex-grow 0
    flex-shrink 0
    text-align left

  .game-list
    flex-grow 1
    flex-shrink 1
    overflow-y scroll
    justify-content center
    align-items center
    align-content center
    justify-items center
    .game-item
      display flex
      flex-direction row
      &:hover
        background-color lightgreen
        cursor pointer
      .id
        padding 4px
        text-align left
        flex-grow 0
        flex-shrink 0
        width 12em
        font-weight bold
        font-family "Courier New", Consolas, monospace

      .player
        flex-grow 0
        flex-shrink 0
        &.You, &.Opponent
          flex-basis 12em
          font-weight bold
        &.vs
          flex-basis 2em
      .hands
        padding 4px
        flex-basis 6em
      .time
        padding 4px
        flex-grow 1
        flex-shrink 1
        text-align left

</style>
