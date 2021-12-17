<template lang="pug">
.watch-game
  .head
    v-btn(
      x-large
      @click="handlers.clickBack"
    )
      v-icon arrow_back
      | 戻る

  .watch-view(
    v-if="viewData.game"
  )
    GameView(
      :game="viewData.game"
      :player="viewData.game.playerYou"
    )

</template>

<script lang="ts">
import _ from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { Game } from '../model/game'
import { M4Player } from '../model/player'
import { M4Match } from '../model/match'
import GameView from './Game.vue'
import Router from '../router/index'

type WatchingState = "None" | "Loading" | "Loaded";

export default defineComponent({
  components: {
    GameView,
  },

  props: {
    id: {
      type: String,
      required: true,
    },
  },

  setup(prop: {
    id: string;
  }, context: SetupContext) {
    
    const viewData: {
      state: WatchingState;
      game: Game.Game | null;
    } = reactive({
      state: "None",
      game: null,
    });

    const retrieveGame = async () => {
      const game = await M4Match.fetchMatch(prop.id);
      viewData.game = game;
    };
    retrieveGame().then(console.log, console.error);
    return {
      viewData,
      handlers: {
        clickBack: () => Router.push('/w'),
      },
    };
  },
});
</script>

<style lang="stylus" scoped>
.watch-game
  height 100%
  display flex
  flex-direction column

  .head
    flex-grow 0
    flex-shrink 0
    text-align left

  .watch-view
    flex-grow 1
    flex-shrink 1
    overflow hidden

</style>
