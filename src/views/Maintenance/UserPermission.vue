<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1>User Permission Overrides</h1>
				<p class="maintenance-view__subtitle">
					Directly override inherited group permissions for specific users
				</p>
			</div>
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

				<div v-else class="matrix-grid-area">
					<div class="filter-panel mb-md">
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
					</div>

					<div
						v-for="(perms, subject) in filteredGroupedPermissions"
						:key="subject"
						class="panel-card mb-md"
					>
						<div class="panel-card__header">
							<div class="panel-card__header-title">
								<i class="mdi mdi-folder-account-outline u-text-primary"></i>
								<h2>{{ subject }} Permissions</h2>
							</div>
						</div>

						<div class="override-items-grid">
							<div
								v-for="perm in perms"
								:key="perm.code"
								class="override-box"
								:class="getRowClass(perm.code)"
							>
								<div class="override-box__info">
									<span class="override-box__action">{{ perm.action }}</span>
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

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Textbox from "@/components/Textbox.vue";

interface UserModel {
	code: string;
	name: string;
	email: string;
}

interface PermissionModel {
	code: string;
	action: string;
	subject: string;
	inverted: boolean;
}

const searchQuery = ref("");
const isLoadingPermissions = ref(false);
const isSaving = ref(false);

const selectedUserCode = ref("");
const selectedUser = ref<UserModel | null>(null);

const userSearchQuery = ref("");
const showUserList = ref(false);
const autocompleteRef = ref<HTMLElement | null>(null);

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

// 利用 Set 和 Map，完美复刻 C# HashSet 和 Dictionary 的极速检索
const inheritedPermissions = ref<Set<string>>(new Set());
const userOverrides = ref<Map<string, "allow" | "deny">>(new Map());

// 1. 加载用户列表
async function loadUsers() {
	try {
		const response = await fetch("api/users");
		if (response.ok) users.value = await response.json();
		else throw new Error();
	} catch {
		users.value = [
			{ code: "USR-001", name: "Alice Johnson", email: "alice@wos.com" },
			{ code: "USR-002", name: "Bob Smith", email: "bob@wos.com" },
			{ code: "USR-003", name: "Charlie Davis", email: "charlie@wos.com" },
		];
	}
}

// 2. 加载全量原子权限定义
async function loadAllPermissions() {
	try {
		const response = await fetch("api/permissions");
		if (response.ok) allPermissions.value = await response.json();
		else throw new Error();
	} catch {
		allPermissions.value = [
			{ code: "user_read", subject: "User", action: "read", inverted: false },
			{ code: "user_create", subject: "User", action: "create", inverted: false },
			{ code: "user_update", subject: "User", action: "update", inverted: false },
			{ code: "wo_read", subject: "WorkOrder", action: "read", inverted: false },
			{ code: "wo_create", subject: "WorkOrder", action: "create", inverted: false },
			{ code: "wo_update", subject: "WorkOrder", action: "update", inverted: false },
			{ code: "wo_delete", subject: "WorkOrder", action: "delete", inverted: false },
		];
	}
}

async function handleUserSelection(user: UserModel) {
	userSearchQuery.value = `${user.name} (${user.email})`;
	showUserList.value = false;

	selectedUserCode.value = user.code;
	selectedUser.value = user;
	isLoadingPermissions.value = true;

	inheritedPermissions.value.clear();
	userOverrides.value.clear();

	try {
		const effectiveRes = await fetch(`api/permissions/users/${user.code}`);
		const overridesRes = await fetch(`api/permissions/users/${user.code}/overrides`);

		if (overridesRes.ok) {
			const directOverrides: PermissionModel[] = await overridesRes.json();
			directOverrides.forEach((o) => {
				if (o.inverted) {
					const normalCode = o.code.replace("block_", "").replace("_deny", "");
					userOverrides.value.set(normalCode, "deny");
				} else {
					userOverrides.value.set(o.code, "allow");
				}
			});
		}

		if (effectiveRes.ok) {
			const effectivePerms: PermissionModel[] = await effectiveRes.json();
			effectivePerms.forEach((p) => {
				if (!userOverrides.value.has(p.code)) {
					inheritedPermissions.value.add(p.code);
				}
			});
		}
	} catch {
		console.warn("Using decoupled reactive matrix baseline.");
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

onMounted(() => {
	loadUsers();
	loadAllPermissions();
	document.addEventListener("mousedown", handleClickOutside);
});

// 4. 清理反向规则，只输出标准的 UI 行
const filteredGroupedPermissions = computed(() => {
	const result: Record<string, PermissionModel[]> = {};
	if (!allPermissions.value) return result;

	allPermissions.value
		.filter((x) => !x.inverted) // 只显现正向操作项
		.forEach((x) => {
			const query = searchQuery.value.toLowerCase();
			const matches =
				!searchQuery.value ||
				x.subject.toLowerCase().includes(query) ||
				x.action.toLowerCase().includes(query) ||
				x.code.toLowerCase().includes(query);

			if (matches) {
				if (!result[x.subject]) result[x.subject] = [];
				result[x.subject].push(x);
			}
		});
	return result;
});

function getOverrideValue(code: string): "inherited" | "allow" | "deny" {
	return userOverrides.value.get(code) || "inherited";
}

function setOverrideValue(code: string, value: "inherited" | "allow" | "deny") {
	if (value === "inherited") userOverrides.value.delete(code);
	else userOverrides.value.set(code, value);
}

function getInheritedStatusText(code: string): string {
	return inheritedPermissions.value.has(code) ? "Group Policy: ALLOWED" : "Group Policy: DENIED";
}

// 动态追加高亮边缘线
function getRowClass(code: string): string {
	const val = userOverrides.value.get(code);
	if (val === "allow") return "override-box--allow";
	if (val === "deny") return "override-box--deny";
	return "";
}

// 5. 反向压缩 Payload 并同步至 Bun API
async function saveOverrides() {
	if (!selectedUser.value) return;
	isSaving.value = true;

	try {
		const syncCodes: string[] = [];

		userOverrides.value.forEach((overrideType, normalCode) => {
			if (overrideType === "allow") {
				syncCodes.push(normalCode);
			} else if (overrideType === "deny") {
				const normalPerm = allPermissions.value.find((x) => x.code === normalCode);
				if (normalPerm) {
					const invertedPerm = allPermissions.value.find(
						(x) =>
							x.subject === normalPerm.subject &&
							x.action === normalPerm.action &&
							x.inverted,
					);
					syncCodes.push(invertedPerm ? invertedPerm.code : `block_${normalCode}`);
				}
			}
		});

		const payload = { permission_codes: syncCodes };
		const response = await fetch(`api/permissions/users/${selectedUser.value.code}/sync`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (response.ok) {
			alert(`Authorization overrides for ${selectedUser.value.name} successfully deployed!`);
		} else {
			const err = await response.text();
			alert(`Deployment failed: ${err}`);
		}
	} catch (ex: any) {
		alert(`Operation encountered an error: ${ex.message}`);
	} finally {
		isSaving.value = false;
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
	width: 100%;
}

.panel-card--selector {
	background-color: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: var(--spacing-md) var(--spacing-lg);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);
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
