import { defineStore } from "pinia";
import { authApi } from "@/api/auth/auth.api";

export const useAuthStore = defineStore("auth", {
	state: () => ({
		token: localStorage.getItem("authToken") as string | null,
		// Basic user info persisted from login response
		user: localStorage.getItem("authUser") ? JSON.parse(localStorage.getItem("authUser")!) : null,
		// Full /me profile — fetched on app boot, shared across all components
		currentUser: null as any | null,
	}),

	actions: {
		async login(email: string, password: string, remember: boolean) {
			const { data, error } = await authApi.login({ email, password, remember }) as any;

			if (error) {
				throw new Error(error.error.message);
			}

			this.token = data.token;
			this.user = data.user;
			localStorage.setItem("authToken", this.token!);
			localStorage.setItem("authUser", JSON.stringify(this.user));
		},

		// Fetch full /me profile and cache in store
		async fetchMe() {
			const { data } = await authApi.me();
			if (data) {
				this.currentUser = data;
			}
			return data;
		},

		// Patch profile image locally — no refetch needed
		updateProfileImage(url: string) {
			if (this.currentUser) {
				this.currentUser = { ...this.currentUser, profileImage: url };
			}
			// Also keep login user obj in sync
			if (this.user) {
				this.user = { ...this.user, profileImage: url };
				localStorage.setItem("authUser", JSON.stringify(this.user));
			}
		},

		async forgotPassword(email: string) {
			const { data, error } = await authApi.forgotPassword({ email }) as any;

			if (error) {
				throw new Error(error.error.message);
			}

			return data;
		},

		async activateAccount(token: string, password: string, passwordConfirm: string) {
			const { data, error } = await authApi.activate({
				token,
				password,
				passwordConfirm,
			}) as any;

			if (error) {
				throw new Error(error.error.message);
			}

			return data;
		},

		async resetPassword(token: string, password: string, passwordConfirm: string) {
			const { data, error } = await authApi.resetPassword({
				token,
				password,
				passwordConfirm,
			}) as any;

			if (error) {
				throw new Error(error.error.message);
			}

			return data;
		},

		async logout() {
			try {
				await authApi.logout();
			} catch (e) {
				console.error(e);
			}
			this.token = null;
			this.user = null;
			this.currentUser = null;
			localStorage.removeItem("authToken");
			localStorage.removeItem("authUser");
		},
	},
});
