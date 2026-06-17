<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<button class="back-link-btn" @click="router.back()">
					<i class="mdi mdi-arrow-left"></i> Back to Directory
				</button>
				<h1 class="mt-xs">
					{{ isNewMode ? "Create New Profile" : "Employee Profile Details" }}
				</h1>
			</div>
			<button class="action-btn action-btn--primary" @click="handleSaveProfile">
				<i class="mdi mdi-content-save-outline"></i> Save Changes
			</button>
		</div>

		<div class="profile-grid">
			<div class="profile-grid__left">
				<div class="panel-card user-meta-card">
					<div class="user-meta-card__avatar">
						{{ profileData.name ? profileData.name[0] : "?" }}
					</div>
					<h2 class="user-meta-card__name">{{ profileData.name || "New Employee" }}</h2>
					<span class="user-meta-card__email">{{
						profileData.email || "no-email@gstech.com"
					}}</span>

					<div class="user-meta-card__badges mt-sm">
						<Chip type="info" icon="mdi-shield-account">{{ profileData.role }}</Chip>
						<Chip :type="profileData.isActive ? 'success' : 'default'">
							{{ profileData.isActive ? "Active Status" : "Suspended" }}
						</Chip>
					</div>

					<div class="divider my-md"></div>

					<div class="quick-nav-box">
						<span class="quick-nav-box__label">Security Policy</span>
						<p>
							Need custom overrides? You can adjust independent security matrix rules
							for this user.
						</p>
						<button
							class="action-btn action-btn--outlined action-btn--sm w-full"
							@click="goToOverrides"
						>
							<i class="mdi mdi-shield-key-outline"></i> Edit Individual Overrides
						</button>
					</div>
				</div>
			</div>

			<div class="profile-grid__right">
				<div class="panel-card">
					<h2 class="panel-card__title mb-lg">Account Configuration</h2>

				<div class="form-grid">
						<div class="form-group">
							<label class="form-group__label"
								>Internal Employee Code <span class="u-required">*</span></label
							>
							<Textbox
								v-model="profileData.code"
								:disabled="!isNewMode"
								placeholder="e.g. USR-099"
							/>
						</div>

						<div class="form-group">
							<label class="form-group__label"
								>Full Name <span class="u-required">*</span></label
							>
							<Textbox
								v-model="profileData.name"
								placeholder="Enter first and last name"
							/>
						</div>

						<div class="form-group">
							<label class="form-group__label"
								>Corporate Email Address <span class="u-required">*</span></label
							>
							<Textbox
								v-model="profileData.email"
								type="email"
								placeholder="username@gstech.com"
							/>
						</div>

						<div class="form-group">
							<label class="form-group__label">Assigned Authorization Role</label>
							<Select v-model="profileData.role">
								<option value="Superadmin">Superadmin (Root)</option>
								<option value="Administrator">Administrator</option>
								<option value="Manager">Manager / Scheduler</option>
								<option value="Engineer">Field Engineer / Tech</option>
							</Select>
						</div>

						<div class="form-group form-group--checkbox-row">
							<label class="switch-toggle">
								<input type="checkbox" v-model="profileData.isActive" />
								<span class="switch-toggle__slider"></span>
								<span class="switch-toggle__label"
									>Grant Global System Access Permissions</span
								>
							</label>
						</div>

						<div class="form-group form-group--full">
							<label class="form-group__label">Internal HR Notes / Remarks</label>
							<textarea
								v-model="profileData.description"
								rows="4"
								class="form-group__textarea"
								placeholder="Provide background history or technical cert notations..."
							></textarea>
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
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";

const route = useRoute();
const router = useRouter();

const isNewMode = ref(false);

interface ProfileForm {
	code: string;
	name: string;
	email: string;
	role: string;
	isActive: boolean;
	description: string;
}

const profileData = ref<ProfileForm>({
	code: "",
	name: "",
	email: "",
	role: "Engineer",
	isActive: true,
	description: "",
});

onMounted(() => {
	const userCode = route.query.code;
	const mode = route.query.mode;

	if (mode === "new") {
		isNewMode.value = true;
	} else if (userCode) {
		// 模拟通过选定 Code 还原详情
		isNewMode.value = false;
		profileData.value = {
			code: String(userCode),
			name: userCode === "USR-001" ? "Alice Johnson" : "Field Specialist",
			email: userCode === "USR-001" ? "alice@gstech.com" : "tech@gstech.com",
			role: userCode === "USR-001" ? "Superadmin" : "Engineer",
			isActive: true,
			description: "Senior field asset manager focused on LHDN infrastructure orchestration.",
		};
	}
});

function handleSaveProfile() {
	if (!profileData.value.code || !profileData.value.name || !profileData.value.email) {
		alert("Please fulfill all mandatory credentials.");
		return;
	}
	alert("Employee roster synchronized locally.");
	router.back();
}

function goToOverrides() {
	router.push("/maintenance/user-permissions");
}
</script>

<style lang="scss" scoped>
@mixin flex-row($align: stretch, $gap: 0) {
	display: flex;
	align-items: $align;
	gap: $gap;
}

// 1. 标题与雷达按钮
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
	color: var(--colors-brand-primary);
	cursor: pointer;
	padding: 0;
	@include flex-row($align: center, $gap: 4px);
	&:hover {
		text-decoration: underline;
	}
}

// 2. 纵向复杂混合表格单元格 (Employee Cell)
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
		text-transform: uppercase;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
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

// 3. 🌟 双栏个人中心大栅格 (Profile Multi-Panel Grid)
.profile-grid {
	display: grid;
	grid-template-columns: 4fr 8fr;
	gap: var(--spacing-lg);
	align-items: start;
	@media (max-width: 960px) {
		grid-template-columns: 1fr;
	}

	&__left {
		width: 100%;
	}
	&__right {
		width: 100%;
	}
}

// 立体大头像展示卡
.user-meta-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: var(--spacing-xl) var(--spacing-lg) !important;
	background: linear-gradient(180deg, #ffffff, #fbfcfe);

	&__avatar {
		width: 90px;
		height: 90px;
		border-radius: 50%;
		background: var(--colors-brand-primary);
		color: white;
		font-size: 36px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8px 24px rgba(80, 88, 242, 0.2);
		margin-bottom: 16px;
	}
	&__name {
		font-size: 20px;
		font-weight: 700;
		color: #0f172a;
		margin: 0 0 4px 0;
	}
	&__email {
		font-size: 13px;
		color: #64748b;
		font-family: monospace;
	}
	&__badges {
		@include flex-row($align: center, $gap: 6px);
	}
}

// 快捷配置盒
.quick-nav-box {
	text-align: left;
	width: 100%;
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

// 4. 基础全局对齐工具面板与表格
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
	}
}
.table-scroll-container {
	max-height: 640px;
	overflow-y: auto;
	padding: 0 !important;
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
		padding-top: 4px;
	}
	&__label {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-secondary);
	}
	&__textarea {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid var(--colors-surface-border);
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		font-family: inherit;
		box-sizing: border-box;
		background: var(--colors-surface-background);
		color: var(--colors-text-primary);
		&:focus {
			border-color: var(--colors-brand-primary);
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
			border-color: #b2b2b2;
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
.mb-lg {
	margin-bottom: var(--spacing-lg);
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
.u-text-primary {
	color: var(--colors-brand-primary) !important;
}
.u-font-mono {
	font-family: monospace;
	font-weight: 600;
}
.u-font-weight-bold {
	font-weight: 700;
}
.u-font-weight-medium {
	font-weight: 500;
}
.u-required {
	color: #ef4444;
}
</style>
