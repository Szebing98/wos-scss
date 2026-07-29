<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Badge from "@/components/Badge.vue";
import HighlightText from "@/components/HighlightText.vue";
import { customerApi } from "@/api/customer/customer.api";

const headers: TableHeader[] = [
	{ key: "status", label: "Status", width: "110px", minWidth: "100px" },
	{ key: "customer", label: "Customer", minWidth: "220px" },
	{ key: "autocount", label: "AutoCount No", width: "150px", minWidth: "140px" },
	{ key: "contractNo", label: "Contract No", width: "150px", minWidth: "140px" },
	{ key: "tax", label: "Tax Info", minWidth: "200px" },
	{ key: "einvoice", label: "e-Invoice", width: "140px", minWidth: "130px" },
	{ key: "actions", label: "Actions", align: "right", width: "110px", minWidth: "100px" },
];

const router = useRouter();
const searchQuery = ref("");
const identityFilter = ref("all");
const filterStatus = ref("all");
const filterEinvoice = ref("all");

function resetFilters() {
	searchQuery.value = "";
	identityFilter.value = "all";
	filterStatus.value = "all";
	filterEinvoice.value = "all";
}

const customers = ref<any[]>([]);
const loading = ref(false);

async function fetchCustomers() {
	loading.value = true;
	try {
		const query: any = {
			pageIndex: 0,
			pageSize: 100,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		};
		if (searchQuery.value) query.q = searchQuery.value;
		if (filterStatus.value === "active") query.isActive = true;
		else if (filterStatus.value === "inactive") query.isActive = false;
		if (identityFilter.value !== "all") query.individualType = identityFilter.value;

		const { data, error } = await customerApi.getCustomers(query);
		if (data && data.data) {
			customers.value = data.data.map((c: any) => ({
				guid: c.guid || c.code,
				code: c.code,
				accountNo: c.accountNo,
				name: c.name,
				contractNo: c.contractNo || c.metadata?.contractNo || "",
				contracts: c.contracts || [],
				contractNoList: c.contractNoList || (c.contractNo ? [c.contractNo] : []),
				licenseNo: c.licenseNo,
				isActive: c.isActive,
				requestEinvoice: c.requestEinvoice,
				addressCode: c.addressCode,
				profile: c.profile
					? {
							customerCode: c.profile.customerCode,
							email: c.profile.email,
							phone: c.profile.phone,
							tin: c.profile.tin,
							brn: c.profile.brn,
							individualType: c.profile.individualType,
							identityNo: c.profile.identityNo,
							msicCode: c.profile.msicCode,
							msicDesc: c.profile.msicDesc,
						}
					: null,
			}));
		} else if (error) {
			console.error("Failed to load customers:", error);
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

onMounted(() => {
	fetchCustomers();
});

watch([searchQuery, filterStatus, identityFilter], () => {
	fetchCustomers();
});

const filteredCustomers = computed(() => {
	return customers.value.filter((item) => {
		if (filterEinvoice.value === "required" && !item.requestEinvoice) return false;
		if (filterEinvoice.value === "standard" && item.requestEinvoice) return false;

		if (searchQuery.value) {
			const q = searchQuery.value.toLowerCase();
			const matchName = item.name?.toLowerCase().includes(q);
			const matchCode = item.code?.toLowerCase().includes(q);
			const matchAccount = item.accountNo?.toLowerCase().includes(q);
			const matchContract =
				item.contractNoList?.some((cn: string) => cn.toLowerCase().includes(q)) ||
				item.contractNo?.toLowerCase().includes(q);
			const matchEmail = item.profile?.email?.toLowerCase().includes(q);
			const matchPhone = item.profile?.phone?.toLowerCase().includes(q);
			const matchTin = item.profile?.tin?.toLowerCase().includes(q);
			const matchBrn = item.profile?.brn?.toLowerCase().includes(q);
			const matchId = item.profile?.identityNo?.toLowerCase().includes(q);
			return (
				matchName ||
				matchCode ||
				matchAccount ||
				matchContract ||
				matchEmail ||
				matchPhone ||
				matchTin ||
				matchBrn ||
				matchId
			);
		}

		return true;
	});
});

// KPI Metrics
const totalCount = computed(() => customers.value.length);
const activeCount = computed(() => customers.value.filter((c) => c.isActive).length);
const einvoiceCount = computed(() => customers.value.filter((c) => c.requestEinvoice).length);
const inactiveCount = computed(() => customers.value.filter((c) => !c.isActive).length);

function handleCreateCustomer() {
	router.push("/customer/form");
}

function handleEditCustomer(customer: any) {
	const targetId = customer.guid;
	router.push(`/customer/form?guid=${targetId}`);
}

function viewCustomerDetail(customer: any) {
	const targetId = customer.guid;
	router.push(`/customer/profile?guid=${targetId}`);
}

function getAvatarStyle(name: string) {
	const colors = ["#4F46E5", "#0284C7", "#0D9488", "#7C3AED", "#DB2777"];
	const hash = (name || "C").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return { backgroundColor: colors[hash % colors.length] };
}

function countryFormatAccount(acc: string) {
	return acc.toUpperCase();
}
</script>

<template>
	<div class="customer-view">
		<!-- Header -->
		<div class="customer-view__header">
			<div class="customer-view__title-area">
				<h1>Customer List</h1>
				<p class="customer-view__subtitle">
					Manage debtors, individual tax identities, contract references, and LHDN
					MyInvois profiles
				</p>
			</div>
			<button class="btn btn--primary" @click="handleCreateCustomer">
				<i class="mdi mdi-plus"></i> Add Customer
			</button>
		</div>

		<!-- KPI Metric Cards -->
		<div class="metrics-grid">
			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--indigo">
					<i class="mdi mdi-account-group-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">Total Customers</span>
					<span class="metric-card__value">{{ totalCount }}</span>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--emerald">
					<i class="mdi mdi-check-circle-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">Active Accounts</span>
					<span class="metric-card__value">{{ activeCount }}</span>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--rose">
					<i class="mdi mdi-account-off-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">Inactive Accounts</span>
					<span class="metric-card__value">{{ inactiveCount }}</span>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--sky">
					<i class="mdi mdi-file-check-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">e-Invoice Requested</span>
					<span class="metric-card__value">{{ einvoiceCount }}</span>
				</div>
			</div>
		</div>

		<!-- Filter Bar -->
		<div class="filter-panel">
			<div class="filter-bar">
				<Textbox
					v-model="searchQuery"
					placeholder="Search Name, AutoCount No, Contract No, or Tax ID..."
					style="flex: 1; min-width: 260px"
					hide-footer
				>
					<template #prefix>
						<i
							class="mdi mdi-magnify"
							style="
								font-size: 18px;
								margin-right: 4px;
								color: var(--colors-text-muted);
							"
						></i>
					</template>
				</Textbox>

				<FilterPanel show-reset align="right" @reset="resetFilters">
					<Select v-model="identityFilter" label="Identity Type">
						<option value="all">All Types</option>
						<option value="COMPANY">COMPANY (Corporate / BRN)</option>
						<option value="INDIVIDUAL">INDIVIDUAL (All Personal)</option>
						<option value="MyKAD">MyKAD (Citizen)</option>
						<option value="MyPR">MyPR (Permanent Resident)</option>
						<option value="MyKAS">MyKAS (Temporary Resident)</option>
						<option value="ARMY">ARMY (Military Personnel)</option>
						<option value="PASSPORT">PASSPORT (Foreigner)</option>
						<option value="GOVERNMENT">GOVERNMENT (Agency)</option>
					</Select>

					<Select v-model="filterStatus" label="Status">
						<option value="all">All Status</option>
						<option value="active">Active</option>
						<option value="inactive">Disabled</option>
					</Select>

					<Select v-model="filterEinvoice" label="e-Invoice">
						<option value="all">All</option>
						<option value="required">Required</option>
						<option value="standard">Standard</option>
					</Select>
				</FilterPanel>
			</div>
		</div>

		<!-- Customers Data Table -->
		<div class="panel-card table-card">
			<Table
				paginate
				hover
				storageKey="customer-directory"
				:headers="headers"
				:items="filteredCustomers"
				:loading="loading"
				:search-query="searchQuery"
				emptyMessage="No customer records found."
				@row-click="(customer) => viewCustomerDetail(customer)"
			>
				<template #item-customer="{ item: customer }">
					<div class="customer-cell">
						<div class="customer-cell__avatar" :style="getAvatarStyle(customer.name)">
							{{ customer.name[0].toUpperCase() }}
						</div>
						<div class="customer-cell__info">
							<span class="customer-cell__name">
								<HighlightText
									:text="`${customer.name} (${customer.code})`"
									:query="searchQuery"
								/>
							</span>
							<span
								class="customer-cell__code"
								v-if="customer.profile?.email || customer.profile?.phone"
							>
								<HighlightText
									:text="
										[customer.profile?.email, customer.profile?.phone]
											.filter(Boolean)
											.join(' • ')
									"
									:query="searchQuery"
								/>
							</span>
						</div>
					</div>
				</template>

				<template #item-autocount="{ item: customer }">
					<span
						v-if="customer.accountNo"
						class="u-font-mono u-font-weight-bold u-text-primary"
					>
						<HighlightText
							:text="countryFormatAccount(customer.accountNo)"
							:query="searchQuery"
						/>
					</span>
					<span v-else class="u-text-muted">—</span>
				</template>

				<template #item-contractNo="{ item: customer }">
					<div
						v-if="customer.contractNoList && customer.contractNoList.length > 0"
						class="contract-list"
					>
						<span
							v-for="(cn, idx) in customer.contractNoList"
							:key="idx"
							class="contract-badge"
						>
							<i class="mdi mdi-file-document-outline"></i>
							<HighlightText :text="cn" :query="searchQuery" />
						</span>
					</div>
					<span v-else-if="customer.contractNo" class="contract-badge">
						<i class="mdi mdi-file-document-outline"></i>
						<HighlightText :text="customer.contractNo" :query="searchQuery" />
					</span>
					<span v-else class="u-text-muted">—</span>
				</template>

				<template #item-tax="{ item: customer }">
					<div v-if="customer.profile" class="tax-cell">
						<span class="tax-cell__tin">TIN: {{ customer.profile.tin || "N/A" }}</span>
						<span class="tax-cell__type">
							{{ customer.profile.individualType }} |
							{{ customer.profile.identityNo || customer.profile.brn || "No ID" }}
						</span>
					</div>
					<span v-else class="u-text-muted">No Profile Registered</span>
				</template>

				<template #item-einvoice="{ item: customer }">
					<Badge
						:type="customer.requestEinvoice ? 'info' : 'error'"
						:icon="
							customer.requestEinvoice
								? 'mdi-file-check-outline'
								: 'mdi-minus-circle-outline'
						"
					>
						{{ customer.requestEinvoice ? "Requested" : "Not requested" }}
					</Badge>
				</template>

				<template #item-status="{ item: customer }">
					<Badge :type="customer.isActive ? 'success' : 'error'">
						{{ customer.isActive ? "Active" : "Disabled" }}
					</Badge>
				</template>

				<template #item-actions="{ item: customer }">
					<div class="action-buttons" @click.stop>
						<button
							class="btn btn--icon"
							@click="handleEditCustomer(customer)"
							title="Edit Customer Form"
						>
							<i class="mdi mdi-pencil-outline"></i>
						</button>
						<button
							class="btn btn--icon"
							@click="viewCustomerDetail(customer)"
							title="View Profile Details"
						>
							<i class="mdi mdi-eye-outline"></i>
						</button>
					</div>
				</template>
			</Table>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.customer-view {
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

// KPI Grid
.metrics-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: var(--spacing-md);

	@media (max-width: 1024px) {
		grid-template-columns: repeat(2, 1fr);
	}
	@media (max-width: 540px) {
		grid-template-columns: 1fr;
	}
}

.metric-card {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: 16px 20px;
	display: flex;
	align-items: center;
	gap: 16px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
	transition:
		transform 0.2s ease,
		box-shadow 0.2s ease;

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	&__icon {
		width: 44px;
		height: 44px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;

		&--indigo {
			background: rgba(79, 70, 229, 0.1);
			color: #4f46e5;
		}
		&--emerald {
			background: rgba(16, 185, 129, 0.1);
			color: #10b981;
		}
		&--sky {
			background: rgba(14, 165, 233, 0.1);
			color: #0ea5e9;
		}
		&--purple {
			background: rgba(139, 92, 246, 0.1);
			color: #8b5cf6;
		}
		&--rose {
			background: rgba(244, 63, 94, 0.1);
			color: #f43f5e;
		}
	}

	&__content {
		display: flex;
		flex-direction: column;
	}

	&__label {
		font-size: 12px;
		font-weight: 500;
		color: var(--colors-text-muted);
	}

	&__value {
		font-size: 22px;
		font-weight: 700;
		color: var(--colors-text-primary);
		line-height: 1.2;
		margin-top: 2px;
	}
}

// Filter Panel
.filter-panel {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: var(--spacing-md);
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.filter-bar {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
	flex-wrap: wrap;
	width: 100%;
}

// Customer Cell
.customer-cell {
	display: flex;
	align-items: center;
	gap: 12px;

	&__avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		color: white;
		font-weight: 700;
		font-size: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	&__info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	&__name {
		font-size: 14px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}

	&__code {
		font-size: 11px;
		color: var(--colors-text-muted);
	}
}

.contract-badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-family: monospace;
	font-size: 12px;
	font-weight: 600;
	color: var(--colors-brand-primary);
	background: rgba(79, 70, 229, 0.08);
	padding: 2px 8px;
	border-radius: 6px;

	i {
		font-size: 14px;
	}
}

.tax-cell {
	display: flex;
	flex-direction: column;
	gap: 2px;

	&__tin {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}

	&__type {
		font-size: 11px;
		color: var(--colors-text-muted);
	}
}

.table-card {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: 0 !important;
	overflow-x: auto;
	max-width: 100%;
}

.action-buttons {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 4px;
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
.u-text-muted {
	color: var(--colors-text-muted) !important;
}
</style>
