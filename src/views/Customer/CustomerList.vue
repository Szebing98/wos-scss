<script setup lang="ts">
import { getApiErrorMessage } from "@/utils/error";
import PageHeader from "@/components/PageHeader.vue";
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
import { reportApi } from "@/api/report/report.api";
import { downloadCsv, printRowsAsPdf } from "@/utils/csv";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { useAuthStore } from "@/stores/auth.store";

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
const exporting = ref(false);
const snackbar = useSnackbarStore();
const authStore = useAuthStore();

const headers = computed<TableHeader[]>(() => {
	const cols: TableHeader[] = [
		{ key: "status", label: "Status", width: "110px", minWidth: "100px" },
		{ key: "customer", label: "Customer", minWidth: "220px" },
		{ key: "classification", label: "Classification", width: "150px", minWidth: "130px" },
		{ key: "autocount", label: "AutoCount No", width: "150px", minWidth: "140px" },
		{ key: "contractNo", label: "Contract No", width: "150px", minWidth: "140px" },
		{ key: "einvoice", label: "e-Invoice", width: "140px", minWidth: "130px" },
	];
	if (authStore.can("update", "Customer")) {
		cols.push({
			key: "actions",
			label: "Actions",
			align: "right",
			width: "110px",
			minWidth: "100px",
		});
	}
	return cols;
});

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
				profile: {
					customerCode: c.customerCode || c.code || "",
					email: c.email || "",
					phone: c.phone || "",
					tin: c.tin || "",
					brn: c.brn || "",
					individualType: c.individualType || "",
					identityNo: c.identityNo || "",
					msicCode: c.msicCode || "",
					msicDesc: c.msicDesc || "",
				},
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
			const classification = getCustomerClassification(item.profile?.individualType || "", item.profile?.identityNo || "");
			const matchClassification = classification.toLowerCase().includes(q);
			return (
				matchName ||
				matchCode ||
				matchAccount ||
				matchContract ||
				matchEmail ||
				matchPhone ||
				matchTin ||
				matchBrn ||
				matchId ||
				matchClassification
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

async function handleExport(format: "CSV" | "PDF") {
	if (exporting.value) return;
	exporting.value = true;
	try {
		const { data, error } = await reportApi.exportCustomers({
			format,
			type: "list",
		});
		if (error) throw new Error(getApiErrorMessage(error, "Export request failed."));
		const rows = ((data as any)?.data || []) as Record<string, unknown>[];
		const date = new Date().toISOString().slice(0, 10);
		if (format === "CSV") downloadCsv(`customers-${date}.csv`, rows);
		else printRowsAsPdf("Customer Report", rows);
		snackbar.success(`${rows.length} customer(s) exported.`);
	} catch (error) {
		snackbar.error(error instanceof Error ? error.message : "Failed to export customers.");
	} finally {
		exporting.value = false;
	}
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

function getCustomerClassification(individualType: string, identityNo: string = ""): string {
	if (!individualType) {
		if (identityNo) return "INDIVIDUAL";
		return "COMPANY";
	}
	const upper = individualType.toUpperCase();
	if (upper === "COMPANY" || upper === "BUSINESS") return "COMPANY";
	if (upper === "GOVERNMENT") return "GOVERNMENT";
	return "INDIVIDUAL";
}

function getClassificationBadge(individualType: string, identityNo: string = "") {
	const classification = getCustomerClassification(individualType, identityNo);
	switch (classification) {
		case "COMPANY":
			return "info";
		case "GOVERNMENT":
			return "warning";
		case "INDIVIDUAL":
			return "success";
		default:
			return "default";
	}
}
</script>

<template>
	<div class="customer-view">
		<!-- Header -->
		<PageHeader title="Customer List">
			<template #subtitle>
				<p class="page-header__subtitle">Manage debtors, individual tax identities, contract references, and LHDN MyInvois profiles</p>
			</template>
			<template #actions>
				<button
					v-if="authStore.can('export', 'Report')"
					class="btn btn--primary"
					:disabled="exporting"
					@click="handleExport('PDF')"
				>
					<i class="mdi mdi-file-pdf-box"></i> <span class="btn-text">Export</span>
				</button>
				<button
					v-if="authStore.can('create', 'Customer')"
					class="btn btn--primary"
					@click="handleCreateCustomer"
				>
					<i class="mdi mdi-plus"></i> <span class="btn-text">Create Customer</span>
				</button>
			</template>
		</PageHeader>

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
						<option value="COMPANY">Company</option>
						<option value="INDIVIDUAL">Individual</option>
						<option value="GOVERNMENT">Government</option>
					</Select>

					<Select v-model="filterStatus" label="Status">
						<option value="all">All Status</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</Select>

					<Select v-model="filterEinvoice" label="e-Invoice">
						<option value="all">All</option>
						<option value="required">Requested</option>
						<option value="standard">Not Requested</option>
					</Select>
				</FilterPanel>
			</div>
		</div>

		<!-- Customers Data Table -->
		<div class="panel-card table-card">
			<Table
				paginate
				:hover="authStore.can('update', 'Customer')"
				storageKey="customer-directory"
				:headers="headers"
				:items="filteredCustomers"
				:loading="loading"
				:search-query="searchQuery"
				emptyMessage="No customer records found."
				@row-click="
					(customer) =>
						authStore.can('update', 'Customer') && viewCustomerDetail(customer)
				"
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

				<template #item-classification="{ item: customer }">
					<Badge
						v-if="customer.profile?.individualType || customer.profile?.identityNo"
						:type="getClassificationBadge(customer.profile.individualType, customer.profile.identityNo)"
					>
						{{ getCustomerClassification(customer.profile.individualType, customer.profile.identityNo) }}
					</Badge>
					<span v-else class="u-text-muted">—</span>
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
						{{ customer.isActive ? "Active" : "Inactive" }}
					</Badge>
				</template>

				<template
					#item-actions="{ item: customer }"
					v-if="authStore.can('update', 'Customer')"
				>
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
@use "@/styles/pages/Customer/_customer-list.scss";
</style>
