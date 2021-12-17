<template lang="pug">
.master
  GameView(
    v-if="viewData.game"
    :player="player"
    :game="viewData.game"
    @match-again="handlers.matchAgain"
  )
  template(
    v-else
  )
    .title
      h2 M M M M
    .enc
      .nickname
        v-text-field(
          :disabled="viewData.state !== 'None'"
          label="ニックネーム(任意)"
          v-model="viewData.nickname"
        )
      .go
        v-btn(
          :disabled="viewData.state !== 'None'"
          :loading="viewData.state === 'Matching'"
          @click="handlers.clickMatch"
        ) マッチングする

      .state(
        v-if="viewData.state === 'None'"
      ) クリックするとマッチングを試みます
      .state(
        v-else-if="viewData.state === 'Matching'"
      ) しばらくお待ちください...
      .state(
        v-else-if="viewData.state === 'Matched'"
      ) マッチング完了！
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
      nickname: string;
      game: Game.Game | null;
    } = reactive({
      state: "None",
      nickname: "",
      game: null,
    });

    const effectiveNickname = computed(() => {
      const n = viewData.nickname.trim();
      if (!n) { return null; }
      return n;
    });

    const controllers = {
      startMatching: async () => {
        if (viewData.state !== "None") { return }
        viewData.state = "Matching";
        try {
          player.name = effectiveNickname.value || "";
          const game = await M4Match.getMatch(player);
          viewData.game = reactive(game!) as Game.Game;
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
      player,
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
    display flex
    flex-direction column
    align-items center
    justify-content center
    .nickname
      width 24em;
</style>
