import { createApp } from "vue";
import App from "./App.vue";

import { createPinia } from "pinia";

import { useThemeStore } from "@/stores/theme.store";

import "./styles/main.scss";

const app = createApp(App);

const pinia = createPinia();

app.use(pinia);

const themeStore = useThemeStore();

themeStore.initializeTheme();

app.mount("#app");
