<script setup lang="ts">
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
import { useRouter, useRoute } from "vue-router";
import { customerApi } from "@/api/customer/customer.api";
import { userApi } from "@/api/user/user.api";
import { workTypeApi } from "@/api/maintenance/work-type/work-type.api";
import { workOrderApi } from "@/api/work-order/work-order.api";
import http from "@/utils/http";

const router = useRouter();
const route = useRoute();

const isEditMode = computed(() => !!route.params.id);
const pageTitle = computed(() => (isEditMode.value ? "Edit Work Order" : "Create New Work Order"));

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
	siteInstructionsFiles: [] as Array<{ name: string; url: string; type: string }>,
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
		current.push({ name: file.name, url, type: file.type });
	}
	siteInstructionsError.value = "";
}

function removeSiteInstruction(index: number) {
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
			timezone: "UTC",
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
			timezone: "UTC",
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
		const userRes = await userApi.getUsers({ pageIndex: 0, pageSize: 100, timezone: "UTC" });
		if (userRes.data && userRes.data.data) {
			users.value = userRes.data.data.map((u: any) => ({
				code: u.displayCode || u.guid.substring(0, 8).toUpperCase(),
				name: u.displayName || "Unknown",
				role: (u.role || u.userGroup || u.description || "").toLowerCase(),
			}));
		}

		// Fetch Work Types
		const wtRes = await workTypeApi.getWorkTypes({
			pageIndex: 0,
			pageSize: 100,
			timezone: "UTC",
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
	await loadOptions();

	// Fallback hardcoded data for UI testing
	if (users.value.length === 0) {
		users.value = [
			{ code: "SAL-001", name: "David Tan", role: "sa" },
			{ code: "SAL-002", name: "Jessica Lee", role: "sa" },
			{ code: "MNG-001", name: "Ramasamy Kumar", role: "manager" },
			{ code: "MNG-002", name: "Chen Wei Ming", role: "manager" },
			{ code: "ENG-001", name: "Ahmad Faizi", role: "engineer" },
			{ code: "ENG-002", name: "Nurul Ain", role: "engineer" },
			{ code: "ENG-003", name: "Lim Wei Chen", role: "engineer" },
			{ code: "ENG-004", name: "Siti Fatimah", role: "engineer" },
			{ code: "ENG-005", name: "Kavitha Nair", role: "engineer" },
		];
	}
	if (customers.value.length === 0) {
		customers.value = [
			{
				code: "CUST-001",
				name: "Petronas Carigali Sdn Bhd",
				contracts: [
					{
						contractNo: "CTR-PET-2026-01",
						contractName: "Offshore Equipment Maintenance 2026",
						startDate: "2026-01-01",
						endDate: "2027-12-31",
					},
					{
						contractNo: "CTR-PET-2026-EXPIRE",
						contractName: "Turbine Inspection & Overhaul",
						startDate: "2025-08-01",
						endDate: "2026-08-15",
					},
					{
						contractNo: "CTR-PET-2025-OLD",
						contractName: "Platform Safety Audit 2025",
						startDate: "2025-01-01",
						endDate: "2025-12-31",
					},
				],
			},
			{
				code: "CUST-002",
				name: "YTL Power Services Sdn Bhd",
				contracts: [
					{
						contractNo: "CTR-YTL-2026-01",
						contractName: "Power Plant Turbine Maintenance",
						startDate: "2026-03-01",
						endDate: "2027-02-28",
					},
					{
						contractNo: "CTR-YTL-2025-OLD",
						contractName: "Boiler Servicing Contract 2025",
						startDate: "2024-06-01",
						endDate: "2025-05-31",
					},
				],
			},
			{
				code: "CUST-003",
				name: "TNB Engineering Corporation",
				contracts: [
					{
						contractNo: "CTR-TNB-2026-01",
						contractName: "Substation Transformer Overhaul",
						startDate: "2026-02-15",
						endDate: "2026-08-10",
					},
					{
						contractNo: "CTR-TNB-2025-OLD",
						contractName: "Grid Line Survey 2025",
						startDate: "2024-01-01",
						endDate: "2025-01-01",
					},
				],
			},
		];
	}
	if (workTypeList.value.length === 0) {
		workTypeList.value = [
			{
				guid: "wt-1",
				code: "mechanical",
				name: "Mechanical Maintenance",
				withEquipmentForm: true,
			},
			{
				guid: "wt-2",
				code: "electrical",
				name: "Electrical Maintenance",
				withEquipmentForm: false,
			},
			{ guid: "wt-3", code: "hvac", name: "HVAC System", withEquipmentForm: true },
			{
				guid: "wt-4",
				code: "general",
				name: "General Maintenance",
				withEquipmentForm: false,
			},
		];
		if (!formData.value.workTypeGuid) {
			const match =
				workTypeList.value.find(
					(wt) => wt.code.toLowerCase() === formData.value.orderTypeCode.toLowerCase(),
				) || workTypeList.value[0];
			formData.value.workTypeGuid = match.guid;
			formData.value.withEquipmentForm = match.withEquipmentForm;
		}
	}
	if (workTypeItems.value.length === 0) {
		workTypeItems.value = [
			{ code: "WT-001", name: "Preventive Maintenance" },
			{ code: "WT-002", name: "Corrective Maintenance" },
			{ code: "WT-003", name: "New Installation" },
			{ code: "WT-004", name: "Inspection & Testing" },
		];
	}
	if (sites.value.length === 0) {
		sites.value = [
			{ code: "HQ-KL", name: "Kuala Lumpur Headquarters" },
			{ code: "WH-PJ", name: "Petaling Jaya Warehouse" },
			{ code: "FAC-PG", name: "Penang Regional Facility" },
			{ code: "PLT-JB", name: "Johor Bahru Plant" },
		];
	}

	const id = route.params.id;
	if (id && typeof id === "string") {
		try {
			loading.value = true;
			const { data } = await workOrderApi.getWorkOrderByGuid(id);
			if (data && data.data) {
				const w = data.data as any;
				formData.value = {
					status: w.status || "Draft",
					workType: w.workType || "Maintenance",
					orderTypeCode: w.orderTypeCode || "mechanical",
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
					leaderIICode: w.leaderIICode || "",
					technicianCodes: w.technicianCodes || w.assistantEngineers || [],
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
		const code = (u.code || "").toUpperCase();
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
		const code = (u.code || "").toUpperCase();
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
		const code = (u.code || "").toUpperCase();
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
	return engineerUsers.value.filter(
		(u: any) =>
			u.code !== formData.value.leaderIICode &&
			!formData.value.technicianCodes.includes(u.code),
	);
});

const leaderIIOptions = computed(() => {
	return engineerUsers.value.filter(
		(u: any) =>
			u.code !== formData.value.leaderCode &&
			!formData.value.technicianCodes.includes(u.code),
	);
});

const technicianOptions = computed(() => {
	return engineerUsers.value.filter(
		(u: any) => u.code !== formData.value.leaderCode && u.code !== formData.value.leaderIICode,
	);
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
		alert("Please select a Customer first.");
		return;
	}
	const cust = customers.value.find((c: any) => c.code === formData.value.customerCode);
	const custGuid = cust?.guid || cust?.code || formData.value.customerCode;
	const targetContractNo = contract?.contractNo || formData.value.contractNo;

	router.push({
		path: "/customers/form",
		query: {
			code: custGuid,
			action: "renew",
			contractNo: targetContractNo,
		},
	});
}

const showEquipmentForm = computed(() => {
	if (formData.value.withEquipmentForm) return true;
	const code = (formData.value.orderTypeCode || "").toLowerCase();
	const name = (formData.value.workType || "").toLowerCase();
	return code === "mechanical" || name === "mechanical";
});

const isMechanical = computed(() => {
	const code = (formData.value.orderTypeCode || "").toLowerCase();
	const name = (formData.value.workType || "").toLowerCase();
	return code === "mechanical" || name === "mechanical";
});

const formErrors = ref<Record<string, string>>({});

function validateForm() {
	formErrors.value = {};
	let isValid = true;

	if (!formData.value.orderTypeItemCode) {
		formErrors.value.orderTypeItemCode = "Work Type Item is required";
		isValid = false;
	}
	if (!formData.value.title) {
		formErrors.value.title = "Title is required";
		isValid = false;
	}
	if (!formData.value.salesAgentCode) {
		formErrors.value.salesAgentCode = "Sales Agent is required";
		isValid = false;
	}
	if (!formData.value.startDate) {
		formErrors.value.startDate = "Start Date is required";
		isValid = false;
	}
	if (!formData.value.estimatedEndDate) {
		formErrors.value.estimatedEndDate = "Estimated Date of Completion is required";
		isValid = false;
	}
	if (!formData.value.description) {
		formErrors.value.description = "Work Description is required";
		isValid = false;
	}
	if (!formData.value.customerCode) {
		formErrors.value.customerCode = "Customer is required";
		isValid = false;
	}
	if (!formData.value.siteCode) {
		formErrors.value.siteCode = "Site is required";
		isValid = false;
	}

	// End date must be after start date
	if (formData.value.startDate && formData.value.estimatedEndDate) {
		if (new Date(formData.value.estimatedEndDate) <= new Date(formData.value.startDate)) {
			formErrors.value.estimatedEndDate = "End date must be after the start date";
			isValid = false;
		}
	}

	if (showEquipmentForm.value) {
		if (!formData.value.equipment.name) {
			formErrors.value["equipment.name"] = "Equipment Name is required";
			isValid = false;
		}
		if (!formData.value.equipment.serialNo) {
			formErrors.value["equipment.serialNo"] = "Equipment Serial No is required";
			isValid = false;
		}
		if (!formData.value.equipment.brand) {
			formErrors.value["equipment.brand"] = "Equipment Brand is required";
			isValid = false;
		}
		if (!formData.value.equipment.model) {
			formErrors.value["equipment.model"] = "Equipment Model is required";
			isValid = false;
		}
		if (!formData.value.equipment.equipmentType) {
			formErrors.value["equipment.equipmentType"] = "Equipment Type is required";
			isValid = false;
		}
	}

	return isValid;
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

async function submitDraft() {
	formErrors.value = {};
	try {
		loading.value = true;
		const id = route.params.id;
		const body = buildBody();
		delete body.status;
		if (id && typeof id === "string") {
			const { error } = await workOrderApi.updateDraft(id, body);
			if (error) {
				alert(`Failed to update draft: ${error.error?.message || error.message}`);
				return;
			}
			alert("Work order draft updated successfully!");
		} else {
			const { error } = await workOrderApi.createDraft(body as any);
			if (error) {
				alert(`Failed to save draft: ${error.error?.message || error.message}`);
				return;
			}
			alert("Work order draft created successfully!");
		}
		router.back();
	} catch (e) {
		console.error(e);
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
		body.status = "New";
		if (id && typeof id === "string") {
			const { error } = await workOrderApi.updateNew(id, body);
			if (error) {
				alert(`Failed to update work order: ${error.error?.message || error.message}`);
				return;
			}
			alert("Work order submitted successfully (Status: New)!");
		} else {
			const { error } = await workOrderApi.createNew(body as any);
			if (error) {
				alert(`Failed to submit work order: ${error.error?.message || error.message}`);
				return;
			}
			alert("Work order submitted successfully (Status: New)!");
		}
		router.back();
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

async function submitAndRequestApproval() {
	if (!validateForm()) {
		console.error("Validation failed", formErrors.value);
		return;
	}
	try {
		loading.value = true;
		const id = route.params.id;
		const body = buildBody();
		body.status = "PendingApproval";
		if (id && typeof id === "string") {
			const { error } = await workOrderApi.updatePending(id, body);
			if (error) {
				alert(`Failed to request approval: ${error.error?.message || error.message}`);
				return;
			}
			alert("Work order submitted for approval (Status: Pending Approval)!");
		} else {
			const { error } = await workOrderApi.createNew({
				...body,
				status: "PendingApproval",
			} as any);
			if (error) {
				alert(`Failed to request approval: ${error.error?.message || error.message}`);
				return;
			}
			alert("Work order submitted for approval (Status: Pending Approval)!");
		}
		router.back();
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
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
				alert(`Failed to save changes: ${res.error.error.message}`);
				return;
			}
			alert("Work order updated successfully!");
		}
		router.back();
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

function cancel() {
	router.back();
}

const priorityColors: Record<string, string> = {
	High: "error",
	Medium: "warning",
	Low: "info",
};
</script>

<template>
	<div class="workorder-form-view">
		<div class="workorder-form-view__header">
			<div class="title-area">
				<h1>{{ pageTitle }}</h1>
				<p>Set the work order details, assign the right schedule and resources.</p>
			</div>
			<div class="actions-area">
				<Button variant="secondary" @click="cancel">Cancel</Button>
				<template v-if="!isEditMode || formData.status === 'Draft'">
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
				<template v-else>
					<Button variant="primary" @click="submitChanges">
						<i class="mdi mdi-content-save"></i> Save Changes
					</Button>
				</template>
			</div>
		</div>

		<!-- Helper Banner -->
		<div class="form-helper-banner">
			<div class="form-helper-banner__icon">
				<i class="mdi mdi-information"></i>
			</div>
			<div class="form-helper-banner__text">
				<div class="helper-line">
					<span class="helper-bullet">-</span>
					<span
						><strong>Save as Draft</strong> creates a New editable work order.
						<em
							>(Required: Work Type, Title, Sales Agent, Customer, Description)</em
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
						><strong>Save & Request Approval</strong> submits the work order for
						approval with status <strong>Pending Approval</strong>.</span
					>
				</div>
			</div>
		</div>

		<div class="form-grid">
			<div class="form-grid__main">
				<!-- Work Order Details -->
				<Card>
					<template #header>
						<h2>Work Order Details</h2>
						<div style="display: flex; gap: 8px; align-items: center">
							<Badge type="primary" icon="mdi-tools">{{ formData.workType }}</Badge>
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
							<Select v-model="formData.jobPriority" label="Job Priority">
								<option value="">Select Priority</option>
								<option v-for="p in JOB_PRIORITIES" :key="p.value" :value="p.value">
									{{ p.label }}
								</option>
							</Select>
						</div>
						<div class="col-6">
							<Autocomplete
								v-model="formData.orderTypeItemCode"
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
								label="Title *"
								placeholder="Enter Title"
								:error="formErrors.title"
							/>
						</div>

						<!-- Row 2: Sales Agent + Person In Charge -->
						<div class="col-6">
							<Autocomplete
								v-model="formData.salesAgentCode"
								:options="
									salesAgentUsers.map((u) => ({
										id: u.code,
										name: u.name,
										code: u.code,
									}))
								"
								label="Sales Agent *"
								placeholder="Search or select Sales Agent..."
								:error="formErrors.salesAgentCode"
							/>
						</div>
						<div class="col-6">
							<Autocomplete
								v-model="formData.personInChargeCode"
								:options="
									projectPicUsers.map((u) => ({
										id: u.code,
										name: u.name,
										code: u.code,
									}))
								"
								label="Project PIC"
								placeholder="Search or select Project PIC..."
								:error="formErrors.personInChargeCode"
							/>
						</div>

						<!-- Row 3: Start Date + Estimated End Date -->
						<div class="col-6">
							<DatePicker
								v-model="formData.startDate"
								label="Start Date *"
								:error="formErrors.startDate"
								:enableTime="false"
							/>
						</div>
						<div class="col-6">
							<DatePicker
								v-model="formData.estimatedEndDate"
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
								:options="
									leaderOptions.map((u) => ({
										id: u.code,
										name: u.name,
										code: u.code,
									}))
								"
								label="Leader"
								placeholder="Search or select Leader..."
								:error="formErrors.leaderCode"
							/>
						</div>
						<div class="col-6">
							<Autocomplete
								v-model="formData.leaderIICode"
								:options="
									leaderIIOptions.map((u) => ({
										id: u.code,
										name: u.name,
										code: u.code,
									}))
								"
								label="Leader II"
								placeholder="Search or select Leader II..."
							/>
						</div>

						<!-- Technicians -->
						<div class="col-12 textbox-field">
							<MultiSelect
								v-model="formData.technicianCodes"
								:options="technicianOptions"
								label="Technicians"
								placeholder="Search to add technicians..."
							/>
						</div>

						<!-- Work Description -->
						<div class="col-12 textbox-field" style="margin-top: 8px">
							<label class="custom-label">Work Description *</label>
							<textarea
								v-model="formData.description"
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
								<div class="file-item__preview">
									<img
										v-if="file.type.startsWith('image/')"
										:src="file.url"
										:alt="file.name"
										class="file-item__thumb"
									/>
									<div v-else class="file-item__doc-icon">
										<i class="mdi mdi-file-pdf-box"></i>
									</div>
								</div>
								<div class="file-item__info">
									<span class="file-item__name">{{ file.name }}</span>
								</div>
								<button
									class="file-item__remove"
									@click="removeSiteInstruction(idx)"
									title="Remove file"
								>
									<i class="mdi mdi-close"></i>
								</button>
							</div>
						</div>

						<button
							v-if="formData.siteInstructionsFiles.length < 3"
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
								label="Equipment Name *"
								placeholder="Enter Equipment name"
								:error="formErrors['equipment.name']"
							/>
						</div>
						<div class="col-6">
							<Textbox
								v-model="formData.equipment.serialNo"
								label="Equipment Serial No *"
								placeholder="Enter Equipment Serial No"
								:error="formErrors['equipment.serialNo']"
							/>
						</div>
						<div class="col-4">
							<Textbox
								v-model="formData.equipment.brand"
								label="Equipment Brand *"
								placeholder="Enter Equipment Brand"
								:error="formErrors['equipment.brand']"
							/>
						</div>
						<div class="col-4">
							<Textbox
								v-model="formData.equipment.model"
								label="Equipment Model *"
								placeholder="Enter Equipment Model"
								:error="formErrors['equipment.model']"
							/>
						</div>
						<div class="col-4">
							<Textbox
								v-model="formData.equipment.equipmentType"
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
					<p class="section-subtitle">Capture Technical and Electrical specifications.</p>

					<h3 class="subsection-title">Technical Data</h3>
					<div class="grid-row">
						<div class="col-12">
							<Textbox
								v-model="formData.technical.flowHead"
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
								label="Brand Name *"
								placeholder="Enter Brand Name"
								:error="formErrors['technical.brandName']"
							/>
						</div>
						<div class="col-6">
							<Textbox
								v-model="formData.technical.serialNo"
								label="Serial No *"
								placeholder="Enter Serial No"
								:error="formErrors['technical.serialNo']"
							/>
						</div>
						<div class="col-4">
							<Textbox
								v-model="formData.technical.ratedVoltage"
								label="Rated Voltage *"
								placeholder="Enter Rated Voltage"
								:error="formErrors['technical.ratedVoltage']"
							/>
						</div>
						<div class="col-4">
							<Textbox
								v-model="formData.technical.ratedSpeed"
								label="Rated Speed *"
								placeholder="Enter Rated Speed"
								:error="formErrors['technical.ratedSpeed']"
							/>
						</div>
						<div class="col-4">
							<Textbox
								v-model="formData.technical.ratedCurrent"
								label="Rated Current *"
								placeholder="Enter Rated Current"
								:error="formErrors['technical.ratedCurrent']"
							/>
						</div>
						<div class="col-4">
							<Textbox
								v-model="formData.technical.ratedPower"
								label="Rated Power *"
								placeholder="Enter Rated Power"
								:error="formErrors['technical.ratedPower']"
							/>
						</div>
						<div class="col-4">
							<Select
								v-model="formData.technical.phase"
								label="Phase *"
								:error="formErrors['technical.phase']"
							>
								<option value="" disabled>Select Phase</option>
								<option v-for="phase in phases" :key="phase.id" :value="phase.id">
									{{ phase.name }}
								</option>
							</Select>
						</div>
						<div class="col-4">
							<Textbox
								v-model="formData.technical.frameSize"
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
								label="Contract No"
								placeholder="Select Contract"
								:disabled="!formData.customerCode"
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
											<button
												type="button"
												class="badge-action-btn badge-action-btn--primary"
												title="Go to Customer Form to extend contract"
												@click.stop="
													redirectToCustomerRenew(selectedContractInfo)
												"
											>
												<i class="mdi mdi-open-in-new"></i> Extend
											</button>
										</template>
										<template
											v-else-if="selectedContractInfo.status === 'Expired'"
										>
											<Badge type="error" icon="mdi-alert-circle" size="sm">
												Expired
											</Badge>
											<button
												type="button"
												class="badge-action-btn badge-action-btn--primary"
												title="Go to Customer Form to renew contract"
												@click.stop="
													redirectToCustomerRenew(selectedContractInfo)
												"
											>
												<i class="mdi mdi-open-in-new"></i> Renew
											</button>
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
							<DatePicker
								v-model="formData.contractEndDate"
								label="Contract End Date"
								:disabled="true"
								:enableTime="false"
							/>
						</div>
						<div class="col-12">
							<Textbox
								v-model="formData.customerPic"
								label="Customer PIC"
								placeholder="Enter Customer Person In Charge"
							/>
						</div>
						<div class="col-12">
							<Textbox
								v-model="formData.customerPicPhone"
								label="PIC Phone No."
								placeholder="e.g. +60123456789"
							/>
						</div>
					</div>
				</Card>

				<!-- Site Card -->
				<Card style="margin-top: var(--spacing-lg)">
					<template #header>
						<h2>Site</h2>
					</template>
					<p class="section-subtitle">
						Assign an operational site from Maintenance site list.
					</p>
					<div class="grid-row">
						<div class="col-12">
							<Autocomplete
								v-model="formData.siteCode"
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
					</div>
				</Card>

				<!-- Location Card -->
				<Card style="margin-top: var(--spacing-lg)">
					<template #header>
						<h2>Location & Map</h2>
					</template>
					<p class="section-subtitle">
						Search address, pin location or drop marker on Google Map.
					</p>
					<GoogleMapPicker
						v-model:location="formData.location"
						v-model:latitude="formData.latitude"
						v-model:longitude="formData.longitude"
						height="320px"
					/>
				</Card>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.badge-action-btn {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 2px 7px;
	border-radius: 4px;
	font-size: 11px;
	font-weight: 600;
	cursor: pointer;
	border: none;
	transition: all 0.15s ease;
	line-height: 1.2;

	&--warning {
		background: #fef3c7;
		color: #d97706;

		&:hover {
			background: #fde68a;
			color: #b45309;
		}
	}

	&--error {
		background: #fee2e2;
		color: #dc2626;

		&:hover {
			background: #fca5a5;
			color: #b91c1c;
		}
	}
}

.workorder-form-view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-lg);
	padding-bottom: 40px;

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--spacing-md);
	}
}

.title-area {
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

.actions-area {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
}

.form-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--spacing-lg);

	@media (min-width: 1024px) {
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
	}

	&__main {
		display: flex;
		flex-direction: column;
	}

	&__sidebar {
		display: flex;
		flex-direction: column;
	}
}

.grid-row {
	display: flex;
	flex-wrap: wrap;
	margin: 0 -10px;

	> [class^="col-"] {
		padding: 10px;
	}

	.col-12 {
		flex: 0 0 100%;
		max-width: 100%;
	}

	.col-6 {
		flex: 0 0 50%;
		max-width: 50%;
	}

	.col-4 {
		flex: 0 0 33.333333%;
		max-width: 33.333333%;
	}
}

.section-subtitle {
	font-size: 13px;
	color: var(--colors-text-muted);
	margin: -10px 0 16px;
}

.subsection-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--colors-text-primary);
	margin: 8px 0 12px;
}

.divider {
	border: none;
	border-top: 1px dashed var(--colors-surface-border);
	margin: 20px 0;
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

	&--error {
		border-color: var(--colors-state-error);

		&:focus {
			box-shadow: 0 0 0 3px rgb(239 68 68 / 0.15);
		}
	}

	&:focus {
		border-color: var(--colors-brand-primary);
	}
}

.map-placeholder {
	width: 100%;
	height: 200px;
	background: var(--colors-surface-background);
	border: 1px dashed var(--colors-surface-border);
	border-radius: 8px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: var(--colors-text-muted);
	gap: 8px;

	i {
		font-size: 32px;
	}
	span {
		font-size: 13px;
		font-weight: 500;
	}
}

.priority-indicator {
	display: flex;
	align-items: center;
	gap: 8px;
	padding-bottom: 2px;
}

// ========== Site Instructions Upload Zone ==========
.site-instructions-zone {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
}

.file-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.file-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 14px;
	background: var(--colors-surface-background);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	transition: border-color 0.2s;

	&:hover {
		border-color: var(--colors-brand-primary);
	}

	&__preview {
		width: 48px;
		height: 48px;
		flex-shrink: 0;
		border-radius: 6px;
		overflow: hidden;
		background: var(--colors-surface-border);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	&__thumb {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	&__doc-icon {
		font-size: 28px;
		color: var(--colors-state-error);
	}

	&__info {
		flex: 1;
		min-width: 0;
	}

	&__name {
		font-size: 13px;
		font-weight: 500;
		color: var(--colors-text-primary);
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&__remove {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--colors-text-muted);
		padding: 4px;
		border-radius: 4px;
		line-height: 1;
		transition:
			color 0.2s,
			background-color 0.2s;

		&:hover {
			color: var(--colors-state-error);
			background-color: rgba(239, 68, 68, 0.08);
		}

		i {
			font-size: 18px;
		}
	}
}

.upload-trigger {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 28px 20px;
	border: 2px dashed var(--colors-surface-border);
	border-radius: 10px;
	background: transparent;
	cursor: pointer;
	color: var(--colors-text-muted);
	transition:
		border-color 0.2s,
		background-color 0.2s,
		color 0.2s;
	width: 100%;

	&:hover {
		border-color: var(--colors-brand-primary);
		background-color: rgba(80, 88, 242, 0.04);
		color: var(--colors-brand-primary);
	}

	i {
		font-size: 28px;
	}

	span {
		font-size: 13px;
		font-weight: 600;
	}

	small {
		font-size: 11px;
	}
}

.site-instructions__hint {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	color: var(--colors-text-muted);
	background: rgba(80, 88, 242, 0.05);
	border: 1px solid rgba(80, 88, 242, 0.15);
	border-radius: 6px;
	padding: 8px 12px;

	i {
		color: var(--colors-brand-primary);
		font-size: 14px;
	}
}

.textbox-field {
	&__footer {
		margin-top: 4px;
	}

	&__error {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: var(--colors-state-error);
		margin: 0;
	}

	&__error-icon {
		font-size: 14px;
	}

	&__error-text {
		font-size: 12px;
	}
}

.form-helper-banner {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	background: #eaf2ff;
	border-left: 4px solid #3b82f6;
	border-radius: 6px;
	padding: 12px 16px;
	margin-bottom: 20px;
	font-size: 13px;
	line-height: 1.5;
	color: #1e3a8a;

	&__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #2563eb;
		color: #ffffff;
		font-size: 14px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	&__text {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.helper-line {
		display: flex;
		gap: 6px;
	}

	.helper-bullet {
		font-weight: bold;
		color: #2563eb;
	}

	strong {
		color: #1d4ed8;
		font-weight: 600;
	}

	em {
		font-style: normal;
		color: #475569;
	}
}
</style>
