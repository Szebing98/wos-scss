<script setup lang="ts">
import { getApiErrorMessage } from "@/utils/error";
import PageHeader from "@/components/PageHeader.vue";
import { ref, onMounted, watch, computed } from "vue";
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
import { getAvatarUrl } from "@/utils/User/avatar";
import HighlightText from "@/components/HighlightText.vue";
import { reportApi } from "@/api/report/report.api";
import { downloadCsv, printRowsAsPdf } from "@/utils/csv";

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

const headers = computed<TableHeader[]>(() => {
	const cols: TableHeader[] = [
		{ key: "status", label: "Status" },
		{ key: "employee", label: "Employee" },
		{ key: "code", label: "Code" },
		{ key: "role", label: "Assigned Role" },
		{ key: "email", label: "Contact Email" },
	];
	if (authStore.can("edit", "User")) {
		cols.push({
			key: "actions",
			label: "Actions",
			align: "right",
			width: "120px",
			sortable: false,
		});
	}
	return cols;
});

const users = ref<UserModel[]>([]);
const loading = ref(false);
const exporting = ref(false);

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

import { fetchRoleList, type RoleModel } from "@/utils/Settings/role";

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

async function handleExport(format: "CSV" | "PDF") {
	if (exporting.value) return;
	exporting.value = true;
	try {
		const { data, error } = await reportApi.exportUsers({
			format,
			type: "list",
		});
		if (error) throw new Error(getApiErrorMessage(error, "Export request failed."));
		const rows = ((data as any)?.data || []) as Record<string, unknown>[];
		const date = new Date().toISOString().slice(0, 10);
		const exportColumns = headers.value
			.filter((h) => h.key !== "select" && h.key !== "actions")
			.map((h) => ({ key: h.key, label: h.label }));

		if (format === "CSV") downloadCsv(`employees-${date}.csv`, rows, exportColumns);
		else printRowsAsPdf("Employee Report", rows, exportColumns);
		snackbar.success(`${rows.length} employee(s) exported.`);
	} catch (error) {
		snackbar.error(error instanceof Error ? error.message : "Failed to export employees.");
	} finally {
		exporting.value = false;
	}
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
		<PageHeader title="Employee Directory">
			<template #subtitle>
				<p class="page-header__subtitle">Manage internal technicians, support staff, and system administrative roles</p>
			</template>
			<template #actions>
				<button
					v-if="authStore.can('export', 'Report')"
					class="btn btn--primary"
					:disabled="exporting"
					@click="handleExport('CSV')"
				>
					<i class="mdi mdi-file-delimited-outline"></i> <span class="btn-text">Export CSV</span>
				</button>
				<button
					v-if="authStore.can('export', 'Report')"
					class="btn btn--primary"
					:disabled="exporting"
					@click="handleExport('PDF')"
				>
					<i class="mdi mdi-file-pdf-box"></i> <span class="btn-text">Export PDF</span>
				</button>
				<button
					v-if="authStore.can('create', 'User')"
					class="btn btn--primary"
					@click="handleCreateUser"
				>
					<i class="mdi mdi-plus"></i> <span class="btn-text">Create Employee</span>
				</button>
			</template>
		</PageHeader>

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

		<Card style="padding: 0">
			<Table
				paginate
				:hover="authStore.can('edit', 'User')"
				storageKey="employee-directory"
				:headers="headers"
				:items="users"
				:loading="loading"
				:search-query="searchQuery"
				emptyMessage="No employees found matching the search matrix."
				@row-click="(user) => authStore.can('edit', 'User') && viewUserProfile(user.guid)"
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
									>You
								</Badge>
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
				<template #item-actions="{ item: user }" v-if="authStore.can('edit', 'User')">
					<div style="display: flex; gap: 4px; justify-content: flex-end">
						<button
							class="btn btn--icon"
							@click.stop="viewUserProfile(user.guid)"
							title="Edit Profile"
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
										? 'Deactivated'
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
@use "@/styles/pages/User/_user-list.scss";
</style>
