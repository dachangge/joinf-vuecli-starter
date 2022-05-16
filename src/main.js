import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;

import "@/utils/filters";

import "@/plugin/element";

import "@/plugin/axios";

import "@/utils/modal";

import "@/components/index";

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount("#app");
