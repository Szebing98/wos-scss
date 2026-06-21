<script setup lang="ts">
import { ref, computed, watch } from "vue";
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

const props = defineProps({
	status: {
		type: String,
		default: "All",
	},
    hideHeader: {
        type: Boolean,
        default: false,
    }
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
    Cancelled = "Cancelled"
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
    View = "View"
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
    description: ""
});

const users = [
    { code: "usr-1", name: "Alice Smith" },
    { code: "usr-2", name: "Bob Jones" },
    { code: "usr-3", name: "Charlie Davis" },
    { code: "usr-4", name: "Diana Prince" }
];

const isConfirmBulkAction = ref(false);

const activeStatus = ref(props.status);

watch(
	() => props.status,
	(newVal) => {
		activeStatus.value = newVal;
	}
);

watch(
	() => route.query.status,
	(newVal) => {
		if (newVal && typeof newVal === "string") {
			activeStatus.value = newVal;
		}
	},
	{ immediate: true }
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
const dateFrom = ref<string | null>(null);
const dateTo = ref<string | null>(null);

const selectedWorkOrders = ref<string[]>([]);
const bulkAction = ref<WorkOrderAction | "">("");

function resetFilters() {
	statusFilter.value = "all";
    workTypeFilter.value = "all";
    dateFrom.value = null;
    dateTo.value = null;
}

const workOrders = ref<WorkOrderModel[]>([
	{
		woNumber: "WO-2026-0001",
		title: "Fix HVAC in Lobby",
		personInCharge: "Bob Smith",
        customer: { name: "Acme Corp", email: "contact@acme.com", phone: "555-0100" },
        workType: "Maintenance",
		status: WorkOrderStatus.New,
        createdAt: "2026-06-20T08:30"
	},
	{
		woNumber: "WO-2026-0002",
		title: "Replace broken lights",
		personInCharge: "Unassigned",
        customer: { name: "Globex", email: "info@globex.com", phone: "555-0101" },
        workType: "Electrical",
		status: WorkOrderStatus.PendingApproval,
        createdAt: "2026-06-21T09:15",
        description: "Multiple fluorescent light fixtures are flickering or completely out on the 3rd floor. Please replace ballasts if necessary and install new LED tubes.",
        location: "3rd Floor, West Wing",
        estimatedEndDate: "2026-06-25T17:00",
        leadEngineer: "usr-3",
        assistantEngineers: ["usr-4"],
        equipment: {
            name: "Ceiling Light Fixture",
            brand: "Philips",
            model: "CoreLine",
            serialNo: "PH-10293",
            equipmentType: "Lighting"
        }
	},
	{
		woNumber: "WO-2026-0003",
		title: "Server Room Cooling Check",
		personInCharge: "Alice Johnson",
        customer: { name: "Initech", email: "support@initech.com", phone: "555-0102" },
        workType: "HVAC",
		status: WorkOrderStatus.InProgress,
        createdAt: "2026-06-18T14:20"
	},
	{
		woNumber: "WO-2026-0004",
		title: "Install new desks in Sales Dept",
		personInCharge: "Charlie Davis",
        customer: { name: "Umbrella Corp", email: "admin@umbrella.com", phone: "555-0103" },
        workType: "Carpentry",
		status: WorkOrderStatus.Rejected,
		rejectedReason: "Budget not approved for this quarter.",
        createdAt: "2026-06-15T11:00"
	},
	{
		woNumber: "WO-2026-0005",
		title: "Monthly Fire Extinguisher Inspection",
		personInCharge: "Bob Smith",
        customer: { name: "Massive Dynamic", email: "facilities@massive.com", phone: "555-0104" },
        workType: "Safety",
		status: WorkOrderStatus.Done,
        createdAt: "2026-06-21T10:00"
	},
	{
		woNumber: "WO-2026-0006",
		title: "Update security camera firmware",
		personInCharge: "Derrick Rose",
        customer: { name: "Soylent Corp", email: "security@soylent.com", phone: "555-0105" },
        workType: "IT",
		status: WorkOrderStatus.Closed,
        createdAt: "2026-06-10T16:45"
	},
	{
		woNumber: "WO-2026-0007",
		title: "Water leak in restroom 2B",
		personInCharge: "Unassigned",
        customer: { name: "Cyberdyne", email: "ops@cyberdyne.com", phone: "555-0106" },
        workType: "Plumbing",
		status: WorkOrderStatus.New,
        createdAt: "2026-06-21T08:00"
	},
	{
		woNumber: "WO-2026-0008",
		title: "Restock printer supplies",
		personInCharge: "Emma Watson",
        customer: { name: "Wayne Enterprises", email: "office@wayne.com", phone: "555-0107" },
        workType: "General",
		status: WorkOrderStatus.Completed,
        createdAt: "2026-06-19T13:30"
	},
    {
		woNumber: "WO-2026-0009",
		title: "Repair front door lock",
		personInCharge: "Bob Smith",
        customer: { name: "Stark Industries", email: "facilities@stark.com", phone: "555-0108" },
        workType: "Security",
		status: WorkOrderStatus.Claimed,
        createdAt: "2026-06-20T15:10"
	},
]);

const filteredWorkOrders = computed(() => {
	return workOrders.value.filter((wo) => {
		const search = searchQuery.value.toLowerCase();
		const matchesSearch =
			!searchQuery.value ||
			wo.title.toLowerCase().includes(search) ||
			wo.woNumber.toLowerCase().includes(search) ||
			wo.personInCharge.toLowerCase().includes(search) ||
            wo.customer.name.toLowerCase().includes(search);

		const matchesGlobalStatus =
			activeStatus.value === "All" || wo.status === activeStatus.value;

		const matchesLocalStatus =
			statusFilter.value === "all" || wo.status === statusFilter.value;

		const matchesWorkType =
            workTypeFilter.value === "all" || wo.workType === workTypeFilter.value;

        // Date matching (created at)
        let matchesDate = true;
        const woDate = wo.createdAt.split('T')[0]; // Compare just the date part
        
        if (dateFrom.value) {
            const fromDate = dateFrom.value.split('T')[0];
            if (woDate < fromDate) matchesDate = false;
        }
        if (dateTo.value) {
            const toDate = dateTo.value.split('T')[0];
            if (woDate > toDate) matchesDate = false;
        }

		return matchesSearch && matchesGlobalStatus && matchesLocalStatus && matchesWorkType && matchesDate;
	});
});

const isAllSelected = computed({
	get: () => {
		return filteredWorkOrders.value.length > 0 && selectedWorkOrders.value.length === filteredWorkOrders.value.length;
	},
	set: (val) => {
		if (val) {
			selectedWorkOrders.value = filteredWorkOrders.value.map(wo => wo.woNumber);
		} else {
			selectedWorkOrders.value = [];
		}
	}
});

function toggleSelection(woNumber: string, isSelected: boolean) {
    if (isSelected) {
        if (!selectedWorkOrders.value.includes(woNumber)) {
            selectedWorkOrders.value.push(woNumber);
        }
    } else {
        selectedWorkOrders.value = selectedWorkOrders.value.filter(id => id !== woNumber);
    }
}

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
        { key: "select", label: "", width: "48px", align: "center" },
		{ key: "woNumber", label: "WO #" },
		{ key: "title", label: "Title" },
        { key: "customer", label: "Customer" },
        { key: "workType", label: "Work Type" },
		{ key: "personInCharge", label: "Person In Charge" },
		{ key: "createdAt", label: "Created Date" },
	];

    if (effectiveStatus.value === "All" || effectiveStatus.value === "all") {
        base.push({ key: "status", label: "Status" });
    }

	if (isRejectedView.value) {
		base.push({ key: "rejectedReason", label: "Rejected Reason" });
	}

	base.push({ key: "actions", label: "Actions", align: "right", width: "160px" });

	return base;
});

const pageTitle = computed(() => {
	if (effectiveStatus.value === "All" || effectiveStatus.value === "all") return "All Work Orders";
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
			WorkOrderStatus.Claimed,
		],
		click: (item: WorkOrderModel) => {
            if (item.status === WorkOrderStatus.PendingApproval) {
                // If it's pending approval, editing primarily means dealing with the schedule & resources
                openApproveDialog(item);
            } else if (item.status === WorkOrderStatus.InProgress) {
                // If it's in progress, navigate to the full detail page for execution
                router.push({ name: 'Work Order Detail', params: { id: item.woNumber } });
            } else {
			    router.push({ name: 'Work Order Form', params: { id: item.woNumber } });
            }
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
	{ title: "Mark as Cancel", value: WorkOrderAction.Cancel, status: [WorkOrderStatus.InProgress] },
	{ title: "Mark as Done", value: WorkOrderAction.MarkAsDone, status: [WorkOrderStatus.InProgress] },
	{ title: "Mark as Closed", value: WorkOrderAction.Close, status: [WorkOrderStatus.Claimed] },
	{ title: "Reopen", value: WorkOrderAction.Reopen, status: [WorkOrderStatus.Done] },
];

const selectedWorkOrdersList = computed(() => {
	return workOrders.value.filter((workorder) => selectedWorkOrders.value.includes(workorder.woNumber));
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
function handleCreateWorkOrder() {
	router.push({ name: 'Work Order Form' });
}

function handleExport() {
    console.log("Exporting work orders...");
}

function openConfirmDialog(title: string, msg: string, action: WorkOrderAction, item: WorkOrderModel) {
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
        engineer: item.assistantEngineers?.[0] || "", // fallback since approve dialog still uses single engineer
        description: item.description || ""
    };
    isApproveDialog.value = true;
}

function saveApproveData() {
    const target = workOrders.value.find(w => w.woNumber === selectedItem.value?.woNumber);
    if (target) {
        target.estimatedEndDate = approveFormData.value.estimatedEndDate;
        target.leadEngineer = approveFormData.value.leadEngineer;
        target.assistantEngineers = approveFormData.value.engineer ? [approveFormData.value.engineer] : [];
        target.description = approveFormData.value.description;
    }
}

function handleSaveApproveDraft() {
    saveApproveData();
    isApproveDialog.value = false;
}

function handleApprove() {
    saveApproveData();
    const target = workOrders.value.find(w => w.woNumber === selectedItem.value?.woNumber);
    if (target) {
        target.status = WorkOrderStatus.InProgress;
    }
    isApproveDialog.value = false;
}

function executeAction() {
    if (selectedItem.value && statusAction.value) {
        console.log(`Executing ${statusAction.value} on ${selectedItem.value.woNumber}`);
        // Dummy execution logic (in real app, call API)
        const target = workOrders.value.find(w => w.woNumber === selectedItem.value?.woNumber);
        if (target) {
            // Apply dummy status change based on action
            switch(statusAction.value) {
                case WorkOrderAction.Approve: target.status = WorkOrderStatus.InProgress; break;
                case WorkOrderAction.MarkAsDone: target.status = WorkOrderStatus.Done; break;
                case WorkOrderAction.Cancel: target.status = WorkOrderStatus.Cancelled; break;
                case WorkOrderAction.Reopen: target.status = WorkOrderStatus.InProgress; break;
                case WorkOrderAction.MarkAsClaimed: target.status = WorkOrderStatus.Claimed; break;
                case WorkOrderAction.Close: target.status = WorkOrderStatus.Closed; break;
            }
        }
    }
    isConfirm.value = false;
}

function executeReject() {
    if (selectedItem.value && rejectReason.value) {
        console.log(`Rejecting ${selectedItem.value.woNumber} with reason: ${rejectReason.value}`);
        const target = workOrders.value.find(w => w.woNumber === selectedItem.value?.woNumber);
        if (target) {
            target.status = WorkOrderStatus.Rejected;
            target.rejectedReason = rejectReason.value;
        }
    }
    isReject.value = false;
}

function applyBulkAction() {
    console.log(`Applying bulk action ${bulkAction.value} to ${selectedWorkOrders.value.length} items`);
    // Dummy execution logic
    workOrders.value.forEach(w => {
        if (selectedWorkOrders.value.includes(w.woNumber)) {
            switch(bulkAction.value) {
                case WorkOrderAction.Approve: w.status = WorkOrderStatus.InProgress; break;
                case WorkOrderAction.MarkAsDone: w.status = WorkOrderStatus.Done; break;
                case WorkOrderAction.Cancel: w.status = WorkOrderStatus.Cancelled; break;
                case WorkOrderAction.Reopen: w.status = WorkOrderStatus.InProgress; break;
                case WorkOrderAction.MarkAsClaimed: w.status = WorkOrderStatus.Claimed; break;
                case WorkOrderAction.Close: w.status = WorkOrderStatus.Closed; break;
            }
        }
    });
    selectedWorkOrders.value = [];
    bulkAction.value = "";
    isConfirmBulkAction.value = false;
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
        router.push({ name: 'Work Order Form', params: { id: viewSelectedItem.value.woNumber } });
    }
}

function handleSaveProgress(updatedWorkOrder: WorkOrderModel) {
    const target = workOrders.value.find(w => w.woNumber === updatedWorkOrder.woNumber);
    if (target) {
        Object.assign(target, updatedWorkOrder);
    }
}

function getStatusChipType(status: string) {
	switch (status) {
		case "Rejected":
		case "Cancelled":
			return "error";
		case "PendingApproval":
			return "warning";
		case "InProgress":
			return "info";
		case "Done":
		case "Completed":
		case "Claimed":
			return "success";
		case "Closed":
			return "default";
		default:
			return "default";
	}
}
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
                    v-if="effectiveStatus === 'New' || effectiveStatus === 'All' || effectiveStatus === 'all'"
                    class="btn btn--primary"
                    @click="handleCreateWorkOrder"
                >
                    <i class="mdi mdi-plus"></i> Create New Work Order
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

				<FilterPanel show-reset align="right" @reset="resetFilters">
					<!-- Hide local status filter if we are already in a specific status view -->
					<Select v-if="activeStatus === 'All'" v-model="statusFilter" label="Status">
						<option value="all">All Statuses</option>
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
                        <option value="Maintenance">Maintenance</option>
                        <option value="Electrical">Electrical</option>
                        <option value="HVAC">HVAC</option>
                        <option value="Carpentry">Carpentry</option>
                        <option value="Safety">Safety</option>
                        <option value="IT">IT</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="General">General</option>
                        <option value="Security">Security</option>
                    </Select>

                    <DatePicker v-model="dateFrom" label="Date From" placeholder="Any" />
                    <DatePicker v-model="dateTo" label="Date To" placeholder="Any" :min="dateFrom || undefined" />
				</FilterPanel>
                <Button variant="outlined" @click="handleExport" title="Export List" style="margin-left: 8px; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="mdi mdi-tray-arrow-down" style="font-size: 18px;"></i> Export
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
                            @click="bulkAction = action.value; isConfirmBulkAction = true;"
                        >
                            {{ action.title }}
                        </Button>
                    </template>
                    <span v-else class="u-text-muted" style="font-size: 13px; font-style: italic;">
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
				:headers="headers"
				:items="filteredWorkOrders"
				emptyMessage="No work orders found matching the filter criteria."
				@row-click="(wo) => viewWorkOrder(wo.woNumber)"
			>
                <template #header-select>
                    <Checkbox v-model="isAllSelected" />
                </template>
                <template #item-select="{ item }">
                    <div @click.stop>
                        <Checkbox 
                            :modelValue="selectedWorkOrders.includes(item.woNumber)" 
                            @update:modelValue="val => toggleSelection(item.woNumber, val)" 
                        />
                    </div>
                </template>
				<template #item-woNumber="{ item }">
					<span class="u-font-mono u-font-weight-medium">{{ item.woNumber }}</span>
				</template>
				<template #item-title="{ item }">
					<span class="u-font-weight-medium">{{ item.title }}</span>
				</template>
                <template #item-customer="{ item }">
                    <div style="display: flex; flex-direction: column; line-height: 1.4;">
                        <span class="u-font-weight-medium">{{ item.customer.name }}</span>
                        <span class="u-text-muted" style="font-size: 12px;">{{ item.customer.email }} • {{ item.customer.phone }}</span>
                    </div>
                </template>
                <template #item-workType="{ item }">
                    <span class="u-text-muted">{{ item.workType }}</span>
                </template>
				<template #item-personInCharge="{ item }">
					<span :class="{ 'u-text-muted': item.personInCharge === 'Unassigned' }">
						{{ item.personInCharge }}
					</span>
				</template>
                <template #item-createdAt="{ item }">
                    <span class="u-text-muted">{{ new Date(item.createdAt).toLocaleDateString() }}</span>
                </template>
				<template #item-status="{ item }">
					<Badge :type="getStatusChipType(item.status)">{{
						item.status.replace(/([A-Z])/g, " $1").trim()
					}}</Badge>
				</template>
				<template #item-rejectedReason="{ item }">
					<span class="u-text-error u-font-weight-medium">
						{{ item.rejectedReason || "N/A" }}
					</span>
				</template>
				<template #item-actions="{ item }">
                    <div class="actions-cell" @click.stop>
                        <button
                            class="btn btn--icon btn--icon-secondary"
                            @click="viewWorkOrder(item.woNumber)"
                            title="View Details"
                        >
                            <i class="mdi mdi-eye-outline" style="font-size: 20px;"></i>
                        </button>
                        <template v-for="btn in buttonList" :key="btn.icon">
                            <button
                                v-if="btn.status.includes(item.status)"
                                class="btn btn--icon"
                                :class="btn.class"
                                @click="btn.click(item)"
                                :title="btn.tooltip"
                            >
                                <i class="mdi" :class="btn.icon" style="font-size: 20px;"></i>
                            </button>
                        </template>
                    </div>
				</template>
			</Table>
		</Card>

        <Dialog v-model="isConfirm" :title="confirmTitle">
            <p style="margin: 0;">{{ confirmMsg }}</p>
            <template #footer>
                <Button variant="secondary" @click="isConfirm = false">Cancel</Button>
                <Button variant="primary" @click="executeAction">Confirm</Button>
            </template>
        </Dialog>

        <Dialog v-model="isConfirmBulkAction" title="Confirm Bulk Action">
            <p style="margin: 0;">Are you sure you want to proceed with this bulk action? You cannot undo this later.</p>
            <template #footer>
                <Button variant="secondary" @click="isConfirmBulkAction = false">Cancel</Button>
                <Button variant="primary" @click="applyBulkAction">Confirm</Button>
            </template>
        </Dialog>

        <Dialog v-model="isReject" title="Reject Work Order">
            <p style="margin: 0 0 16px 0;">Please provide a reason for rejecting Work Order <strong>{{ selectedItem?.woNumber }}</strong>.</p>
            <Textbox 
                v-model="rejectReason" 
                label="Rejection Reason" 
                placeholder="Enter the reason here..."
                hide-footer
            />
            <template #footer>
                <Button variant="secondary" @click="isReject = false">Cancel</Button>
                <Button variant="danger" :disabled="!rejectReason" @click="executeReject">Reject</Button>
            </template>
        </Dialog>

        <Dialog v-model="isApproveDialog" title="Approve Work Order" maxWidth="500px">
            <p style="margin: 0 0 16px 0; font-size: 14px; color: var(--colors-text-muted);">
                Review and update the schedule and resources before approving Work Order <strong>{{ selectedItem?.woNumber }}</strong>.
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
</style>
