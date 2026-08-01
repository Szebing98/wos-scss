<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { MeResponse } from "@/api/auth/auth.types";
import { notificationApi } from "@/api/notification/notification.api";
import type { NotificationItem } from "@/api/notification/notification.types";
import { getAvatarUrl } from "@/utils/User/avatar";

const props = defineProps<{
	currentUser: MeResponse | null;
}>();

const emit = defineEmits<{
	(e: "toggle-sidebar"): void;
	(e: "open-logout"): void;
}>();

const route = useRoute();
const router = useRouter();
const isAccountOpenMobile = defineModel<boolean>("isAccountOpenMobile", { default: false });
const isNotificationsOpen = ref(false);
const notifications = ref<NotificationItem[]>([]);
const unreadTotal = ref(0);
const isLoadingNotifications = ref(false);
const notificationError = ref("");

const unreadLabel = computed(() => {
	if (!unreadTotal.value) return "";
	return String(unreadTotal.value);
});

const isOwnProfileActive = computed(() => {
	if (route.path !== "/user/profile") return false;
	if (route.query.mode === "new") return false;
	const code = route.query.code as string;
	if (!code) return true;
	return !!(props.currentUser?.guid && code === props.currentUser.guid);
});

function handleLogoutClick() {
	isAccountOpenMobile.value = false;
	emit("open-logout");
}

function handleDocumentClick(e: MouseEvent) {
	const target = e.target as HTMLElement;
	if (!target.closest(".notification-menu-wrapper")) {
		isNotificationsOpen.value = false;
	}
}

function toggleNotifications() {
	isAccountOpenMobile.value = false;
	isNotificationsOpen.value = !isNotificationsOpen.value;

	if (isNotificationsOpen.value) {
		fetchUnreadNotifications();
	}
}

async function fetchUnreadNotifications() {
	isLoadingNotifications.value = true;
	notificationError.value = "";

	try {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kuala_Lumpur";
		const response = await notificationApi.getUnread({
			pageIndex: 0,
			pageSize: 5,
			sort: "createdAt-desc",
			timezone,
		});

		if (response.error) {
			throw new Error(getApiErrorMessage(response.error, "Unable to load notifications."));
		}

		notifications.value = response.data?.data || [];
		unreadTotal.value = response.data?.total || 0;
	} catch (error) {
		notificationError.value =
			error instanceof Error ? error.message : "Unable to load notifications.";
	} finally {
		isLoadingNotifications.value = false;
	}
}

async function markAllNotificationsRead() {
	if (!unreadTotal.value) return;

	try {
		await notificationApi.markAllRead();
		notifications.value = [];
		unreadTotal.value = 0;
	} catch (error) {
		notificationError.value =
			error instanceof Error ? error.message : "Unable to update notifications.";
	}
}

async function openNotification(notification: NotificationItem) {
	if (!notification.isRead) {
		try {
			const response = await notificationApi.markRead(notification.code);
			if (response.error) {
				throw new Error(
					getApiErrorMessage(response.error, "Unable to update notification."),
				);
			}

			notifications.value = notifications.value.filter(
				(item) => item.code !== notification.code,
			);
			unreadTotal.value = Math.max(unreadTotal.value - 1, 0);
		} catch (error) {
			notificationError.value =
				error instanceof Error ? error.message : "Unable to update notification.";
		}
	}

	isNotificationsOpen.value = false;
	if (notification.referenceType === "WorkOrder" && notification.referenceId) {
		router.push({
			name: "Work Order Detail",
			params: { id: notification.referenceId },
		});
	}
}

function getApiErrorMessage(error: unknown, fallback: string) {
	if (error && typeof error === "object") {
		const errorRecord = error as Record<string, any>;
		if (typeof errorRecord.message === "string") return errorRecord.message;
		if (typeof errorRecord.error?.message === "string") return errorRecord.error.message;
	}

	return fallback;
}

function getNotificationTitle(notification: NotificationItem) {
	const payload = getPayloadRecord(notification.payload);
	const code = typeof payload?.code === "string" ? payload.code : "";
	const title = typeof payload?.title === "string" ? payload.title : "";
	const workOrder = code ? `Work Order ${code}` : "Work Order";

	switch (notification.templateCode) {
		case "WO_DRAFT_CREATED":
			return `${workOrder} has been saved as Draft`;
		case "WO_CREATED":
		case "WORK_ORDER_CREATED":
			return `${workOrder} has been created as New`;
		case "WO_SUBMITTED":
			return `${workOrder} has been submitted for Approval`;
		case "WO_APPROVED":
		case "WORK_ORDER_APPROVED":
			return `${workOrder} has been approved`;
		case "WO_REJECTED":
			return `${workOrder} has been rejected`;
		case "WO_CLAIMED":
			return `${workOrder} has been claimed`;
		case "WO_DONE":
			return `${workOrder} has been marked as Done`;
		case "WO_COMPLETED":
		case "WORK_ORDER_COMPLETED":
			return `${workOrder} has been completed`;
		case "WO_CLOSED":
			return `${workOrder} has been closed`;
		case "WO_CANCELLED":
			return `${workOrder} has been cancelled`;
		case "WO_REOPENED":
			return `${workOrder} has been reopened as New`;
		case "WORK_ORDER_ASSIGNED":
			return `${workOrder} has been assigned to you`;
	}

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

function getPayloadRecord(payload: unknown) {
	if (payload && typeof payload === "object" && !Array.isArray(payload)) {
		return payload as Record<string, unknown>;
	}

	return null;
}

function formatNotificationTime(value?: string) {
	if (!value) return "";

	const date = new Date(value);
	const diffMs = Date.now() - date.getTime();
	const diffMinutes = Math.floor(diffMs / 60000);

	if (diffMinutes < 1) return "Just now";
	if (diffMinutes < 60) return `${diffMinutes}m ago`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return new Intl.DateTimeFormat("en-MY", {
		day: "2-digit",
		month: "short",
	}).format(date);
}

onMounted(() => {
	document.addEventListener("click", handleDocumentClick);
	fetchUnreadNotifications();
});

onUnmounted(() => {
	document.removeEventListener("click", handleDocumentClick);
});
</script>

<template>
	<header class="header">
		<div class="header-left">
			<button class="btn btn--icon" @click="emit('toggle-sidebar')" aria-label="Toggle Menu">
				<i class="mdi mdi-menu"></i>
			</button>
			<img src="../assets/logo.svg" alt="GS TECH" class="header__logo" />
		</div>

		<div class="header-right">
			<!-- Notifications -->
			<div class="notification-menu-wrapper">
				<button
					class="btn btn--icon notification-btn"
					:class="{ 'notification-btn--active': isNotificationsOpen }"
					:aria-expanded="isNotificationsOpen"
					aria-label="Notifications"
					@click.stop="toggleNotifications"
				>
					<i class="mdi mdi-bell-outline"></i>
					<span v-if="unreadLabel" class="notification-btn__badge">{{
						unreadLabel
					}}</span>
				</button>

				<div v-if="isNotificationsOpen" class="notification-dropdown">
					<div class="notification-dropdown__header">
						<div>
							<p class="notification-dropdown__title">Notifications</p>
						</div>
						<button
							v-if="unreadTotal"
							class="notification-dropdown__mark-read"
							type="button"
							@click="markAllNotificationsRead"
						>
							Mark all read
						</button>
					</div>

					<div v-if="isLoadingNotifications" class="notification-dropdown__state">
						<i class="mdi mdi-loading mdi-spin"></i>
						Loading notifications
					</div>

					<div v-else-if="notificationError" class="notification-dropdown__state">
						<i class="mdi mdi-alert-circle-outline"></i>
						{{ notificationError }}
					</div>

					<div v-else-if="!notifications.length" class="notification-dropdown__state">
						<i class="mdi mdi-bell-check-outline"></i>
						No unread notifications
					</div>

					<div v-else class="notification-dropdown__list">
						<button
							v-for="notification in notifications"
							:key="notification.code"
							class="notification-item"
							type="button"
							@click="openNotification(notification)"
						>
							<span class="notification-item__icon">
								<i class="mdi mdi-bell-ring-outline"></i>
							</span>
							<span class="notification-item__content">
								<span class="notification-item__title">
									{{ getNotificationTitle(notification) }}
								</span>
								<span class="notification-item__message">
									{{ getNotificationDescription(notification) }}
								</span>
								<span class="notification-item__meta">
									{{ formatNotificationTime(notification.createdAt) }}
								</span>
							</span>
						</button>
					</div>

					<RouterLink
						class="notification-dropdown__footer"
						:to="{ name: 'Notifications' }"
						@click="isNotificationsOpen = false"
					>
						View all notifications
						<i class="mdi mdi-arrow-right"></i>
					</RouterLink>
				</div>
			</div>

			<!-- Account -->
			<div class="account-menu-wrapper">
				<button
					class="icon-btn account-btn"
					@click.stop="isAccountOpenMobile = !isAccountOpenMobile"
					aria-label="Account"
				>
					<i class="mdi mdi-account-circle-outline"></i>
				</button>

				<div v-if="isAccountOpenMobile" class="account-dropdown">
					<div class="account-dropdown__header">
						<div class="account-dropdown__avatar">
							<img
								v-if="currentUser?.profileImage"
								:src="getAvatarUrl(currentUser.profileImage)"
								alt="Avatar"
							/>
							<i v-else class="mdi mdi-account"></i>
						</div>
						<div class="account-dropdown__info">
							<p class="account-dropdown__name">
								{{ currentUser?.displayName || "Loading..." }}
							</p>
							<p class="account-dropdown__email">{{ currentUser?.email || "" }}</p>
						</div>
					</div>
					<div class="account-dropdown__divider"></div>
					<router-link
						to="/user/profile"
						class="account-dropdown__item"
						:class="{ 'account-dropdown__item--active': isOwnProfileActive }"
						active-class=""
						exact-active-class=""
						@click="isAccountOpenMobile = false"
					>
						<i class="mdi mdi-account-cog-outline"></i> My Profile
					</router-link>
					<button
						class="account-dropdown__item account-dropdown__item--danger"
						@click="handleLogoutClick"
					>
						<i class="mdi mdi-logout"></i> Logout
					</button>
				</div>
			</div>
		</div>
	</header>
</template>
