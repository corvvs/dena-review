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
      h1
        span(:class="mmmm[0]") M 
        span(:class="mmmm[1]") M 
        span(:class="mmmm[2]") M 
        span(:class="mmmm[3]") M
    .enc
      .nickname
        v-text-field(
          :disabled="viewData.state !== 'None'"
          label="ニックネーム"
          hint="2文字以上です"
          v-model="viewData.nickname"
        )
      .go
        v-btn(
          :disabled="!effectiveNickname || viewData.state !== 'None'"
          :loading="viewData.state === 'Matching'"
          @click="handlers.clickMatch"
        ) マッチングする

      .state.error(
        v-if="viewData.matchingError"
      ) {{ viewData.matchingError }}
      .state(
        v-else-if="viewData.state === 'None'"
      ) クリックするとマッチングを試みます
      .state(
        v-else-if="viewData.state === 'Matching'"
      ) しばらくお待ちください...
      .state(
        v-else-if="viewData.state === 'Matched'"
      ) マッチング完了！
    .watcher
      v-btn(
        @click="handlers.clickWatcher"
      ) 観戦する
    .single-play
      v-btn(
        :disabled="!effectiveNickname || viewData.state !== 'None'"
        @click="handlers.clickSinglePlay"
      ) シングルプレイ
</template>

<script lang="ts">
import _, { random } from 'lodash';
import { reactive, ref, Ref, SetupContext, defineComponent, onMounted, PropType, watch, computed } from '@vue/composition-api';
import { Game } from '../model/game'
import { M4Player } from '../model/player'
import { M4Match } from '../model/match'
import GameView from '../views/Game.vue'
import Router from '../router/index'

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
      matchingError: string;
    } = reactive({
      state: "None",
      nickname: localStorage.getItem("mmmm_nickname") || "",
      game: null,
      matchingError: "",
    });

    const effectiveNickname = computed(() => {
      const n = viewData.nickname.trim();
      if (!n) { return null; }
      if (n.length < 2) { return null; }
      return n;
    });

    const controllers = {
      startMatching: async () => {
        if (viewData.state !== "None") { return }
        viewData.state = "Matching";
        viewData.matchingError = "";
        try {
          player.name = effectiveNickname.value || "";
          localStorage.setItem("mmmm_nickname", player.name);
          const game = await M4Match.getMatch(player);
          viewData.game = reactive(game!) as Game.Game;
          viewData.state = "Matched";
        } catch (e) {
          console.log(e);
          viewData.state = "None";
          viewData.matchingError = "マッチングに失敗しました。もう一度お試しください。";
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

      clickWatcher: () => {
        Router.push('w');
      },

      clickSinglePlay: () => {
        if (effectiveNickname.value) {
          player.name = effectiveNickname.value || "";
          localStorage.setItem("mmmm_nickname", player.name);
        }
        const opponent = M4Player.publishCom();
        viewData.game = {
          match_id: "single-player",
          player_id_you: player.id,
          playerYou: player,
          player_id_opponent: opponent.id,
          playerOpponent: opponent,
          player: "You",
          neutral: false,
        }
        viewData.state = "Matched";
      },
    };
    return {
      player,
      viewData,
      effectiveNickname,
      handlers,
      mmmm: (() => {
        return ["0011", "0101", "1001", "0110", "1010", "1100"][Math.floor(Math.random() * 6)]
          .split("")
          .map(s => s === "0" ? "You" : "Opponent");
      })(),
    };
  },
});
</script>

<style lang="stylus" scoped>
ColorYou = royalblue
ColorOpponent = orange

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
  .error
    color red

  .watcher, .single-play
    padding 8px

  .You
    color ColorYou
  .Opponent
    color ColorOpponent

</style>
