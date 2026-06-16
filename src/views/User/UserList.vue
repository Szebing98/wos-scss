<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<div class="title-with-action">
					<h1>Employee Directory</h1>
					<button
						class="icon-action-btn icon-action-btn--primary"
						@click="handleCreateUser"
						title="Add New Employee"
					>
						<i class="mdi mdi-account-plus"></i>
					</button>
				</div>
				<p class="maintenance-view__subtitle">
					Manage internal technicians, support staff, and system administrative roles
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
						placeholder="Search by Name, Email or Code..."
						class="search-box__input"
					/>
				</div>

				<select v-model="roleFilter" class="filter-dropdown">
					<option value="all">All Roles</option>
					<option value="SA">Superadmin</option>
					<option value="Administrator">Administrator</option>
					<option value="Manager">Manager</option>
					<option value="Engineer">Engineer</option>
				</select>

				<label class="checkbox-container">
					<input type="checkbox" v-model="showActiveOnly" />
					<span class="checkbox-container__box"></span>
					Active Only
				</label>
			</div>
		</div>

		<div class="panel-card table-scroll-container">
			<table class="data-table data-table--striped">
				<thead>
					<tr>
						<th>Employee</th>
						<th>Internal Code</th>
						<th>Assigned Role</th>
						<th>Contact Email</th>
						<th>Status</th>
						<th class="u-text-right" style="width: 120px">Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="user in filteredUsers" :key="user.code">
						<td>
							<div class="employee-cell">
								<div
									class="employee-cell__avatar"
									:style="getRandomAvatarBg(user.name)"
								>
									{{ user.name[0] }}
								</div>
								<div class="employee-cell__info">
									<span class="employee-cell__name">{{ user.name }}</span>
									<span class="employee-cell__title">GS Technical Dept</span>
								</div>
							</div>
						</td>
						<td class="u-font-mono">{{ user.code }}</td>
						<td>
							<Chip :type="getRoleChipType(user.role)">{{ user.role }}</Chip>
						</td>
						<td>{{ user.email }}</td>
						<td>
							<Chip :type="user.isActive ? 'success' : 'default'">
								{{ user.isActive ? "Active" : "Suspended" }}
							</Chip>
						</td>
						<td class="u-text-right">
							<button
								class="icon-action-btn"
								@click="viewUserProfile(user.code)"
								title="View Profile / Edit"
							>
								<i class="mdi mdi-account-edit-outline"></i>
							</button>
							<button
								class="icon-action-btn icon-action-btn--danger"
								@click="toggleUserStatus(user)"
								:title="user.isActive ? 'Suspend' : 'Activate'"
							>
								<i
									class="mdi"
									:class="
										user.isActive
											? 'mdi-account-off-outline'
											: 'mdi-account-check-outline'
									"
								></i>
							</button>
						</td>
					</tr>
					<tr v-if="filteredUsers.length === 0">
						<td colspan="6" class="data-table__empty">
							No employees found matching the search matrix.
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

interface UserModel {
	code: string;
	name: string;
	email: string;
	role: string;
	isActive: boolean;
}

const router = useRouter();
const searchQuery = ref("");
const roleFilter = ref("all");
const showActiveOnly = ref(false);

// Mock 员工库核心数据
const users = ref<UserModel[]>([
	{
		code: "USR-001",
		name: "Alice Johnson",
		email: "alice@gstech.com",
		role: "Superadmin",
		isActive: true,
	},
	{
		code: "USR-002",
		name: "Bob Smith",
		email: "bob@gstech.com",
		role: "Engineer",
		isActive: true,
	},
	{
		code: "USR-003",
		name: "Charlie Davis",
		email: "charlie@gstech.com",
		role: "Manager",
		isActive: true,
	},
	{
		code: "USR-004",
		name: "Derrick Rose",
		email: "derrick@gstech.com",
		role: "Engineer",
		isActive: false,
	},
	{
		code: "USR-005",
		name: "Emma Watson",
		email: "emma@gstech.com",
		role: "Administrator",
		isActive: true,
	},
]);

const filteredUsers = computed(() => {
	return users.value.filter((u) => {
		const search = searchQuery.value.toLowerCase();
		const matchesSearch =
			!searchQuery.value ||
			u.name.toLowerCase().includes(search) ||
			u.email.toLowerCase().includes(search) ||
			u.code.toLowerCase().includes(search);

		const matchesRole = roleFilter.value === "all" || u.role === roleFilter.value;
		const matchesActive = !showActiveOnly.value || u.isActive;

		return matchesSearch && matchesRole && matchesActive;
	});
});

function handleCreateUser() {
	// router.push("/maintenance/user-profile?mode=new");
	router.push("/user/form");
}

function viewUserProfile(code: string) {
	// router.push(`/maintenance/user-profile?code=${code}`);
	router.push("/user/profile");
}

function toggleUserStatus(user: UserModel) {
	user.isActive = !user.isActive;
}

function getRoleChipType(role: string) {
	switch (role) {
		case "Superadmin":
			return "error";
		case "Manager":
			return "warning";
		case "Administrator":
			return "info";
		default:
			return "default";
	}
}

// 依照名字生成确定性的柔和彩色头像背景
function getRandomAvatarBg(name: string) {
	const colors = ["#5058F2", "#06B6D4", "#10B981", "#F59E0B", "#6366F1"];
	const index = name.length % colors.length;
	return { backgroundColor: colors[index] };
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
	color: var(--colors-primary-deepblue);
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
		background: var(--colors-primary-deepblue);
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
.panel-card {
	background: white;
	border: 1px solid var(--border-color);
	border-radius: 12px;
	padding: 24px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);
	&__title {
		font-size: 16px;
		font-weight: 700;
		margin: 0;
		color: #1e293b;
	}
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
	max-width: 360px;
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
		padding-top: 4px;
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
	color: var(--colors-primary-deepblue) !important;
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
