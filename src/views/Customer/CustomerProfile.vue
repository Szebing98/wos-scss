<script setup lang="ts">
import Badge from "@/components/Badge.vue";
import Chip from "@/components/Chip.vue";
import Dialog from "@/components/Dialog.vue";
import Textbox from "@/components/Textbox.vue";
import DatePicker from "@/components/DatePicker.vue";
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { customerApi } from "@/api/customer/customer.api";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { useDateFormatStore } from "@/stores/dateFormat.store";

const route = useRoute();
const router = useRouter();
const snackbar = useSnackbarStore();
const dateFormatStore = useDateFormatStore();

const customer = ref<any>(null);
const contracts = ref<any[]>([]);
const loading = ref(false);

// Dialog States
const showContractDialog = ref(false);
const isEditingContract = ref(false);
const editingContractGuid = ref<string | null>(null);
const showRenewDialog = ref(false);
const selectedContractForRenew = ref<any>(null);
const submittingContract = ref(false);

// Contract Form
const contractForm = ref({
	contractNo: "",
	contractName: "",
	startDate: "",
	endDate: "",
	description: "",
});

// Renew Contract Form
const renewForm = ref({
	newEndDate: "",
	remarks: "",
});

function computeStatus(endDateStr: string): "Active" | "ExpiringSoon" | "Expired" {
	if (!endDateStr) return "Active";
	const now = new Date();
	const end = new Date(endDateStr);
	if (end < now) return "Expired";
	const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	if (end <= thirtyDays) return "ExpiringSoon";
	return "Active";
}

async function loadCustomerDetail() {
	const targetId = (route.query.guid || route.query.code) as string;
	if (!targetId || typeof targetId !== "string") {
		router.back();
		return;
	}

	loading.value = true;
	try {
		const { data, error } = await customerApi.getCustomerByGuid(targetId);
		const customerData = data?.data || data;
		if (customerData && (customerData.guid || customerData.code)) {
			customer.value = customerData;
			contracts.value = (customerData.contracts || []).map((c: any) => ({
				...c,
				status: computeStatus(c.endDate),
			}));
		} else if (error) {
			snackbar.error("Failed to load customer profile details.");
			console.error("Failed to load customer profile:", error);
		}
	} catch (e) {
		snackbar.error("Error loading customer profile.");
		console.error("Error loading customer profile:", e);
	} finally {
		loading.value = false;
	}
}

onMounted(() => {
	loadCustomerDetail();
});

function handleEditCustomer() {
	if (customer.value?.guid || customer.value?.code) {
		router.push(`/customer/form?code=${customer.value.guid || customer.value.code}`);
	}
}

function openAddContractModal() {
	isEditingContract.value = false;
	editingContractGuid.value = null;
	contractForm.value = {
		contractNo: `CTR-${customer.value?.code || "01"}-${new Date().getFullYear()}`,
		contractName: "Equipment & Maintenance Support Agreement",
		startDate: new Date().toISOString().slice(0, 10),
		endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
			.toISOString()
			.slice(0, 10),
		description: "",
	};
	showContractDialog.value = true;
}

function openEditContractModal(contractItem: any) {
	isEditingContract.value = true;
	editingContractGuid.value = contractItem.guid || null;
	contractForm.value = {
		contractNo: contractItem.contractNo || "",
		contractName: contractItem.contractName || "",
		startDate: contractItem.startDate ? contractItem.startDate.slice(0, 10) : "",
		endDate: contractItem.endDate ? contractItem.endDate.slice(0, 10) : "",
		description: contractItem.description || "",
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
		snackbar.warning("Please fill in all required contract fields.");
		return;
	}

	try {
		submittingContract.value = true;
		if (isEditingContract.value && editingContractGuid.value) {
			const { error } = await customerApi.updateContract(
				editingContractGuid.value,
				contractForm.value,
			);
			if (error) {
				snackbar.error("Failed to save contract edit: " + (error.error?.message || error));
				return;
			}
			snackbar.success("Contract updated successfully!");
		} else {
			const { error } = await customerApi.createContract(
				customer.value.guid,
				contractForm.value,
			);
			if (error) {
				snackbar.error("Failed to create contract: " + (error.error?.message || error));
				return;
			}
			snackbar.success("New contract added successfully!");
		}
		showContractDialog.value = false;
		await loadCustomerDetail();
	} catch (e) {
		snackbar.error("Failed to save contract.");
		console.error(e);
	} finally {
		submittingContract.value = false;
	}
}

function openRenewModal(contractItem: any) {
	selectedContractForRenew.value = contractItem;
	const currentEnd = new Date(contractItem.endDate);
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

	try {
		submittingContract.value = true;
		const { error } = await customerApi.renewContract(
			selectedContractForRenew.value.guid,
			renewForm.value,
		);
		if (error) {
			snackbar.error("Failed to renew contract: " + (error.error?.message || error));
			return;
		}
		snackbar.success("Contract renewed successfully!");
		showRenewDialog.value = false;
		await loadCustomerDetail();
	} catch (e) {
		snackbar.error("Error submitting contract renewal.");
		console.error(e);
	} finally {
		submittingContract.value = false;
	}
}

function getAvatarStyle(name: string) {
	const colors = ["#4F46E5", "#0284C7", "#0D9488", "#7C3AED", "#DB2777"];
	const hash = (name || "C").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return { backgroundColor: colors[hash % colors.length] };
}

function formatDate(iso: string) {
	return dateFormatStore.formatDate(iso);
}
</script>

<template>
	<div class="maintenance-view">
		<!-- Navigation Header -->
		<div class="page-header">
			<div class="page-header__title-area">
				<h1 class="mt-xs">Customer Profile</h1>
			</div>
			<div class="page-header__actions">
				<button class="btn btn--primary" @click="handleEditCustomer">
					<i class="mdi mdi-pencil-outline"></i> <span class="btn-text">Edit Profile</span> </button>
			</div>
		</div>

		<!-- Profile Main Grid -->
		<div class="profile-grid" v-if="customer">
			<!-- Left Meta Card -->
			<div class="profile-grid__left">
				<div class="panel-card user-meta-card">
					<div class="user-meta-card__avatar" :style="getAvatarStyle(customer.name)">
						{{ customer.name ? customer.name[0].toUpperCase() : "C" }}
					</div>
					<h2 class="user-meta-card__name">{{ customer.name }}</h2>
					<span class="user-meta-card__code u-font-mono">
						System Code: {{ customer.code }}
					</span>
					<span class="user-meta-card__email u-font-mono">
						AutoCount: {{ customer.accountNo || "NO AUTOCOUNT CODE" }}
					</span>

					<div class="user-meta-card__badges mt-sm">
						<Badge :type="customer.requestEinvoice ? 'info' : 'warning'">
							{{
								customer.requestEinvoice
									? "E-Invoicing Requested"
									: "E-Invoicing Not Requsted"
							}}
						</Badge>
						<Badge :type="customer.isActive ? 'success' : 'error'">
							{{ customer.isActive ? "Active" : "Inactive" }}
						</Badge>
					</div>

					<div class="divider my-md"></div>

					<!-- Primary Contract Reference -->
					<div class="quick-nav-box w-full mb-md">
						<span class="quick-nav-box__label">Active Contract Reference</span>
						<div class="contract-card mt-xs">
							<i class="mdi mdi-file-document-outline"></i>
							<span class="contract-card__code">
								{{
									contracts[0]?.contractNo ||
									customer.contractNo ||
									customer.metadata?.contractNo ||
									"No Contract Linked"
								}}
							</span>
						</div>
					</div>

					<!-- MSIC Industry Box -->
					<div
						v-if="customer.profile && customer.profile.msicCode"
						class="quick-nav-box w-full"
					>
						<span class="quick-nav-box__label">MSIC Core Business</span>
						<div class="msic-display-box mt-xs">
							<span class="msic-display-box__code">{{
								customer.profile.msicCode
							}}</span>
							<p class="msic-display-box__desc">
								{{ customer.profile.msicDesc || "General Business Activity" }}
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Right Details Stack -->
			<div class="profile-grid__right">
				<div class="detail-stack">
					<!-- Contracts Management Card -->
					<div class="panel-card panel-card--readonly">
						<div class="panel-card__header">
							<h2>
								<i
									class="mdi mdi-file-document-multiple-outline u-text-primary"
								></i>
								Customer Contracts
							</h2>
							<button class="btn btn--sm btn--primary" @click="openAddContractModal">
								<i class="mdi mdi-plus"></i> <span class="btn-text">New Contract</span> </button>
						</div>

						<div v-if="contracts.length > 0" class="contracts-list">
							<div
								v-for="c in contracts"
								:key="c.guid || c.id"
								class="contract-item-card"
								:class="{
									'contract-item-card--expiring': c.status === 'ExpiringSoon',
									'contract-item-card--expired': c.status === 'Expired',
								}"
							>
								<div class="contract-item-card__main">
									<div class="contract-item-card__header">
										<span class="contract-item-card__no u-font-mono">
											<i class="mdi mdi-file-document-outline"></i>
											{{ c.contractNo }}
										</span>
										<span class="contract-item-card__title">{{
											c.contractName
										}}</span>

										<!-- Expiration Badges -->
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
											Contract Expired
										</Badge>
									</div>

									<div class="contract-item-card__dates mt-xs">
										<span
											><i class="mdi mdi-calendar-start"></i> Start:
											<strong>{{ formatDate(c.startDate) }}</strong></span
										>
										<span class="mx-xs">•</span>
										<span
											><i class="mdi mdi-calendar-end"></i> Expiry:
											<strong>{{ formatDate(c.endDate) }}</strong></span
										>
									</div>

									<p v-if="c.description" class="contract-item-card__desc mt-xs">
										{{ c.description }}
									</p>

									<!-- Alert Banner for Expiring or Expired -->
									<div
										v-if="c.status === 'ExpiringSoon'"
										class="contract-alert contract-alert--warning mt-xs"
									>
										<i class="mdi mdi-alert-circle"></i> Notice: Contract will
										expire within 1 month. Click Renew to extend validity.
									</div>
									<div
										v-else-if="c.status === 'Expired'"
										class="contract-alert contract-alert--danger mt-xs"
									>
										<i class="mdi mdi-close-circle"></i> Warning: Contract has
										expired and is disabled for selection in Work Orders.
									</div>
								</div>

								<div class="contract-item-card__actions">
									<button
										class="btn btn--sm btn--secondary"
										title="Edit Contract Details"
										@click="openEditContractModal(c)"
									>
										<i class="mdi mdi-pencil-outline"></i> <span class="btn-text">Edit</span> </button>

									<button
										v-if="c.status === 'ExpiringSoon' || c.status === 'Expired'"
										class="btn btn--sm btn--warning"
										@click="openRenewModal(c)"
									>
										<i class="mdi mdi-autorenew"></i> <span class="btn-text">Renew</span> </button>
									<button
										v-else
										class="btn btn--sm btn--secondary"
										@click="openRenewModal(c)"
									>
										<i class="mdi mdi-calendar-plus"></i> <span class="btn-text">Extend</span> </button>
								</div>
							</div>
						</div>
						<div v-else class="empty-contracts">
							<i class="mdi mdi-file-hidden-outline"></i>
							<p>No contracts registered yet for this customer.</p>
						</div>
					</div>

					<!-- Debtor Profile Card -->
					<div class="panel-card panel-card--readonly mt-lg">
						<div class="panel-card__header">
							<h2>
								<i class="mdi mdi-account-box-outline u-text-primary"></i> Debtor
								Contact & Tax Identity
							</h2>
						</div>
						<div class="readonly-grid" v-if="customer.profile">
							<div class="readonly-item">
								<span class="readonly-item__label">Login Email</span>
								<span class="readonly-item__value">{{
									customer.profile.email || "—"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Contact Phone</span>
								<span class="readonly-item__value">{{
									customer.profile.phone || "—"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Tax ID (TIN)</span>
								<span class="readonly-item__value u-font-mono">{{
									customer.profile.tin || "—"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Business Reg No (BRN)</span>
								<span class="readonly-item__value u-font-mono">{{
									customer.profile.brn || "—"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Identity Type</span>
								<span class="readonly-item__value">
									<Chip>{{ customer.profile.individualType }}</Chip>
								</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Identity Document No</span>
								<span class="readonly-item__value u-font-mono">{{
									customer.profile.identityNo || "—"
								}}</span>
							</div>
						</div>
					</div>

					<!-- Customer Primary Address Card -->
					<div class="panel-card panel-card--readonly mt-lg">
						<div class="panel-card__header">
							<h2>
								<i class="mdi mdi-map-marker-outline u-text-primary"></i> Primary
								Registered Address
							</h2>
						</div>
						<div class="readonly-grid" v-if="customer.address || customer.addressCode">
							<div
								class="readonly-item readonly-item--full"
								v-if="customer.address?.address1"
							>
								<span class="readonly-item__label">Street Address / Building</span>
								<span class="readonly-item__value">
									{{ customer.address.address1 }} {{ customer.address.address2 }}
								</span>
							</div>
							<div class="readonly-item" v-if="customer.address?.city">
								<span class="readonly-item__label">City / Town</span>
								<span class="readonly-item__value">{{
									customer.address.city
								}}</span>
							</div>
							<div class="readonly-item" v-if="customer.address?.postcode">
								<span class="readonly-item__label">Postcode</span>
								<span class="readonly-item__value u-font-mono">{{
									customer.address.postcode
								}}</span>
							</div>
							<div class="readonly-item" v-if="customer.address?.state">
								<span class="readonly-item__label">State</span>
								<span class="readonly-item__value">{{
									customer.address.state
								}}</span>
							</div>
							<div class="readonly-item" v-if="customer.address?.country">
								<span class="readonly-item__label">Country</span>
								<span class="readonly-item__value">{{
									customer.address.country
								}}</span>
							</div>
						</div>
						<div v-else class="u-text-muted" style="font-size: 13px">
							No address details registered yet.
						</div>
					</div>

					<!-- Credit & Metadata Card -->
					<div class="panel-card panel-card--readonly mt-lg">
						<div class="panel-card__header">
							<h2>
								<i class="mdi mdi-database-edit-outline u-text-primary"></i> Credit
								& Tax Metadata
							</h2>
						</div>
						<div class="readonly-grid">
							<div class="readonly-item">
								<span class="readonly-item__label">Default Currency</span>
								<span class="readonly-item__value u-font-mono">
									{{ customer.metadata?.currencyCode || "MYR" }}
								</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Credit Limit Amount</span>
								<span
									class="readonly-item__value u-text-primary u-font-weight-bold"
								>
									{{
										customer.metadata?.creditLimit
											? `$${customer.metadata.creditLimit}`
											: "No Limit"
									}}
								</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Overdue Limit</span>
								<span class="readonly-item__value u-text-danger">
									{{
										customer.metadata?.overdueLimit
											? `$${customer.metadata.overdueLimit}`
											: "No Limit"
									}}
								</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Accounting Control Account</span>
								<span class="readonly-item__value u-font-mono">
									{{ customer.metadata?.controlAccount || "—" }}
								</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Tax Exemption No</span>
								<span class="readonly-item__value u-font-mono">
									{{ customer.metadata?.taxExemptNo || "None" }}
								</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Exempt Expiry Date</span>
								<span class="readonly-item__value">
									{{ customer.metadata?.exemptExpiryDate || "—" }}
								</span>
							</div>
						</div>
					</div>
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
						placeholder="e.g. Annual Maintenance Contract"
					/>
				</div>
				<div class="form-grid mb-md">
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
					<Textbox v-model="contractForm.description" placeholder="Optional notes..." />
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
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/Customer/_customer-profile.scss";
</style>
