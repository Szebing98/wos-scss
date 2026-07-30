import type { operations } from "../schema";

export type NotificationListQuery =
	operations["getApiNotifications"]["parameters"]["query"];

export type NotificationListResponse =
	operations["getApiNotifications"]["responses"][200]["content"]["application/json"];

export type NotificationItem = NotificationListResponse["data"][number];
