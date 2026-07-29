<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/components/Button.vue";
import Card from "@/components/Card.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import DatePicker from "@/components/DatePicker.vue";
import Table from "@/components/Table.vue";
import Dialog from "@/components/Dialog.vue";
import GoogleMapPicker from "@/components/GoogleMapPicker.vue";
import NumericField from "@/components/NumericField.vue";
import MultiSelect from "@/components/MultiSelect.vue";
import Badge from "@/components/Badge.vue";
import { workOrderApi } from "@/api/work-order/work-order.api";

const route = useRoute();
const router = useRouter();

const woNumber = route.params.id as string;

// Mock Data
// const steps = [
// 	{ label: "New Request", date: "6 May 2026" },
// 	{ label: "Request Approved", date: "6 May 2026" },
// 	{ label: "In Progress", date: "6 May 2026" },
// 	{ label: "Verifying", date: "" },
// 	{ label: "Completed", date: "" },
// 	{ label: "Payment", date: "" },
// 	{ label: "Closed", date: "" },
// ];

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
	woNumber: woNumber || "WO-00032",
	title: "Loading...",
	status: "InProgress",
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
	// Leader = was Lead Engineer
	leaderCode: "",
	leaderIICode: "",
	// Technicians = was Assistant Engineers
	technicianCodes: [] as string[],
	// Legacy aliases (kept for backwards compat)
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
	servicesProvided: [] as LineItem[],
	partsReplaced: [] as LineItem[],
	images: [] as ImageRecord[],
	cusRefNo: "",
	remarks: "",
});

const loading = ref(false);

function getMockWorkOrderDetails(id: string) {
	const num = id || "WO-00032";
	return {
		guid: num,
		woNumber: num,
		title: num === "WO-00033"
			? "Cooling Tower Piping Assembly & Leak Test"
			: num === "WO-00034"
			? "High Voltage Switchgear Annual Maintenance"
			: num === "WO-00035"
			? "Emergency Water Pump Motor Replacement"
			: num === "WO-00036"
			? "Main Substation Relay Calibration & Inspection"
			: num === "WO-00037"
			? "Boiler Pressure Relief Valve Certification & Testing"
			: "Air Handling Unit 04 Overhaul & Filter Replacement",
		status: num === "WO-00033"
			? "New"
			: num === "WO-00034"
			? "PendingApproval"
			: num === "WO-00035"
			? "Claimed"
			: num === "WO-00036"
			? "Done"
			: num === "WO-00037"
			? "Completed"
			: "InProgress",
		workType: num === "WO-00033" ? "Piping" : num === "WO-00034" || num === "WO-00036" ? "Electrical" : "Maintenance",
		workTypeItem: num === "WO-00033" ? "Piping Installation" : num === "WO-00034" ? "Switchgear Service" : "Overhaul & Repair",
		salesAgent: "usr-2",
		projectPersonInCharge: "usr-3",
		startDate: "2026-05-06T00:00:00Z",
		estimatedEndDate: "2026-05-13T00:00:00Z",
		description: "Scope of work includes comprehensive inspection, mechanical & electrical testing, parts replacement, and final verification.",
		location: "Level 4 Plant Room, Tower 1, Petronas Twin Towers, KLCC",
		siteCode: num === "WO-00033" || num === "WO-00036" ? "FAC-PG" : num === "WO-00035" ? "WH-PJ" : "HQ-KL",
		jobPriority: num === "WO-00035" ? "Low" : num === "WO-00033" || num === "WO-00036" ? "Medium" : "High",
		leaderCode: "usr-1",
		leaderIICode: "usr-2",
		technicianCodes: ["usr-3", "usr-4"],
		leadEngineer: "usr-1",
		assistantEngineers: ["usr-3", "usr-4"],
		customerPic: "Ahmad Rahman",
		customerPicPhone: "+60123456789",
		contractNo: "CTR-2026-9901",
		contractStartDate: "2026-01-01T00:00:00Z",
		contractEndDate: "2026-12-31T00:00:00Z",
		customer: {
			name: num === "WO-00033" || num === "WO-00037" ? "YTL Power Services Sdn Bhd" : num === "WO-00034" || num === "WO-00036" ? "TNB Engineering Corporation" : "Petronas Carigali Sdn Bhd",
			email: "contact@customer.com",
			phone: "+603-23315000",
		},
		equipment: {
			name: "Centrifugal Pump AHU-04",
			serialNo: "SN-998231-X",
			brand: "Grundfos",
			model: "CR 45-3",
			equipmentType: "Mechanical Pump",
		},
		servicesProvided: [],
		partsReplaced: [],
		images: [
			{ id: 101, category: "Before", url: "https://placehold.co/150x150/e2e8f0/64748b?text=Before+1", name: "Before_Inspection_01.jpg" },
			{ id: 102, category: "In Progress", url: "https://placehold.co/150x150/ddd6fe/6d28d9?text=In+Progress+1", name: "In_Progress_01.jpg" },
			{ id: 103, category: "After", url: "https://placehold.co/150x150/dcfce7/15803d?text=After+1", name: "After_Completion_01.jpg" },
		],
		cusRefNo: "REF-88921",
		remarks: "Initial testing completed without anomalies.",
	};
}

async function fetchWorkOrderDetails() {
	if (!woNumber) return;
	loading.value = true;
	try {
		const { data } = await workOrderApi.getWorkOrderByGuid(woNumber);
		if (data && data.data) {
			const w = data.data as any;
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
				equipment: w.equipment ? {
					name: w.equipment.name || "",
					serialNo: w.equipment.serialNo || "",
					brand: w.equipment.brand || "",
					model: w.equipment.model || "",
					equipmentType: w.equipment.equipmentType || "",
				} : { name: "", serialNo: "", brand: "", model: "", equipmentType: "" },
				servicesProvided: w.servicesProvided || [],
				partsReplaced: w.partsReplaced || [],
				images: w.images || [],
				cusRefNo: w.cusRefNo || "",
				remarks: w.remarks || "",
			};
		} else {
			workOrder.value = getMockWorkOrderDetails(woNumber);
		}
	} catch (e) {
		console.warn("Using mock work order details fallback:", e);
		workOrder.value = getMockWorkOrderDetails(woNumber);
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
	if (end < now) return 'Expired';
	const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	if (end <= thirtyDays) return 'ExpiringSoon';
	return 'Active';
});

const users = [
	{ code: "usr-1", name: "Alice Admin" },
	{ code: "usr-2", name: "Bob Sales" },
	{ code: "usr-3", name: "Tommie Parker" },
	{ code: "usr-4", name: "Diana Technician" },
];

const workTypes = [
	{ code: "WT-1", name: "New Assembly" },
	{ code: "WT-2", name: "Repair" },
	{ code: "WT-3", name: "Maintenance" },
];

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
// // Verification approval state (replaces signature)
// const verificationStatus = ref<"pending" | "approved" | "rejected">("pending");
// const verificationRejectionReason = ref("");
// const isShowRejectReasonInput = ref(false);
// 
// function approveVerification() {
// 	verificationStatus.value = "approved";
// 	isShowRejectReasonInput.value = false;
// }
// 
// function showRejectInput() {
// 	isShowRejectReasonInput.value = true;
// }
// 
// function rejectVerification() {
// 	if (!verificationRejectionReason.value.trim()) return;
// 	verificationStatus.value = "rejected";
// 	isShowRejectReasonInput.value = false;
// }

// Extend EndDate Dialog
const isExtendDialogOpen = ref(false);
const extendForm = ref({ newEstimatedEndDate: "", extensionReason: "" });
const isExtending = ref(false);

function openExtendDialog() {
	extendForm.value = {
		newEstimatedEndDate: workOrder.value.estimatedEndDate ? new Date(workOrder.value.estimatedEndDate).toISOString().split('T')[0] : "",
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
			alert(`Failed to extend: ${error.error?.message || 'Unknown error'}`);
		} else {
			alert('Estimated end date extended successfully!');
			isExtendDialogOpen.value = false;
			extendForm.value = { newEstimatedEndDate: '', extensionReason: '' };
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
const repeatForm = ref({ title: '', description: '', startDate: '', estimatedEndDate: '' });
const isRepeating = ref(false);

async function submitRepeat() {
	isRepeating.value = true;
	try {
		const { error } = await workOrderApi.repeat(woNumber, {
			title: repeatForm.value.title || undefined,
			description: repeatForm.value.description || undefined,
			startDate: repeatForm.value.startDate ? new Date(repeatForm.value.startDate).toISOString() : undefined,
			estimatedEndDate: repeatForm.value.estimatedEndDate ? new Date(repeatForm.value.estimatedEndDate).toISOString() : undefined,
		});
		if (error) {
			alert(`Failed to repeat: ${error.error?.message || 'Unknown error'}`);
		} else {
			alert('Work order repeated successfully! A new sub-order has been created.');
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
const transferForm = ref({ title: '', description: '', startDate: '', estimatedEndDate: '' });
const isTransferring = ref(false);

async function submitTransfer() {
	isTransferring.value = true;
	try {
		const { error } = await workOrderApi.transfer(woNumber, {
			title: transferForm.value.title || undefined,
			description: transferForm.value.description || undefined,
			startDate: transferForm.value.startDate ? new Date(transferForm.value.startDate).toISOString() : undefined,
			estimatedEndDate: transferForm.value.estimatedEndDate ? new Date(transferForm.value.estimatedEndDate).toISOString() : undefined,
		});
		if (error) {
			alert(`Failed to transfer: ${error.error?.message || 'Unknown error'}`);
		} else {
			alert('Work order transferred successfully! A new work order has been created.');
			isTransferDialogOpen.value = false;
		}
	} catch (e) {
		console.error(e);
	} finally {
		isTransferring.value = false;
	}
}

// Part Info Photos (12 max)
const partInfoPhotos = ref<ImageRecord[]>([
	{ id: 1, category: 'partInfo', url: 'https://placehold.co/200x200/e2e8f0/64748b?text=Part+1', name: 'Part_IMG_001.jpg' },
	{ id: 2, category: 'partInfo', url: 'https://placehold.co/200x200/ddd6fe/6d28d9?text=Part+2', name: 'Part_IMG_002.jpg' },
]);

const isManager = computed(() => currentUserRole.value === 'Manager');
const isClaimed = computed(() => workOrder.value.status === 'Claimed' || workOrder.value.status === 'claimed');

// function addDummyPartInfoPhoto() {
// 	if (partInfoPhotos.value.length >= 12) return;
// 	partInfoPhotos.value.push({
// 		id: Date.now(),
// 		category: 'partInfo',
// 		url: `https://placehold.co/200x200/e2e8f0/64748b?text=Part+${partInfoPhotos.value.length + 1}`,
// 		name: `Part_IMG_${String(partInfoPhotos.value.length + 1).padStart(3, '0')}.jpg`,
// 	});
// }
// 
// function removePartInfoPhoto(id: number) {
// 	const idx = partInfoPhotos.value.findIndex(p => p.id === id);
// 	if (idx > -1) partInfoPhotos.value.splice(idx, 1);
// }

// Supplier Invoice Photos (12 max)
const supplierInvoicePhotos = ref<ImageRecord[]>([]);

// function addDummySupplierInvoicePhoto() {
// 	if (supplierInvoicePhotos.value.length >= 12) return;
// 	supplierInvoicePhotos.value.push({
// 		id: Date.now(),
// 		category: 'supplierInvoice',
// 		url: `https://placehold.co/200x200/fef3c7/92400e?text=Inv+${supplierInvoicePhotos.value.length + 1}`,
// 		name: `Supplier_INV_${String(supplierInvoicePhotos.value.length + 1).padStart(3, '0')}.jpg`,
// 	});
// }
// 
// function removeSupplierInvoicePhoto(id: number) {
// 	const idx = supplierInvoicePhotos.value.findIndex(p => p.id === id);
// 	if (idx > -1) supplierInvoicePhotos.value.splice(idx, 1);
// }

const priorityColorMap: Record<string, string> = {
	High: '#ef4444',
	Medium: '#f59e0b',
	Low: '#3b82f6',
};

function formatDate(dateStr: string) {
	if (!dateStr) return '—';
	try {
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: '2-digit', month: 'short', year: 'numeric'
		});
	} catch {
		return dateStr;
	}
}

const isItemDialogOpen = ref(false);
const itemDialogType = ref<"service" | "part">("service");
const editingItemId = ref<number | null>(null);
const itemForm = ref({ code: "", name: "", qty: 1, unitPrice: 0 });

const isMapDialogOpen = ref(false);

const maintenanceServices = [
	{ code: "SRV-001", name: "Electrical Inspection", defaultPrice: 150 },
	{ code: "SRV-002", name: "Lighting Replacement", defaultPrice: 75 },
];

const maintenanceParts = [
	{ code: "PRT-001", name: "LED Tube 120cm", defaultPrice: 20 },
	{ code: "PRT-002", name: "Ballast Unit", defaultPrice: 45 },
];

function openItemDialog(type: "service" | "part") {
	itemDialogType.value = type;
	editingItemId.value = null;
	itemForm.value = { code: "", name: "", qty: 1, unitPrice: 0 };
	isItemDialogOpen.value = true;
}

function editItem(type: "service" | "part", id: number) {
	const targetList =
		type === "service" ? workOrder.value.servicesProvided : workOrder.value.partsReplaced;
	const found = targetList.find((x: any) => x.id === id);
	if (found) {
		itemDialogType.value = type;
		editingItemId.value = id;
		itemForm.value = {
			code: found.code,
			name: found.name,
			qty: found.qty,
			unitPrice: found.unitPrice,
		};
		isItemDialogOpen.value = true;
	}
}

function handleItemSelect(code: string) {
	const list = itemDialogType.value === "service" ? maintenanceServices : maintenanceParts;
	const found = list.find((x) => x.code === code);
	if (found) {
		itemForm.value.name = found.name;
		itemForm.value.unitPrice = found.defaultPrice;
	}
}

function addItem() {
	if (!itemForm.value.code) return;
	const subtotal = itemForm.value.qty * itemForm.value.unitPrice;
	const targetList =
		itemDialogType.value === "service"
			? workOrder.value.servicesProvided
			: workOrder.value.partsReplaced;

	if (editingItemId.value) {
		const found = targetList.find((x: any) => x.id === editingItemId.value);
		if (found) {
			found.code = itemForm.value.code;
			found.name = itemForm.value.name;
			found.qty = itemForm.value.qty;
			found.unitPrice = itemForm.value.unitPrice;
			found.subtotal = subtotal;
		}
	} else {
		targetList.push({
			id: Date.now(),
			code: itemForm.value.code,
			name: itemForm.value.name,
			qty: itemForm.value.qty,
			unitPrice: itemForm.value.unitPrice,
			subtotal,
		});
	}

	isItemDialogOpen.value = false;
}

function removeItem(type: "service" | "part", id: number) {
	const targetList =
		type === "service" ? workOrder.value.servicesProvided : workOrder.value.partsReplaced;
	const idx = targetList.findIndex((x: any) => x.id === id);
	if (idx > -1) targetList.splice(idx, 1);
}

const totalServicesCost = computed(() =>
	workOrder.value.servicesProvided.reduce((sum: number, item: any) => sum + item.subtotal, 0),
);
const totalPartsCost = computed(() =>
	workOrder.value.partsReplaced.reduce((sum: number, item: any) => sum + item.subtotal, 0),
);
// const totalCost = computed(() => totalServicesCost.value + totalPartsCost.value);

// Image Logic
// function addDummyImage(category: string) {
// 	const count = workOrder.value.images.filter((img: any) => img.category === category).length;
// 	if (count >= 4) {
// 		alert("Maximum 4 images allowed for " + category);
// 		return;
// 	}
// 	workOrder.value.images.push({
// 		id: Date.now(),
// 		category,
// 		url: "https://placehold.co/150x150/e2e8f0/64748b?text=Image",
// 		name: `IMG_${Date.now().toString().slice(-4)}.jpg`,
// 	});
// }
// function removeImage(id: number) {
// 	const idx = workOrder.value.images.findIndex((img: any) => img.id === id);
// 	if (idx > -1) workOrder.value.images.splice(idx, 1);
// }

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

const tableHeaders = [
	{ key: "name", label: "Item Name" },
	{ key: "qty", label: "Quantity" },
	{ key: "unitPrice", label: "Unit Price ($)" },
	{ key: "subtotal", label: "Subtotal ($)" },
	{ key: "actions", label: "Actions", width: "100px" },
];



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
		const docDate = quotationForm.value.date ? new Date(quotationForm.value.date).toISOString() : undefined;
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
		const docDate = invoiceForm.value.date ? new Date(invoiceForm.value.date).toISOString() : undefined;
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

// function simulateInvoiceOCR() {
// 	isUploadingNewInvoice.value = true;
// 	setTimeout(() => {
// 		invoiceForm.value = {
// 			refNo: `INV-2026-${100 + invoices.value.length + 1}`,
// 			date: new Date().toLocaleDateString("en-GB", {
// 				day: "2-digit",
// 				month: "short",
// 				year: "numeric",
// 			}),
// 			amount: 4500,
// 			name: `Invoice_${Date.now()}.pdf`,
// 		};
// 		isUploadingNewInvoice.value = false;
// 	}, 1500);
// }
// 
// function addPayment() {
// 	if (!paymentForm.value.amount || !paymentForm.value.date) return;
// 	payments.value.push({
// 		id: Date.now(),
// 		date: paymentForm.value.date,
// 		amount: paymentForm.value.amount,
// 		method: paymentForm.value.method,
// 		reference: paymentForm.value.reference,
// 		fileName: paymentForm.value.fileName,
// 	});
// 	isAddPaymentDialogOpen.value = false;
// 	paymentForm.value = {
// 		date: "",
// 		amount: 0,
// 		method: "Bank Transfer",
// 		reference: "",
// 		fileName: "",
// 	};
// }
// 
// function simulatePaymentFileUpload() {
// 	paymentForm.value.fileName = `Receipt_${Date.now()}.pdf`;
// }

// function removePayment(id: number) {
// 	const idx = payments.value.findIndex((pay) => pay.id === id);
// 	if (idx > -1) payments.value.splice(idx, 1);
// }

async function markAsClaimed() {
	if (!isFullyPaid.value) return;
	try {
		const { error } = await workOrderApi.claim(woNumber, { invoiceAmount: totalInvoiceIssued.value });
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
		{ label: "Pending Approval", date: w?.requestApprovalDate ? formatDateString(w.requestApprovalDate) : "" },
		{ label: "In Progress", date: w?.approvedDate ? formatDateString(w.approvedDate) : "" },
		{ label: "Verifying", date: w?.doneDate ? formatDateString(w.doneDate) : "" },
		{ label: "Completed", date: w?.completedDate ? formatDateString(w.completedDate) : "" },
		{ label: "Payment", date: activityLogs.value.find(log => log.newStatus === "Claimed")?.createdAt ? formatDateString(activityLogs.value.find(log => log.newStatus === "Claimed")?.createdAt) : "" },
		{ label: "Closed", date: w?.closedDate ? formatDateString(w.closedDate) : "" },
	];
});

// fetchActivityLogs
async function fetchActivityLogs() {
	if (!woNumber) return;
	try {
		const { data } = await workOrderApi.getActivities(woNumber);
		if (data && data.data && Array.isArray(data.data)) {
			activityLogs.value = data.data;
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
		if (data && Array.isArray(data.items)) {
			const items = data.items;
			partInfoPhotos.value = items
				.filter((f: any) => f.category === "PartInfo")
				.map((f: any) => ({
					id: f.id,
					guid: f.guid,
					category: f.category,
					url: f.storageUrl,
					name: f.fileName,
				}));

			supplierInvoicePhotos.value = items
				.filter((f: any) => f.category === "SupplierInvoice")
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
		if (data && data.data && Array.isArray(data.data)) {
			workNotes.value = data.data;
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
	if (!confirm("Are you sure you want to approve this work order? This will transition it to Completed state.")) return;
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
async function handleFileUpload(event: Event, category: string, subcategory?: string, extra?: Record<string, any>) {
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
			alert(`Upload failed: ${resData.error.message || 'Unknown error'}`);
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

// Job Images specific helpers
const currentUploadingImageCategory = ref("Before");
const imageInput = ref<HTMLInputElement | null>(null);
const cameraInput = ref<HTMLInputElement | null>(null);
const partInfoInput = ref<HTMLInputElement | null>(null);
const supplierInvoiceInput = ref<HTMLInputElement | null>(null);
const invoiceInput = ref<HTMLInputElement | null>(null);
const paymentInput = ref<HTMLInputElement | null>(null);
const quotationInput = ref<HTMLInputElement | null>(null);

function triggerImageUpload(cat: string) {
	currentUploadingImageCategory.value = cat;
	if (imageInput.value) {
		imageInput.value.click();
	}
}

function triggerCameraUpload(cat: string) {
	currentUploadingImageCategory.value = cat;
	if (cameraInput.value) {
		cameraInput.value.click();
	}
}

function uploadJobImage(event: Event) {
	handleFileUpload(event, "Image", currentUploadingImageCategory.value);
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
				<div class="breadcrumb">
					<span class="text-muted">Work Order</span>
					<i class="mdi mdi-chevron-right text-muted"></i>
					<span class="text-muted">{{ formatStatusLabel(breadcrumbStatus) }}</span>
					<i class="mdi mdi-chevron-right text-muted"></i>
					<span class="fw-500">View Details</span>
				</div>
				<div class="header-title-row">
					<h2>{{ workOrder.woNumber }} - {{ workOrder.title }}</h2>
					<Badge v-if="workOrder.status" :type="getStatusChipType(workOrder.status) as any">
						{{ formatStatusLabel(workOrder.status) }}
					</Badge>
				</div>
			</div>
			<div class="header-actions">
				<Button variant="outlined" @click="router.push('/work-order')">
					<i class="mdi mdi-chevron-left" style="margin-right: 4px"></i> Back
				</Button>
				<!-- Save Changes for InProgress state -->
				<Button variant="outlined" @click="saveGeneralFormChanges" v-if="workOrder?.status === 'InProgress'" title="Save changes to General Information">
					<i class="mdi mdi-content-save-outline" style="margin-right: 4px"></i> Save Changes
				</Button>
				<!-- Approve / Reject for Done state -->
				<template v-if="workOrder?.status === 'Done' && isManager">
					<Button variant="primary" style="background-color: var(--colors-success); border-color: var(--colors-success);" @click="approveDoneWorkOrder">
						<i class="mdi mdi-check-circle-outline" style="margin-right: 4px"></i> Approve
					</Button>
					<Button variant="outlined" style="color: var(--colors-error); border-color: var(--colors-error);" @click="openRejectDoneDialog">
						<i class="mdi mdi-close-circle-outline" style="margin-right: 4px"></i> Reject
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
				<span>Services, parts, images, work notes, and quotation tab are opened. Mark the work order as done if ready.</span>
			</div>

			<!-- Warning Alert for Rejection Reason if state is InProgress -->
			<div class="alert-box alert-warning" v-if="workOrder?.status === 'InProgress' && workOrder?.rejectedReason">
				<i class="mdi mdi-alert-circle"></i>
				<span>This work order was rejected back to In Progress. Reason: <strong>{{ workOrder.rejectedReason }}</strong></span>
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
				<!-- GENERAL TAB -->
				<div v-if="activeTab === 'general'">
					<div class="card-header">
						<div class="header-title-flex">
							<h3>Work Order Details</h3>
							<Button
								variant="primary"
								style="
									background-color: var(--colors-brand-primary);
									padding: 4px 12px;
									font-size: 12px;
									border-radius: 16px;
								"
							>
								<i class="mdi mdi-pipe" style="margin-right: 4px"></i> PIPING
							</Button>
						</div>
						<p class="text-muted">
							Set the work order type and assign the right schedule and resources.
						</p>
					</div>

					<div class="form-grid">
						<div class="col-12"><h4 class="section-title">General Information</h4></div>
						<div class="col-12">
							<Select
								v-model="workOrder.workTypeItem"
								label="Work Type Item *"
								disabled
							>
								<option v-for="wt in workTypes" :key="wt.code" :value="wt.name">
									{{ wt.name }}
								</option>
							</Select>
						</div>
						<div class="col-12">
							<Textbox v-model="workOrder.title" label="Title *" disabled />
						</div>

						<!-- Job Priority + Site -->
						<div class="col-6">
							<label class="custom-label">Job Priority</label>
							<div class="priority-badge-row">
								<span
									class="priority-dot"
									:style="{ backgroundColor: priorityColorMap[workOrder.jobPriority] || '#3b82f6' }"
								></span>
								<span class="priority-label">{{ workOrder.jobPriority || 'Low' }}</span>
							</div>
						</div>
						<div class="col-6">
							<label class="custom-label">Site</label>
							<div class="read-only-val">
								<i class="mdi mdi-map-marker" style="margin-right: 4px; color: var(--colors-brand-primary)"></i>
								{{ workOrder.siteCode || '—' }}
							</div>
						</div>

						<div class="col-6">
							<Select v-model="workOrder.salesAgent" label="Sales Agent" disabled>
								<option value="">Select Sales Agent</option>
								<option v-for="u in users" :key="u.code" :value="u.code">
									{{ u.name }}
								</option>
							</Select>
						</div>
						<div class="col-6">
							<Select
								v-model="workOrder.projectPersonInCharge"
								style="flex-grow: 1"
								:disabled="!isEditing"
							>
								<template #label>
									Project Person In Charge
									<i
										class="mdi mdi-information text-primary"
										style="margin-left: 4px; font-size: 14px"
										title="This is the primary point of contact for this work order"
									></i>
								</template>
								<option v-for="u in users" :key="u.code" :value="u.code">
									{{ u.name }}
								</option>
							</Select>
						</div>
						<div class="col-6">
							<DatePicker
								v-model="workOrder.startDate"
								label="Start Date *"
								:enableTime="false"
								disabled
							/>
						</div>
						<div class="col-6">
							<div style="display: flex; gap: 8px; align-items: flex-end;">
								<DatePicker
									v-model="workOrder.estimatedEndDate"
									label="Estimated Date of Completion *"
									:enableTime="false"
									disabled
									style="flex-grow: 1"
								/>
								<Button
									v-if="isEditing"
									variant="outlined"
									style="padding: 10px 14px; height: 42px; display: flex; align-items: center; justify-content: center; gap: 4px;"
									@click="openExtendDialog"
									title="Extend End Date"
								>
									<i class="mdi mdi-calendar-plus"></i> Extend
								</Button>
							</div>
							<div class="extended-count-badge" v-if="workOrder?.extendedCount > 0" style="margin-top: 6px; font-size: 12px; color: var(--colors-brand-primary); display: flex; align-items: center; gap: 4px;">
								<i class="mdi mdi-history"></i>
								Extended {{ workOrder.extendedCount }} times
							</div>
						</div>

						<!-- Execution Details -->
						<div class="col-12">
							<h4 class="section-title" style="margin-top: 16px">
								Execution Details
							</h4>
						</div>
						<div class="col-6">
							<Select
								v-model="workOrder.leaderCode"
								label="Leader"
								:disabled="!isEditing"
							>
								<option value="">Select Leader</option>
								<option
									v-for="u in users"
									:key="u.code"
									:value="u.code"
									:disabled="workOrder.technicianCodes.includes(u.code)"
								>
									{{ u.name }}
								</option>
							</Select>
						</div>
						<div class="col-6">
							<Select
								v-model="workOrder.leaderIICode"
								label="Leader II"
								:disabled="!isEditing"
							>
								<option value="">Select Leader II</option>
								<option
									v-for="u in users"
									:key="u.code"
									:value="u.code"
									:disabled="u.code === workOrder.leaderCode"
								>
									{{ u.name }}
								</option>
							</Select>
						</div>
						<div class="col-6">
							<Textbox
								v-model="workOrder.location"
								label="Location"
								:disabled="!isEditing"
							>
								<template #suffix>
									<button
										class="btn-icon-map"
										@click="isMapDialogOpen = true"
										title="View Map"
										:disabled="!isEditing"
									>
										<i class="mdi mdi-map-marker"></i>
									</button>
								</template>
							</Textbox>
						</div>
						<div class="col-12">
							<MultiSelect
								v-model="workOrder.technicianCodes"
								:options="
									users.filter(
										(u) =>
											u.code !== workOrder.leaderCode &&
											u.code !== workOrder.leaderIICode &&
											u.code !== workOrder.projectPersonInCharge,
									)
								"
								label="Technicians"
								placeholder="Search to add technicians..."
								:disabled="!isEditing"
							/>
						</div>

						<!-- Customer & Contract (Read-Only) -->
						<div class="col-12">
							<h4 class="section-title" style="margin-top: 16px">
								Customer & Contract (Read-Only)
							</h4>
						</div>
						<div class="col-4">
							<label class="custom-label">Customer Name</label>
							<div class="read-only-val">{{ workOrder.customer.name }}</div>
						</div>
						<div class="col-4">
							<label class="custom-label">Customer PIC</label>
							<div class="read-only-val">{{ workOrder.customerPic || '—' }}</div>
						</div>
						<div class="col-4">
							<label class="custom-label">PIC Phone</label>
							<div class="read-only-val">{{ workOrder.customerPicPhone || '—' }}</div>
						</div>
						<div class="col-4">
							<label class="custom-label">Contract No.</label>
							<div class="read-only-val" style="display: flex; align-items: center; gap: 8px;">
								<span>{{ workOrder.contractNo || '—' }}</span>
								<Badge v-if="contractStatus === 'Expired'" type="error" icon="mdi-alert-circle">
									Contract Expired
								</Badge>
								<Badge v-else-if="contractStatus === 'ExpiringSoon'" type="warning" icon="mdi-clock-alert-outline">
									Expiring Soon
								</Badge>
							</div>
						</div>
						<div class="col-4">
							<label class="custom-label">Contract Start</label>
							<div class="read-only-val">{{ formatDate(workOrder.contractStartDate) }}</div>
						</div>
						<div class="col-4">
							<label class="custom-label">Contract End</label>
							<div class="read-only-val">{{ formatDate(workOrder.contractEndDate) }}</div>
						</div>
						<div class="col-4">
							<label class="custom-label">Equipment Name</label>
							<div class="read-only-val">{{ workOrder.equipment.name }}</div>
						</div>
						<div class="col-4">
							<label class="custom-label">Serial Number</label>
							<div class="read-only-val">{{ workOrder.equipment.serialNo }}</div>
						</div>
					</div>
				</div>

				<!-- SERVICES PROVIDED -->
				<div v-if="activeTab === 'services'">
					<div
						class="card-header"
						style="display: flex; justify-content: space-between; align-items: center"
					>
						<div>
							<h3>Services Provided</h3>
							<p class="text-muted">
								Manage the services executed during this work order.
							</p>
						</div>
						<Button
							v-if="isEditing"
							variant="primary"
							@click="openItemDialog('service')"
						>
							<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Service
						</Button>
					</div>

					<Table :items="workOrder.servicesProvided" :headers="tableHeaders">
						<template #item-subtotal="{ item }"
							>${{ item.subtotal.toFixed(2) }}</template
						>
						<template #item-unitPrice="{ item }"
							>${{ item.unitPrice.toFixed(2) }}</template
						>
						<template #item-actions="{ item }">
							<div style="display: flex; gap: 8px" v-if="isEditing">
								<Button
									variant="outlined"
									@click="editItem('service', item.id)"
									style="padding: 4px 8px; font-size: 16px"
								>
									<i class="mdi mdi-pencil"></i>
								</Button>
								<Button
									variant="danger"
									@click="removeItem('service', item.id)"
									style="padding: 4px 8px; font-size: 16px"
								>
									<i class="mdi mdi-delete"></i>
								</Button>
							</div>
						</template>
					</Table>
					<div class="table-total">
						<strong>Total Services:</strong> ${{ totalServicesCost.toFixed(2) }}
					</div>
				</div>

				<!-- PARTS REPLACED -->
				<div v-if="activeTab === 'parts'">
					<div
						class="card-header"
						style="display: flex; justify-content: space-between; align-items: center"
					>
						<div>
							<h3>Parts Replaced</h3>
							<p class="text-muted">Manage the parts consumed from inventory.</p>
						</div>
						<Button v-if="isEditing" variant="primary" @click="openItemDialog('part')">
							<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Part
						</Button>
					</div>

					<Table :items="workOrder.partsReplaced" :headers="tableHeaders">
						<template #item-subtotal="{ item }"
							>${{ item.subtotal.toFixed(2) }}</template
						>
						<template #item-unitPrice="{ item }"
							>${{ item.unitPrice.toFixed(2) }}</template
						>
						<template #item-actions="{ item }">
							<div style="display: flex; gap: 8px" v-if="isEditing">
								<Button
									variant="outlined"
									@click="editItem('part', item.id)"
									style="padding: 4px 8px; font-size: 16px"
								>
									<i class="mdi mdi-pencil"></i>
								</Button>
								<Button
									variant="danger"
									@click="removeItem('part', item.id)"
									style="padding: 4px 8px; font-size: 16px"
								>
									<i class="mdi mdi-delete"></i>
								</Button>
							</div>
						</template>
					</Table>
					<div class="table-total">
						<strong>Total Parts:</strong> ${{ totalPartsCost.toFixed(2) }}
					</div>
				</div>

			<!-- PART INFO TAB (12 photos) -->
			<div v-if="activeTab === 'partInfo'">
				<div class="card-header" style="display: flex; justify-content: space-between; align-items: center">
					<div>
						<h3>Part Info</h3>
						<p class="text-muted">Upload up to 12 photos of parts, components, and job-related materials.</p>
					</div>
					<div style="display: flex; align-items: center; gap: 12px">
						<span class="photo-counter-badge">{{ partInfoPhotos.length }}/12 Photos</span>
						<input type="file" ref="partInfoInput" style="display: none;" @change="handleFileUpload($event, 'PartInfo')" accept="image/*" />
						<Button
							v-slot:default
							v-if="isEditing || (isManager && workOrder?.status === 'Claimed')"
							variant="primary"
							@click="partInfoInput?.click()"
							:disabled="partInfoPhotos.length >= 12"
						>
							<i class="mdi mdi-camera-plus" style="margin-right: 4px"></i> Add Photo
						</Button>
					</div>
				</div>
				<div class="photo-grid-12">
					<div
						v-for="photo in partInfoPhotos"
						:key="photo.id"
						class="photo-slot"
					>
						<div class="photo-slot__img-wrap">
							<img :src="photo.url" :alt="photo.name" class="photo-slot__img" />
							<button
								v-if="isEditing || (isManager && workOrder?.status === 'Claimed')"
								@click="handleDeleteFile(photo.guid || '')"
								title="Remove photo"
							>
								<i class="mdi mdi-close"></i>
							</button>
						</div>
						<div class="photo-slot__name">{{ photo.name }}</div>
					</div>
					<div
						v-if="(isEditing || (isManager && workOrder?.status === 'Claimed')) && partInfoPhotos.length < 12"
						class="photo-slot photo-slot--add"
						@click="partInfoInput?.click()"
					>
						<i class="mdi mdi-camera-plus"></i>
						<span>Upload Photo</span>
					</div>
					<div v-if="partInfoPhotos.length === 0 && !isEditing && workOrder?.status !== 'Claimed'" class="photo-grid-empty">
						<i class="mdi mdi-image-off"></i>
						<p>No part info photos uploaded yet.</p>
					</div>
				</div>
			</div>

			<!-- SUPPLIER INVOICES TAB (12 photos) -->
			<div v-if="activeTab === 'supplierInvoices'">
				<div class="card-header" style="display: flex; justify-content: space-between; align-items: center">
					<div>
						<h3>Supplier Invoices</h3>
						<p class="text-muted">Upload up to 12 supplier invoice photos or scanned documents.</p>
					</div>
					<div style="display: flex; align-items: center; gap: 12px">
						<span class="photo-counter-badge">{{ supplierInvoicePhotos.length }}/12 Files</span>
						<input type="file" ref="supplierInvoiceInput" style="display: none;" @change="handleFileUpload($event, 'SupplierInvoice')" accept="image/*,application/pdf" />
						<Button
							v-slot:default
							v-if="isEditing || (isManager && workOrder?.status === 'Claimed')"
							variant="primary"
							@click="supplierInvoiceInput?.click()"
							:disabled="supplierInvoicePhotos.length >= 12"
						>
							<i class="mdi mdi-file-upload" style="margin-right: 4px"></i> Add Invoice
						</Button>
					</div>
				</div>
				<div class="photo-grid-12">
					<div
						v-for="photo in supplierInvoicePhotos"
						:key="photo.id"
						class="photo-slot"
					>
						<div class="photo-slot__img-wrap">
							<img :src="photo.url" :alt="photo.name" class="photo-slot__img" />
							<button
								v-if="isEditing || (isManager && workOrder?.status === 'Claimed')"
								class="photo-slot__del"
								@click="handleDeleteFile(photo.guid || '')"
								title="Remove invoice"
							>
								<i class="mdi mdi-close"></i>
							</button>
						</div>
						<div class="photo-slot__name">{{ photo.name }}</div>
					</div>
					<div
						v-if="(isEditing || (isManager && workOrder?.status === 'Claimed')) && supplierInvoicePhotos.length < 12"
						class="photo-slot photo-slot--add"
						@click="supplierInvoiceInput?.click()"
					>
						<i class="mdi mdi-file-plus"></i>
						<span>Upload Invoice</span>
					</div>
					<div v-if="supplierInvoicePhotos.length === 0 && !isEditing && workOrder?.status !== 'Claimed'" class="photo-grid-empty">
						<i class="mdi mdi-file-document-outline"></i>
						<p>No supplier invoices uploaded yet.</p>
					</div>
				</div>
			</div>

				<!-- IMAGES -->
				<div v-if="activeTab === 'images'">
					<div class="card-header">
						<h3>Job Images</h3>
						<p class="text-muted">
							Upload and rename photos for each stage of the job.
						</p>
					</div>
					
					<!-- Hidden file inputs -->
					<input type="file" ref="imageInput" style="display: none;" @change="uploadJobImage" accept="image/*" />
					<input type="file" ref="cameraInput" style="display: none;" @change="uploadJobImage" accept="image/*" capture="environment" />

					<div class="image-categories">
						<div
							class="image-category"
							v-for="cat in ['Before', 'In Progress', 'After']"
							:key="cat"
						>
							<h4>
								{{ cat }}
								<small class="text-muted"
									>({{
										images.filter((i: any) => i.category === cat).length
									}}/4)</small
								>
							</h4>
							<div class="image-grid">
								<div
									class="image-card"
									v-for="img in images.filter(
										(i: any) => i.category === cat,
									)"
									:key="img.id"
								>
									<div
										class="image-preview"
										:style="{ backgroundImage: `url(${img.url})` }"
									>
										<button
											v-if="isEditing || (isManager && workOrder?.status === 'Claimed')"
											class="del-btn"
											@click="handleDeleteFile(img.guid || '')"
										>
											<i class="mdi mdi-close"></i>
										</button>
									</div>
									<input
										v-if="isEditing"
										type="text"
										v-model="img.name"
										class="image-name-input"
										@blur="renameFile(img)"
									/>
									<div v-else class="image-name-display">{{ img.name }}</div>
								</div>
								<div
									class="image-placeholder-split"
									v-if="
										isEditing &&
										images.filter((i: any) => i.category === cat).length < 4
									"
								>
									<div class="split-btn" @click="triggerImageUpload(cat)">
										<i class="mdi mdi-image-plus"></i>
										<span>Upload</span>
									</div>
									<div class="split-btn split-btn--camera" @click="triggerCameraUpload(cat)">
										<i class="mdi mdi-camera"></i>
										<span>Camera</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- WORK NOTES -->
				<div v-if="activeTab === 'notes'">
					<div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
						<div>
							<h3>Work Notes ({{ workNotes.length }})</h3>
							<p class="text-muted">Team-only internal discussions vs. external notes shared with the customer.</p>
						</div>
						<Button
							v-slot:default
							v-if="workOrder?.status === 'InProgress'"
							variant="primary"
							@click="openAddNoteDialog"
						>
							<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Note
						</Button>
					</div>

					<div class="alert-box alert-info" style="margin-bottom: 20px;">
						<i class="mdi mdi-information"></i>
						<span>Use <strong>Internal</strong> for team-only discussion and <strong>External</strong> for notes shared with the Customer.</span>
					</div>

					<div v-if="workNotes.length === 0" class="empty-notes-box">
						<i class="mdi mdi-note-text-outline" style="font-size: 36px; color: var(--colors-text-muted);"></i>
						<p class="text-muted" style="margin-top: 8px;">No work notes added yet.</p>
					</div>
					<div v-else class="notes-list">
						<div v-for="note in workNotes" :key="note.guid" class="note-card">
							<div class="note-card__header">
								<div class="note-card__meta">
									<strong class="note-card__author">{{ note.createdBy || 'System' }}</strong>
									<span class="note-card__date">{{ formatDateString(note.createdAt) }}</span>
									<span :class="['note-badge', note.viewLevel === 'internal' ? 'note-badge--internal' : 'note-badge--external']">
										{{ note.viewLevel === 'internal' ? 'Internal' : 'External' }}
									</span>
								</div>
								<div class="note-card__actions" v-if="workOrder?.status === 'InProgress'">
									<button class="note-btn note-btn--edit" @click="openEditNoteDialog(note)" title="Edit note">
										<i class="mdi mdi-pencil-outline"></i>
									</button>
									<button class="note-btn note-btn--delete" @click="deleteWorkNote(note.guid)" title="Delete note">
										<i class="mdi mdi-trash-can-outline"></i>
									</button>
								</div>
							</div>
							<div class="note-card__content">{{ note.content }}</div>
						</div>
					</div>
				</div>

				<!-- FINANCE -->
				<div v-if="activeTab === 'finance'">
					<div
						class="card-header"
						style="
							display: flex;
							justify-content: space-between;
							align-items: flex-start;
						"
					>
						<div>
							<h3>Finance & Quotation</h3>
							<p class="text-muted">
								Manage quotation documents and track cost summary.
							</p>
						</div>
					</div>

					<!-- Hidden quotation file input -->
					<input type="file" ref="quotationInput" style="display: none;" @change="handleFileUpload($event, 'Quotation')" accept="application/pdf,image/*" />

					<!-- Quotations Section -->
					<div class="payment-section">
						<div class="payment-section__header">
							<div>
								<h4 class="payment-section__title">
									<i class="mdi mdi-file-document-multiple"></i> Quotations
								</h4>
								<p class="text-muted" style="font-size: 13px; margin: 4px 0 0 0">
									{{ quotations.length }} quotation(s) totalling ${{
										totalQuotationAmount.toFixed(2)
									}}
								</p>
							</div>
							<Button variant="primary" @click="quotationInput?.click()" v-if="workOrder?.status === 'InProgress'">
								<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Quotation
							</Button>
						</div>

						<div v-if="quotations.length === 0" class="payment-empty-state">
							<i class="mdi mdi-file-document-outline"></i>
							<p>
								No quotations added yet. Click "Add Quotation" to upload and scan a
								quotation PDF.
							</p>
						</div>

						<div class="invoice-list" v-else>
							<div v-for="qt in quotations" :key="qt.id" class="document-card">
								<div class="doc-icon">
									<i
										class="mdi mdi-file-pdf-box text-danger"
										style="font-size: 32px"
									></i>
								</div>
								<div class="doc-info">
									<h4>{{ qt.name }}</h4>
									<div class="ocr-details">
										<div class="ocr-field">
											<span class="label">Ref No:</span>
											<span class="value">{{ qt.refNo }}</span>
										</div>
										<div class="ocr-field">
											<span class="label">Date Issued:</span>
											<span class="value">{{ qt.date }}</span>
										</div>
										<div class="ocr-field">
											<span class="label">Amount:</span>
											<span class="value text-primary font-weight-bold"
												>${{ qt.amount.toFixed(2) }}</span
											>
										</div>
									</div>
								</div>
								<div class="doc-actions" v-if="workOrder?.status === 'InProgress'">
									<button
										class="btn-icon"
										@click="openEditQuotation(qt.guid || '')"
										title="Edit Details"
									>
										<i class="mdi mdi-pencil" style="font-size: 18px"></i>
									</button>
									<button
										class="btn-icon"
										@click="handleDeleteFile(qt.guid || '')"
										title="Remove Quotation"
									>
										<i class="mdi mdi-delete" style="font-size: 20px"></i>
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- VERIFICATION -->
				<div v-if="activeTab === 'verification'">
					<div
						class="card-header"
						style="display: flex; justify-content: space-between; align-items: center"
					>
						<div>
							<h3>Verification & Approval</h3>
							<p class="text-muted">
								Manager verification and approval of completed work. No signature upload required.
							</p>
						</div>
						<div class="role-selector">
							<label style="margin-right: 8px; font-size: 14px">Simulate Role:</label>
							<select
								v-model="currentUserRole"
								style="
									padding: 4px 8px;
									border-radius: 4px;
									border: 1px solid var(--colors-surface-border);
								"
							>
								<option value="Manager">Manager</option>
								<option value="Technician">Non-Manager</option>
							</select>
						</div>
					</div>

					<div
						class="verification-content"
						style="
							padding: 24px;
							border: 1px solid var(--colors-surface-border);
							border-radius: 8px;
							background: var(--colors-surface-background);
						"
					>
						<div v-if="workOrder?.status === 'Done'">
							<div class="verification-actions-box" v-if="isManager">
								<div class="verification-actions-box__icon">
									<i class="mdi mdi-shield-check-outline"></i>
								</div>
								<h4>Manager Approval Required</h4>
								<p class="text-muted">Review the work order details, photos, and notes before making a decision.</p>

								<div class="verification-buttons-row" style="margin-top: 16px; display: flex; gap: 12px; justify-content: center;">
									<Button variant="primary" @click="approveDoneWorkOrder" style="min-width: 140px;">
										<i class="mdi mdi-check-circle" style="margin-right: 6px"></i> Approve
									</Button>
									<Button variant="danger" @click="openRejectDoneDialog" style="min-width: 140px;">
										<i class="mdi mdi-close-circle" style="margin-right: 6px"></i> Reject
									</Button>
								</div>
							</div>
							<div v-else style="text-align: center; padding: 32px 16px">
								<i class="mdi mdi-clock-outline" style="font-size: 52px; color: var(--colors-brand-primary)"></i>
								<h4 style="margin: 8px 0 4px 0;">Awaiting Manager Verification</h4>
								<p class="text-muted" style="margin: 0">The work order has been marked as done and is pending manager approval.</p>
							</div>
						</div>
						<div v-else-if="currentStepIndex >= 4">
							<div class="verification-result-box verification-result-box--approved" style="text-align: center; padding: 32px 16px">
								<i class="mdi mdi-check-decagram" style="font-size: 52px; color: #10b981"></i>
								<h4 style="margin: 8px 0 4px 0; color: var(--colors-text-primary)">Work Order Approved</h4>
								<p class="text-muted" style="margin: 0">Approved by Manager level on {{ formatDateString(workOrder.completedDate) }}</p>
							</div>
						</div>
						<div v-else>
							<div class="verification-result-box" style="text-align: center; padding: 32px 16px">
								<i class="mdi mdi-information-outline" style="font-size: 52px; color: var(--colors-text-muted)"></i>
								<h4 style="margin: 8px 0 4px 0;">No Verification Pending</h4>
								<p class="text-muted" style="margin: 0">Verification is only required when the work order is marked as done.</p>
							</div>
						</div>
					</div>
				</div>

				<!-- PAYMENT -->
				<div v-if="activeTab === 'payment'">
					<div
						class="card-header"
						style="
							display: flex;
							justify-content: space-between;
							align-items: flex-start;
						"
					>
						<div>
							<h3>Payment</h3>
							<p class="text-muted">Manage invoices issued and payments received.</p>
						</div>
						<!-- Payment status badge -->
						<div
							v-if="invoices.length > 0"
							class="payment-status-badge"
							:class="isFullyPaid ? 'badge-paid' : 'badge-pending'"
						>
							<i
								:class="
									isFullyPaid ? 'mdi mdi-check-circle' : 'mdi mdi-clock-outline'
								"
							></i>
							{{ isFullyPaid ? "Fully Paid" : "Payment Pending" }}
						</div>
					</div>

					<!-- Payment Summary Bar -->
					<div class="payment-summary-bar" v-if="invoices.length > 0">
						<div class="psum-item">
							<span class="psum-label">Total Invoice Issued</span>
							<span class="psum-value">${{ totalInvoiceIssued.toFixed(2) }}</span>
						</div>
						<div class="psum-divider"></div>
						<div class="psum-item">
							<span class="psum-label">Total Payment Received</span>
							<span class="psum-value psum-value--paid"
								>${{ totalPaymentReceived.toFixed(2) }}</span
							>
						</div>
						<div class="psum-divider"></div>
						<div class="psum-item">
							<span class="psum-label">Balance Remaining</span>
							<span
								class="psum-value"
								:class="
									balanceRemaining <= 0 ? 'psum-value--zero' : 'psum-value--due'
								"
							>
								${{ Math.max(0, balanceRemaining).toFixed(2) }}
							</span>
						</div>
					</div>

					<!-- Invoices Section -->
					<div class="payment-section">
						<div class="payment-section__header">
							<div>
								<h4 class="payment-section__title">
									<i class="mdi mdi-file-document-multiple"></i> Invoices Issued
								</h4>
								<p class="text-muted" style="font-size: 13px; margin: 4px 0 0 0">
									{{ invoices.length }} invoice(s) totalling ${{
										totalInvoiceIssued.toFixed(2)
									}}
								</p>
							</div>
							<input type="file" ref="invoiceInput" style="display: none;" @change="handleFileUpload($event, 'Invoice')" accept="application/pdf,image/*" />
							<Button variant="primary" @click="invoiceInput?.click()" v-if="workOrder?.status === 'Completed' || workOrder?.status === 'Claimed'">
								<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Invoice
							</Button>
						</div>

						<div v-if="invoices.length === 0" class="payment-empty-state">
							<i class="mdi mdi-file-document-outline"></i>
							<p>No invoices added yet. Click "Add Invoice" to get started.</p>
						</div>

						<div class="invoice-list" v-else>
							<div v-for="inv in invoices" :key="inv.id" class="document-card">
								<div class="doc-icon">
									<i
										class="mdi mdi-file-pdf-box text-danger"
										style="font-size: 32px"
									></i>
								</div>
								<div class="doc-info">
									<h4>{{ inv.name }}</h4>
									<div class="ocr-details">
										<div class="ocr-field">
											<span class="label">Invoice No:</span>
											<span class="value">{{ inv.refNo }}</span>
										</div>
										<div class="ocr-field">
											<span class="label">Date Issued:</span>
											<span class="value">{{ inv.date }}</span>
										</div>
										<div class="ocr-field">
											<span class="label">Amount:</span>
											<span class="value text-primary font-weight-bold"
												>${{ inv.amount.toFixed(2) }}</span
											>
										</div>
									</div>
								</div>
								<div class="doc-actions" v-if="workOrder?.status === 'Completed' || workOrder?.status === 'Claimed'">
									<button
										class="btn-icon"
										@click="openEditInvoice(inv.guid || '')"
										title="Edit Details"
									>
										<i class="mdi mdi-pencil" style="font-size: 18px"></i>
									</button>
									<button
										class="btn-icon"
										@click="handleDeleteFile(inv.guid || '')"
										title="Remove Invoice"
									>
										<i class="mdi mdi-delete" style="font-size: 20px"></i>
									</button>
								</div>
							</div>
						</div>
					</div>

					<!-- Payments Section -->
					<div class="payment-section">
						<div class="payment-section__header">
							<div>
								<h4 class="payment-section__title">
									<i class="mdi mdi-cash-multiple"></i> Payments Received
								</h4>
								<p class="text-muted" style="font-size: 13px; margin: 4px 0 0 0">
									{{ payments.length }} payment(s) totalling ${{
										totalPaymentReceived.toFixed(2)
									}}
								</p>
							</div>
							<input type="file" ref="paymentInput" style="display: none;" @change="handleFileUpload($event, 'Payment')" accept="application/pdf,image/*" />
							<Button
								variant="primary"
								@click="paymentInput?.click()"
								v-if="workOrder?.status === 'Claimed'"
								:disabled="invoices.length === 0"
								:title="
									invoices.length === 0
										? 'Please add an invoice first'
										: 'Add Payment'
								"
							>
								<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Payment
							</Button>
						</div>

						<div v-if="payments.length === 0" class="payment-empty-state">
							<i class="mdi mdi-cash-remove"></i>
							<p>No payments recorded yet.</p>
						</div>

						<div class="payments-table" v-else>
							<table class="pay-table">
								<thead>
									<tr>
										<th>Date</th>
										<th>Payment Method</th>
										<th>Reference</th>
										<th style="text-align: right">Amount</th>
										<th style="width: 60px"></th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="pay in payments" :key="pay.id">
										<td>{{ pay.date }}</td>
										<td>
											<span class="method-badge">
												<i
													class="mdi mdi-bank"
													v-if="pay.method === 'Bank Transfer'"
												></i>
												<i
													class="mdi mdi-credit-card"
													v-else-if="pay.method === 'Credit Card'"
												></i>
												<i class="mdi mdi-cash" v-else></i>
												{{ pay.method }}
											</span>
										</td>
										<td class="text-muted">{{ pay.reference || "—" }}</td>
										<td
											style="
												text-align: right;
												font-weight: 600;
												color: #10b981;
											"
										>
											${{ pay.amount.toFixed(2) }}
										</td>
										<td>
											<button
												v-if="workOrder?.status === 'Claimed'"
												class="btn-icon-sm"
												@click="handleDeleteFile(pay.guid || '')"
												title="Remove"
											>
												<i class="mdi mdi-delete-outline"></i>
											</button>
										</td>
									</tr>
								</tbody>
								<tfoot>
									<tr>
										<td colspan="3" style="text-align: right; font-weight: 600">
											Total Received:
										</td>
										<td
											style="
												text-align: right;
												font-weight: 700;
												font-size: 16px;
												color: #10b981;
											"
										>
											${{ totalPaymentReceived.toFixed(2) }}
										</td>
										<td></td>
									</tr>
								</tfoot>
							</table>
						</div>
					</div>

					<!-- Payment Status Alert -->
					<div v-if="invoices.length > 0" class="payment-status-alert" :class="isFullyPaid ? 'alert-success' : 'alert-pending'">
						<i :class="isFullyPaid ? 'mdi mdi-check-decagram' : 'mdi mdi-information-outline'"></i>
						<span v-if="isFullyPaid">
							All invoices are fully paid. Use the <strong>Mark as Claimed</strong> button at the top right to proceed.
						</span>
						<span v-else>
							Balance remaining: <strong>${{ Math.max(0, balanceRemaining).toFixed(2) }}</strong>. Mark as Claimed will be enabled once all payments are received.
						</span>
					</div>

					<!-- Claimed Success Banner -->
					<Transition name="slide-down">
						<div v-if="isClaimed" class="claimed-success-banner">
							<div class="claimed-success-banner__icon">
								<i class="mdi mdi-check-circle"></i>
							</div>
							<div class="claimed-success-banner__body">
								<strong>Work Order Marked as Claimed</strong>
								<p>This work order has been successfully claimed. All payments have been received and verified.</p>
							</div>
							<i class="mdi mdi-check-decagram claimed-success-banner__checkmark"></i>
						</div>
					</Transition>
				</div>

				<!-- REPORT -->
				<div v-if="activeTab === 'report'">
					<div class="card-header no-print" style="display: flex; justify-content: space-between; align-items: center">
						<div style="display: flex; align-items: center; gap: 16px;">
							<h3>Work Order Report</h3>
							<select
								v-model="reportType"
								style="
									padding: 8px 12px;
									border-radius: 6px;
									border: 1px solid var(--colors-border);
									background-color: var(--colors-bg-card);
									color: var(--colors-text-primary);
									font-size: 14px;
									font-weight: 500;
									width: 220px;
								"
							>
								<option value="general">General Report</option>
								<option value="mechanical">Mechanical Report</option>
								<option value="piping">Pipework Report (No Header)</option>
								<option value="piping_header">Pipework Report (With Header)</option>
							</select>
						</div>
						<Button variant="outlined" @click="printReport">
							<i class="mdi mdi-printer" style="margin-right: 6px"></i> Print Report
						</Button>
					</div>

					<div class="report-document" ref="printSection">
						<div class="report-table">
							<!-- GS-TECH Header (Visible for Mechanical, General, and Piping With Header) -->
							<div class="rt-row" v-if="reportType !== 'piping'">
								<div class="rt-logo">
									<img src="@/assets/logo.svg" alt="GS-TECH" />
								</div>
								<div class="rt-company-info">
									<strong style="font-size: 13px;">GS-TECH Engineering Sdn. Bhd (853477-A)</strong><br />
									1009, Jalan 7, Demak Laut Industrial Park, 93050 Kuching,<br />
									Sarawak. Tel: 082-439863; Fax: 082- 439862<br />
									Email: <a href="mailto:kch@gstech.com.my" style="color: #0ea5e9; text-decoration: none;">kch@gstech.com.my</a>; Website: www.gstech.com.my
								</div>
								<div class="rt-label">WORK ORDER:</div>
								<div class="rt-value">{{ workOrder.woNumber }}</div>
							</div>

							<!-- Common details grid (Layout adapts slightly) -->
							<div class="rt-row">
								<div class="rt-label">CUSTOMER NAME:</div>
								<div class="rt-value" colspan="3">{{ workOrder.customer?.name }}</div>
								<div class="rt-label" v-if="reportType === 'piping'">WORK ORDER:</div>
								<div class="rt-value" v-if="reportType === 'piping'">{{ workOrder.woNumber }}</div>
							</div>
							
							<div class="rt-row">
								<div class="rt-label">REPORT TYPE:</div>
								<div class="rt-value">{{ workOrder.workTypeItem || 'Work Type Item' }}</div>
								<div class="rt-label">CUS REF NO:</div>
								<div class="rt-value">{{ workOrder.cusRefNo || '—' }}</div>
							</div>

							<div class="rt-row" v-if="reportType === 'mechanical'">
								<div class="rt-label">EQUIPMENT NAME:</div>
								<div class="rt-value">{{ workOrder.equipment?.name || '—' }}</div>
								<div class="rt-label">BRAND/MODEL:</div>
								<div class="rt-value">{{ workOrder.equipment?.brand || '' }} {{ workOrder.equipment?.model || '' }}</div>
							</div>

							<div class="rt-row">
								<div class="rt-label">LOCATION:</div>
								<div class="rt-value" style="width: 85%;">{{ workOrder.location }}</div>
							</div>

							<div class="rt-row">
								<div class="rt-label">START DATE:</div>
								<div class="rt-value">{{ formatDateString(workOrder.startDate) }}</div>
								<div class="rt-label">COMPLETE DATE:</div>
								<div class="rt-value">{{ formatDateString(workOrder.completedDate || workOrder.estimatedEndDate) }}</div>
							</div>

							<!-- Mechanical Special: General Information & Technical Data -->
							<template v-if="reportType === 'mechanical'">
								<div class="rt-header">GENERAL INFORMATION</div>
								<div class="rt-row">
									<div class="rt-label">EQUIPMENT TYPE:</div>
									<div class="rt-value">{{ workOrder.equipment?.equipmentType || '—' }}</div>
									<div class="rt-label">SERIAL NO:</div>
									<div class="rt-value">{{ workOrder.equipment?.serialNo || '—' }}</div>
								</div>
								
								<div class="rt-header">TECHNICAL & ELECTRICAL DATA</div>
								<div class="rt-content" style="padding: 0;">
									<table style="width: 100%; border-collapse: collapse; border: none;">
										<tr>
											<th style="width: 25%; text-align: left; background: #f3f4f6; padding: 6px; border: 1px solid var(--colors-border);">Flow & Head</th>
											<td style="width: 25%; padding: 6px; border: 1px solid var(--colors-border);">{{ workOrder.equipment?.flowHead || '—' }}</td>
											<th style="width: 25%; text-align: left; background: #f3f4f6; padding: 6px; border: 1px solid var(--colors-border);">Rated Voltage</th>
											<td style="width: 25%; padding: 6px; border: 1px solid var(--colors-border);">{{ workOrder.equipment?.ratedVoltage || '—' }}</td>
										</tr>
										<tr>
											<th style="text-align: left; background: #f3f4f6; padding: 6px; border: 1px solid var(--colors-border);">Rated Speed</th>
											<td style="padding: 6px; border: 1px solid var(--colors-border);">{{ workOrder.equipment?.ratedSpeed || '—' }}</td>
											<th style="text-align: left; background: #f3f4f6; padding: 6px; border: 1px solid var(--colors-border);">Rated Current</th>
											<td style="padding: 6px; border: 1px solid var(--colors-border);">{{ workOrder.equipment?.ratedCurrent || '—' }}</td>
										</tr>
									</table>
								</div>
							</template>

							<div class="rt-header">WORK DESCRIPTION</div>
							<div class="rt-content work-desc-content" style="min-height: 180px;">
								{{ workOrder.description }}
							</div>

							<!-- Mechanical Special: Parts Replaced -->
							<template v-if="reportType === 'mechanical' && partsReplaced.length > 0">
								<div class="rt-header">PARTS REPLACED/REPAIRED</div>
								<div class="rt-content">
									<ul style="margin: 0; padding-left: 20px;">
										<li v-for="part in partsReplaced" :key="part.id">
											<strong>{{ part.name }}</strong> ({{ part.code }}) - Qty: {{ part.quantity }}
										</li>
									</ul>
								</div>
							</template>

							<div class="rt-header">REMARK(S)</div>
							<div class="rt-content" style="min-height: 80px;">
								{{ workOrder.remarks || '—' }}
							</div>

							<div class="rt-header">WORK PROGRESS PHOTO(S)</div>
							<div class="rt-content">
								<div class="report-photos">
									<div class="photo-category" v-for="cat in ['Before', 'In Progress', 'After']" :key="cat">
										<strong>{{ cat.toUpperCase() }}:</strong>
										<div class="photo-row">
											<img v-for="img in images.filter((i: any) => i.category === cat)" :key="img.id" :src="img.url" class="report-img" :alt="img.name" />
											<span v-if="images.filter((i: any) => i.category === cat).length === 0" class="text-muted" style="font-size: 12px; margin-left: 8px;">No photos</span>
										</div>
									</div>
								</div>
							</div>

							<div class="rt-row signature-row">
								<div class="rt-label">CREATED BY:</div>
								<div class="rt-value">{{ workOrder.createdBy || 'Engineer' }}</div>
								<div class="rt-label">DONE BY:</div>
								<div class="rt-value">{{ workOrder.assistantEngineers?.join(', ') || 'Technicians' }}</div>
								<div class="rt-label">CHECKED BY:</div>
								<div class="rt-value">{{ workOrder.leadEngineerName || 'Lead Engineer' }}</div>
								<div class="rt-label">VERIFIED BY:</div>
								<div class="rt-value">{{ workOrder.projectPicName || 'PIC' }}</div>
							</div>
						</div>
					</div>
				</div>


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
									<span class="timeline-item__date">{{ formatDateString(log.createdAt) }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Card>
		</div>
	</div>

		<!-- Add Item Dialog -->
		<Dialog
			v-model="isItemDialogOpen"
			:title="`Add ${itemDialogType === 'service' ? 'Service' : 'Part'}`"
			maxWidth="500px"
		>
			<div style="display: flex; flex-direction: column; gap: 16px">
				<Select
					v-model="itemForm.code"
					label="Select Item *"
					@update:modelValue="handleItemSelect"
				>
					<option value="" disabled>Choose...</option>
					<option
						v-for="opt in itemDialogType === 'service'
							? maintenanceServices
							: maintenanceParts"
						:key="opt.code"
						:value="opt.code"
					>
						{{ opt.name }} ({{ opt.code }})
					</option>
				</Select>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
					<NumericField v-model="itemForm.qty" label="Quantity *" />
					<NumericField v-model="itemForm.unitPrice" label="Unit Price ($) *" />
				</div>
				<div class="dialog-subtotal">
					Subtotal: <strong>${{ (itemForm.qty * itemForm.unitPrice).toFixed(2) }}</strong>
				</div>
			</div>
			<template #footer>
				<Button variant="secondary" @click="isItemDialogOpen = false">Cancel</Button>
				<Button variant="primary" @click="addItem" :disabled="!itemForm.code">
					{{ editingItemId ? "Save Changes" : "Add to Table" }}
				</Button>
			</template>
		</Dialog>

		<!-- Map Dialog -->
		<Dialog v-model="isMapDialogOpen" title="Location Map" maxWidth="700px">
			<GoogleMapPicker
				:location="workOrder.location"
				:latitude="workOrder.latitude"
				:longitude="workOrder.longitude"
				readonly
				height="350px"
			/>
			<template #footer>
				<Button variant="primary" @click="isMapDialogOpen = false">Close</Button>
			</template>
		</Dialog>

		<!-- Dialogs commented out because files are uploaded directly using OCR upload inputs -->
		<!-- Add Invoice Dialog -->
		<!--
		<Dialog v-model="isAddInvoiceDialogOpen" title="Add Invoice" maxWidth="500px">
			...
		</Dialog>
		-->

		<!-- Add Payment Dialog -->
		<!--
		<Dialog v-model="isAddPaymentDialogOpen" title="Record Payment" maxWidth="480px">
			...
		</Dialog>
		-->

		<!-- Add Quotation Dialog -->
		<!--
		<Dialog v-model="isAddQuotationDialogOpen" title="Add Quotation" maxWidth="500px">
			...
		</Dialog>
		-->

		<!-- Edit Quotation Dialog -->
		<Dialog v-model="isEditQuotationDialogOpen" title="Edit Quotation Details" maxWidth="500px">
			<div style="display: flex; flex-direction: column; gap: 16px">
				<div class="ocr-edit-notice">
					<i class="mdi mdi-pencil-circle"></i>
					<span>Correct any inaccuracies from the OCR scan below.</span>
				</div>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
					<Textbox
						v-model="quotationForm.refNo"
						label="Ref No. *"
						placeholder="QT-2026-001"
						hide-footer
					/>
					<Textbox
						v-model="quotationForm.date"
						label="Date Issued"
						placeholder="e.g. 22 Jun 2026"
						hide-footer
					/>
				</div>
				<NumericField v-model="quotationForm.amount" label="Amount ($) *" />
				<Textbox v-model="quotationForm.name" label="File Name" hide-footer />
			</div>
			<template #footer>
				<Button variant="secondary" @click="isEditQuotationDialogOpen = false"
					>Cancel</Button
				>
				<Button variant="primary" @click="saveEditQuotation">Save Changes</Button>
			</template>
		</Dialog>

		<!-- Edit Invoice Dialog -->
		<Dialog v-model="isEditInvoiceDialogOpen" title="Edit Invoice Details" maxWidth="500px">
			<div style="display: flex; flex-direction: column; gap: 16px">
				<div class="ocr-edit-notice">
					<i class="mdi mdi-pencil-circle"></i>
					<span>Correct any inaccuracies from the OCR scan below.</span>
				</div>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
					<Textbox
						v-model="invoiceForm.refNo"
						label="Invoice No. *"
						placeholder="INV-2026-001"
						hide-footer
					/>
					<Textbox
						v-model="invoiceForm.date"
						label="Date Issued"
						placeholder="e.g. 22 Jun 2026"
						hide-footer
					/>
				</div>
				<NumericField v-model="invoiceForm.amount" label="Amount ($) *" />
				<Textbox v-model="invoiceForm.name" label="File Name" hide-footer />
			</div>
			<template #footer>
				<Button variant="secondary" @click="isEditInvoiceDialogOpen = false">Cancel</Button>
				<Button variant="primary" @click="saveEditInvoice">Save Changes</Button>
			</template>
		</Dialog>
		<!-- Extend Estimated End Date Dialog -->
		<Dialog v-model="isExtendDialogOpen" title="Extend Estimated End Date" maxWidth="500px">
			<div style="display: flex; flex-direction: column; gap: 16px">
				<p class="text-muted" style="margin: 0; font-size: 13px">
					Extend completion deadline for <strong>{{ workOrder.woNumber }}</strong>. Extension count will be tracked automatically.
				</p>

				<DatePicker
					v-slot:default
					v-model="extendForm.newEstimatedEndDate"
					label="New Estimated Completion Date *"
					:enableTime="false"
				/>

				<div class="textbox-field">
					<label class="custom-label">Extension Reason (Optional)</label>
					<textarea
						v-model="extendForm.extensionReason"
						class="custom-textarea"
						rows="3"
						placeholder="Explain why an extension is required..."
					></textarea>
				</div>
			</div>
			<template #footer>
				<Button variant="secondary" @click="isExtendDialogOpen = false">Cancel</Button>
				<Button
					v-slot:default
					variant="primary"
					@click="submitExtend"
					:disabled="!extendForm.newEstimatedEndDate || isExtending"
				>
					<i v-if="isExtending" class="mdi mdi-loading mdi-spin" style="margin-right: 4px"></i>
					Extend End Date
				</Button>
			</template>
		</Dialog>

		<!-- Repeat Work Order Dialog -->
		<Dialog v-model="isRepeatDialogOpen" title="Repeat Work Order" maxWidth="520px">
			<div style="display: flex; flex-direction: column; gap: 16px">
				<p class="text-muted" style="margin: 0; font-size: 13px">
					Create an extended sub-order from <strong>{{ workOrder.woNumber }}</strong> (e.g. {{ workOrder.woNumber }}-01). Status will be <strong>NEW</strong>.
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
				<Button
					variant="primary"
					@click="submitRepeat"
					:disabled="isRepeating"
				>
					<i v-if="isRepeating" class="mdi mdi-loading mdi-spin" style="margin-right: 4px"></i>
					Create Sub-Order
				</Button>
			</template>
		</Dialog>

		<!-- Transfer Work Order Dialog -->
		<Dialog v-model="isTransferDialogOpen" title="Transfer to New Work Order" maxWidth="520px">
			<div style="display: flex; flex-direction: column; gap: 16px">
				<p class="text-muted" style="margin: 0; font-size: 13px">
					Transfer content from <strong>{{ workOrder.woNumber }}</strong> into a brand new sequential work order (e.g. WO-0002). Status will be <strong>NEW</strong>. Original work order remains unchanged.
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
				<Button
					variant="primary"
					@click="submitTransfer"
					:disabled="isTransferring"
				>
					<i v-if="isTransferring" class="mdi mdi-loading mdi-spin" style="margin-right: 4px"></i>
					Confirm Transfer
				</Button>
			</template>
		</Dialog>

		<!-- Reject Work Order Dialog -->
		<Dialog v-model="isRejectDialogOpen" title="Reject Work Order" maxWidth="500px">
			<div style="display: flex; flex-direction: column; gap: 16px">
				<p class="text-muted" style="margin: 0; font-size: 13px">
					State the reason for rejecting this work order. It will be sent back to the In Progress state.
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
					style="background-color: var(--colors-error); border-color: var(--colors-error);"
					@click="submitReject"
					:disabled="!rejectForm.rejectedReason"
				>
					Reject Work Order
				</Button>
			</template>
		</Dialog>

		<!-- Add/Edit Note Dialog -->
		<Dialog v-model="isNoteDialogOpen" :title="`${isEditingNote ? 'Edit' : 'Add'} Work Note`" maxWidth="500px">
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
	background: var(--colors-surface-card);
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
	background: var(--colors-surface-card);
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
.form-grid {
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	gap: 20px;
	.col-12 {
		grid-column: span 12;
	}
	.col-6 {
		grid-column: span 6;
	}
	.col-4 {
		grid-column: span 4;
	}
}
.section-title {
	margin: 0;
	font-size: 16px;
	color: var(--colors-text-primary);
	border-bottom: 1px solid var(--colors-surface-border);
	padding-bottom: 8px;
}
.info-label-flex {
	display: flex;
	align-items: center;
}
.text-muted {
	color: var(--colors-text-muted);
}
.text-primary {
	color: var(--colors-brand-primary);
}
.fw-500 {
	font-weight: 500;
}

.custom-label {
	display: block;
	font-size: 11px;
	font-weight: 600;
	color: var(--colors-text-secondary);
	text-transform: uppercase;
	margin-bottom: 4px;
}
.read-only-val {
	font-size: 14px;
	color: var(--colors-text-primary);
	padding: 8px 0;
	font-weight: 500;
}
.checkbox-list {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
	padding: 12px;
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	background: var(--colors-surface-background);
}
.checkbox-list-item {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	font-size: 13px;
	&.is-disabled {
		opacity: 0.6;
		pointer-events: none;
	}
}

.btn-icon-map {
	background: none;
	border: none;
	cursor: pointer;
	color: var(--colors-text-muted);
	font-size: 18px;
	padding: 4px 8px;
	transition: color 0.2s;
	&:hover {
		color: var(--colors-brand-primary);
	}
	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}
.map-container {
	width: 100%;
	height: 300px;
	background: var(--colors-surface-background);
	border: 2px dashed var(--colors-surface-border);
	border-radius: 8px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: var(--colors-text-muted);
	i {
		font-size: 48px;
		color: var(--colors-text-secondary);
		margin-bottom: 8px;
	}
	span {
		font-weight: 500;
		font-size: 16px;
	}
}

.table-total {
	text-align: right;
	margin-top: 16px;
	font-size: 18px;
	color: var(--colors-text-primary);
}
.dialog-subtotal {
	background: var(--colors-surface-background);
	padding: 12px;
	border-radius: 8px;
	text-align: right;
	font-size: 16px;
}

.image-categories {
	display: flex;
	flex-direction: column;
	gap: 24px;
	.image-category {
		h4 {
			margin: 0 0 12px 0;
			font-size: 14px;
			color: var(--colors-text-secondary);
			border-bottom: 1px solid var(--colors-surface-border);
			padding-bottom: 8px;
		}
	}
}
.image-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16px;
}
.image-card {
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 140px;
	flex-shrink: 0;
	.image-preview {
		aspect-ratio: 1;
		border-radius: 8px;
		background-size: cover;
		background-position: center;
		position: relative;
		border: 1px solid var(--colors-surface-border);
		.del-btn {
			position: absolute;
			top: -6px;
			right: -6px;
			background: var(--colors-danger);
			color: white;
			border: none;
			border-radius: 50%;
			width: 22px;
			height: 22px;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			font-size: 14px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
			transition: transform 0.2s;
			&:hover {
				transform: scale(1.1);
			}
		}
	}
	.image-name-input {
		width: 100%;
		padding: 6px;
		font-size: 12px;
		border: 1px solid var(--colors-surface-border);
		border-radius: 4px;
	}
	.image-name-display {
		font-size: 12px;
		color: var(--colors-text-secondary);
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}
.image-placeholder {
	width: 140px;
	aspect-ratio: 1;
	border: 2px dashed var(--colors-surface-border);
	border-radius: 8px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	color: var(--colors-text-muted);
	cursor: pointer;
	transition: all 0.2s ease;
	flex-shrink: 0;
	&:hover {
		border-color: var(--colors-brand-primary);
		color: var(--colors-brand-primary);
		background: rgba(var(--colors-brand-primary-rgb), 0.05);
	}
	i {
		font-size: 24px;
	}
	span {
		font-size: 12px;
		font-weight: 500;
	}
}

.custom-textarea {
	width: 100%;
	padding: 12px;
	border-radius: 8px;
	border: 1px solid var(--colors-surface-border);
	background: var(--colors-surface-card);
	color: var(--colors-text-primary);
	font-size: 14px;
	outline: none;
	resize: vertical;
	font-family: inherit;
	&:focus {
		border-color: var(--colors-brand-primary);
	}
	&:disabled {
		background: var(--colors-surface-background);
		opacity: 0.7;
	}
}

.finance-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 32px;
}
.finance-summary-box {
	background: var(--colors-surface-background);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: 24px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	.summary-row {
		display: flex;
		justify-content: space-between;
		font-size: 15px;
		color: var(--colors-text-secondary);
	}
	.total-row {
		border-top: 1px solid var(--colors-surface-border);
		padding-top: 16px;
		font-size: 18px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}
}
.file-upload {
	border: 2px dashed var(--colors-surface-border);
	border-radius: 12px;
	padding: 40px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	color: var(--colors-text-muted);
	background: var(--colors-surface-background);
	i {
		font-size: 48px;
		color: var(--colors-text-secondary);
	}
	span {
		font-size: 15px;
		font-weight: 500;
	}
}

/* Timeline */
.timeline {
	display: flex;
	flex-direction: column;
	gap: 24px;
}
.timeline-item {
	display: flex;
	gap: 16px;
}
.timeline-icon {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	flex-shrink: 0;
	&.icon-primary {
		background: rgba(var(--colors-brand-primary-rgb), 0.1);
		color: var(--colors-brand-primary);
	}
	&.icon-success {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}
	&.icon-default {
		background: #f1f5f9;
		color: var(--colors-text-muted);
	}
}
.timeline-content {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	gap: 4px;
	.timeline-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		.timeline-title {
			font-weight: 600;
			font-size: 14px;
			color: var(--colors-text-primary);
		}
		.timeline-date {
			font-size: 12px;
			color: var(--colors-text-muted);
		}
	}
	.timeline-body {
		font-size: 14px;
		color: var(--colors-text-secondary);
		margin-bottom: 8px;
	}
	.timeline-user {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		font-weight: 500;
		color: var(--colors-text-primary);
		.avatar {
			width: 20px;
			height: 20px;
			border-radius: 50%;
			background: #e2e8f0;
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--colors-text-secondary);
			font-size: 12px;
		}
	}
}

/* OCR Document Card */
.document-card {
	display: flex;
	align-items: center;
	background: var(--colors-surface-background);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: 16px;
	gap: 16px;
	transition: all 0.2s;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}
.document-card:hover {
	border-color: var(--colors-brand-primary);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.document-card .doc-icon {
	width: 48px;
	height: 48px;
	border-radius: 8px;
	background: rgba(239, 68, 68, 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
}
.document-card .doc-info {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.document-card h4 {
	margin: 0;
	font-size: 15px;
	color: var(--colors-text-primary);
	font-weight: 600;
}
.ocr-details {
	display: flex;
	gap: 24px;
	flex-wrap: wrap;
}
.ocr-field {
	display: flex;
	flex-direction: column;
	gap: 2px;
}
.ocr-field .label {
	font-size: 11px;
	color: var(--colors-text-muted);
	text-transform: uppercase;
	font-weight: 600;
	letter-spacing: 0.5px;
}
.ocr-field .value {
	font-size: 13px;
	color: var(--colors-text-secondary);
}
.font-weight-bold {
	font-weight: 600;
}
.text-danger {
	color: #ef4444;
}
.text-success {
	color: #10b981;
}
.document-card .doc-actions {
	display: flex;
	align-items: center;
	gap: 12px;
}
.document-card .btn-icon {
	background: none;
	border: none;
	cursor: pointer;
	color: var(--colors-text-muted);
	padding: 4px;
	border-radius: 4px;
	transition: all 0.2s;
}
.document-card .btn-icon:hover {
	color: var(--colors-danger);
	background: rgba(239, 68, 68, 0.1);
}
.uploading-state {
	border-color: var(--colors-brand-primary);
	background: rgba(var(--colors-brand-primary-rgb), 0.05);
	cursor: wait;
}

/* Payment Tab Styles */
.payment-status-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 14px;
	border-radius: 20px;
	font-size: 13px;
	font-weight: 600;
	&.badge-paid {
		background: rgba(16, 185, 129, 0.12);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}
	&.badge-pending {
		background: rgba(245, 158, 11, 0.12);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}
}
.payment-summary-bar {
	display: flex;
	align-items: center;
	gap: 0;
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	overflow: hidden;
	margin-bottom: 24px;
}
.psum-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 16px 20px;
	.psum-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--colors-text-muted);
	}
	.psum-value {
		font-size: 20px;
		font-weight: 700;
		color: var(--colors-text-primary);
		&.psum-value--paid {
			color: #10b981;
		}
		&.psum-value--due {
			color: #ef4444;
		}
		&.psum-value--zero {
			color: #10b981;
		}
	}
}
.psum-divider {
	width: 1px;
	align-self: stretch;
	background: var(--colors-surface-border);
}
.payment-section {
	margin-bottom: 32px;
	&__header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 16px;
	}
	&__title {
		margin: 0 0 4px 0;
		font-size: 16px;
		color: var(--colors-text-primary);
		display: flex;
		align-items: center;
		gap: 8px;
		i {
			color: var(--colors-brand-primary);
		}
	}
}
.invoice-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.payment-empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 32px;
	border: 2px dashed var(--colors-surface-border);
	border-radius: 12px;
	color: var(--colors-text-muted);
	i {
		font-size: 36px;
	}
	p {
		margin: 0;
		font-size: 14px;
	}
}
.pay-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 14px;
	th {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--colors-text-muted);
		padding: 8px 12px;
		border-bottom: 1px solid var(--colors-surface-border);
		text-align: left;
	}
	td {
		padding: 12px;
		border-bottom: 1px solid var(--colors-surface-border);
		color: var(--colors-text-secondary);
	}
	tfoot td {
		border-bottom: none;
		padding-top: 16px;
	}
	tr:last-child td {
		border-bottom: none;
	}
}
.method-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: var(--colors-surface-background);
	padding: 3px 10px;
	border-radius: 12px;
	font-size: 13px;
	border: 1px solid var(--colors-surface-border);
}
.btn-icon-sm {
	background: none;
	border: none;
	cursor: pointer;
	color: var(--colors-text-muted);
	padding: 4px;
	border-radius: 4px;
	font-size: 16px;
	transition: all 0.2s;
	&:hover {
		color: var(--colors-danger);
		background: rgba(239, 68, 68, 0.1);
	}
}
.claimed-cta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 16px 20px;
	border-radius: 12px;
	border: 1px solid var(--colors-surface-border);
	background: var(--colors-surface-background);
	&__info {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		font-size: 14px;
	}
}
.text-success {
	color: #10b981;
}
.receipt-file-chip {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	background: var(--colors-surface-background);
	font-size: 14px;
	color: var(--colors-text-secondary);
	i:first-child {
		font-size: 20px;
	}
	span {
		flex: 1;
	}
}
.ocr-edit-notice {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	background: rgba(var(--colors-brand-primary-rgb), 0.06);
	border: 1px solid rgba(var(--colors-brand-primary-rgb), 0.2);
	border-radius: 8px;
	font-size: 13px;
	color: var(--colors-brand-primary);
	i {
		font-size: 20px;
		flex-shrink: 0;
	}
}

/* Payment Status Alert */
.payment-status-alert {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 18px;
	border-radius: 10px;
	font-size: 14px;
	line-height: 1.5;

	i {
		font-size: 20px;
		flex-shrink: 0;
	}

	&.alert-success {
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.25);
		color: #065f46;
		i { color: #10b981; }
	}
	&.alert-pending {
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.25);
		color: #92400e;
		i { color: #f59e0b; }
	}
}

/* Claimed Success Banner */
.claimed-success-banner {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 20px 24px;
	border-radius: 12px;
	background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
	border: 1px solid #6ee7b7;
	box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
	&__icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #10b981;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		i {
			font-size: 26px;
			color: white;
		}
	}
	&__body {
		flex: 1;
		strong {
			display: block;
			font-size: 15px;
			color: #064e3b;
			margin-bottom: 4px;
		}
		p {
			margin: 0;
			font-size: 13px;
			color: #065f46;
		}
	}
	&__checkmark {
		font-size: 36px;
		color: #10b981;
		opacity: 0.4;
		flex-shrink: 0;
	}
}

/* Slide-down transition */
.slide-down-enter-active {
	transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-down-enter-from {
	opacity: 0;
	transform: translateY(-12px);
}

/* Printable Report */
.report-document {
	background: white;
	padding: 24px;
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	color: #000;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 13px;
	box-shadow: 0 4px 12px rgba(0,0,0,0.05);
	margin-top: 16px;
}

.report-table {
	border: 1px solid #999;
	display: flex;
	flex-direction: column;
}

.rt-row {
	display: flex;
	border-bottom: 1px solid #999;
}
.rt-row:last-child {
	border-bottom: none;
}

.rt-label {
	flex: 0 0 15%;
	box-sizing: border-box;
	background: #e5e7eb;
	font-weight: bold;
	padding: 6px 8px;
	border-right: 1px solid #999;
	text-align: right;
	text-transform: uppercase;
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.rt-value {
	flex: 0 0 35%;
	box-sizing: border-box;
	padding: 6px 8px;
	border-right: 1px solid #999;
	display: flex;
	align-items: center;
}
.rt-value:last-child {
	border-right: none;
}

.rt-header {
	background: #e5e7eb;
	font-weight: bold;
	text-align: center;
	padding: 6px;
	border-bottom: 1px solid #999;
	text-transform: uppercase;
}

.rt-logo {
	flex: 0 0 15%;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	border-right: 1px solid #999;
	padding: 10px;
}
.rt-logo img {
	max-height: 50px;
	max-width: 100%;
}

.rt-company-info {
	flex: 0 0 35%;
	box-sizing: border-box;
	padding: 10px;
	border-right: 1px solid #999;
	font-size: 11px;
	line-height: 1.3;
}

.rt-content {
	padding: 8px 12px;
	border-bottom: 1px solid #999;
	line-height: 1.4;
}
.rt-content:last-child {
	border-bottom: none;
}

.report-photos {
	display: flex;
	flex-direction: column;
	gap: 24px;
}
.photo-category strong {
	display: block;
	margin-bottom: 6px;
	font-size: 13px;
	text-transform: uppercase;
}
.photo-row {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	min-height: 140px;
}
.report-img {
	width: calc(25% - 9px);
	height: 140px;
	object-fit: cover;
	border: 1px solid #ccc;
}

.signature-row {
	background: #f3f4f6;
}
.signature-row .rt-label {
	width: auto;
	background: transparent;
	padding: 8px;
	justify-content: flex-end;
}
.signature-row .rt-value {
	flex: 1;
	font-weight: normal;
}

@media print {
	:global(.header), :global(.side-menu), :global(.app-footer) {
		display: none !important;
	}
	:global(.app-main), :global(.app-container) {
		margin: 0 !important;
		padding: 0 !important;
		overflow: visible !important;
	}
	:global(.card), :global(.content-card), :global(.panel-card) {
		border: none !important;
		box-shadow: none !important;
		border-radius: 0 !important;
		background: transparent !important;
		padding: 0 !important;
		margin: 0 !important;
	}
	.page-header, .tabs-horizontal, .header-actions, .stepper-horizontal, .no-print, .finance-summary-box, .payment-section, .alert-box {
		display: none !important;
	}
	.wo-detail-page {
		margin: 0 !important;
		padding: 0 !important;
		background: white !important;
	}
	.workspace-area {
		padding: 0 !important;
		max-width: 100% !important;
	}
	.report-document {
		border: none !important;
		box-shadow: none !important;
		outline: none !important;
		background: transparent !important;
		padding: 0 !important;
		margin: 0 !important;
		page-break-inside: avoid;
	}
	.report-table {
		border: 1px solid #000 !important;
		font-size: 11px !important;
	}
	.rt-row, .rt-header, .rt-content, .rt-label, .rt-value, .rt-logo, .rt-company-info {
		border-color: #000 !important;
	}
	.rt-label, .rt-header {
		background-color: #e5e7eb !important;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		padding: 4px !important;
	}
	.rt-value {
		padding: 4px !important;
	}
	.rt-content {
		padding: 6px !important;
	}
	.photo-row {
		min-height: 95px !important;
	}
	.report-photos {
		gap: 8px !important;
	}
	.report-img {
		height: 95px !important;
	}
	.signature-row {
		background-color: #f3f4f6 !important;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.work-desc-content {
		min-height: 80px !important;
	}
	@page {
		size: A4 portrait;
		margin: 5mm;
	}
	body {
		background: white;
	}
}

// Additional styles for 12-Photo Grid, Verification Approval, and Priority Badges
.photo-counter-badge {
	background: rgba(80, 88, 242, 0.1);
	color: var(--colors-brand-primary);
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 12px;
	font-weight: 600;
}

.photo-grid-12 {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 16px;
	padding-top: 16px;
}

.photo-slot {
	display: flex;
	flex-direction: column;
	gap: 6px;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	padding: 8px;

	&__img-wrap {
		position: relative;
		width: 100%;
		height: 120px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--colors-surface-background);
	}

	&__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	&__del {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 14px;
		transition: transform 0.2s, background-color 0.2s;

		&:hover {
			background: #dc2626;
			transform: scale(1.1);
		}
	}

	&__name {
		font-size: 11px;
		color: var(--colors-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: center;
	}

	&--add {
		height: 154px;
		border: 2px dashed var(--colors-surface-border);
		background: transparent;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		color: var(--colors-text-muted);
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			border-color: var(--colors-brand-primary);
			color: var(--colors-brand-primary);
			background: rgba(80, 88, 242, 0.04);
		}

		i {
			font-size: 28px;
		}

		span {
			font-size: 12px;
			font-weight: 500;
		}
	}
}

.photo-grid-empty {
	grid-column: 1 / -1;
	text-align: center;
	padding: 40px 20px;
	color: var(--colors-text-muted);

	i {
		font-size: 40px;
		margin-bottom: 8px;
		opacity: 0.4;
	}

	p {
		margin: 0;
		font-size: 13px;
	}
}

.priority-badge-row {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border-radius: 6px;
	background: var(--colors-surface-background);
	border: 1px solid var(--colors-surface-border);
}

.priority-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.priority-label {
	font-size: 13px;
	font-weight: 600;
	color: var(--colors-text-primary);
}

.verification-actions-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 32px 16px;
	gap: 12px;

	&__icon {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: rgba(80, 88, 242, 0.1);
		color: var(--colors-brand-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32px;
	}

	h4 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}
}

.verification-buttons-row {
	display: flex;
	gap: 16px;
	margin-top: 12px;
}

.rejection-input-card {
	width: 100%;
	max-width: 480px;
	margin-top: 16px;
	text-align: left;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	padding: 16px;
}

.verification-result-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 36px 16px;

	&--approved {
		background: rgba(16, 185, 129, 0.04);
		border-radius: 8px;
	}

	&--rejected {
		background: rgba(239, 68, 68, 0.04);
		border-radius: 8px;
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

/* Image split placeholder upload controls */
.image-placeholder-split {
	display: flex;
	flex-direction: column;
	border: 2px dashed var(--colors-border);
	border-radius: 8px;
	height: 150px;
	overflow: hidden;

	.split-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		cursor: pointer;
		font-size: 12px;
		color: var(--colors-text-secondary);
		background-color: transparent;
		transition: background-color 0.2s;

		&:hover {
			background-color: var(--colors-bg-hover);
			color: var(--colors-brand-primary);
		}

		i {
			font-size: 20px;
		}

		&--camera {
			border-top: 1px dashed var(--colors-border);
		}
	}
}

/* Note Cards Styling */
.empty-notes-box {
	text-align: center;
	padding: 40px 20px;
	border: 1px dashed var(--colors-border);
	border-radius: 8px;
	background-color: var(--colors-bg-card);
}

.notes-list {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.note-card {
	background-color: var(--colors-bg-card);
	border: 1px solid var(--colors-border);
	border-radius: 8px;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	box-shadow: var(--shadow-xs);

	.note-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.note-card__meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px 12px;
	}

	.note-card__author {
		font-size: 13px;
		color: var(--colors-text-primary);
	}

	.note-card__date {
		font-size: 12px;
		color: var(--colors-text-muted);
	}

	.note-badge {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 12px;
		font-weight: 500;

		&--internal {
			background-color: rgba(14, 165, 233, 0.1);
			color: var(--colors-brand-primary);
		}

		&--external {
			background-color: rgba(16, 185, 129, 0.1);
			color: var(--colors-success);
		}
	}

	.note-card__actions {
		display: flex;
		gap: 8px;
	}

	.note-btn {
		background: none;
		border: none;
		padding: 4px;
		border-radius: 4px;
		cursor: pointer;
		color: var(--colors-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s, background-color 0.2s;

		&:hover {
			background-color: var(--colors-bg-hover);
			color: var(--colors-text-primary);
		}

		&--delete:hover {
			color: var(--colors-error);
		}
	}

	.note-card__content {
		font-size: 13px;
		color: var(--colors-text-secondary);
		line-height: 1.5;
		white-space: pre-wrap;
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
