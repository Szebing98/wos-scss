<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<button class="back-link-btn" @click="router.back()">
					<i class="mdi mdi-arrow-left"></i> Back to Customers
				</button>
				<h1 class="mt-xs">Customer Profile</h1>
			</div>
			<button class="action-btn action-btn--primary" @click="handleEditCustomer">
				<i class="mdi mdi-pencil-outline"></i> Edit Customer Profile
			</button>
		</div>

		<div class="profile-grid" v-if="customer">
			<div class="profile-grid__left">
				<div class="panel-card user-meta-card">
					<div class="user-meta-card__avatar">
						{{ customer.name[0] }}
					</div>
					<h2 class="user-meta-card__name">{{ customer.name }}</h2>
					<span class="user-meta-card__email u-font-mono">{{
						customer.accountNo || "NO AUTOCOUNT CODE"
					}}</span>

					<div class="user-meta-card__badges mt-sm">
						<Chip :type="customer.requestEinvoice ? 'info' : 'default'">
							{{
								customer.requestEinvoice
									? "LHDN MyInvois Enabled"
									: "Standard Invoicing"
							}}
						</Chip>
						<Chip :type="customer.isActive ? 'success' : 'default'">
							{{ customer.isActive ? "Active Debt" : "Disabled" }}
						</Chip>
					</div>

					<div class="divider my-md"></div>

					<div v-if="customer.profile" class="quick-nav-box w-full">
						<span class="quick-nav-box__label">MSIC Core Business</span>
						<div class="msic-display-box mt-xs">
							<span class="msic-display-box__code">{{
								customer.profile.msicCode
							}}</span>
							<p class="msic-display-box__desc">{{ customer.profile.msicDesc }}</p>
						</div>
					</div>
				</div>
			</div>

			<div class="profile-grid__right">
				<div class="detail-stack">
					<div class="panel-card panel-card--readonly">
						<div class="panel-card__header">
							<h2>
								<i class="mdi mdi-account-box-outline u-text-primary"></i> Debtor
								Profile
							</h2>
						</div>
						<div class="readonly-grid" v-if="customer.profile">
							<div class="readonly-item">
								<span class="readonly-item__label">Login Email</span>
								<span class="readonly-item__value">{{
									customer.profile.email
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
								<span class="readonly-item__value"
									><Chip>{{ customer.profile.individualType }}</Chip></span
								>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Identity Number</span>
								<span class="readonly-item__value u-font-mono">{{
									customer.profile.identityNo || "—"
								}}</span>
							</div>
						</div>
					</div>

					<div class="panel-card panel-card--readonly mt-lg">
						<div class="panel-card__header">
							<h2>
								<i class="mdi mdi-database-edit-outline u-text-primary"></i> Credit
								& Tax Metadata
							</h2>
						</div>
						<div class="readonly-grid" v-if="customer.metadata">
							<div class="readonly-item">
								<span class="readonly-item__label">Default Currency</span>
								<span class="readonly-item__value u-font-mono">{{
									customer.metadata.currencyCode
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Credit Limit Amount</span>
								<span
									class="readonly-item__value u-text-primary u-font-weight-bold"
								>
									{{ customer.metadata.creditLimit || "No Limit" }}
								</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Overdue Limit</span>
								<span class="readonly-item__value text-danger">{{
									customer.metadata.overdueLimit || "No Limit"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Accounting Control Account</span>
								<span class="readonly-item__value u-font-mono">{{
									customer.metadata.controlAccount || "—"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Tax Exemption No</span>
								<span class="readonly-item__value u-font-mono">{{
									customer.metadata.taxExemptNo || "None"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Exempt Expiry Date</span>
								<span class="readonly-item__value">{{
									customer.metadata.exemptExpiryDate || "—"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Delivery Code Address</span>
								<span class="readonly-item__value">{{
									customer.metadata.deliveryAddressCode || "—"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Attention Recipient</span>
								<span class="readonly-item__value">{{
									customer.metadata.attention || "—"
								}}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Chip from "@/components/Chip.vue";

const route = useRoute();
const router = useRouter();
const customer = ref<any>(null);

onMounted(() => {
	const code = route.query.code;
	// 模拟按照 Code 还原对应的详细 Response 模型
	customer.value = {
		code: code || "CUST-001",
		accountNo: "300-A0001",
		name: "Asiasoft Tech Sdn Bhd",
		licenseNo: "L-9901",
		isActive: true,
		requestEinvoice: true,
		addressCode: "ADDR-KL",
		profile: {
			email: "finance@asiasoft.com",
			phone: "+603-88889999",
			tin: "T2100992010",
			brn: "200801030089",
			individualType: "COMPANY",
			identityNo: "831418-H",
			msicCode: "62010",
			msicDesc: "Computer programming activities",
		},
		metadata: {
			currencyCode: "MYR",
			creditLimit: "50,000.00",
			overdueLimit: "10,000.00",
			controlAccount: "200-DEBTOR",
			taxExemptNo: "TX-EX-992A",
			exemptExpiryDate: "2027-12-31 00:00:00",
			deliveryAddressCode: "DEL-HQ-KL",
			attention: "Mr. Tan Boon",
		},
	};
});

function handleEditCustomer() {
	router.push(`/maintenance/customer-form?code=${customer.value.code}`);
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
		color: var(--colors-brand-primary);
		border-radius: 50%;
		width: 32px;
		height: 32px;
		&:hover {
			background-color: var(--colors-brand-primary);
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
		color: var(--colors-brand-primary);
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
		background: var(--colors-brand-primary);
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
		color: var(--colors-brand-primary);
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
		background-color: var(--colors-brand-primary);
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
		color: var(--colors-brand-primary);
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
	color: var(--colors-brand-primary) !important;
}
.u-required {
	color: #ef4444;
}
</style>
