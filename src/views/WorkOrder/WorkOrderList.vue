<script setup lang="ts">
import { getApiErrorMessage } from "@/utils/error";
import { ref, shallowRef, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Badge from "@/components/Badge.vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import PageHeader from "@/components/PageHeader.vue";
import Card from "@/components/Card.vue";
import Checkbox from "@/components/Checkbox.vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import DatePicker from "@/components/DatePicker.vue";
import { workOrderApi } from "@/api/work-order/work-order.api";
import { workTypeApi } from "@/api/maintenance/work-type/work-type.api";
import HighlightText from "@/components/HighlightText.vue";
import Autocomplete from "@/components/Autocomplete.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { useAuthStore } from "@/stores/auth.store";
import { reportApi } from "@/api/report/report.api";
import { downloadCsv, printRowsAsPdf } from "@/utils/csv";
import { userDisplayCode } from "@/utils/User/user-display";
import { debounce } from "@/utils/debounce";

const props = defineProps({
	status: {
		type: String,
		default: "All",
	},
	hideHeader: {
		type: Boolean,
		default: false,
	},
});

const route = useRoute();
const router = useRouter();
const dateFormatStore = useDateFormatStore();
const snackbar = useSnackbarStore();
const authStore = useAuthStore();
const exporting = ref(false);
const applyingBulkAction = ref(false);
const actionLoading = ref(false);
const rejectLoading = ref(false);
const priorityColors: Record<string, string> = {
	High: "error",
	Medium: "warning",
	Low: "info",
};

// Constants
enum WorkOrderStatus {
	Draft = "Draft",
	New = "New",
	PendingApproval = "PendingApproval",
	InProgress = "InProgress",
	Done = "Done",
	Completed = "Completed",
	Claimed = "Claimed",
	Closed = "Closed",
	Rejected = "Rejected",
	Cancelled = "Cancelled",
}

enum WorkOrderAction {
	Approve = "Approve",
	Reject = "Reject",
	Cancel = "Cancel",
	MarkAsDone = "MarkAsDone",
	Reopen = "Reopen",
	MarkAsClaimed = "MarkAsClaimed",
	Close = "Close",
	Edit = "Edit",
	View = "View",
}

// Dialog State
const isConfirm = ref(false);
const confirmTitle = ref("");
const confirmMsg = ref("");
const statusAction = ref<WorkOrderAction>();
const selectedItem = ref<WorkOrderModel>();

const isReject = ref(false);
const rejectReason = ref("");

const isConfirmBulkAction = ref(false);

const activeStatus = ref(props.status);
const activeIsDraft = ref<string | undefined>();
const activeIncludesDraftAndNew = ref(false);

const backendToUiStatusMap: Record<string, WorkOrderStatus> = {
	draft: WorkOrderStatus.Draft,
	new: WorkOrderStatus.New,
	pending: WorkOrderStatus.PendingApproval,
	pendingapproval: WorkOrderStatus.PendingApproval,
	progress: WorkOrderStatus.InProgress,
	inprogress: WorkOrderStatus.InProgress,
	done: WorkOrderStatus.Done,
	completed: WorkOrderStatus.Completed,
	claimed: WorkOrderStatus.Claimed,
	closed: WorkOrderStatus.Closed,
	cancelled: WorkOrderStatus.Cancelled,
	rejected: WorkOrderStatus.Rejected,
};

const uiToBackendStatusMap: Record<string, string> = {
	Draft: "draft",
	New: "new",
	PendingApproval: "pending",
	InProgress: "progress",
	Done: "done",
	Completed: "completed",
	Claimed: "claimed",
	Closed: "closed",
	Cancelled: "cancelled",
	Rejected: "rejected",
	draft: "draft",
	new: "new",
	pending: "pending",
	progress: "progress",
	done: "done",
	completed: "completed",
	claimed: "claimed",
	closed: "closed",
	cancelled: "cancelled",
	rejected: "rejected",
};

function normalizeStatusForUi(status?: string | null) {
	if (!status) return "";
	return backendToUiStatusMap[status] || status;
}

function normalizeStatusForApi(status?: string | null) {
	if (!status || status === "All" || status === "all") return "";
	return uiToBackendStatusMap[status] || status;
}

function formatUserDisplay(name?: string | null, code?: string | null) {
	const visibleName = name?.trim();
	const visibleCode = userDisplayCode(code, null, "");
	if (visibleName && visibleCode) {
		if (visibleName.includes(`(${visibleCode})`) || visibleName === visibleCode) {
			return visibleName;
		}
		return `${visibleName} (${visibleCode})`;
	}
	return visibleName || visibleCode || "Unassigned";
}

watch(
	() => props.status,
	(newVal) => {
		activeStatus.value = newVal;
	},
);

watch(
	() => [route.query.orderStatus, route.query.status, route.query.isDraft],
	([orderStatus, status, isDraft]) => {
		activeIsDraft.value = typeof isDraft === "string" ? isDraft : undefined;
		const routeStatus = typeof orderStatus === "string" ? orderStatus : status;
		activeIncludesDraftAndNew.value =
			typeof routeStatus === "string" &&
			routeStatus.toLowerCase() === "new" &&
			activeIsDraft.value === undefined;

		if (typeof routeStatus === "string") {
			activeStatus.value =
				routeStatus === "draft" || activeIsDraft.value === "true"
					? WorkOrderStatus.Draft
					: normalizeStatusForUi(routeStatus);
		} else if (!activeIsDraft.value) {
			activeStatus.value = props.status;
		}
	},
	{ immediate: true },
);

interface CustomerModel {
	name: string;
	email: string;
	phone: string;
}

interface EquipmentModel {
	name: string;
	serialNo: string;
	brand: string;
	model: string;
	equipmentType: string;
}

interface TechnicalModel {
	flowHead?: string;
	brandName?: string;
	serialNo?: string;
	ratedVoltage?: string;
	ratedSpeed?: string;
	ratedCurrent?: string;
	ratedPower?: string;
	phase?: string;
	frameSize?: string;
}

interface WorkOrderModel {
	guid?: string;
	isDraft?: boolean;
	woNumber: string;
	title: string;
	createdByCode?: string;
	personInChargeCode?: string;
	leaderCode?: string;
	personInCharge: string;
	customer: CustomerModel;
	workType: string;
	status: WorkOrderStatus | string;
	rejectedReason?: string;
	createdAt: string;
	estimatedEndDate?: string;
	leadEngineer?: string;
	leader?: string;
	leaderII?: string;
	salesAgent?: string;
	site?: string;
	jobPriority?: string;
	assistantEngineers?: string[];
	description?: string;
	location?: string;
	latitude?: number;
	longitude?: number;
	equipment?: EquipmentModel;
	technical?: TechnicalModel;
}

const searchQuery = ref("");
const statusFilter = ref("all");
const workTypeFilter = ref("all");
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const formatDate = (d: Date) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const dStr = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${dStr}`;
};

const dateFrom = ref<string | null>(formatDate(firstDayOfMonth));
const dateTo = ref<string | null>(formatDate(today));

const appliedStatusFilter = ref(statusFilter.value);
const appliedWorkTypeFilter = ref(workTypeFilter.value);
const appliedDateFrom = ref(dateFrom.value);
const appliedDateTo = ref(dateTo.value);

const selectedWorkOrders = ref<string[]>([]);
const bulkAction = ref<WorkOrderAction | "">("");

function applyFilters() {
	appliedStatusFilter.value = statusFilter.value;
	appliedWorkTypeFilter.value = workTypeFilter.value;
	appliedDateFrom.value = dateFrom.value;
	appliedDateTo.value = dateTo.value;
}

function resetFilters() {
	statusFilter.value = "all";
	workTypeFilter.value = "all";
	dateFrom.value = formatDate(firstDayOfMonth);
	dateTo.value = formatDate(today);
	applyFilters();
}

const workOrders = shallowRef<any[]>([]);
const loading = ref(false);
const pageIndex = ref(0);
const pageSize = ref(10);
const totalWorkOrders = ref(0);

function resolveUserDisplay(
	value?: string | null,
	fallbackName?: string | null,
	fallbackDisplayCode?: string | null,
) {
	return formatUserDisplay(fallbackName, fallbackDisplayCode || value);
}

let lastFetchId = 0;

async function fetchWorkOrders() {
	const fetchId = ++lastFetchId;
	loading.value = true;
	try {
		const query: any = {
			pageIndex: pageIndex.value,
			pageSize: pageSize.value,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		};
		if (searchQuery.value) query.q = searchQuery.value;

		// Status query
		if (activeStatus.value !== "All" && activeStatus.value !== "all") {
			const orderStatus = normalizeStatusForApi(activeStatus.value);
			if (orderStatus && orderStatus !== "draft") query.orderStatus = orderStatus;
		} else if (appliedStatusFilter.value !== "all") {
			query.orderStatus = normalizeStatusForApi(appliedStatusFilter.value);
		}

		if (activeIsDraft.value !== undefined) {
			query.isDraft = activeIsDraft.value;
		} else if (activeStatus.value === WorkOrderStatus.Draft) {
			query.isDraft = "true";
			query.orderStatus = "new";
		}

		if (appliedWorkTypeFilter.value !== "all") {
			query.workType = appliedWorkTypeFilter.value;
		}
		if (appliedDateFrom.value) {
			query.startDate = appliedDateFrom.value;
		}
		if (appliedDateTo.value) {
			query.endDate = appliedDateTo.value;
		}

		const { data } = await workOrderApi.getWorkOrders(query);
		if (fetchId !== lastFetchId) return;
		if (data && data.data && Array.isArray(data.data)) {
			totalWorkOrders.value = data.total ?? data.data.length;
			workOrders.value = data.data.map((w: any) => ({
				guid: w.guid,
				isDraft: !!w.isDraft,
				createdByCode: w.createdBy || w.createdByCode || "",
				personInChargeCode: w.projectPicCode || w.personInChargeCode || "",
				leaderCode: w.leaderCode || w.leadEngineerCode || "",
				woNumber: w.docNo || w.code || w.guid.substring(0, 8).toUpperCase(),
				title: w.title,
				personInCharge: resolveUserDisplay(
					w.projectPicCode ||
						w.personInChargeCode ||
						w.personInCharge?.code ||
						w.projectPic?.code,
					w.projectPicName ||
						w.personInChargeName ||
						w.personInCharge?.userProfile?.displayName ||
						w.projectPic?.userProfile?.displayName,
					w.projectPicDisplayCode ||
						w.personInChargeDisplayCode ||
						w.personInCharge?.displayCode ||
						w.projectPic?.displayCode,
				),
				customer: {
					name: w.customerName || "Unknown",
					email: w.customerEmail || "",
					phone: w.customerPhone || "",
				},
				workType: w.workType || "Maintenance",
				status: normalizeStatusForUi(w.orderStatus || w.status || "new"),
				jobPriority: w.jobPriority || "Low",
				siteCode: w.siteCode || "",
				site: w.siteName
					? `${w.siteName}${w.siteCode ? ` (${w.siteCode})` : ""}`
					: w.siteCode || "—",
				salesAgent: resolveUserDisplay(
					w.salesAgentCode || w.salesAgent?.code || w.salesAgent?.guid,
					w.salesAgentName ||
						w.salesAgentDisplayName ||
						w.salesAgentProfileName ||
						w.salesAgent?.displayName ||
						w.salesAgent?.profile?.displayName ||
						w.salesAgent?.userProfile?.displayName,
					w.salesAgentDisplayCode || w.salesAgent?.displayCode,
				),
				createdAt: w.createdAt,
				rejectedReason: w.rejectedReason || "",
				description: w.description || "",
				location: w.location || w.locationName || "",
				estimatedEndDate: w.estimatedEndDate || "",
				leadEngineer: w.leadEngineerName || w.leaderCode || "",
				leader: resolveUserDisplay(
					w.leaderCode || w.leadEngineerCode || w.leader?.code || w.leadEngineer?.code,
					w.leaderName ||
						w.leadEngineerName ||
						w.leader?.userProfile?.displayName ||
						w.leadEngineer?.userProfile?.displayName,
					w.leaderDisplayCode ||
						w.leadEngineerDisplayCode ||
						w.leader?.displayCode ||
						w.leadEngineer?.displayCode,
				),
				leaderII: resolveUserDisplay(
					w.leaderIICode || w.leaderIiCode || w.leaderIicode || w.leaderII?.code,
					w.leaderIIName ||
						w.leaderIiName ||
						w.leaderIiname ||
						w.leaderIIDisplayName ||
						w.leaderIiDisplayName ||
						w.leaderII?.displayName ||
						w.leaderII?.profile?.displayName ||
						w.leaderII?.userProfile?.displayName,
					w.leaderIIDisplayCode ||
						w.leaderIiDisplayCode ||
						w.leaderIidisplayCode ||
						w.leaderII?.displayCode,
				),
				assistantEngineers: w.technicianCodes || w.assistantEngineers || [],
			}));
		} else {
			workOrders.value = [];
		}
	} catch (e) {
		console.error("Failed to fetch work orders:", e);
		workOrders.value = [];
	} finally {
		loading.value = false;
	}
}

function goToDetail(item: any) {
	if (!item) return;
	const id = item.guid || item.woNumber;
	if (
		item.isDraft ||
		item.status === WorkOrderStatus.Draft ||
		item.status === WorkOrderStatus.New ||
		item.status === WorkOrderStatus.PendingApproval
	) {
		router.push({ name: "Work Order Form", params: { id }, query: { mode: "view" } });
		return;
	}
	router.push({
		name: "Work Order Detail",
		params: { id },
		query:
			item.status === "Completed" || item.status === "Claimed"
				? { status: "completed" }
				: undefined,
	});
}

const debouncedFetchWorkOrders = debounce(fetchWorkOrders, 300);

watch(
	[
		activeStatus,
		activeIsDraft,
		activeIncludesDraftAndNew,
		appliedStatusFilter,
		appliedWorkTypeFilter,
		appliedDateFrom,
		appliedDateTo,
	],
	() => {
		if (pageIndex.value !== 0) pageIndex.value = 0;
		else fetchWorkOrders();
	},
);

watch(searchQuery, () => {
	if (pageIndex.value !== 0) pageIndex.value = 0;
	else debouncedFetchWorkOrders();
});

watch([pageIndex, pageSize], fetchWorkOrders);

onMounted(() => {
	void fetchWorkOrders();
	void fetchWorkTypes();
});

const filteredWorkOrders = computed(() => {
	if (!workOrders.value) return [];
	return workOrders.value.filter((w) => {
		if (!w) return false;
		if (activeStatus.value !== "All" && activeStatus.value !== "all") {
			if (activeIncludesDraftAndNew.value) {
				if (![WorkOrderStatus.Draft, WorkOrderStatus.New].includes(w.status)) return false;
			} else {
				if (activeStatus.value === WorkOrderStatus.Draft) {
					if (!w.isDraft) return false;
				} else if (
					normalizeStatusForApi(w.status) !== normalizeStatusForApi(activeStatus.value)
				)
					return false;
			}
		} else if (appliedStatusFilter.value !== "all") {
			if (
				normalizeStatusForApi(w.status) !== normalizeStatusForApi(appliedStatusFilter.value)
			)
				return false;
		}

		if (appliedWorkTypeFilter.value !== "all") {
			if (w.workType?.toLowerCase() !== appliedWorkTypeFilter.value?.toLowerCase())
				return false;
		}

		if (searchQuery.value) {
			const q = searchQuery.value.trim().toLowerCase();
			const match =
				String(w.woNumber || "").toLowerCase().includes(q) ||
				String(w.title || "").toLowerCase().includes(q) ||
				String(w.customer?.name || "").toLowerCase().includes(q) ||
				String(w.customer?.email || "").toLowerCase().includes(q) ||
				String(w.customer?.phone || "").toLowerCase().includes(q) ||
				String(w.leader || "").toLowerCase().includes(q) ||
				String(w.leaderII || "").toLowerCase().includes(q) ||
				String(w.salesAgent || "").toLowerCase().includes(q) ||
				String(w.workType || "").toLowerCase().includes(q) ||
				String(w.site || "").toLowerCase().includes(q) ||
				String(w.status || "").toLowerCase().includes(q) ||
				String(w.jobPriority || "").toLowerCase().includes(q);
			if (!match) return false;
		}

		return true;
	});
});

const isAllSelected = computed({
	get: () => {
		return (
			filteredWorkOrders.value.length > 0 &&
			selectedWorkOrders.value.length === filteredWorkOrders.value.length
		);
	},
	set: (val) => {
		if (val) {
			selectedWorkOrders.value = filteredWorkOrders.value.map((wo) => wo.woNumber);
		} else {
			selectedWorkOrders.value = [];
		}
	},
});

const selectedWorkOrdersSet = computed(() => new Set(selectedWorkOrders.value));

function toggleSelection(woNumber: string, isSelected: boolean) {
	if (isSelected) {
		if (!selectedWorkOrdersSet.value.has(woNumber)) {
			selectedWorkOrders.value = [...selectedWorkOrders.value, woNumber];
		}
	} else {
		selectedWorkOrders.value = selectedWorkOrders.value.filter((id) => id !== woNumber);
	}
}

const activeFilterCount = computed(() => {
	let count = 0;
	if (appliedStatusFilter.value !== "all") count++;
	if (appliedWorkTypeFilter.value !== "all") count++;

	// Add counts for dates if they differ from the default
	if (appliedDateFrom.value !== formatDate(firstDayOfMonth)) count++;
	if (appliedDateTo.value !== formatDate(today)) count++;

	return count;
});

const effectiveStatus = computed(() => {
	if (activeStatus.value === "All" && statusFilter.value !== "all") {
		return statusFilter.value;
	}
	return activeStatus.value;
});

watch(effectiveStatus, () => {
	selectedWorkOrders.value = [];
});

const isRejectedView = computed(() => effectiveStatus.value === "Rejected");

const headers = computed<TableHeader[]>(() => {
	const base: TableHeader[] = [
		{
			key: "select",
			label: "",
			width: "48px",
			minWidth: "48px",
			align: "center",
			sortable: false,
		},
	];

	if (effectiveStatus.value === "All" || effectiveStatus.value === "all") {
		base.push({
			key: "status",
			label: "Status",
			width: "140px",
			minWidth: "130px",
			mobileIcon: "mdi-weather-cloudy-clock",
		});
	} else if (activeIncludesDraftAndNew.value) {
		base.push({
			key: "status",
			label: "Status",
			width: "140px",
			minWidth: "130px",
			mobileIcon: "mdi-weather-cloudy-clock",
		});
	}

	base.push(
		{
			key: "woNumber",
			label: "WO #",
			width: "130px",
			minWidth: "115px",
			mobileIcon: "mdi-clipboard-text-outline",
		},
		{
			key: "title",
			label: "Work Order Title",
			width: "320px",
			minWidth: "220px",
			mobileIcon: "mdi-folder-information",
		},
		{
			key: "customer",
			label: "Customer",
			width: "280px",
			minWidth: "220px",
			mobileIcon: "mdi-account",
		},
		{
			key: "workType",
			label: "Work Type",
			width: "150px",
			minWidth: "130px",
			mobileIcon: "mdi-tools",
		},
		{
			key: "personInCharge",
			label: "PIC",
			width: "190px",
			minWidth: "160px",
			mobileIcon: "mdi-account-tie",
		},
		{
			key: "leader",
			label: "Leader",
			width: "190px",
			minWidth: "160px",
			mobileIcon: "mdi-account-star",
			defaultVisible: false,
		},
		{
			key: "leaderII",
			label: "Leader II",
			width: "190px",
			minWidth: "160px",
			mobileIcon: "mdi-account-star-outline",
			defaultVisible: false,
		},
		{
			key: "salesAgent",
			label: "Sales Agent",
			width: "190px",
			minWidth: "160px",
			mobileIcon: "mdi-account-edit",
			defaultVisible: false,
		},
		{
			key: "site",
			label: "Site",
			width: "180px",
			minWidth: "150px",
			mobileIcon: "mdi-map-marker-radius",
			defaultVisible: false,
		},
		{
			key: "jobPriority",
			label: "Job Priority",
			width: "130px",
			minWidth: "115px",
			mobileIcon: "mdi-alert-circle-outline",
			defaultVisible: false,
		},
		{
			key: "createdAt",
			label: "Created Date",
			width: "130px",
			minWidth: "110px",
			mobileIcon: "mdi-calendar-clock",
		},
	);

	if (isRejectedView.value) {
		base.push({
			key: "rejectedReason",
			label: "Rejected Reason",
			width: "260px",
			minWidth: "200px",
		});
	}

	base.push({
		key: "actions",
		label: "Actions",
		align: "right",
		width: "140px",
		minWidth: "120px",
		sortable: false,
	});

	return base;
});

const pageTitle = computed(() => {
	if (effectiveStatus.value === "All" || effectiveStatus.value === "all")
		return "All Work Orders";
	if (activeIncludesDraftAndNew.value) return "New Work Orders";
	const spacedStatus = effectiveStatus.value.replace(/([A-Z])/g, " $1").trim();
	return `${spacedStatus} Work Orders`;
});

// Row Actions
const buttonList = [
	{
		icon: "mdi-note-edit",
		class: "btn--icon-secondary",
		tooltip: "Edit",
		status: [
			WorkOrderStatus.Draft,
			WorkOrderStatus.New,
			WorkOrderStatus.PendingApproval,
			WorkOrderStatus.InProgress,
			WorkOrderStatus.Completed,
		],
		click: (item: WorkOrderModel) => {
			if (item.status === WorkOrderStatus.InProgress) {
				// If it's in progress, navigate to the full detail page for execution
				router.push({ name: "Work Order Detail", params: { id: item.guid } });
			} else if (
				item.isDraft ||
				item.status === WorkOrderStatus.Draft ||
				item.status === WorkOrderStatus.New ||
				item.status === WorkOrderStatus.PendingApproval
			) {
				router.push({
					name: "Work Order Form",
					params: { id: item.guid },
					query: { mode: "edit" },
				});
			} else {
				router.push({ name: "Work Order Form", params: { id: item.guid } });
			}
		},
	},
	{
		icon: "mdi-eye",
		class: "btn--icon-secondary",
		tooltip: "View Details",
		status: [
			WorkOrderStatus.Draft,
			WorkOrderStatus.New,
			WorkOrderStatus.PendingApproval,
			WorkOrderStatus.InProgress,
			WorkOrderStatus.Done,
			WorkOrderStatus.Completed,
			WorkOrderStatus.Claimed,
			WorkOrderStatus.Rejected,
			WorkOrderStatus.Closed,
			WorkOrderStatus.Cancelled,
		],
		click: (item: WorkOrderModel) => {
			goToDetail(item);
		},
	},
	{
		icon: "mdi-check-circle",
		class: "u-text-success",
		tooltip: "Approve",
		status: [WorkOrderStatus.PendingApproval],
		click: (item: WorkOrderModel) => {
			openConfirmDialog(
				"Approve Work Order",
				`Are you sure you want to approve Work Order ${item.woNumber}?`,
				WorkOrderAction.Approve,
				item,
			);
		},
	},
	{
		icon: "mdi-close-circle",
		class: "u-text-error",
		tooltip: "Reject",
		status: [WorkOrderStatus.PendingApproval],
		click: (item: WorkOrderModel) => {
			openRejectDialog(item);
		},
	},
	{
		icon: "mdi-briefcase-check",
		class: "u-text-success",
		tooltip: "Mark As Done",
		status: [WorkOrderStatus.InProgress],
		click: (item: WorkOrderModel) => {
			openConfirmDialog(
				"Mark As Done",
				"Are you sure to mark this work as done?",
				WorkOrderAction.MarkAsDone,
				item,
			);
		},
	},
	{
		icon: "mdi-trash-can",
		class: "u-text-error",
		tooltip: "Cancel",
		status: [WorkOrderStatus.InProgress],
		click: (item: WorkOrderModel) => {
			openConfirmDialog(
				"Cancellation",
				"Are you sure to cancel this work order? You cannot undo this later.",
				WorkOrderAction.Cancel,
				item,
			);
		},
	},
	{
		icon: "mdi-briefcase-clock",
		class: "u-text-warning",
		tooltip: "Reopen",
		status: [WorkOrderStatus.Done],
		click: (item: WorkOrderModel) => {
			openConfirmDialog(
				"Reopen",
				"Are you sure to reopen this work? You cannot undo this later.",
				WorkOrderAction.Reopen,
				item,
			);
		},
	},
	{
		icon: "mdi-cash-check",
		class: "u-text-success",
		tooltip: "Mark As Claimed",
		status: [WorkOrderStatus.Completed],
		click: (item: WorkOrderModel) => {
			openConfirmDialog(
				"Mark As Claimed",
				"Are you sure to mark this work as claimed? You cannot undo this later.",
				WorkOrderAction.MarkAsClaimed,
				item,
			);
		},
	},
	{
		icon: "mdi-power",
		class: "u-text-muted",
		tooltip: "Mark As Closed",
		status: [WorkOrderStatus.Claimed],
		click: (item: WorkOrderModel) => {
			openConfirmDialog(
				"Mark As Closed",
				"Are you sure to mark this work as closed? You cannot undo this later.",
				WorkOrderAction.Close,
				item,
			);
		},
	},
];

function updatePermissionForStatus(status: WorkOrderStatus) {
	const permissionByStatus: Partial<Record<WorkOrderStatus, string>> = {
		[WorkOrderStatus.Draft]: "update_draft",
		[WorkOrderStatus.New]: "update_new",
		[WorkOrderStatus.PendingApproval]: "update_pending",
		[WorkOrderStatus.InProgress]: "update_progress",
		[WorkOrderStatus.Done]: "update_done",
		[WorkOrderStatus.Completed]: "update_completed",
	};
	return permissionByStatus[status];
}

function canEditAssignedWorkOrder(item: WorkOrderModel) {
	const isSuperadmin = (authStore.currentUser?.userGroups || []).some(
		(group: any) => String(group.code || "").toUpperCase() === "SA",
	);
	if (isSuperadmin) return true;
	const userCode = authStore.currentUser?.code;
	if (!userCode) return false;
	if (
		item.isDraft ||
		[WorkOrderStatus.Draft, WorkOrderStatus.New].includes(item.status as WorkOrderStatus)
	) {
		return item.createdByCode === userCode;
	}
	if (item.status === WorkOrderStatus.PendingApproval) {
		return item.personInChargeCode === userCode;
	}
	if (item.status === WorkOrderStatus.InProgress) {
		return item.personInChargeCode === userCode || item.leaderCode === userCode;
	}
	return false;
}

function canUseWorkOrderAction(button: (typeof buttonList)[number], item: WorkOrderModel) {
	const permissionByTooltip: Record<string, string> = {
		Approve: "approve",
		Reject: "reject",
		"Mark As Done": "mark_as_done",
		Cancel: "cancel",
		Reopen: "mark_as_done",
		"Mark As Claimed": "mark_as_claimed",
		"Mark As Closed": "mark_as_closed",
	};
	const action =
		button.tooltip === "Edit"
			? updatePermissionForStatus(item.status as WorkOrderStatus)
			: permissionByTooltip[button.tooltip] || "read";
	const requiresAssignedEditor = button.tooltip === "Edit" || button.tooltip === "Mark As Done";
	return Boolean(
		action &&
		authStore.can(action, "WorkOrder") &&
		(!requiresAssignedEditor || canEditAssignedWorkOrder(item)),
	);
}

// Bulk Actions
const bulkActionList = [
	{ title: "Approve", value: WorkOrderAction.Approve, status: [WorkOrderStatus.PendingApproval] },
	{ title: "Claim", value: WorkOrderAction.MarkAsClaimed, status: [WorkOrderStatus.Completed] },
	{
		title: "Mark as Cancel",
		value: WorkOrderAction.Cancel,
		status: [WorkOrderStatus.InProgress],
	},
	{
		title: "Mark as Done",
		value: WorkOrderAction.MarkAsDone,
		status: [WorkOrderStatus.InProgress],
	},
	{ title: "Mark as Closed", value: WorkOrderAction.Close, status: [WorkOrderStatus.Claimed] },
	{ title: "Reopen", value: WorkOrderAction.Reopen, status: [WorkOrderStatus.Done] },
];

const selectedWorkOrdersList = computed(() => {
	return workOrders.value.filter((workorder) =>
		selectedWorkOrders.value.includes(workorder.woNumber),
	);
});

function canUseBulkAction(action: WorkOrderAction) {
	const permissionByAction: Partial<Record<WorkOrderAction, string>> = {
		[WorkOrderAction.Approve]: "approve",
		[WorkOrderAction.Reject]: "reject",
		[WorkOrderAction.Cancel]: "cancel",
		[WorkOrderAction.Reopen]: "reopen",
		[WorkOrderAction.Close]: "mark_as_closed",
		[WorkOrderAction.MarkAsDone]: "mark_as_done",
		[WorkOrderAction.MarkAsClaimed]: "mark_as_claimed",
	};
	const permission = permissionByAction[action];
	return Boolean(permission && authStore.can(permission, "WorkOrder"));
}

const availableBulkActions = computed(() => {
	if (!selectedWorkOrdersList.value.length) return [];
	return bulkActionList.filter((action) => {
		const requiresAssignedEditor = action.value === WorkOrderAction.MarkAsDone;
		return (
			canUseBulkAction(action.value) &&
			selectedWorkOrdersList.value.every(
				(item) =>
					action.status.includes(item.status as WorkOrderStatus) &&
					(!requiresAssignedEditor || canEditAssignedWorkOrder(item)),
			)
		);
	});
});

// Handlers
async function handleCreateWorkOrder() {
	await fetchWorkTypes();
	isCreateDialog.value = true;
}

async function handleExport(format: "CSV" | "PDF") {
	if (exporting.value) return;
	exporting.value = true;
	try {
		const filters: Record<string, string> = {};
		const status =
			activeStatus.value !== "All" && activeStatus.value !== "all"
				? normalizeStatusForApi(activeStatus.value)
				: appliedStatusFilter.value !== "all"
					? normalizeStatusForApi(appliedStatusFilter.value)
					: "";
		if (status) filters.orderStatus = status === "draft" ? "new" : status;
		if (appliedWorkTypeFilter.value !== "all") {
			filters.workType = appliedWorkTypeFilter.value;
		}

		const { data, error } = await reportApi.exportWorkOrders({
			format,
			type: "list",
			...(Object.keys(filters).length ? { filters: filters as any } : {}),
		});
		if (error) throw new Error(getApiErrorMessage(error, "Export request failed."));

		const rawRows = ((data as any)?.data || []) as Record<string, unknown>[];
		const rows = rawRows.map((w: any) => ({
			status: formatStatusLabel(
				w.isDraft ? "New" : normalizeStatusForUi(w.orderStatus || w.status || "new"),
			),
			woNumber: w.docNo || w.code || (w.guid ? String(w.guid).slice(0, 8).toUpperCase() : "—"),
			title: w.title || "—",
			customer: w.customerName || "—",
			workType: w.workType || "—",
			personInCharge: resolveUserDisplay(
				w.projectPicCode || w.personInChargeCode,
				w.projectPicName || w.personInChargeName,
				w.projectPicDisplayCode || w.personInChargeDisplayCode,
			),
			leader: resolveUserDisplay(
				w.leaderCode || w.leadEngineerCode,
				w.leaderName || w.leadEngineerName,
				w.leaderDisplayCode || w.leadEngineerDisplayCode,
			),
			leaderII: resolveUserDisplay(
				w.leaderIICode || w.leaderIiCode,
				w.leaderIIName || w.leaderIiName,
				w.leaderIIDisplayCode || w.leaderIiDisplayCode,
			),
			salesAgent: resolveUserDisplay(
				w.salesAgentCode,
				w.salesAgentName || w.salesAgentDisplayName,
				w.salesAgentDisplayCode,
			),
			site: w.siteName
				? `${w.siteName}${w.siteCode ? ` (${w.siteCode})` : ""}`
				: w.siteCode || "—",
			jobPriority: w.jobPriority || "Low",
			createdAt: w.createdAt || "",
			rejectedReason: w.rejectedReason || "",
		}));
		const date = new Date().toISOString().slice(0, 10);
		const exportColumns = headers.value
			.filter((h) => h.key !== "select" && h.key !== "actions")
			.map((h) => ({ key: h.key, label: h.label }));

		if (format === "CSV") downloadCsv(`work-orders-${date}.csv`, rows, exportColumns);
		else printRowsAsPdf("Work Order Report", rows, exportColumns);
		snackbar.success(`${rows.length} work order(s) exported.`);
	} catch (error) {
		console.error("Failed to export work orders:", error);
		snackbar.error(error instanceof Error ? error.message : "Failed to export work orders.");
	} finally {
		exporting.value = false;
	}
}

function openConfirmDialog(
	title: string,
	msg: string,
	action: WorkOrderAction,
	item: WorkOrderModel,
) {
	confirmTitle.value = title;
	confirmMsg.value = msg;
	statusAction.value = action;
	selectedItem.value = item;
	isConfirm.value = true;
}

function openRejectDialog(item: WorkOrderModel) {
	selectedItem.value = item;
	rejectReason.value = "";
	isReject.value = true;
}

async function executeAction() {
	if (selectedItem.value && statusAction.value) {
		actionLoading.value = true;
		try {
			const guid = selectedItem.value.guid;
			if (!guid) return;
			let res;
			switch (statusAction.value) {
				case WorkOrderAction.Approve:
					res = await workOrderApi.approve(guid);
					break;
				case WorkOrderAction.MarkAsDone:
					res = await workOrderApi.complete(guid);
					break;
				case WorkOrderAction.Cancel:
					res = await workOrderApi.cancel(guid);
					break;
				case WorkOrderAction.Reopen:
					res = await workOrderApi.reopen(guid);
					break;
				case WorkOrderAction.MarkAsClaimed:
					res = await workOrderApi.claim(guid, { invoiceAmount: 0 });
					break;
				case WorkOrderAction.Close:
					res = await workOrderApi.close(guid);
					break;
			}
			if (res && res.error) {
				snackbar.error(getApiErrorMessage(res.error, "An error occurred"));
			} else {
				fetchWorkOrders();
			}
		} catch (e) {
			console.error(e);
		} finally {
			actionLoading.value = false;
		}
	}
	isConfirm.value = false;
}

async function executeReject() {
	if (selectedItem.value && rejectReason.value) {
		rejectLoading.value = true;
		try {
			const guid = selectedItem.value.guid;
			if (!guid) return;
			const { error } = await workOrderApi.reject(guid, {
				rejectedReason: rejectReason.value,
			});
			if (error) {
				alert(getApiErrorMessage(error, "Failed to reject work order"));
			} else {
				fetchWorkOrders();
			}
		} catch (e) {
			console.error(e);
		} finally {
			rejectLoading.value = false;
		}
	}
	isReject.value = false;
}

async function applyBulkAction() {
	if (!bulkAction.value || applyingBulkAction.value) return;
	applyingBulkAction.value = true;
	const action = bulkAction.value;
	const selected = [...selectedWorkOrders.value];
	const failed: string[] = [];

	await Promise.all(
		selected.map(async (woNumber) => {
			const target = workOrders.value.find((w) => w.woNumber === woNumber);
			if (!target?.guid) {
				failed.push(woNumber);
				return;
			}
			try {
				let response: any;
				switch (action) {
					case WorkOrderAction.Approve:
						response = await workOrderApi.approve(target.guid);
						break;
					case WorkOrderAction.MarkAsDone:
						response = await workOrderApi.complete(target.guid);
						break;
					case WorkOrderAction.Cancel:
						response = await workOrderApi.cancel(target.guid);
						break;
					case WorkOrderAction.Reopen:
						response = await workOrderApi.reopen(target.guid);
						break;
					case WorkOrderAction.MarkAsClaimed:
						response = await workOrderApi.claim(target.guid, { invoiceAmount: 0 });
						break;
					case WorkOrderAction.Close:
						response = await workOrderApi.close(target.guid);
						break;
				}
				if (response?.error) failed.push(woNumber);
			} catch {
				failed.push(woNumber);
			}
		}),
	);

	const succeeded = selected.length - failed.length;
	if (succeeded) snackbar.success(`${succeeded} work order(s) updated.`);
	if (failed.length) {
		snackbar.error(`${failed.length} work order(s) failed. They remain selected.`);
	}
	selectedWorkOrders.value = failed;
	bulkAction.value = "";
	isConfirmBulkAction.value = false;
	applyingBulkAction.value = false;
	await fetchWorkOrders();
}

interface WorkTypeOption {
	guid: string;
	code: string;
	name: string;
	description?: string;
	withEquipmentForm: boolean;
	isActive?: boolean;
}

const isCreateDialog = ref(false);
const availableWorkTypes = ref<WorkTypeOption[]>([]);
const selectedWorkTypeGuid = ref<string>("");
const loadingWorkTypes = ref(false);
const searchingWorkTypes = ref(false);

async function fetchWorkTypes() {
	loadingWorkTypes.value = true;
	try {
		const wtRes = await workTypeApi.getWorkTypes({
			pageIndex: 0,
			pageSize: 5,
			timezone: "UTC",
		});
		if (wtRes.data && wtRes.data.data && wtRes.data.data.length > 0) {
			const activeTypes = wtRes.data.data.filter((wt: any) => wt.isActive !== false);
			availableWorkTypes.value = (activeTypes.length > 0 ? activeTypes : wtRes.data.data).map(
				(wt: any) => ({
					guid: wt.guid,
					code: wt.code,
					name: wt.name,
					description: wt.description || "",
					withEquipmentForm: !!wt.withEquipmentForm,
					isActive: wt.isActive,
				}),
			);
		} else {
			availableWorkTypes.value = [
				{
					guid: "wt-1",
					code: "mechanical",
					name: "Mechanical Maintenance",
					withEquipmentForm: true,
					isActive: true,
				},
				{
					guid: "wt-2",
					code: "electrical",
					name: "Electrical Maintenance",
					withEquipmentForm: false,
					isActive: true,
				},
				{
					guid: "wt-3",
					code: "hvac",
					name: "HVAC System",
					withEquipmentForm: true,
					isActive: true,
				},
				{
					guid: "wt-4",
					code: "general",
					name: "General Maintenance",
					withEquipmentForm: false,
					isActive: true,
				},
			];
		}
	} catch (e) {
		console.error("Failed to fetch work types for modal:", e);
		availableWorkTypes.value = [
			{
				guid: "wt-1",
				code: "mechanical",
				name: "Mechanical Maintenance",
				withEquipmentForm: true,
				isActive: true,
			},
			{
				guid: "wt-2",
				code: "electrical",
				name: "Electrical Maintenance",
				withEquipmentForm: false,
				isActive: true,
			},
			{
				guid: "wt-3",
				code: "hvac",
				name: "HVAC System",
				withEquipmentForm: true,
				isActive: true,
			},
			{
				guid: "wt-4",
				code: "general",
				name: "General Maintenance",
				withEquipmentForm: false,
				isActive: true,
			},
		];
	} finally {
		loadingWorkTypes.value = false;
	}
}

const searchWorkTypes = debounce(async (q: string) => {
	searchingWorkTypes.value = true;
	try {
		const wtRes = await workTypeApi.getWorkTypes({ pageIndex: 0, pageSize: 5, q, timezone: "UTC" });
		const results = (wtRes.data?.data || []).filter((wt: any) => wt.isActive !== false).map((wt: any) => ({
			guid: wt.guid,
			code: wt.code,
			name: wt.name,
			description: wt.description || "",
			withEquipmentForm: !!wt.withEquipmentForm,
			isActive: wt.isActive,
		}));
		availableWorkTypes.value = [...availableWorkTypes.value.filter((wt) => (wt.guid || wt.code) === selectedWorkTypeGuid.value), ...results]
			.filter((wt, index, all) => all.findIndex((item) => (item.guid || item.code) === (wt.guid || wt.code)) === index);
	} finally {
		searchingWorkTypes.value = false;
	}
}, 300);

function proceedCreateWorkOrder() {
	const selectedWt =
		availableWorkTypes.value.find(
			(wt) => (wt.guid || wt.code) === selectedWorkTypeGuid.value,
		) || availableWorkTypes.value[0];

	isCreateDialog.value = false;
	router.push({
		name: "Work Order Form",
		query: {
			workType: selectedWt?.name || "Mechanical Maintenance",
			workTypeCode: selectedWt?.code || "mechanical",
			workTypeGuid: selectedWt?.guid || "",
			withEquipmentForm: selectedWt?.withEquipmentForm ? "true" : "false",
		},
	});
}

function viewWorkOrder(woNumber: string) {
	console.log(`View work order ${woNumber}`);
	const wo = workOrders.value.find((w) => w.woNumber === woNumber);
	if (wo) {
		if (
			wo.isDraft ||
			wo.status === WorkOrderStatus.Draft ||
			wo.status === WorkOrderStatus.New ||
			wo.status === WorkOrderStatus.PendingApproval
		) {
			router.push({
				name: "Work Order Form",
				params: { id: wo.guid || wo.woNumber },
				query: { mode: "view" },
			});
			return;
		}
		router.push({
			name: "Work Order Detail",
			params: { id: wo.guid || wo.woNumber },
			query:
				wo.status === WorkOrderStatus.InProgress ||
				wo.status === WorkOrderStatus.Done ||
				wo.status === WorkOrderStatus.Completed ||
				wo.status === WorkOrderStatus.Claimed ||
				wo.status === WorkOrderStatus.Closed ||
				wo.status === WorkOrderStatus.Cancelled ||
				wo.status === WorkOrderStatus.Rejected
					? { status: "completed" }
					: undefined,
		});
	}
}

function getStatusChipType(status: string) {
	if (!status) return "default";
	switch (status) {
		case "New":
		case "new":
			return "new";
		case "Draft":
		case "draft":
			return "pending";
		case "PendingApproval":
		case "pending":
		case "Pending Approval":
			return "pending-approval";
		case "InProgress":
		case "progress":
		case "in-progress":
		case "In Progress":
			return "in-progress";
		case "Done":
		case "done":
			return "done";
		case "Completed":
		case "completed":
			return "completed";
		case "Claimed":
		case "claimed":
			return "claimed";
		case "Closed":
		case "closed":
			return "closed";
		case "Cancelled":
		case "cancelled":
			return "cancelled";
		case "Rejected":
		case "rejected":
			return "rejected";
		default:
			return "default";
	}
}

function formatStatusLabel(status: string) {
	if (!status) return "";
	switch (status) {
		case "Draft":
		case "draft":
			return "Draft";
		case "PendingApproval":
		case "pending":
		case "Pending Approval":
			return "Pending Approval";
		case "InProgress":
		case "progress":
		case "in-progress":
		case "In Progress":
			return "In Progress";
		case "New":
		case "new":
			return "New";
		case "Done":
		case "done":
			return "Done";
		case "Completed":
		case "completed":
			return "Completed";
		case "Claimed":
		case "claimed":
			return "Claimed";
		case "Closed":
		case "closed":
			return "Closed";
		case "Cancelled":
		case "cancelled":
			return "Cancelled";
		case "Rejected":
		case "rejected":
			return "Rejected";
		default:
			return status.replace(/([a-z])([A-Z])/g, "$1 $2");
	}
}

defineExpose({
	handleCreateWorkOrder,
	fetchWorkOrders,
	viewWorkOrder,
});
</script>

<template>
	<div class="maintenance-view" :class="{ 'maintenance-view--embedded': hideHeader }">
		<PageHeader v-if="!hideHeader" :title="pageTitle" mobile-icon-only>
			<template #subtitle>
				<p class="page-header__subtitle">
					Manage and track work orders across your facilities
				</p>
			</template>
			<template #actions>
				<button
					v-if="authStore.can('export', 'Report')"
					class="btn btn--primary"
					:disabled="exporting"
					@click="handleExport('CSV')"
				>
					<i class="mdi mdi-file-delimited-outline"></i> <span class="btn-text">Export CSV</span>
				</button>
				<button
					v-if="authStore.can('export', 'Report')"
					class="btn btn--primary"
					:disabled="exporting"
					@click="handleExport('PDF')"
				>
					<i class="mdi mdi-file-pdf-box"></i> <span class="btn-text">Export PDF</span>
				</button>
				<button
					v-if="
						authStore.can('create', 'WorkOrder') &&
						(effectiveStatus === 'New' ||
							effectiveStatus === 'All' ||
							effectiveStatus === 'all')
					"
					class="btn btn--primary add-workorder-btn"
					@click="handleCreateWorkOrder"
				>
					<i class="mdi mdi-plus"></i>
					<span class="btn-text">Create New Work Order</span>
				</button>
			</template>
		</PageHeader>

		<Card style="padding: var(--spacing-md)">
			<div class="filter-bar">
				<Textbox
					v-model="searchQuery"
					placeholder="Search all columns..."
					style="flex: 1"
					hide-footer
				>
					<template #prefix>
						<i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 4px"></i>
					</template>
				</Textbox>

				<FilterPanel
					:count="activeFilterCount"
					show-reset
					@reset="resetFilters"
					@apply="applyFilters"
				>
					<!-- Hide local status filter if we are already in a specific status view -->
					<Select v-if="activeStatus === 'All'" v-model="statusFilter" label="Status">
						<option value="all">All Status</option>
						<option value="New">New</option>
						<option value="PendingApproval">Pending Approval</option>
						<option value="InProgress">In Progress</option>
						<option value="Done">Done</option>
						<option value="Completed">Completed</option>
						<option value="Claimed">Claimed</option>
						<option value="Closed">Closed</option>
						<option value="Rejected">Rejected</option>
						<option value="Cancelled">Cancelled</option>
					</Select>

					<Select v-model="workTypeFilter" label="Work Type">
						<option value="all">All Types</option>
						<option
							v-for="wt in availableWorkTypes"
							:key="wt.guid || wt.code || wt.name"
							:value="wt.name || wt.code"
						>
							{{ wt.name }}
						</option>
					</Select>

					<div style="display: flex; gap: 16px">
						<DatePicker
							style="flex: 1"
							v-model="dateFrom"
							label="From"
							placeholder="Any"
							align="left"
						/>
						<DatePicker
							style="flex: 1"
							v-model="dateTo"
							label="To"
							placeholder="Any"
							align="right"
							:min="dateFrom || undefined"
						/>
					</div>
				</FilterPanel>

			</div>
		</Card>

		<!-- Bulk Actions Bar -->
		<Transition name="slide-fade">
			<div class="bulk-action-bar" v-if="selectedWorkOrders.length > 0">
				<div class="bulk-action-bar__left">
					<Badge type="info">{{ selectedWorkOrders.length }} Selected</Badge>
				</div>
				<div class="bulk-action-bar__right">
					<template v-if="availableBulkActions.length > 0">
						<Button
							v-for="action in availableBulkActions"
							:key="action.value"
							variant="primary"
							@click="
								bulkAction = action.value;
								isConfirmBulkAction = true;
							"
						>
							{{ action.title }}
						</Button>
					</template>
					<span v-else class="u-text-muted" style="font-size: 13px; font-style: italic">
						No valid bulk actions
					</span>
					<div class="bulk-action-bar__divider"></div>
					<Button variant="text" @click="selectedWorkOrders = []">Clear Selection</Button>
				</div>
			</div>
		</Transition>

		<Card class="table-scroll-container" style="padding: 0">
			<Table
				paginate
				server-pagination
				:page-index="pageIndex"
				:rows-per-page="pageSize"
				:total-items="totalWorkOrders"
				@update:page-index="pageIndex = $event"
				@update:rows-per-page="pageSize = $event"
				hover
				bordered
				storageKey="work-order-list"
				:headers="headers"
				:items="filteredWorkOrders"
				:loading="loading"
				:search-query="searchQuery"
				emptyMessage="No work orders found matching the filter criteria."
				@row-click="(wo) => goToDetail(wo)"
			>
				<template #header-select>
					<Checkbox v-model="isAllSelected" />
				</template>
				<template #item-select="{ item }">
					<div @click.stop>
						<Checkbox
							:modelValue="selectedWorkOrdersSet.has(item.woNumber)"
							@update:modelValue="(val) => toggleSelection(item.woNumber, val)"
						/>
					</div>
				</template>
				<template #item-woNumber="{ item }">
					<div style="display: flex; align-items: center; gap: 8px">
						<span
							class="u-font-mono u-font-weight-medium text-primary"
							style="cursor: pointer; text-decoration: underline"
							@click.stop="goToDetail(item)"
						>
							<HighlightText :text="item.woNumber" :query="searchQuery" />
						</span>
						<Badge v-if="item.isDraft" type="warning">Draft</Badge>
					</div>
				</template>
				<template #item-title="{ item }">
					<span class="u-font-weight-medium">
						<HighlightText :text="item.title" :query="searchQuery" />
					</span>
				</template>
				<template #item-customer="{ item }">
					<div class="customer-cell-content">
						<div class="u-font-weight-medium">
							<HighlightText :text="item.customer.name" :query="searchQuery" />
						</div>
						<div class="u-text-muted" style="font-size: 12px">
							<HighlightText :text="item.customer.email" :query="searchQuery" /> •
							<HighlightText :text="item.customer.phone" :query="searchQuery" />
						</div>
					</div>
				</template>
				<template #item-workType="{ item }">
					<Badge type="primary" icon="mdi-tools">
						{{ item.workType }}
					</Badge>
				</template>
				<template #item-jobPriority="{ item }">
					<Badge
						:type="priorityColors[item.jobPriority] as any"
						:icon="
							item.jobPriority === 'High'
								? 'mdi-alert-circle'
								: item.jobPriority === 'Medium'
									? 'mdi-alert'
									: 'mdi-information'
						"
					>
						{{ item.jobPriority }} Priority
					</Badge>
				</template>
				<template #item-personInCharge="{ item }">
					<span
						:class="{
							'u-text-muted':
								!item.personInCharge || item.personInCharge === 'Unassigned',
						}"
					>
						<HighlightText
							:text="item.personInCharge || 'Unassigned'"
							:query="searchQuery"
						/>
					</span>
				</template>
				<template #item-leader="{ item }">
					<span :class="{ 'u-text-muted': !item.leader || item.leader === 'Unassigned' }">
						<HighlightText :text="item.leader || 'Unassigned'" :query="searchQuery" />
					</span>
				</template>
				<template #item-leaderII="{ item }">
					<span
						:class="{
							'u-text-muted': !item.leaderII || item.leaderII === 'Unassigned',
						}"
					>
						<HighlightText :text="item.leaderII || 'Unassigned'" :query="searchQuery" />
					</span>
				</template>
				<template #item-salesAgent="{ item }">
					<span
						:class="{
							'u-text-muted': !item.salesAgent || item.salesAgent === 'Unassigned',
						}"
					>
						<HighlightText
							:text="item.salesAgent || 'Unassigned'"
							:query="searchQuery"
						/>
					</span>
				</template>
				<template #item-createdAt="{ item }">
					{{ dateFormatStore.formatDate(item.createdAt) }}
				</template>
				<template #item-status="{ item }">
					<Badge
						class="wo-order-status-badge"
						:type="getStatusChipType(item.status) as any"
					>
						{{ formatStatusLabel(item.status) }}
					</Badge>
				</template>
				<template #item-actions="{ item }">
					<div class="row-actions">
						<template v-for="btn in buttonList" :key="btn.tooltip">
							<button
								v-if="
									canUseWorkOrderAction(btn, item) &&
									btn.status.includes(item.status as WorkOrderStatus)
								"
								class="btn btn--icon"
								:class="btn.class"
								:title="btn.tooltip"
								@click.stop="btn.click(item)"
							>
								<i class="mdi" :class="btn.icon"></i>
							</button>
						</template>
					</div>
				</template>
			</Table>
		</Card>

		<!-- Dialogs -->
		<Dialog v-model="isCreateDialog" title="Select Work Type" maxWidth="500px" overflowVisible>
			<p style="margin: 0 0 16px 0">Please select the work type for the new work order.</p>
			<div
				v-if="loadingWorkTypes"
				style="padding: 16px; text-align: center; color: var(--color-text-secondary)"
			>
				<i class="mdi mdi-loading mdi-spin" style="font-size: 20px"></i>
				<p style="margin: 8px 0 0 0">Fetching work types...</p>
			</div>
			<div v-else style="position: relative">
				<Autocomplete
					v-model="selectedWorkTypeGuid"
					:options="
						availableWorkTypes.map((wt) => ({
							id: wt.guid || wt.code,
							name: wt.name,
							code: wt.code,
							info: wt.withEquipmentForm ? '• With Equipment' : '',
						}))
					"
					label="Work Type"
					placeholder="Type or select a work type..."
					emptyMessage="Not found"
					server-search
					:loading="searchingWorkTypes"
					@search="searchWorkTypes"
				/>
			</div>
			<template #footer>
				<Button variant="text" @click="isCreateDialog = false">Cancel</Button>
				<Button
					variant="primary"
					:disabled="loadingWorkTypes || !selectedWorkTypeGuid"
					@click="proceedCreateWorkOrder"
					>Proceed</Button
				>
			</template>
		</Dialog>

		<Dialog v-model="isConfirm" :title="confirmTitle">
			<p style="margin: 0">{{ confirmMsg }}</p>
			<template #footer>
				<Button variant="secondary" @click="isConfirm = false">Cancel</Button>
				<Button variant="primary" :loading="actionLoading" @click="executeAction">Confirm</Button>
			</template>
		</Dialog>

		<Dialog v-model="isConfirmBulkAction" title="Confirm Bulk Action">
			<p style="margin: 0">
				Are you sure you want to proceed with this bulk action? You cannot undo this later.
			</p>
			<template #footer>
				<Button variant="secondary" @click="isConfirmBulkAction = false">Cancel</Button>
				<Button variant="primary" :loading="applyingBulkAction" @click="applyBulkAction">
					{{ applyingBulkAction ? "Processing..." : "Confirm" }}
				</Button>
			</template>
		</Dialog>

		<Dialog v-model="isReject" title="Reject Work Order">
			<p style="margin: 0 0 16px 0">
				Please provide a reason for rejecting Work Order
				<strong>{{ selectedItem?.woNumber }}</strong
				>.
			</p>
			<Textbox
				v-model="rejectReason"
				label="Rejection Reason"
				placeholder="Enter the reason here..."
				hide-footer
			/>
			<template #footer>
				<Button variant="secondary" @click="isReject = false">Cancel</Button>
				<Button variant="danger" :loading="rejectLoading" :disabled="!rejectReason" @click="executeReject"
					>Reject</Button
				>
			</template>
		</Dialog>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/WorkOrder/_work-order-list.scss";
</style>
