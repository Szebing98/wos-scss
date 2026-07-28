<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Badge from "@/components/Badge.vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";
import { userApi } from "@/api/user/user.api";
import { useAuthStore } from "@/stores/auth.store";
import { getAvatarUrl } from "@/utils/avatar";
import HighlightText from "@/components/HighlightText.vue";

const headers: TableHeader[] = [
	{ key: "status", label: "Status" },
	{ key: "employee", label: "Employee" },
	{ key: "code", label: "Code" },
	{ key: "role", label: "Assigned Role" },
	{ key: "email", label: "Contact Email" },
	{ key: "actions", label: "Actions", align: "right", width: "120px", sortable: false },
];

interface UserModel {
	guid: string;
	code: string;
	name: string;
	employee?: string;
	email: string;
	role: string;
	isActive: boolean;
}

const router = useRouter();
const authStore = useAuthStore();
const searchQuery = ref("");
const roleFilter = ref("all");
const filterStatus = ref("all");

const users = ref<UserModel[]>([]);
const loading = ref(false);

// Status Modal Confirmation State
const showStatusModal = ref(false);
const selectedUserForStatus = ref<UserModel | null>(null);
const statusLoading = ref(false);

async function fetchUsers() {
	loading.value = true;
	try {
		const query: any = {
			pageIndex: 0,
			pageSize: 50,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		};

		if (searchQuery.value) query.q = searchQuery.value;
		if (roleFilter.value !== "all") query.userGroupCode = roleFilter.value;

		if (filterStatus.value === "active") query.isActive = "true";
		else if (filterStatus.value === "inactive") query.isActive = "false";

		const { data, error } = await userApi.getUsers(query);

		if (data && data.data) {
			users.value = data.data.map((u: any) => ({
				guid: u.guid,
				code: u.displayCode || (u.guid ? u.guid.substring(0, 8).toUpperCase() : ""),
				name: u.displayName || u.profile?.displayName || u.name || "Unknown",
				employee: u.displayName || u.profile?.displayName || u.name || "Unknown",
				email: u.email,
				role:
					u.groups && u.groups.length > 0
						? u.groups[0].name || u.groups[0].code
						: u.userGroupCode || u.role || "Unassigned",
				isActive: u.isActive,
				profileImage:
					u.profileImage || u.profile?.profileImage || u.avatarUrl || u.avatar || null,
			}));
		} else if (error) {
			console.error("Failed to load users:", error);
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}

import { fetchRoleList, type RoleModel } from "@/utils/role";

const roleList = ref<RoleModel[]>([]);

function getRoleDisplayName(roleCode: string): string {
	if (!roleCode) return "Unassigned";
	const found = roleList.value.find(
		(r) =>
			r.code === roleCode ||
			r.name === roleCode ||
			r.code.toLowerCase() === roleCode.toLowerCase(),
	);
	if (found) return found.name;
	if (roleCode === "SA" || roleCode === "Superadmin") return "Superadmin";
	if (roleCode === "ADM" || roleCode === "Administrator") return "Administrator";
	if (roleCode === "MGR" || roleCode === "Manager") return "Manager";
	if (roleCode === "ENG" || roleCode === "Engineer") return "Engineer";
	return roleCode;
}

function getRoleChipType(role: string) {
	switch (role) {
		case "SA":
		case "Superadmin":
			return "error";
		case "ADM":
		case "Administrator":
			return "info";
		case "MGR":
		case "Manager":
			return "warning";
		case "ENG":
		case "Engineer":
			return "success";
		default:
			return "default";
	}
}

// Re-fetch users whenever filters change
watch([searchQuery, roleFilter, filterStatus], () => {
	fetchUsers();
});

import { computed } from "vue";

const totalEmployees = computed(() => users.value.length);
const activeEmployees = computed(() => users.value.filter((u) => u.isActive).length);
const inactiveEmployees = computed(() => users.value.filter((u) => !u.isActive).length);
const salesCount = computed(
	() =>
		users.value.filter((u) => {
			const r = (u.role || "").toLowerCase();
			return r.includes("sale") || r === "sales" || r === "sal";
		}).length,
);
const engineerCount = computed(
	() =>
		users.value.filter((u) => {
			const r = (u.role || "").toLowerCase();
			return r === "eng" || r.includes("engineer") || r.includes("technician");
		}).length,
);
const managerCount = computed(
	() =>
		users.value.filter((u) => {
			const r = (u.role || "").toLowerCase();
			return r.includes("manager");
		}).length,
);

onMounted(async () => {
	roleList.value = await fetchRoleList();
	fetchUsers();
});

function resetFilters() {
	roleFilter.value = "all";
	filterStatus.value = "all";
	searchQuery.value = "";
}

function handleCreateUser() {
	router.push("/user/form");
}

function viewUserProfile(guid: string) {
	router.push(`/user/profile?code=${guid}`);
}

import { useSnackbarStore } from "@/stores/snackbar.store";

const snackbar = useSnackbarStore();

function isSelf(user: UserModel) {
	return user.guid === authStore.currentUser?.guid || user.email === authStore.currentUser?.email;
}

function promptToggleStatus(user: UserModel) {
	if (isSelf(user)) {
		snackbar.error("You cannot deactivate your own account.");
		return;
	}
	selectedUserForStatus.value = user;
	showStatusModal.value = true;
}

async function confirmToggleStatus() {
	if (!selectedUserForStatus.value) return;
	statusLoading.value = true;
	try {
		const user = selectedUserForStatus.value;
		if (user.isActive) {
			await userApi.deactivateUser(user.guid);
		} else {
			await userApi.activateUser(user.guid);
		}
		showStatusModal.value = false;
		selectedUserForStatus.value = null;
		await fetchUsers();
	} catch (e) {
		console.error("Failed to update user status:", e);
	} finally {
		statusLoading.value = false;
	}
}

function getRandomAvatarBg(name: string) {
	const colors = ["#5058F2", "#06B6D4", "#10B981", "#F59E0B", "#6366F1"];
	const index = (name || "").length % colors.length;
	return { backgroundColor: colors[index] };
}
</script>

<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1>Employee Directory</h1>
				<p class="maintenance-view__subtitle">
					Manage internal technicians, support staff, and system administrative roles
				</p>
			</div>
			<button
				class="btn btn--primary add-employee-btn"
				@click="handleCreateUser"
				title="Add Employee"
			>
				<i class="mdi mdi-plus"></i>
				<span class="btn-text">Add Employee</span>
			</button>
		</div>

		<!-- Metric Summary Cards -->
		<div class="metrics-grid mb-md">
			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--indigo">
					<i class="mdi mdi-account-group-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">Total Employees</span>
					<span class="metric-card__value">{{ totalEmployees }}</span>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--emerald">
					<i class="mdi mdi-account-check-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">Active Staff</span>
					<span class="metric-card__value">{{ activeEmployees }}</span>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--rose">
					<i class="mdi mdi-account-off-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">Inactive Staff</span>
					<span class="metric-card__value">{{ inactiveEmployees }}</span>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--amber">
					<i class="mdi mdi-account-tie-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">Sales Engineer</span>
					<span class="metric-card__value">{{ salesCount }}</span>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--sky">
					<i class="mdi mdi-wrench-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">Engineers & Technicians</span>
					<span class="metric-card__value">{{ engineerCount }}</span>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-card__icon metric-card__icon--purple">
					<i class="mdi mdi-shield-account-outline"></i>
				</div>
				<div class="metric-card__content">
					<span class="metric-card__label">Manager</span>
					<span class="metric-card__value">{{ managerCount }}</span>
				</div>
			</div>
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
						<option v-for="role in roleList" :key="role.code" :value="role.code">
							{{ role.name }}
						</option>
					</Select>

					<Select v-model="filterStatus" label="Status">
						<option value="all">All</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</Select>
				</FilterPanel>
			</div>
		</Card>

		<Card class="table-scroll-container" style="padding: 0">
			<Table
				paginate
				hover
				storageKey="employee-directory"
				:headers="headers"
				:items="users"
				:loading="loading"
				:search-query="searchQuery"
				emptyMessage="No employees found matching the search matrix."
				@row-click="(user) => viewUserProfile(user.guid)"
			>
				<template #item-employee="{ item: user }">
					<div class="employee-cell">
						<div
							class="employee-cell__avatar"
							:class="
								user.isActive
									? 'employee-cell__avatar--active'
									: 'employee-cell__avatar--inactive'
							"
							:style="!user.profileImage ? getRandomAvatarBg(user.name) : {}"
						>
							<img
								v-if="user.profileImage"
								:src="getAvatarUrl(user.profileImage)"
								class="employee-cell__avatar-img"
								alt="Avatar"
							/>
							<span v-else>{{ user.name ? user.name[0].toUpperCase() : "U" }}</span>
						</div>
						<div class="employee-cell__info">
							<div style="display: flex; align-items: center">
								<span class="employee-cell__name">
									<HighlightText :text="user.name" :query="searchQuery" />
								</span>
								<Badge
									v-if="
										user.guid === authStore.currentUser?.guid ||
										user.email === authStore.currentUser?.email
									"
									type="info"
									style="margin-left: 6px; font-size: 10px; padding: 2px 6px"
									>You</Badge
								>
							</div>
						</div>
					</div>
				</template>
				<template #item-code="{ item: user }">
					<span class="u-font-mono">
						<HighlightText :text="user.code" :query="searchQuery" />
					</span>
				</template>
				<template #item-role="{ item: user }">
					<Badge :type="getRoleChipType(user.role)">{{
						getRoleDisplayName(user.role)
					}}</Badge>
				</template>
				<template #item-email="{ item: user }">
					<HighlightText :text="user.email" :query="searchQuery" />
				</template>
				<template #item-status="{ item }">
					<Badge :type="item.isActive ? 'success' : 'error'">
						{{ item.isActive ? "Active" : "Inactive" }}
					</Badge>
				</template>
				<template #item-actions="{ item: user }">
					<div style="display: flex; gap: 4px; justify-content: flex-end">
						<button
							class="btn btn--icon"
							@click.stop="viewUserProfile(user.guid)"
							title="View Profile / Edit"
						>
							<i class="mdi mdi-account-edit-outline"></i>
						</button>
						<button
							class="btn btn--icon btn--icon-danger"
							:disabled="isSelf(user)"
							:style="isSelf(user) ? 'opacity: 0.35; cursor: not-allowed;' : ''"
							@click.stop="promptToggleStatus(user)"
							:title="
								isSelf(user)
									? 'You cannot deactivate your own account'
									: user.isActive
										? 'Suspend'
										: 'Activate'
							"
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
					</div>
				</template>
			</Table>
		</Card>

		<!-- Confirmation Modal for Status Toggle -->
		<Dialog v-model="showStatusModal" title="Confirm Account Status Change" maxWidth="420px">
			<div
				style="
					padding: 12px 0;
					font-size: 14px;
					color: var(--colors-text-secondary);
					line-height: 1.5;
				"
			>
				<p style="margin: 0 0 8px 0">
					Are you sure you want to
					<strong>{{
						selectedUserForStatus?.isActive ? "Deactivate" : "Activate"
					}}</strong>
					the account for <strong>{{ selectedUserForStatus?.name }}</strong
					>?
				</p>
				<p
					v-if="selectedUserForStatus?.isActive"
					style="margin: 0; font-size: 12px; color: var(--colors-text-muted)"
				>
					Inactive accounts will not be able to authenticate or access the system.
				</p>
			</div>
			<template #footer>
				<Button
					variant="outlined"
					@click="showStatusModal = false"
					:disabled="statusLoading"
					>Cancel</Button
				>
				<Button
					:variant="selectedUserForStatus?.isActive ? 'outlined' : 'primary'"
					@click="confirmToggleStatus"
					:loading="statusLoading"
				>
					Confirm {{ selectedUserForStatus?.isActive ? "Deactivate" : "Activate" }}
				</Button>
			</template>
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
		flex-wrap: nowrap;
		gap: var(--spacing-md);
		width: 100%;
	}
	&__title-area {
		flex: 1;
		min-width: 0;

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

.add-employee-btn {
	flex-shrink: 0;
	white-space: nowrap;

	@media (max-width: 640px) {
		padding: 8px 12px !important;
		min-width: 40px;

		.btn-text {
			display: none;
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
		overflow: hidden;
		border: 2px solid transparent;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
		flex-shrink: 0;

		&--active {
			border-color: #10b981 !important;
			box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15) !important;
		}

		&--inactive {
			border-color: #f43f5e !important;
			box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.15) !important;
		}

		&-img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}
	&__info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	&__name {
		font-size: 14px;
		font-weight: 700;
		color: var(--colors-text-primary);
	}
	&__title {
		font-size: 11px;
		color: var(--colors-text-muted);
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
.mb-md {
	margin-bottom: var(--spacing-md);
}

// KPI Grid
.metrics-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: var(--spacing-md);

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
		&--amber {
			background: rgba(245, 158, 11, 0.1);
			color: #f59e0b;
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

.u-required {
	color: #ef4444;
}
</style>
