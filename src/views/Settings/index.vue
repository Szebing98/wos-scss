<script setup lang="ts">
import { ref } from "vue";
import { useThemeStore } from "@/stores/theme.store";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { useDateFormatStore, type SystemDateFormat } from "@/stores/dateFormat.store";
import { authApi } from "@/api/auth/auth.api";
import Card from "@/components/Card.vue";
import Button from "@/components/Button.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import Dialog from "@/components/Dialog.vue";

const themeStore = useThemeStore();
const snackbar = useSnackbarStore();
const dateFormatStore = useDateFormatStore();

// Password Change State
const showPasswordModal = ref(false);
const passwordLoading = ref(false);
const passwordForm = ref({
	currentPassword: "",
	newPassword: "",
	newPasswordConfirm: "",
});

function openPasswordModal() {
	passwordForm.value = {
		currentPassword: "",
		newPassword: "",
		newPasswordConfirm: "",
	};
	showPasswordModal.value = true;
}

async function handleUpdatePassword() {
	const { currentPassword, newPassword, newPasswordConfirm } = passwordForm.value;

	if (!currentPassword || !newPassword || !newPasswordConfirm) {
		snackbar.error("Please fill in all password fields.");
		return;
	}
	if (newPassword !== newPasswordConfirm) {
		snackbar.error("Passwords do not match.");
		return;
	}
	if (
		newPassword.length < 8 ||
		!/[A-Z]/.test(newPassword) ||
		!/[a-z]/.test(newPassword) ||
		!/[0-9]/.test(newPassword) ||
		!/[!@#$%^&*]/.test(newPassword)
	) {
		snackbar.error(
			"Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
		);
		return;
	}

	passwordLoading.value = true;
	try {
		const { error } = await authApi.changePassword({
			currentPassword,
			newPassword,
			newPasswordConfirm,
		});

		if (error) {
			snackbar.error((error as any)?.error?.message || "Failed to update password.");
			return;
		}
		snackbar.success("Password updated successfully.");
		showPasswordModal.value = false;
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to update password.");
	} finally {
		passwordLoading.value = false;
	}
}

function handleDateFormatChange(val: string) {
	dateFormatStore.setDateFormat(val as SystemDateFormat);
	snackbar.success(`System Date Format set to ${val}`);
}
</script>

<template>
	<div class="settings-page page">
		<div class="settings-page__header">
			<h1>Settings</h1>
			<p class="u-text-muted">Manage your application preferences, date formats, and security</p>
		</div>

		<div class="settings-grid">
			<!-- Theme Preference -->
			<Card bordered>
				<template #header>
					<h2 style="font-size: 18px; margin: 0; display: flex; align-items: center; gap: 8px;">
						<i class="mdi mdi-palette-outline" style="color: var(--colors-brand-primary);"></i>
						Appearance & Theme
					</h2>
				</template>
				<div class="setting-item">
					<div>
						<h3 style="margin: 0 0 4px 0; font-size: 16px;">Theme Mode</h3>
						<p class="u-text-muted" style="margin: 0; font-size: 14px;">Toggle between Light and Dark mode</p>
					</div>
					<Button variant="outlined" @click="themeStore.toggleTheme()" style="display: flex; align-items: center; gap: 8px;">
						<i class="mdi" :class="themeStore.dark ? 'mdi-brightness-4' : 'mdi-brightness-7'" style="font-size: 18px;"></i>
						{{ themeStore.dark ? 'Dark Mode' : 'Light Mode' }}
					</Button>
				</div>
			</Card>

			<!-- System Date Format Preference -->
			<Card bordered>
				<template #header>
					<h2 style="font-size: 18px; margin: 0; display: flex; align-items: center; gap: 8px;">
						<i class="mdi mdi-calendar-clock-outline" style="color: var(--colors-brand-primary);"></i>
						System Date Display Format
					</h2>
				</template>
				<div class="setting-item" style="flex-wrap: wrap; gap: 16px;">
					<div>
						<h3 style="margin: 0 0 4px 0; font-size: 16px;">Global Date Separator & Style</h3>
						<p class="u-text-muted" style="margin: 0; font-size: 14px;">
							Choose your preferred system date style (dots, dashes, slashes, or word text)
						</p>
						<div class="live-date-preview" style="margin-top: 8px;">
							<span style="font-size: 12px; font-weight: 600; color: var(--colors-text-muted);">LIVE PREVIEW: </span>
							<strong style="font-size: 15px; color: var(--colors-brand-primary); font-family: monospace;">
								{{ dateFormatStore.formatDate(new Date()) }}
							</strong>
						</div>
					</div>

					<div style="min-width: 220px;">
						<Select :model-value="dateFormatStore.currentFormat" @update:model-value="handleDateFormatChange">
							<option value="YYYY-MM-DD">YYYY-MM-DD (Dashed: 2026-07-26)</option>
							<option value="YYYY.MM.DD">YYYY.MM.DD (Dotted: 2026.07.26)</option>
							<option value="DD.MM.YYYY">DD.MM.YYYY (Dotted: 26.07.2026)</option>
							<option value="DD/MM/YYYY">DD/MM/YYYY (Slash: 26/07/2026)</option>
							<option value="DD-MM-YYYY">DD-MM-YYYY (Dashed: 26-07-2026)</option>
							<option value="YYYY/MM/DD">YYYY/MM/DD (Slash: 2026/07/26)</option>
							<option value="DD MMM YYYY">DD MMM YYYY (Word Text: 26 Jul 2026)</option>
						</Select>
					</div>
				</div>
			</Card>

			<!-- Security Settings -->
			<Card bordered>
				<template #header>
					<h2 style="font-size: 18px; margin: 0; display: flex; align-items: center; gap: 8px;">
						<i class="mdi mdi-shield-lock-outline" style="color: var(--colors-brand-primary);"></i>
						Account Security
					</h2>
				</template>
				<div class="setting-item">
					<div>
						<h3 style="margin: 0 0 4px 0; font-size: 16px;">Change Password</h3>
						<p class="u-text-muted" style="margin: 0; font-size: 14px;">Ensure your account is using a secure password</p>
					</div>
					<Button variant="outlined" @click="openPasswordModal" style="display: flex; align-items: center; gap: 8px;">
						<i class="mdi mdi-lock-reset" style="font-size: 18px;"></i>
						Change Password
					</Button>
				</div>
			</Card>
		</div>

		<!-- Password Change Dialog -->
		<Dialog v-model="showPasswordModal" title="Change Password" maxWidth="440px">
			<div class="form-grid" style="display: flex; flex-direction: column; gap: 16px; padding: 8px 0;">
				<div class="form-group">
					<label class="form-group__label">Current Password <span class="u-required">*</span></label>
					<Textbox v-model="passwordForm.currentPassword" type="password" placeholder="Enter current password" />
				</div>
				<div class="form-group">
					<label class="form-group__label">New Password <span class="u-required">*</span></label>
					<Textbox v-model="passwordForm.newPassword" type="password" placeholder="Enter new password" />
				</div>
				<div class="form-group">
					<label class="form-group__label">Confirm New Password <span class="u-required">*</span></label>
					<Textbox v-model="passwordForm.newPasswordConfirm" type="password" placeholder="Confirm new password" />
				</div>
			</div>
			<template #footer>
				<Button variant="outlined" @click="showPasswordModal = false" :disabled="passwordLoading">Cancel</Button>
				<Button variant="primary" @click="handleUpdatePassword" :loading="passwordLoading">
					<i v-if="!passwordLoading" class="mdi mdi-check"></i> Update Password
				</Button>
			</template>
		</Dialog>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/_settings.scss";
</style>
