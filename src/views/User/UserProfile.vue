<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Badge from "@/components/Badge.vue";
import Textbox from "@/components/Textbox.vue";
import Select, { type SelectOption } from "@/components/Select.vue";
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";
import { useAuthStore } from "@/stores/auth.store";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { useBreadcrumbStore } from "@/stores/breadcrumb.store";
import { userApi } from "@/api/user/user.api";
import { authApi } from "@/api/auth/auth.api";
import { getAvatarUrl } from "@/utils/avatar";

const snackbar = useSnackbarStore();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const breadcrumbStore = useBreadcrumbStore();

const isNewMode = ref(false);
const isEditMode = ref(false);
const loading = ref(false);
const avatarLoading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Password Reset Confirmation State
const showPasswordModal = ref(false);
const passwordLoading = ref(false);

function openPasswordDialog() {
	showPasswordModal.value = true;
}

async function handleConfirmResetPassword() {
	if (!profileData.value.email) {
		snackbar.error("User does not have a valid email address.");
		return;
	}

	passwordLoading.value = true;
	try {
		const { error } = await authApi.forgotPassword({ email: profileData.value.email });

		if (error) {
			snackbar.error((error as any)?.error?.message || "Failed to send password reset link.");
			return;
		}
		snackbar.success(`Password reset link sent to ${profileData.value.email}.`);
		showPasswordModal.value = false;
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to send password reset link.");
	} finally {
		passwordLoading.value = false;
	}
}

// Preview state — independent of isEditMode
const avatarPreviewUrl = ref<string | null>(null);
const avatarPreviewFile = ref<File | null>(null);
const showAvatarPreview = ref(false);

const isOwnProfile = computed(() => {
	if (isNewMode.value || route.query.mode === "new" || route.path.endsWith("/form")) return false;
	if (!route.query.code) return true;
	const currentGuid = authStore.currentUser?.guid || authStore.user?.guid;
	const currentCode = authStore.currentUser?.code || authStore.currentUser?.displayCode || authStore.user?.code || authStore.user?.displayCode;
	const target = route.query.code as string;
	if (currentGuid && target === currentGuid) return true;
	if (currentCode && target === currentCode) return true;
	return false;
});

const isSuperadmin = computed(() => {
	const groups = authStore.currentUser?.userGroups || authStore.user?.userGroups || [];
	return groups.some((group: any) => String(group.code || "").toUpperCase() === "SA");
});

interface ProfileForm {
	code: string;
	name: string;
	email: string;
	role: string;
	roleDisplayName: string;
	isActive: boolean;
	profileImage: string | null;
}

const profileData = ref<ProfileForm>({
	code: "",
	name: "",
	email: "",
	role: "ENG",
	roleDisplayName: "Engineer",
	isActive: true,
	profileImage: null,
});

const initialActiveStatus = ref<boolean>(true);
const initialRoleCode = ref<string>("");
const showSaveConfirmModal = ref(false);
const saveConfirmChanges = ref<string[]>([]);

async function loadProfile() {
	loading.value = true;
	try {
		const userCode = route.query.code;
		const mode = route.query.mode;

		if (mode === "new" || route.path.endsWith("/form")) {
			isNewMode.value = true;
			isEditMode.value = true;
			const defaultRoleCode = assignableRoles.value[0]?.code || "ENG";
			profileData.value = {
				code: "",
				name: "",
				email: "",
				role: defaultRoleCode,
				roleDisplayName: getRoleDisplayName(defaultRoleCode),
				isActive: true,
				profileImage: null,
			};
		} else if (userCode) {
			isNewMode.value = false;
			isEditMode.value = false;
			const { data, error } = await userApi.getUserByGuid(userCode as string);
			const u = (data as any)?.data || data;
			if (u && (u.guid || u.email || u.displayCode || u.profile)) {
				const userProfile = u.profile || {};
				const roleInfo = resolveLoadedRole(u, "ENG");
				profileData.value = {
					code: u.displayCode || u.code || (u.guid ? u.guid.substring(0, 8).toUpperCase() : ""),
					name: u.displayName || userProfile.displayName || u.name || "Employee Profile",
					email: u.email || "",
					role: roleInfo.code,
					roleDisplayName: roleInfo.name,
					isActive: u.isActive ?? true,
					profileImage: u.profileImage || userProfile.profileImage || null,
				};
			} else if (error) {
				console.error("Failed to load user by GUID:", error);
				snackbar.error("Failed to load user details.");
			}
		} else {
			isNewMode.value = false;
			isEditMode.value = false;
			const { data } = await authApi.me();
			if (data) {
				const u = data as any;
				const userProfile = u.profile || {};
				const roleInfo = resolveLoadedRole(u, "ADM");
				profileData.value = {
					code: u.displayCode || u.code || "",
					name: u.displayName || userProfile.displayName || u.name || "My Profile",
					email: u.email || "",
					role: roleInfo.code,
					roleDisplayName: roleInfo.name,
					isActive: u.isActive ?? true,
					profileImage: u.profileImage || userProfile.profileImage || null,
				};
			}
		}
		initialActiveStatus.value = profileData.value.isActive;
		initialRoleCode.value = profileData.value.role;
		updateBreadcrumbs();
	} catch (e) {
		console.error("Failed to load user profile:", e);
	} finally {
		loading.value = false;
	}
}

function normalizeRoleCode(rawRole: string): string {
	if (!rawRole) return roleList.value[0]?.code || "ADM";
	const lower = rawRole.toLowerCase().trim();

	const directMatch = roleList.value.find(r => r.code.toLowerCase() === lower || r.name.toLowerCase() === lower);
	if (directMatch) return directMatch.code;

	if (rawRole === "SA" || lower === "superadmin") {
		return roleList.value.find(r => r.code === "SA" || r.name === "Superadmin")?.code || "SA";
	}
	if (rawRole === "ADM" || lower === "adm" || lower.startsWith("admin")) {
		return roleList.value.find(r => r.code === "ADM" || r.code === "Administrator" || r.name === "Administrator")?.code || "ADM";
	}
	if (rawRole === "MGR" || lower === "mgr" || lower.startsWith("manag")) {
		return roleList.value.find(r => r.code === "MGR" || r.code === "Manager" || r.name.startsWith("Manag"))?.code || "MGR";
	}
	if (rawRole === "ENG" || lower === "eng" || lower.startsWith("engin") || lower.startsWith("tech")) {
		return roleList.value.find(r => r.code === "ENG" || r.code === "Engineer" || r.name.startsWith("Engin"))?.code || "ENG";
	}
	if (lower.startsWith("sale")) {
		return roleList.value.find(r => r.code === "Sales" || r.code === "SAL" || r.name.startsWith("Sale"))?.code || "Sales";
	}

	return rawRole;
}

function resolveLoadedRole(user: any, fallbackRole: string) {
	const group = (user.groups || user.userGroups || [])[0];
	const rawRole = group?.code || user.userGroupCode || user.role || fallbackRole;
	const code = normalizeRoleCode(rawRole);
	const name =
		group?.name ||
		user.userGroupName ||
		user.roleName ||
		roleList.value.find((role) => role.code === code)?.name ||
		getRoleDisplayName(code);

	return { code, name };
}

function getRoleDisplayName(roleCode: string): string {
	if (!roleCode) return "Unassigned";
	const found = roleList.value.find(
		r => r.code === roleCode || r.name === roleCode || r.code.toLowerCase() === roleCode.toLowerCase()
	);
	if (found) return found.name;
	if (roleCode === "SA" || roleCode === "Superadmin") return "Superadmin";
	if (roleCode === "ADM" || roleCode === "Administrator") return "Administrator";
	if (roleCode === "MGR" || roleCode === "Manager") return "Manager";
	if (roleCode === "ENG" || roleCode === "Engineer") return "Engineer";
	if (roleCode === "Sales") return "Sales";
	return roleCode;
}

function handleRoleChange() {
	profileData.value.roleDisplayName = getRoleDisplayName(profileData.value.role);
}

function updateBreadcrumbs() {
	if (isNewMode.value) {
		breadcrumbStore.setItems([
			{ label: "Employee List", to: "/user/list" },
			{ label: "Create New Profile" }
		]);
	} else if (!isOwnProfile.value) {
		const formattedName = profileData.value.name
			? `${profileData.value.name}${profileData.value.code ? ` (${profileData.value.code})` : ""}`
			: "Employee Profile";
		breadcrumbStore.setItems([
			{ label: "Employee List", to: "/user/list" },
			{ label: formattedName }
		]);
	} else {
		breadcrumbStore.setItems([
			{ label: "My Profile" }
		]);
	}
}

import { fetchRoleList, type RoleModel } from "@/utils/role";

const roleList = ref<RoleModel[]>([]);

const assignableRoles = computed(() => {
	return roleList.value.filter(r => r.code !== "SA" && r.name !== "Superadmin");
});

const profileRoleOptions = computed<SelectOption[]>(() => {
	const options: SelectOption[] = assignableRoles.value.map((role) => ({
		value: role.code,
		label: role.name,
	}));

	if (
		profileData.value.role &&
		!options.some((option) => String(option.value) === String(profileData.value.role))
	) {
		options.unshift({
			value: profileData.value.role,
			label: profileData.value.roleDisplayName || getRoleDisplayName(profileData.value.role),
			disabled: true,
		});
	}

	return options;
});

onMounted(async () => {
	roleList.value = await fetchRoleList();
	await loadProfile();
});

watch(
	() => [route.query.code, route.query.mode, route.path],
	async () => {
		await loadProfile();
	}
);

async function handleSaveProfile() {
	if (!profileData.value.name || !profileData.value.email) {
		snackbar.error("Please fill in all required fields.");
		return;
	}

	if (isNewMode.value) {
		await executeSaveProfile();
		return;
	}

	const changes: string[] = [];
	if (profileData.value.isActive !== initialActiveStatus.value) {
		const newStatusStr = profileData.value.isActive ? "Active" : "Inactive";
		const oldStatusStr = initialActiveStatus.value ? "Active" : "Inactive";
		changes.push(`Account Status: ${oldStatusStr} ➔ ${newStatusStr}`);
	}
	if (profileData.value.role !== initialRoleCode.value) {
		const oldRoleName = getRoleDisplayName(initialRoleCode.value);
		const newRoleName = getRoleDisplayName(profileData.value.role);
		changes.push(`Assigned Role: ${oldRoleName} ➔ ${newRoleName}`);
	}

	if (changes.length > 0) {
		saveConfirmChanges.value = changes;
		showSaveConfirmModal.value = true;
	} else {
		await executeSaveProfile();
	}
}

async function executeSaveProfile() {
	showSaveConfirmModal.value = false;
	loading.value = true;
	try {
		if (isNewMode.value) {
			const { error } = await userApi.createUser({
				email: profileData.value.email,
				userGroupCode: profileData.value.role,
				isActive: profileData.value.isActive,
				profile: { displayName: profileData.value.name },
			} as any);
			if (error) {
				snackbar.error((error as any)?.error?.message || "Failed to create user.");
				return;
			}
			snackbar.success("User created and invitation email sent.");
			router.push("/user/list");
		} else {
			const guid = (route.query.code as string) || (authStore.user && authStore.user.guid);
			if (!guid) {
				snackbar.error("Could not determine user ID.");
				return;
			}

			// 1. Update basic profile info (email, displayName)
			const { error } = await userApi.updateUser(guid, {
				email: profileData.value.email,
				profile: { displayName: profileData.value.name },
			} as any);

			if (error) {
				snackbar.error((error as any)?.error?.message || "Failed to update profile.");
				return;
			}

			// 2. Update account status if changed
			if (profileData.value.isActive !== initialActiveStatus.value) {
				if (profileData.value.isActive) {
					const { error: actErr } = await userApi.activateUser(guid);
					if (actErr) {
						snackbar.error((actErr as any)?.error?.message || "Failed to activate user account.");
						return;
					}
				} else {
					const { error: deactErr } = await userApi.deactivateUser(guid);
					if (deactErr) {
						snackbar.error((deactErr as any)?.error?.message || "Failed to deactivate user account.");
						return;
					}
				}
			}

			// 3. Update role/group if changed
			if (profileData.value.role !== initialRoleCode.value) {
				const { error: roleErr } = await userApi.reassignUserGroup(guid, {
					userGroupCode: profileData.value.role,
				} as any);
				if (roleErr) {
					snackbar.error((roleErr as any)?.error?.message || "Failed to update user role.");
					return;
				}
			}

			snackbar.success("Profile updated successfully.");
			isEditMode.value = false;
			await loadProfile();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("An unexpected error occurred.");
	} finally {
		loading.value = false;
	}
}

function goToOverrides() {
	const userCode = (route.query.code as string) || (authStore.currentUser && authStore.currentUser.guid);
	if (userCode) {
		router.push(`/maintenance/user-permission?user=${userCode}`);
	} else {
		router.push("/maintenance/user-permission");
	}
}

// --- Avatar upload: independent flow ---
function triggerAvatarUpload() {
	if (fileInput.value) {
		fileInput.value.value = ""; // reset so same file re-triggers
		fileInput.value.click();
	}
}

function onFileChange(event: Event) {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (!file) return;

	// Validate file type
	const imageExtensions = /\.(jpg|jpeg|png|gif|webp|heic)$/i;
	if (!imageExtensions.test(file.name) && !file.type.startsWith("image/")) {
		snackbar.error("Invalid File Type. Only image files are allowed.");
		target.value = "";
		return;
	}

	// Create local preview URL (FB-style)
	avatarPreviewUrl.value = URL.createObjectURL(file);
	avatarPreviewFile.value = file;
	showAvatarPreview.value = true;
}

function cancelAvatarPreview() {
	showAvatarPreview.value = false;
	avatarPreviewUrl.value = null;
	avatarPreviewFile.value = null;
}

const reinviteLoading = ref(false);

async function handleReinviteUser() {
	const guid = route.query.code as string;
	if (!guid) {
		snackbar.error("Could not determine user ID.");
		return;
	}
	reinviteLoading.value = true;
	try {
		const { error } = await userApi.reinviteUser(guid);
		if (error) {
			snackbar.error((error as any)?.error?.message || "Failed to resend invitation.");
			return;
		}
		snackbar.success(`Invitation email sent to ${profileData.value.email || 'user'}.`);
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to send invitation email.");
	} finally {
		reinviteLoading.value = false;
	}
}

async function confirmAvatarUpload() {
	if (!avatarPreviewFile.value) return;

	const formData = new FormData();
	formData.append("image", avatarPreviewFile.value);

	avatarLoading.value = true;
	try {
		const res = await userApi.updateProfileImage(formData as any) as any;
		if (res?.error) {
			snackbar.error(res.error?.error?.message || "Failed to upload photo.");
			return;
		}

		// Backend returns { message, url, key } — key is the R2 object key
		const savedKey: string = res?.data?.key || res?.data?.url || avatarPreviewUrl.value || "";
		const cleanKey = savedKey.startsWith("/") ? savedKey.slice(1) : savedKey;

		profileData.value.profileImage = cleanKey;

		if (isOwnProfile.value) {
			authStore.updateProfileImage(cleanKey);
			await authStore.fetchMe();
		}

		showAvatarPreview.value = false;
		avatarPreviewFile.value = null;
		snackbar.success("Profile photo updated.");
	} catch (e) {
		console.error("Upload error:", e);
		snackbar.error("Failed to upload photo. Please try again.");
	} finally {
		avatarLoading.value = false;
	}
}
</script>

<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1>
					{{ isNewMode ? "Create New Profile" : isOwnProfile ? "My Profile" : "Employee Profile" }}
				</h1>
			</div>
			<div class="header-actions">
				<button v-if="isEditMode" class="btn btn--primary" @click="handleSaveProfile">
					<i class="mdi mdi-content-save-outline"></i> Save Changes
				</button>
				<button v-else class="btn btn--outlined" @click="isEditMode = true">
					<i class="mdi mdi-pencil-outline"></i> Edit Profile
				</button>
			</div>
		</div>

		<div class="profile-grid">
			<div class="profile-grid__left">
				<!-- Part 1: User Meta Card -->
				<div class="panel-card user-meta-card">
					<div class="user-meta-card__avatar-wrapper">
						<div
							class="user-meta-card__avatar"
							:class="profileData.isActive ? 'user-meta-card__avatar--active' : 'user-meta-card__avatar--inactive'"
						>
							<img v-if="profileData.profileImage" :src="getAvatarUrl(profileData.profileImage)" class="user-meta-card__avatar-img" alt="Avatar" />
							<span v-else>{{ profileData.name ? profileData.name[0].toUpperCase() : "U" }}</span>
						</div>
						<!-- Profile picture edit button — visible only when viewing own profile -->
						<button v-if="isOwnProfile && !isNewMode" class="avatar-edit-btn" @click="triggerAvatarUpload" title="Change Photo">
							<i class="mdi mdi-pencil"></i>
						</button>
						<input type="file" ref="fileInput" accept="image/*" style="display: none" @change="onFileChange" />
					</div>
					<h2 class="user-meta-card__name">{{ profileData.name || "New Employee" }}</h2>
					<span class="user-meta-card__email">{{ profileData.email || "no-email@gstech.com" }}</span>

					<div class="user-meta-card__badges mt-sm">
						<Badge type="info" icon="mdi-shield-account">
							{{ profileData.roleDisplayName || getRoleDisplayName(profileData.role) }}
						</Badge>
						<Badge :type="profileData.isActive ? 'success' : 'error'">
							{{ profileData.isActive ? "Active" : "Inactive" }}
						</Badge>
					</div>
				</div>

				<!-- Part 2: Security Policy Card (Only for existing user accounts) -->
				<div v-if="!isNewMode" class="panel-card security-card mt-lg">
					<div class="security-card__header mb-md">
						<div class="security-card__icon-badge">
							<i class="mdi mdi-shield-lock-outline"></i>
						</div>
						<div>
							<h2 class="security-card__title">Security & Credentials</h2>
							<p class="security-card__subtitle">Manage password and security settings</p>
						</div>
					</div>
					<div class="quick-nav-box">
						<div v-if="!isOwnProfile" class="security-action-item">
							<p class="security-card__desc">
								As an Administrator, you can reset this user's password directly or resend account activation link.
							</p>
							<button class="btn btn--outlined security-card__btn mb-sm" @click="openPasswordDialog">
								<i class="mdi mdi-lock-reset"></i> Reset User Password
							</button>
							<button class="btn btn--outlined security-card__btn" @click="handleReinviteUser" :disabled="reinviteLoading">
								<i v-if="reinviteLoading" class="mdi mdi-loading mdi-spin"></i>
								<i v-else class="mdi mdi-email-send-outline"></i>
								{{ reinviteLoading ? "Sending..." : "Resend Invitation Link" }}
							</button>
						</div>
						<div v-else class="security-action-item">
							<p class="security-card__desc">
								To update your own password and security credentials, please visit Settings.
							</p>
							<button class="btn btn--outlined security-card__btn" @click="router.push('/settings')">
								<i class="mdi mdi-cog-outline"></i> Go to Settings
							</button>
						</div>

						<div v-if="!isOwnProfile" class="security-card__override-box">
							<p class="security-card__desc">
								Need custom overrides? You can adjust independent security matrix rules for this user.
							</p>
							<button class="btn btn--outlined security-card__btn" @click="goToOverrides">
								<i class="mdi mdi-shield-key-outline"></i> Edit Individual Overrides
							</button>
						</div>
					</div>
				</div>
			</div>

			<div class="profile-grid__right">
				<!-- Part 3: Account Configuration Card -->
				<div class="panel-card">
					<h2 class="panel-card__title mb-lg">Account Configuration</h2>

					<div class="form-grid">
						<div class="form-group">
							<label class="form-group__label">Employee Code</label>
							<Textbox :model-value="profileData.code || '(Auto-generated by system)'" disabled placeholder="(Auto-generated by system)" />
						</div>

						<div class="form-group">
							<label class="form-group__label">Full Name <span class="u-required">*</span></label>
							<Textbox v-model="profileData.name" :disabled="!isEditMode" placeholder="Enter first and last name" />
						</div>

						<div class="form-group">
							<label class="form-group__label">Email Address <span class="u-required">*</span></label>
							<Textbox v-model="profileData.email" type="email" :disabled="!isEditMode || (!isNewMode && !isSuperadmin)" placeholder="username@gstech.com" />
						</div>

						<div class="form-group">
							<label class="form-group__label">Role</label>
							<Select
								v-model="profileData.role"
								:options="profileRoleOptions"
								:disabled="!isEditMode || (isOwnProfile && !isNewMode)"
								@change="handleRoleChange"
							/>
						</div>

						<!-- Account Status Card -->
						<div class="form-group form-group--checkbox-row">
							<div class="toggle-card" :class="{ 'is-active': profileData.isActive }">
								<div class="toggle-card__info">
									<span class="toggle-card__title">Account Status</span>
									<span class="toggle-card__desc">
										{{ profileData.isActive ? 'Account is active and permitted to authenticate.' : 'Account is suspended and access is blocked.' }}
									</span>
								</div>
								<label class="switch-toggle" :class="{ 'is-disabled': !isEditMode || isOwnProfile }">
									<input type="checkbox" v-model="profileData.isActive" :disabled="!isEditMode || isOwnProfile" />
									<span class="switch-toggle__slider"></span>
								</label>
							</div>
						</div>


					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Avatar Preview Overlay (FB-style) -->
	<Teleport to="body">
		<div v-if="showAvatarPreview" class="avatar-preview-overlay" @click.self="cancelAvatarPreview">
			<div class="avatar-preview-modal">
				<div class="avatar-preview-modal__header">
					<span>Preview Photo</span>
					<button class="avatar-preview-modal__close" @click="cancelAvatarPreview">
						<i class="mdi mdi-close"></i>
					</button>
				</div>
				<div class="avatar-preview-modal__body">
					<div class="avatar-preview-modal__preview-circle">
						<img v-if="avatarPreviewUrl" :src="avatarPreviewUrl" alt="Preview" />
					</div>
					<p class="avatar-preview-modal__hint">This is how your photo will appear.</p>
				</div>
				<div class="avatar-preview-modal__footer">
					<button class="btn btn--outlined" @click="cancelAvatarPreview" :disabled="avatarLoading">
						Cancel
					</button>
					<button class="btn btn--primary" @click="confirmAvatarUpload" :disabled="avatarLoading">
						<i v-if="avatarLoading" class="mdi mdi-loading mdi-spin"></i>
						<i v-else class="mdi mdi-check"></i>
						{{ avatarLoading ? "Uploading..." : "Save as Photo" }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>

	<!-- Password Reset Confirmation Dialog -->
	<Dialog v-model="showPasswordModal" title="Reset User Password" maxWidth="440px">
		<div style="padding: 8px 0;">
			<p style="margin: 0 0 12px 0; color: var(--colors-text-primary); font-size: 14px; line-height: 1.5;">
				Are you sure you want to send a password reset link to <strong>{{ profileData.email || 'this user' }}</strong>?
			</p>
			<p style="margin: 0; color: var(--colors-text-muted); font-size: 13px; line-height: 1.4;">
				An email containing instructions to reset the password will be sent to the user's email address.
			</p>
		</div>
		<template #footer>
			<Button variant="outlined" @click="showPasswordModal = false" :disabled="passwordLoading">Cancel</Button>
			<Button variant="primary" @click="handleConfirmResetPassword" :loading="passwordLoading">
				<i v-if="!passwordLoading" class="mdi mdi-email-send-outline"></i> Send Reset Link
			</Button>
		</template>
	</Dialog>

	<!-- Save Changes Confirmation Dialog -->
	<Dialog v-model="showSaveConfirmModal" title="Confirm Account Updates" maxWidth="460px">
		<p style="margin: 0 0 12px 0; color: var(--colors-text-primary); font-size: 14px;">
			Are you sure you want to apply the following updates to this account?
		</p>
		<div style="background: var(--colors-surface-background); border: 1px solid var(--colors-surface-border); border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;">
			<ul style="margin: 0; padding-left: 18px; color: var(--colors-text-primary); font-size: 13px;">
				<li v-for="(change, idx) in saveConfirmChanges" :key="idx" style="margin-bottom: 4px;">
					{{ change }}
				</li>
			</ul>
		</div>
		<template #footer>
			<Button variant="outlined" @click="showSaveConfirmModal = false" :disabled="loading">Cancel</Button>
			<Button variant="primary" @click="executeSaveProfile" :loading="loading">
				<i v-if="!loading" class="mdi mdi-check"></i> Confirm & Save
			</Button>
		</template>
	</Dialog>
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
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		border-bottom: 1px solid var(--colors-surface-border);
		padding-bottom: var(--spacing-md);
		margin-bottom: var(--spacing-sm);

		@media (max-width: 540px) {
			flex-direction: column;
			align-items: stretch;
			gap: var(--spacing-sm);

			.header-actions {
				width: 100%;
				.btn {
					width: 100% !important;
				}
			}
		}
	}
	&__title-area {
		h1 {
			font-size: 24px;
			font-weight: 700;
			margin: 0;
			color: var(--colors-text-primary);
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
	margin-bottom: 6px;
	@include flex-row($align: center, $gap: 4px);
	&:hover {
		text-decoration: underline;
	}
}

.profile-grid {
	display: grid;
	grid-template-columns: 4fr 8fr;
	gap: var(--spacing-lg);
	align-items: start;
	@media (max-width: 768px) {
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
	background: var(--colors-surface-card);

	&__avatar-wrapper {
		position: relative;
		margin-bottom: 16px;
	}
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
		overflow: hidden;
		border: 3px solid transparent;
		transition: border-color 0.25s ease, box-shadow 0.25s ease;

		&--active {
			border-color: #10B981 !important;
			box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15), 0 6px 18px rgba(16, 185, 129, 0.1) !important;
		}

		&--inactive {
			border-color: #F43F5E !important;
			box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.15), 0 6px 18px rgba(244, 63, 94, 0.1) !important;
		}
	}
	&__avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	&__name {
		font-size: 20px;
		font-weight: 700;
		color: var(--colors-text-primary);
		margin: 0 0 4px 0;
	}
	&__email {
		font-size: 13px;
		color: var(--colors-text-secondary);
		font-family: monospace;
	}
	&__badges {
		@include flex-row($align: center, $gap: 6px);
	}
}

.avatar-edit-btn {
	position: absolute;
	bottom: 2px;
	right: -2px;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background-color: var(--colors-surface-card);
	color: var(--colors-text-secondary);
	border: 1.5px solid var(--colors-text-muted);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
	font-size: 12px;
	padding: 0;
	line-height: 1;

	&:hover {
		background-color: var(--colors-brand-primary);
		color: #fff;
		border-color: var(--colors-brand-primary);
		transform: scale(1.1);
	}
}

.quick-nav-box {
	text-align: left;
	width: 100%;
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
		&:disabled {
			background: var(--colors-background-alt);
			color: var(--colors-text-muted);
			cursor: not-allowed;
		}
	}
}

.toggle-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	background: var(--colors-surface-background);
	transition: border-color 0.2s, background-color 0.2s;

	&.is-active {
		border-color: var(--colors-brand-primarySoft);
		background-color: rgba(80, 88, 242, 0.04);
	}

	&__info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-right: 12px;
	}

	&__title {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}

	&__desc {
		font-size: 11px;
		color: var(--colors-text-muted);
		line-height: 1.4;
	}
}

.switch-toggle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	flex-shrink: 0;
	&.is-disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
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
}

// Avatar preview overlay — FB-style
.avatar-preview-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.65);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
	backdrop-filter: blur(4px);
	animation: overlay-in 0.15s ease;
}

@keyframes overlay-in {
	from { opacity: 0; }
	to { opacity: 1; }
}

.avatar-preview-modal {
	background: var(--colors-surface-card);
	border-radius: 16px;
	width: 380px;
	max-width: calc(100vw - 32px);
	overflow: hidden;
	box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
	animation: modal-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--colors-surface-border);
		font-size: 16px;
		font-weight: 700;
		color: var(--colors-text-primary);
	}

	&__close {
		background: transparent;
		border: none;
		cursor: pointer;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--colors-text-muted);
		font-size: 18px;
		transition: background-color 0.15s;
		&:hover {
			background-color: var(--colors-surface-background);
		}
	}

	&__body {
		padding: 28px 20px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	&__preview-circle {
		width: 160px;
		height: 160px;
		border-radius: 50%;
		overflow: hidden;
		border: 4px solid var(--colors-brand-primarySoft, rgba(80, 88, 242, 0.2));
		box-shadow: 0 8px 24px rgba(80, 88, 242, 0.15);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
	}

	&__hint {
		font-size: 12px;
		color: var(--colors-text-muted);
		margin: 0;
	}

	&__footer {
		display: flex;
		gap: 10px;
		padding: 16px 20px;
		border-top: 1px solid var(--colors-surface-border);
		justify-content: flex-end;
	}
}

@keyframes modal-in {
	from { opacity: 0; transform: scale(0.9); }
	to { opacity: 1; transform: scale(1); }
}

.mt-xs {
	margin-top: var(--spacing-xs);
}
.mt-sm {
	margin-top: var(--spacing-sm);
}
.mt-lg {
	margin-top: var(--spacing-lg);
}
.mb-md {
	margin-bottom: var(--spacing-md);
}
.mb-lg {
	margin-bottom: var(--spacing-lg);
}
.security-card {
	background: var(--colors-surface-card);
	padding: 24px !important;
	box-sizing: border-box;

	&__header {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	&__icon-badge {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: rgba(80, 88, 242, 0.1);
		color: var(--colors-brand-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		flex-shrink: 0;
	}

	&__title {
		font-size: 15px;
		font-weight: 700;
		color: var(--colors-text-primary);
		margin: 0;
	}

	&__subtitle {
		font-size: 12px;
		color: var(--colors-text-muted);
		margin: 2px 0 0 0;
	}

	&__desc {
		font-size: 12px;
		color: var(--colors-text-secondary);
		line-height: 1.5;
		margin-bottom: 12px;
	}

	&__btn {
		width: 100% !important;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
		gap: 8px !important;
		padding: 10px 16px !important;
		box-sizing: border-box !important;
	}

	&__override-box {
		border-top: 1px solid var(--colors-surface-border);
		margin-top: 20px !important;
		padding-top: 20px !important;
	}
}

.security-action-item {
	display: flex;
	flex-direction: column;
	width: 100%;
	gap: 12px;
}

.u-required {
	color: #ef4444;
}
</style>
