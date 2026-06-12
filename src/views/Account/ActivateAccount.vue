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
		snackbar.error("Invalid activation link.");
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

const handleActivate = async () => {
	if (passwordError.value || confirmPasswordError.value || !token.value) return;

	isSubmitting.value = true;
	try {
		await auth.activateAccount(token.value, form.value.password, form.value.confirmPassword);

		snackbar.success("Your account is activated! Welcome aboard.");

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
		<div class="activate">
			<div class="activate__header">
				<h1>Activate Account</h1>
				<p>Welcome! Please set a strong password to activate and secure your account.</p>
			</div>

			<div class="activate__form">
				<Textbox
					v-model="form.password"
					label="Choose Password"
					type="password"
					placeholder="Enter your new password"
					:error="passwordError"
					:disabled="isSubmitting"
				/>

				<Textbox
					v-model="form.confirmPassword"
					label="Confirm Password"
					type="password"
					placeholder="Repeat your password"
					:error="confirmPasswordError"
					:disabled="isSubmitting"
				/>

				<Button
					block
					:disabled="
						isSubmitting || !!passwordError || !!confirmPasswordError || !form.password
					"
					@click="handleActivate"
				>
					{{ isSubmitting ? "Activating..." : "Activate Account" }}
				</Button>
			</div>
		</div>
	</AuthLayout>
</template>
