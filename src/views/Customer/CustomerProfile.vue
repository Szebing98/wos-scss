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
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1 class="mt-xs">Customer Profile</h1>
			</div>
			<div class="header-actions">
				<button class="btn btn--primary" @click="handleEditCustomer">
					<i class="mdi mdi-pencil-outline"></i> Edit Profile
				</button>
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
								<i class="mdi mdi-plus"></i> New Contract
							</button>
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
										<i class="mdi mdi-pencil-outline"></i> Edit
									</button>

									<button
										v-if="c.status === 'ExpiringSoon' || c.status === 'Expired'"
										class="btn btn--sm btn--warning"
										@click="openRenewModal(c)"
									>
										<i class="mdi mdi-autorenew"></i> Renew
									</button>
									<button
										v-else
										class="btn btn--sm btn--secondary"
										@click="openRenewModal(c)"
									>
										<i class="mdi mdi-calendar-plus"></i> Extend
									</button>
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
@mixin flex-row($align: stretch, $gap: 0) {
	display: flex;
	align-items: $align;
	gap: $gap;
}

.maintenance-view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-lg);

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--spacing-md);
	}
	&__title-area {
		h1 {
			font-size: 22px;
			font-weight: 700;
			color: var(--colors-text-primary);
			margin: 4px 0 0;
		}
	}
}

.header-actions {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.profile-grid {
	display: grid;
	grid-template-columns: 3.6fr 8.4fr;
	gap: var(--spacing-lg);
	align-items: start;

	@media (max-width: 960px) {
		grid-template-columns: 1fr;
	}
}

.user-meta-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: var(--spacing-xl) var(--spacing-lg) !important;
	background: var(--colors-surface-card);

	&__avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		color: white;
		font-size: 32px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6px 20px rgba(79, 70, 229, 0.2);
		margin-bottom: 14px;
	}

	&__name {
		font-size: 18px;
		font-weight: 700;
		color: var(--colors-text-primary);
		margin: 0 0 4px 0;
	}

	&__code {
		font-size: 12px;
		color: var(--colors-text-muted);
		margin-bottom: 2px;
	}

	&__email {
		font-size: 12px;
		color: var(--colors-brand-primary);
		font-family: monospace;
		font-weight: 600;
	}

	&__badges {
		@include flex-row($align: center, $gap: 6px);
		flex-wrap: wrap;
		justify-content: center;
	}
}

.quick-nav-box {
	text-align: left;

	&__label {
		font-size: 11px;
		font-weight: 700;
		color: var(--colors-text-muted);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
}

.contract-card {
	background: rgba(79, 70, 229, 0.06);
	border: 1px solid rgba(79, 70, 229, 0.2);
	border-radius: 8px;
	padding: 10px 14px;
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--colors-brand-primary);

	i {
		font-size: 18px;
	}

	&__code {
		font-family: monospace;
		font-size: 13px;
		font-weight: 700;
	}
}

.msic-display-box {
	background-color: var(--colors-surface-background, #f8fafc);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	padding: 12px;

	&__code {
		font-family: monospace;
		font-size: 14px;
		font-weight: 700;
		color: var(--colors-brand-primary);
	}

	&__desc {
		font-size: 12px;
		color: var(--colors-text-secondary);
		margin: 4px 0 0 0;
		line-height: 1.4;
	}
}

// Contracts List Cards
.contracts-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.contract-item-card {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 10px;
	padding: 14px 16px;
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 16px;
	transition: all 0.2s ease;

	&--expiring {
		border-color: rgba(245, 158, 11, 0.4);
		background: rgba(245, 158, 11, 0.02);
	}

	&--expired {
		border-color: rgba(239, 68, 68, 0.4);
		background: rgba(239, 68, 68, 0.02);
	}

	&__main {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
	}

	&__header {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	&__no {
		font-size: 13px;
		font-weight: 700;
		color: var(--colors-brand-primary);
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	&__title {
		font-size: 14px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}

	&__dates {
		font-size: 12px;
		color: var(--colors-text-muted);
		display: flex;
		align-items: center;
		gap: 6px;

		strong {
			color: var(--colors-text-primary);
		}
	}

	&__desc {
		font-size: 12px;
		color: var(--colors-text-secondary);
		margin: 0;
	}

	&__actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}
}

.contract-alert {
	font-size: 12px;
	padding: 6px 10px;
	border-radius: 6px;
	display: flex;
	align-items: center;
	gap: 6px;

	&--warning {
		background: rgba(245, 158, 11, 0.1);
		color: #d97706;
	}

	&--danger {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
	}
}

.empty-contracts {
	text-align: center;
	padding: 28px 16px;
	color: var(--colors-text-muted);

	i {
		font-size: 36px;
		margin-bottom: 8px;
		display: block;
		color: var(--colors-text-muted);
	}

	p {
		font-size: 13px;
		margin: 0 0 16px 0;
	}

	&__action {
		margin-top: 16px;
		display: flex;
		justify-content: center;
	}
}

.dialog-form {
	display: flex;
	flex-direction: column;
}

.form-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12px;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 4px;

	&__label {
		font-size: 12px;
		font-weight: 600;
		color: var(--colors-text-secondary);
	}
}

.panel-card--readonly {
	border-top: 4px solid var(--colors-brand-primary);
}

.readonly-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16px var(--spacing-md);
	padding: 4px 0;

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
}

.readonly-item {
	display: flex;
	flex-direction: column;
	gap: 4px;

	&__label {
		font-size: 11px;
		font-weight: 600;
		color: var(--colors-text-muted);
		text-transform: uppercase;
	}

	&__value {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}
}

.panel-card {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: 24px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);

	.panel-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 14px;

		h2 {
			font-size: 15px;
			font-weight: 700;
			color: var(--colors-text-primary);
			margin: 0;
			@include flex-row($align: center, $gap: 6px);

			i {
				font-size: 18px;
			}
		}
	}
}

.mt-xs {
	margin-top: var(--spacing-xs);
}
.mt-sm {
	margin-top: var(--spacing-sm);
}
.mt-lg {
	margin-top: var(--spacing-lg);
}
.mx-xs {
	margin-left: var(--spacing-xs);
	margin-right: var(--spacing-xs);
}
.my-md {
	margin-top: var(--spacing-md);
	margin-bottom: var(--spacing-md);
}
.mb-md {
	margin-bottom: var(--spacing-md);
}
.mr-sm {
	margin-right: var(--spacing-sm);
}
.w-full {
	width: 100% !important;
}
.divider {
	height: 1px;
	background-color: var(--colors-surface-border);
	width: 100%;
}
.u-font-mono {
	font-family: monospace;
}
.u-font-weight-bold {
	font-weight: 700;
}
.u-text-primary {
	color: var(--colors-brand-primary) !important;
}
.u-text-danger {
	color: #ef4444 !important;
}
.u-required {
	color: #ef4444;
}
</style>
