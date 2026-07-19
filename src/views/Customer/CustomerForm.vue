<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<button class="btn btn--text" style="color: var(--colors-brand-primary); padding: 0" @click="router.back()">
					<i class="mdi mdi-arrow-left"></i> Cancel
				</button>
				<h1 class="mt-xs">
					{{
						isNewMode ? "Register New Customer Account" : "Modify Configuration Schema"
					}}
				</h1>
			</div>
			<button class="btn btn--primary" @click="handleSubmitForm">
				<i class="mdi mdi-content-save-check-outline"></i> Commit Changes
			</button>
		</div>

		<div class="form-scroll-layout">
			<div class="panel-card mb-lg">
				<h2 class="panel-card__title mb-md">
					<i class="mdi mdi-card-account-details-outline"></i> Core Primary Block
				</h2>
				<div class="form-grid">
					<div class="form-group">
						<label class="form-group__label"
							>Customer Name <span class="u-required">*</span></label
						>
						<Textbox
							v-model="form.name"
							placeholder="Legal full name"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">AutoCount Debtor Code (AccountNo)</label>
						<Textbox
							v-model="form.accountNo"
							placeholder="e.g. 300-A0001"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">License Number</label>
						<Textbox v-model="form.licenseNo" />
					</div>
					<div class="form-group">
						<label class="form-group__label">System Base Address Code</label>
						<Textbox v-model="form.addressCode" />
					</div>

					<div class="form-group form-group--checkbox-row mt-xs">
						<label class="switch-toggle mr-lg">
							<input type="checkbox" v-model="form.isActive" />
							<span class="switch-toggle__slider"></span>
							<span class="switch-toggle__label">Account Active Status</span>
						</label>

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

			<div
				class="panel-card mb-lg"
				:class="{ 'panel-card--disabled-mask': form.accountNo && !form.profile }"
			>
				<div class="panel-card__header">
					<h2>
						<i class="mdi mdi-badge-account-horizontal-outline"></i> Debtor Profile
						Block
					</h2>
					<Chip v-if="form.accountNo" type="warning">Mandatory (Has AccountNo)</Chip>
				</div>

				<div class="form-grid">
					<div class="form-group">
						<label class="form-group__label">Login/Notification Email</label>
						<Textbox
							v-model="form.profile.email"
							type="email"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">Contact Phone</label>
						<Textbox v-model="form.profile.phone" />
					</div>
					<div class="form-group">
						<label class="form-group__label">Tax Identity No (TIN)</label>
						<Textbox
							v-model="form.profile.tin"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">Business Reg No (BRN)</label>
						<Textbox
							v-model="form.profile.brn"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">Individual Type Selection</label>
						<Select v-model="form.profile.individualType">
							<option value="COMPANY">COMPANY</option>
							<option value="MyKAD">MyKAD (Malaysian Identity)</option>
							<option value="PASSPORT">PASSPORT (Foreigner)</option>
							<option value="GOVERNMENT">GOVERNMENT</option>
						</Select>
					</div>
					<div class="form-group">
						<label class="form-group__label">Identity Document Number</label>
						<Textbox
							v-model="form.profile.identityNo"
						/>
					</div>
				</div>
			</div>

			<div
				class="panel-card"
				:class="{ 'panel-card--disabled-mask': form.requestEinvoice && !form.metadata }"
			>
				<div class="panel-card__header">
					<h2>
						<i class="mdi mdi-file-document-edit-outline"></i> Credit & Tax Metadata
						Block
					</h2>
					<Chip v-if="form.requestEinvoice" type="error"
						>Required for e-Invoice Integration</Chip
					>
				</div>

				<div class="form-grid">
					<div class="form-group">
						<label class="form-group__label">Default Transaction Currency</label>
						<Textbox
							v-model="form.metadata.currencyCode"
							placeholder="MYR"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">Credit Limit Amount</label>
						<Textbox
							v-model="form.metadata.creditLimit"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">Overdue Limit Amount</label>
						<Textbox
							v-model="form.metadata.overdueLimit"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">Linked Accounting Control Account</label>
						<Textbox
							v-model="form.metadata.controlAccount"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">Tax Exemption Reference Number</label>
						<Textbox
							v-model="form.metadata.taxExemptNo"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">Exemption Expiry Date (ISO)</label>
						<Textbox
							v-model="form.metadata.exemptExpiryDate"
							placeholder="YYYY-MM-DD"
						/>
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
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import { customerApi } from "@/api/customer/customer.api";

const route = useRoute();
const router = useRouter();
const isNewMode = ref(true);
const customerGuid = ref<string | null>(null);
const loading = ref(false);

const form = ref<any>({
	accountNo: "",
	name: "",
	licenseNo: "",
	isActive: true,
	requestEinvoice: false,
	addressCode: "",
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

onMounted(async () => {
	const code = route.query.code;
	if (route.query.mode === "new" || !code) {
		isNewMode.value = true;
	} else {
		isNewMode.value = false;
		customerGuid.value = code as string;
		loading.value = true;
		try {
			const { data, error } = await customerApi.getCustomerByGuid(code as string);
			if (data && data.data) {
				const c = data.data as any;
				form.value = {
					accountNo: c.accountNo || "",
					name: c.name || "",
					licenseNo: c.licenseNo || "",
					isActive: c.isActive ?? true,
					requestEinvoice: c.requestEinvoice ?? false,
					addressCode: c.addressCode || "",
					profile: c.profile ? {
						email: c.profile.email || "",
						phone: c.profile.phone || "",
						tin: c.profile.tin || "",
						brn: c.profile.brn || "",
						individualType: c.profile.individualType || "COMPANY",
						identityNo: c.profile.identityNo || "",
					} : { email: "", phone: "", tin: "", brn: "", individualType: "COMPANY", identityNo: "" },
					metadata: c.metadata ? {
						currencyCode: c.metadata.currencyCode || "MYR",
						creditLimit: c.metadata.creditLimit || "",
						overdueLimit: c.metadata.overdueLimit || "",
						controlAccount: c.metadata.controlAccount || "",
						taxExemptNo: c.metadata.taxExemptNo || "",
						exemptExpiryDate: c.metadata.exemptExpiryDate || "",
					} : {
						currencyCode: "MYR",
						creditLimit: "",
						overdueLimit: "",
						controlAccount: "",
						taxExemptNo: "",
						exemptExpiryDate: "",
					},
				};
			} else if (error) {
				console.error("Failed to load customer details:", error);
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading.value = false;
		}
	}
});

function validateSchemaLogic(): boolean {
	if (form.value.accountNo && (!form.value.profile || !form.value.profile.email)) {
		alert(
			"Validation Fail: Profile schema details are required when AutoCount accountNo is provided.",
		);
		return false;
	}
	if (form.value.requestEinvoice && (!form.value.metadata || !form.value.metadata.currencyCode)) {
		alert("Validation Fail: Metadata schema required when e-Invoice engine is requested.");
		return false;
	}
	return true;
}

async function handleSubmitForm() {
	if (!form.value.name) {
		alert("Customer Name is strictly mandatory.");
		return;
	}

	if (!validateSchemaLogic()) return;

	try {
		loading.value = true;
		if (isNewMode.value) {
			const { error } = await customerApi.createCustomer(form.value);
			if (error) {
				alert(`Failed to create customer: ${error.error.message}`);
				return;
			}
			alert("Customer registered successfully!");
		} else if (customerGuid.value) {
			const { error } = await customerApi.updateCustomer(customerGuid.value, form.value);
			if (error) {
				alert(`Failed to update customer: ${error.error.message}`);
				return;
			}
			alert("Customer configuration updated successfully!");
		}
		router.back();
	} catch (e) {
		console.error("Error submitting customer form:", e);
	} finally {
		loading.value = false;
	}
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
		color: var(--colors-text-secondary);
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
		background-color: var(--colors-surface-border);
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
			background-color: var(--colors-text-primary);
			border-radius: 50%;
			transition: transform 0.2s;
		}
	}
	input:checked + &__slider {
		background-color: var(--status-completed);
		&::before {
			transform: translateX(16px);
			background-color: #ffffff;
		}
	}
	&__label {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-secondary);
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
