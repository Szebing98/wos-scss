import { baseTheme } from "./base";
import { lightTheme } from "./light";
import { darkTheme } from "./dark";

export const themes = {
	light: {
		...baseTheme,
		...lightTheme,
	},

	dark: {
		...baseTheme,
		...darkTheme,
	},
};

export type Theme = typeof themes.light;
