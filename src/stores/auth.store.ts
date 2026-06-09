import { defineStore } from "pinia";
import { authApi } from "@/api/auth/auth.api";

export const useAuthStore = defineStore("auth", {
	state: () => ({
		token: localStorage.getItem("authToken") as string | null,
	}),

	actions: {
		async login(email: string, password: string, remember: boolean) {
			const { data, error } = await authApi.login({ email, password, remember });

			if (error) {
				throw new Error(error.error.message);
			}

			this.token = data.token;
			localStorage.setItem("authToken", this.token);
		},

		async logout() {
			await authApi.logout();
			this.token = null;
			localStorage.removeItem("authToken");
		},
	},
});
