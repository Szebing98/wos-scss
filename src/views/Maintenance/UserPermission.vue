<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import Textbox from "@/components/Textbox.vue";
import http from "@/utils/http";
import { useAuthStore } from "@/stores/auth.store";
import {
	getPermissionActionLabel,
	getPermissionLabel,
	getPermissionSubjectLabel,
	normalizePermissionCatalog,
} from "@/utils/permission-label";
import { getHighestRoleLevel } from "@/utils/role";

const route = useRoute();

interface UserModel {
	guid?: string;
	code: string;
	name: string;
	email: string;
	userGroups?: Array<{ code?: string; name?: string }>;
	role?: string;
}

interface PermissionModel {
	guid?: string;
	code: string;
	action: string;
	subject: string;
	inverted: boolean;
}

const selectedUserCode = ref("");
const selectedUser = ref<UserModel | null>(null);
const searchQuery = ref("");
const isLoadingPermissions = ref(false);
const showPermissionMatrix = ref(false);
const isSaving = ref(false);
const isEditingOverrides = ref(false);

const userSearchQuery = ref("");
const showUserList = ref(false);
const autocompleteRef = ref<HTMLElement | null>(null);
const permissionGuardMessage = ref("");
const authStore = useAuthStore();

const filteredAutocompleteUsers = computed(() => {
	if (!userSearchQuery.value) return users.value;
	const q = userSearchQuery.value.toLowerCase();
	return users.value.filter(
		(u) =>
			u.name.toLowerCase().includes(q) ||
			u.email.toLowerCase().includes(q) ||
			u.code.toLowerCase().includes(q),
	);
});

const users = ref<UserModel[]>([]);
const allPermissions = ref<PermissionModel[]>([]);

const inheritedPermissions = ref<Set<string>>(new Set());
const userOverrides = ref<Map<string, "allow" | "deny">>(new Map());
const originalUserOverrides = ref<Map<string, "allow" | "deny">>(new Map());

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

function inheritAllVisiblePermissions() {
	inheritedPermissions.value = new Set(allPermissions.value.map((p) => p.code));
	userOverrides.value.clear();
}

// 1. Load users
async function loadUsers() {
	try {
		const res = await http.get("/user", { params: { pageSize: 100 } });
		const data = res.data?.data || res.data || [];
		if (Array.isArray(data)) {
			users.value = data.map((u: any) => ({
				guid: u.guid,
				code: u.code || u.guid.substring(0, 8).toUpperCase(),
				name: u.name || u.displayName || u.profile?.displayName || "Unknown User",
				email: u.email || "",
				userGroups: u.userGroups || u.groups || [],
				role: u.role,
			}));
		}
	} catch (e) {
		console.error("Failed to load users", e);
		users.value = [];
	}
}

// 2. Load abilities
async function loadAllPermissions() {
	try {
		const res = await http.get("/abilities");
		const data = res.data?.data || res.data || [];
		if (Array.isArray(data)) {
			allPermissions.value = normalizePermissionCatalog(
				data.map((p: any) => ({
					guid: p.guid,
					code: getPermissionCode(p),
					action: p.action,
					subject: p.subject,
					inverted: p.inverted ?? false,
				})),
			).filter((p) => !isManageAllPermission(p));
		}
	} catch (e) {
		console.error("Failed to load abilities", e);
	}
}

async function handleUserSelection(user: UserModel) {
	userSearchQuery.value = `${user.name} (${user.email})`;
	showUserList.value = false;
	showPermissionMatrix.value = false;
	isEditingOverrides.value = false;

	selectedUserCode.value = user.code;
	selectedUser.value = user;
	isLoadingPermissions.value = true;
	permissionGuardMessage.value = selectedUserEditMessage.value;

	inheritedPermissions.value.clear();
	userOverrides.value.clear();

	try {
		if (user.guid) {
			try {
				const userRes = await http.get(`/user/${user.guid}`);
				const userData = userRes.data?.data || userRes.data;
				selectedUser.value = {
					...selectedUser.value,
					userGroups: userData?.userGroups || userData?.groups || selectedUser.value?.userGroups || [],
					role: userData?.role || selectedUser.value?.role,
				} as UserModel;
				permissionGuardMessage.value = selectedUserEditMessage.value;
			} catch (e) {
				console.warn("Failed to load selected user detail for role guard", e);
			}

			const [inheritedRes, overridesRes] = await Promise.all([
				http.get(`/abilities/users/${user.guid}/inherited`),
				http.get(`/abilities/users/${user.guid}/overrides`),
			]);
			const inheritedList: PermissionModel[] =
				inheritedRes.data?.data || inheritedRes.data || [];
			const overridesList: PermissionModel[] =
				overridesRes.data?.data || overridesRes.data || [];

			const hasInheritedManageAll =
				Array.isArray(inheritedList) && inheritedList.some(isManageAllPermission);
			const hasAllowManageAllOverride =
				Array.isArray(overridesList) &&
				overridesList.some((p) => isManageAllPermission(p) && !p.inverted);

			if (Array.isArray(inheritedList)) {
				if (hasInheritedManageAll || hasAllowManageAllOverride) {
					inheritAllVisiblePermissions();
				} else {
					inheritedList.forEach((p) => {
						if (isManageAllPermission(p)) return;
						const code = getPermissionCode(p);
						inheritedPermissions.value.add(code);
					});
				}
			}

			if (Array.isArray(overridesList)) {
				overridesList.forEach((p) => {
					if (isManageAllPermission(p)) return;
					const code = getPermissionCode(p);
					userOverrides.value.set(code, p.inverted ? "deny" : "allow");
				});
			}
		}
		originalUserOverrides.value = new Map(userOverrides.value);
		showPermissionMatrix.value = true;
	} catch (e) {
		console.error("Failed to load user abilities", e);
	} finally {
		isLoadingPermissions.value = false;
	}
}

function handleClickOutside(e: MouseEvent) {
	if (autocompleteRef.value && !autocompleteRef.value.contains(e.target as Node)) {
		showUserList.value = false;
		if (
			selectedUser.value &&
			userSearchQuery.value !== `${selectedUser.value.name} (${selectedUser.value.email})`
		) {
			userSearchQuery.value = `${selectedUser.value.name} (${selectedUser.value.email})`;
		}
	}
}

function selectAllPermissions(action: "allow" | "deny") {
	if (!isEditingOverrides.value) return;
	if (!canEditSelectedUser.value) {
		permissionGuardMessage.value = selectedUserEditMessage.value;
		return;
	}
	// Reset overrides and set all permissions to the chosen action
	userOverrides.value.clear();
	if (action === "allow" || action === "deny") {
		allPermissions.value.forEach((p) => {
			userOverrides.value.set(p.code, action);
		});
	}
}

onMounted(async () => {
	if (!authStore.currentUser) {
		await authStore.fetchMe();
	}
	await loadUsers();
	await loadAllPermissions();
	document.addEventListener("mousedown", handleClickOutside);

	const targetUserQuery = route.query.user as string;
	if (targetUserQuery && users.value.length > 0) {
		const target = users.value.find(
			(u) =>
				u.guid === targetUserQuery ||
				u.code === targetUserQuery ||
				u.code.toLowerCase() === targetUserQuery.toLowerCase() ||
				u.email.toLowerCase() === targetUserQuery.toLowerCase(),
		);
		if (target) {
			handleUserSelection(target);
		}
	}
});

const filteredGroupedPermissions = computed(() => {
	const result: Record<string, PermissionModel[]> = {};
	if (!allPermissions.value) return result;

	allPermissions.value
		.filter((x) => !x.inverted)
		.forEach((x) => {
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

const currentUserRoleLevel = computed(() => getHighestRoleLevel(currentUserGroups.value));
const selectedUserRoleLevel = computed(() => {
	const groupLevel = getHighestRoleLevel(selectedUser.value?.userGroups || []);
	const directRoleLevel = getHighestRoleLevel([{ code: selectedUser.value?.role }]);
	return Math.max(groupLevel, directRoleLevel);
});

const isSelectedUserSelf = computed(() => {
	const currentUser = authStore.currentUser || authStore.user;
	if (!selectedUser.value || !currentUser) return false;
	return Boolean(
		(selectedUser.value.guid && currentUser.guid === selectedUser.value.guid) ||
		(selectedUser.value.code && currentUser.code === selectedUser.value.code) ||
		(selectedUser.value.email && currentUser.email === selectedUser.value.email),
	);
});

const canEditSelectedUser = computed(() => {
	if (!selectedUser.value) return false;
	if (isSelectedUserSelf.value) return false;
	if (!selectedUserRoleLevel.value) return true;
	return currentUserRoleLevel.value >= selectedUserRoleLevel.value;
});

const selectedUserEditMessage = computed(() => {
	if (!selectedUser.value) return "";
	if (isSelectedUserSelf.value) {
		return "You cannot edit your own permission overrides.";
	}
	if (!canEditSelectedUser.value) {
		return "Your role level cannot edit permissions for a higher-level user.";
	}
	return "";
});

function startEditingOverrides() {
	if (!authStore.can("update", "Permission")) {
		permissionGuardMessage.value = "You do not have permission to edit user overrides.";
		return;
	}
	if (!canEditSelectedUser.value) {
		permissionGuardMessage.value = selectedUserEditMessage.value;
		return;
	}
	originalUserOverrides.value = new Map(userOverrides.value);
	permissionGuardMessage.value = "";
	isEditingOverrides.value = true;
}

function cancelEditingOverrides() {
	userOverrides.value = new Map(originalUserOverrides.value);
	isEditingOverrides.value = false;
	permissionGuardMessage.value = "";
}

function getOverrideValue(code: string): "inherited" | "allow" | "deny" {
	return userOverrides.value.get(code) || "inherited";
}

function setOverrideValue(code: string, value: "inherited" | "allow" | "deny") {
	if (!isEditingOverrides.value) return;
	if (!canEditSelectedUser.value) {
		permissionGuardMessage.value = selectedUserEditMessage.value;
		return;
	}
	if (value === "inherited") userOverrides.value.delete(code);
	else userOverrides.value.set(code, value);
}

function getInheritedStatusText(code: string): string {
	return inheritedPermissions.value.has(code) ? "Group Policy: ALLOWED" : "Group Policy: DENIED";
}

function getRowClass(code: string): string {
	const val = userOverrides.value.get(code);
	if (val === "allow") return "override-box--allow";
	if (val === "deny") return "override-box--deny";
	return "";
}

async function saveOverrides() {
	if (!selectedUser.value?.guid || !isEditingOverrides.value) return;
	if (!canEditSelectedUser.value) {
		permissionGuardMessage.value = selectedUserEditMessage.value;
		return;
	}
	isSaving.value = true;

	try {
		const selectedAbilities: Array<{
			action: string;
			subject: string;
			inverted: boolean;
			modifiedBy?: string;
		}> = [];
		userOverrides.value.forEach((overrideType, code) => {
			const perm = allPermissions.value.find((p) => p.code === code);
			if (perm) {
				selectedAbilities.push({
					action: perm.action,
					subject: perm.subject,
					inverted: overrideType === "deny",
					modifiedBy: selectedUser.value?.code,
				});
			}
		});

		await http.put(`/abilities/users/${selectedUser.value.guid}`, {
			abilities: selectedAbilities,
		});
		originalUserOverrides.value = new Map(userOverrides.value);
		isEditingOverrides.value = false;
		alert(`Authorization overrides for ${selectedUser.value.name} successfully deployed!`);
	} catch (e) {
		console.error("Failed to save user overrides", e);
		alert("Deployment failed: An error occurred.");
	} finally {
		isSaving.value = false;
	}
}
</script>

<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1>User Permission Overrides</h1>
				<p class="maintenance-view__subtitle">
					Directly override inherited group permissions for specific users
				</p>
			</div>
			<div class="maintenance-view__actions">
				<button
					v-if="!isEditingOverrides"
					class="btn btn--primary"
					:disabled="
						!selectedUser ||
						!canEditSelectedUser ||
						!authStore.can('update', 'Permission') ||
						isLoadingPermissions
					"
					:title="selectedUserEditMessage || 'Edit Overrides'"
					@click="startEditingOverrides"
				>
					<i class="mdi mdi-pencil-outline"></i>
					Edit Overrides
				</button>
				<template v-else>
					<button class="btn btn--secondary" :disabled="isSaving" @click="cancelEditingOverrides">
						Cancel
					</button>
					<button
						class="btn btn--primary"
						:disabled="!selectedUser || isSaving"
						@click="saveOverrides"
					>
						<i
							class="mdi"
							:class="isSaving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"
						></i>
						Save Overrides
					</button>
				</template>
			</div>
		</div>

		<div class="overrides-container">
			<div class="panel-card panel-card--selector mb-md">
				<label class="form-group__label mb-xs">Select Target User</label>
				<div class="user-select-wrapper">
					<div class="autocomplete-wrapper" ref="autocompleteRef">
						<input
							type="text"
							class="user-dropdown autocomplete-input"
							v-model="userSearchQuery"
							@focus="showUserList = true"
							placeholder="Type to search system employee..."
						/>
						<div
							v-if="showUserList && filteredAutocompleteUsers.length > 0"
							class="autocomplete-dropdown"
						>
							<div
								v-for="user in filteredAutocompleteUsers"
								:key="user.code"
								class="autocomplete-item"
								@click="handleUserSelection(user)"
							>
								<div class="autocomplete-item__avatar">{{ user.name[0] }}</div>
								<div class="autocomplete-item__info">
									<span class="autocomplete-item__name">{{ user.name }}</span>
									<span class="autocomplete-item__email">{{ user.email }}</span>
								</div>
							</div>
							<div
								v-if="filteredAutocompleteUsers.length === 0"
								class="autocomplete-item autocomplete-item--empty"
							>
								No employees found
							</div>
						</div>
					</div>
					<div class="user-select-wrapper__avatar" v-if="selectedUser">
						{{ selectedUser.name[0] }}
					</div>
				</div>
			</div>

			<div class="matrix-content">
				<div v-if="!selectedUser" class="empty-state border-dashed">
					<i class="mdi mdi-account-shield-outline empty-state__icon"></i>
					<p>No Target User Selected</p>
					<span class="empty-state__sub">
						Please select a user from the dropdown above to view their effective
						group-inherited permissions and configure individual Allow/Deny policy
						overrides.
					</span>
				</div>

				<div v-else-if="isLoadingPermissions" class="empty-state">
					<i class="mdi mdi-loading mdi-spin empty-state__icon u-text-primary"></i>
					<p>Resolving policy matrix for {{ selectedUser.name }}...</p>
				</div>

				<div v-else-if="showPermissionMatrix" class="matrix-grid-area">
					<div
						v-if="selectedUserEditMessage || permissionGuardMessage || !isEditingOverrides"
						class="permission-notice mb-md"
						:class="{ 'permission-notice--warning': selectedUserEditMessage || permissionGuardMessage }"
					>
						<i
							class="mdi"
							:class="
								selectedUserEditMessage || permissionGuardMessage
									? 'mdi-lock-alert-outline'
									: 'mdi-eye-outline'
							"
						></i>
						<span>
							{{
								permissionGuardMessage ||
								selectedUserEditMessage ||
								"Viewing overrides. Click Edit Overrides before making changes."
							}}
						</span>
					</div>

					<div class="filter-panel mb-md" style="display: flex; gap: 10px">
						<Textbox
							v-model="searchQuery"
							placeholder="Search overridden capabilities..."
							style="flex-grow: 1"
						>
							<template #prefix>
								<i
									class="mdi mdi-magnify"
									style="font-size: 18px; margin-right: 4px"
								></i>
							</template>
						</Textbox>
						<button
							class="btn btn--outline"
							:disabled="!isEditingOverrides || !canEditSelectedUser"
							@click="selectAllPermissions('allow')"
						>
							Allow All
						</button>
						<button
							class="btn btn--outline"
							:disabled="!isEditingOverrides || !canEditSelectedUser"
							@click="selectAllPermissions('deny')"
						>
							Deny All
						</button>
					</div>

					<div
						v-for="(perms, subject) in filteredGroupedPermissions"
						:key="subject"
						class="panel-card mb-md"
					>
						<div class="panel-card__header">
							<div class="panel-card__header-title">
								<i class="mdi mdi-folder-account-outline u-text-primary"></i>
								<h2>{{ getPermissionSubjectLabel(String(subject)) }} Permissions</h2>
							</div>
						</div>

						<div class="override-items-grid">
							<div
								v-for="perm in perms"
								:key="perm.code"
								class="override-box"
								:class="[getRowClass(perm.code), { 'override-box--readonly': !isEditingOverrides }]"
							>
								<div class="override-box__info">
									<span class="override-box__action">
										{{ getPermissionLabel(perm.action, perm.subject) }}
									</span>
									<span class="override-box__inherited-text">
										{{ getInheritedStatusText(perm.code) }}
									</span>
								</div>

								<div class="segmented-control">
									<label class="segmented-control__item">
										<input
											type="radio"
											:name="`override_${perm.code}`"
											value="inherited"
											:checked="getOverrideValue(perm.code) === 'inherited'"
											:disabled="!isEditingOverrides || !canEditSelectedUser"
											@change="setOverrideValue(perm.code, 'inherited')"
										/>
										<span class="segmented-control__button">Inherited</span>
									</label>
									<label class="segmented-control__item">
										<input
											type="radio"
											:name="`override_${perm.code}`"
											value="allow"
											:checked="getOverrideValue(perm.code) === 'allow'"
											:disabled="!isEditingOverrides || !canEditSelectedUser"
											@change="setOverrideValue(perm.code, 'allow')"
										/>
										<span
											class="segmented-control__button segmented-control__button--allow"
											>Allow</span
										>
									</label>
									<label class="segmented-control__item">
										<input
											type="radio"
											:name="`override_${perm.code}`"
											value="deny"
											:checked="getOverrideValue(perm.code) === 'deny'"
											:disabled="!isEditingOverrides || !canEditSelectedUser"
											@change="setOverrideValue(perm.code, 'deny')"
										/>
										<span
											class="segmented-control__button segmented-control__button--deny"
											>Deny</span
										>
									</label>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
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
		flex-wrap: wrap;
		gap: var(--spacing-md);
	}
	&__actions {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}
	&__title-area {
		h1 {
			font-size: 24px;
			font-weight: 700;
			margin: 0;
			color: var(--text-main);
		}
		p {
			font-size: 13px;
			color: #64748b;
			margin: 4px 0 0 0;
		}
	}
}

.overrides-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
	width: 100%;
	min-height: 0;
}

.panel-card--selector {
	background-color: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: var(--spacing-md) var(--spacing-lg);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);
	margin-bottom: 0 !important;
}

.matrix-content {
	min-height: 480px;
}

.permission-notice {
	display: flex;
	align-items: center;
	gap: 8px;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 10px;
	color: var(--colors-text-muted);
	font-size: 13px;
	font-weight: 600;
	padding: 10px var(--spacing-md);

	i {
		font-size: 18px;
	}

	&--warning {
		background: rgba(245, 158, 11, 0.08);
		border-color: rgba(245, 158, 11, 0.25);
		color: #b45309;
	}
}

.user-select-wrapper {
	position: relative;
	@include flex-row($align: center);
	width: 100%;
	// padding-top: 8px;

	.autocomplete-wrapper {
		position: relative;
		width: 100%;
		padding-top: 4px;
	}

	.autocomplete-input {
		width: 100%;
		padding: 10px 14px 10px 48px;
		border: 1px solid var(--colors-surface-border);
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		color: var(--colors-text-primary);
		background-color: var(--colors-surface-background);
		outline: none;
		transition: border-color 0.2s;
		&:focus {
			border-color: var(--colors-brand-primary);
		}
	}

	.autocomplete-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--colors-surface-card);
		border: 1px solid var(--colors-surface-border);
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		z-index: 10;
		max-height: 240px;
		overflow-y: auto;
	}

	.autocomplete-item {
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		transition: background-color 0.15s;

		&:hover {
			background-color: var(--colors-surface-hover);
		}

		&__avatar {
			width: 28px;
			height: 28px;
			border-radius: 50%;
			background: var(--colors-brand-primary);
			color: white;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			font-weight: 700;
			flex-shrink: 0;
		}

		&__info {
			display: flex;
			flex-direction: column;
			gap: 2px;
		}
		&__name {
			font-size: 13px;
			font-weight: 600;
			color: var(--colors-text-primary);
		}
		&__email {
			font-size: 11px;
			color: var(--colors-text-muted);
		}

		&--empty {
			cursor: default;
			color: var(--colors-text-muted);
			justify-content: center;
			font-size: 13px;
		}
		&--empty:hover {
			background-color: transparent;
		}
	}

	&__avatar {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		width: 26px;
		height: 26px;
		background-color: var(--colors-brand-primary);
		color: white;
		font-size: 12px;
		font-weight: 700;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		z-index: 2;
	}
}

.override-items-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: var(--spacing-md);
	padding-top: var(--spacing-sm);
	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
}

.override-box {
	border: 1px solid var(--colors-surface-border);
	background-color: var(--colors-surface-background);
	padding: 14px var(--spacing-md);
	border-radius: 12px;
	transition: all 0.2s ease;
	@include flex-row($align: center, $gap: 12px);
	justify-content: space-between;

	&__info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	&__action {
		font-size: 14px;
		font-weight: 700;
		color: var(--colors-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	&__inherited-text {
		font-size: 11px;
		color: var(--colors-text-muted);
		font-family: monospace;
	}

	&:hover {
		border-color: #cbd5e1;
	}

	&--allow {
		border-left: 5px solid #22c55e !important;
		background-color: rgba(34, 197, 94, 0.03) !important;
		border-color: rgba(34, 197, 94, 0.2) !important;
		.override-box__action {
			color: #16a34a;
		}
	}

	&--deny {
		border-left: 5px solid #ef4444 !important;
		background-color: rgba(239, 68, 68, 0.03) !important;
		border-color: rgba(239, 68, 68, 0.2) !important;
		.override-box__action {
			color: #dc2626;
		}
	}

	&--readonly {
		opacity: 0.88;
	}
}

.segmented-control {
	display: inline-flex;
	background: var(--colors-surface-background);
	padding: 3px;
	border-radius: 8px;
	border: 1px solid var(--colors-surface-border);

	&__item {
		cursor: pointer;
		display: block;
		input {
			display: none;
		}
	}

	&__button {
		display: block;
		padding: 5px 10px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 600;
		color: #64748b;
		text-align: center;
		transition: all 0.15s ease;
		color: var(--colors-text-muted);

		&:hover {
			color: var(--colors-text-primary);
		}

		&:checked + .segmented-control__button {
			background-color: var(--colors-surface-card);
			color: var(--colors-text-primary);
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}
	}

	input:checked + &__button {
		background-color: var(--colors-brand-primary);
		color: white;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
	}
	input:checked + &__button--allow {
		background-color: #22c55e !important;
		color: white !important;
		box-shadow: 0 3px 8px rgba(34, 197, 94, 0.25);
	}
	input:checked + &__button--deny {
		background-color: #ef4444 !important;
		color: white !important;
		box-shadow: 0 3px 8px rgba(239, 68, 68, 0.25);
	}
}

.panel-card {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: 24px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);
	.panel-card__header-title {
		@include flex-row($align: center, $gap: 8px);
		i {
			font-size: 18px;
		}
		h2 {
			font-size: 15px;
			font-weight: 700;
			margin: 0;
			color: var(--colors-text-primary);
		}
	}
	.panel-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}
}
.filter-panel {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: var(--spacing-md);
	display: flex;
}

.empty-state {
	height: 100%;
	min-height: 400px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-xl);
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	color: #94a3b8;
	text-align: center;
	&__icon {
		font-size: 4.5rem;
		opacity: 0.15;
		margin-bottom: var(--spacing-xs);
	}
	p {
		font-size: 16px;
		font-weight: 700;
		color: var(--colors-text-primary);
		margin: 0;
	}
	&__sub {
		font-size: 12px;
		color: #94a3b8;
		max-width: 400px;
		margin-top: 6px;
		line-height: 1.5;
	}
	&.border-dashed {
		border-style: dashed;
		background-color: transparent;
	}
}

.mb-xs {
	margin-bottom: var(--spacing-xs);
}
.mb-md {
	margin-bottom: var(--spacing-md);
}
.u-text-primary {
	color: var(--colors-brand-primary) !important;
}
.u-font-mono {
	font-family: monospace;
}
.u-font-weight-bold {
	font-weight: 700;
}
</style>
