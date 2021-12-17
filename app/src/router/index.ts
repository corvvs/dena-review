import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Game from '@/views/Game.vue';
import Master from '@/views/Master.vue';

Vue.use(VueRouter);

const routes: RouteConfig[] = [
  {
    path: '/',
    name: 'Master',
    component: Master,
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
