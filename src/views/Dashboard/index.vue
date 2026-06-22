<script setup lang="ts">
import { ref } from "vue";
import { useThemeStore } from "@/stores/theme.store";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import WorkOrderList from "@/views/WorkOrder/WorkOrderList.vue";

const themeStore = useThemeStore();
const workOrderListRef = ref<InstanceType<typeof WorkOrderList> | null>(null);

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


enum WorkOrderStatus {
	New = "New",
	PendingApproval = "PendingApproval",
	InProgress = "InProgress",
	Done = "Done",
	Completed = "Completed",
	Claimed = "Claimed",
	Closed = "Closed",
	Cancelled = "Cancelled"
}

const cardRoute = "/work-orders?status=";

const cardList = ref([
	
	{
		label: "New",
		count: 8,
		status: WorkOrderStatus.New,
		icon: "mdi-plus-circle-outline",
		route: `${cardRoute}${WorkOrderStatus.New}`,
		baseColor: "#3B82F6"
	},
	{
		label: "Pending",
		count: 6,
		status: WorkOrderStatus.PendingApproval,
		icon: "mdi-clock-outline",
		route: `${cardRoute}${WorkOrderStatus.PendingApproval}`,
		baseColor: "#F59E0B"
	},
	{
		label: "In Progress",
		count: 2,
		status: WorkOrderStatus.InProgress,
		icon: "mdi-wrench",
		route: `${cardRoute}${WorkOrderStatus.InProgress}`,
		baseColor: "#6366F1"
	},
	{
		label: "Done",
		count: 0,
		status: WorkOrderStatus.Done,
		icon: "mdi-check-circle",
		route: `${cardRoute}${WorkOrderStatus.Done}`,
		baseColor: "#06B6D4"
	},
	{
		label: "Completed",
		count: 2,
		status: WorkOrderStatus.Completed,
		icon: "mdi-clipboard-check",
		route: `${cardRoute}${WorkOrderStatus.Completed}`,
		baseColor: "#10B981"
	},
	{
		label: "Claimed",
		count: 1,
		status: WorkOrderStatus.Claimed,
		icon: "mdi-credit-card-check",
		route: `${cardRoute}${WorkOrderStatus.Claimed}`,
		baseColor: "#14B8A6"
	},
	{
		label: "Closed",
		count: 3,
		status: WorkOrderStatus.Closed,
		icon: "mdi-power",
		route: `${cardRoute}${WorkOrderStatus.Closed}`,
		baseColor: "#64748B"
	},
	{
		label: "Cancelled",
		count: 1,
		status: WorkOrderStatus.Cancelled,
		icon: "mdi-close-circle",
		route: `${cardRoute}${WorkOrderStatus.Cancelled}`,
		baseColor: "#EF4444"
	},
	
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

function handleCreateClick() {
    if (workOrderListRef.value) {
        workOrderListRef.value.handleCreateWorkOrder();
    }
}
</script>

<template>
	<div class="dashboard">
		<div class="dashboard__header">
			<div class="dashboard__header-title">
				<h1>Dashboard</h1>
				<p class="dashboard__updated-time">Last updated: {{ lastUpdatedTime }}</p>
			</div>
			<button class="btn btn--icon" @click="refreshData">
				<i class="mdi mdi-refresh"></i>
			</button>
		</div>

		<div class="dashboard__cards-grid">
			<div
				v-for="item in cardList"
				:key="item.label"
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
						<span class="status-card__title">{{ item.label }}</span>
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
					<div class="dashboard__panel-header">
						<h2 class="dashboard__panel-title">My Recent Drafts</h2>
						<button class="btn btn--text">View All</button>
					</div>
					<Table paginate :headers="draftHeaders" :items="drafts" emptyMessage="No recent drafts.">
						<template #item-action="{ item }">
							<button class="btn btn--icon-primary">
								<i class="mdi mdi-pencil"></i>
							</button>
						</template>
					</Table>
				</div>

				<div class="dashboard__panel">
					<div class="dashboard__panel-header">
						<h2 class="dashboard__panel-title">Requires Attention</h2>
						<button class="btn btn--text">View All</button>
					</div>
					<Table
						paginate
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
								class="btn btn--outlined"
								:style="getBtnActionStyle(item.actionBtnColor)"
							>
								{{ item.actionText }}
							</button>
						</template>
					</Table>
				</div>
			</div>

            <div class="dashboard__panel" style="margin-top: 24px;">
                <div class="dashboard__panel-header">
                    <h2 class="dashboard__panel-title">All Work Orders</h2>
                    <button class="btn btn--primary" @click="handleCreateClick">
                        <i class="mdi mdi-plus"></i> Create New Work Order
                    </button>
                </div>
				<WorkOrderList ref="workOrderListRef" status="All" hideHeader />
			</div>
		</div>
	</div>
</template>
