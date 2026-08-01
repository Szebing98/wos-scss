<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { notificationApi } from "@/api/notification/notification.api";
import type { NotificationItem } from "@/api/notification/notification.types";
import Button from "@/components/Button.vue";
import Card from "@/components/Card.vue";
import { getApiErrorMessage } from "@/utils/error";

type Filter = "all" | "unread" | "read";

const router = useRouter();
const notifications = ref<NotificationItem[]>([]);
const activeFilter = ref<Filter>("all");
const isLoading = ref(false);
const errorMessage = ref("");
const updatingCode = ref("");
const page = ref(1);
const pageSize = 10;

const filteredNotifications = computed(() => {
	if (activeFilter.value === "unread") {
		return notifications.value.filter((item) => !item.isRead);
	}
	if (activeFilter.value === "read") {
		return notifications.value.filter((item) => item.isRead);
	}
	return notifications.value;
});

const totalPages = computed(() =>
	Math.max(1, Math.ceil(filteredNotifications.value.length / pageSize)),
);

const pagedNotifications = computed(() => {
	const start = (page.value - 1) * pageSize;
	return filteredNotifications.value.slice(start, start + pageSize);
});

const unreadCount = computed(() =>
	notifications.value.filter((item) => !item.isRead).length,
);

function setFilter(filter: Filter) {
	activeFilter.value = filter;
	page.value = 1;
}

async function loadNotifications() {
	isLoading.value = true;
	errorMessage.value = "";

	try {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kuala_Lumpur";
		const response = await notificationApi.getAll({
			pageIndex: 0,
			pageSize: 100,
			sort: "createdAt-desc",
			timezone,
		});

		if (response.error) {
			throw new Error(getApiErrorMessage(response.error, "Unable to load notifications."));
		}

		notifications.value = response.data?.data || [];
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : "Unable to load notifications.";
	} finally {
		isLoading.value = false;
	}
}

async function toggleRead(notification: NotificationItem) {
	updatingCode.value = notification.code;
	errorMessage.value = "";

	try {
		const response = notification.isRead
			? await notificationApi.markUnread(notification.code)
			: await notificationApi.markRead(notification.code);

		if (response.error) {
			throw new Error(getApiErrorMessage(response.error, "Unable to update notification."));
		}

		notification.isRead = !notification.isRead;
		if (page.value > totalPages.value) page.value = totalPages.value;
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : "Unable to update notification.";
	} finally {
		updatingCode.value = "";
	}
}

async function markAllRead() {
	if (!unreadCount.value) return;
	updatingCode.value = "all";
	errorMessage.value = "";

	try {
		const response = await notificationApi.markAllRead();
		if (response.error) {
			throw new Error(getApiErrorMessage(response.error, "Unable to update notifications."));
		}
		notifications.value.forEach((notification) => {
			notification.isRead = true;
		});
		if (page.value > totalPages.value) page.value = totalPages.value;
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : "Unable to update notifications.";
	} finally {
		updatingCode.value = "";
	}
}

async function openNotification(notification: NotificationItem) {
	if (!notification.isRead) await toggleRead(notification);

	if (notification.referenceType === "WorkOrder" && notification.referenceId) {
		router.push({
			name: "Work Order Detail",
			params: { id: notification.referenceId },
		});
	}
}



function getPayloadRecord(payload: unknown) {
	if (payload && typeof payload === "object" && !Array.isArray(payload)) {
		return payload as Record<string, unknown>;
	}
	return null;
}

function getNotificationTitle(notification: NotificationItem) {
	const payload = getPayloadRecord(notification.payload);
	const code = typeof payload?.code === "string" ? payload.code : "";
	const title = typeof payload?.title === "string" ? payload.title : "";
	const titles: Record<string, string> = {
		WO_DRAFT_CREATED: code ? `Draft Work Order ${code}` : "Draft Work Order Saved",
		WO_CREATED: code ? `New Work Order ${code}` : "New Work Order",
		WO_SUBMITTED: code ? `Work Order ${code} Pending Approval` : "Work Order Pending Approval",
		WO_APPROVED: code ? `Work Order ${code} Approved` : "Work Order Approved",
		WO_REJECTED: code ? `Work Order ${code} Rejected` : "Work Order Rejected",
	};

	if (titles[notification.templateCode]) return titles[notification.templateCode];
	const value = title || payload?.subject || payload?.heading;
	if (typeof value === "string" && value.trim()) return value;
	return notification.templateCode
		.replace(/[_-]+/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getNotificationDescription(notification: NotificationItem) {
	const payload = getPayloadRecord(notification.payload);
	const title = typeof payload?.title === "string" ? payload.title : "";
	const code = typeof payload?.code === "string" ? payload.code : "";

	if (notification.referenceType === "WorkOrder" && title) {
		return code ? `${title} (${code})` : title;
	}

	const value = payload?.message || payload?.description || payload?.body || payload?.content;
	if (typeof value === "string" && value.trim()) return value;
	if (notification.referenceType) return `Related to ${notification.referenceType}`;
	return "Open WOS MariaDB to review this notification.";
}

function formatDate(value?: string) {
	if (!value) return "";
	return new Intl.DateTimeFormat("en-MY", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}

onMounted(loadNotifications);
</script>

<template>
	<div class="notifications-page">
		<header class="page-header">
			<div>
				<h1>Notifications</h1>
				<p>Review all your updates, including notifications you have already read.</p>
			</div>
			<Button
				v-if="unreadCount"
				variant="secondary"
				:disabled="updatingCode === 'all'"
				@click="markAllRead"
			>
				<i :class="updatingCode === 'all' ? 'mdi mdi-loading mdi-spin' : 'mdi mdi-check-all'"></i>
				Mark all as read
			</Button>
		</header>

		<Card class="notifications-card">
			<div class="notifications-tabs" role="tablist" aria-label="Notification filters">
				<button
					v-for="filter in (['all', 'unread', 'read'] as Filter[])"
					:key="filter"
					type="button"
					role="tab"
					:aria-selected="activeFilter === filter"
					:class="{ 'is-active': activeFilter === filter }"
					@click="setFilter(filter)"
				>
					{{ filter[0].toUpperCase() + filter.slice(1) }}
					<span v-if="filter === 'unread' && unreadCount">{{ unreadCount }}</span>
				</button>
			</div>

			<div v-if="errorMessage" class="notifications-state notifications-state--error">
				<i class="mdi mdi-alert-circle-outline"></i>
				<div>
					<strong>Something went wrong</strong>
					<p>{{ errorMessage }}</p>
				</div>
				<button type="button" @click="loadNotifications">Try again</button>
			</div>

			<div v-else-if="isLoading" class="notifications-state">
				<i class="mdi mdi-loading mdi-spin"></i>
				<p>Loading notifications...</p>
			</div>

			<div v-else-if="!pagedNotifications.length" class="notifications-state">
				<i class="mdi mdi-bell-check-outline"></i>
				<strong>No {{ activeFilter === "all" ? "" : activeFilter }} notifications</strong>
				<p>You're all caught up.</p>
			</div>

			<div v-else class="notifications-list">
				<article
					v-for="notification in pagedNotifications"
					:key="notification.code"
					class="notification-row"
					:class="{ 'notification-row--unread': !notification.isRead }"
				>
					<button
						class="notification-row__main"
						type="button"
						@click="openNotification(notification)"
					>
						<span class="notification-row__icon">
							<i :class="notification.isRead ? 'mdi mdi-bell-outline' : 'mdi mdi-bell-ring-outline'"></i>
						</span>
						<span class="notification-row__content">
							<span class="notification-row__topline">
								<strong>{{ getNotificationTitle(notification) }}</strong>
								<time>{{ formatDate(notification.createdAt) }}</time>
							</span>
							<span class="notification-row__message">
								{{ getNotificationDescription(notification) }}
							</span>
							<span class="notification-row__status">
								<i v-if="!notification.isRead" class="notification-row__dot"></i>
								{{ notification.isRead ? "Read" : "Unread" }}
							</span>
						</span>
					</button>

					<button
						class="notification-row__action"
						type="button"
						:disabled="updatingCode === notification.code"
						:title="notification.isRead ? 'Mark as unread' : 'Mark as read'"
						:aria-label="notification.isRead ? 'Mark as unread' : 'Mark as read'"
						@click="toggleRead(notification)"
					>
						<i
							:class="
								updatingCode === notification.code
									? 'mdi mdi-loading mdi-spin'
									: notification.isRead
										? 'mdi mdi-email-outline'
										: 'mdi mdi-email-open-outline'
							"
						></i>
					</button>
				</article>
			</div>

			<footer v-if="filteredNotifications.length > pageSize" class="notifications-pagination">
				<button type="button" :disabled="page === 1" @click="page--">
					<i class="mdi mdi-chevron-left"></i>
					Previous
				</button>
				<span>Page {{ page }} of {{ totalPages }}</span>
				<button type="button" :disabled="page === totalPages" @click="page++">
					Next
					<i class="mdi mdi-chevron-right"></i>
				</button>
			</footer>
		</Card>
	</div>
</template>

<style scoped lang="scss">
@use "@/styles/pages/Notifications/_notifications.scss";
</style>
