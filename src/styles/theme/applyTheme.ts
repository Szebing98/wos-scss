type ThemeObject = Record<string, any>;

const flattenTheme = (obj: ThemeObject, prefix = ""): Record<string, string> => {
	return Object.entries(obj).reduce(
		(acc, [key, value]) => {
			const newKey = prefix ? `${prefix}-${key}` : key;

			if (typeof value === "object" && value !== null) {
				Object.assign(acc, flattenTheme(value, newKey));
			} else {
				acc[newKey] = String(value);
			}

			return acc;
		},
		{} as Record<string, string>,
	);
};

export const applyTheme = (theme: ThemeObject) => {
	const root = document.documentElement;

	const vars = flattenTheme(theme);

	Object.entries(vars).forEach(([key, value]) => {
		root.style.setProperty(`--${key}`, value);
	});
};
