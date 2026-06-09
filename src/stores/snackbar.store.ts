import { defineStore } from "pinia";

type SnackbarType = "success" | "error" | "info" | "warning";

export const useSnackbarStore = defineStore("snackbar", {
	state: () => ({
		items: [] as {
			id: number;
			message: string;
			type: SnackbarType;
		}[],
	}),

	actions: {
		push(message: string, type: SnackbarType) {
			const id = Date.now();

			this.items.push({
				id,
				message,
				type,
			});

			setTimeout(() => {
				this.remove(id);
			}, 3000);
		},

		remove(id: number) {
			this.items = this.items.filter((t) => t.id !== id);
		},

		success(msg: string) {
			this.push(msg, "success");
		},

		error(msg: string) {
			this.push(msg, "error");
		},

		info(msg: string) {
			this.push(msg, "info");
		},

		warning(msg: string) {
			this.push(msg, "warning");
		},
	},
});
