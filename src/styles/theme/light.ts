export const lightTheme = {
	colors: {
		brand: {
			primary: "#5058F2",
			primaryHover: "#444ACF",
			primaryActive: "#363CBE",
			primarySoft: "#EEF0FF",
		},

		surface: {
			background: "#F8FAFC",
			card: "#FFFFFF",
			elevated: "#FFFFFF",
			border: "#E2E8F0",
			hover: "#F1F5F9",
		},

		text: {
			primary: "#0F172A",
			secondary: "#475569",
			muted: "#94A3B8",
			inverse: "#FFFFFF",
			disabled: "#CBD5E1",
		},

		state: {
			success: "#22C55E",
			warning: "#F59E0B",
			error: "#EF4444",
			info: "#3B82F6",
		},

		status: {
			new: "#3B82F6",
			pending: "#F59E0B",
			progress: "#6366F1",
			done: "#06B6D4",
			completed: "#10B981",
			claimed: "#14B8A6",
			closed: "#64748B",
			cancelled: "#EF4444",
			draft: "#475569"
		}
	},
} as const;
