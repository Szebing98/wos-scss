import client from "../client";
import type { LoginBody } from "./auth.types";

export const authApi = {
	login: (body: LoginBody) => client.POST("/api/auth/login", { body }),

	logout: () => client.POST("/api/auth/logout", {}),

	me: () => client.GET("/api/auth/me"),

	activate: (body: { token: string; password: string; passwordConfirm: string }) =>
		client.POST("/api/auth/activate", { body }),

	forgotPassword: (body: { email: string }) => client.POST("/api/auth/forgot-password", { body }),

	resetPassword: (body: { token: string; password: string; passwordConfirm: string }) =>
		client.POST("/api/auth/reset-password", { body }),

	// changePassword: (body: { currentPassword: string; newPassword: string }) =>
	// 	client.POST("/api/auth/change-password", { body }),
};
