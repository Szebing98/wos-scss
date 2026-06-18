<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1>Employee Directory</h1>
				<p class="maintenance-view__subtitle">
					Manage internal technicians, support staff, and system administrative roles
				</p>
			</div>
			<button class="action-btn action-btn--primary" @click="handleCreateUser">
				<i class="mdi mdi-plus"></i> Add Employee
			</button>
		</div>

		<Card style="padding: var(--spacing-md)">
			<div class="filter-bar">
				<Textbox
					v-model="searchQuery"
					placeholder="Search by Name, Email or Code..."
					style="flex: 1"
					hide-footer
				>
					<template #prefix>
						<i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 4px"></i>
					</template>
				</Textbox>

				<FilterPanel show-reset align="right" @reset="resetFilters">
					<Select v-model="roleFilter" label="Role">
						<option value="all">All Roles</option>
						<option value="SA">Superadmin</option>
						<option value="Administrator">Administrator</option>
						<option value="Manager">Manager</option>
						<option value="Engineer">Engineer</option>
					</Select>

					<Select v-model="filterStatus" label="Status">
						<option value="all">All</option>
						<option value="active">Active</option>
						<option value="inactive">Suspended</option>
					</Select>
				</FilterPanel>
			</div>
		</Card>

		<Card class="table-scroll-container" style="padding: 0">
			<Table
				:headers="headers"
				:items="filteredUsers"
				emptyMessage="No employees found matching the search matrix."
			>
				<template #item-employee="{ item: user }">
					<div class="employee-cell">
						<div class="employee-cell__avatar" :style="getRandomAvatarBg(user.name)">
							{{ user.name[0] }}
						</div>
						<div class="employee-cell__info">
							<span class="employee-cell__name">{{ user.name }}</span>
							<span class="employee-cell__title">GS Technical Dept</span>
						</div>
					</div>
				</template>
				<template #item-code="{ item: user }">
					<span class="u-font-mono">{{ user.code }}</span>
				</template>
				<template #item-role="{ item: user }">
					<Chip :type="getRoleChipType(user.role)">{{ user.role }}</Chip>
				</template>
				<template #item-email="{ item: user }">
					{{ user.email }}
				</template>
				<template #item-status="{ item }">
					<Chip :type="item.isActive ? 'success' : 'default'">
						{{ item.isActive ? "Active" : "Disabled" }}
					</Chip>
				</template>
				<template #item-actions="{ item: user }">
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
				</template>
			</Table>
		</Card>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import Chip from "@/components/Chip.vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Card from "@/components/Card.vue";

const headers: TableHeader[] = [
	{ key: "employee", label: "Employee" },
	{ key: "code", label: "Internal Code" },
	{ key: "role", label: "Assigned Role" },
	{ key: "email", label: "Contact Email" },
	{ key: "status", label: "Status" },
	{ key: "actions", label: "Actions", align: "right", width: "120px" },
];

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
const filterStatus = ref("all");

function resetFilters() {
	roleFilter.value = "all";
	filterStatus.value = "all";
}

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
		const matchesActive =
			filterStatus.value === "all" ||
			(filterStatus.value === "active" ? u.isActive : !u.isActive);

		return matchesSearch && matchesRole && matchesActive;
	});
});

function handleCreateUser() {
	// router.push("/maintenance/user-profile?mode=new");
	router.push("/user/form");
}

function viewUserProfile(_code: string) {
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

.filter-bar {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	flex-wrap: wrap;
}
.table-scroll-container {
	max-height: 640px;
	overflow-y: auto;
	padding: 0 !important;
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
			opacity: 0.9;
		}
	}
	&--outlined {
		background-color: transparent;
		border: 1px solid var(--colors-surface-border);
		color: var(--colors-text-primary);
		&:hover {
			background-color: var(--colors-surface-hover);
			border-color: var(--colors-text-muted);
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
		background-color: var(--colors-surface-hover);
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
