import Vue from 'vue';
import App from './App.vue';
import router from './router';
import VueCompositionApi from '@vue/composition-api';
import vuetify from './plugins/vuetify'

Vue.use(VueCompositionApi);
Vue.config.productionTip = false;

new Vue({
  router,
  vuetify,
  render: (h) => h(App)
}).$mount('#app');
