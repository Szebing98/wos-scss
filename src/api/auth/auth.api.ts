import client from "../client";
import type { LoginBody } from "./auth.types";

export const authApi = {
	login: (body: LoginBody) => client.POST("/api/auth/login", { body }) as any,

	logout: () => client.POST("/api/auth/logout", {}) as any,

	me: () => client.GET("/api/auth/me") as any,

	activate: (body: { token: string; password: string; passwordConfirm: string }) =>
		client.POST("/api/auth/activate", { body }) as any,

	forgotPassword: (body: { email: string }) => client.POST("/api/auth/forgot-password", { body }) as any,

	resetPassword: (body: { token: string; password: string; passwordConfirm: string }) =>
		client.POST("/api/auth/reset-password", { body }) as any,

	changePassword: (body: {
		currentPassword: string;
		newPassword: string;
		newPasswordConfirm: string;
	}) => client.POST("/api/auth/change-password", { body }),
};
