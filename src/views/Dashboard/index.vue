<script setup lang="ts">
import { ref } from "vue";
import { useThemeStore } from "@/stores/theme.store";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";

const themeStore = useThemeStore();

const draftHeaders: TableHeader[] = [
	{ key: "woNumber", label: "WO #" },
	{ key: "title", label: "Title" },
	{ key: "action", label: "Action", align: "right" },
];

const attentionHeaders: TableHeader[] = [
	{ key: "woNumber", label: "WO #" },
	{ key: "status", label: "Status" },
	{ key: "action", label: "Action", align: "right" },
];

const lastUpdatedTime = ref("12 Jun 2026, 04:26 PM");

const chartData = [25, 35, 15, 25];
const chartLabels = ["Plumbing", "Electrical", "HVAC", "General"];
const chartColors = ["#3B82F6", "#F59E0B", "#6366F1", "#06B6D4"];

const statusCards = ref([
	{ title: "New", count: 8, icon: "mdi-plus-circle", baseColor: "#3B82F6" },
	{ title: "Pending Approval", count: 6, icon: "mdi-clock", baseColor: "#F59E0B" },
	{ title: "In Progress", count: 2, icon: "mdi-wrench", baseColor: "#6366F1" },
	{ title: "Done", count: 0, icon: "mdi-check-circle", baseColor: "#06B6D4" },
	{ title: "Completed", count: 2, icon: "mdi-assignment-turned-in", baseColor: "#10B981" },
	{ title: "Claimed", count: 1, icon: "mdi-credit-card", baseColor: "#14B8A6" },
	{ title: "Closed", count: 3, icon: "mdi-power", baseColor: "#64748B" },
	{ title: "Cancelled", count: 1, icon: "mdi-cancel", baseColor: "#EF4444" },
]);

const drafts = ref([
	{ woNumber: "WO-2026-0012", title: "Replace Air Filter" },
	{ woNumber: "WO-2026-0015", title: "Boiler Leak Inspection" },
]);

const pendingActionItems = ref([
	{
		woNumber: "WO-2026-0008",
		status: "Rejected",
		statusColor: "#EF4444",
		actionText: "Fix Draft",
		actionBtnColor: "#EF4444",
	},
	{
		woNumber: "WO-2026-0004",
		status: "Pending",
		statusColor: "#F59E0B",
		actionText: "Approve",
		actionBtnColor: "#3B82F6",
	},
]);

const activities = ref([
	{
		woNumber: "WO-8821",
		title: "Rejected",
		description: "Manager: 'Please re-upload the site photo, it's too blurry.'",
		timeAgo: "10 mins ago",
		color: "#EF4444",
	},
	{
		woNumber: "WO-8815",
		title: "Status Changed",
		description: "Moved to 'In Progress' by System",
		timeAgo: "1 hour ago",
		color: "#3B82F6",
	},
	{
		woNumber: "WO-8790",
		title: "Payment Claimed",
		description: "Your claim has been processed successfully.",
		timeAgo: "Yesterday",
		color: "#10B981",
	},
]);

function getCardStyle(item: any) {
	if (themeStore.dark) {
		return {
			background: "linear-gradient(135deg, #1e1e2d 0%, #151521 100%)",
			borderLeft: `5px solid ${item.baseColor}`,
		};
	}
	return { backgroundColor: item.baseColor, color: "white" };
}

function getIconStyle(item: any) {
	if (themeStore.dark) {
		return {
			color: item.baseColor,
			opacity: 0.25,
			filter: `drop-shadow(0 0 8px ${item.baseColor})`,
		};
	}
	return { color: "white", opacity: 0.35 };
}

function getNumberStyle(item: any) {
	if (themeStore.dark) {
		return { color: item.baseColor, textShadow: `0 0 10px ${item.baseColor}50` };
	}
	return { color: "white" };
}

function getBadgeStyle(color: string) {
	return { color: color, border: `1px solid ${color}`, backgroundColor: `${color}10` };
}

function getBtnActionStyle(color: string) {
	return { color: color, border: `1px solid ${color}` };
}

function refreshData() {
	console.log("Refreshing dashboard data via...");
}
</script>

<template>
	<div class="dashboard">
		<div class="dashboard__header">
			<div class="dashboard__header-title">
				<h1>Dashboard</h1>
				<p class="dashboard__updated-time">Last updated: {{ lastUpdatedTime }}</p>
			</div>
			<button class="dashboard__refresh-btn" @click="refreshData">
				<i class="mdi mdi-refresh"></i>
			</button>
		</div>

		<div class="dashboard__cards-grid">
			<div
				v-for="item in statusCards"
				:key="item.title"
				class="status-card"
				:class="{ 'status-card--dark': themeStore.dark }"
				:style="getCardStyle(item)"
			>
				<div class="status-card__body">
					<i
						class="mdi status-card__icon"
						:class="item.icon"
						:style="getIconStyle(item)"
					></i>
					<div class="status-card__content">
						<span class="status-card__number" :style="getNumberStyle(item)">{{
							item.count
						}}</span>
						<span class="status-card__title">{{ item.title }}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="dashboard__main-layout">
			<div class="dashboard__alert-zone">
				<div class="alert-box alert-box--error">
					<i class="mdi mdi-alert-circle-outline alert-box__icon"></i>
					<div class="alert-box__content">
						<strong>Attention:</strong> There are 3 high-priority work orders that have
						been pending for more than 48 hours.
					</div>
				</div>
			</div>

			<div class="dashboard__content-grid">
				<div class="dashboard__panel">
					<h2 class="dashboard__panel-title">Work by Type</h2>
					<div class="chart-container">
						<svg class="donut-chart" viewBox="0 0 42 42">
							<circle
								class="donut-hole"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
							></circle>
							<circle
								class="donut-ring"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="var(--colors-surface-border)"
								stroke-width="3"
							></circle>

							<circle
								class="donut-segment"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="#3B82F6"
								stroke-width="4"
								stroke-dasharray="25 75"
								stroke-dashoffset="25"
							></circle>
							<circle
								class="donut-segment"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="#F59E0B"
								stroke-width="4"
								stroke-dasharray="35 65"
								stroke-dashoffset="100"
							></circle>
							<circle
								class="donut-segment"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="#6366F1"
								stroke-width="4"
								stroke-dasharray="15 85"
								stroke-dashoffset="65"
							></circle>
							<circle
								class="donut-segment"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="#06B6D4"
								stroke-width="4"
								stroke-dasharray="25 75"
								stroke-dashoffset="50"
							></circle>
						</svg>

						<div class="chart-legends">
							<div
								v-for="(label, index) in chartLabels"
								:key="label"
								class="legend-item"
							>
								<span
									class="legend-item__color"
									:style="{ backgroundColor: chartColors[index] }"
								></span>
								<span class="legend-item__text"
									>{{ label }} ({{ chartData[index] }}%)</span
								>
							</div>
						</div>
					</div>
				</div>

				<div class="dashboard__panel">
					<div class="dashboard__panel-header">
						<h2 class="dashboard__panel-title">Recent Updates</h2>
						<button class="text-btn">
							View History <i class="mdi mdi-arrow-right"></i>
						</button>
					</div>

					<div class="timeline">
						<div
							v-for="activity in activities"
							:key="activity.woNumber"
							class="timeline-item"
						>
							<div
								class="timeline-item__badge"
								:style="{ backgroundColor: activity.color }"
							></div>
							<div class="timeline-item__card">
								<div class="timeline-item__header">
									<span class="timeline-item__title"
										><strong>{{ activity.woNumber }}</strong> -
										{{ activity.title }}</span
									>
									<span class="timeline-item__time">{{ activity.timeAgo }}</span>
								</div>
								<p class="timeline-item__desc">{{ activity.description }}</p>
							</div>
						</div>
					</div>
				</div>

				<div class="dashboard__panel">
					<div class="dashboard__panel-header">
						<h2 class="dashboard__panel-title">My Recent Drafts</h2>
						<button class="text-btn">View All</button>
					</div>
					<Table :headers="draftHeaders" :items="drafts" emptyMessage="No recent drafts.">
						<template #item-action="{ item }">
							<button class="icon-btn icon-btn--info">
								<i class="mdi mdi-pencil"></i>
							</button>
						</template>
					</Table>
				</div>

				<div class="dashboard__panel">
					<div class="dashboard__panel-header">
						<h2 class="dashboard__panel-title">Requires Attention</h2>
						<button class="text-btn">View All</button>
					</div>
					<Table
						:headers="attentionHeaders"
						:items="pendingActionItems"
						emptyMessage="No items require attention."
					>
						<template #item-status="{ item }">
							<span class="badge" :style="getBadgeStyle(item.statusColor)">{{
								item.status
							}}</span>
						</template>
						<template #item-action="{ item }">
							<button
								class="action-btn"
								:style="getBtnActionStyle(item.actionBtnColor)"
							>
								{{ item.actionText }}
							</button>
						</template>
					</Table>
				</div>
			</div>
		</div>
	</div>
</template>
