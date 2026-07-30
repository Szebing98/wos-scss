import client from "../client";
import type { NotificationListQuery } from "./notification.types";

export const notificationApi = {
	getAll: (query: NotificationListQuery) =>
		client.GET("/api/notifications", { params: { query } }) as any,

	getUnread: (query: NotificationListQuery) =>
		client.GET("/api/notifications/unread", { params: { query } }) as any,

	markRead: (code: string) =>
		client.PATCH("/api/notifications/read/{code}", { params: { path: { code } } }) as any,

	markAllRead: () => client.PATCH("/api/notifications/read-all") as any,

	markUnread: (code: string) =>
		client.PATCH("/api/notifications/unread/{code}", { params: { path: { code } } }) as any,
};
