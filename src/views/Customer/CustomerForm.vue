<script setup lang="ts">
import { getApiErrorMessage } from "@/utils/error";
import PageHeader from "@/components/PageHeader.vue";
import { computed, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Chip from "@/components/Chip.vue";
import Badge from "@/components/Badge.vue";
import Dialog from "@/components/Dialog.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import DatePicker from "@/components/DatePicker.vue";
import Autocomplete from "@/components/Autocomplete.vue";
import type { AutocompleteOption } from "@/components/Autocomplete.vue";
import { customerApi } from "@/api/customer/customer.api";
import { locationApi } from "@/api/maintenance/location/location.api";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { useDateFormatStore } from "@/stores/dateFormat.store";

import { LHDN_COUNTRIES, LHDN_STATES } from "@/utils/lhdn-countries";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbarStore();
const dateFormatStore = useDateFormatStore();

const isNewMode = ref(true);
const customerGuid = ref<string | null>(null);
const loading = ref(false);
const contracts = ref<any[]>([]);
const formErrors = ref<Record<string, string>>({});

// Post-Registration Prompt State
const showPostRegisterDialog = ref(false);
const createdCustomerGuid = ref<string | null>(null);
const createdCustomerName = ref("");

// Dialog States
const showContractDialog = ref(false);
const isEditingContract = ref(false);
const editingContractGuid = ref<string | null>(null);
const showRenewDialog = ref(false);
const selectedContractForRenew = ref<any>(null);
const submittingContract = ref(false);

function formatCountryName(str: string): string {
	if (!str) return "";
	return str
		.toLowerCase()
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

const countryOptions = ref<AutocompleteOption[]>(
	LHDN_COUNTRIES.map((c) => ({
		id: formatCountryName(c.Country),
		name: formatCountryName(c.Country),
		code: c.Code,
	})),
);

const mysStateOptions: AutocompleteOption[] = LHDN_STATES.map((s) => ({
	id: s.State,
	name: s.State,
	code: s.Code,
}));

const stateOptions = ref<AutocompleteOption[]>(mysStateOptions);

async function updateStateOptionsForCountry(countryName: string) {
	if (!countryName) {
		stateOptions.value = mysStateOptions;
		return;
	}

	const isMalaysia =
		countryName.toLowerCase() === "malaysia" ||
		countryName.toUpperCase() === "MYS" ||
		countryName.toUpperCase() === "MY";

	if (isMalaysia) {
		stateOptions.value = mysStateOptions;
		return;
	}

	const selectedCountryObj = countryOptions.value.find(
		(c) =>
			c.name.toLowerCase() === countryName.toLowerCase() ||
			String(c.id).toLowerCase() === countryName.toLowerCase() ||
			(c.code && c.code.toLowerCase() === countryName.toLowerCase()),
	);

	const countryCode = selectedCountryObj?.code || countryName;

	try {
		const sRes = await locationApi.getStates({ countryCode } as any);
		const rawStates = sRes?.data?.data || sRes?.data || [];
		if (Array.isArray(rawStates) && rawStates.length > 0) {
			stateOptions.value = rawStates.map((s: any) => ({
				id: s.name || s.State || s.code || s.Code,
				name: s.name || s.State || s.code || s.Code,
				code: s.code || s.Code,
			}));
			return;
		}
	} catch (e) {
		// Ignore API error
	}

	// Default fallback matching Location Maintenance subNodes (17 - Not Applicable for other countries)
	stateOptions.value = [{ id: "Not Applicable", name: "Not Applicable", code: "17" }];
}

async function loadLocationList() {
	try {
		const [cRes] = await Promise.all([locationApi.getCountries({ limit: 250 } as any)]);
		if (cRes?.data?.data && cRes.data.data.length > 0) {
			countryOptions.value = cRes.data.data.map((c: any) => ({
				id: formatCountryName(c.Country || c.name),
				name: formatCountryName(c.Country || c.name),
				code: c.Code || c.code,
			}));
		}
	} catch (e) {
		// Fallback options already present
	}
}

const contractForm = ref({
	contractNo: "",
	contractName: "",
	startDate: "",
	endDate: "",
	description: "",
});

const renewForm = ref({
	newEndDate: "",
	remarks: "",
});

const customerCategory = ref<"COMPANY" | "INDIVIDUAL" | "GOVERNMENT">("COMPANY");
const selectedIdentityType = ref<string>("MyKAD");

watch(customerCategory, (newCat) => {
	if (newCat === "INDIVIDUAL") {
		form.value.profile.individualType = selectedIdentityType.value || "MyKAD";
		form.value.profile.brn = "";
	} else {
		form.value.profile.individualType = newCat;
		form.value.profile.identityNo = "";
	}
});

watch(selectedIdentityType, (newType) => {
	if (customerCategory.value === "INDIVIDUAL") {
		form.value.profile.individualType = newType;
	}
});

const form = ref<any>({
	accountNo: "",
	name: "",
	licenseNo: "",
	isActive: true,
	requestEinvoice: false,
	addressCode: "",
	address: {
		address1: "",
		address2: "",
		city: "",
		state: "Selangor",
		postcode: "",
		country: "Malaysia",
	},
	profile: { email: "", phone: "", tin: "", brn: "", individualType: "COMPANY", identityNo: "" },
	metadata: {
		currencyCode: "MYR",
		creditLimit: "",
		overdueLimit: "",
		controlAccount: "",
		taxExemptNo: "",
		exemptExpiryDate: "",
	},
});

watch(
	() => form.value.address?.country,
	async (newCountry, oldCountry) => {
		if (!newCountry) {
			// When country is cleared or empty -> set state to "Not Applicable"
			if (form.value.address) {
				form.value.address.state = "Not Applicable";
			}
			stateOptions.value = [{ id: "Not Applicable", name: "Not Applicable", code: "17" }];
			return;
		}

		await updateStateOptionsForCountry(newCountry);

		const isCountrySwitched = oldCountry !== undefined && oldCountry !== newCountry;
		const isStateEmpty = !form.value.address?.state;

		if (isCountrySwitched || isStateEmpty) {
			if (stateOptions.value && stateOptions.value.length > 0) {
				const firstState = stateOptions.value[0].name || stateOptions.value[0].id;
				form.value.address.state = String(firstState);
			} else {
				form.value.address.state = "Not Applicable";
			}
		}
	},
	{ immediate: true },
);

function computeStatus(endDateStr: string): "Active" | "ExpiringSoon" | "Expired" {
	if (!endDateStr) return "Active";
	const now = new Date();
	const end = new Date(endDateStr);
	if (end < now) return "Expired";
	const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	if (end <= thirtyDays) return "ExpiringSoon";
	return "Active";
}

function formatDate(iso: string) {
	return dateFormatStore.formatDate(iso);
}

onMounted(async () => {
	loadLocationList();

	const guid = route.query.guid as string | undefined;
	const code = route.query.code as string | undefined;
	const identifier = guid || code;

	if (route.query.mode === "new" || !identifier) {
		isNewMode.value = true;
	} else {
		isNewMode.value = false;
		customerGuid.value = identifier;
		loading.value = true;
		try {
			const { data, error } = await customerApi.getCustomerByGuid(identifier);
			const c = (data?.data || data) as any;
			if (c && (c.guid || c.code)) {
				contracts.value = (c.contracts || []).map((contract: any) => ({
					...contract,
					status: computeStatus(contract.endDate),
				}));
				form.value = {
					accountNo: c.accountNo || "",
					name: c.name || "",
					licenseNo: c.licenseNo || "",
					isActive: c.isActive ?? true,
					requestEinvoice: c.requestEinvoice ?? false,
					addressCode: c.addressCode || "",
					address: c.address
						? {
								address1: c.address.address1 || "",
								address2: c.address.address2 || "",
								city: c.address.city || "",
								state: c.address.state || "Selangor",
								postcode: c.address.postcode || "",
								country: c.address.country || "Malaysia",
							}
						: {
								address1: "",
								address2: "",
								city: "",
								state: "Selangor",
								postcode: "",
								country: "Malaysia",
							},
					profile: c.profile
						? {
								email: c.profile.email || "",
								phone: c.profile.phone || "",
								tin: c.profile.tin || "",
								brn: c.profile.brn || "",
								individualType: c.profile.individualType || "COMPANY",
								identityNo: c.profile.identityNo || "",
							}
						: {
								email: "",
								phone: "",
								tin: "",
								brn: "",
								individualType: "COMPANY",
								identityNo: "",
							},
					metadata: c.metadata
						? {
								currencyCode: c.metadata.currencyCode || "MYR",
								creditLimit: c.metadata.creditLimit || "",
								overdueLimit: c.metadata.overdueLimit || "",
								controlAccount: c.metadata.controlAccount || "",
								taxExemptNo: c.metadata.taxExemptNo || "",
								exemptExpiryDate: c.metadata.exemptExpiryDate || "",
							}
						: {
								currencyCode: "MYR",
								creditLimit: "",
								overdueLimit: "",
								controlAccount: "",
								taxExemptNo: "",
								exemptExpiryDate: "",
							},
				};

				const rawIndType = c.profile?.individualType || "COMPANY";
				if (rawIndType === "COMPANY" || rawIndType === "business") {
					customerCategory.value = "COMPANY";
					selectedIdentityType.value = "MyKAD";
				} else if (rawIndType === "GOVERNMENT" || rawIndType === "government") {
					customerCategory.value = "GOVERNMENT";
					selectedIdentityType.value = "MyKAD";
				} else {
					customerCategory.value = "INDIVIDUAL";
					const upper = String(rawIndType).toUpperCase();
					if (upper === "MYKAD" || rawIndType === "MyKAD")
						selectedIdentityType.value = "MyKAD";
					else if (upper === "MYPR" || rawIndType === "MyPR")
						selectedIdentityType.value = "MyPR";
					else if (upper === "MYKAS" || rawIndType === "MyKAS")
						selectedIdentityType.value = "MyKAS";
					else if (upper === "ARMY" || rawIndType === "ARMY")
						selectedIdentityType.value = "ARMY";
					else if (upper === "PASSPORT" || rawIndType === "Passport")
						selectedIdentityType.value = "PASSPORT";
					else selectedIdentityType.value = rawIndType;
				}
			} else if (error) {
				snackbar.error("Failed to load customer details.");
				console.error("Failed to load customer details:", error);
			}
		} catch (e) {
			snackbar.error("Error loading customer profile.");
			console.error(e);
		} finally {
			loading.value = false;
		}
	}

	// Auto-trigger Renew Modal if requested via route query params (from Work Order form)
	if (route.query.action === "renew") {
		const targetContractNo = route.query.contractNo as string;
		const targetContract =
			contracts.value.find((c: any) => c.contractNo === targetContractNo) ||
			contracts.value[0];
		if (targetContract) {
			openRenewModal(targetContract);
		}
	}
});

function openAddContractModal() {
	isEditingContract.value = false;
	editingContractGuid.value = null;
	const custName = createdCustomerName.value || form.value.name || "CUST";
	contractForm.value = {
		contractNo: `CTR-${custName.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}`,
		contractName: "Equipment & Maintenance Support Agreement",
		startDate: new Date().toISOString().slice(0, 10),
		endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
			.toISOString()
			.slice(0, 10),
		description: "",
	};
	showContractDialog.value = true;
}

function openEditContractModal(item: any) {
	isEditingContract.value = true;
	editingContractGuid.value = item.guid || null;
	contractForm.value = {
		contractNo: item.contractNo || "",
		contractName: item.contractName || "",
		startDate: item.startDate ? item.startDate.slice(0, 10) : "",
		endDate: item.endDate ? item.endDate.slice(0, 10) : "",
		description: item.description || "",
	};
	showContractDialog.value = true;
}

async function handleSaveContract() {
	if (
		!contractForm.value.contractNo ||
		!contractForm.value.contractName ||
		!contractForm.value.startDate ||
		!contractForm.value.endDate
	) {
		snackbar.warning("Please fill in all required contract fields (*).");
		return;
	}

	const targetGuid = customerGuid.value || createdCustomerGuid.value;

	try {
		submittingContract.value = true;
		if (isEditingContract.value && editingContractGuid.value) {
			// Edit existing contract on backend
			const { error } = await customerApi.updateContract(
				editingContractGuid.value,
				contractForm.value,
			);
			if (error) {
				snackbar.error(getApiErrorMessage(error, "Failed to save edit"));
				return;
			}
			snackbar.success("Contract updated successfully!");
		} else if (targetGuid) {
			// Create new contract on backend
			const { error } = await customerApi.createContract(targetGuid, contractForm.value);
			if (error) {
				snackbar.error(getApiErrorMessage(error, "Failed to create contract"));
				return;
			}
			snackbar.success("New contract added successfully!");
		}

		showContractDialog.value = false;
		if (targetGuid) {
			const { data } = await customerApi.getCustomerByGuid(targetGuid);
			if (data && data.data) {
				contracts.value = (data.data.contracts || []).map((c: any) => ({
					...c,
					status: computeStatus(c.endDate),
				}));
			}
		}
		if (createdCustomerGuid.value) {
			router.push(`/customer/profile?guid=${createdCustomerGuid.value}`);
		} else {
			router.back();
		}
	} catch (e) {
		snackbar.error("Error saving contract.");
	} finally {
		submittingContract.value = false;
	}
}

function handlePostRegisterAddContract() {
	showPostRegisterDialog.value = false;
	if (createdCustomerGuid.value) {
		customerGuid.value = createdCustomerGuid.value;
		isNewMode.value = false;
	}
	openAddContractModal();
}

function handlePostRegisterSkip() {
	showPostRegisterDialog.value = false;
	const targetId = createdCustomerGuid.value || customerGuid.value;
	if (targetId) {
		router.push(`/customer/profile?guid=${targetId}`);
	} else {
		router.back();
	}
}

function openRenewModal(contractItem: any) {
	selectedContractForRenew.value = contractItem;
	const currentEnd = new Date(contractItem.endDate || new Date());
	const nextYearEnd = new Date(currentEnd.setFullYear(currentEnd.getFullYear() + 1))
		.toISOString()
		.slice(0, 10);
	renewForm.value = {
		newEndDate: nextYearEnd,
		remarks: "Standard 1-Year Contract Extension",
	};
	showRenewDialog.value = true;
}

async function handleRenewContractSubmit() {
	if (!selectedContractForRenew.value || !renewForm.value.newEndDate) {
		snackbar.warning("Please specify a valid new expiration date.");
		return;
	}

	if (selectedContractForRenew.value.guid) {
		try {
			submittingContract.value = true;
			const { error } = await customerApi.renewContract(
				selectedContractForRenew.value.guid,
				renewForm.value,
			);
			if (error) {
				snackbar.error(getApiErrorMessage(error, "Failed to renew contract"));
				return;
			}
			snackbar.success("Contract renewed successfully!");
			showRenewDialog.value = false;
			const targetGuid = customerGuid.value || createdCustomerGuid.value;
			if (targetGuid) {
				const { data } = await customerApi.getCustomerByGuid(targetGuid);
				if (data && data.data) {
					contracts.value = (data.data.contracts || []).map((c: any) => ({
						...c,
						status: computeStatus(c.endDate),
					}));
				}
			}
		} catch (e) {
			snackbar.error("Failed to submit renewal.");
		} finally {
			submittingContract.value = false;
		}
	} else {
		selectedContractForRenew.value.endDate = renewForm.value.newEndDate;
		selectedContractForRenew.value.status = computeStatus(renewForm.value.newEndDate);
		snackbar.success("Contract extended in form!");
		showRenewDialog.value = false;
	}
}

const isLocalCompany = computed(() => {
	const c = (form.value.address?.country || "").trim().toLowerCase();
	return c === "malaysia" || c === "mys" || c === "my";
});

function validateSchemaLogic(): boolean {
	formErrors.value = {};
	let isValid = true;

	// Compulsory for ALL
	if (!form.value.name?.trim()) {
		formErrors.value.name = "Customer Name is required";
		isValid = false;
	}

	const emailVal = form.value.profile?.email?.trim();
	if (!emailVal) {
		formErrors.value.email = "Email is required";
		isValid = false;
	} else {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(emailVal)) {
			formErrors.value.email = "Please enter a valid email address";
			isValid = false;
		}
	}

	if (!form.value.profile?.phone?.trim()) {
		formErrors.value.phone = "Contact Phone is required";
		isValid = false;
	}

	if (!form.value.address?.address1?.trim()) {
		formErrors.value.address1 = "Address Line 1 is required";
		isValid = false;
	}

	if (!form.value.address?.country?.trim()) {
		formErrors.value.country = "Country is required";
		isValid = false;
	}

	if (!form.value.address?.state?.trim()) {
		formErrors.value.state = "State is required";
		isValid = false;
	}

	if (!form.value.address?.city?.trim()) {
		formErrors.value.city = "City is required";
		isValid = false;
	}

	if (!form.value.address?.postcode?.trim()) {
		formErrors.value.postcode = "Postcode is required";
		isValid = false;
	}

	// Category Specific Rules
	if (customerCategory.value === "INDIVIDUAL") {
		const hasIdentity = !!form.value.profile?.identityNo?.trim();
		const hasTin = !!form.value.profile?.tin?.trim();
		if (!hasIdentity && !hasTin) {
			formErrors.value.identityNo = "Either Identity Number or TIN is required";
			formErrors.value.tin = "Either Identity Number or TIN is required";
			snackbar.warning("Either Identity Number or TIN is required for Individual Account.");
			isValid = false;
		}
	} else if (customerCategory.value === "COMPANY") {
		if (isLocalCompany.value) {
			if (!form.value.profile?.brn?.trim()) {
				formErrors.value.brn =
					"Business Registration Number (BRN) is required for Local Company";
				isValid = false;
			}
			if (!form.value.profile?.tin?.trim()) {
				formErrors.value.tin = "TIN is required for Local Company";
				isValid = false;
			}
		}
	}

	if (
		form.value.requestEinvoice &&
		(!form.value.metadata || !form.value.metadata.currencyCode?.trim())
	) {
		formErrors.value.currencyCode =
			"Currency code is required when e-Invoice engine is enabled";
		snackbar.warning("Metadata currency code is required when e-Invoice engine is enabled.");
		isValid = false;
	}

	if (!isValid && !formErrors.value.identityNo && !formErrors.value.currencyCode) {
		snackbar.warning("Please fill in all compulsory fields (*).");
	}

	return isValid;
}

async function handleSubmitForm() {
	if (!validateSchemaLogic()) return;

	try {
		loading.value = true;

		const profileEmail = form.value.profile?.email?.trim();
		const profilePhone = form.value.profile?.phone?.trim();
		let profileTin = form.value.profile?.tin?.trim();
		const profileBrn =
			customerCategory.value !== "INDIVIDUAL" ? form.value.profile?.brn?.trim() : undefined;
		const profileIndType =
			customerCategory.value === "INDIVIDUAL"
				? selectedIdentityType.value || "MyKAD"
				: customerCategory.value;
		const profileIdentityNo =
			customerCategory.value === "INDIVIDUAL"
				? form.value.profile?.identityNo?.trim()
				: undefined;

		// Default TIN for Individual if empty
		if (customerCategory.value === "INDIVIDUAL" && !profileTin) {
			profileTin = "EI00000000010";
		}

		// Defaults for MSIC Code & Desc
		const msicCode =
			customerCategory.value !== "INDIVIDUAL"
				? form.value.profile?.msicCode?.trim() || "00000"
				: "00000";
		const msicDesc =
			customerCategory.value !== "INDIVIDUAL"
				? form.value.profile?.msicDesc?.trim() || "NOT APPLICABLE"
				: "NOT APPLICABLE";

		const profilePayload = {
			email: profileEmail,
			phone: profilePhone,
			tin: profileTin || undefined,
			brn: profileBrn || undefined,
			individualType: profileIndType,
			identityNo: profileIdentityNo || undefined,
			msicCode,
			msicDesc,
		};

		const payload = {
			...form.value,
			profile: profilePayload,
			contractNo: contracts.value[0]?.contractNo || "",
			metadata: {
				...form.value.metadata,
				contractNo: contracts.value[0]?.contractNo || "",
			},
		};

		if (isNewMode.value) {
			const { data, error } = await customerApi.createCustomer(payload as never);
			if (error) {
				snackbar.error(getApiErrorMessage(error, "Failed to create customer"));
				return;
			}
			const newGuid = data?.data?.guid || data?.guid;
			createdCustomerGuid.value = newGuid;
			createdCustomerName.value = form.value.name;
			snackbar.success("Customer registered successfully!");
			showPostRegisterDialog.value = true;
		} else if (customerGuid.value) {
			const { error } = await customerApi.updateCustomer(customerGuid.value, payload as never);
			if (error) {
				snackbar.error(getApiErrorMessage(error, "Failed to update customer"));
				return;
			}
			snackbar.success("Customer configuration updated successfully!");
			router.back();
		}
	} catch (e: any) {
		snackbar.error("An unexpected error occurred while saving.");
		console.error("Error submitting customer form:", e);
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<div class="maintenance-view">
		<!-- Header -->
		<PageHeader>
        <template #title>
            
                <h1>
					{{ isNewMode ? "Register New Customer Account" : "Edit Customer Account" }}
				</h1>
                
            </template>
        
        <template #actions>
            <button class="btn btn--primary" :disabled="loading" @click="handleSubmitForm">
				<i v-if="!loading" class="mdi mdi-content-save-check-outline"></i>
				<i v-else class="mdi mdi-loading mdi-spin"></i><span class="btn-text">{{ loading ? "Saving..." : isNewMode ? "Register Customer" : "Commit Changes" }}</span></button>
        </template>
    </PageHeader>

		<div class="form-scroll-layout">
			<!-- Core Primary Block -->
			<div class="panel-card mb-lg">
				<h2 class="panel-card__title mb-md">
					<i class="mdi mdi-card-account-details-outline"></i>
					Core Account & Identity
				</h2>
				<div class="form-grid">
					<div class="form-group form-group--full">
						<label class="form-group__label">
							Customer Name <span class="u-required">*</span>
						</label>
						<Textbox
							v-model="form.name"
							placeholder="Legal full name or company title"
							:error="formErrors.name"
						/>
					</div>

					<div class="form-group">
						<label class="form-group__label">
							Classification / Customer Type <span class="u-required">*</span>
						</label>
						<Select v-model="customerCategory">
							<option value="INDIVIDUAL">INDIVIDUAL (0 - Personal Account)</option>
							<option value="COMPANY">BUSINESS (1 - Corporate Entity)</option>
							<option value="GOVERNMENT">GOVERNMENT (2 - Gov Agency)</option>
						</Select>
					</div>

					<div class="form-group">
						<label class="form-group__label">AutoCount Debtor Code (AccountNo)</label>
						<Textbox v-model="form.accountNo" placeholder="e.g. 300-A0001" />
					</div>

					<div class="form-group">
						<label class="form-group__label">Linked Accounting Control Account</label>
						<Textbox
							v-model="form.metadata.controlAccount"
							placeholder="e.g. 300-0000"
						/>
					</div>

					<div class="form-group">
						<label class="form-group__label">License / Operating Permit No</label>
						<Textbox
							v-model="form.licenseNo"
							placeholder="Business license reference (optional)"
						/>
					</div>

					<div class="form-group mt-sm">
						<label class="switch-toggle">
							<input type="checkbox" v-model="form.isActive" />
							<span class="switch-toggle__slider"></span>
							<span class="switch-toggle__label">Account Active Status</span>
						</label>
					</div>

					<div class="form-group mt-sm">
						<label class="switch-toggle">
							<input type="checkbox" v-model="form.requestEinvoice" />
							<span class="switch-toggle__slider"></span>
							<span class="switch-toggle__label"
								>Enable LHDN e-Invoice Validation Engine</span
							>
						</label>
					</div>
				</div>
			</div>

			<!-- Customer Address Block -->
			<div class="panel-card mb-lg">
				<div class="panel-card__header">
					<h2>
						<i class="mdi mdi-map-marker-outline u-text-primary"></i>
						Customer Address
					</h2>
					<Chip
						v-if="customerCategory === 'COMPANY'"
						:type="isLocalCompany ? 'success' : 'info'"
					>
						{{
							isLocalCompany
								? "Local Company (Malaysia)"
								: "Foreign Company (Other Country)"
						}}
					</Chip>
				</div>

				<div class="form-grid">
					<div class="form-group form-group--full">
						<label class="form-group__label"
							>Address Line 1 <span class="u-required">*</span></label
						>
						<Textbox
							v-model="form.address.address1"
							placeholder="Street address, building name, floor/unit no."
							:error="formErrors.address1"
						/>
					</div>
					<div class="form-group form-group--full">
						<label class="form-group__label">Address Line 2</label>
						<Textbox
							v-model="form.address.address2"
							placeholder="Industrial park, section, landmark (optional)"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label"
							>Country <span class="u-required">*</span></label
						>
						<Autocomplete
							v-model="form.address.country"
							:options="countryOptions"
							placeholder="Search or select country..."
							:error="formErrors.country"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label"
							>State <span class="u-required">*</span></label
						>
						<Autocomplete
							v-model="form.address.state"
							:options="stateOptions"
							placeholder="Search or select state..."
							:error="formErrors.state"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label"
							>City / Town <span class="u-required">*</span></label
						>
						<Textbox
							v-model="form.address.city"
							placeholder="e.g. Petaling Jaya / Puchong"
							:error="formErrors.city"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label"
							>Postcode <span class="u-required">*</span></label
						>
						<Textbox
							v-model="form.address.postcode"
							placeholder="e.g. 47100"
							:error="formErrors.postcode"
						/>
					</div>
				</div>
			</div>

			<!-- Customer Contracts Block (Shown in Edit Mode) -->
			<div v-if="!isNewMode" class="panel-card mb-lg">
				<div class="panel-card__header">
					<h2>
						<i class="mdi mdi-file-document-multiple-outline u-text-primary"></i>
						Customer Contracts
					</h2>
					<button
						class="btn btn--sm btn--primary"
						type="button"
						@click="openAddContractModal"
					>
						<i class="mdi mdi-plus"></i> Add Contract
					</button>
				</div>

				<div v-if="contracts.length > 0" class="contracts-list">
					<div
						v-for="c in contracts"
						:key="c.guid || c.contractNo"
						class="contract-item-card"
						:class="{
							'contract-item-card--expiring': c.status === 'ExpiringSoon',
							'contract-item-card--expired': c.status === 'Expired',
						}"
					>
						<div class="contract-item-card__main">
							<div class="contract-item-card__header">
								<span class="contract-item-card__no u-font-mono">
									<i class="mdi mdi-file-document-outline"></i> {{ c.contractNo }}
								</span>
								<span class="contract-item-card__title">{{ c.contractName }}</span>

								<Badge
									v-if="c.status === 'Active'"
									type="success"
									icon="mdi-check-circle"
								>
									Active
								</Badge>
								<Badge
									v-else-if="c.status === 'ExpiringSoon'"
									type="warning"
									icon="mdi-clock-alert-outline"
								>
									Expiring Soon (In 1 Mo)
								</Badge>
								<Badge v-else type="error" icon="mdi-alert-circle-outline">
									Expired
								</Badge>
							</div>

							<div class="contract-item-card__dates mt-xs">
								<span
									>Start: <strong>{{ formatDate(c.startDate) }}</strong></span
								>
								<span class="mx-xs">•</span>
								<span
									>Expiry: <strong>{{ formatDate(c.endDate) }}</strong></span
								>
							</div>

							<p v-if="c.description" class="contract-item-card__desc mt-xs">
								{{ c.description }}
							</p>

							<!-- Expiry Alert Banners -->
							<div
								v-if="c.status === 'ExpiringSoon'"
								class="contract-alert contract-alert--warning mt-xs"
							>
								<i class="mdi mdi-alert-circle"></i> Notice: Contract will expire
								within 1 month. Click Renew to extend validity.
							</div>
							<div
								v-else-if="c.status === 'Expired'"
								class="contract-alert contract-alert--danger mt-xs"
							>
								<i class="mdi mdi-close-circle"></i> Warning: Contract has expired
								and is disabled for selection in Work Orders.
							</div>
						</div>

						<!-- Uniform size action buttons -->
						<div class="contract-item-card__actions">
							<button
								class="btn btn--sm btn--secondary"
								type="button"
								title="Edit Contract Details"
								@click="openEditContractModal(c)"
							>
								<i class="mdi mdi-pencil-outline"></i> Edit
							</button>

							<button
								v-if="c.status === 'ExpiringSoon' || c.status === 'Expired'"
								class="btn btn--sm btn--warning"
								type="button"
								@click="openRenewModal(c)"
							>
								<i class="mdi mdi-autorenew"></i> Renew
							</button>
							<button
								v-else
								class="btn btn--sm btn--secondary"
								type="button"
								@click="openRenewModal(c)"
							>
								<i class="mdi mdi-calendar-plus"></i> Extend
							</button>
						</div>
					</div>
				</div>
				<div v-else class="empty-contracts">
					<i class="mdi mdi-file-hidden-outline"></i>
					<p>
						No contracts added yet. Click Add Contract to create a new contract
						schedule.
					</p>
				</div>
			</div>

			<!-- Debtor Profile Block -->
			<div class="panel-card mb-lg">
				<div class="panel-card__header">
					<h2>
						<i class="mdi mdi-badge-account-horizontal-outline" />
						Customer Profile & Tax Identity
					</h2>
				</div>

				<div class="form-grid">
					<div class="form-group">
						<label class="form-group__label">
							Email <span class="u-required">*</span>
						</label>
						<Textbox
							v-model="form.profile.email"
							type="email"
							placeholder="e.g. customer@example.com"
							:error="formErrors.email"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label"
							>Contact Phone <span class="u-required">*</span></label
						>
						<Textbox
							v-model="form.profile.phone"
							placeholder="+60123456789"
							:error="formErrors.phone"
						/>
					</div>

					<!-- Individual Category Details -->
					<template v-if="customerCategory === 'INDIVIDUAL'">
						<div class="form-group">
							<label class="form-group__label"
								>Identity Document Type <span class="u-required">*</span></label
							>
							<Select v-model="selectedIdentityType">
								<option value="MyKAD">MyKAD (Malaysian Citizen)</option>
								<option value="MyPR">MyPR (Permanent Resident)</option>
								<option value="MyKAS">MyKAS (Temporary Resident)</option>
								<option value="PASSPORT">PASSPORT (Foreigner / Expat)</option>
								<option value="ARMY">ARMY (Military Personnel)</option>
							</Select>
						</div>

						<div class="form-group">
							<label class="form-group__label">
								{{ selectedIdentityType || "Identity" }} Number
							</label>
							<Textbox
								v-model="form.profile.identityNo"
								:placeholder="`Enter ${selectedIdentityType || 'Identity'} Number`"
								:error="formErrors.identityNo"
							/>
						</div>

						<div class="form-group">
							<label class="form-group__label">
								Tax Identity No (TIN)
								<span style="font-size: 11px; color: var(--colors-text-muted)"
									>(Default: EI00000000010)</span
								>
							</label>
							<Textbox
								v-model="form.profile.tin"
								placeholder="EI00000000010 (Leave blank for default)"
								:error="formErrors.tin"
							/>
						</div>
					</template>

					<!-- Business Category Details -->
					<template v-else-if="customerCategory === 'COMPANY'">
						<div class="form-group">
							<label class="form-group__label">
								Business Registration No (BRN)
								<span v-if="isLocalCompany" class="u-required">*</span>
							</label>
							<Textbox
								v-model="form.profile.brn"
								placeholder="202601000123 (123456-X)"
								:error="formErrors.brn"
							/>
						</div>

						<div class="form-group">
							<label class="form-group__label">
								Tax Identity No (TIN)
								<span v-if="isLocalCompany" class="u-required">*</span>
							</label>
							<Textbox
								v-model="form.profile.tin"
								placeholder="C2580000000"
								:error="formErrors.tin"
							/>
						</div>

						<div class="form-group">
							<label class="form-group__label">SST Registration Number</label>
							<Textbox
								v-model="form.metadata.sstRegNo"
								placeholder="W10-1808-32000001"
							/>
						</div>

						<div class="form-group">
							<label class="form-group__label">MSIC Code</label>
							<Textbox v-model="form.profile.msicCode" placeholder="00000" />
						</div>

						<div class="form-group form-group--full">
							<label class="form-group__label">Business Activity Description</label>
							<Textbox v-model="form.profile.msicDesc" placeholder="NOT APPLICABLE" />
						</div>
					</template>

					<!-- Government Category Details -->
					<template v-else-if="customerCategory === 'GOVERNMENT'">
						<div class="form-group">
							<label class="form-group__label">Tax Identity No (TIN)</label>
							<Textbox
								v-model="form.profile.tin"
								placeholder="Government Tax Ref (optional)"
							/>
						</div>

						<div class="form-group">
							<label class="form-group__label">SST Registration Number</label>
							<Textbox
								v-model="form.metadata.sstRegNo"
								placeholder="SST Registration No (optional)"
							/>
						</div>

						<div class="form-group">
							<label class="form-group__label">MSIC Code</label>
							<Textbox v-model="form.profile.msicCode" placeholder="00000" />
						</div>

						<div class="form-group form-group--full">
							<label class="form-group__label">Business Activity Description</label>
							<Textbox v-model="form.profile.msicDesc" placeholder="NOT APPLICABLE" />
						</div>
					</template>
				</div>
			</div>
		</div>

		<!-- Dialog: Add / Edit Contract -->
		<Dialog
			v-model="showContractDialog"
			:title="isEditingContract ? 'Edit Customer Contract' : 'Add New Customer Contract'"
			:confirmText="isEditingContract ? 'Save Edit' : 'Create Contract'"
			cancelText="Cancel"
			:loading="submittingContract"
			overflowVisible
			@confirm="handleSaveContract"
		>
			<div class="dialog-form">
				<div class="form-group mb-md">
					<label class="form-group__label"
						>Contract No <span class="u-required">*</span></label
					>
					<Textbox v-model="contractForm.contractNo" placeholder="e.g. CTR-2026-001" />
				</div>
				<div class="form-group mb-md">
					<label class="form-group__label"
						>Contract Title / Name <span class="u-required">*</span></label
					>
					<Textbox
						v-model="contractForm.contractName"
						placeholder="e.g. Annual Equipment Maintenance"
					/>
				</div>
				<div class="form-grid-2 mb-md">
					<div class="form-group">
						<label class="form-group__label"
							>Start Date <span class="u-required">*</span></label
						>
						<DatePicker v-model="contractForm.startDate" />
					</div>
					<div class="form-group">
						<label class="form-group__label"
							>End Date (Expiry) <span class="u-required">*</span></label
						>
						<DatePicker v-model="contractForm.endDate" />
					</div>
				</div>
				<div class="form-group">
					<label class="form-group__label">Description / Remarks</label>
					<Textbox
						v-model="contractForm.description"
						placeholder="Optional contract terms or notes..."
					/>
				</div>
			</div>
		</Dialog>

		<!-- Dialog: Renew Contract -->
		<Dialog
			v-model="showRenewDialog"
			title="Renew Contract"
			confirmText="Confirm Renewal"
			cancelText="Cancel"
			:loading="submittingContract"
			overflowVisible
			@confirm="handleRenewContractSubmit"
		>
			<div class="dialog-form" v-if="selectedContractForRenew">
				<p class="mb-md" style="font-size: 13px; color: var(--colors-text-muted)">
					Renewing contract
					<strong class="u-font-mono u-text-primary">{{
						selectedContractForRenew.contractNo
					}}</strong>
					({{ selectedContractForRenew.contractName }})
				</p>
				<div class="form-group mb-md">
					<label class="form-group__label"
						>New Expiration Date <span class="u-required">*</span></label
					>
					<DatePicker v-model="renewForm.newEndDate" />
				</div>
				<div class="form-group">
					<label class="form-group__label">Renewal Remarks / Notes</label>
					<Textbox
						v-model="renewForm.remarks"
						placeholder="Reason for extension / renewal terms..."
					/>
				</div>
			</div>
		</Dialog>

		<!-- Dialog: Post-Registration Contract Prompt -->
		<Dialog
			v-model="showPostRegisterDialog"
			title="Customer Registered Successfully"
			confirmText="Add Contract Now"
			cancelText="Done"
			@confirm="handlePostRegisterAddContract"
			@cancel="handlePostRegisterSkip"
		>
			<div class="u-text-center py-md" style="text-align: center; padding: 16px 0">
				<i
					class="mdi mdi-check-circle-outline u-text-primary mb-sm"
					style="font-size: 48px; color: var(--colors-brand-primary)"
				></i>
				<h3
					style="
						font-size: 16px;
						font-weight: 700;
						margin: 8px 0 6px 0;
						color: var(--colors-text-primary);
					"
				>
					{{ createdCustomerName }} has been created!
				</h3>
				<p style="font-size: 13px; color: var(--colors-text-secondary); margin: 0">
					Would you like to set up a contract for this customer now?
				</p>
			</div>
		</Dialog>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/Customer/_customer-form.scss";
</style>
