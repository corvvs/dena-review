<template lang="pug">
.master
  GameView(
    v-if="viewData.game"
    :game="viewData.game"
    @match-again="handlers.matchAgain"
  )
  template(
    v-else
  )
    .title
      h2 M M M M
    .enc
      v-btn(
        :disabled="viewData.state !== 'None'"
        :loading="viewData.state === 'Matching'"
        @click="handlers.clickMatch"
      ) マッチングする
</template>

<script lang="ts">
import _ from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { Game } from '../model/game'
import { M4Player } from '../model/player'
import { M4Match } from '../model/match'
import GameView from '../views/Game.vue'

type MatchingState = "None" | "Matching" | "Matched";

export default defineComponent({
  components: {
    GameView,
  },

  setup(prop: {
  }, context: SetupContext) {
    
    const player: M4Player.PlayerData = M4Player.publishPlayer();
    const viewData: {
      state: MatchingState;
      game: Game.Game | null;
    } = reactive({
      state: "None",
      game: null,
    });

    const controllers = {
      startMatching: async () => {
        if (viewData.state !== "None") { return }
        viewData.state = "Matching";
        try {
          const game = await M4Match.getMatch(player);
          viewData.game = game;
          viewData.state = "Matched";
        } catch (e) {
          console.log(e);
          viewData.state = "None";
        }
      },
    };

    const handlers = {
      clickMatch: async () => {
        await controllers.startMatching();
      },

      matchAgain: async () => {
        viewData.game = null;
        viewData.state = "None";
      },
    };
    return {
      viewData,
      handlers,
    };
  },
});
</script>

<style lang="stylus" scoped>
.master
  height 100%
  display flex
  flex-direction column
  align-content center
  justify-content center

  .enc
    padding 40px
</style>
