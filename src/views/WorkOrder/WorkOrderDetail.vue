<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/components/Button.vue";
import Card from "@/components/Card.vue";
import Textbox from "@/components/Textbox.vue";
import DatePicker from "@/components/DatePicker.vue";
import Dialog from "@/components/Dialog.vue";
import Badge from "@/components/Badge.vue";
import { workOrderApi } from "@/api/work-order/work-order.api";
import { userApi } from "@/api/user/user.api";
import { workTypeApi } from "@/api/maintenance/work-type/work-type.api";

// Sub-tab Components
import GeneralTab from "./tabs/GeneralTab.vue";
import PartInfoTab from "./tabs/PartInfoTab.vue";
import SupplierInvoicesTab from "./tabs/SupplierInvoicesTab.vue";
import ImagesTab from "./tabs/ImagesTab.vue";
import NotesTab from "./tabs/NotesTab.vue";
import FinanceTab from "./tabs/FinanceTab.vue";
import VerificationTab from "./tabs/VerificationTab.vue";
import PaymentTab from "./tabs/PaymentTab.vue";
import ReportTab from "./tabs/ReportTab.vue";

const route = useRoute();
const router = useRouter();

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

function updateStepFromStatus(statusStr: string) {
	if (!statusStr) return;
	const s = statusStr.toLowerCase();
	if (s === "new") {
		currentStepIndex.value = 0;
		breadcrumbStatus.value = "New Request";
	} else if (s === "pendingapproval") {
		currentStepIndex.value = 1;
		breadcrumbStatus.value = "Pending Approval";
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
	method: string;
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
	projectPersonInCharge: "",
	startDate: "",
	estimatedEndDate: "",
	description: "",
	location: "",
	siteCode: "",
	jobPriority: "Medium",
	leaderCode: "",
	leaderIICode: "",
	technicianCodes: [] as string[],
	leadEngineer: "",
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
});

const loading = ref(false);

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
				status: w.orderStatus || w.status || "InProgress",
				workType: w.workType || "",
				workTypeItem: w.workTypeItem || "",
				salesAgent: w.salesAgentCode || "",
				projectPersonInCharge: w.personInChargeCode || w.projectPicCode || "",
				startDate: w.startDate || "",
				estimatedEndDate: w.estimatedEndDate || "",
				description: w.description || "",
				location: w.location || w.locationName || "",
				siteCode: w.siteCode || "",
				jobPriority: w.jobPriority || "Low",
				leaderCode: w.leaderCode || w.leadEngineerCode || "",
				leaderIICode: w.leaderIICode || "",
				technicianCodes: w.technicianCodes || w.assistantEngineers || [],
				leadEngineer: w.leaderCode || w.leadEngineerCode || "",
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
			alert("Work Order not found");
			router.push("/work-order");
		}
	} catch (e) {
		console.error("Failed to fetch work order details:", e);
		alert("Error loading work order details");
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

const tabs = [
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

const activeTab = ref<string>("general");

const currentUserRole = ref<"Manager" | "Technician">("Manager");

// Extend EndDate Dialog
const isExtendDialogOpen = ref(false);
const extendForm = ref({ newEstimatedEndDate: "", extensionReason: "" });
const isExtending = ref(false);

function openExtendDialog() {
	extendForm.value = {
		newEstimatedEndDate: workOrder.value.estimatedEndDate
			? new Date(workOrder.value.estimatedEndDate).toISOString().split("T")[0]
			: "",
		extensionReason: "",
	};
	isExtendDialogOpen.value = true;
}

async function submitExtend() {
	if (!extendForm.value.newEstimatedEndDate) return;
	isExtending.value = true;
	try {
		const { error } = await workOrderApi.extendEndDate(woNumber, {
			newEstimatedEndDate: new Date(extendForm.value.newEstimatedEndDate).toISOString(),
			extensionReason: extendForm.value.extensionReason || undefined,
		});
		if (error) {
			alert(`Failed to extend: ${error.error?.message || "Unknown error"}`);
		} else {
			alert("Estimated end date extended successfully!");
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

// Repeat Work Order Dialog
const isRepeatDialogOpen = ref(false);
const repeatForm = ref({ title: "", description: "", startDate: "", estimatedEndDate: "" });
const isRepeating = ref(false);

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
			alert(`Failed to repeat: ${error.error?.message || "Unknown error"}`);
		} else {
			alert("Work order repeated successfully! A new sub-order has been created.");
			isRepeatDialogOpen.value = false;
		}
	} catch (e) {
		console.error(e);
	} finally {
		isRepeating.value = false;
	}
}

// Transfer Work Order Dialog
const isTransferDialogOpen = ref(false);
const transferForm = ref({ title: "", description: "", startDate: "", estimatedEndDate: "" });
const isTransferring = ref(false);

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
			alert(`Failed to transfer: ${error.error?.message || "Unknown error"}`);
		} else {
			alert("Work order transferred successfully! A new work order has been created.");
			isTransferDialogOpen.value = false;
		}
	} catch (e) {
		console.error(e);
	} finally {
		isTransferring.value = false;
	}
}

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
			alert(`Failed to mark as done: ${error.error.message}`);
		} else {
			alert("Work order marked as done!");
			fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
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
const isEditQuotationDialogOpen = ref(false);
// const isUploadingQuotation = ref(false);
// const editingQuotationId = ref<number | null>(null);
const quotationForm = ref({ refNo: "", date: "", amount: 0, name: "" });

// function simulateQuotationOCR() {
// 	isUploadingQuotation.value = true;
// 	setTimeout(() => {
// 		quotationForm.value = {
// 			refNo: `QT-2026-${89 + quotations.value.length + 1}`,
// 			date: new Date().toLocaleDateString("en-GB", {
// 				day: "2-digit",
// 				month: "short",
// 				year: "numeric",
// 			}),
// 			amount: 4500,
// 			name: `Quotation_${Date.now()}.pdf`,
// 		};
// 		isUploadingQuotation.value = false;
// 	}, 1500);
// }

// function openAddQuotationDialog() {
// 	quotationForm.value = { refNo: "", date: "", amount: 0, name: "" };
// 	isAddQuotationDialogOpen.value = true;
// }

// function addQuotation() {
// 	if (!quotationForm.value.refNo || !quotationForm.value.amount) return;
// 	quotations.value.push({
// 		id: Date.now(),
// 		refNo: quotationForm.value.refNo,
// 		date: quotationForm.value.date,
// 		amount: quotationForm.value.amount,
// 		name: quotationForm.value.name || `Quotation_${quotationForm.value.refNo}.pdf`,
// 	});
// 	isAddQuotationDialogOpen.value = false;
// 	quotationForm.value = { refNo: "", date: "", amount: 0, name: "" };
// }

const editingQuotationGuid = ref("");

function openEditQuotation(guid: string) {
	const found = quotations.value.find((q) => q.guid === guid);
	if (!found) return;
	editingQuotationGuid.value = guid;
	quotationForm.value = {
		refNo: found.refNo,
		date: found.date,
		amount: found.amount,
		name: found.name,
	};
	isEditQuotationDialogOpen.value = true;
}

async function saveEditQuotation() {
	loading.value = true;
	try {
		const docDate = quotationForm.value.date
			? new Date(quotationForm.value.date).toISOString()
			: undefined;
		const { error } = await workOrderApi.updateFile(editingQuotationGuid.value, {
			docNo: quotationForm.value.refNo,
			docAmount: quotationForm.value.amount,
			docDate,
		});
		if (error) {
			alert(`Failed to save changes: ${error.error.message}`);
		} else {
			alert("Quotation details updated successfully!");
			isEditQuotationDialogOpen.value = false;
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

const totalQuotationAmount = computed(() => quotations.value.reduce((sum, q) => sum + q.amount, 0));

// Payment & Invoice State
const invoices = ref<InvoiceRecord[]>([]);
const payments = ref<PaymentRecord[]>([]);

// const isAddInvoiceDialogOpen = ref(false);
const isEditInvoiceDialogOpen = ref(false);
// const isAddPaymentDialogOpen = ref(false);
// const isUploadingNewInvoice = ref(false);
// const editingInvoiceId = ref<number | null>(null);

const invoiceForm = ref({ refNo: "", date: "", amount: 0, name: "" });
// const paymentForm = ref({
// 	date: "",
// 	amount: 0,
// 	method: "Bank Transfer",
// 	reference: "",
// 	fileName: "",
// });

const totalInvoiceIssued = computed(() => invoices.value.reduce((sum, inv) => sum + inv.amount, 0));
const totalPaymentReceived = computed(() =>
	payments.value.reduce((sum, pay) => sum + pay.amount, 0),
);
const balanceRemaining = computed(() => totalInvoiceIssued.value - totalPaymentReceived.value);
const isFullyPaid = computed(() => invoices.value.length > 0 && balanceRemaining.value <= 0);

// function addInvoice() {
// 	if (!invoiceForm.value.refNo || !invoiceForm.value.amount) return;
// 	invoices.value.push({
// 		id: Date.now(),
// 		refNo: invoiceForm.value.refNo,
// 		date: invoiceForm.value.date,
// 		amount: invoiceForm.value.amount,
// 		name: invoiceForm.value.name || `Invoice_${invoiceForm.value.refNo}.pdf`,
// 	});
// 	isAddInvoiceDialogOpen.value = false;
// 	invoiceForm.value = { refNo: "", date: "", amount: 0, name: "" };
// }

const editingInvoiceGuid = ref("");

function openEditInvoice(guid: string) {
	const found = invoices.value.find((inv) => inv.guid === guid);
	if (!found) return;
	editingInvoiceGuid.value = guid;
	invoiceForm.value = {
		refNo: found.refNo,
		date: found.date,
		amount: found.amount,
		name: found.name,
	};
	isEditInvoiceDialogOpen.value = true;
}

async function saveEditInvoice() {
	loading.value = true;
	try {
		const docDate = invoiceForm.value.date
			? new Date(invoiceForm.value.date).toISOString()
			: undefined;
		const { error } = await workOrderApi.updateFile(editingInvoiceGuid.value, {
			docNo: invoiceForm.value.refNo,
			docAmount: invoiceForm.value.amount,
			docDate,
		});
		if (error) {
			alert(`Failed to save changes: ${error.error.message}`);
		} else {
			alert("Invoice details updated successfully!");
			isEditInvoiceDialogOpen.value = false;
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

async function markAsClaimed() {
	if (!isFullyPaid.value) return;
	try {
		const { error } = await workOrderApi.claim(woNumber, {
			invoiceAmount: totalInvoiceIssued.value,
		});
		if (error) {
			alert(`Failed to mark as claimed: ${error.error.message}`);
		} else {
			alert("Work order marked as claimed!");
			fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
	}
}

function printReport() {
	window.print();
}

// New states and variables
const activityLogs = ref<any[]>([]);
const workNotes = ref<any[]>([]);
const reportType = ref("general");
const images = ref<any[]>([]);
const partsReplaced = computed(() => workOrder.value?.partsReplaced || []);

// Date format helper
function formatDateString(dateStr: string | Date | null) {
	if (!dateStr) return "";
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return "";
	return date.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

// computedSteps mapping based on real dates
const computedSteps = computed(() => {
	const w = workOrder.value;
	return [
		{ label: "New Request", date: w?.createdAt ? formatDateString(w.createdAt) : "" },
		{
			label: "Pending Approval",
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
			siteInstructionsFiles.value = items
				.filter(
					(f: any) =>
						f.category === "SiteInstructions" || f.category === "site_instructions",
				)
				.map((f: any) => ({
					id: f.id,
					guid: f.guid,
					category: f.category,
					url: f.storageUrl,
					name: f.fileName,
					type: f.mimeType || "",
				}));

			partInfoPhotos.value = items
				.filter((f: any) => f.category === "PartInfo" || f.category === "part_info")
				.map((f: any) => ({
					id: f.id,
					guid: f.guid,
					category: f.category,
					url: f.storageUrl,
					name: f.fileName,
				}));

			supplierInvoicePhotos.value = items
				.filter(
					(f: any) =>
						f.category === "SupplierInvoice" || f.category === "supplier_invoices",
				)
				.map((f: any) => ({
					id: f.id,
					guid: f.guid,
					category: f.category,
					url: f.storageUrl,
					name: f.fileName,
				}));

			images.value = items
				.filter((f: any) => f.category === "Image")
				.map((f: any) => ({
					id: f.id,
					guid: f.guid,
					category: f.subcategory || "Before",
					url: f.storageUrl,
					name: f.fileName,
				}));

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
					method: f.notes || "Bank Transfer",
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
		const payload = {
			personInChargeCode: workOrder.value.projectPersonInCharge,
			leaderCode: workOrder.value.leaderCode,
			leaderIiCode: workOrder.value.leaderIICode,
			technicianCodes: workOrder.value.technicianCodes,
			location: workOrder.value.location,
			description: workOrder.value.description,
		};
		const { error } = await workOrderApi.updateProgress(woNumber, payload);
		if (error) {
			alert(`Failed to save changes: ${error.error.message}`);
		} else {
			alert("Changes saved successfully!");
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

// approveDoneWorkOrder
async function approveDoneWorkOrder() {
	if (
		!confirm(
			"Are you sure you want to approve this work order? This will transition it to Completed state.",
		)
	)
		return;
	loading.value = true;
	try {
		const { error } = await workOrderApi.complete(woNumber);
		if (error) {
			alert(`Failed to approve work order: ${error.error.message}`);
		} else {
			alert("Work order approved successfully!");
			await fetchWorkOrderDetails();
			await fetchActivityLogs();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

// Reject dialog triggers & handlers
const isRejectDialogOpen = ref(false);
const rejectForm = ref({
	rejectedReason: "",
});

function openRejectDoneDialog() {
	rejectForm.value = { rejectedReason: "" };
	isRejectDialogOpen.value = true;
}

function closeRejectDialog() {
	isRejectDialogOpen.value = false;
}

async function submitReject() {
	if (!rejectForm.value.rejectedReason) return;
	loading.value = true;
	try {
		const { error } = await workOrderApi.reject(woNumber, {
			rejectedReason: rejectForm.value.rejectedReason,
		});
		if (error) {
			alert(`Failed to reject work order: ${error.error.message}`);
		} else {
			alert("Work order rejected and sent back to In Progress!");
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

// Notes CRUD triggers & handlers
const isNoteDialogOpen = ref(false);
const isEditingNote = ref(false);
const editingNoteGuid = ref("");
const noteForm = ref({
	content: "",
	viewLevel: "external",
});

function openAddNoteDialog() {
	isEditingNote.value = false;
	editingNoteGuid.value = "";
	noteForm.value = {
		content: "",
		viewLevel: "external",
	};
	isNoteDialogOpen.value = true;
}

function openEditNoteDialog(note: any) {
	isEditingNote.value = true;
	editingNoteGuid.value = note.guid;
	noteForm.value = {
		content: note.content || "",
		viewLevel: note.viewLevel || "external",
	};
	isNoteDialogOpen.value = true;
}

function closeNoteDialog() {
	isNoteDialogOpen.value = false;
}

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
			alert(`Failed to save note: ${error.error.message}`);
		} else {
			alert("Note saved successfully!");
			isNoteDialogOpen.value = false;
			await fetchWorkNotes();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

async function deleteWorkNote(noteGuid: string) {
	if (!confirm("Are you sure you want to delete this note?")) return;
	loading.value = true;
	try {
		const { error } = await workOrderApi.deleteNote(noteGuid);
		if (error) {
			alert(`Failed to delete note: ${error.error.message}`);
		} else {
			alert("Note deleted successfully!");
			await fetchWorkNotes();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

// File Upload & Deletion handlers
async function handleFileUpload(
	event: Event,
	category: string,
	subcategory?: string,
	extra?: Record<string, any>,
) {
	const target = event.target as HTMLInputElement;
	if (!target.files || target.files.length === 0) return;
	const file = target.files[0];

	loading.value = true;
	try {
		const fd = new FormData();
		fd.append("file", file);
		fd.append("category", category);
		if (subcategory) {
			fd.append("subcategory", subcategory);
		}
		if (extra) {
			Object.entries(extra).forEach(([k, v]) => {
				if (v !== undefined && v !== null) {
					fd.append(k, String(v));
				}
			});
		}

		const response = await workOrderApi.uploadFile(workOrder.value.guid, fd);
		const resData = await response.json();
		if (resData.error) {
			alert(`Upload failed: ${resData.error.message || "Unknown error"}`);
		} else {
			alert("File uploaded successfully!");
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails(); // To update finance totals
		}
	} catch (e) {
		console.error("Upload error:", e);
		alert("Upload error");
	} finally {
		loading.value = false;
		target.value = ""; // Reset file input
	}
}

async function handleDeleteFile(fileGuid: string) {
	if (!confirm("Are you sure you want to delete this file?")) return;
	loading.value = true;
	try {
		const { error } = await workOrderApi.deleteFile(fileGuid);
		if (error) {
			alert(`Failed to delete file: ${error.error.message}`);
		} else {
			alert("File deleted successfully!");
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

function uploadJobImage(data: { event: Event; category: string }) {
	handleFileUpload(data.event, "Image", data.category);
}

async function renameFile(img: any) {
	if (!img.guid || !img.name) return;
	try {
		await workOrderApi.updateFile(img.guid, { fileName: img.name });
	} catch (e) {
		console.error("Failed to rename file:", e);
	}
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
				code: u.displayCode || u.guid.substring(0, 8).toUpperCase(),
				name: u.displayName || "Unknown",
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

onUnmounted(() => {
	window.removeEventListener("resize", updateTabArrows);
	if (tabsWrapperRef.value) {
		tabsWrapperRef.value.removeEventListener("scroll", updateTabArrows);
	}
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
				<Button variant="outlined" @click="router.push('/work-order')">
					<i class="mdi mdi-chevron-left" style="margin-right: 4px"></i> Back
				</Button>
				<!-- Save Changes for InProgress state -->
				<Button
					variant="outlined"
					@click="saveGeneralFormChanges"
					v-if="workOrder?.status === 'InProgress'"
					title="Save changes to General Information"
				>
					<i class="mdi mdi-content-save-outline" style="margin-right: 4px"></i> Save
					Changes
				</Button>
				<!-- Approve / Reject for Done state -->
				<template v-if="workOrder?.status === 'Done' && isManager">
					<Button
						variant="primary"
						style="
							background-color: var(--colors-success);
							border-color: var(--colors-success);
						"
						@click="approveDoneWorkOrder"
					>
						<i class="mdi mdi-check-circle-outline" style="margin-right: 4px"></i>
						Approve
					</Button>
					<Button
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
				<Button variant="outlined" @click="isRepeatDialogOpen = true" title="Create a repeat sub-order">
					<i class="mdi mdi-repeat" style="margin-right: 4px"></i> Repeat
				</Button>
				<Button variant="outlined" @click="isTransferDialogOpen = true" title="Transfer to a new work order">
					<i class="mdi mdi-transfer" style="margin-right: 4px"></i> Transfer
				</Button>
				-->
				<Button variant="primary" @click="markAsDone" v-if="isEditing">Mark as Done</Button>
				<Button
					v-slot:default
					v-if="workOrder?.status === 'Completed'"
					variant="primary"
					:disabled="!isFullyPaid"
					:title="
						isFullyPaid
							? 'Mark as Claimed'
							: 'Total payment received must equal total invoice issued'
					"
					@click="markAsClaimed"
					style="display: flex; align-items: center; gap: 6px"
				>
					<i class="mdi mdi-cash-check"></i> Mark as Claimed
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
					v-for="tab in tabs"
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
				<span
					>Services, parts, images, work notes, and quotation tab are opened. Mark the
					work order as done if ready.</span
				>
			</div>

			<!-- Warning Alert for Rejection Reason if state is InProgress -->
			<div
				class="alert-box alert-warning"
				v-if="workOrder?.status === 'InProgress' && workOrder?.rejectedReason"
			>
				<i class="mdi mdi-alert-circle"></i>
				<span
					>This work order was rejected back to In Progress. Reason:
					<strong>{{ workOrder.rejectedReason }}</strong></span
				>
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
					}"
				>
					<div class="step-icon-container">
						<div
							class="step-circle"
							:class="{ 'step-circle-completed': index < currentStepIndex }"
						>
							<i v-if="index === currentStepIndex" class="mdi mdi-clock-outline"></i>
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
						:isEditing="isEditing"
						:contractStatus="contractStatus"
						:siteInstructionsFiles="siteInstructionsFiles"
						:phases="phases"
						:showEquipmentForm="showEquipmentForm"
						:isMechanical="isMechanical"
						@save="saveGeneralFormChanges"
						@extend="openExtendDialog"
						@openMap="isMapDialogOpen = true"
					/>

					<!-- PART INFO TAB (12 photos) -->
					<PartInfoTab
						v-if="activeTab === 'partInfo'"
						:partInfoPhotos="partInfoPhotos"
						:isEditing="isEditing"
						:isManager="isManager"
						:workOrderStatus="workOrder?.status"
						@upload="handleFileUpload($event, 'PartInfo')"
						@delete="handleDeleteFile"
					/>

					<!-- SUPPLIER INVOICES TAB (12 photos) -->
					<SupplierInvoicesTab
						v-if="activeTab === 'supplierInvoices'"
						:supplierInvoicePhotos="supplierInvoicePhotos"
						:isEditing="isEditing"
						:isManager="isManager"
						:workOrderStatus="workOrder?.status"
						@upload="handleFileUpload($event, 'SupplierInvoice')"
						@delete="handleDeleteFile"
					/>

					<!-- IMAGES -->
					<ImagesTab
						v-if="activeTab === 'images'"
						:images="images"
						:isEditing="isEditing"
						:isManager="isManager"
						:workOrderStatus="workOrder?.status"
						@upload="uploadJobImage"
						@delete="handleDeleteFile"
						@rename="renameFile"
					/>

					<!-- WORK NOTES -->
					<NotesTab
						v-if="activeTab === 'notes'"
						:workNotes="workNotes"
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
						@upload="handleFileUpload($event, 'Quotation')"
						@delete="handleDeleteFile"
						@edit="openEditQuotation"
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
					/>

					<!-- REPORT -->
					<ReportTab
						v-if="activeTab === 'report'"
						:workOrder="workOrder"
						:reportType="reportType"
						:partsReplaced="partsReplaced"
						:images="images"
						@updateReportType="reportType = $event"
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
									<div class="timeline-item__type">{{ log.activityType }}</div>
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

		<!-- Repeat Work Order Dialog -->
		<Dialog v-model="isRepeatDialogOpen" title="Repeat Work Order" maxWidth="520px">
			<div style="display: flex; flex-direction: column; gap: 16px">
				<p class="text-muted" style="margin: 0; font-size: 13px">
					Create an extended sub-order from
					<strong>{{ workOrder.woNumber }}</strong> (e.g. {{ workOrder.woNumber }}-01).
					Status will be <strong>NEW</strong>.
				</p>

				<Textbox
					v-model="repeatForm.title"
					label="Title (Optional)"
					:placeholder="workOrder.title"
					hide-footer
				/>

				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
					<DatePicker
						v-model="repeatForm.startDate"
						label="New Start Date"
						:enableTime="false"
					/>
					<DatePicker
						v-model="repeatForm.estimatedEndDate"
						label="New Est. End Date"
						:enableTime="false"
					/>
				</div>

				<div class="textbox-field">
					<label class="custom-label">Description (Optional)</label>
					<textarea
						v-model="repeatForm.description"
						class="custom-textarea"
						rows="3"
						:placeholder="workOrder.description"
					></textarea>
				</div>
			</div>
			<template #footer>
				<Button variant="secondary" @click="isRepeatDialogOpen = false">Cancel</Button>
				<Button variant="primary" @click="submitRepeat" :disabled="isRepeating">
					<i
						v-if="isRepeating"
						class="mdi mdi-loading mdi-spin"
						style="margin-right: 4px"
					></i>
					Create Sub-Order
				</Button>
			</template>
		</Dialog>

		<!-- Transfer Work Order Dialog -->
		<Dialog v-model="isTransferDialogOpen" title="Transfer to New Work Order" maxWidth="520px">
			<div style="display: flex; flex-direction: column; gap: 16px">
				<p class="text-muted" style="margin: 0; font-size: 13px">
					Transfer content from <strong>{{ workOrder.woNumber }}</strong> into a brand new
					sequential work order (e.g. WO-0002). Status will be <strong>NEW</strong>.
					Original work order remains unchanged.
				</p>

				<Textbox
					v-model="transferForm.title"
					label="Title (Optional)"
					:placeholder="workOrder.title"
					hide-footer
				/>

				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
					<DatePicker
						v-model="transferForm.startDate"
						label="New Start Date"
						:enableTime="false"
					/>
					<DatePicker
						v-model="transferForm.estimatedEndDate"
						label="New Est. End Date"
						:enableTime="false"
					/>
				</div>

				<div class="textbox-field">
					<label class="custom-label">Description (Optional)</label>
					<textarea
						v-model="transferForm.description"
						class="custom-textarea"
						rows="3"
						:placeholder="workOrder.description"
					></textarea>
				</div>
			</div>
			<template #footer>
				<Button variant="secondary" @click="isTransferDialogOpen = false">Cancel</Button>
				<Button variant="primary" @click="submitTransfer" :disabled="isTransferring">
					<i
						v-if="isTransferring"
						class="mdi mdi-loading mdi-spin"
						style="margin-right: 4px"
					></i>
					Confirm Transfer
				</Button>
			</template>
		</Dialog>

		<!-- Reject Work Order Dialog -->
		<Dialog v-model="isRejectDialogOpen" title="Reject Work Order" maxWidth="500px">
			<div style="display: flex; flex-direction: column; gap: 16px">
				<p class="text-muted" style="margin: 0; font-size: 13px">
					State the reason for rejecting this work order. It will be sent back to the In
					Progress state.
				</p>

				<div class="textbox-field">
					<label class="custom-label">Reason for Rejection *</label>
					<textarea
						v-model="rejectForm.rejectedReason"
						class="custom-textarea"
						rows="3"
						placeholder="Explain why the work is rejected..."
						required
					></textarea>
				</div>
			</div>
			<template #footer>
				<Button variant="secondary" @click="closeRejectDialog">Cancel</Button>
				<Button
					v-slot:default
					variant="primary"
					style="background-color: var(--colors-error); border-color: var(--colors-error)"
					@click="submitReject"
					:disabled="!rejectForm.rejectedReason"
				>
					Reject Work Order
				</Button>
			</template>
		</Dialog>

		<!-- Add/Edit Note Dialog -->
		<Dialog
			v-model="isNoteDialogOpen"
			:title="`${isEditingNote ? 'Edit' : 'Add'} Work Note`"
			maxWidth="500px"
		>
			<div style="display: flex; flex-direction: column; gap: 16px">
				<div class="textbox-field">
					<label class="custom-label">Note Content *</label>
					<textarea
						v-model="noteForm.content"
						class="custom-textarea"
						rows="4"
						placeholder="Enter notes..."
						required
					></textarea>
				</div>

				<div class="select-field">
					<label class="custom-label">View Level *</label>
					<select
						v-model="noteForm.viewLevel"
						style="
							width: 100%;
							padding: 10px;
							border-radius: 6px;
							border: 1px solid var(--colors-border);
							background-color: var(--colors-bg-card);
							color: var(--colors-text-primary);
						"
					>
						<option value="internal">Internal (Team Only)</option>
						<option value="customer">External (Customer Viewable)</option>
					</select>
				</div>
			</div>
			<template #footer>
				<Button variant="secondary" @click="closeNoteDialog">Cancel</Button>
				<Button
					v-slot:default
					variant="primary"
					@click="submitWorkNote"
					:disabled="!noteForm.content"
				>
					Save Note
				</Button>
			</template>
		</Dialog>
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
.alert-info {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	background-color: #ebf5ff;
	color: #1e40af;
	padding: 16px 20px;
	border-radius: 8px;
	border: 1px solid #bfdbfe;
	i {
		font-size: 20px;
		margin-top: -2px;
	}
	span {
		font-size: 14px;
		line-height: 1.5;
	}
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
	.card-header {
		margin-bottom: 24px;
		.header-title-flex {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		h3 {
			margin: 0 0 8px 0;
			font-size: 20px;
			color: var(--colors-text-primary);
		}
		p {
			margin: 0;
			font-size: 14px;
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

@media (max-width: 1024px) {
	.detail-columns-grid {
		grid-template-columns: 1fr;
	}
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
