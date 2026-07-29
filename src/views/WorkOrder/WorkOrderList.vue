<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Badge from "@/components/Badge.vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Card from "@/components/Card.vue";
import Checkbox from "@/components/Checkbox.vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import DatePicker from "@/components/DatePicker.vue";
import WorkOrderDetailsDialog from "./WorkOrderDetailsDialog.vue";
import { workOrderApi } from "@/api/work-order/work-order.api";
import { workTypeApi } from "@/api/maintenance/work-type/work-type.api";
import HighlightText from "@/components/HighlightText.vue";
import Autocomplete from "@/components/Autocomplete.vue";

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

// Constants
enum WorkOrderStatus {
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

const isViewDetails = ref(false);
const viewSelectedItem = ref<WorkOrderModel | null>(null);
const startDetailsInEditMode = ref(false);

const isApproveDialog = ref(false);
const approveFormData = ref({
	estimatedEndDate: "",
	leadEngineer: "",
	engineer: "",
	description: "",
});

const users = [
	{ code: "usr-1", name: "Alice Smith" },
	{ code: "usr-2", name: "Bob Jones" },
	{ code: "usr-3", name: "Charlie Davis" },
	{ code: "usr-4", name: "Diana Prince" },
];

const isConfirmBulkAction = ref(false);

const activeStatus = ref(props.status);

watch(
	() => props.status,
	(newVal) => {
		activeStatus.value = newVal;
	},
);

watch(
	() => route.query.status,
	(newVal) => {
		if (newVal && typeof newVal === "string") {
			activeStatus.value = newVal;
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
	woNumber: string;
	title: string;
	personInCharge: string;
	customer: CustomerModel;
	workType: string;
	status: WorkOrderStatus | string;
	rejectedReason?: string;
	createdAt: string;
	estimatedEndDate?: string;
	leadEngineer?: string;
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

const workOrders = ref<any[]>([]);
const loading = ref(false);

async function fetchWorkOrders() {
	loading.value = true;
	try {
		const query: any = {
			pageIndex: 0,
			pageSize: 100,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		};
		if (searchQuery.value) query.q = searchQuery.value;

		// Status query
		if (activeStatus.value !== "All" && activeStatus.value !== "all") {
			query.status = activeStatus.value;
		} else if (appliedStatusFilter.value !== "all") {
			query.status = appliedStatusFilter.value;
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
		if (data && data.data && Array.isArray(data.data)) {
			workOrders.value = data.data.map((w: any) => ({
				guid: w.guid,
				woNumber: w.docNo || w.code || w.guid.substring(0, 8).toUpperCase(),
				title: w.title,
				personInCharge: w.projectPicName || w.personInChargeCode || "Unassigned",
				customer: {
					name: w.customerName || "Unknown",
					email: w.customerEmail || "",
					phone: w.customerPhone || "",
				},
				workType: w.workType || "Maintenance",
				status: w.orderStatus || w.status,
				jobPriority: w.jobPriority || "Low",
				siteCode: w.siteCode || "",
				createdAt: w.createdAt,
				rejectedReason: w.rejectedReason || "",
				description: w.description || "",
				location: w.location || w.locationName || "",
				estimatedEndDate: w.estimatedEndDate || "",
				leadEngineer: w.leadEngineerName || w.leaderCode || "",
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
	router.push({
		name: "Work Order Detail",
		params: { id },
		query:
			item.status === "Completed" || item.status === "Claimed"
				? { status: "completed" }
				: undefined,
	});
}

watch(
	[
		searchQuery,
		activeStatus,
		appliedStatusFilter,
		appliedWorkTypeFilter,
		appliedDateFrom,
		appliedDateTo,
	],
	() => {
		fetchWorkOrders();
	},
);

onMounted(() => {
	fetchWorkOrders();
	fetchWorkTypes();
});

const filteredWorkOrders = computed(() => {
	if (!workOrders.value) return [];
	return workOrders.value.filter((w) => {
		if (!w) return false;
		if (activeStatus.value !== "All" && activeStatus.value !== "all") {
			if (w.status?.toLowerCase() !== activeStatus.value?.toLowerCase()) return false;
		} else if (appliedStatusFilter.value !== "all") {
			if (w.status?.toLowerCase() !== appliedStatusFilter.value?.toLowerCase()) return false;
		}

		if (appliedWorkTypeFilter.value !== "all") {
			if (w.workType?.toLowerCase() !== appliedWorkTypeFilter.value?.toLowerCase())
				return false;
		}

		if (searchQuery.value) {
			const q = searchQuery.value.toLowerCase();
			const matchWo = w.woNumber?.toLowerCase().includes(q);
			const matchTitle = w.title?.toLowerCase().includes(q);
			const matchCust = w.customer?.name?.toLowerCase().includes(q);
			const matchPic = w.personInCharge?.toLowerCase().includes(q);
			if (!matchWo && !matchTitle && !matchCust && !matchPic) return false;
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

function toggleSelection(woNumber: string, isSelected: boolean) {
	if (isSelected) {
		if (!selectedWorkOrders.value.includes(woNumber)) {
			selectedWorkOrders.value.push(woNumber);
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
		base.push({ key: "status", label: "Status", width: "140px", minWidth: "130px" });
	}

	base.push(
		{ key: "woNumber", label: "WO #", width: "130px", minWidth: "115px" },
		{ key: "title", label: "Work Order Title", width: "320px", minWidth: "220px" },
		{ key: "customer", label: "Customer", width: "280px", minWidth: "220px" },
		{ key: "workType", label: "Work Type", width: "150px", minWidth: "130px" },
		{ key: "personInCharge", label: "Person In Charge", width: "160px", minWidth: "140px" },
		{ key: "createdAt", label: "Created Date", width: "130px", minWidth: "110px" },
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
			WorkOrderStatus.New,
			WorkOrderStatus.PendingApproval,
			WorkOrderStatus.InProgress,
			WorkOrderStatus.Completed,
		],
		click: (item: WorkOrderModel) => {
			if (item.status === WorkOrderStatus.PendingApproval) {
				// If it's pending approval, editing primarily means dealing with the schedule & resources
				openApproveDialog(item);
			} else if (item.status === WorkOrderStatus.InProgress) {
				// If it's in progress, navigate to the full detail page for execution
				router.push({ name: "Work Order Detail", params: { id: item.guid } });
			} else {
				router.push({ name: "Work Order Form", params: { id: item.guid } });
			}
		},
	},
	{
		icon: "mdi-eye",
		class: "btn--icon-secondary",
		tooltip: "View Details",
		status: [WorkOrderStatus.Claimed],
		click: (item: WorkOrderModel) => {
			router.push({
				name: "Work Order Detail",
				params: { id: item.guid },
				query: { status: "completed" },
			});
		},
	},
	{
		icon: "mdi-check-circle",
		class: "u-text-success",
		tooltip: "Approve",
		status: [WorkOrderStatus.PendingApproval],
		click: (item: WorkOrderModel) => {
			openApproveDialog(item);
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

const availableBulkActions = computed(() => {
	if (!selectedWorkOrdersList.value.length) return [];
	return bulkActionList.filter((action) => {
		return selectedWorkOrdersList.value.every((item) =>
			action.status.includes(item.status as WorkOrderStatus),
		);
	});
});

// Handlers
async function handleCreateWorkOrder() {
	await fetchWorkTypes();
	isCreateDialog.value = true;
}

function handleExport() {
	console.log("Exporting work orders...");
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

function openApproveDialog(item: WorkOrderModel) {
	selectedItem.value = item;
	approveFormData.value = {
		estimatedEndDate: item.estimatedEndDate || "",
		leadEngineer: item.leadEngineer || "",
		engineer: item.assistantEngineers?.[0] || "",
		description: item.description || "",
	};
	isApproveDialog.value = true;
}

function saveApproveData() {
	const target = workOrders.value.find((w) => w.woNumber === selectedItem.value?.woNumber);
	if (target) {
		target.estimatedEndDate = approveFormData.value.estimatedEndDate;
		target.leadEngineer = approveFormData.value.leadEngineer;
		target.assistantEngineers = approveFormData.value.engineer
			? [approveFormData.value.engineer]
			: [];
		target.description = approveFormData.value.description;
	}
}

function handleSaveApproveDraft() {
	saveApproveData();
	isApproveDialog.value = false;
}

function handleApprove() {
	saveApproveData();
	const target = workOrders.value.find((w) => w.woNumber === selectedItem.value?.woNumber);
	if (target) {
		target.status = WorkOrderStatus.InProgress;
	}
	isApproveDialog.value = false;
}

async function executeAction() {
	if (selectedItem.value && statusAction.value) {
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
				alert(`Action failed: ${res.error.error.message}`);
			} else {
				fetchWorkOrders();
			}
		} catch (e) {
			console.error(e);
		}
	}
	isConfirm.value = false;
}

async function executeReject() {
	if (selectedItem.value && rejectReason.value) {
		try {
			const guid = selectedItem.value.guid;
			if (!guid) return;
			const { error } = await workOrderApi.reject(guid, {
				rejectedReason: rejectReason.value,
			});
			if (error) {
				alert(`Failed to reject work order: ${error.error.message}`);
			} else {
				fetchWorkOrders();
			}
		} catch (e) {
			console.error(e);
		}
	}
	isReject.value = false;
}

async function applyBulkAction() {
	if (!bulkAction.value) return;
	try {
		for (const woNumber of selectedWorkOrders.value) {
			const target = workOrders.value.find((w) => w.woNumber === woNumber);
			if (target && target.guid) {
				const guid = target.guid;
				switch (bulkAction.value) {
					case WorkOrderAction.Approve:
						await workOrderApi.approve(guid);
						break;
					case WorkOrderAction.MarkAsDone:
						await workOrderApi.complete(guid);
						break;
					case WorkOrderAction.Cancel:
						await workOrderApi.cancel(guid);
						break;
					case WorkOrderAction.Reopen:
						await workOrderApi.reopen(guid);
						break;
					case WorkOrderAction.MarkAsClaimed:
						await workOrderApi.claim(guid, { invoiceAmount: 0 });
						break;
					case WorkOrderAction.Close:
						await workOrderApi.close(guid);
						break;
				}
			}
		}
		fetchWorkOrders();
	} catch (e) {
		console.error(e);
	}
	selectedWorkOrders.value = [];
	bulkAction.value = "";
	isConfirmBulkAction.value = false;
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

async function fetchWorkTypes() {
	loadingWorkTypes.value = true;
	try {
		const wtRes = await workTypeApi.getWorkTypes({
			pageIndex: 0,
			pageSize: 100,
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

function viewWorkOrder(woNumber: string, startInEditMode = false) {
	console.log(`View work order ${woNumber}`);
	const wo = workOrders.value.find((w) => w.woNumber === woNumber);
	if (wo) {
		viewSelectedItem.value = wo;
		startDetailsInEditMode.value = startInEditMode;
		isViewDetails.value = true;
	}
}

function handleEditFromView() {
	if (!viewSelectedItem.value) return;

	if (viewSelectedItem.value.status === WorkOrderStatus.PendingApproval) {
		isViewDetails.value = false;
		openApproveDialog(viewSelectedItem.value);
	} else {
		router.push({ name: "Work Order Form", params: { id: viewSelectedItem.value.guid } });
	}
}

function handleSaveProgress(updatedWorkOrder: WorkOrderModel) {
	const target = workOrders.value.find((w) => w.woNumber === updatedWorkOrder.woNumber);
	if (target) {
		Object.assign(target, updatedWorkOrder);
	}
}

function getStatusChipType(status: string) {
	if (!status) return "default";
	switch (status) {
		case "New":
		case "new":
			return "new";
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
	viewWorkOrder,
});
</script>

<template>
	<div class="maintenance-view" :class="{ 'maintenance-view--embedded': hideHeader }">
		<div class="maintenance-view__header" v-if="!hideHeader">
			<div class="maintenance-view__title-area">
				<h1>{{ pageTitle }}</h1>
				<p class="maintenance-view__subtitle">
					Manage and track work orders across your facilities
				</p>
			</div>
			<div class="header-actions">
				<button
					v-if="
						effectiveStatus === 'New' ||
						effectiveStatus === 'All' ||
						effectiveStatus === 'all'
					"
					class="btn btn--primary add-workorder-btn"
					@click="handleCreateWorkOrder"
				>
					<i class="mdi mdi-plus"></i>
					<span class="btn-text">New Work Order</span>
				</button>
			</div>
		</div>

		<Card style="padding: var(--spacing-md)">
			<div class="filter-bar">
				<Textbox
					v-model="searchQuery"
					placeholder="Search by WO #, Title, or Assignee..."
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
				<Button
					variant="outlined"
					@click="handleExport"
					title="Export List"
					style="margin-left: 8px; display: inline-flex; align-items: center; gap: 6px"
				>
					<i class="mdi mdi-tray-arrow-down" style="font-size: 18px"></i>
					<span class="filter-label-text">Export</span>
				</Button>
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
							:modelValue="selectedWorkOrders.includes(item.woNumber)"
							@update:modelValue="(val) => toggleSelection(item.woNumber, val)"
						/>
					</div>
				</template>
				<template #item-woNumber="{ item }">
					<span
						class="u-font-mono u-font-weight-medium text-primary"
						style="cursor: pointer; text-decoration: underline"
						@click.stop="goToDetail(item)"
					>
						<HighlightText :text="item.woNumber" :query="searchQuery" />
					</span>
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
					<span class="u-text-muted">
						<HighlightText :text="item.workType" :query="searchQuery" />
					</span>
				</template>
				<template #item-personInCharge="{ item }">
					<span :class="{ 'u-text-muted': item.personInCharge === 'Unassigned' }">
						<HighlightText :text="item.personInCharge" :query="searchQuery" />
					</span>
				</template>
				<template #item-createdAt="{ item }">
					{{ new Date(item.createdAt).toLocaleDateString() }}
				</template>
				<template #item-status="{ item }">
					<Badge :type="getStatusChipType(item.status) as any">{{
						formatStatusLabel(item.status)
					}}</Badge>
				</template>
				<template #item-actions="{ item }">
					<div class="row-actions">
						<template v-for="btn in buttonList" :key="btn.tooltip">
							<button
								v-if="btn.status.includes(item.status as WorkOrderStatus)"
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
				<Button variant="primary" @click="executeAction">Confirm</Button>
			</template>
		</Dialog>

		<Dialog v-model="isConfirmBulkAction" title="Confirm Bulk Action">
			<p style="margin: 0">
				Are you sure you want to proceed with this bulk action? You cannot undo this later.
			</p>
			<template #footer>
				<Button variant="secondary" @click="isConfirmBulkAction = false">Cancel</Button>
				<Button variant="primary" @click="applyBulkAction">Confirm</Button>
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
				<Button variant="danger" :disabled="!rejectReason" @click="executeReject"
					>Reject</Button
				>
			</template>
		</Dialog>

		<Dialog v-model="isApproveDialog" title="Approve Work Order" maxWidth="500px">
			<p style="margin: 0 0 16px 0; font-size: 14px; color: var(--colors-text-muted)">
				Review and update the schedule and resources before approving Work Order
				<strong>{{ selectedItem?.woNumber }}</strong
				>.
			</p>
			<div class="form-grid-approve">
				<DatePicker
					v-model="approveFormData.estimatedEndDate"
					label="Estimated Date of Completion"
					:enableTime="true"
				/>

				<Select v-model="approveFormData.leadEngineer" label="Lead Engineer">
					<option value="" disabled>Select Lead Engineer</option>
					<option v-for="user in users" :key="user.code" :value="user.code">
						{{ user.name }} ({{ user.code }})
					</option>
				</Select>

				<Select v-model="approveFormData.engineer" label="Assistant Engineer">
					<option value="" disabled>Select Engineer</option>
					<option v-for="user in users" :key="user.code" :value="user.code">
						{{ user.name }} ({{ user.code }})
					</option>
				</Select>

				<div class="textbox-field">
					<label class="custom-label">Work Description</label>
					<textarea
						v-model="approveFormData.description"
						class="custom-textarea"
						placeholder="Enter Description"
						rows="3"
					></textarea>
				</div>
			</div>
			<template #footer>
				<Button variant="secondary" @click="isApproveDialog = false">Cancel</Button>
				<Button variant="outlined" @click="handleSaveApproveDraft">Save Changes</Button>
				<Button variant="primary" @click="handleApprove">Approve</Button>
			</template>
		</Dialog>

		<WorkOrderDetailsDialog
			v-model="isViewDetails"
			:workOrder="viewSelectedItem"
			:users="users"
			:startInEditMode="startDetailsInEditMode"
			@edit="handleEditFromView"
			@save-progress="handleSaveProgress"
		/>
	</div>
</template>

<style lang="scss" scoped>
@mixin flex-row($align: stretch, $gap: 0) {
	display: flex;
	align-items: $align;
	gap: $gap;
}

.maintenance-view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-lg);

	&--embedded {
		gap: var(--spacing-md);
	}

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--spacing-md);
	}
	&__title-area {
		h1 {
			font-size: 24px;
			font-weight: 700;
			margin: 0 0 4px;
			color: var(--colors-text-primary);
		}
		p {
			font-size: 13px;
			color: var(--colors-text-muted);
			margin: 0;
		}
	}
}

.add-workorder-btn {
	flex-shrink: 0;
	white-space: nowrap;

	@media (max-width: 640px) {
		padding: 8px 12px !important;
		min-width: 40px;

		.btn-text {
			display: none;
		}
	}
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 12px;
}

.filter-bar {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	flex-wrap: wrap;
}

.table-scroll-container {
	max-height: 640px;
	overflow-y: auto;
	padding: 0 !important;
}

.actions-cell {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 4px;
}

.u-font-mono {
	font-family: monospace;
}
.u-font-weight-medium {
	font-weight: 500;
}
.u-text-muted {
	color: var(--colors-text-muted);
	font-style: italic;
}
.u-text-error {
	color: #ef4444 !important;
}
.u-text-success {
	color: #10b981 !important;
}
.u-text-warning {
	color: #f59e0b !important;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}

.actions-cell .btn--icon {
	width: 36px;
	height: 36px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.bulk-action-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 20px;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-brand-primary);
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(var(--colors-brand-primary-rgb, 59, 130, 246), 0.15);
	margin-bottom: -8px; // Pull it closer to the table
	position: relative;
	z-index: 10;

	&__left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	&__right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	&__divider {
		width: 1px;
		height: 24px;
		background: var(--colors-surface-border);
	}
}

.form-grid-approve {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
}

.custom-label {
	display: block;
	font-size: 11px;
	font-weight: 600;
	color: var(--colors-text-secondary);
	text-transform: uppercase;
	margin-bottom: 4px;
}

.custom-textarea {
	width: 100%;
	padding: 10px 12px;
	border-radius: 4px;
	border: 1px solid var(--colors-surface-border);
	background: var(--colors-surface-card);
	color: var(--colors-text-primary);
	font-size: 13px;
	outline: none;
	resize: vertical;
	transition: border-color 0.2s ease;
	font-family: inherit;

	&:focus {
		border-color: var(--colors-brand-primary);
	}
}
.customer-cell-content {
	line-height: 1.4;
	text-align: left;
}

@media (max-width: 767px) {
	.customer-cell-content {
		text-align: right;
	}
}
</style>
