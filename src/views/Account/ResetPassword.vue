<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { useAuthStore } from "@/stores/auth.store";

import AuthLayout from "@/layouts/AuthLayout.vue";
import Textbox from "@/components/Textbox.vue";
import Button from "@/components/Button.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const snackbar = useSnackbarStore();

const token = ref("");
const isSubmitting = ref(false);

const form = ref({
	password: "",
	confirmPassword: "",
});

onMounted(() => {
	const tokenFromUrl = route.query.token as string;
	if (!tokenFromUrl) {
		snackbar.error("Invalid or expired reset token.");
		router.push("/account/login");
	} else {
		token.value = tokenFromUrl;
	}
});

const passwordError = computed(() => {
	if (!form.value.password) return "";
	if (form.value.password.length < 8) {
		return "Password must be at least 8 characters";
	}
	return "";
});

const confirmPasswordError = computed(() => {
	if (!form.value.confirmPassword) return "";
	if (form.value.password !== form.value.confirmPassword) {
		return "Passwords do not match";
	}
	return "";
});

const handleReset = async () => {
	if (passwordError.value || confirmPasswordError.value || !token.value) return;

	isSubmitting.value = true;
	try {
		await auth.resetPassword(token.value, form.value.password, form.value.confirmPassword);

		snackbar.success("Your password has been reset successfully!");
		router.push("/account/login");
	} catch (e) {
		const msg = (e as Error).message;
		snackbar.error(msg);
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<AuthLayout>
		<div class="reset-password">
			<div class="reset-password__header">
				<h1>Reset Password</h1>
				<p>Please enter your new password below.</p>
			</div>

			<div class="reset-password__form">
				<Textbox
					v-model="form.password"
					label="New Password"
					type="password"
					placeholder="Enter new password"
					:error="passwordError"
					:disabled="isSubmitting"
				/>
				<Textbox
					v-model="form.confirmPassword"
					label="Confirm New Password"
					type="password"
					placeholder="Confirm your new password"
					:error="confirmPasswordError"
					:disabled="isSubmitting"
				/>

				<Button
					block
					:disabled="
						isSubmitting || !!passwordError || !!confirmPasswordError || !form.password
					"
					@click="handleReset"
				>
					{{ isSubmitting ? "Updating..." : "Reset Password" }}
				</Button>
			</div>
		</div>
	</AuthLayout>
</template>
