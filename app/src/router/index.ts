import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Master from '@/views/Master.vue';
import Watcher from '@/views/Watcher.vue'
import WatchGame from '@/views/WatchGame.vue'

Vue.use(VueRouter);

const routes: RouteConfig[] = [
  {
    path: '/',
    name: 'Master',
    component: Master,
  },
  {
    path: '/w',
    name: 'Watcher',
    component: Watcher,
  },
  {
    path: '/w/:id',
    name: 'WatchGame',
    component: WatchGame,
    props: true,
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
