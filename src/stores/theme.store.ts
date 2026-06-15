import { defineStore } from "pinia";

import { themes } from "@/styles/theme/theme";
import { applyTheme } from "@/styles/theme/applyTheme";

export const useThemeStore = defineStore("theme", {
	state: () => ({
		dark: localStorage.getItem("theme") === "dark",
	}),

	actions: {
		initializeTheme() {
			applyTheme(this.dark ? themes.dark : themes.light);
			document.documentElement.setAttribute("data-theme", this.dark ? "dark" : "light");
		},

		toggleTheme() {
			this.dark = !this.dark;

			localStorage.setItem("theme", this.dark ? "dark" : "light");

			applyTheme(this.dark ? themes.dark : themes.light);
			document.documentElement.setAttribute("data-theme", this.dark ? "dark" : "light");
		},
	},
});
