<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Textbox from "@/components/Textbox.vue";
import Badge from "@/components/Badge.vue";
import http from "@/utils/http";
import { useAuthStore } from "@/stores/auth.store";
import {
	getPermissionActionLabel,
	getPermissionLabel,
	getPermissionSubjectLabel,
	normalizePermissionCatalog,
} from "@/utils/Settings/permission-label";
import { getHighestRoleLevel, getRoleLevel, hasRole } from "@/utils/Settings/role";
import { useSnackbarStore } from "@/stores/snackbar.store";

interface UserGroupModel {
	guid?: string;
	code: string;
	name: string;
	description: string;
}

interface PermissionModel {
	guid?: string;
	code: string;
	action: string;
	subject: string;
	inverted?: boolean;
}

const snackbar = useSnackbarStore();

const isLoadingGroups = ref(false);
const isLoadingPermissions = ref(false);
const isSaving = ref(false);
const showPermissionMatrix = ref(false);
const isEditingPermissions = ref(false);

const selectedGroup = ref<UserGroupModel | null>(null);
const searchQuery = ref("");
const permissionGuardMessage = ref("");

const groups = ref<UserGroupModel[]>([]);
const allPermissions = ref<PermissionModel[]>([]);
const selectedPermissionCodes = ref<Set<string>>(new Set());
const originalPermissionCodes = ref<Set<string>>(new Set());
const authStore = useAuthStore();

const defaultSystemPermissions: PermissionModel[] = [
	{ code: "read:WorkOrder", subject: "WorkOrder", action: "read" },
	{ code: "create:WorkOrder", subject: "WorkOrder", action: "create" },
	{ code: "update_draft:WorkOrder", subject: "WorkOrder", action: "update_draft" },
	{ code: "update_new:WorkOrder", subject: "WorkOrder", action: "update_new" },
	{ code: "update_pending:WorkOrder", subject: "WorkOrder", action: "update_pending" },
	{ code: "update_progress:WorkOrder", subject: "WorkOrder", action: "update_progress" },
	{ code: "mark_as_done:WorkOrder", subject: "WorkOrder", action: "mark_as_done" },
	{ code: "mark_as_completed:WorkOrder", subject: "WorkOrder", action: "mark_as_completed" },
	{ code: "mark_as_claimed:WorkOrder", subject: "WorkOrder", action: "mark_as_claimed" },
	{ code: "mark_as_closed:WorkOrder", subject: "WorkOrder", action: "mark_as_closed" },
	{ code: "reopen:WorkOrder", subject: "WorkOrder", action: "reopen" },
	{ code: "approve:WorkOrder", subject: "WorkOrder", action: "approve" },
	{ code: "reject:WorkOrder", subject: "WorkOrder", action: "reject" },
	{ code: "cancel:WorkOrder", subject: "WorkOrder", action: "cancel" },
	{ code: "delete:WorkOrder", subject: "WorkOrder", action: "delete" },
	{ code: "list:WorkOrder", subject: "WorkOrder", action: "list" },

	{ code: "read:Customer", subject: "Customer", action: "read" },
	{ code: "create:Customer", subject: "Customer", action: "create" },
	{ code: "update:Customer", subject: "Customer", action: "update" },
	{ code: "delete:Customer", subject: "Customer", action: "delete" },
	{ code: "list:Customer", subject: "Customer", action: "list" },

	{ code: "read:User", subject: "User", action: "read" },
	{ code: "create:User", subject: "User", action: "create" },
	{ code: "update:User", subject: "User", action: "update" },
	{ code: "delete:User", subject: "User", action: "delete" },
	{ code: "list:User", subject: "User", action: "list" },

	{ code: "read:Location", subject: "Location", action: "read" },
	{ code: "update:Location", subject: "Location", action: "update" },
	{ code: "manage:Location", subject: "Location", action: "manage" },
	{ code: "list:Location", subject: "Location", action: "list" },

	{ code: "read:Site", subject: "Site", action: "read" },
	{ code: "create:Site", subject: "Site", action: "create" },
	{ code: "update:Site", subject: "Site", action: "update" },
	{ code: "delete:Site", subject: "Site", action: "delete" },
	{ code: "list:Site", subject: "Site", action: "list" },

	{ code: "read:WorkType", subject: "WorkType", action: "read" },
	{ code: "create:WorkType", subject: "WorkType", action: "create" },
	{ code: "update:WorkType", subject: "WorkType", action: "update" },
	{ code: "delete:WorkType", subject: "WorkType", action: "delete" },
	{ code: "list:WorkType", subject: "WorkType", action: "list" },

	{ code: "read:PartInfo", subject: "PartInfo", action: "read" },
	{ code: "create:PartInfo", subject: "PartInfo", action: "create" },
	{ code: "update:PartInfo", subject: "PartInfo", action: "update" },
	{ code: "delete:PartInfo", subject: "PartInfo", action: "delete" },

	{ code: "read:WorkOrderInvoice", subject: "WorkOrderInvoice", action: "read" },
	{ code: "create:WorkOrderInvoice", subject: "WorkOrderInvoice", action: "create" },
	{ code: "update:WorkOrderInvoice", subject: "WorkOrderInvoice", action: "update" },
	{ code: "delete:WorkOrderInvoice", subject: "WorkOrderInvoice", action: "delete" },

	{ code: "read:SupplierInvoice", subject: "SupplierInvoice", action: "read" },
	{ code: "create:SupplierInvoice", subject: "SupplierInvoice", action: "create" },
	{ code: "update:SupplierInvoice", subject: "SupplierInvoice", action: "update" },
	{ code: "delete:SupplierInvoice", subject: "SupplierInvoice", action: "delete" },

	{ code: "read:Ability", subject: "Ability", action: "read" },
	{ code: "update:Ability", subject: "Ability", action: "update" },
];

function getPermissionCode(permission: Partial<PermissionModel>): string {
	return permission.code || `${permission.action}:${permission.subject}`;
}

function isManageAllPermission(permission: Partial<PermissionModel>): boolean {
	const code = getPermissionCode(permission).toLowerCase();
	const subject = String(permission.subject || "").toLowerCase();

	return (
		code === "manage_all" ||
		code === "manage:all" ||
		code === "manage:*" ||
		subject === "all" ||
		subject === "*"
	);
}

function grantAllVisiblePermissions() {
	selectedPermissionCodes.value = new Set(allPermissions.value.map((p) => p.code));
	showPermissionMatrix.value = true;
}

async function loadGroups() {
	isLoadingGroups.value = true;
	try {
		const res = await http.get("/user-groups");
		const data = res.data?.data || res.data || [];
		groups.value = Array.isArray(data) ? data : [];
		if (groups.value.length > 0 && !selectedGroup.value) {
			handleGroupChange(groups.value[0]);
		}
	} catch (e) {
		console.error("Failed to load user groups", e);
		groups.value = [
			{ code: "SA", name: "Superadmin", description: "Complete system control" },
			{ code: "ADM", name: "Administrator", description: "Manage users and settings" },
			{ code: "MGR", name: "Manager", description: "Manage engineers and schedules" },
			{ code: "ENG", name: "Engineer", description: "Execute work orders" },
			{ code: "Sales", name: "Sales", description: "Manage customer requests" },
		];
		if (groups.value.length > 0 && !selectedGroup.value) {
			handleGroupChange(groups.value[0]);
		}
	} finally {
		isLoadingGroups.value = false;
	}
}

async function handleGroupChange(group: UserGroupModel) {
	selectedGroup.value = group;
	isEditingPermissions.value = false;
	permissionGuardMessage.value = "";
	// Load group permissions
	isLoadingPermissions.value = true;
	selectedPermissionCodes.value.clear();

	try {
		const res = await http.get(`/abilities/groups/${group.code}`);
		const groupPermissions: any[] = res.data?.data || res.data || [];
		// Detect MANAGE_ALL permission indicating full access
		const hasManageAll = groupPermissions.some(isManageAllPermission);
		if (hasManageAll) {
			// MANAGE_ALL means every visible module permission is selected;
			// the synthetic All module itself is not rendered.
			grantAllVisiblePermissions();
			originalPermissionCodes.value = new Set(selectedPermissionCodes.value);
			isLoadingPermissions.value = false;
			return;
		}

		if (Array.isArray(groupPermissions) && groupPermissions.length > 0) {
			groupPermissions.forEach((p) => {
				if (isManageAllPermission(p)) return;
				const code = getPermissionCode(p);
				selectedPermissionCodes.value.add(code);
			});
		} else {
			allPermissions.value.forEach((p) => selectedPermissionCodes.value.add(p.code));
		}
		showPermissionMatrix.value = true;
		originalPermissionCodes.value = new Set(selectedPermissionCodes.value);
	} catch (e) {
		console.error("Failed to load group abilities", e);
	} finally {
		isLoadingPermissions.value = false;
	}
}

async function loadAllPermissions() {
	try {
		const res = await http.get("/abilities");
		const data = res.data?.data || res.data || [];
		if (Array.isArray(data) && data.length > 0) {
			allPermissions.value = normalizePermissionCatalog(
				data.map((p: any) => ({
					guid: p.guid,
					code: getPermissionCode(p),
					action: p.action,
					subject: p.subject,
					inverted: p.inverted ?? false,
				})),
			).filter((p) => !isManageAllPermission(p));
		} else {
			allPermissions.value = normalizePermissionCatalog(defaultSystemPermissions).filter(
				(p) => !isManageAllPermission(p),
			);
		}
	} catch (e) {
		console.error("Failed to load abilities", e);
		allPermissions.value = normalizePermissionCatalog(defaultSystemPermissions).filter(
			(p) => !isManageAllPermission(p),
		);
	}
}

const filteredGroupedPermissions = computed(() => {
	const result: Record<string, PermissionModel[]> = {};
	if (!allPermissions.value) return result;

	allPermissions.value.forEach((x) => {
		const query = searchQuery.value.toLowerCase();
		const matches =
			!searchQuery.value ||
			x.subject.toLowerCase().includes(query) ||
			x.action.toLowerCase().includes(query) ||
			x.code.toLowerCase().includes(query) ||
			getPermissionSubjectLabel(x.subject).toLowerCase().includes(query) ||
			getPermissionActionLabel(x.action).toLowerCase().includes(query);

		if (matches) {
			if (!result[x.subject]) result[x.subject] = [];
			result[x.subject].push(x);
		}
	});
	return result;
});

const currentUserGroups = computed(() => {
	const user = authStore.currentUser || authStore.user || {};
	return [...(user.userGroups || user.groups || []), { code: user.role, name: user.role }];
});

const selectedGroupLevel = computed(() => getRoleLevel(selectedGroup.value));
const currentUserRoleLevel = computed(() => getHighestRoleLevel(currentUserGroups.value));

const canEditSelectedGroup = computed(() => {
	if (!selectedGroup.value) return false;
	if (hasRole(currentUserGroups.value, selectedGroup.value)) return false;
	return currentUserRoleLevel.value >= selectedGroupLevel.value;
});

const selectedGroupEditMessage = computed(() => {
	if (!selectedGroup.value) return "";
	if (hasRole(currentUserGroups.value, selectedGroup.value)) {
		return "You cannot edit permissions for a role assigned to your own account.";
	}
	if (!canEditSelectedGroup.value) {
		return "Your role level cannot edit permissions for a higher-level role.";
	}
	return "";
});

function isChecked(code: string): boolean {
	return selectedPermissionCodes.value.has(code);
}

function onPermissionToggle(code: string, checked: boolean) {
	if (!isEditingPermissions.value) return;
	if (checked) selectedPermissionCodes.value.add(code);
	else selectedPermissionCodes.value.delete(code);
}

function togglePermission(code: string) {
	if (!isEditingPermissions.value) return;
	if (selectedPermissionCodes.value.has(code)) {
		selectedPermissionCodes.value.delete(code);
	} else {
		selectedPermissionCodes.value.add(code);
	}
}

function toggleAllInSubject(subject: string, enable: boolean) {
	if (!isEditingPermissions.value) return;
	const subjectPerms = allPermissions.value.filter((x) => x.subject === subject);
	subjectPerms.forEach((p) => {
		if (enable) selectedPermissionCodes.value.add(p.code);
		else selectedPermissionCodes.value.delete(p.code);
	});
}

function startEditingPermissions() {
	if (!authStore.can("update", "Permission")) {
		permissionGuardMessage.value = "You do not have permission to edit role permissions.";
		return;
	}
	if (!canEditSelectedGroup.value) {
		permissionGuardMessage.value = selectedGroupEditMessage.value;
		return;
	}
	originalPermissionCodes.value = new Set(selectedPermissionCodes.value);
	permissionGuardMessage.value = "";
	isEditingPermissions.value = true;
}

function cancelEditingPermissions() {
	selectedPermissionCodes.value = new Set(originalPermissionCodes.value);
	isEditingPermissions.value = false;
	permissionGuardMessage.value = "";
}

async function saveGroupPermissions() {
	if (!selectedGroup.value?.code || !isEditingPermissions.value) return;
	if (!canEditSelectedGroup.value) {
		permissionGuardMessage.value = selectedGroupEditMessage.value;
		return;
	}
	isSaving.value = true;

	try {
		const abilityCodes = Array.from(selectedPermissionCodes.value);
		await http.post(`/abilities/groups/${selectedGroup.value.code}/sync`, {
			abilityCodes,
		});
		originalPermissionCodes.value = new Set(selectedPermissionCodes.value);
		isEditingPermissions.value = false;
		snackbar.success(`Successfully updated permissions for ${selectedGroup.value.name}!`);
	} catch (e) {
		console.error("Failed to save group permissions", e);
		snackbar.error("Failed to save permissions.");
	} finally {
		isSaving.value = false;
	}
}

onMounted(async () => {
	if (!authStore.currentUser) {
		await authStore.fetchMe();
	}
	await loadAllPermissions();
	loadGroups();
});
</script>

<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1>Role & Group Permissions</h1>
				<p class="maintenance-view__subtitle">
					Configure permissions and global authorization policies for user groups
				</p>
			</div>
			<div class="maintenance-view__actions">
				<button
					v-if="!isEditingPermissions"
					class="btn btn--primary"
					:disabled="
						!selectedGroup ||
						!canEditSelectedGroup ||
						!authStore.can('update', 'Permission') ||
						isLoadingPermissions
					"
					:title="selectedGroupEditMessage || 'Edit Permissions'"
					@click="startEditingPermissions"
				>
					<i class="mdi mdi-pencil-outline"></i>
					Edit Permissions
				</button>
				<template v-else>
					<button
						class="btn btn--secondary"
						:disabled="isSaving"
						@click="cancelEditingPermissions"
					>
						Cancel
					</button>
					<button
						class="btn btn--primary"
						:disabled="!selectedGroup || isSaving"
						@click="saveGroupPermissions"
					>
						<i
							class="mdi"
							:class="isSaving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"
						></i>
						Save Permissions
					</button>
				</template>
			</div>
		</div>

		<div class="maintenance-grid">
			<div class="maintenance-grid__left-panel">
				<h2 class="panel-card__title">Select Group / Role</h2>

				<div v-if="isLoadingGroups" class="loading-state">
					<i class="mdi mdi-loading mdi-spin"></i>
					<span>Loading system roles...</span>
				</div>

				<div v-else class="type-list">
					<div
						v-for="group in groups"
						:key="group.code"
						class="type-card"
						:class="{ 'type-card--selected': selectedGroup?.code === group.code }"
						@click="handleGroupChange(group)"
					>
						<div class="type-card__content">
							<span class="type-card__name">{{ group.name }}</span>
							<span class="type-card__code">{{ group.description }}</span>
						</div>
						<Badge type="info">{{ group.code }}</Badge>
					</div>
				</div>
			</div>

			<div class="maintenance-grid__right-panel">
				<div v-if="!selectedGroup" class="empty-state border-dashed">
					<i class="mdi mdi-shield-lock-outline empty-state__icon"></i>
					<p>No Role Selected</p>
					<span class="empty-state__sub">
						Please select a group or role from the list on the left to manage its
						authorization policy and system capabilities.
					</span>
				</div>

				<div v-else-if="isLoadingPermissions" class="empty-state">
					<i class="mdi mdi-loading mdi-spin empty-state__icon u-text-primary"></i>
					<p>Fetching Authorized Policies...</p>
				</div>

				<div v-else-if="showPermissionMatrix" class="matrix-container">
					<div
						v-if="
							selectedGroupEditMessage ||
							permissionGuardMessage ||
							!isEditingPermissions
						"
						class="permission-notice mb-md"
						:class="{
							'permission-notice--warning':
								selectedGroupEditMessage || permissionGuardMessage,
						}"
					>
						<i
							class="mdi"
							:class="
								selectedGroupEditMessage || permissionGuardMessage
									? 'mdi-lock-alert-outline'
									: 'mdi-eye-outline'
							"
						></i>
						<span>
							{{
								permissionGuardMessage ||
								selectedGroupEditMessage ||
								"Viewing permissions. Click Edit Permissions before making changes."
							}}
						</span>
					</div>

					<div class="filter-panel mb-md">
						<Textbox
							v-model="searchQuery"
							placeholder="Search operational permissions..."
							style="flex-grow: 1"
						>
							<template #prefix>
								<i
									class="mdi mdi-magnify"
									style="font-size: 18px; margin-right: 4px"
								></i>
							</template>
						</Textbox>
					</div>

					<div
						v-for="(perms, subject) in filteredGroupedPermissions"
						:key="subject"
						class="panel-card mb-md"
					>
						<div class="panel-card__header">
							<div class="panel-card__header-title">
								<i class="mdi mdi-folder-key-network-outline u-text-primary"></i>
								<h2>
									{{ getPermissionSubjectLabel(String(subject)) }} Permissions
								</h2>
							</div>
							<div class="panel-card__header-actions">
								<button
									class="btn btn--text"
									:disabled="!isEditingPermissions"
									@click="toggleAllInSubject(String(subject), true)"
								>
									Select All
								</button>
								<button
									class="btn btn--text"
									:disabled="!isEditingPermissions"
									@click="toggleAllInSubject(String(subject), false)"
								>
									Clear All
								</button>
							</div>
						</div>

						<div class="permission-item-grid">
							<div
								v-for="perm in perms"
								:key="perm.code"
								class="perm-box"
								:class="{
									'perm-box--checked': isChecked(perm.code),
									'perm-box--readonly': !isEditingPermissions,
								}"
								@click="togglePermission(perm.code)"
							>
								<label class="checkbox-container" @click.stop>
									<input
										type="checkbox"
										:checked="isChecked(perm.code)"
										:disabled="!isEditingPermissions"
										@change="
											(e) =>
												onPermissionToggle(
													perm.code,
													(e.target as HTMLInputElement).checked,
												)
										"
									/>
									<span class="checkbox-container__box"></span>
									<span class="perm-box__action-label">
										{{ getPermissionLabel(perm.action, perm.subject) }}
									</span>
								</label>

								<span
									v-if="perm.inverted"
									class="deny-badge"
									title="Inverted Policy Rule"
								>
									Deny rule
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/Maintenance/_role-permission.scss";
</style>
