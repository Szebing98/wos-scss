import { defineStore } from "pinia";
import { authApi } from "@/api/auth/auth.api";
import { getApiErrorMessage } from "@/utils/error";

let fetchMePromise: Promise<any> | null = null;

export const useAuthStore = defineStore("auth", {
	state: () => ({
		token: localStorage.getItem("authToken") as string | null,
		// Basic user info persisted from login response
		user: localStorage.getItem("authUser")
			? JSON.parse(localStorage.getItem("authUser")!)
			: null,
		// Full /me profile — fetched on app boot, shared across all components
		currentUser: null as any | null,
	}),

	getters: {
		can: (state) => (action: string, subject: string) => {
			const rights = state.currentUser?.accessRights || [];
			for (let index = rights.length - 1; index >= 0; index -= 1) {
				const right = rights[index];
				const actionMatches = right.action === action || right.action === "manage";
				const subjectMatches = right.subject === subject || right.subject === "all";
				if (actionMatches && subjectMatches) return !right.inverted;
			}
			return false;
		},
	},

	actions: {
		async login(email: string, password: string, remember: boolean) {
			const { data, error } = (await authApi.login({ email, password, remember })) as any;

			if (error) {
				throw new Error(getApiErrorMessage(error, "An error occurred"));
			}

			this.token = data.token;
			this.user = data.user;
			// The login response already contains the same authorization context as /me.
			// Populate it immediately so the post-login route does not fetch it again.
			this.currentUser = {
				...data.user,
				userGroups: data.userGroups ?? [],
				accessRights: data.accessRights ?? [],
			};
			localStorage.setItem("authToken", this.token!);
			localStorage.setItem("authUser", JSON.stringify(this.user));
		},

		// Fetch full /me profile and cache in store
		async fetchMe() {
			if (this.currentUser) return this.currentUser;

			if (!fetchMePromise) {
				fetchMePromise = authApi
					.me()
					.then(({ data }: any) => {
						if (data) this.currentUser = data;
						return data;
					})
					.finally(() => {
						fetchMePromise = null;
					});
			}

			return fetchMePromise;
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
			const { data, error } = (await authApi.forgotPassword({ email })) as any;

			if (error) {
				throw new Error(getApiErrorMessage(error, "An error occurred"));
			}

			return data;
		},

		async activateAccount(token: string, password: string, passwordConfirm: string) {
			const { data, error } = (await authApi.activate({
				token,
				password,
				passwordConfirm,
			})) as any;

			if (error) {
				throw new Error(getApiErrorMessage(error, "An error occurred"));
			}

			return data;
		},

		async resetPassword(token: string, password: string, passwordConfirm: string) {
			const { data, error } = (await authApi.resetPassword({
				token,
				password,
				passwordConfirm,
			})) as any;

			if (error) {
				throw new Error(getApiErrorMessage(error, "An error occurred"));
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
			fetchMePromise = null;
			localStorage.removeItem("authToken");
			localStorage.removeItem("authUser");
		},
	},
});
