import { defineStore } from "pinia";
import http from "@/utils/http";

export const useAuthStore = defineStore("auth", {
	state: () => ({
		token: localStorage.getItem("authToken"),
	}),

	actions: {
		async login(email: string, password: string) {
			const res = await http.post("/api/auth/login", {
				email,
				password,
			});

			this.token = res.data.accessToken;
			if (this.token) {
				localStorage.setItem("authToken", this.token);
			}
		},

		logout() {
			this.token = null;
			localStorage.removeItem("authToken");
		},
	},
});
