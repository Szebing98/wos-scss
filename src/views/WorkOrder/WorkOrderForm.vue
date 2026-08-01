<script setup lang="ts">
import { getApiErrorMessage } from "@/utils/error";
import { ref, computed, watch, onMounted } from "vue";
import Card from "@/components/Card.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import MultiSelect from "@/components/MultiSelect.vue";
import Button from "@/components/Button.vue";
import Badge from "@/components/Badge.vue";
import DatePicker from "@/components/DatePicker.vue";
import Autocomplete from "@/components/Autocomplete.vue";
import GoogleMapPicker from "@/components/GoogleMapPicker.vue";
import Dialog from "@/components/Dialog.vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { customerApi } from "@/api/customer/customer.api";
import { userApi } from "@/api/user/user.api";
import { workTypeApi } from "@/api/maintenance/work-type/work-type.api";
import { workOrderApi } from "@/api/work-order/work-order.api";
import http from "@/utils/http";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { userDisplayCode } from "@/utils/User/user-display";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const snackbar = useSnackbarStore();
const SITE_INSTRUCTIONS_CATEGORY = "SiteInstructions";
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3707/api").replace(
	/\/$/,
	"",
);
const workOrderCode = ref("");
const showApproveDialog = ref(false);
const showRejectDialog = ref(false);
const rejectReason = ref("");

const isEditMode = computed(() => !!route.params.id);
const isReadOnly = computed(() => isEditMode.value && route.query.mode === "view");
const pageTitle = computed(() => {
	if (isReadOnly.value) {
		return workOrderCode.value ? `View Work Order - ${workOrderCode.value}` : "View Work Order";
	}
	return isEditMode.value ? "Edit Work Order" : "Create New Work Order";
});

function normalizeWorkOrderStatus(w: any) {
	if (w?.isDraft) return "Draft";
	const status = String(w?.orderStatus || w?.status || "Draft").toLowerCase();
	if (status === "new") return "New";
	if (status === "pending") return "PendingApproval";
	if (status === "progress") return "InProgress";
	return w?.status || w?.orderStatus || "Draft";
}

function userOptionDisplay(user: any) {
	const visibleName = user?.name?.trim();
	const visibleCode = userDisplayCode(user?.displayCode, user?.code, "");
	if (visibleName && visibleCode) {
		if (visibleName.includes(`(${visibleCode})`) || visibleName === visibleCode) {
			return visibleName;
		}
		return `${visibleName} (${visibleCode})`;
	}
	return visibleName || visibleCode || "";
}

function upsertUserOption(
	code?: string | null,
	name?: string | null,
	displayCode?: string | null,
	role?: string,
) {
	if (!code) return;
	const normalizedCode = String(code);
	const existing = users.value.find((user: any) => String(user.code) === normalizedCode);
	const nextName = name?.trim();
	const nextDisplayCode = displayCode?.trim();

	if (existing) {
		if (nextName) existing.name = nextName;
		if (nextDisplayCode) existing.displayCode = nextDisplayCode;
		if (role && !existing.role) existing.role = role;
		return;
	}

	users.value.push({
		code: normalizedCode,
		displayCode: nextDisplayCode || normalizedCode,
		name: nextName || nextDisplayCode || normalizedCode,
		role: role || "",
	});
}

const normalizedStatus = computed(() =>
	String(formData.value.status || "")
		.replace(/\s+/g, "")
		.toLowerCase(),
);
const isDraftStatus = computed(() => normalizedStatus.value === "draft");
const isNewStatus = computed(() => normalizedStatus.value === "new");
const workOrderOwnerCode = ref("");
const isSuperadmin = computed(() =>
	(authStore.currentUser?.userGroups || []).some(
		(group: any) => String(group.code || "").toUpperCase() === "SA",
	),
);
const canEditForCurrentAssignment = computed(() => {
	if (isSuperadmin.value) return true;
	const userCode = authStore.currentUser?.code;
	if (!userCode) return false;
	if (["draft", "new"].includes(normalizedStatus.value)) {
		return workOrderOwnerCode.value === userCode;
	}
	if (["pending", "pendingapproval"].includes(normalizedStatus.value)) {
		return formData.value.personInChargeCode === userCode;
	}
	if (["progress", "inprogress"].includes(normalizedStatus.value)) {
		return (
			formData.value.personInChargeCode === userCode || formData.value.leaderCode === userCode
		);
	}
	return false;
});
const canEditReadOnlyWorkOrder = computed(() => {
	const actionByStatus: Record<string, string> = {
		draft: "update_draft",
		new: "update_new",
		pending: "update_pending",
		pendingapproval: "update_pending",
	};
	const action = actionByStatus[normalizedStatus.value];
	return Boolean(
		action && authStore.can(action, "WorkOrder") && canEditForCurrentAssignment.value,
	);
});
const isPendingApproval = computed(() =>
	["pending", "pendingapproval"].includes(normalizedStatus.value),
);

function isFieldDisabled(fieldName: string): boolean {
	if (isReadOnly.value) return true;
	if (isPendingApproval.value) {
		const allowedFields = [
			"jobPriority",
			"personInChargeCode",
			"estimatedEndDate",
			"leaderCode",
			"leaderIICode",
			"description",
			"location",
			"latitude",
			"longitude",
		];
		return !allowedFields.includes(fieldName);
	}
	return false;
}

const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const todayDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00`;

const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const nextWeekDateStr = `${nextWeek.getFullYear()}-${pad(nextWeek.getMonth() + 1)}-${pad(nextWeek.getDate())}T00:00`;

const JOB_PRIORITIES = [
	{ value: "High", label: "High" },
	{ value: "Medium", label: "Medium" },
	{ value: "Low", label: "Low" },
];

const initialWorkType = (route.query.workType as string) || "Mechanical Maintenance";
const initialWorkTypeCode = (route.query.workTypeCode as string) || "mechanical";
const initialWorkTypeGuid = (route.query.workTypeGuid as string) || "";
const initialWithEquipment = route.query.withEquipmentForm === "true";

const formData = ref({
	status: "Draft",
	workType: initialWorkType,
	orderTypeCode: initialWorkTypeCode,
	workTypeGuid: initialWorkTypeGuid,
	withEquipmentForm: initialWithEquipment,
	orderTypeItemCode: "",
	title: "",
	description: "",
	customerCode: "",
	salesAgentCode: "",
	personInChargeCode: "",
	jobPriority: "Low" as "High" | "Medium" | "Low",
	siteCode: "",
	location: "",
	latitude: 0,
	longitude: 0,
	startDate: todayDateStr,
	estimatedEndDate: nextWeekDateStr,
	// Leader = was Lead Engineer
	leaderCode: "",
	// New: Leader II
	leaderIICode: "",
	// Technicians = was Assistant Engineers
	technicianCodes: [] as string[],
	contractNo: "",
	contractStartDate: "",
	contractEndDate: "",
	customerPic: "",
	customerPicPhone: "",

	// Equipment
	equipment: {
		name: "",
		serialNo: "",
		brand: "",
		model: "",
		equipmentType: "",
	},

	// Technical
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

	// Site Instructions files (min 2, max 3)
	siteInstructionsFiles: [] as Array<{
		name: string;
		url: string;
		type: string;
		file?: File;
		guid?: string;
	}>,
});

const workTypeList = ref<any[]>([]);
const workTypeItems = ref<any[]>([]);
const users = ref<any[]>([]);
const customers = ref<any[]>([]);
const sites = ref<any[]>([]);
const loading = ref(false);

// Site instructions file handling
const siteInstructionsError = ref("");
const siteInstructionsInput = ref<HTMLInputElement | null>(null);

function onSiteInstructionsChange(e: Event) {
	const input = e.target as HTMLInputElement;
	if (!input.files) return;
	const files = Array.from(input.files);
	const current = formData.value.siteInstructionsFiles;
	const remaining = 3 - current.length;
	const toAdd = files.slice(0, remaining);

	for (const file of toAdd) {
		const url = URL.createObjectURL(file);
		current.push({ name: file.name, url, type: file.type, file });
	}
	siteInstructionsError.value = "";
	input.value = "";
}

const previewImageUrl = ref<string | null>(null);

function openImageModal(url: string) {
	previewImageUrl.value = url;
}

async function openSiteInstructionFile(file: { url: string; name: string; type: string }) {
	if (!file.url) return;
	try {
		const response = await http.get(file.url, { responseType: "blob" });
		const objectUrl = URL.createObjectURL(response.data);
		const link = document.createElement("a");
		link.href = objectUrl;
		link.target = "_blank";
		link.rel = "noopener";
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
	} catch (error) {
		console.error("Failed to open Site Instruction file:", error);
		snackbar.error(`Failed to open ${file.name}`);
	}
}

function removeSiteInstruction(index: number) {
	const item = formData.value.siteInstructionsFiles[index];
	if (item?.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
	formData.value.siteInstructionsFiles.splice(index, 1);
}

function triggerSiteInstructionsUpload() {
	siteInstructionsInput.value?.click();
}

async function fetchWorkTypeItems(workTypeGuid: string) {
	if (!workTypeGuid) {
		workTypeItems.value = [];
		return;
	}
	try {
		const res = await workTypeApi.getWorkTypeItems(workTypeGuid, {
			pageIndex: 0,
			pageSize: 100,
			timezone: "Asia/Kuala_Lumpur",
		} as any);
		if (res.data && res.data.data) {
			workTypeItems.value = res.data.data.map((item: any) => ({
				code: item.code,
				name: item.name,
			}));
		}
	} catch (e) {
		console.error("Failed to load work type items:", e);
		workTypeItems.value = [];
	}
}

watch(
	[
		() => formData.value.workTypeGuid,
		() => formData.value.orderTypeCode,
		() => workTypeList.value,
	],
	async ([newGuid, newCode, types]) => {
		if (!types || types.length === 0) return;
		const match = types.find(
			(wt: any) =>
				(newGuid && wt.guid === newGuid) ||
				(newCode && wt.code.toLowerCase() === newCode.toLowerCase()) ||
				(formData.value.workType &&
					wt.name.toLowerCase() === formData.value.workType.toLowerCase()),
		);
		if (match) {
			if (formData.value.workTypeGuid !== match.guid) {
				formData.value.workTypeGuid = match.guid;
			}
			if (formData.value.orderTypeCode !== match.code) {
				formData.value.orderTypeCode = match.code;
			}
			if (formData.value.workType !== match.name) {
				formData.value.workType = match.name;
			}
			formData.value.withEquipmentForm = !!match.withEquipmentForm;
			if (match.guid && workTypeItems.value.length === 0) {
				await fetchWorkTypeItems(match.guid);
			}
		}
	},
	{ immediate: true },
);

async function loadOptions() {
	try {
		// Fetch Customers
		const custRes = await customerApi.getCustomers({
			pageIndex: 0,
			pageSize: 100,
			timezone: "Asia/Kuala_Lumpur",
			isActive: true,
		});
		if (custRes.data && custRes.data.data) {
			customers.value = custRes.data.data.map((c: any) => ({
				code: c.code,
				name: c.name,
				contracts: c.contracts || [
					{
						contractNo: `CTR-${c.code}-01`,
						contractName: `Annual Maintenance (${c.code})`,
						startDate: "2026-01-01",
						endDate: "2026-12-31",
					},
					{
						contractNo: `CTR-${c.code}-02`,
						contractName: `Equipment Overhaul (${c.code})`,
						startDate: "2026-06-01",
						endDate: "2027-05-31",
					},
				],
			}));
		}

		// Fetch Users
		const userRes = await userApi.getUsers({
			pageIndex: 0,
			pageSize: 1000,
			timezone: "Asia/Kuala_Lumpur",
		});
		if (userRes.data && userRes.data.data) {
			users.value = userRes.data.data.map((u: any) => ({
				code: u.code || u.guid,
				displayCode: u.displayCode || u.code || u.guid.substring(0, 8).toUpperCase(),
				name: u.displayName || u.profile?.displayName || u.name || "Unknown",
				role: (
					u.groups?.[0]?.name ||
					u.groups?.[0]?.code ||
					u.userGroupCode ||
					u.role ||
					u.userGroup ||
					u.description ||
					""
				).toLowerCase(),
			}));
		}

		// Fetch Work Types
		const wtRes = await workTypeApi.getWorkTypes({
			pageIndex: 0,
			pageSize: 100,
			timezone: "Asia/Kuala_Lumpur",
		});
		if (wtRes.data && wtRes.data.data) {
			workTypeList.value = wtRes.data.data.map((wt: any) => ({
				guid: wt.guid,
				code: wt.code,
				name: wt.name,
				withEquipmentForm: !!wt.withEquipmentForm,
			}));

			const match = workTypeList.value.find(
				(wt) =>
					(formData.value.workTypeGuid && wt.guid === formData.value.workTypeGuid) ||
					wt.code.toLowerCase() === formData.value.orderTypeCode.toLowerCase() ||
					wt.name.toLowerCase() === formData.value.workType.toLowerCase(),
			);

			if (match) {
				formData.value.workType = match.name;
				formData.value.orderTypeCode = match.code;
				formData.value.workTypeGuid = match.guid;
				formData.value.withEquipmentForm = match.withEquipmentForm;
				await fetchWorkTypeItems(match.guid);
			}
		}

		// Fetch Sites from Maintenance Site API
		try {
			const res = await http.get("/site", { params: { pageSize: 100 } });
			const rawSites = res?.data?.data || res?.data?.items || res?.data || [];
			if (Array.isArray(rawSites) && rawSites.length > 0) {
				sites.value = rawSites
					.filter((s: any) => s.isActive !== false)
					.map((s: any) => ({
						code: s.code,
						name: s.name,
						guid: s.guid,
					}));
			}
		} catch (e) {
			console.error("Failed to load site list from Maintenance site API:", e);
		}
	} catch (e) {
		console.error("Failed to load select options:", e);
	}
}

onMounted(async () => {
	if (!authStore.currentUser) void authStore.fetchMe();
	await loadOptions();

	const id = route.params.id;
	if (id && typeof id === "string") {
		try {
			loading.value = true;
			const { data } = await workOrderApi.getWorkOrderByGuid(id);
			const w = (data?.data || data) as any;
			if (w && (w.guid || w.code)) {
				workOrderOwnerCode.value = w.createdBy || w.createdByCode || "";
				workOrderCode.value =
					w.docNo || w.code || w.guid?.substring(0, 8).toUpperCase() || "";
				upsertUserOption(
					w.salesAgentCode,
					w.salesAgentName || w.salesAgentDisplayName || w.salesAgentProfileName,
					w.salesAgentDisplayCode,
					"sales",
				);
				upsertUserOption(
					w.projectPicCode || w.personInChargeCode,
					w.projectPicName || w.personInChargeName,
					w.projectPicDisplayCode || w.personInChargeDisplayCode,
					"manager",
				);
				upsertUserOption(
					w.leaderCode || w.leadEngineerCode,
					w.leaderName || w.leadEngineerName,
					w.leaderDisplayCode || w.leadEngineerDisplayCode,
					"engineer",
				);
				upsertUserOption(
					w.leaderIICode || w.leaderIiCode || w.leaderIicode,
					w.leaderIIName || w.leaderIiName || w.leaderIiname,
					w.leaderIIDisplayCode || w.leaderIiDisplayCode || w.leaderIidisplayCode,
					"engineer",
				);
				for (const technician of w.technicians || []) {
					upsertUserOption(
						technician.code,
						technician.name,
						technician.displayCode,
						"engineer",
					);
				}
				formData.value = {
					status: normalizeWorkOrderStatus(w),
					workType: w.workType || "Maintenance",
					orderTypeCode: w.orderTypeCode || "",
					workTypeGuid: w.workTypeGuid || "",
					withEquipmentForm: !!w.withEquipmentForm,
					orderTypeItemCode: w.workTypeItem || "",
					title: w.title || "",
					description: w.description || "",
					customerCode: w.customerCode || "",
					salesAgentCode: w.salesAgentCode || "",
					personInChargeCode: w.projectPicCode || w.personInChargeCode || "",
					jobPriority: w.jobPriority || "Low",
					siteCode: w.siteCode || "",
					location: w.location || w.locationName || "",
					latitude: w.latitude || 0,
					longitude: w.longitude || 0,
					startDate: w.startDate ? w.startDate.slice(0, 16) : todayDateStr,
					estimatedEndDate: w.estimatedEndDate
						? w.estimatedEndDate.slice(0, 16)
						: nextWeekDateStr,
					leaderCode: w.leaderCode || w.leadEngineerCode || "",
					leaderIICode: w.leaderIICode || w.leaderIiCode || w.leaderIicode || "",
					technicianCodes:
						w.technicianCodes ||
						(w.technicians || []).map((technician: any) => technician.code) ||
						w.assistantEngineers ||
						[],
					contractNo: w.contractNo || "",
					contractStartDate: w.contractStartDate ? w.contractStartDate.slice(0, 10) : "",
					contractEndDate: w.contractEndDate ? w.contractEndDate.slice(0, 10) : "",
					customerPic: w.customerPic || "",
					customerPicPhone: w.customerPicPhone || "",
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
					siteInstructionsFiles: [],
				};

				const filesResult = await workOrderApi.getFiles(id);
				const filesData = filesResult.data;
				const files = Array.isArray(filesData)
					? filesData
					: Array.isArray(filesData?.data)
						? filesData.data
						: Array.isArray(filesData?.data?.items)
							? filesData.data.items
							: Array.isArray(filesData?.items)
								? filesData.items
								: [];
				const siteInstructionFiles = files.filter(
					(file: any) =>
						file.category === "SiteInstructions" ||
						file.category === "SiteInstruction" ||
						file.category === "site_instructions",
				);
				formData.value.siteInstructionsFiles = await Promise.all(
					siteInstructionFiles.map(async (file: any) => {
						const isImage =
							(file.mimeType || "").startsWith("image/") ||
							/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(file.fileName || "");
						let url = file.storageUrl || "";
						if (url.startsWith("/work-order/")) url = `${API_BASE_URL}${url}`;

						if (isImage && url) {
							url = url.replace(/\/download$/, "/preview");
							try {
								const response = await http.get(url, { responseType: "blob" });
								url = URL.createObjectURL(response.data);
							} catch (error) {
								console.error("Failed to load Site Instruction preview:", error);
								url = "";
							}
						}

						return {
							name: file.fileName || "Site instruction",
							url,
							type: file.mimeType || (isImage ? "image/unknown" : ""),
							guid: file.guid,
						};
					}),
				);

				// Trigger contract lookup if edit mode has customerCode & contractNo
				if (formData.value.customerCode) {
					onCustomerChange();
					if (w.contractNo) {
						formData.value.contractNo = w.contractNo;
						if (w.contractStartDate)
							formData.value.contractStartDate = w.contractStartDate.slice(0, 10);
						if (w.contractEndDate)
							formData.value.contractEndDate = w.contractEndDate.slice(0, 10);
					}
				}
			}
		} catch (e) {
			console.error("Failed to load work order edit data:", e);
		} finally {
			loading.value = false;
		}
	}
});

const phases = [
	{ id: "1", name: "Single Phase" },
	{ id: "2", name: "Two Phase" },
	{ id: "3", name: "Three Phase" },
];

const salesAgentUsers = computed(() => {
	const filtered = users.value.filter((u: any) => {
		const code = (u.displayCode || u.code || "").toUpperCase();
		const r = (u.role || u.userGroup || "").toLowerCase();
		return (
			(code.startsWith("SAL") || !code.startsWith("SA") || r.includes("sales")) &&
			!code.startsWith("ADM") &&
			!code.startsWith("MNG") &&
			!code.startsWith("ENG")
		);
	});
	return filtered;
});

const projectPicUsers = computed(() => {
	const filtered = users.value.filter((u: any) => {
		const code = (u.displayCode || u.code || "").toUpperCase();
		const r = (u.role || u.userGroup || "").toLowerCase();
		return (
			(code.startsWith("MNG") ||
				code.startsWith("MGR") ||
				code.startsWith("PM") ||
				r === "manager" ||
				r === "pm" ||
				r.includes("manager")) &&
			!code.startsWith("ADM") &&
			!code.startsWith("SAL") &&
			!code.startsWith("ENG")
		);
	});
	return filtered;
});

const engineerUsers = computed(() => {
	const filtered = users.value.filter((u: any) => {
		const code = (u.displayCode || u.code || "").toUpperCase();
		const r = (u.role || u.userGroup || "").toLowerCase();
		return (
			(code.startsWith("ENG") ||
				code.startsWith("TECH") ||
				r === "engineer" ||
				r === "eng" ||
				r.includes("engineer")) &&
			!code.startsWith("ADM") &&
			!code.startsWith("SAL") &&
			!code.startsWith("MNG")
		);
	});
	return filtered;
});

const leaderOptions = computed(() => {
	const selected = users.value.find((u: any) => u.code === formData.value.leaderCode);
	const candidates = selected ? [...engineerUsers.value, selected] : engineerUsers.value;
	return Array.from(new Map(candidates.map((u: any) => [u.code, u])).values()).filter(
		(u: any) =>
			u.code === formData.value.leaderCode ||
			(u.code !== formData.value.leaderIICode &&
				!formData.value.technicianCodes.includes(u.code)),
	);
});

const leaderIIOptions = computed(() => {
	const selected = users.value.find((u: any) => u.code === formData.value.leaderIICode);
	const candidates = selected ? [...engineerUsers.value, selected] : engineerUsers.value;
	return Array.from(new Map(candidates.map((u: any) => [u.code, u])).values()).filter(
		(u: any) =>
			u.code === formData.value.leaderIICode ||
			(u.code !== formData.value.leaderCode &&
				!formData.value.technicianCodes.includes(u.code)),
	);
});

const technicianOptions = computed(() => {
	const selected = formData.value.technicianCodes
		.map((code) => users.value.find((u: any) => u.code === code))
		.filter(Boolean);
	const candidates = [...engineerUsers.value, ...selected];
	return Array.from(new Map(candidates.map((u: any) => [u.code, u])).values())
		.filter(
			(u: any) =>
				formData.value.technicianCodes.includes(u.code) ||
				(u.code !== formData.value.leaderCode && u.code !== formData.value.leaderIICode),
		)
		.map((u: any) => ({
			code: u.code,
			name: userOptionDisplay(u),
		}));
});

function getContractStatus(c: any): "Active" | "ExpiringSoon" | "Expired" {
	if (c.status) return c.status;
	if (!c.endDate) return "Active";
	const now = new Date();
	const end = new Date(c.endDate);
	if (end < now) return "Expired";
	const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	if (end <= thirtyDays) return "ExpiringSoon";
	return "Active";
}

const availableContracts = computed(() => {
	if (!formData.value.customerCode) return [];
	const cust = customers.value.find((c: any) => c.code === formData.value.customerCode);
	return (cust?.contracts || []).map((c: any) => ({
		...c,
		status: getContractStatus(c),
	}));
});

const selectedContractInfo = computed(() => {
	if (!formData.value.contractNo) return null;
	return availableContracts.value.find((c: any) => c.contractNo === formData.value.contractNo);
});

function onCustomerChange() {
	const validContracts = availableContracts.value.filter((c: any) => c.status !== "Expired");
	if (validContracts.length > 0) {
		onContractChange(validContracts[0].contractNo);
	} else {
		formData.value.contractNo = "";
		formData.value.contractStartDate = "";
		formData.value.contractEndDate = "";
	}
}

function onContractChange(contractNo: string) {
	formData.value.contractNo = contractNo;
	const selected = availableContracts.value.find((c: any) => c.contractNo === contractNo);
	if (selected) {
		formData.value.contractStartDate = selected.startDate
			? selected.startDate.slice(0, 10)
			: "";
		formData.value.contractEndDate = selected.endDate ? selected.endDate.slice(0, 10) : "";
	}
}

const contractSelectOptions = computed<any[]>(() => {
	return availableContracts.value.map((c: any) => ({
		value: c.contractNo,
		label: `${c.contractNo} ${c.contractName ? " - " + c.contractName : ""}`,
		badgeText:
			c.status === "Expired"
				? "Expired"
				: c.status === "ExpiringSoon"
					? "Expiring Soon"
					: "Active Contract",
		badgeType:
			c.status === "Expired" ? "error" : c.status === "ExpiringSoon" ? "warning" : "success",
	}));
});

function redirectToCustomerRenew(contract: any) {
	if (!formData.value.customerCode) {
		snackbar.error("Please select a Customer first.");
		return;
	}
	const cust = customers.value.find((c: any) => c.code === formData.value.customerCode);
	const custGuid = cust?.guid || cust?.code || formData.value.customerCode;
	const targetContractNo = contract?.contractNo || formData.value.contractNo;

	router.push({
		path: "/customer/form",
		query: {
			code: custGuid,
			action: "renew",
			contractNo: targetContractNo,
		},
	});
}

const selectedWorkType = computed(() => {
	const guid = formData.value.workTypeGuid;
	const code = (formData.value.orderTypeCode || "").toLowerCase();
	const name = (formData.value.workType || "").toLowerCase();

	return workTypeList.value.find(
		(wt: any) =>
			(guid && wt.guid === guid) ||
			(code && wt.code?.toLowerCase() === code) ||
			(name && wt.name?.toLowerCase() === name),
	);
});

const showEquipmentForm = computed(
	() => selectedWorkType.value?.withEquipmentForm ?? formData.value.withEquipmentForm,
);

const isMechanical = computed(() => {
	const code = (selectedWorkType.value?.code || formData.value.orderTypeCode || "").toLowerCase();
	const name = (selectedWorkType.value?.name || formData.value.workType || "").toLowerCase();
	return code.includes("mechanical") || name.includes("mechanical");
});

const formErrors = ref<Record<string, string>>({});

function validateDraftForm(): boolean {
	formErrors.value = {};
	let isValid = true;

	if (!formData.value.orderTypeItemCode) {
		formErrors.value.orderTypeItemCode = "Work Type Item is required";
		isValid = false;
	}
	if (!formData.value.title?.trim()) {
		formErrors.value.title = "Title is required";
		isValid = false;
	}
	if (!formData.value.description?.trim()) {
		formErrors.value.description = "Work Description is required";
		isValid = false;
	}
	if (!formData.value.customerCode) {
		formErrors.value.customerCode = "Customer is required";
		isValid = false;
	}
	if (!formData.value.salesAgentCode) {
		formErrors.value.salesAgentCode = "Sales Agent is required";
		isValid = false;
	}

	if (!isValid) snackbar.warning("Please fill in all compulsory fields (*).");
	return isValid;
}

function validateForm(): boolean {
	formErrors.value = {};
	let isValid = true;

	if (!formData.value.orderTypeItemCode) {
		formErrors.value.orderTypeItemCode = "Work Type Item is required";
		isValid = false;
	}
	if (!formData.value.title?.trim()) {
		formErrors.value.title = "Title is required";
		isValid = false;
	}
	if (!formData.value.description?.trim()) {
		formErrors.value.description = "Work Description is required";
		isValid = false;
	}
	if (!formData.value.customerCode) {
		formErrors.value.customerCode = "Customer is required";
		isValid = false;
	}
	if (!formData.value.contractNo?.trim()) {
		formErrors.value.contractNo = "Contract No is required";
		isValid = false;
	}
	if (!formData.value.salesAgentCode) {
		formErrors.value.salesAgentCode = "Sales Agent is required";
		isValid = false;
	}
	if (!formData.value.personInChargeCode) {
		formErrors.value.personInChargeCode = "Person in Charge (PIC) is required";
		isValid = false;
	}
	if (!formData.value.siteCode) {
		formErrors.value.siteCode = "Site is required";
		isValid = false;
	}
	if (!formData.value.startDate) {
		formErrors.value.startDate = "Start Date is required";
		isValid = false;
	}
	if (!formData.value.estimatedEndDate) {
		formErrors.value.estimatedEndDate = "Estimated Completion Date is required";
		isValid = false;
	}

	// End date must be after start date
	if (formData.value.startDate && formData.value.estimatedEndDate) {
		if (new Date(formData.value.estimatedEndDate) <= new Date(formData.value.startDate)) {
			formErrors.value.estimatedEndDate = "End date must be after start date";
			isValid = false;
		}
	}

	if (showEquipmentForm.value) {
		if (!formData.value.equipment.name?.trim()) {
			formErrors.value["equipment.name"] = "Equipment Name is required";
			isValid = false;
		}
		if (!formData.value.equipment.serialNo?.trim()) {
			formErrors.value["equipment.serialNo"] = "Equipment Serial No is required";
			isValid = false;
		}
		if (!formData.value.equipment.brand?.trim()) {
			formErrors.value["equipment.brand"] = "Equipment Brand is required";
			isValid = false;
		}
		if (!formData.value.equipment.model?.trim()) {
			formErrors.value["equipment.model"] = "Equipment Model is required";
			isValid = false;
		}
		if (!formData.value.equipment.equipmentType?.trim()) {
			formErrors.value["equipment.equipmentType"] = "Equipment Type is required";
			isValid = false;
		}
	}

	if (isMechanical.value) {
		const technicalFields = [
			["flowHead", "Flow & Head"],
			["brandName", "Brand Name"],
			["serialNo", "Serial No"],
			["ratedVoltage", "Rated Voltage"],
			["ratedSpeed", "Rated Speed"],
			["ratedCurrent", "Rated Current"],
			["ratedPower", "Rated Power"],
			["phase", "Phase"],
			["frameSize", "Frame Size"],
		] as const;

		for (const [field, label] of technicalFields) {
			if (!formData.value.technical[field]?.trim()) {
				formErrors.value[`technical.${field}`] = `${label} is required`;
				isValid = false;
			}
		}
	}

	if (!isValid) snackbar.warning("Please fill in all compulsory fields (*).");
	return isValid;
}

function validateApprovalAttachments(): boolean {
	siteInstructionsError.value = "";
	if (formData.value.siteInstructionsFiles.length < 2) {
		siteInstructionsError.value =
			"At least 2 site instruction files are required when requesting approval";
		snackbar.warning(siteInstructionsError.value);
		return false;
	}
	return true;
}

function extractWorkOrderGuid(response: any): string {
	const guid =
		response?.data?.data?.guid ||
		response?.data?.guid ||
		response?.data?.data?.workOrderGuid ||
		response?.data?.workOrderGuid ||
		response?.data?.data?.id ||
		response?.data?.id ||
		"";
	if (guid) return guid;

	const location = response?.response?.headers?.get?.("location") || "";
	return location.split("/").filter(Boolean).pop() || "";
}

async function uploadSelectedSiteInstructions(workOrderGuid: string): Promise<void> {
	const selectedFiles = formData.value.siteInstructionsFiles
		.map((item) => item.file)
		.filter((file): file is File => !!file);

	if (selectedFiles.length === 0) return;

	const uploadBody = new FormData();
	for (const file of selectedFiles) {
		uploadBody.append("files", file, file.name);
	}
	uploadBody.append("category", SITE_INSTRUCTIONS_CATEGORY);

	const response = await workOrderApi.uploadFiles(workOrderGuid, uploadBody);
	if (!response.ok) {
		let message = "Failed to upload site instruction files";
		try {
			const errorBody = await response.json();
			message = errorBody?.error?.message || errorBody?.message || message;
		} catch {
			// Keep the fallback message when the response is not JSON.
		}
		throw new Error(message);
	}

	for (const item of formData.value.siteInstructionsFiles) {
		if (item.file) item.file = undefined;
	}
}

function buildBody(): Record<string, any> {
	return {
		workType: formData.value.workType,
		workTypeItem: formData.value.orderTypeItemCode,
		title: formData.value.title,
		description: formData.value.description,
		customerCode: formData.value.customerCode,
		salesAgentCode: formData.value.salesAgentCode,
		personInChargeCode: formData.value.personInChargeCode || undefined,
		jobPriority: formData.value.jobPriority || undefined,
		siteCode: formData.value.siteCode || undefined,
		location: formData.value.location || undefined,
		latitude: formData.value.latitude || undefined,
		longitude: formData.value.longitude || undefined,
		startDate: formData.value.startDate
			? new Date(formData.value.startDate).toISOString()
			: undefined,
		estimatedEndDate: formData.value.estimatedEndDate
			? new Date(formData.value.estimatedEndDate).toISOString()
			: undefined,
		leaderCode: formData.value.leaderCode || undefined,
		leaderIICode: formData.value.leaderIICode || undefined,
		technicianCodes: formData.value.technicianCodes,
		contractNo: formData.value.contractNo || undefined,
		contractStartDate: formData.value.contractStartDate
			? new Date(formData.value.contractStartDate).toISOString()
			: undefined,
		contractEndDate: formData.value.contractEndDate
			? new Date(formData.value.contractEndDate).toISOString()
			: undefined,
		customerPic: formData.value.customerPic || undefined,
		customerPicPhone: formData.value.customerPicPhone || undefined,
		equipment: showEquipmentForm.value ? [formData.value.equipment] : undefined,
		technical: isMechanical.value ? formData.value.technical : undefined,
	};
}

function buildPendingBody(): Record<string, any> {
	return {
		startDate: formData.value.startDate
			? new Date(formData.value.startDate).toISOString()
			: undefined,
		estimatedEndDate: formData.value.estimatedEndDate
			? new Date(formData.value.estimatedEndDate).toISOString()
			: undefined,
		description: formData.value.description || undefined,
		jobPriority: formData.value.jobPriority || undefined,
		siteCode: formData.value.siteCode || undefined,
		location: formData.value.location || undefined,
		latitude: formData.value.latitude || undefined,
		longitude: formData.value.longitude || undefined,
		personInChargeCode: formData.value.personInChargeCode || undefined,
		leaderCode: formData.value.leaderCode || undefined,
		leaderIICode: formData.value.leaderIICode || undefined,
		technicianCodes: formData.value.technicianCodes,
	};
}

function goToWorkOrderReadOnly(workOrderGuid: string) {
	router.replace({
		name: "Work Order Form",
		params: { id: workOrderGuid },
		query: { mode: "view" },
	});
}

async function submitDraft() {
	if (!validateDraftForm()) {
		console.error("Draft validation failed", formErrors.value);
		return;
	}
	try {
		loading.value = true;
		const id = route.params.id;
		const body = buildBody();
		let savedWorkOrderGuid = typeof id === "string" ? id : "";
		delete body.status;
		if (id && typeof id === "string") {
			const { error } = await workOrderApi.updateDraft(id, body);
			if (error) {
				snackbar.error(getApiErrorMessage(error, "Failed to update draft"));
				return;
			}
			await uploadSelectedSiteInstructions(id);
			snackbar.success("Work order draft updated successfully!");
		} else {
			const result = await workOrderApi.createDraft(body as any);
			const { error } = result;
			if (error) {
				snackbar.error(getApiErrorMessage(error, "Failed to save draft"));
				return;
			}
			const workOrderGuid = extractWorkOrderGuid(result);
			savedWorkOrderGuid = workOrderGuid;
			if (!workOrderGuid) {
				throw new Error("Draft created, but the server did not return its Work Order GUID");
			}
			if (formData.value.siteInstructionsFiles.some((item) => item.file)) {
				await uploadSelectedSiteInstructions(workOrderGuid);
			}
			snackbar.success("Work order draft created successfully!");
		}
		if (savedWorkOrderGuid) goToWorkOrderReadOnly(savedWorkOrderGuid);
	} catch (e) {
		console.error(e);
		snackbar.error(e instanceof Error ? e.message : "Failed to save work order draft");
	} finally {
		loading.value = false;
	}
}

async function submitNew() {
	if (!validateForm()) {
		console.error("Validation failed", formErrors.value);
		return;
	}
	try {
		loading.value = true;
		const id = route.params.id;
		const body = buildBody();
		let savedWorkOrderGuid = typeof id === "string" ? id : "";
		if (id && typeof id === "string") {
			if (formData.value.status === "Draft") {
				const updateRes = await workOrderApi.updateDraft(id, body);
				if (updateRes.error) {
					snackbar.error(
						getApiErrorMessage(updateRes.error, "Failed to update draft"),
					);
					return;
				}
				await uploadSelectedSiteInstructions(id);
				const { error } = await workOrderApi.submitNew(id, {
					estimatedEndDate: body.estimatedEndDate,
				} as any);
				if (error) {
					snackbar.error(
						getApiErrorMessage(error, "Failed to submit work order"),
					);
					return;
				}
			} else {
				const { error } = await workOrderApi.updateNew(id, body);
				if (error) {
					snackbar.error(
						getApiErrorMessage(error, "Failed to update work order"),
					);
					return;
				}
				await uploadSelectedSiteInstructions(id);
			}
			snackbar.success("Work order submitted successfully!");
		} else {
			const result = await workOrderApi.createNew(body as any);
			const { error } = result;
			if (error) {
				snackbar.error(
					getApiErrorMessage(error, "Failed to submit work order"),
				);
				return;
			}
			const workOrderGuid = extractWorkOrderGuid(result);
			savedWorkOrderGuid = workOrderGuid;
			if (!workOrderGuid) {
				throw new Error("Work Order created, but the server did not return its GUID");
			}
			if (formData.value.siteInstructionsFiles.some((item) => item.file)) {
				await uploadSelectedSiteInstructions(workOrderGuid);
			}
			snackbar.success("Work order submitted successfully!");
		}
		formData.value.status = "New";
		if (savedWorkOrderGuid) goToWorkOrderReadOnly(savedWorkOrderGuid);
	} catch (e) {
		console.error(e);
		snackbar.error(e instanceof Error ? e.message : "Failed to submit work order");
	} finally {
		loading.value = false;
	}
}

async function submitAndRequestApproval() {
	const isFormValid = validateForm();
	const areAttachmentsValid = validateApprovalAttachments();
	if (!isFormValid || !areAttachmentsValid) {
		console.error("Validation failed", formErrors.value);
		return;
	}
	try {
		loading.value = true;
		const id = route.params.id;
		const body = buildBody();
		let savedWorkOrderGuid = typeof id === "string" ? id : "";
		if (id && typeof id === "string") {
			if (formData.value.status === "Draft") {
				const updateRes = await workOrderApi.updateDraft(id, body);
				if (updateRes.error) {
					snackbar.error(
						getApiErrorMessage(updateRes.error, "Failed to update draft"),
					);
					return;
				}
				await uploadSelectedSiteInstructions(id);
				const { error } = await workOrderApi.submitApproval(id, {
					estimatedEndDate: body.estimatedEndDate,
				} as any);
				if (error) {
					snackbar.error(
						getApiErrorMessage(error, "Failed to request approval"),
					);
					return;
				}
			} else if (formData.value.status === "New") {
				const updateRes = await workOrderApi.updateNew(id, body);
				if (updateRes.error) {
					snackbar.error(
						getApiErrorMessage(updateRes.error, "Failed to update work order"),
					);
					return;
				}
				await uploadSelectedSiteInstructions(id);
				const { error } = await workOrderApi.submitApproval(id, {
					estimatedEndDate: body.estimatedEndDate,
				} as any);
				if (error) {
					snackbar.error(
						getApiErrorMessage(error, "Failed to request approval"),
					);
					return;
				}
			} else {
				const { error } = await workOrderApi.updatePending(id, body);
				if (error) {
					snackbar.error(
						getApiErrorMessage(error, "Failed to request approval"),
					);
					return;
				}
			}
			snackbar.success("Work order submitted for approval!");
		} else {
			const pendingResult = await workOrderApi.createPending(body as any);
			const { error } = pendingResult;
			if (error) {
				snackbar.error(
					getApiErrorMessage(error, "Failed to request approval"),
				);
				return;
			}
			const workOrderGuid = extractWorkOrderGuid(pendingResult);
			savedWorkOrderGuid = workOrderGuid;
			if (!workOrderGuid) {
				throw new Error(
					"Work Order submitted for approval, but the server did not return its GUID",
				);
			}
			await uploadSelectedSiteInstructions(workOrderGuid);
			snackbar.success("Work order submitted for approval!");
		}
		formData.value.status = "PendingApproval";
		if (savedWorkOrderGuid) goToWorkOrderReadOnly(savedWorkOrderGuid);
	} catch (e) {
		console.error(e);
		snackbar.error(
			`${e instanceof Error ? e.message : "Failed to request approval"}. The Work Order was not moved to Pending Approval, so you can retry.`,
		);
	} finally {
		loading.value = false;
	}
}

async function saveNew() {
	if (!validateForm()) {
		console.error("Validation failed", formErrors.value);
		return;
	}
	try {
		loading.value = true;
		const id = route.params.id;
		if (id && typeof id === "string") {
			const { error } = await workOrderApi.updateNew(id, buildBody());
			if (error) {
				snackbar.error(
					getApiErrorMessage(error, "Failed to save work order"),
				);
				return;
			}
			await uploadSelectedSiteInstructions(id);
			snackbar.success("Work order saved successfully (Status: New)!");
			goToWorkOrderReadOnly(id);
		}
	} catch (e) {
		console.error(e);
		snackbar.error(e instanceof Error ? e.message : "Failed to save work order");
	} finally {
		loading.value = false;
	}
}

async function updatePending(options: { stayInEdit?: boolean; silent?: boolean } = {}) {
	if (!validateForm()) {
		console.error("Validation failed", formErrors.value);
		return false;
	}
	try {
		loading.value = true;
		const id = route.params.id;
		if (id && typeof id === "string") {
			const { error } = await workOrderApi.updatePending(id, buildPendingBody());
			if (error) {
				alert(
					getApiErrorMessage(error, "Failed to update pending approval work order"),
				);
				return false;
			}
			if (!options.silent)
				snackbar.success("Pending Approval work order updated successfully!");
			if (!options.stayInEdit) goToWorkOrderReadOnly(id);
			return true;
		}
		return false;
	} catch (e) {
		console.error(e);
		snackbar.error(
			e instanceof Error ? e.message : "Failed to update pending approval work order",
		);
		return false;
	} finally {
		loading.value = false;
	}
}

async function approvePendingFromEdit() {
	const id = route.params.id;
	if (typeof id !== "string") return;
	const updated = await updatePending({ stayInEdit: true, silent: true });
	if (!updated) return;
	const { error } = await workOrderApi.approve(id);
	if (error) {
		snackbar.error(getApiErrorMessage(error, "Failed to approve work order"));
		return;
	}
	snackbar.success("Work order approved successfully!");
	showApproveDialog.value = false;
	await router.replace({ name: "Work Order Form", params: { id }, query: { mode: "view" } });
	window.location.reload();
}

async function submitChanges() {
	if (!validateForm()) {
		console.error("Validation failed", formErrors.value);
		return;
	}
	try {
		loading.value = true;
		const id = route.params.id;
		if (id && typeof id === "string") {
			let res;
			if (formData.value.status === "Draft") {
				res = await workOrderApi.updateDraft(id, buildBody());
			} else if (formData.value.status === "New") {
				res = await workOrderApi.updateNew(id, buildBody());
			} else if (formData.value.status === "PendingApproval") {
				res = await workOrderApi.updatePending(id, buildBody());
			} else {
				res = await workOrderApi.updateProgress(id, buildBody());
			}
			if (res && res.error) {
				snackbar.error(getApiErrorMessage(res.error, "Failed to save changes"));
				return;
			}
			snackbar.success("Work order updated successfully!");
		}
		router.back();
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

function cancel() {
	const id = route.params.id;
	if (!isReadOnly.value && typeof id === "string") {
		goToWorkOrderReadOnly(id);
		return;
	}
	router.back();
}

async function approvePendingReadOnly() {
	const id = route.params.id;
	if (typeof id !== "string") return;
	const { error } = await workOrderApi.approve(id);
	if (error) {
		snackbar.error(getApiErrorMessage(error, "Failed to approve work order"));
		return;
	}
	snackbar.success("Work order approved successfully!");
	showApproveDialog.value = false;
	await router.replace({ name: "Work Order Form", params: { id }, query: { mode: "view" } });
	window.location.reload();
}

async function rejectPendingReadOnly() {
	const id = route.params.id;
	if (typeof id !== "string") return;
	if (!rejectReason.value.trim()) return;
	const { error } = await workOrderApi.reject(id, {
		rejectedReason: rejectReason.value.trim(),
	});
	if (error) {
		snackbar.error(getApiErrorMessage(error, "Failed to reject work order"));
		return;
	}
	snackbar.success("Work order rejected successfully!");
	showRejectDialog.value = false;
	rejectReason.value = "";
	await router.replace({ name: "Work Order Form", params: { id }, query: { mode: "view" } });
	window.location.reload();
}

function openApproveConfirmation() {
	showApproveDialog.value = true;
}

function openRejectConfirmation() {
	rejectReason.value = "";
	showRejectDialog.value = true;
}

async function confirmPendingApproval() {
	if (isReadOnly.value) {
		await approvePendingReadOnly();
	} else {
		await approvePendingFromEdit();
	}
}

const priorityColors: Record<string, string> = {
	High: "error",
	Medium: "warning",
	Low: "info",
};
</script>

<template>
	<div class="workorder-form-view">
		<div class="page-header">
			<div class="title-area">
				<h1>{{ pageTitle }}</h1>
				<p>Set the work order details, assign the right schedule and resources.</p>
			</div>
			<div class="actions-area">
				<Button variant="secondary" @click="cancel">{{
					isReadOnly ? "Back" : "Cancel"
				}}</Button>
				<template v-if="isReadOnly">
					<Button
						v-if="canEditReadOnlyWorkOrder"
						variant="primary"
						@click="
							router.replace({
								name: 'Work Order Form',
								params: { id: route.params.id },
							})
						"
					>
						<i class="mdi mdi-note-edit-outline"></i> Edit
					</Button>
					<Button
						v-if="isNewStatus && canEditReadOnlyWorkOrder"
						variant="primary"
						:disabled="loading"
						@click="submitAndRequestApproval"
					>
						<i class="mdi mdi-check"></i> Request For Approval
					</Button>
					<template v-if="isPendingApproval">
						<Button
							v-if="authStore.can('approve', 'WorkOrder')"
							variant="primary"
							@click="openApproveConfirmation"
						>
							<i class="mdi mdi-check-circle-outline"></i> Approve
						</Button>
						<Button
							v-if="authStore.can('reject', 'WorkOrder')"
							variant="danger"
							@click="openRejectConfirmation"
						>
							<i class="mdi mdi-close-circle-outline"></i> Reject
						</Button>
					</template>
				</template>
				<template v-else-if="!isEditMode || isDraftStatus">
					<Button variant="outlined" @click="submitDraft">
						<i class="mdi mdi-content-save-outline"></i> Save as Draft
					</Button>
					<Button variant="outlined" @click="submitNew">
						<i class="mdi mdi-send-outline"></i> Submit
					</Button>
					<Button variant="primary" @click="submitAndRequestApproval">
						<i class="mdi mdi-check"></i> Save & Request Approval
					</Button>
				</template>
				<template v-else-if="isNewStatus">
					<Button variant="outlined" @click="saveNew">
						<i class="mdi mdi-content-save"></i> Save New
					</Button>
					<Button variant="primary" @click="submitAndRequestApproval">
						<i class="mdi mdi-check"></i> Request For Approval
					</Button>
				</template>
				<template v-else-if="isPendingApproval">
					<Button variant="outlined" @click="() => updatePending()">
						<i class="mdi mdi-content-save"></i> Update
					</Button>
					<Button
						v-if="authStore.can('approve', 'WorkOrder')"
						variant="primary"
						@click="openApproveConfirmation"
					>
						<i class="mdi mdi-check-circle-outline"></i> Approve
					</Button>
					<Button
						v-if="authStore.can('reject', 'WorkOrder')"
						variant="danger"
						@click="openRejectConfirmation"
					>
						<i class="mdi mdi-close-circle-outline"></i> Reject
					</Button>
				</template>
				<template v-else>
					<Button variant="primary" @click="submitChanges">
						<i class="mdi mdi-content-save"></i> Save Changes
					</Button>
				</template>
			</div>
		</div>

		<!-- Helper Banner -->
		<div v-if="!isReadOnly" class="form-helper-banner">
			<div class="form-helper-banner__icon">
				<i class="mdi mdi-information"></i>
			</div>
			<div class="form-helper-banner__text">
				<div class="helper-line">
					<span class="helper-bullet">-</span>
					<span
						><strong>Save as Draft</strong> creates a New editable work order.
						<em
							>(Required: Work Type Item, Title, Sales Agent, Customer,
							Description)</em
						></span
					>
				</div>
				<div class="helper-line">
					<span class="helper-bullet">-</span>
					<span
						><strong>Submit</strong> creates a Work Order with status
						<strong>New</strong>.</span
					>
				</div>
				<div class="helper-line">
					<span class="helper-bullet">-</span>
					<span
						><strong>Request For Approval</strong> submits the work order for approval
						with status <strong>Pending Approval</strong>.</span
					>
				</div>
			</div>
		</div>

		<fieldset class="read-only-fieldset" :disabled="isReadOnly">
			<div class="form-grid">
				<div class="form-grid__main">
					<!-- Work Order Details -->
					<Card>
						<template #header>
							<h2>Work Order Details</h2>
							<div style="display: flex; gap: 8px; align-items: center">
								<Badge type="primary" icon="mdi-tools">{{
									formData.workType
								}}</Badge>
								<Badge
									v-if="formData.jobPriority"
									:type="priorityColors[formData.jobPriority] as any"
									:icon="
										formData.jobPriority === 'High'
											? 'mdi-alert-circle'
											: formData.jobPriority === 'Medium'
												? 'mdi-alert'
												: 'mdi-information'
									"
								>
									{{ formData.jobPriority }} Priority
								</Badge>
							</div>
						</template>
						<div class="grid-row">
							<!-- Row 1: Job Priority + Work Type Item -->
							<div class="col-6">
								<Select v-model="formData.jobPriority" label="Job Priority" :disabled="isFieldDisabled('jobPriority')">
									<option value="">Select Priority</option>
									<option
										v-for="p in JOB_PRIORITIES"
										:key="p.value"
										:value="p.value"
									>
										{{ p.label }}
									</option>
								</Select>
							</div>
							<div class="col-6">
								<Autocomplete
									v-model="formData.orderTypeItemCode"
									:disabled="isFieldDisabled('orderTypeItemCode')"
									:options="
										workTypeItems.map((item) => ({
											id: item.code,
											name: item.name,
											code: item.code,
										}))
									"
									label="Work Type Item *"
									placeholder="Search or select work type item..."
									:error="formErrors.orderTypeItemCode"
								/>
							</div>
							<div class="col-12">
								<Textbox
									v-model="formData.title"
									:disabled="isFieldDisabled('title')"
									label="Title *"
									placeholder="Enter Title"
									:error="formErrors.title"
								/>
							</div>

							<!-- Row 2: Sales Agent + Person In Charge -->
							<div class="col-6">
								<Autocomplete
									v-model="formData.salesAgentCode"
									:disabled="isFieldDisabled('salesAgentCode')"
									:options="
										salesAgentUsers.map((u) => ({
											id: u.code,
											name: userOptionDisplay(u),
											code: u.displayCode || u.code,
										}))
									"
									label="Sales Agent *"
									placeholder="Search or select Sales Agent..."
									:error="formErrors.salesAgentCode"
									:showCode="false"
								/>
							</div>
							<div class="col-6">
								<Autocomplete
									v-model="formData.personInChargeCode"
									:disabled="isFieldDisabled('personInChargeCode')"
									:options="
										projectPicUsers.map((u) => ({
											id: u.code,
											name: userOptionDisplay(u),
											code: u.displayCode || u.code,
										}))
									"
									label="Project PIC *"
									placeholder="Search or select Project PIC..."
									:error="formErrors.personInChargeCode"
									:showCode="false"
								/>
							</div>

							<!-- Row 3: Start Date + Estimated End Date -->
							<div class="col-6">
								<DatePicker
									v-model="formData.startDate"
									:disabled="isFieldDisabled('startDate')"
									label="Start Date *"
									:error="formErrors.startDate"
									:enableTime="false"
								/>
							</div>
							<div class="col-6">
								<DatePicker
									v-model="formData.estimatedEndDate"
									:disabled="isFieldDisabled('estimatedEndDate')"
									label="Estimated Date of Completion *"
									:min="formData.startDate"
									:error="formErrors.estimatedEndDate"
									:enableTime="false"
								/>
							</div>

							<!-- Row 4: Leader + Leader II -->
							<div class="col-6">
								<Autocomplete
									v-model="formData.leaderCode"
									:disabled="isFieldDisabled('leaderCode')"
									:options="
										leaderOptions.map((u) => ({
											id: u.code,
											name: userOptionDisplay(u),
											code: u.displayCode || u.code,
										}))
									"
									label="Leader"
									placeholder="Search or select Leader..."
									:error="formErrors.leaderCode"
									:showCode="false"
								/>
							</div>
							<div class="col-6">
								<Autocomplete
									v-model="formData.leaderIICode"
									:disabled="isFieldDisabled('leaderIICode')"
									:options="
										leaderIIOptions.map((u) => ({
											id: u.code,
											name: userOptionDisplay(u),
											code: u.displayCode || u.code,
										}))
									"
									label="Leader II"
									placeholder="Search or select Leader II..."
									:showCode="false"
								/>
							</div>

							<!-- Technicians -->
							<div class="col-12 textbox-field">
								<MultiSelect
									v-model="formData.technicianCodes"
									:disabled="isFieldDisabled('technicianCodes')"
									:options="technicianOptions"
									label="Technicians"
									placeholder="Search to add technicians..."
									:showCode="false"
								/>
							</div>

							<!-- Work Description -->
							<div class="col-12 textbox-field" style="margin-top: 8px">
								<label class="custom-label">Work Description *</label>
								<textarea
									v-model="formData.description"
									:disabled="isFieldDisabled('description')"
									class="custom-textarea"
									:class="{ 'custom-textarea--error': formErrors.description }"
									placeholder="Enter Description"
									rows="4"
								></textarea>
								<div class="textbox-field__footer" v-if="formErrors.description">
									<p class="textbox-field__error">
										<i
											class="mdi mdi-alert-circle-outline textbox-field__error-icon"
										></i>
										<span class="textbox-field__error-text">{{
											formErrors.description
										}}</span>
									</p>
								</div>
							</div>
						</div>
					</Card>

					<!-- Site Instructions Attachments -->
					<Card style="margin-top: var(--spacing-lg)">
						<template #header>
							<h2>Site Instructions</h2>
							<Badge type="info" icon="mdi-paperclip">
								{{ formData.siteInstructionsFiles.length }}/3 Files
							</Badge>
						</template>
						<p class="section-subtitle">
							Attach site instruction documents (e.g. PO, WhatsApp images). Minimum 2,
							maximum 3 files. <strong>Cannot be deleted once uploaded.</strong>
						</p>

						<div class="site-instructions-zone">
							<div class="file-list" v-if="formData.siteInstructionsFiles.length > 0">
								<div
									v-for="(file, idx) in formData.siteInstructionsFiles"
									:key="idx"
									class="file-item"
								>
									<div
										class="file-item__preview"
										:style="{
											cursor:
												isReadOnly &&
												file.type.startsWith('image/') &&
												file.url
													? 'pointer'
													: 'default',
										}"
										@click="
											isReadOnly &&
											file.type.startsWith('image/') &&
											file.url &&
											openImageModal(file.url)
										"
									>
										<img
											v-if="file.type.startsWith('image/') && file.url"
											:src="file.url"
											:alt="file.name"
											class="file-item__thumb"
										/>
										<div v-else class="file-item__doc-icon">
											<i class="mdi mdi-file-pdf-box"></i>
										</div>
									</div>
									<div class="file-item__info">
										<a
											v-if="
												isReadOnly &&
												file.type.startsWith('image/') &&
												file.url
											"
											href="javascript:void(0)"
											@click="openImageModal(file.url)"
											class="file-item__name-link"
										>
											{{ file.name }}
										</a>
										<a
											v-else-if="!file.type.startsWith('image/') && file.url"
											href="#"
											@click.prevent="openSiteInstructionFile(file)"
											class="file-item__name-link"
										>
											{{ file.name }}
										</a>
										<span v-else class="file-item__name">{{ file.name }}</span>
									</div>
									<button
										v-if="!isFieldDisabled('siteInstructionsFiles')"
										class="file-item__remove"
										@click="removeSiteInstruction(idx)"
										title="Remove file"
									>
										<i class="mdi mdi-close"></i>
									</button>
								</div>
							</div>

							<button
								v-if="
									!isFieldDisabled('siteInstructionsFiles') &&
									formData.siteInstructionsFiles.length < 3
								"
								class="upload-trigger"
								@click="triggerSiteInstructionsUpload"
							>
								<i class="mdi mdi-cloud-upload-outline"></i>
								<span
									>Click to upload ({{
										formData.siteInstructionsFiles.length
									}}/3)</span
								>
								<small>Images, PDF, Word documents accepted</small>
							</button>

							<input
								ref="siteInstructionsInput"
								type="file"
								accept="image/*,.pdf,.doc,.docx"
								multiple
								style="display: none"
								@change="onSiteInstructionsChange"
							/>

							<div class="site-instructions__hint">
								<i class="mdi mdi-information-outline"></i>
								Minimum 2 files required when submitting for approval
							</div>
							<p v-if="siteInstructionsError" class="site-instructions__error">
								<i class="mdi mdi-alert-circle-outline"></i>
								{{ siteInstructionsError }}
							</p>
						</div>
					</Card>

					<!-- Equipment Information -->
					<Card v-if="showEquipmentForm" style="margin-top: var(--spacing-lg)">
						<template #header>
							<h2>Equipment Information</h2>
						</template>
						<p class="section-subtitle">Capture equipment specifications.</p>
						<div class="grid-row">
							<div class="col-6">
								<Textbox
									v-model="formData.equipment.name"
									:disabled="isFieldDisabled('equipment.name')"
									label="Equipment Name *"
									placeholder="Enter Equipment name"
									:error="formErrors['equipment.name']"
								/>
							</div>
							<div class="col-6">
								<Textbox
									v-model="formData.equipment.serialNo"
									:disabled="isFieldDisabled('equipment.serialNo')"
									label="Equipment Serial No *"
									placeholder="Enter Equipment Serial No"
									:error="formErrors['equipment.serialNo']"
								/>
							</div>
							<div class="col-4">
								<Textbox
									v-model="formData.equipment.brand"
									:disabled="isFieldDisabled('equipment.brand')"
									label="Equipment Brand *"
									placeholder="Enter Equipment Brand"
									:error="formErrors['equipment.brand']"
								/>
							</div>
							<div class="col-4">
								<Textbox
									v-model="formData.equipment.model"
									:disabled="isFieldDisabled('equipment.model')"
									label="Equipment Model *"
									placeholder="Enter Equipment Model"
									:error="formErrors['equipment.model']"
								/>
							</div>
							<div class="col-4">
								<Textbox
									v-model="formData.equipment.equipmentType"
									:disabled="isFieldDisabled('equipment.equipmentType')"
									label="Equipment Type *"
									placeholder="Enter Equipment Type"
									:error="formErrors['equipment.equipmentType']"
								/>
							</div>
						</div>
					</Card>

					<!-- Mechanical / Technical Information -->
					<Card v-if="isMechanical" style="margin-top: var(--spacing-lg)">
						<template #header>
							<h2>Mechanical Information</h2>
						</template>
						<p class="section-subtitle">
							Capture Technical and Electrical specifications.
						</p>

						<h3 class="subsection-title">Technical Data</h3>
						<div class="grid-row">
							<div class="col-12">
								<Textbox
									v-model="formData.technical.flowHead"
									:disabled="isFieldDisabled('technical.flowHead')"
									label="Flow & Head *"
									placeholder="Enter Flow & Head"
									:error="formErrors['technical.flowHead']"
								/>
							</div>
						</div>

						<hr class="divider" />

						<h3 class="subsection-title">Electrical Data</h3>
						<div class="grid-row">
							<div class="col-6">
								<Textbox
									v-model="formData.technical.brandName"
									:disabled="isFieldDisabled('technical.brandName')"
									label="Brand Name *"
									placeholder="Enter Brand Name"
									:error="formErrors['technical.brandName']"
								/>
							</div>
							<div class="col-6">
								<Textbox
									v-model="formData.technical.serialNo"
									:disabled="isFieldDisabled('technical.serialNo')"
									label="Serial No *"
									placeholder="Enter Serial No"
									:error="formErrors['technical.serialNo']"
								/>
							</div>
							<div class="col-4">
								<Textbox
									v-model="formData.technical.ratedVoltage"
									:disabled="isFieldDisabled('technical.ratedVoltage')"
									label="Rated Voltage *"
									placeholder="Enter Rated Voltage"
									:error="formErrors['technical.ratedVoltage']"
								/>
							</div>
							<div class="col-4">
								<Textbox
									v-model="formData.technical.ratedSpeed"
									:disabled="isFieldDisabled('technical.ratedSpeed')"
									label="Rated Speed *"
									placeholder="Enter Rated Speed"
									:error="formErrors['technical.ratedSpeed']"
								/>
							</div>
							<div class="col-4">
								<Textbox
									v-model="formData.technical.ratedCurrent"
									:disabled="isFieldDisabled('technical.ratedCurrent')"
									label="Rated Current *"
									placeholder="Enter Rated Current"
									:error="formErrors['technical.ratedCurrent']"
								/>
							</div>
							<div class="col-4">
								<Textbox
									v-model="formData.technical.ratedPower"
									:disabled="isFieldDisabled('technical.ratedPower')"
									label="Rated Power *"
									placeholder="Enter Rated Power"
									:error="formErrors['technical.ratedPower']"
								/>
							</div>
							<div class="col-4">
								<Select
									v-model="formData.technical.phase"
									:disabled="isFieldDisabled('technical.phase')"
									label="Phase *"
									:error="formErrors['technical.phase']"
								>
									<option value="" disabled>Select Phase</option>
									<option
										v-for="phase in phases"
										:key="phase.id"
										:value="phase.id"
									>
										{{ phase.name }}
									</option>
								</Select>
							</div>
							<div class="col-4">
								<Textbox
									v-model="formData.technical.frameSize"
									:disabled="isFieldDisabled('technical.frameSize')"
									label="Frame Size *"
									placeholder="Enter Frame Size"
									:error="formErrors['technical.frameSize']"
								/>
							</div>
						</div>
					</Card>
				</div>

				<!-- Sidebar -->
				<div class="form-grid__sidebar">
					<!-- Customer Card -->
					<Card>
						<template #header>
							<h2>Customer</h2>
						</template>
						<div class="grid-row">
							<div class="col-12">
								<Select
									v-model="formData.customerCode"
									:disabled="isFieldDisabled('customerCode')"
									label="Customer *"
									:error="formErrors.customerCode"
									@change="onCustomerChange"
								>
									<option value="" disabled>Select Customer</option>
									<option
										v-for="cust in customers"
										:key="cust.code"
										:value="cust.code"
									>
										{{ cust.name }} ({{ cust.code }})
									</option>
								</Select>
							</div>
							<div class="col-12">
								<Select
									v-model="formData.contractNo"
									:options="contractSelectOptions"
									label="Contract No *"
									placeholder="Select Contract"
									:disabled="
										!formData.customerCode || isFieldDisabled('contractNo')
									"
									:error="formErrors.contractNo"
									@change="(e: any) => onContractChange(e.target.value)"
								>
									<template #suffix>
										<div
											v-if="selectedContractInfo"
											style="display: flex; align-items: center; gap: 4px"
										>
											<Badge
												v-if="selectedContractInfo.status === 'Active'"
												type="success"
												icon="mdi-check-circle"
												size="sm"
											>
												Active Contract
											</Badge>
											<template
												v-else-if="
													selectedContractInfo.status === 'ExpiringSoon'
												"
											>
												<Badge
													type="warning"
													icon="mdi-clock-alert-outline"
													size="sm"
												>
													Expiring Soon
												</Badge>
											</template>
											<template
												v-else-if="
													selectedContractInfo.status === 'Expired'
												"
											>
												<Badge
													type="error"
													icon="mdi-alert-circle"
													size="sm"
												>
													Expired
												</Badge>
											</template>
										</div>
									</template>
								</Select>
							</div>
							<div class="col-12">
								<DatePicker
									v-model="formData.contractStartDate"
									label="Contract Start Date"
									:disabled="true"
									:enableTime="false"
								/>
							</div>
							<div class="col-12">
								<div class="contract-end-row">
									<div class="contract-end-row__date">
										<DatePicker
											v-model="formData.contractEndDate"
											label="Contract End Date"
											:disabled="true"
											:enableTime="false"
										/>
									</div>
									<button
										v-if="
											selectedContractInfo &&
											['ExpiringSoon', 'Expired'].includes(
												selectedContractInfo.status,
											)
										"
										type="button"
										class="contract-end-row__action"
										:title="
											selectedContractInfo.status === 'Expired'
												? 'Go to Customer Form to renew contract'
												: 'Go to Customer Form to extend contract'
										"
										@click="redirectToCustomerRenew(selectedContractInfo)"
									>
										<i class="mdi mdi-open-in-new"></i>
										{{
											selectedContractInfo.status === "Expired"
												? "Renew"
												: "Extend"
										}}
									</button>
								</div>
							</div>
							<div class="col-12">
								<Textbox
									v-model="formData.customerPic"
									:disabled="isFieldDisabled('customerPic')"
									label="Customer PIC"
									placeholder="Enter Customer Person In Charge"
								/>
							</div>
							<div class="col-12">
								<Textbox
									v-model="formData.customerPicPhone"
									:disabled="isFieldDisabled('customerPicPhone')"
									label="PIC Phone No."
									placeholder="e.g. +60123456789"
								/>
							</div>
						</div>
					</Card>
				</div>
			</div>

			<!-- Site and address belong to the same service-location context. -->
			<Card class="service-location-card">
				<template #header>
					<div class="service-location-card__heading">
						<span class="service-location-card__icon">
							<i class="mdi mdi-map-marker-outline"></i>
						</span>
						<div>
							<h2>Service Location</h2>
							<p>Select the site and confirm its exact address on the map.</p>
						</div>
					</div>
				</template>

				<div class="service-location-group">
					<div class="service-location-group__site">
						<div class="location-section-label">
							<span>01</span>
							<div>
								<strong>Site</strong>
								<small>Choose an operational site</small>
							</div>
						</div>
						<Autocomplete
							v-model="formData.siteCode"
							:disabled="isFieldDisabled('siteCode')"
							:options="
								sites.map((site) => ({
									id: site.code,
									name: site.name,
									code: site.code,
								}))
							"
							label="Site *"
							placeholder="Search or select Site..."
							:error="formErrors.siteCode"
						/>
					</div>

					<div class="service-location-group__map">
						<div class="location-section-label">
							<span>02</span>
							<div>
								<strong>Location</strong>
								<small>Search an address or place the map marker</small>
							</div>
						</div>
						<GoogleMapPicker
							v-model:location="formData.location"
							v-model:latitude="formData.latitude"
							v-model:longitude="formData.longitude"
							:readonly="isFieldDisabled('location')"
							height="320px"
						/>
					</div>
				</div>
			</Card>
		</fieldset>
	</div>

	<!-- Image Lightbox Modal -->
	<div v-if="previewImageUrl" class="image-lightbox" @click="previewImageUrl = null">
		<div class="image-lightbox__content" @click.stop>
			<img :src="previewImageUrl" class="image-lightbox__img" />
			<button class="image-lightbox__close" @click="previewImageUrl = null">
				<i class="mdi mdi-close"></i>
			</button>
		</div>
	</div>

	<Dialog
		v-model="showApproveDialog"
		title="Approve Work Order"
		confirmText="Approve"
		cancelText="Cancel"
		:loading="loading"
		@confirm="confirmPendingApproval"
	>
		<p style="margin: 0">
			Are you sure you want to approve
			<strong>{{ workOrderCode || "this Work Order" }}</strong
			>?
			<span v-if="!isReadOnly">
				Your editable Pending Approval fields will be saved first.
			</span>
		</p>
	</Dialog>

	<Dialog
		v-model="showRejectDialog"
		title="Reject Work Order"
		confirmText="Reject"
		cancelText="Cancel"
		confirmVariant="danger"
		:loading="loading"
		@confirm="rejectPendingReadOnly"
	>
		<p style="margin: 0 0 16px">
			Are you sure you want to reject
			<strong>{{ workOrderCode || "this Work Order" }}</strong
			>?
		</p>
		<Textbox
			v-model="rejectReason"
			label="Rejection Reason *"
			placeholder="Enter the rejection reason"
			hide-footer
		/>
		<template #footer>
			<Button variant="secondary" :disabled="loading" @click="showRejectDialog = false">
				Cancel
			</Button>
			<Button
				variant="danger"
				:loading="loading"
				:disabled="!rejectReason.trim()"
				@click="rejectPendingReadOnly"
			>
				Reject
			</Button>
		</template>
	</Dialog>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/WorkOrder/_work-order-form.scss";
</style>
