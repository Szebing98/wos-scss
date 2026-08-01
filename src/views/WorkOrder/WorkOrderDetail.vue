<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/components/Button.vue";
import Card from "@/components/Card.vue";
import Badge from "@/components/Badge.vue";
import { workOrderApi } from "@/api/work-order/work-order.api";
import { userApi } from "@/api/user/user.api";
import { workTypeApi } from "@/api/maintenance/work-type/work-type.api";
import { useDateFormatStore } from "@/stores/dateFormat.store";
import { useAuthStore } from "@/stores/auth.store";

// Sub-tab Components
import RejectDialog from "./dialogs/RejectDialog.vue";
import NoteDialog from "./dialogs/NoteDialog.vue";
import RepeatDialog from "./dialogs/RepeatDialog.vue";
import TransferDialog from "./dialogs/TransferDialog.vue";
import ExtendDialog from "./dialogs/ExtendDialog.vue";
import ConfirmDialog from "./dialogs/ConfirmDialog.vue";
import QuotationDialog from "./dialogs/QuotationDialog.vue";
import InvoiceDialog from "./dialogs/InvoiceDialog.vue";
import PaymentDialog from "./dialogs/PaymentDialog.vue";
import LocationMapDialog from "./dialogs/LocationMapDialog.vue";
import UploadConfirmDialog from "./dialogs/UploadConfirmDialog.vue";
import FilePreviewDialog from "./dialogs/FilePreviewDialog.vue";
import GeneralTab from "./tabs/GeneralTab.vue";
import PartInfoTab from "./tabs/PartInfoTab.vue";
import SupplierInvoicesTab from "./tabs/SupplierInvoicesTab.vue";
import ImagesTab from "./tabs/ImagesTab.vue";
import NotesTab from "./tabs/NotesTab.vue";
import FinanceTab from "./tabs/FinanceTab.vue";
import VerificationTab from "./tabs/VerificationTab.vue";
import PaymentTab from "./tabs/PaymentTab.vue";
import ReportTab from "./tabs/ReportTab.vue";
import { useSnackbarStore } from "@/stores/snackbar.store.ts";
import http from "@/utils/http";
import { userDisplayCode } from "@/utils/User/user-display";

const route = useRoute();
const router = useRouter();
const dateFormatStore = useDateFormatStore();
const snackbar = useSnackbarStore();
const authStore = useAuthStore();

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3707/api").replace(
	/\/$/,
	"",
);

function getFileUrl(storageUrl?: string | null, isImage?: boolean) {
	if (!storageUrl) return "";
	// Normalize URL: remove work order guid from /work-order/:guid/files/...
	let url = storageUrl.replace(/\/work-order\/[^/]+\/files\//, "/work-order/files/");
	if (isImage) {
		url = url.replace(/\/download$/, "/preview");
	}
	if (url.startsWith("/work-order/")) {
		url = `${API_BASE_URL}${url}`;
	}
	return url;
}

async function loadFileBlobUrl(rawUrl: string, isImageOrPdf: boolean): Promise<string> {
	if (!rawUrl) return "";
	if (isImageOrPdf) {
		try {
			if (rawUrl.startsWith("blob:")) return rawUrl;
			let urlPath = rawUrl;
			if (urlPath.startsWith(API_BASE_URL)) {
				urlPath = urlPath.replace(API_BASE_URL, "");
			}
			const response = await http.get(urlPath, { responseType: "blob" });
			return URL.createObjectURL(response.data);
		} catch (error) {
			console.error("Failed to load file blob preview:", error, rawUrl);
			return rawUrl;
		}
	}
	return rawUrl;
}

const woNumber = route.params.id as string;

const fromStatus = (route.query.status as string) || "progress";

let initialStep = 2;
let breadcrumbStatus = ref("In Progress");

if (fromStatus === "done") {
	initialStep = 3;
	breadcrumbStatus.value = "Done";
} else if (fromStatus === "completed") {
	initialStep = 4;
	breadcrumbStatus.value = "Completed";
}

const currentStepIndex = ref(initialStep);
const isEditing = computed(() => currentStepIndex.value === 2);
const isGeneralEditMode = ref(false);
const normalizedWorkOrderStatus = computed(() =>
	String(workOrder.value?.status || "")
		.replace(/\s+/g, "")
		.toLowerCase(),
);
const isSuperadmin = computed(() =>
	(authStore.currentUser?.userGroups || []).some(
		(group: any) => String(group.code || "").toUpperCase() === "SA",
	),
);
const canEditForCurrentAssignment = computed(() => {
	if (isSuperadmin.value) return true;
	const userCode = authStore.currentUser?.code;
	if (!userCode) return false;
	if (["draft", "new"].includes(normalizedWorkOrderStatus.value)) {
		return workOrder.value?.createdByCode === userCode;
	}
	if (["pending", "pendingapproval"].includes(normalizedWorkOrderStatus.value)) {
		return workOrder.value?.projectPersonInCharge === userCode;
	}
	if (["progress", "inprogress"].includes(normalizedWorkOrderStatus.value)) {
		return (
			workOrder.value?.projectPersonInCharge === userCode ||
			workOrder.value?.leaderCode === userCode
		);
	}
	return false;
});
const canEnterGeneralEdit = computed(
	() =>
		["inprogress", "progress"].includes(normalizedWorkOrderStatus.value) &&
		authStore.can("update_progress", "WorkOrder") &&
		canEditForCurrentAssignment.value,
);
const canEditGeneral = computed(() => canEnterGeneralEdit.value && isGeneralEditMode.value);
const isDraftOrNew = computed(() => ["draft", "new"].includes(normalizedWorkOrderStatus.value));
const isPendingApproval = computed(() =>
	["pendingapproval", "pending"].includes(normalizedWorkOrderStatus.value),
);
const isRejected = computed(() => normalizedWorkOrderStatus.value === "rejected");

function normalizeWorkOrderStatusForUi(w: any) {
	if (w?.isDraft) return "Draft";
	const status = String(w?.orderStatus || w?.status || "InProgress").toLowerCase();
	if (status === "new") return "New";
	if (status === "pending") return "PendingApproval";
	if (status === "progress") return "InProgress";
	if (status === "done") return "Done";
	if (status === "completed") return "Completed";
	if (status === "claimed") return "Claimed";
	if (status === "closed") return "Closed";
	if (status === "cancelled") return "Cancelled";
	if (status === "rejected") return "Rejected";
	return w?.status || w?.orderStatus || "InProgress";
}

function updateStepFromStatus(statusStr: string) {
	if (!statusStr) return;
	const s = statusStr.toLowerCase();
	if (s === "draft") {
		currentStepIndex.value = 0;
		breadcrumbStatus.value = "Draft";
	} else if (s === "new") {
		currentStepIndex.value = 0;
		breadcrumbStatus.value = "New Request";
	} else if (s === "pendingapproval") {
		currentStepIndex.value = 1;
		breadcrumbStatus.value = "Pending Approval";
	} else if (s === "rejected") {
		currentStepIndex.value = 1;
		breadcrumbStatus.value = "Rejected";
	} else if (s === "inprogress") {
		currentStepIndex.value = 2;
		breadcrumbStatus.value = "In Progress";
	} else if (s === "done") {
		currentStepIndex.value = 3;
		breadcrumbStatus.value = "Done";
	} else if (s === "completed") {
		currentStepIndex.value = 4;
		breadcrumbStatus.value = "Completed";
	} else if (s === "claimed") {
		currentStepIndex.value = 5;
		breadcrumbStatus.value = "Claimed";
	} else if (s === "closed") {
		currentStepIndex.value = 6;
		breadcrumbStatus.value = "Closed";
	}
}

function getStatusChipType(status: string) {
	if (!status) return "default";
	switch (status) {
		case "Draft":
		case "draft":
			return "warning";
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

interface ImageRecord {
	id: number;
	guid?: string;
	category: string;
	url: string;
	name: string;
}
interface LineItem {
	id: number;
	code: string;
	name: string;
	qty: number;
	unitPrice: number;
	subtotal: number;
}
interface QuotationRecord {
	id: number;
	guid?: string;
	refNo: string;
	date: string;
	amount: number;
	name: string;
}
interface InvoiceRecord {
	id: number;
	guid?: string;
	refNo: string;
	date: string;
	amount: number;
	name: string;
}
interface PaymentRecord {
	id: number;
	guid?: string;
	date: string;
	amount: number;
	reference: string;
	fileName: string;
}

const workOrder = ref<any>({
	woNumber: woNumber,
	title: "Loading...",
	status: "",
	workType: "Piping",
	workTypeItem: "New Assembly",
	salesAgent: "",
	salesAgentDisplay: "",
	projectPersonInCharge: "",
	projectPersonInChargeDisplay: "",
	startDate: "",
	estimatedEndDate: "",
	description: "",
	location: "",
	siteCode: "",
	rawSiteCode: "",
	siteName: "",
	jobPriority: "Medium",
	leaderCode: "",
	createdByCode: "",
	leaderDisplay: "",
	leaderIICode: "",
	leaderIIDisplay: "",
	technicianCodes: [] as string[],
	technicians: [] as any[],
	leadEngineer: "",
	leadEngineerDisplay: "",
	assistantEngineers: [] as string[],
	customer: { name: "", email: "", phone: "" },
	customerPic: "",
	customerPicPhone: "",
	contractNo: "",
	contractStartDate: "",
	contractEndDate: "",
	equipment: {
		name: "",
		serialNo: "",
		brand: "",
		model: "",
		equipmentType: "",
	},
	technical: {
		flowHead: "",
		brandName: "",
		serialNo: "",
		ratedVoltage: "",
		ratedSpeed: "",
		ratedCurrent: "",
		ratedPower: "",
		phase: "",
		frameSize: "",
	},
	servicesProvided: [] as LineItem[],
	partsReplaced: [] as LineItem[],
	images: [] as ImageRecord[],
	cusRefNo: "",
	remarks: "",
	rejectedReason: "",
});

const loading = ref(false);
const rejectDialogRef = ref<InstanceType<typeof RejectDialog> | null>(null);
const noteDialogRef = ref<InstanceType<typeof NoteDialog> | null>(null);
// @ts-ignore
const repeatDialogRef = ref<InstanceType<typeof RepeatDialog> | null>(null);
// @ts-ignore
const transferDialogRef = ref<InstanceType<typeof TransferDialog> | null>(null);
const extendDialogRef = ref<InstanceType<typeof ExtendDialog> | null>(null);
// @ts-ignore
const confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);
const quotationDialogRef = ref<InstanceType<typeof QuotationDialog> | null>(null);
const invoiceDialogRef = ref<InstanceType<typeof InvoiceDialog> | null>(null);
const paymentDialogRef = ref<InstanceType<typeof PaymentDialog> | null>(null);
// @ts-ignore
const locationMapDialogRef = ref<InstanceType<typeof LocationMapDialog> | null>(null);
// @ts-ignore
const uploadConfirmDialogRef = ref<InstanceType<typeof UploadConfirmDialog> | null>(null);
// @ts-ignore
const filePreviewDialogRef = ref<InstanceType<typeof FilePreviewDialog> | null>(null);

function formatUserDisplay(name?: string | null, code?: string | null) {
	const visibleName = name?.trim();
	const visibleCode = userDisplayCode(code, null, "");
	if (visibleName && visibleCode) {
		if (visibleName.includes(`(${visibleCode})`) || visibleName === visibleCode) {
			return visibleName;
		}
		return `${visibleName} (${visibleCode})`;
	}
	return visibleName || visibleCode || "";
}

async function fetchWorkOrderDetails() {
	if (!woNumber) return;
	loading.value = true;
	try {
		const { data } = await workOrderApi.getWorkOrderByGuid(woNumber);
		const w = data?.data || data;
		if (w && (w.guid || w.code)) {
			workOrder.value = {
				guid: w.guid,
				woNumber: w.docNo || w.code || w.guid.substring(0, 8).toUpperCase(),
				title: w.title || "",
				createdByCode: w.createdBy || w.createdByCode || "",
				status: normalizeWorkOrderStatusForUi(w),
				workType: w.workType || "",
				workTypeItem: w.workTypeItem || "",
				salesAgent: w.salesAgentCode || "",
				salesAgentDisplay: formatUserDisplay(
					w.salesAgentName || w.salesAgentDisplayName || w.salesAgentProfileName,
					w.salesAgentDisplayCode || w.salesAgentCode,
				),
				projectPersonInCharge: w.personInChargeCode || w.projectPicCode || "",
				projectPersonInChargeDisplay: formatUserDisplay(
					w.projectPicName || w.personInChargeName,
					w.projectPicDisplayCode ||
						w.personInChargeDisplayCode ||
						w.personInChargeCode ||
						w.projectPicCode,
				),
				startDate: w.startDate || "",
				estimatedEndDate: w.estimatedEndDate || "",
				description: w.description || "",
				location: w.location || w.locationName || "",
				latitude: w.latitude ?? null,
				longitude: w.longitude ?? null,
				siteCode: w.siteName ? `${w.siteName} (${w.siteCode})` : w.siteCode || "",
				rawSiteCode: w.siteCode || "",
				siteName: w.siteName || "",
				jobPriority: w.jobPriority || "Low",
				leaderCode: w.leaderCode || w.leadEngineerCode || "",
				leaderDisplay: formatUserDisplay(
					w.leaderName || w.leadEngineerName,
					w.leaderDisplayCode ||
						w.leadEngineerDisplayCode ||
						w.leaderCode ||
						w.leadEngineerCode,
				),
				leaderIICode: w.leaderIICode || w.leaderIiCode || "",
				leaderIIDisplay: formatUserDisplay(
					w.leaderIIName,
					w.leaderIIDisplayCode || w.leaderIICode || w.leaderIiCode,
				),
				technicianCodes: w.technicianCodes || w.assistantEngineers || [],
				technicians: (w.technicians || []).map((technician: any) => ({
					...technician,
					code: technician.code,
					display: formatUserDisplay(
						technician.name || technician.displayName,
						technician.displayCode || technician.code,
					),
				})),
				leadEngineer: w.leaderCode || w.leadEngineerCode || "",
				leadEngineerDisplay: formatUserDisplay(
					w.leaderName || w.leadEngineerName,
					w.leaderDisplayCode ||
						w.leadEngineerDisplayCode ||
						w.leaderCode ||
						w.leadEngineerCode,
				),
				assistantEngineers: w.technicianCodes || w.assistantEngineers || [],
				customerPic: w.customerPic || "",
				customerPicPhone: w.customerPicPhone || "",
				contractNo: w.contractNo || "",
				contractStartDate: w.contractStartDate || "",
				contractEndDate: w.contractEndDate || "",
				customer: {
					name: w.customerName || w.customer?.name || "",
					email: w.customerEmail || w.customer?.email || "",
					phone: w.customerPhone || w.customer?.phone || "",
				},
				equipment: w.equipment
					? {
							name: w.equipment.name || "",
							serialNo: w.equipment.serialNo || "",
							brand: w.equipment.brand || "",
							model: w.equipment.model || "",
							equipmentType: w.equipment.equipmentType || "",
						}
					: { name: "", serialNo: "", brand: "", model: "", equipmentType: "" },
				technical: w.technical
					? {
							flowHead: w.technical.flowHead || "",
							brandName: w.technical.brandName || "",
							serialNo: w.technical.serialNo || "",
							ratedVoltage: w.technical.ratedVoltage || "",
							ratedSpeed: w.technical.ratedSpeed || "",
							ratedCurrent: w.technical.ratedCurrent || "",
							ratedPower: w.technical.ratedPower || "",
							phase: w.technical.phase || "",
							frameSize: w.technical.frameSize || "",
						}
					: {
							flowHead: "",
							brandName: "",
							serialNo: "",
							ratedVoltage: "",
							ratedSpeed: "",
							ratedCurrent: "",
							ratedPower: "",
							phase: "",
							frameSize: "",
						},
				servicesProvided: w.servicesProvided || [],
				partsReplaced: w.partsReplaced || [],
				images: w.images || [],
				cusRefNo: w.cusRefNo || "",
				remarks: w.remarks || "",
				rejectedReason: w.rejectedReason || "",
				extendedCount: w.extendedCount || 0,
				originalEstimatedEndDate: w.originalEstimatedEndDate || "",
				requestApprovalDate: w.requestApprovalDate || "",
				approvedDate: w.approvedDate || "",
				doneDate: w.doneDate || "",
				completedDate: w.completedDate || "",
				closedDate: w.closedDate || "",
				createdAt: w.createdAt || "",
			};
		} else {
			snackbar.error("Work Order not found");
			router.push("/work-order");
		}
	} catch (e) {
		console.error("Failed to fetch work order details:", e);
		snackbar.error("Error loading work order details");
		router.push("/work-order");
	} finally {
		if (workOrder.value?.status) {
			updateStepFromStatus(workOrder.value.status);
		}
		loading.value = false;
	}
}

const contractStatus = computed(() => {
	if (!workOrder.value?.contractEndDate) return null;
	const now = new Date();
	const end = new Date(workOrder.value.contractEndDate);
	if (end < now) return "Expired";
	const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	if (end <= thirtyDays) return "ExpiringSoon";
	return "Active";
});

const users = ref<any[]>([]);
const workTypes = ref<any[]>([]);

const allTabs = [
	{ id: "general", label: "General" },
	{ id: "partInfo", label: "Part Info" },
	{ id: "supplierInvoices", label: "Supplier Invoices" },
	{ id: "images", label: "Images" },
	{ id: "notes", label: "Work Notes" },
	{ id: "finance", label: "Finance" },
	{ id: "verification", label: "Verification" },
	{ id: "payment", label: "Payment" },
	{ id: "report", label: "Report" },
];
const visibleTabs = computed(() => {
	const status = normalizedWorkOrderStatus.value;

	const hasPermission = (tabId: string) => {
		switch (tabId) {
			case "partInfo":
				return authStore.can("read", "PartInfo");
			case "supplierInvoices":
				return authStore.can("read", "SupplierInvoice");
			case "notes":
				return authStore.can("read", "WorkOrderNote");
			case "finance":
				return authStore.can("read", "WorkOrderQuotation");
			case "payment":
				return (
					authStore.can("read", "Payment") || authStore.can("read", "WorkOrderInvoice")
				);
			case "report":
				return authStore.can("read", "Report");
			default:
				return true;
		}
	};

	let baseTabs = [];
	const throughFinance = allTabs.slice(0, 6);
	if (["inprogress", "progress"].includes(status)) {
		baseTabs = throughFinance;
	} else if (status === "done") {
		baseTabs = [...throughFinance, allTabs[6], allTabs[8]];
	} else if (status === "completed") {
		baseTabs = [...throughFinance, allTabs[6], allTabs[7], allTabs[8]];
	} else if (["claimed", "closed"].includes(status)) {
		baseTabs = allTabs;
	} else {
		baseTabs = [allTabs[0]];
	}

	return baseTabs.filter((tab) => hasPermission(tab.id));
});

const activeTab = ref<string>("general");

const currentUserRole = ref<"Manager" | "Technician">("Manager");

// Extend EndDate Dialog
// @ts-ignore
const isExtendDialogOpen = ref(false);
// @ts-ignore
const extendForm = ref({ newEstimatedEndDate: "", extensionReason: "" });
// @ts-ignore
const isExtending = ref(false);

// @ts-ignore
function openExtendDialog() { extendDialogRef.value?.open(); }

/*
async function submitExtend() {
	if (!extendForm.value.newEstimatedEndDate) return;
	isExtending.value = true;
	try {
		const { error } = await workOrderApi.extendEndDate(woNumber, {
			newEstimatedEndDate: new Date(extendForm.value.newEstimatedEndDate).toISOString(),
			extensionReason: extendForm.value.extensionReason || undefined,
		});
		if (error) {
			snackbar.error(`Failed to extend: ${error.error?.message || "Unknown error"}`);
		} else {
			snackbar.success("Estimated end date extended successfully!");
			isExtendDialogOpen.value = false;
			extendForm.value = { newEstimatedEndDate: "", extensionReason: "" };
			await fetchWorkOrderDetails();
			await fetchActivityLogs();
		}
	} catch (e) {
		console.error(e);
	} finally {
		isExtending.value = false;
	}
}
*/

function formatActivityType(value?: string | null) {
	if (!value) return "";
	return value
		.replace(/[_-]+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Repeat Work Order Dialog
// @ts-ignore
const isRepeatDialogOpen = ref(false);
// @ts-ignore
const repeatForm = ref({ title: "", description: "", startDate: "", estimatedEndDate: "" });
// @ts-ignore
const isRepeating = ref(false);

/*
async function submitRepeat() {
	isRepeating.value = true;
	try {
		const { error } = await workOrderApi.repeat(woNumber, {
			title: repeatForm.value.title || undefined,
			description: repeatForm.value.description || undefined,
			startDate: repeatForm.value.startDate
				? new Date(repeatForm.value.startDate).toISOString()
				: undefined,
			estimatedEndDate: repeatForm.value.estimatedEndDate
				? new Date(repeatForm.value.estimatedEndDate).toISOString()
				: undefined,
		});
		if (error) {
			snackbar.error(`Failed to repeat: ${error.error?.message || "Unknown error"}`);
		} else {
			snackbar.success("Work order repeated successfully! A new sub-order has been created.");
			isRepeatDialogOpen.value = false;
		}
	} catch (e) {
		console.error(e);
	} finally {
		isRepeating.value = false;
	}
}
*/

// Transfer Work Order Dialog
// @ts-ignore
const isTransferDialogOpen = ref(false);
// @ts-ignore
const transferForm = ref({ title: "", description: "", startDate: "", estimatedEndDate: "" });
// @ts-ignore
const isTransferring = ref(false);

/*
async function submitTransfer() {
	isTransferring.value = true;
	try {
		const { error } = await workOrderApi.transfer(woNumber, {
			title: transferForm.value.title || undefined,
			description: transferForm.value.description || undefined,
			startDate: transferForm.value.startDate
				? new Date(transferForm.value.startDate).toISOString()
				: undefined,
			estimatedEndDate: transferForm.value.estimatedEndDate
				? new Date(transferForm.value.estimatedEndDate).toISOString()
				: undefined,
		});
		if (error) {
			snackbar.error(`Failed to transfer: ${error.error?.message || "Unknown error"}`);
		} else {
			snackbar.success(
				"Work order transferred successfully! A new work order has been created.",
			);
			isTransferDialogOpen.value = false;
		}
	} catch (e) {
		console.error(e);
	} finally {
		isTransferring.value = false;
	}
}
*/

// Part Info Photos (12 max)
const partInfoPhotos = ref<ImageRecord[]>([]);

const isManager = computed(() => currentUserRole.value === "Manager");

const showEquipmentForm = computed(() => {
	return !!workOrder.value.equipment?.name;
});
const isMechanical = computed(() => {
	const wt = workOrder.value.workType?.toLowerCase() || "";
	return wt.includes("mechanical") || wt.includes("maintenance");
});
const siteInstructionsFiles = ref<any[]>([]);

const phases = [
	{ id: "Single Phase", name: "Single Phase" },
	{ id: "Two Phase", name: "Two Phase" },
	{ id: "Three Phase", name: "Three Phase" },
];

// Supplier Invoice Photos (12 max)
const supplierInvoicePhotos = ref<ImageRecord[]>([]);

const isMapDialogOpen = ref(false);

async function markAsDone() {
	try {
		const { error } = await workOrderApi.complete(woNumber);
		if (error) {
			snackbar.error(`Failed to mark as done: ${error.error.message}`);
		} else {
			snackbar.success("Work order marked as done!");
			fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
	}
}

function requestApprovalForNewWorkOrder() {
	if (siteInstructionsFiles.value.length < 2) {
		snackbar.error(
			"At least 2 site instruction files are required before requesting approval.",
		);
		return;
	}

	triggerConfirmation({
		title: "Request For Approval",
		message: "Submit this work order for approval?",
		confirmText: "Request For Approval",
		action: async () => {
			loading.value = true;
			try {
				const { error } = await workOrderApi.submitApproval(woNumber, {
					estimatedEndDate: workOrder.value.estimatedEndDate,
				} as any);
				if (error) {
					snackbar.error(
						`Failed to request approval: ${error.error?.message || error.message}`,
					);
					return;
				}
				snackbar.success("Work order submitted for approval!");
				await fetchWorkOrderDetails();
				await fetchActivityLogs();
			} catch (e) {
				console.error(e);
				snackbar.error("Failed to request approval");
			} finally {
				loading.value = false;
			}
		},
	});
}

async function reopenWorkOrder() {
	try {
		const { error } = await workOrderApi.reopen(woNumber);
		if (error) {
			snackbar.error(`Failed to reopen work order: ${error.error?.message || error.message}`);
		} else {
			snackbar.success("Work order reopened successfully!");
			await fetchWorkOrderDetails();
			await fetchActivityLogs();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to reopen work order");
	}
}

const tabsWrapperRef = ref<HTMLElement | null>(null);
const showLeftArrow = ref(false);
const showRightArrow = ref(false);

function updateTabArrows() {
	if (!tabsWrapperRef.value) return;
	const { scrollLeft, scrollWidth, clientWidth } = tabsWrapperRef.value;
	showLeftArrow.value = scrollLeft > 0;
	showRightArrow.value = Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1;
}

function scrollTabs(direction: "left" | "right") {
	if (tabsWrapperRef.value) {
		const amount = 200;
		tabsWrapperRef.value.scrollBy({
			left: direction === "left" ? -amount : amount,
			behavior: "smooth",
		});
	}
}

// Quotation State
const quotations = ref<QuotationRecord[]>([]);
// const isAddQuotationDialogOpen = ref(false);
// @ts-ignore
const isEditQuotationDialogOpen = ref(false);
// @ts-ignore
const isSavingQuotation = ref(false);
// const isUploadingQuotation = ref(false);
// const editingQuotationId = ref<number | null>(null);
// @ts-ignore
const quotationForm = ref({ refNo: "", date: "", amount: 0, name: "" });

// @ts-ignore
const editingQuotationGuid = ref("");

// @ts-ignore
function openEditQuotation(guid: string) { quotationDialogRef.value?.open(guid); }

/*
async function saveEditQuotation() {
	if (!editingQuotationGuid.value || !quotationForm.value.name.trim()) return;
	isSavingQuotation.value = true;
	try {
		const docDate = quotationForm.value.date
			? new Date(quotationForm.value.date).toISOString()
			: null;
		const { error } = await workOrderApi.updateFile(editingQuotationGuid.value, {
			fileName: quotationForm.value.name.trim(),
			docNo: quotationForm.value.refNo.trim() || null,
			docAmount: quotationForm.value.amount ?? null,
			docDate,
		});
		if (error) {
			snackbar.error(
				`Failed to update quotation: ${error.error?.message || "Unknown error"}`,
			);
		} else {
			snackbar.success("Quotation details updated successfully!");
			isEditQuotationDialogOpen.value = false;
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to update quotation");
	} finally {
		isSavingQuotation.value = false;
	}
}
*/

const totalQuotationAmount = computed(() => quotations.value.reduce((sum, q) => sum + q.amount, 0));

// Payment & Invoice State
const invoices = ref<InvoiceRecord[]>([]);
const payments = ref<PaymentRecord[]>([]);

// const isAddInvoiceDialogOpen = ref(false);
// @ts-ignore
const isEditInvoiceDialogOpen = ref(false);
// @ts-ignore
const isSavingInvoice = ref(false);
// @ts-ignore
const isEditPaymentDialogOpen = ref(false);
// @ts-ignore
const isSavingPayment = ref(false);

// @ts-ignore
const invoiceForm = ref({ refNo: "", date: "", amount: 0, name: "" });
// @ts-ignore
const paymentForm = ref({ reference: "", date: "", amount: 0, fileName: "" });

const totalInvoiceIssued = computed(() => invoices.value.reduce((sum, inv) => sum + inv.amount, 0));
const totalPaymentReceived = computed(() =>
	payments.value.reduce((sum, pay) => sum + pay.amount, 0),
);
const balanceRemaining = computed(() => totalInvoiceIssued.value - totalPaymentReceived.value);
const isFullyPaid = computed(() => invoices.value.length > 0 && balanceRemaining.value <= 0);
const canMarkAsClosed = computed(() => {
	const invoiceCents = Math.round(totalInvoiceIssued.value * 100);
	const paymentCents = Math.round(totalPaymentReceived.value * 100);
	return paymentCents >= invoiceCents;
});

// @ts-ignore
const editingInvoiceGuid = ref("");

// @ts-ignore
function openEditInvoice(guid: string) { invoiceDialogRef.value?.open(guid); }

/*
async function saveEditInvoice() {
	if (!editingInvoiceGuid.value || !invoiceForm.value.name.trim()) return;
	isSavingInvoice.value = true;
	try {
		const docDate = invoiceForm.value.date
			? new Date(invoiceForm.value.date).toISOString()
			: null;
		const { error } = await workOrderApi.updateFile(editingInvoiceGuid.value, {
			fileName: invoiceForm.value.name.trim(),
			docNo: invoiceForm.value.refNo.trim() || null,
			docAmount: invoiceForm.value.amount ?? null,
			docDate,
		});
		if (error) {
			snackbar.error(`Failed to update invoice: ${error.error?.message || "Unknown error"}`);
		} else {
			snackbar.success("Invoice details updated successfully!");
			isEditInvoiceDialogOpen.value = false;
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to update invoice");
	} finally {
		isSavingInvoice.value = false;
	}
}
*/

// @ts-ignore
const editingPaymentGuid = ref("");

// @ts-ignore
function openEditPayment(guid: string) { paymentDialogRef.value?.open(guid); }

/*
async function saveEditPayment() {
	if (!editingPaymentGuid.value || !paymentForm.value.fileName.trim()) return;
	isSavingPayment.value = true;
	try {
		const docDate = paymentForm.value.date
			? new Date(paymentForm.value.date).toISOString()
			: null;
		const { error } = await workOrderApi.updateFile(editingPaymentGuid.value, {
			fileName: paymentForm.value.fileName.trim(),
			docNo: paymentForm.value.reference.trim() || null,
			docAmount: paymentForm.value.amount ?? null,
			docDate,
		});
		if (error) {
			snackbar.error(`Failed to update payment: ${error.error?.message || "Unknown error"}`);
		} else {
			snackbar.success("Payment details updated successfully!");
			isEditPaymentDialogOpen.value = false;
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to update payment");
	} finally {
		isSavingPayment.value = false;
	}
}
*/

async function markAsClaimed() {
	if (totalInvoiceIssued.value <= 0) return;
	try {
		const { error } = await workOrderApi.claim(woNumber, {
			invoiceAmount: totalInvoiceIssued.value,
		});
		if (error) {
			snackbar.error(`Failed to mark as claimed: ${error.error.message}`);
		} else {
			snackbar.success("Work order marked as claimed!");
			fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
	}
}

function markAsClosed() {
	if (!canMarkAsClosed.value) return;
	triggerConfirmation({
		title: "Closed Work Order",
		message: "Invoice and payment totals match. Mark this work order as complete?",
		confirmText: "Mark as Closed",
		action: async () => {
			loading.value = true;
			try {
				const { error } = await workOrderApi.close(woNumber);
				if (error) {
					snackbar.error(
						`Failed to close work order: ${error.error?.message || error.message}`,
					);
					return;
				}
				snackbar.success("Work order closed successfully!");
				await fetchWorkOrderDetails();
				await fetchActivityLogs();
			} catch (e) {
				console.error(e);
				snackbar.error("Failed to close work order");
			} finally {
				loading.value = false;
			}
		},
	});
}

function printReport() {
	const report = document.querySelector(".report-document");

	if (!report) return;

	const win = window.open("", "_blank");

	win!.document.write(`
<html>
<head>
    <title>Report</title>
    ${document.head.innerHTML}
</head>
<body>
${report.outerHTML}
</body>
</html>
    `);

	win!.document.close();
	win!.focus();
	win!.print();
	win!.close();
}

// New states and variables
const activityLogs = ref<any[]>([]);
const workNotes = ref<any[]>([]);
const images = ref<any[]>([]);

// Date format helper
function formatDateString(dateStr: string | Date | null) {
	if (!dateStr) return "";
	return dateFormatStore.formatDate(dateStr);
}

// computedSteps mapping based on real dates
const computedSteps = computed(() => {
	const w = workOrder.value;
	return [
		{ label: "New Request", date: w?.createdAt ? formatDateString(w.createdAt) : "" },
		{
			label: isRejected.value ? "Rejected" : "Pending Approval",
			date: w?.requestApprovalDate ? formatDateString(w.requestApprovalDate) : "",
		},
		{ label: "In Progress", date: w?.approvedDate ? formatDateString(w.approvedDate) : "" },
		{ label: "Verifying", date: w?.doneDate ? formatDateString(w.doneDate) : "" },
		{ label: "Completed", date: w?.completedDate ? formatDateString(w.completedDate) : "" },
		{
			label: "Payment",
			date: activityLogs.value.find((log) => log.newStatus === "Claimed")?.createdAt
				? formatDateString(
						activityLogs.value.find((log) => log.newStatus === "Claimed")?.createdAt,
					)
				: "",
		},
		{ label: "Closed", date: w?.closedDate ? formatDateString(w.closedDate) : "" },
	];
});

// fetchActivityLogs
async function fetchActivityLogs() {
	if (!woNumber) return;
	try {
		const { data } = await workOrderApi.getActivities(woNumber);
		if (data) {
			const logsList = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
			activityLogs.value = logsList;
		}
	} catch (e) {
		console.error("Failed to fetch activity logs:", e);
	}
}

// fetchWorkOrderFiles
async function fetchWorkOrderFiles() {
	if (!woNumber) return;
	try {
		const { data } = await workOrderApi.getFiles(woNumber);
		if (data) {
			const items = Array.isArray(data)
				? data
				: Array.isArray(data.data)
					? data.data
					: Array.isArray(data.items)
						? data.items
						: [];
			// Revoke previous blob URLs to avoid memory leaks
			siteInstructionsFiles.value.forEach((f: any) => {
				if (f.url && f.url.startsWith("blob:")) {
					URL.revokeObjectURL(f.url);
				}
			});
			partInfoPhotos.value.forEach((f: any) => {
				if (f.url && f.url.startsWith("blob:")) {
					URL.revokeObjectURL(f.url);
				}
			});
			supplierInvoicePhotos.value.forEach((f: any) => {
				if (f.url && f.url.startsWith("blob:")) {
					URL.revokeObjectURL(f.url);
				}
			});
			images.value.forEach((f: any) => {
				if (f.url && f.url.startsWith("blob:")) {
					URL.revokeObjectURL(f.url);
				}
			});

			const siteInstructionsList = items.filter(
				(f: any) => f.category === "SiteInstructions" || f.category === "site_instructions",
			);
			siteInstructionsFiles.value = await Promise.all(
				siteInstructionsList.map(async (f: any) => {
					const isImage =
						(f.mimeType || "").startsWith("image/") ||
						/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(f.fileName || "");
					const isPdf =
						f.mimeType === "application/pdf" || /\.(pdf)$/i.test(f.fileName || "");
					const rawUrl = getFileUrl(f.storageUrl, isImage || isPdf);
					const url = await loadFileBlobUrl(rawUrl, isImage || isPdf);
					return {
						id: f.id,
						guid: f.guid,
						category: f.category,
						url,
						name: f.fileName,
						type: f.mimeType || "",
					};
				}),
			);

			const partInfoList = items.filter(
				(f: any) => f.category === "PartInfo" || f.category === "part_info",
			);
			partInfoPhotos.value = await Promise.all(
				partInfoList.map(async (f: any) => {
					const rawUrl = getFileUrl(f.storageUrl, true);
					const url = await loadFileBlobUrl(rawUrl, true);
					return {
						id: f.id,
						guid: f.guid,
						category: f.category,
						url,
						name: f.fileName,
					};
				}),
			);

			const supplierInvoiceList = items.filter(
				(f: any) => f.category === "SupplierInvoice" || f.category === "supplier_invoices",
			);
			supplierInvoicePhotos.value = await Promise.all(
				supplierInvoiceList.map(async (f: any) => {
					const rawUrl = getFileUrl(f.storageUrl, true);
					const url = await loadFileBlobUrl(rawUrl, true);
					return {
						id: f.id,
						guid: f.guid,
						category: f.category,
						url,
						name: f.fileName,
					};
				}),
			);

			const imagesList = items.filter((f: any) => f.category === "Image");
			images.value = await Promise.all(
				imagesList.map(async (f: any) => {
					const rawUrl = getFileUrl(f.storageUrl, true);
					const url = await loadFileBlobUrl(rawUrl, true);
					return {
						id: f.id,
						guid: f.guid,
						category: f.subcategory || "Before",
						url,
						name: f.fileName,
					};
				}),
			);

			quotations.value = items
				.filter((f: any) => f.category === "Quotation")
				.map((f: any) => ({
					id: f.id,
					guid: f.guid,
					refNo: f.docNo || "",
					date: f.docDate ? formatDateString(f.docDate) : "",
					amount: f.docAmount || 0,
					name: f.fileName,
				}));

			invoices.value = items
				.filter((f: any) => f.category === "Invoice")
				.map((f: any) => ({
					id: f.id,
					guid: f.guid,
					refNo: f.docNo || "",
					date: f.docDate ? formatDateString(f.docDate) : "",
					amount: f.docAmount || 0,
					name: f.fileName,
				}));

			payments.value = items
				.filter((f: any) => f.category === "Payment")
				.map((f: any) => ({
					id: f.id,
					guid: f.guid,
					date: f.docDate ? formatDateString(f.docDate) : "",
					amount: f.docAmount || 0,
					reference: f.docNo || "",
					fileName: f.fileName,
				}));
		}
	} catch (e) {
		console.error("Failed to fetch files:", e);
	}
}

// fetchWorkNotes
async function fetchWorkNotes() {
	if (!woNumber) return;
	try {
		const { data } = await workOrderApi.getNotes(woNumber);
		const notes = data?.data || data;
		if (notes && Array.isArray(notes)) {
			workNotes.value = notes;
		}
	} catch (e) {
		console.error("Failed to fetch work notes:", e);
	}
}

// saveGeneralFormChanges
async function saveGeneralFormChanges() {
	if (!workOrder.value) return;
	loading.value = true;
	try {
		const estimatedEndDate = workOrder.value.estimatedEndDate
			? new Date(workOrder.value.estimatedEndDate).toISOString()
			: undefined;
		const payload = {
			personInChargeCode: workOrder.value.projectPersonInCharge,
			leaderCode: workOrder.value.leaderCode,
			leaderIICode: workOrder.value.leaderIICode,
			technicianCodes: workOrder.value.technicianCodes,
			jobPriority: workOrder.value.jobPriority,
			estimatedEndDate,
			siteCode: workOrder.value.rawSiteCode || workOrder.value.siteCode,
			location: workOrder.value.location,
			latitude: workOrder.value.latitude,
			longitude: workOrder.value.longitude,
			description: workOrder.value.description,
		};
		let res;
		switch (normalizedWorkOrderStatus.value) {
			case "draft":
				res = await workOrderApi.updateDraft(woNumber, payload);
				break;
			case "new":
				res = await workOrderApi.updateNew(woNumber, payload);
				break;
			case "pending":
			case "pendingapproval":
				res = await workOrderApi.updatePending(woNumber, payload);
				break;
			default:
				res = await workOrderApi.updateProgress(woNumber, payload);
		}
		const { error } = res;
		if (error) {
			snackbar.error(`Failed to save changes: ${error.error.message}`);
		} else {
			snackbar.success("Changes saved successfully!");
			isGeneralEditMode.value = false;
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

// approveDoneWorkOrder
function approveDoneWorkOrder() {
	triggerConfirmation({
		title: "Approve Work Order",
		message:
			"Are you sure you want to approve this work order? This will transition it to Completed state.",
		confirmText: "Approve",
		action: async () => {
			loading.value = true;
			try {
				const { error } = await workOrderApi.complete(woNumber);
				if (error) {
					snackbar.error(`Failed to approve work order: ${error.error.message}`);
				} else {
					snackbar.success("Work order approved successfully!");
					await fetchWorkOrderDetails();
					await fetchActivityLogs();
				}
			} catch (e) {
				console.error(e);
			} finally {
				loading.value = false;
			}
		},
	});
}

function approvePendingWorkOrder() {
	triggerConfirmation({
		title: "Approve Work Order",
		message: "Are you sure you want to approve this work order?",
		confirmText: "Approve",
		action: async () => {
			loading.value = true;
			try {
				const { error } = await workOrderApi.approve(woNumber);
				if (error) {
					snackbar.error(
						`Failed to approve work order: ${error.error?.message || error.message}`,
					);
					return;
				}
				snackbar.success("Work order approved successfully!");
				await fetchWorkOrderDetails();
				await fetchActivityLogs();
			} catch (e) {
				console.error(e);
			} finally {
				loading.value = false;
			}
		},
	});
}

// Reject dialog triggers & handlers
// @ts-ignore
const isRejectDialogOpen = ref(false);
// @ts-ignore
const rejectForm = ref({
	rejectedReason: "",
});

// @ts-ignore
function openRejectDoneDialog() { rejectDialogRef.value?.open(); }

/*
function closeRejectDialog() {
	isRejectDialogOpen.value = false;
}
*/

/*
async function submitReject() {
	if (!rejectForm.value.rejectedReason) return;
	loading.value = true;
	try {
		const { error } = await workOrderApi.reject(woNumber, {
			rejectedReason: rejectForm.value.rejectedReason,
		});
		if (error) {
			snackbar.error(`Failed to reject work order: ${error.error.message}`);
		} else {
			snackbar.success(
				isPendingApproval.value
					? "Work order rejected successfully!"
					: "Work order rejected and sent back to In Progress!",
			);
			isRejectDialogOpen.value = false;
			await fetchWorkOrderDetails();
			await fetchActivityLogs();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}
*/

// Notes CRUD triggers & handlers
// @ts-ignore
const isNoteDialogOpen = ref(false);
// @ts-ignore
const isEditingNote = ref(false);
// @ts-ignore
const editingNoteGuid = ref("");
// @ts-ignore
const noteForm = ref({
	content: "",
	viewLevel: "customer",
});

// @ts-ignore
function openAddNoteDialog() { noteDialogRef.value?.openAdd(); }

// @ts-ignore
function openEditNoteDialog(note: any) { noteDialogRef.value?.openEdit(note); }

/*
function closeNoteDialog() {
	isNoteDialogOpen.value = false;
}
*/

/*
async function submitWorkNote() {
	if (!noteForm.value.content) return;
	loading.value = true;
	try {
		let error;
		if (isEditingNote.value) {
			const res = await workOrderApi.updateNote(editingNoteGuid.value, {
				content: noteForm.value.content,
				viewLevel: noteForm.value.viewLevel,
			});
			error = res.error;
		} else {
			const res = await workOrderApi.createNote(woNumber, {
				content: noteForm.value.content,
				viewLevel: noteForm.value.viewLevel,
			});
			error = res.error;
		}

		if (error) {
			snackbar.error(`Failed to save note: ${error.error.message}`);
		} else {
			snackbar.success("Note saved successfully!");
			isNoteDialogOpen.value = false;
			await fetchWorkNotes();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}
*/

function deleteWorkNote(noteGuid: string) {
	triggerConfirmation({
		title: "Delete Work Note",
		message: "Are you sure you want to delete this note?",
		variant: "danger",
		confirmText: "Delete",
		action: async () => {
			loading.value = true;
			try {
				const { error } = await workOrderApi.deleteNote(noteGuid);
				if (error) {
					snackbar.error(`Failed to delete note: ${error.error.message}`);
				} else {
					snackbar.success("Note deleted successfully!");
					await fetchWorkNotes();
				}
			} catch (e) {
				console.error(e);
			} finally {
				loading.value = false;
			}
		},
	});
}

// Generic Confirmation Dialog State
const isConfirmDialogOpen = ref(false);
const confirmTitle = ref("");
const confirmMessage = ref("");
const confirmAction = ref<(() => void) | null>(null);
const confirmVariant = ref<"primary" | "secondary" | "outlined" | "danger">("primary");
const confirmButtonText = ref("");

function triggerConfirmation(options: {
	title: string;
	message: string;
	action: () => void;
	variant?: "primary" | "secondary" | "outlined" | "danger";
	confirmText?: string;
}) {
	confirmTitle.value = options.title;
	confirmMessage.value = options.message;
	confirmAction.value = options.action;
	confirmVariant.value = options.variant || "primary";
	confirmButtonText.value = options.confirmText || "Confirm";
	isConfirmDialogOpen.value = true;
}

/*
function handleConfirmDialog() {
	if (confirmAction.value) {
		confirmAction.value();
	}
	isConfirmDialogOpen.value = false;
	confirmAction.value = null;
}
*/

// File Upload & Deletion handlers
// @ts-ignore
function isPdfFile(fileName: string) {
	return /\.(pdf)$/i.test(fileName || "");
}

// File Upload Dialog State
const isUploadConfirmOpen = ref(false);
const uploadTargetFile = ref<File | null>(null);
const uploadTargetCategory = ref("");
const uploadTargetSubcategory = ref("");
const uploadTargetEvent = ref<Event | null>(null);
const uploadCustomFileName = ref("");
const uploadPreviewUrl = ref("");

// Image Preview & Rename Dialog State
const isPreviewDialogOpen = ref(false);
const previewTargetFile = ref<any | null>(null);
const previewCustomFileName = ref("");
const isLoadingFilePreview = ref(false);
const filePreviewError = ref("");
const previewObjectUrl = ref("");

/*
function cancelFileUpload() {
	isUploadConfirmOpen.value = false;
	if (uploadPreviewUrl.value) {
		URL.revokeObjectURL(uploadPreviewUrl.value);
		uploadPreviewUrl.value = "";
	}
	if (uploadTargetEvent.value) {
		const target = uploadTargetEvent.value.target as HTMLInputElement;
		target.value = ""; // Reset file input
	}
	uploadTargetFile.value = null;
	uploadTargetEvent.value = null;
}
*/

// @ts-ignore
async function confirmFileUpload() {
	if (!uploadTargetFile.value) return;
	const file = uploadTargetFile.value;
	const category = uploadTargetCategory.value;
	const subcategory = uploadTargetSubcategory.value;
	const event = uploadTargetEvent.value;

	// Construct the final filename with extension
	const lastDot = file.name.lastIndexOf(".");
	const extension = lastDot !== -1 ? file.name.substring(lastDot) : "";
	const finalName = uploadCustomFileName.value.trim() + extension;

	// Create renamed File object
	const renamedFile = new File([file], finalName, { type: file.type });

	loading.value = true;
	isUploadConfirmOpen.value = false;
	try {
		const fd = new FormData();
		fd.append("file", renamedFile);
		fd.append("category", category);
		if (subcategory) {
			fd.append("subcategory", subcategory);
		}

		const response = await workOrderApi.uploadFile(workOrder.value.guid, fd);
		const resData = await response.json().catch(() => null);
		if (!response.ok) {
			const message =
				resData?.error?.message || resData?.message || `Upload failed (${response.status})`;
			console.error(
				`File upload failed: ${JSON.stringify({ status: response.status, message, response: resData })}`,
			);
			snackbar.error(message);
			return;
		}

		if (resData?.error) {
			const errMsg = resData.error.message || "";
			if (errMsg.toLowerCase().includes("internal server error")) {
				snackbar.error("Upload failed: Invalid File Format");
			} else {
				snackbar.error(`Upload failed: ${errMsg}`);
			}
		} else {
			snackbar.success("File uploaded successfully!");
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error("Upload error:", e);
		snackbar.error("Upload failed: Invalid File Format");
	} finally {
		loading.value = false;
		if (event) {
			const target = event.target as HTMLInputElement;
			target.value = ""; // Reset file input
		}
		if (uploadPreviewUrl.value) {
			URL.revokeObjectURL(uploadPreviewUrl.value);
			uploadPreviewUrl.value = "";
		}
		uploadTargetFile.value = null;
		uploadTargetEvent.value = null;
	}
}

async function openFilePreview(file: any) {
	const fileName = file.name || file.fileName || "File";
	previewTargetFile.value = { ...file, name: fileName, url: file.url || "" };
	const lastDot = fileName.lastIndexOf(".");
	const baseName = lastDot !== -1 ? fileName.substring(0, lastDot) : fileName;
	previewCustomFileName.value = baseName;
	filePreviewError.value = "";
	isPreviewDialogOpen.value = false;
	let targetUrl = file.url || "";
	if (file.url || !file.guid) return;

	isLoadingFilePreview.value = true;
	try {
		const response = await http.get(`/work-order/files/${file.guid}/preview`, {
			responseType: "blob",
		});
		// previewObjectUrl.value = URL.createObjectURL(response.data);
		// if (previewTargetFile.value?.guid === file.guid) {
		// 	previewTargetFile.value = { ...file, url: previewObjectUrl.value };
		// }
		const fileType = response.data.type;

		// const fileType = response.data.type || getMimeType(fileName);
		const blob = new Blob([response.data], { type: fileType });

		targetUrl = URL.createObjectURL(blob);
		previewObjectUrl.value = targetUrl;

		if (targetUrl) {
			window.open(targetUrl, "_blank");
		}
	} catch (error) {
		console.error("Failed to load file preview:", error);
		filePreviewError.value = "Unable to load this file. Please try again.";
	} finally {
		isLoadingFilePreview.value = false;
	}
}

watch(isPreviewDialogOpen, (isOpen) => {
	if (isOpen) return;
	if (previewObjectUrl.value) {
		URL.revokeObjectURL(previewObjectUrl.value);
		previewObjectUrl.value = "";
	}
	previewTargetFile.value = null;
	filePreviewError.value = "";
});

// @ts-ignore
async function savePreviewFileRename() {
	if (!previewTargetFile.value || !previewCustomFileName.value.trim()) return;
	const file = previewTargetFile.value;

	const lastDot = file.name.lastIndexOf(".");
	const extension = lastDot !== -1 ? file.name.substring(lastDot) : "";
	const finalName = previewCustomFileName.value.trim() + extension;

	loading.value = true;
	try {
		await workOrderApi.updateFile(file.guid, { fileName: finalName });
		snackbar.success("File renamed successfully!");
		await fetchWorkOrderFiles();
		await fetchWorkOrderDetails();
	} catch (e) {
		console.error("Failed to rename file:", e);
		snackbar.error("Failed to rename file");
	} finally {
		loading.value = false;
		isPreviewDialogOpen.value = false;
		previewTargetFile.value = null;
	}
}

async function handleFileUpload(event: Event, category: string, subcategory?: string) {
	const target = event.target as HTMLInputElement;
	if (!target.files || target.files.length === 0) return;
	const file = target.files[0];

	// Validate file type
	const imageExtensions = /\.(jpg|jpeg|png|gif|webp|heic)$/i;
	const pdfExtensions = /\.(pdf)$/i;
	const fileName = file.name;

	if (category === "PartInfo" || category === "Image") {
		if (!imageExtensions.test(fileName) && !file.type.startsWith("image/")) {
			snackbar.error("Invalid File Type. Only image files are allowed.");
			target.value = "";
			return;
		}
	} else if (
		category === "SupplierInvoice" ||
		category === "Quotation" ||
		category === "Invoice" ||
		category === "Payment"
	) {
		const isImg = imageExtensions.test(fileName) || file.type.startsWith("image/");
		const isPdf = pdfExtensions.test(fileName) || file.type === "application/pdf";
		if (!isImg && !isPdf) {
			snackbar.error("Invalid File Type. Only PDF and image files are allowed.");
			target.value = "";
			return;
		}
	}

	uploadTargetFile.value = file;
	uploadTargetCategory.value = category;
	uploadTargetSubcategory.value = subcategory || "";
	uploadTargetEvent.value = event;

	const lastDot = file.name.lastIndexOf(".");
	const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
	uploadCustomFileName.value = baseName;

	if (file.type.startsWith("image/")) {
		uploadPreviewUrl.value = URL.createObjectURL(file);
	} else {
		uploadPreviewUrl.value = "";
	}

	isUploadConfirmOpen.value = true;
}

function handleDeleteFile(fileGuid: string) {
	triggerConfirmation({
		title: "Delete File",
		message: "Are you sure you want to delete this file?",
		variant: "danger",
		confirmText: "Delete",
		action: async () => {
			loading.value = true;
			try {
				const { error } = await workOrderApi.deleteFile(fileGuid);
				if (error) {
					snackbar.error(`Failed to delete file: ${error.error.message}`);
				} else {
					snackbar.success("File deleted successfully!");
					await fetchWorkOrderFiles();
					await fetchWorkOrderDetails();
				}
			} catch (e) {
				console.error(e);
			} finally {
				loading.value = false;
			}
		},
	});
}

function uploadJobImage(data: { event: Event; category: string }) {
	handleFileUpload(data.event, "Image", data.category);
}

onMounted(async () => {
	nextTick(() => updateTabArrows());
	window.addEventListener("resize", updateTabArrows);
	if (tabsWrapperRef.value) {
		tabsWrapperRef.value.addEventListener("scroll", updateTabArrows);
	}
	await fetchWorkOrderDetails();
	await fetchActivityLogs();
	await fetchWorkOrderFiles();
	await fetchWorkNotes();

	// Fetch dynamic users and work types
	try {
		const userRes = await userApi.getUsers({
			pageIndex: 0,
			pageSize: 100,
			timezone: "Asia/Kuala_Lumpur",
		});
		if (userRes.data && userRes.data.data) {
			users.value = userRes.data.data.map((u: any) => ({
				code: u.code || u.guid,
				displayCode: u.displayCode || u.code || u.guid.substring(0, 8).toUpperCase(),
				name: u.displayName || u.profile?.displayName || u.name || "Unknown",
				role: (u.role || u.userGroup || u.description || "").toLowerCase(),
			}));
		}

		const wtRes = await workTypeApi.getWorkTypes({
			pageIndex: 0,
			pageSize: 100,
			timezone: "Asia/Kuala_Lumpur",
		});
		if (wtRes.data && wtRes.data.data) {
			workTypes.value = wtRes.data.data.map((wt: any) => ({
				code: wt.code,
				name: wt.name,
			}));
		}
	} catch (e) {
		console.error("Failed to load options:", e);
	}
});

function revokeAllFileUrls() {
	siteInstructionsFiles.value.forEach((f: any) => {
		if (f.url && f.url.startsWith("blob:")) {
			URL.revokeObjectURL(f.url);
		}
	});
	partInfoPhotos.value.forEach((f: any) => {
		if (f.url && f.url.startsWith("blob:")) {
			URL.revokeObjectURL(f.url);
		}
	});
	supplierInvoicePhotos.value.forEach((f: any) => {
		if (f.url && f.url.startsWith("blob:")) {
			URL.revokeObjectURL(f.url);
		}
	});
	images.value.forEach((f: any) => {
		if (f.url && f.url.startsWith("blob:")) {
			URL.revokeObjectURL(f.url);
		}
	});
}

onUnmounted(() => {
	window.removeEventListener("resize", updateTabArrows);
	if (tabsWrapperRef.value) {
		tabsWrapperRef.value.removeEventListener("scroll", updateTabArrows);
	}
	revokeAllFileUrls();
});
</script>

<template>
	<div class="wo-detail-page">
		<!-- Header -->
		<div class="page-header">
			<div class="header-left">
				<div class="header-title-row">
					<h2>{{ workOrder.woNumber }} - {{ workOrder.title }}</h2>
					<Badge
						v-if="workOrder.status"
						:type="getStatusChipType(workOrder.status) as any"
					>
						{{ formatStatusLabel(workOrder.status) }}
					</Badge>
				</div>
			</div>
			<div class="header-actions">
				<Button variant="outlined" @click="router.back()">
					<i class="mdi mdi-chevron-left" style="margin-right: 4px"></i> Back
				</Button>
				<Button
					v-if="
						(isDraftOrNew &&
							normalizedWorkOrderStatus === 'draft' &&
							authStore.can('update_draft', 'WorkOrder') &&
							canEditForCurrentAssignment) ||
						(isDraftOrNew &&
							normalizedWorkOrderStatus === 'new' &&
							authStore.can('update_new', 'WorkOrder') &&
							canEditForCurrentAssignment)
					"
					variant="primary"
					@click="
						router.push({
							name: 'Work Order Form',
							params: { id: workOrder.guid || woNumber },
						})
					"
				>
					<i class="mdi mdi-note-edit-outline" style="margin-right: 4px"></i>
					Edit
				</Button>
				<Button
					v-if="
						normalizedWorkOrderStatus === 'new' &&
						authStore.can('update_new', 'WorkOrder') &&
						canEditForCurrentAssignment
					"
					variant="primary"
					:disabled="loading"
					@click="requestApprovalForNewWorkOrder"
				>
					<i class="mdi mdi-check"></i> Request For Approval
				</Button>
				<template
					v-if="
						isPendingApproval &&
						isManager &&
						(authStore.can('approve', 'WorkOrder') ||
							authStore.can('reject', 'WorkOrder'))
					"
				>
					<Button
						v-if="authStore.can('approve', 'WorkOrder')"
						variant="primary"
						@click="approvePendingWorkOrder"
					>
						<i class="mdi mdi-check-circle-outline" style="margin-right: 4px"></i>
						Approve
					</Button>
					<Button
						v-if="authStore.can('reject', 'WorkOrder')"
						variant="outlined"
						style="color: var(--colors-error); border-color: var(--colors-error)"
						@click="openRejectDoneDialog"
					>
						<i class="mdi mdi-close-circle-outline" style="margin-right: 4px"></i>
						Reject
					</Button>
				</template>

				<!-- Repeat & Transfer Work Order (Commented out) -->
				<!--
				<Button variant="outlined" @click="repeatDialogRef?.open()" title="Create a repeat sub-order">
					<i class="mdi mdi-repeat" style="margin-right: 4px"></i> Repeat
				</Button>
				<Button variant="outlined" @click="transferDialogRef?.open()" title="Transfer to a new work order">
					<i class="mdi mdi-transfer" style="margin-right: 4px"></i> Transfer
				</Button>
				-->
				<Button
					v-if="
						isEditing &&
						authStore.can('mark_as_done', 'WorkOrder') &&
						canEditForCurrentAssignment
					"
					variant="primary"
					@click="markAsDone"
				>
					Mark as Done
				</Button>
				<Button
					v-if="
						normalizedWorkOrderStatus === 'done' &&
						authStore.can('reopen', 'WorkOrder')
					"
					variant="primary"
					@click="reopenWorkOrder"
				>
					<i class="mdi mdi-lock-open-variant-outline"></i> Reopen
				</Button>
				<Button
					v-slot:default
					v-if="
						normalizedWorkOrderStatus === 'completed' &&
						authStore.can('mark_as_claimed', 'WorkOrder')
					"
					variant="primary"
					:disabled="totalInvoiceIssued <= 0"
					:title="
						totalInvoiceIssued > 0
							? 'Mark as Claimed'
							: 'Upload an invoice with an amount before marking as claimed'
					"
					@click="markAsClaimed"
					style="display: flex; align-items: center; gap: 6px"
				>
					<i class="mdi mdi-cash-check"></i> Mark as Claimed
				</Button>
				<Button
					v-if="
						workOrder?.status === 'Claimed' &&
						authStore.can('mark_as_closed', 'WorkOrder')
					"
					variant="primary"
					:disabled="!canMarkAsClosed"
					:title="
						canMarkAsClosed
							? 'Mark as Complete'
							: 'Invoice total must equal payment total before completing'
					"
					@click="markAsClosed"
					style="display: flex; align-items: center; gap: 6px"
				>
					<i class="mdi mdi-check-decagram-outline"></i> Mark as Closed
				</Button>
			</div>
		</div>

		<!-- Horizontal Tabs -->
		<div class="tabs-horizontal">
			<button class="nav-arrow" v-show="showLeftArrow" @click="scrollTabs('left')">
				<i class="mdi mdi-chevron-left"></i>
			</button>
			<div class="tabs-wrapper" ref="tabsWrapperRef">
				<div
					v-for="tab in visibleTabs"
					:key="tab.id"
					class="tab-item"
					:class="{ 'is-active': activeTab === tab.id }"
					@click="activeTab = tab.id"
				>
					{{ tab.label }}
				</div>
			</div>
			<button class="nav-arrow" v-show="showRightArrow" @click="scrollTabs('right')">
				<i class="mdi mdi-chevron-right"></i>
			</button>
		</div>

		<!-- Main Workspace -->
		<div class="workspace-area">
			<!-- Alert -->
			<div class="alert-box alert-info" v-if="isEditing">
				<i class="mdi mdi-information"></i>
				<span>
					Part Info, Supplier Invoices, Images, Work Notes, and Finance tab are opened.
					Mark the work order as done if ready.
				</span>
			</div>

			<!-- Warning Alert for Rejection Reason if state is InProgress -->
			<div
				class="alert-box alert-warning"
				v-if="workOrder?.status === 'InProgress' && workOrder?.rejectedReason"
			>
				<i class="mdi mdi-alert-circle"></i>
				<span>
					This work order was rejected back to In Progress. Reason:
					<strong>{{ workOrder.rejectedReason }}</strong>
				</span>
			</div>

			<div class="alert-box alert-error" v-if="isRejected">
				<i class="mdi mdi-alert-circle"></i>
				<span>
					<strong>Work Order Rejected.</strong>
					Reason: {{ workOrder.rejectedReason || "No rejection reason provided." }}
				</span>
			</div>

			<!-- Stepper -->
			<div class="stepper-horizontal">
				<div
					v-for="(step, index) in computedSteps"
					:key="step.label"
					class="step"
					:class="{
						'is-active': index === currentStepIndex,
						'is-completed': index < currentStepIndex,
						'is-rejected': isRejected && index === currentStepIndex,
					}"
				>
					<div class="step-icon-container">
						<div
							class="step-circle"
							:class="{ 'step-circle-completed': index < currentStepIndex }"
						>
							<i
								v-if="isRejected && index === currentStepIndex"
								class="mdi mdi-close-circle-outline"
							></i>
							<i
								v-else-if="index === currentStepIndex"
								class="mdi mdi-clock-outline"
							></i>
							<i v-else-if="index === 0" class="mdi mdi-file-document-outline"></i>
							<i v-else-if="index === 1" class="mdi mdi-check-decagram-outline"></i>
							<i v-else-if="index === 2" class="mdi mdi-progress-wrench"></i>
							<i v-else-if="index === 3" class="mdi mdi-file-sign"></i>
							<i v-else-if="index === 4" class="mdi mdi-briefcase-check-outline"></i>
							<i v-else-if="index === 5" class="mdi mdi-credit-card-outline"></i>
							<i v-else class="mdi mdi-check-circle-outline"></i>
						</div>
					</div>
					<div class="step-content">
						<div class="step-label">{{ step.label }}</div>
						<div class="step-date" v-if="step.date">{{ step.date }}</div>
					</div>
					<div class="step-line" v-if="index < computedSteps.length - 1"></div>
				</div>
			</div>

			<div class="detail-columns-grid">
				<!-- Content Card -->
				<Card class="content-card">
					<GeneralTab
						v-if="activeTab === 'general'"
						:workOrder="workOrder"
						:users="users"
						:workTypes="workTypes"
						:isEditing="canEditGeneral"
						:canEnterEdit="canEnterGeneralEdit"
						:contractStatus="contractStatus"
						:siteInstructionsFiles="siteInstructionsFiles"
						:phases="phases"
						:showEquipmentForm="showEquipmentForm"
						:isMechanical="isMechanical"
						@save="saveGeneralFormChanges"
						@edit="isGeneralEditMode = true"
						@cancelEdit="isGeneralEditMode = false"
						@extend="openExtendDialog"
						@openMap="isMapDialogOpen = true"
					/>

					<!-- PART INFO TAB (12 photos) -->
					<PartInfoTab
						v-if="activeTab === 'partInfo'"
						:partInfoPhotos="partInfoPhotos"
						:isEditing="isEditing && authStore.can('create', 'PartInfo')"
						:isManager="isManager && authStore.can('create', 'PartInfo')"
						:workOrderStatus="workOrder?.status"
						@upload="handleFileUpload($event, 'PartInfo')"
						@delete="handleDeleteFile"
						@preview="openFilePreview"
					/>

					<!-- SUPPLIER INVOICES TAB (12 photos) -->
					<SupplierInvoicesTab
						v-if="activeTab === 'supplierInvoices'"
						:supplierInvoicePhotos="supplierInvoicePhotos"
						:isEditing="isEditing && authStore.can('create', 'SupplierInvoice')"
						:isManager="isManager && authStore.can('create', 'SupplierInvoice')"
						:workOrderStatus="workOrder?.status"
						@upload="handleFileUpload($event, 'SupplierInvoice')"
						@delete="handleDeleteFile"
						@preview="openFilePreview"
					/>

					<!-- IMAGES -->
					<ImagesTab
						v-if="activeTab === 'images'"
						:images="images"
						:isEditing="isEditing && authStore.can('create', 'WorkOrderImage')"
						:isManager="isManager && authStore.can('create', 'WorkOrderImage')"
						:workOrderStatus="workOrder?.status"
						@upload="uploadJobImage"
						@delete="handleDeleteFile"
						@preview="openFilePreview"
					/>

					<!-- WORK NOTES -->
					<NotesTab
						v-if="activeTab === 'notes'"
						:workNotes="workNotes"
						:users="users"
						:workOrderStatus="workOrder?.status"
						@addNote="openAddNoteDialog"
						@editNote="openEditNoteDialog"
						@deleteNote="deleteWorkNote"
					/>

					<!-- FINANCE -->
					<FinanceTab
						v-if="activeTab === 'finance'"
						:quotations="quotations"
						:totalQuotationAmount="totalQuotationAmount"
						:workOrderStatus="workOrder?.status"
						:isEditing="isEditing"
						:isManager="isManager"
						@upload="handleFileUpload($event, 'Quotation')"
						@delete="handleDeleteFile"
						@edit="openEditQuotation"
						@preview="openFilePreview"
					/>

					<!-- VERIFICATION -->
					<VerificationTab
						v-if="activeTab === 'verification'"
						:workOrder="workOrder"
						:isManager="isManager"
						:currentUserRole="currentUserRole"
						:currentStepIndex="currentStepIndex"
						@updateRole="currentUserRole = $event"
						@approve="approveDoneWorkOrder"
						@reject="openRejectDoneDialog"
					/>

					<!-- PAYMENT -->
					<PaymentTab
						v-if="activeTab === 'payment'"
						:workOrder="workOrder"
						:invoices="invoices"
						:payments="payments"
						:totalInvoiceIssued="totalInvoiceIssued"
						:totalPaymentReceived="totalPaymentReceived"
						:balanceRemaining="balanceRemaining"
						:isFullyPaid="isFullyPaid"
						@uploadInvoice="handleFileUpload($event, 'Invoice')"
						@editInvoice="openEditInvoice"
						@deleteFile="handleDeleteFile"
						@uploadPayment="handleFileUpload($event, 'Payment')"
						@deletePayment="handleDeleteFile"
						@preview="openFilePreview"
						@editPayment="openEditPayment"
					/>

					<!-- REPORT -->
					<ReportTab
						v-if="activeTab === 'report'"
						:workOrder="workOrder"
						:partReplacedImages="partInfoPhotos"
						:images="images"
						@print="printReport"
					/>
				</Card>

				<!-- Activity Sidebar -->
				<Card class="timeline-sidebar no-print">
					<div class="timeline-sidebar__header">
						<h4>Activity Timeline</h4>
					</div>
					<div class="timeline-sidebar__body">
						<div v-if="activityLogs.length === 0" class="timeline-empty">
							<i class="mdi mdi-timeline-text-outline"></i>
							<p>No activity logs found.</p>
						</div>
						<div v-else class="timeline-list">
							<div class="timeline-item" v-for="log in activityLogs" :key="log.id">
								<div class="timeline-item__badge">
									<i class="mdi mdi-record-circle-outline"></i>
								</div>
								<div class="timeline-item__content">
									<div class="timeline-item__type">
										{{ formatActivityType(log.activityType) }}
									</div>
									<div class="timeline-item__remarks">{{ log.remarks }}</div>
									<div class="timeline-item__meta">
										<span class="timeline-item__date">{{
											formatDateString(log.createdAt)
										}}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</Card>
			</div>
		</div>

		<QuotationDialog ref="quotationDialogRef" :items="quotations" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />

		<InvoiceDialog ref="invoiceDialogRef" :items="invoices" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />

		<PaymentDialog ref="paymentDialogRef" :items="payments" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />

		<RepeatDialog ref="repeatDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />

		<TransferDialog ref="transferDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />

		<RejectDialog ref="rejectDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />

		<ExtendDialog ref="extendDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" />

		<LocationMapDialog ref="locationMapDialogRef" :wo-number="woNumber" :work-order="workOrder" />

		<NoteDialog ref="noteDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />

		<UploadConfirmDialog ref="uploadConfirmDialogRef"  />

		<FilePreviewDialog ref="filePreviewDialogRef"  />

		<ConfirmDialog ref="confirmDialogRef" />
	</div>
</template>

<style lang="scss" scoped>
/* Same CSS as before plus some new additions */
.wo-detail-page {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background: var(--colors-surface-background);
	margin: calc(var(--spacing-lg) * -1);
}
.page-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	flex-wrap: wrap;
	gap: 16px 24px;
	padding: 24px 32px 16px 32px;
	border-bottom: 1px solid var(--colors-surface-border, #e2e8f0);

	.header-left {
		flex: 1 1 320px;
		min-width: 0;

		.breadcrumb {
			font-size: 13px;
			margin-bottom: 8px;
			display: flex;
			align-items: center;
			gap: 6px;
			flex-wrap: wrap;
			i {
				font-size: 16px;
			}
		}

		.header-title-row {
			display: flex;
			align-items: center;
			gap: 12px;
			flex-wrap: wrap;

			h2 {
				margin: 0;
				font-size: clamp(20px, 2.2vw, 28px);
				color: var(--colors-text-primary);
				font-weight: 600;
				line-height: 1.3;
				word-break: break-word;
			}
		}

		.wo-title {
			margin: 4px 0 0 0;
			font-size: 16px;
			color: var(--colors-text-secondary);
		}
	}

	.header-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 12px;
		align-items: center;
		flex: 0 1 auto;
	}
}

@media (max-width: 768px) {
	.page-header {
		padding: 16px 20px;
		flex-direction: column;
		align-items: stretch;
		gap: 14px;

		.header-left {
			flex: 1 1 auto;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-start;
			gap: 8px;

			> * {
				flex: 1 1 auto;
			}
		}
	}
}
.tabs-horizontal {
	display: flex;
	align-items: center;
	padding: 0 16px;
	border-bottom: 1px solid var(--colors-surface-border);
	.nav-arrow {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--colors-text-muted);
		padding: 8px;
		font-size: 20px;
		&:hover {
			color: var(--colors-text-primary);
		}
	}
	.tabs-wrapper {
		display: flex;
		overflow-x: auto;
		scrollbar-width: none;
		&::-webkit-scrollbar {
			display: none;
		}
	}
	.tab-item {
		padding: 16px 20px;
		font-size: 14px;
		font-weight: 500;
		color: var(--colors-text-secondary);
		cursor: pointer;
		white-space: nowrap;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
		&:hover {
			color: var(--colors-brand-primary);
		}
		&.is-active {
			color: var(--colors-brand-primary);
			border-bottom-color: var(--colors-brand-primary);
		}
	}
}
.workspace-area {
	padding: 24px 32px;
	max-width: 1200px;
	margin: 0 auto;
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 32px;
}
.alert-box {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 16px 20px;
	border-radius: 8px;
	i {
		font-size: 20px;
		margin-top: -2px;
	}
	span {
		font-size: 14px;
		line-height: 1.5;
	}
}
.alert-info {
	background-color: #ebf5ff;
	color: #1e40af;
	border: 1px solid #bfdbfe;
}
.alert-warning {
	background-color: #fffbeb;
	color: #92400e;
	border: 1px solid #fde68a;
}
.alert-error {
	background-color: #fef2f2;
	color: var(--colors-error, #b91c1c);
	border: 1px solid #fecaca;
}
.stepper-horizontal {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	width: 100%;
	padding: 16px 0;
}
.step {
	display: flex;
	flex-direction: column;
	align-items: center;
	position: relative;
	flex: 1;
	.step-icon-container {
		position: relative;
		z-index: 2;
		background: var(--colors-surface-background);
		padding: 0 10px;
	}
	.step-circle {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--colors-surface-background);
		border: 2px solid var(--colors-text-muted);
		color: var(--colors-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
		&.step-circle-completed {
			background: var(--status-completed);
			border-color: var(--status-completed);
			color: white;
		}
	}
	.step-content {
		margin-top: 12px;
		text-align: center;
		.step-label {
			font-size: 12px;
			font-weight: 500;
			color: var(--colors-text-secondary);
		}
		.step-date {
			font-size: 11px;
			color: var(--colors-text-muted);
			margin-top: 4px;
			font-weight: 600;
		}
	}
	.step-line {
		position: absolute;
		top: 24px;
		left: 50%;
		width: 100%;
		height: 2px;
		background: var(--colors-text-muted);
		opacity: 0.4;
		z-index: 1;
		transition: all 0.3s;
	}
	&.is-active {
		.step-circle {
			background: var(--colors-brand-primary);
			border-color: var(--colors-brand-primary);
			color: white;
			box-shadow: 0 0 0 6px var(--colors-brand-primarySoft);
		}
		.step-label {
			color: var(--colors-text-primary);
			font-weight: 600;
		}
	}
	&.is-rejected {
		.step-circle {
			background: var(--colors-error, #dc2626);
			border-color: var(--colors-error, #dc2626);
			color: white;
			box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.12);
		}
		.step-label {
			color: var(--colors-error, #b91c1c);
			font-weight: 700;
		}
	}
	&.is-completed {
		.step-line {
			background: var(--status-completed);
			opacity: 1;
		}
	}
}
.content-card {
	padding: 32px;
	border-radius: 12px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
	:deep(.card-header),
	:deep(.report-toolbar) {
		margin: -32px -32px 24px -32px !important;
		padding: 20px 32px !important;
		background: var(--colors-surface-background) !important;
		border-bottom: 1px solid var(--colors-surface-border) !important;
		border-top-left-radius: 12px !important;
		border-top-right-radius: 12px !important;
		box-sizing: border-box !important;

		.header-title-flex {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		h3 {
			margin: 0;
			font-size: 18px;
			font-weight: 600;
			color: var(--colors-text-primary);
		}

		p {
			margin: 4px 0 0 0;
			font-size: 13px;
			color: var(--colors-text-muted);
		}
	}
}

/* Detail view layout grid & responsive layout */
.detail-columns-grid {
	display: grid;
	grid-template-columns: 1fr 340px;
	gap: 24px;
	align-items: start;
}

@media (max-width: 1180px) {
	.detail-columns-grid {
		grid-template-columns: 1fr;
	}

	.timeline-sidebar .timeline-sidebar__body {
		max-height: 380px;
	}
}

@media (max-width: 768px) {
	.workspace-area {
		padding: 16px;
		gap: 20px;
	}

	.content-card {
		padding: 20px 16px;
	}

	.stepper-horizontal {
		overflow-x: auto;
		justify-content: flex-start;
		padding-bottom: 12px;
	}

	.step {
		min-width: 112px;
	}
}

.extend-dialog-form {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

/* Activity sidebar */
.timeline-sidebar {
	background: var(--colors-bg-card);
	border: 1px solid var(--colors-border);
	border-radius: 12px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-shadow: var(--shadow-sm);

	.timeline-sidebar__header {
		padding: 16px 20px;
		border-bottom: 1px solid var(--colors-border);
		background-color: var(--colors-bg-card-header);

		h4 {
			margin: 0;
			font-size: 15px;
			font-weight: 600;
			color: var(--colors-text-primary);
		}
	}

	.timeline-sidebar__body {
		padding: 20px;
		max-height: 580px;
		overflow-y: auto;
	}

	.timeline-empty {
		text-align: center;
		padding: 32px 16px;
		color: var(--colors-text-muted);

		i {
			font-size: 36px;
			margin-bottom: 8px;
			display: inline-block;
		}

		p {
			margin: 0;
			font-size: 13px;
		}
	}

	.timeline-list {
		display: flex;
		flex-direction: column;
		gap: 20px;
		position: relative;

		&::before {
			content: "";
			position: absolute;
			left: 9px;
			top: 4px;
			bottom: 4px;
			width: 2px;
			background-color: var(--colors-border);
		}
	}

	.timeline-item {
		display: flex;
		gap: 12px;
		position: relative;

		.timeline-item__badge {
			position: relative;
			z-index: 2;
			background-color: var(--colors-bg-card);
			border-radius: 50%;
			height: 20px;
			width: 20px;
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--colors-brand-primary);

			i {
				font-size: 16px;
			}
		}

		.timeline-item__content {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.timeline-item__type {
			font-size: 13px;
			font-weight: 600;
			color: var(--colors-text-primary);
		}

		.timeline-item__remarks {
			font-size: 12px;
			color: var(--colors-text-secondary);
			line-height: 1.4;
		}

		.timeline-item__meta {
			margin-top: 2px;
		}

		.timeline-item__date {
			font-size: 11px;
			color: var(--colors-text-muted);
		}
	}
}

.custom-label {
	display: block;
	margin-bottom: 6px;
	font-size: 13px;
	font-weight: 500;
	color: var(--colors-text-primary, #0f172a);
}

.custom-textarea {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--colors-surface-border, #cbd5e1);
	border-radius: 6px;
	background-color: var(--colors-surface-background, #f8fafc);
	color: var(--colors-text-primary, #0f172a);
	font-family: inherit;
	font-size: 14px;
	line-height: 1.5;
	resize: vertical;
	transition:
		border-color 0.2s,
		box-shadow 0.2s;

	&:focus {
		outline: none;
		border-color: var(--colors-brand-primary, #5058f2);
		box-shadow: 0 0 0 3px rgba(80, 88, 242, 0.1);
	}
}

.custom-input {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--colors-surface-border, #cbd5e1);
	border-radius: 6px;
	background-color: var(--colors-surface-background, #f8fafc);
	color: var(--colors-text-primary, #0f172a);
	font-family: inherit;
	font-size: 14px;
	transition:
		border-color 0.2s,
		box-shadow 0.2s;

	&:focus {
		outline: none;
		border-color: var(--colors-brand-primary, #5058f2);
		box-shadow: 0 0 0 3px rgba(80, 88, 242, 0.1);
	}
}

.custom-select {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--colors-surface-border, #cbd5e1);
	border-radius: 6px;
	background-color: var(--colors-surface-background, #f8fafc);
	color: var(--colors-text-primary, #0f172a);
	font-family: inherit;
	font-size: 14px;
	cursor: pointer;
	transition:
		border-color 0.2s,
		box-shadow 0.2s;

	&:focus {
		outline: none;
		border-color: var(--colors-brand-primary, #5058f2);
		box-shadow: 0 0 0 3px rgba(80, 88, 242, 0.1);
	}
}

/* Printing optimization styling */
@media print {
	.no-print {
		display: none !important;
	}

	.workspace-area {
		margin: 0 !important;
		padding: 0 !important;
	}

	.detail-columns-grid {
		display: block !important;
	}

	.report-document {
		border: none !important;
		box-shadow: none !important;
		padding: 0 !important;
		margin: 0 !important;
		width: 100% !important;
	}
}
</style>
