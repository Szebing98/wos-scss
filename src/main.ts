import { createApp } from "vue";
import App from "./App.vue";

import { createPinia } from "pinia";

import { useThemeStore } from "@/stores/theme.store";

import "@/styles/index.scss";
import "@mdi/font/css/materialdesignicons.css";
import router from "@/router";

const app = createApp(App);

const pinia = createPinia();

app.use(pinia);

const themeStore = useThemeStore();

themeStore.initializeTheme();

app.use(router);
app.mount("#app");
