<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { workOrderApi } from "@/api/work-order/work-order.api";
import { useThemeStore } from "@/stores/theme.store";
import { useDateFormatStore } from "@/stores/dateFormat.store";
import WorkOrderList from "@/views/WorkOrder/WorkOrderList.vue";
import { downloadCsv, printRowsAsPdf } from "@/utils/csv";
import { useSnackbarStore } from "@/stores/snackbar.store";

const themeStore = useThemeStore();
const dateFormatStore = useDateFormatStore();
const router = useRouter();
const snackbar = useSnackbarStore();
const workOrderListRef = ref<InstanceType<typeof WorkOrderList> | null>(null);

const lastUpdatedTime = ref("-");
const loadingCounts = ref(false);
const totalWorkOrders = ref(0);

enum WorkOrderStatus {
	Draft = "draft",
	New = "new",
	PendingApproval = "pending",
	InProgress = "progress",
	Done = "done",
	Completed = "completed",
	Claimed = "claimed",
	Closed = "closed",
	Cancelled = "cancelled",
	Rejected = "rejected",
}

const cardList = ref([
	{
		label: "Draft",
		count: 0,
		status: WorkOrderStatus.Draft,
		icon: "mdi-archive-clock-outline",
		countQuery: { orderStatus: WorkOrderStatus.New, isDraft: "true" },
		query: { orderStatus: WorkOrderStatus.New, isDraft: "true" },
		baseColor: "#80858f",
	},
	{
		label: "New",
		count: 0,
		status: WorkOrderStatus.New,
		icon: "mdi-plus-circle-outline",
		countQuery: { orderStatus: WorkOrderStatus.New, isDraft: "false" },
		query: { orderStatus: WorkOrderStatus.New, isDraft: "false" },
		baseColor: "#3B82F6",
	},
	{
		label: "Pending",
		count: 0,
		status: WorkOrderStatus.PendingApproval,
		icon: "mdi-clock-outline",
		query: { orderStatus: WorkOrderStatus.PendingApproval, isDraft: "false" },
		baseColor: "#F59E0B",
	},
	{
		label: "In Progress",
		count: 0,
		status: WorkOrderStatus.InProgress,
		icon: "mdi-wrench",
		query: { orderStatus: WorkOrderStatus.InProgress, isDraft: "false" },
		baseColor: "#6366F1",
	},
	{
		label: "Done",
		count: 0,
		status: WorkOrderStatus.Done,
		icon: "mdi-check-circle",
		query: { orderStatus: WorkOrderStatus.Done, isDraft: "false" },
		baseColor: "#06B6D4",
	},
	{
		label: "Completed",
		count: 0,
		status: WorkOrderStatus.Completed,
		icon: "mdi-clipboard-check",
		query: { orderStatus: WorkOrderStatus.Completed, isDraft: "false" },
		baseColor: "#10B981",
	},
	{
		label: "Claimed",
		count: 0,
		status: WorkOrderStatus.Claimed,
		icon: "mdi-credit-card-check",
		query: { orderStatus: WorkOrderStatus.Claimed, isDraft: "false" },
		baseColor: "#14B8A6",
	},
	{
		label: "Closed",
		count: 0,
		status: WorkOrderStatus.Closed,
		icon: "mdi-power",
		query: { orderStatus: WorkOrderStatus.Closed, isDraft: "false" },
		baseColor: "#64748B",
	},
	{
		label: "Cancelled",
		count: 0,
		status: WorkOrderStatus.Cancelled,
		icon: "mdi-close-circle",
		query: { orderStatus: WorkOrderStatus.Cancelled, isDraft: "false" },
		baseColor: "#EF4444",
	},
	{
		label: "Rejected",
		count: 0,
		status: WorkOrderStatus.Rejected,
		icon: "mdi-cancel",
		query: { orderStatus: WorkOrderStatus.Rejected, isDraft: "false" },
		baseColor: "#DC2626",
	},
]);

// const drafts = ref([
// 	{ woNumber: "WO-2026-0012", title: "Replace Air Filter" },
// 	{ woNumber: "WO-2026-0015", title: "Boiler Leak Inspection" },
// ]);

// const pendingActionItems = ref([
// 	{
// 		woNumber: "WO-2026-0008",
// 		status: "Rejected",
// 		statusColor: "#EF4444",
// 		actionText: "Fix Draft",
// 		actionBtnColor: "#EF4444",
// 	},
// 	{
// 		woNumber: "WO-2026-0004",
// 		status: "Pending",
// 		statusColor: "#F59E0B",
// 		actionText: "Approve",
// 		actionBtnColor: "#3B82F6",
// 	},
// ]);

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

function getTotalCount(responseData: any) {
	if (typeof responseData?.total === "number") return responseData.total;
	if (typeof responseData?.totalCount === "number") return responseData.totalCount;
	if (typeof responseData?.count === "number") return responseData.count;
	if (Array.isArray(responseData?.data)) return responseData.data.length;
	return 0;
}

function updateLastUpdatedTime() {
	lastUpdatedTime.value = dateFormatStore.formatDateTime(new Date());
}

async function fetchCardCounts() {
	loadingCounts.value = true;
	try {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
		const results = await Promise.all(
			cardList.value.map(async (card) => {
				const { data } = await workOrderApi.getWorkOrders({
					pageIndex: 0,
					pageSize: 1,
					timezone,
					...(card.countQuery ?? card.query),
				} as any);
				return getTotalCount(data);
			}),
		);

		cardList.value = cardList.value.map((card, index) => ({
			...card,
			count: results[index] ?? 0,
		}));
		totalWorkOrders.value = results.reduce((sum, count) => sum + (count ?? 0), 0);
		updateLastUpdatedTime();
	} catch (error) {
		console.error("Failed to fetch dashboard work order counts:", error);
	} finally {
		loadingCounts.value = false;
	}
}

function exportCountReport(format: "CSV" | "PDF") {
	try {
		const generatedAt = new Date().toISOString();
		const rows = [
			{ status: "All Work Orders", count: totalWorkOrders.value, generatedAt },
			...cardList.value.map((card) => ({
				status: card.label,
				count: card.count,
				generatedAt,
			})),
		];
		const columns = [
			{ key: "status", label: "Work Order Status" },
			{ key: "count", label: "Count" },
			{ key: "generatedAt", label: "Generated Date" },
		];
		if (format === "CSV") {
			downloadCsv(`work-order-count-report-${generatedAt.slice(0, 10)}.csv`, rows, columns);
		} else {
			printRowsAsPdf("Work Order Count Report", rows, columns);
		}
		snackbar.success("Work order count report exported.");
	} catch (error) {
		snackbar.error(error instanceof Error ? error.message : "Failed to export count report.");
	}
}

function refreshData() {
	fetchCardCounts();
	workOrderListRef.value?.fetchWorkOrders();
}

function goToWorkOrderList(item: any) {
	router.push({
		name: "Work Orders",
		query: item.query,
	});
}

function handleCreateClick() {
	if (workOrderListRef.value) {
		workOrderListRef.value.handleCreateWorkOrder();
	}
}

onMounted(() => {
	fetchCardCounts();
});
</script>

<template>
	<div class="dashboard">
		<div class="dashboard__header">
			<div class="dashboard__header-title">
				<h1>Dashboard</h1>
				<p class="dashboard__updated-time">All Work Orders: {{ totalWorkOrders }}</p>
				<p class="dashboard__updated-time">Last updated: {{ lastUpdatedTime }}</p>
			</div>
			<div style="display: flex; gap: 8px">
				<button class="btn btn--outlined" :disabled="loadingCounts" @click="exportCountReport('CSV')">
					<i class="mdi mdi-file-delimited-outline"></i> Count CSV
				</button>
				<button class="btn btn--outlined" :disabled="loadingCounts" @click="exportCountReport('PDF')">
					<i class="mdi mdi-file-pdf-box"></i> Count PDF
				</button>
				<button class="btn btn--icon" :disabled="loadingCounts" @click="refreshData">
					<i class="mdi mdi-refresh"></i>
				</button>
			</div>
		</div>

		<div class="dashboard__cards-grid">
			<button
				v-for="item in cardList"
				:key="item.label"
				class="status-card"
				:class="{ 'status-card--dark': themeStore.dark }"
				:style="getCardStyle(item)"
				type="button"
				@click="goToWorkOrderList(item)"
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
			</button>
		</div>

		<div class="dashboard__main-layout">
			<!-- <div class="dashboard__alert-zone">
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
						<template #item-action>
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
			</div> -->

			<div class="dashboard__panel" style="margin-top: 24px">
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
