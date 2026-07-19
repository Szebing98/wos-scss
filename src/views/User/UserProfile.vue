<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Badge from "@/components/Badge.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import { useAuthStore } from "@/stores/auth.store";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { userApi } from "@/api/user/user.api";
import { authApi } from "@/api/auth/auth.api";
import { getAvatarUrl } from "@/utils/avatar";

const snackbar = useSnackbarStore();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isNewMode = ref(false);
const isEditMode = ref(false);
const loading = ref(false);
const avatarLoading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Preview state — independent of isEditMode
const avatarPreviewUrl = ref<string | null>(null);
const avatarPreviewFile = ref<File | null>(null);
const showAvatarPreview = ref(false);

const isOwnProfile = computed(() => !route.query.code && route.query.mode !== "new");

interface ProfileForm {
	code: string;
	name: string;
	email: string;
	role: string;
	isActive: boolean;
	profileImage: string | null;
}

const profileData = ref<ProfileForm>({
	code: "",
	name: "",
	email: "",
	role: "Engineer",
	isActive: true,
	profileImage: null,
});

async function loadProfile() {
	loading.value = true;
	try {
		const userCode = route.query.code;
		const mode = route.query.mode;

		if (mode === "new") {
			isNewMode.value = true;
			isEditMode.value = true;
			profileData.value = {
				code: "",
				name: "",
				email: "",
				role: "Engineer",
				isActive: true,
				profileImage: null,
			};
		} else if (userCode) {
			isNewMode.value = false;
			isEditMode.value = false;
			const { data } = await userApi.getUserByGuid(userCode as string);
			if (data && data.data) {
				const u = data.data as any;
				const roleName = u.groups && u.groups[0] ? u.groups[0].name : "Engineer";
				profileData.value = {
					code: u.displayCode || u.guid.substring(0, 8).toUpperCase(),
					name: u.displayName || u.profile?.displayName || "",
					email: u.email || "",
					role: roleName,
					isActive: u.isActive ?? true,
					profileImage: u.profile?.profileImage || null,
				};
			}
		} else {
			isNewMode.value = false;
			isEditMode.value = false;
			const { data } = await authApi.me();
			if (data) {
				const u = data as any;
				const roleName = u.userGroups && u.userGroups[0] ? u.userGroups[0].name : "Administrator";
				profileData.value = {
					code: u.displayCode || "",
					name: u.displayName || "",
					email: u.email || "",
					role: roleName,
					isActive: u.isActive ?? true,
					profileImage: u.profileImage || u.profile?.profileImage || null,
				};
			}
		}
	} catch (e) {
		console.error("Failed to load user profile:", e);
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	await loadProfile();
});

async function handleSaveProfile() {
	if (!profileData.value.name || !profileData.value.email) {
		snackbar.error("Please fill in all required fields.");
		return;
	}
	loading.value = true;
	try {
		if (isNewMode.value) {
			// Backend expects: email, userGroupCode, isActive, profile.displayName
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
			router.back();
		} else {
			const guid = (route.query.code as string) || (authStore.user && authStore.user.guid);
			if (!guid) {
				snackbar.error("Could not determine user ID.");
				return;
			}
			// Backend strict schema only accepts: email?, profile.displayName?
			const { error } = await userApi.updateUser(guid, {
				email: profileData.value.email,
				profile: { displayName: profileData.value.name },
			} as any);
			if (error) {
				snackbar.error((error as any)?.error?.message || "Failed to update profile.");
				return;
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
	router.push("/maintenance/user-permission");
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

		// Backend returns { message, url } — url is the full CDN/R2 URL
		const savedUrl: string = res?.data?.url || avatarPreviewUrl.value || "";

		profileData.value.profileImage = savedUrl;

		if (isOwnProfile.value) {
			authStore.updateProfileImage(savedUrl);
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
				<button class="btn btn--text back-link-btn" v-if="!isOwnProfile" @click="router.back()">
					<i class="mdi mdi-arrow-left"></i> Back to Directory
				</button>
				<h1 class="mt-xs">
					{{ isNewMode ? "Create New Profile" : isOwnProfile ? "My Profile" : "Profile" }}
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
						<div class="user-meta-card__avatar">
							<img v-if="profileData.profileImage" :src="getAvatarUrl(profileData.profileImage)" class="user-meta-card__avatar-img" alt="Avatar" />
							<span v-else>{{ profileData.name ? profileData.name[0].toUpperCase() : "U" }}</span>
						</div>
						<!-- Always-visible small edit button — independent of Edit Profile mode -->
						<button class="avatar-edit-btn" @click="triggerAvatarUpload" title="Change Photo">
							<i class="mdi mdi-pencil"></i>
						</button>
						<input type="file" ref="fileInput" accept="image/*" style="display: none" @change="onFileChange" />
					</div>
					<h2 class="user-meta-card__name">{{ profileData.name || "New Employee" }}</h2>
					<span class="user-meta-card__email">{{ profileData.email || "no-email@gstech.com" }}</span>

					<div class="user-meta-card__badges mt-sm">
						<Badge type="info" icon="mdi-shield-account">{{ profileData.role }}</Badge>
						<Badge :type="profileData.isActive ? 'success' : 'error'">
							{{ profileData.isActive ? "Active" : "Inactive" }}
						</Badge>
					</div>
				</div>

				<!-- Part 2: Security Policy Card (only when viewing other users) -->
				<div class="panel-card mt-lg" v-if="!isOwnProfile">
					<h2 class="panel-card__title mb-md" style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--colors-text-muted)">
						<i class="mdi mdi-shield-account-outline"></i> Security Policy
					</h2>
					<div class="quick-nav-box">
						<p style="font-size: 12px; color: var(--colors-text-secondary); line-height: 1.5; margin-bottom: 16px;">
							Need custom overrides? You can adjust independent security matrix rules for this user.
						</p>
						<button class="btn btn--outlined w-full" @click="goToOverrides">
							<i class="mdi mdi-shield-key-outline"></i> Edit Individual Overrides
						</button>
					</div>
				</div>
			</div>

			<div class="profile-grid__right">
				<!-- Part 3: Account Configuration Card -->
				<div class="panel-card">
					<h2 class="panel-card__title mb-lg">Account Configuration</h2>

					<div class="form-grid">
						<div class="form-group">
							<label class="form-group__label">Internal Employee Code <span class="u-required">*</span></label>
							<Textbox v-model="profileData.code" :disabled="!isNewMode" placeholder="e.g. USR-099" />
						</div>

						<div class="form-group">
							<label class="form-group__label">Full Name <span class="u-required">*</span></label>
							<Textbox v-model="profileData.name" :disabled="!isEditMode" placeholder="Enter first and last name" />
						</div>

						<div class="form-group">
							<label class="form-group__label">Corporate Email Address <span class="u-required">*</span></label>
							<Textbox v-model="profileData.email" type="email" :disabled="!isEditMode" placeholder="username@gstech.com" />
						</div>

						<div class="form-group">
							<label class="form-group__label">Assigned Authorization Role</label>
							<Select v-model="profileData.role" :disabled="!isEditMode || isOwnProfile">
								<option value="Superadmin">Superadmin (Root)</option>
								<option value="Administrator">Administrator</option>
								<option value="Manager">Manager / Scheduler</option>
								<option value="Engineer">Field Engineer / Tech</option>
							</Select>
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
	border: 1.5px solid var(--colors-surface-border);
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
.w-full {
	width: 100% !important;
}
.u-required {
	color: #ef4444;
}
</style>
