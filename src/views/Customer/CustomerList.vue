<template>
	<div class="maintenance-view">
		<div class="services-view__header">
			<div class="services-view__title-area">
				<div class="title-with-action">
					<h1>Customer Directory</h1>
					<button
						class="icon-action-btn icon-action-btn--primary"
						@click="handleCreateCustomer"
						title="Add New Customer"
					>
						<i class="mdi mdi-account-multiple-plus"></i>
					</button>
				</div>
				<p class="services-view__subtitle">
					Manage debtors, individual tax identities, and LHDN MyInvois profiles
				</p>
			</div>
		</div>

		<div class="filter-panel">
			<div class="filter-panel__left">
				<div class="search-box">
					<i class="mdi mdi-magnify search-box__icon"></i>
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Search Name, AutoCount No or Tax ID..."
						class="search-box__input"
					/>
				</div>

				<select v-model="identityFilter" class="filter-dropdown">
					<option value="all">All Types</option>
					<option value="MyKAD">MyKAD (Citizen)</option>
					<option value="PASSPORT">Passport (Foreigner)</option>
					<option value="COMPANY">Corporate / BRN</option>
				</select>

				<label class="checkbox-container">
					<input type="checkbox" v-model="showActiveOnly" />
					<span class="checkbox-container__box"></span>
					Active Only
				</label>

				<label class="checkbox-container">
					<input type="checkbox" v-model="showEinvoiceOnly" />
					<span class="checkbox-container__box"></span>
					e-Invoice Required
				</label>
			</div>
		</div>

		<div class="panel-card table-scroll-container">
			<table class="data-table data-table--striped">
				<thead>
					<tr>
						<th>Customer / Debtor</th>
						<th>AutoCount No</th>
						<th>Tax Info / Type</th>
						<th>e-Invoice</th>
						<th>Status</th>
						<th class="u-text-right" style="width: 100px">Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="customer in filteredCustomers" :key="customer.code">
						<td>
							<div class="employee-cell">
								<div
									class="employee-cell__avatar"
									:style="getAvatarStyle(customer.name)"
								>
									{{ customer.name[0] }}
								</div>
								<div class="employee-cell__info">
									<span class="employee-cell__name">{{ customer.name }}</span>
									<span class="employee-cell__title"
										>System Code: {{ customer.code }}</span
									>
								</div>
							</div>
						</td>
						<td>
							<span
								v-if="customer.accountNo"
								class="u-font-mono u-font-weight-bold u-text-primary"
							>
								{{ countryFormatAccount(customer.accountNo) }}
							</span>
							<span v-else class="u-text-muted">—</span>
						</td>
						<td>
							<div v-if="customer.profile" class="tax-cell">
								<span class="tax-cell__tin"
									>TIN: {{ customer.profile.tin || "N/A" }}</span
								>
								<span class="tax-cell__type"
									>{{ customer.profile.individualType }} |
									{{ customer.profile.identityNo || "No ID" }}</span
								>
							</div>
							<span v-else class="u-text-muted">No Profile Registered</span>
						</td>
						<td>
							<Chip
								:type="customer.requestEinvoice ? 'info' : 'default'"
								:icon="customer.requestEinvoice ? 'mdi-file-check-outline' : ''"
							>
								{{ customer.requestEinvoice ? "Required" : "Standard" }}
							</Chip>
						</td>
						<td>
							<Chip :type="customer.isActive ? 'success' : 'default'">
								{{ customer.isActive ? "Active" : "Disabled" }}
							</Chip>
						</td>
						<td class="u-text-right">
							<button
								class="icon-action-btn"
								@click="viewCustomerDetail(customer.code)"
								title="View Details / Profile"
							>
								<i class="mdi mdi-text-box-search-outline"></i>
							</button>
						</td>
					</tr>
					<tr v-if="filteredCustomers.length === 0">
						<td colspan="6" class="data-table__empty">
							No customer records matching matrix metrics.
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import Chip from "@/components/Chip.vue";

const router = useRouter();
const searchQuery = ref("");
const identityFilter = ref("all");
const showActiveOnly = ref(false);
const showEinvoiceOnly = ref(false);

// 依据你的 Response Schema (CustomerDetail) 组装的精细化 Mock 数据
const customers = ref([
	{
		code: "CUST-001",
		accountNo: "300-A0001",
		name: "Asiasoft Tech Sdn Bhd",
		licenseNo: "L-9901",
		isActive: true,
		requestEinvoice: true,
		addressCode: "ADDR-KL",
		profile: {
			customerCode: "CUST-001",
			email: "finance@asiasoft.com",
			phone: "+603-88889999",
			tin: "T2100992010",
			brn: "200801030089",
			individualType: "COMPANY",
			identityNo: "831418-H",
			msicCode: "62010",
			msicDesc: "Computer programming activities",
		},
	},
	{
		code: "CUST-002",
		accountNo: "300-C0002",
		name: "Tan Boon Hock",
		licenseNo: null,
		isActive: true,
		requestEinvoice: false,
		addressCode: "ADDR-SWK",
		profile: {
			customerCode: "CUST-002",
			email: "boonhock@gmail.com",
			phone: "+6016-5551234",
			tin: null,
			brn: null,
			individualType: "MyKAD",
			identityNo: "850101-13-5555",
			msicCode: "00000",
			msicDesc: "NOT APPLICABLE",
		},
	},
	{
		code: "CUST-003",
		accountNo: null,
		name: "Global Aircond Parts Ltd",
		licenseNo: "L-1102",
		isActive: false,
		requestEinvoice: true,
		addressCode: null,
		profile: {
			customerCode: "CUST-003",
			email: "shipping@globalparts.sg",
			phone: "+65-67772231",
			tin: "T9920110231",
			brn: "SG-992011",
			individualType: "PASSPORT",
			identityNo: "E992011A",
			msicCode: "46590",
			msicDesc: "Wholesale of other machinery and equipment",
		},
	},
]);

const filteredCustomers = computed(() => {
	return customers.value.filter((c) => {
		const search = searchQuery.value.toLowerCase();
		const matchesSearch =
			!searchQuery.value ||
			c.name.toLowerCase().includes(search) ||
			(c.accountNo && c.accountNo.toLowerCase().includes(search)) ||
			(c.profile && c.profile.tin && c.profile.tin.toLowerCase().includes(search));

		const matchesIdentity =
			identityFilter.value === "all" ||
			(c.profile && c.profile.individualType === identityFilter.value);
		const matchesActive = !showActiveOnly.value || c.isActive;
		const matchesEinvoice = !showEinvoiceOnly.value || c.requestEinvoice;

		return matchesSearch && matchesIdentity && matchesActive && matchesEinvoice;
	});
});

function handleCreateCustomer() {
	router.push("/customer/form");
}

function viewCustomerDetail(code: string) {
	router.push("/customer/profile");
}

function getAvatarStyle(name: string) {
	const colors = ["#202359", "#3D4170", "#5058F2", "#14B8A6", "#06B6D4"];
	const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return { backgroundColor: colors[hash % colors.length] };
}

function countryFormatAccount(acc: string) {
	return acc.toUpperCase();
}
</script>

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
		p {
			font-size: 13px;
			color: #64748b;
			margin: 0;
		}
	}
}

// 极简圆形加号雷达
.title-with-action {
	@include flex-row($align: center, $gap: 12px);
	h1 {
		font-size: 24px;
		font-weight: 700;
		margin: 0;
		color: #0f172a;
	}

	.icon-action-btn--primary {
		background-color: rgba(80, 88, 242, 0.08);
		color: var(--colors-primary-deepblue);
		border-radius: 50%;
		width: 32px;
		height: 32px;
		&:hover {
			background-color: var(--colors-primary-deepblue);
			color: white;
		}
	}
}

.back-link-btn {
	background: transparent;
	border: none;
	font-size: 13px;
	font-weight: 600;
	color: #64748b;
	cursor: pointer;
	padding: 0;
	@include flex-row($align: center, $gap: 4px);
	&:hover {
		color: var(--colors-primary-deepblue);
	}
}

// 纵向混合税务元数据
.tax-cell {
	display: flex;
	flex-direction: column;
	gap: 2px;
	&__tin {
		font-size: 13px;
		font-weight: 700;
		color: #1e293b;
	}
	&__type {
		font-size: 11px;
		color: #64748b;
	}
}

// 员工头像骨架项
.employee-cell {
	@include flex-row($align: center, $gap: 12px);
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
	}
	&__info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	&__name {
		font-size: 14px;
		font-weight: 700;
		color: #1e293b;
	}
	&__title {
		font-size: 11px;
		color: #94a3b8;
	}
}

// 🌟 读写分离联动卡片结构
.profile-grid {
	display: grid;
	grid-template-columns: 3.8fr 8.2fr;
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
	background: linear-gradient(180deg, #ffffff, #fcfdfe);

	&__avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: var(--colors-primary-deepblue);
		color: white;
		font-size: 32px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6px 20px rgba(80, 88, 242, 0.15);
		margin-bottom: 14px;
	}
	&__name {
		font-size: 18px;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 4px 0;
	}
	&__email {
		font-size: 12px;
		color: #64748b;
		font-family: monospace;
	}
	&__badges {
		@include flex-row($align: center, $gap: 6px);
	}
}

.quick-nav-box {
	text-align: left;
	&__label {
		font-size: 11px;
		font-weight: 700;
		color: #94a3b8;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	p {
		font-size: 12px;
		color: #64748b;
		line-height: 1.5;
		margin: 6px 0 12px 0;
	}
}

// MSIC 发票代码卡盒
.msic-display-box {
	background-color: #f8fafc;
	border: 1px solid var(--border-color);
	border-radius: 8px;
	padding: 12px;
	&__code {
		font-family: monospace;
		font-size: 14px;
		font-weight: 700;
		color: var(--colors-primary-deepblue);
	}
	&__desc {
		font-size: 12px;
		color: #475569;
		margin: 4px 0 0 0;
		line-height: 1.4;
	}
}

// 🌟 核心：对应 Zod 动态规则未满足时的“危险拦截状态类”
.panel-card--disabled-mask {
	border: 1px dashed #fca5a5 !important;
	background: linear-gradient(180deg, #ffffff, #fef2f2) !important; // 微微泛红提示风险
	box-shadow: none !important;
}

// 只读页网格
.panel-card--readonly {
	border-top: 4px solid var(--colors-primary-deepblue);
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
		color: #94a3b8;
		text-transform: uppercase;
	}
	&__value {
		font-size: 13px;
		font-weight: 600;
		color: #1e293b;
	}
}

// 公用面板、检索与表格底层
.panel-card {
	background: white;
	border: 1px solid var(--border-color);
	border-radius: 12px;
	padding: 24px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);
	.panel-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 14px;
		h2 {
			font-size: 15px;
			font-weight: 700;
			color: #1e293b;
			margin: 0;
			@include flex-row($align: center, $gap: 6px);
			i {
				font-size: 18px;
			}
		}
	}
}
.filter-panel {
	background: white;
	border: 1px solid var(--border-color);
	border-radius: 12px;
	padding: var(--spacing-md);
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);
	&__left {
		display: flex;
		align-items: center;
		gap: var(--spacing-lg);
		flex-grow: 1;
		flex-wrap: wrap;
	}
}
.table-scroll-container {
	max-height: 640px;
	overflow-y: auto;
	padding: 0 !important;
}
.data-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
	th,
	td {
		padding: 12px;
		text-align: left;
		vertical-align: middle;
	}
	th {
		color: #64748b;
		border-bottom: 1px solid var(--border-color);
		font-weight: 600;
		background: white;
		position: sticky;
		top: 0;
		z-index: 10;
	}
	tr {
		border-bottom: 1px solid #f1f5f9;
	}
	&--striped {
		tbody tr:nth-child(even) {
			background-color: #f8fafc;
		}
	}
	&__empty {
		text-align: center !important;
		color: #94a3b8;
		padding: 40px !important;
	}
}
.search-box {
	position: relative;
	flex-grow: 1;
	max-width: 320px;
	.search-box__icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: #94a3b8;
		font-size: 18px;
	}
	.search-box__input {
		width: 100%;
		padding: 8px 12px 8px 38px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		box-sizing: border-box;
		&:focus {
			border-color: var(--colors-primary-deepblue);
		}
	}
}
.form-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16px;
	@media (max-width: 540px) {
		grid-template-columns: 1fr;
	}
}
.form-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
	&--full {
		grid-column: span 2;
	}
	&--checkbox-row {
		grid-column: span 2;
		@include flex-row($align: center);
	}
	&__label {
		font-size: 13px;
		font-weight: 600;
		color: #475569;
	}
	&__input,
	.filter-dropdown,
	&__textarea {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		font-family: inherit;
		box-sizing: border-box;
		&:focus {
			border-color: var(--colors-primary-deepblue);
		}
	}
}
.switch-toggle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	input {
		display: none;
	}
	&__slider {
		width: 34px;
		height: 18px;
		background-color: #cbd5e1;
		border-radius: 20px;
		position: relative;
		transition: background-color 0.2s;
		&::before {
			content: "";
			position: absolute;
			left: 2px;
			top: 2px;
			width: 14px;
			height: 14px;
			background-color: white;
			border-radius: 50%;
			transition: transform 0.2s;
		}
	}
	input:checked + &__slider {
		background-color: #22c55e;
		&::before {
			transform: translateX(16px);
		}
	}
	&__label {
		font-size: 13px;
		font-weight: 600;
		color: #475569;
	}
}
.checkbox-container {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	white-space: nowrap;
	input {
		display: none;
	}
	&__box {
		width: 16px;
		height: 16px;
		border: 2px solid #cbd5e1;
		border-radius: 4px;
		position: relative;
		transition: all 0.15s;
	}
	input:checked + &__box {
		background-color: var(--colors-primary-deepblue);
		border-color: var(--colors-primary-deepblue);
		&::after {
			content: "✓";
			position: absolute;
			color: white;
			font-size: 11px;
			font-weight: bold;
			left: 2px;
			top: -2px;
		}
	}
}
.action-btn {
	border: none;
	border-radius: 6px;
	font-size: 13px;
	font-weight: 600;
	padding: 8px 16px;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	&--primary {
		background-color: var(--colors-primary-deepblue);
		color: white;
		&:hover {
			background-color: #444acf;
		}
	}
	&--outlined {
		background-color: transparent;
		border: 1px solid #cbd5e1;
		color: #475569;
		&:hover {
			background-color: #f1f5f9;
		}
	}
	&--text {
		background: transparent;
		color: #64748b;
		font-size: 12px;
		padding: 4px 8px;
		&:hover {
			background: #f1f5f9;
		}
	}
}
.icon-action-btn {
	background: transparent;
	border: none;
	font-size: 18px;
	color: #64748b;
	padding: 6px;
	cursor: pointer;
	border-radius: 6px;
	&:hover {
		background-color: #f1f5f9;
		color: var(--colors-primary-deepblue);
	}
	&--danger {
		&:hover {
			background-color: #fef2f2;
			color: #ef4444;
		}
	}
}

.mt-xs {
	margin-top: var(--spacing-xs);
}
.mt-sm {
	margin-top: var(--spacing-sm);
}
.my-md {
	margin-top: var(--spacing-md);
	margin-bottom: var(--spacing-md);
}
.mb-xs {
	margin-bottom: var(--spacing-xs);
}
.mb-md {
	margin-bottom: var(--spacing-md);
}
.mb-lg {
	margin-bottom: var(--spacing-lg);
}
.mr-lg {
	margin-right: var(--spacing-lg);
}
.w-full {
	width: 100% !important;
}
.divider {
	height: 1px;
	background-color: var(--border-color);
	width: 100%;
}
.u-text-right {
	text-align: right !important;
}
.u-text-muted {
	color: #94a3b8;
}
.u-font-mono {
	font-family: monospace;
}
.u-font-weight-medium {
	font-weight: 500;
}
.u-font-weight-bold {
	font-weight: 700;
}
.u-text-primary {
	color: var(--colors-primary-deepblue) !important;
}
.u-required {
	color: #ef4444;
}
</style>
