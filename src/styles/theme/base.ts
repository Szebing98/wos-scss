export const baseTheme = {
	spacing: {
		xs: "4px",
		sm: "8px",
		md: "16px",
		lg: "24px",
		xl: "32px",
		xxl: "48px",
	},

	radius: {
		sm: "6px",
		md: "10px",
		lg: "16px",
		xl: "24px",
		full: "9999px",
	},

	typography: {
		fontFamily: `'Inter', sans-serif`,

		fontSize: {
			xs: "12px",
			sm: "14px",
			md: "16px",
			lg: "20px",
			xl: "28px",
			xxl: "36px",
		},

		fontWeight: {
			regular: 400,
			medium: 500,
			semibold: 600,
			bold: 700,
		},

		lineHeight: {
			tight: 1.2,
			normal: 1.5,
			relaxed: 1.8,
		},
	},

	shadow: {
		sm: "0 1px 2px rgba(0,0,0,0.05)",
		md: "0 4px 12px rgba(0,0,0,0.08)",
		lg: "0 10px 24px rgba(0,0,0,0.12)",
	},

	zIndex: {
		dropdown: 1000,
		modal: 1300,
		toast: 1500,
	},
} as const;
