<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { useAuthStore } from "@/stores/auth.store";

import AuthLayout from "@/layouts/AuthLayout.vue";
import Textbox from "@/components/Textbox.vue";
import Button from "@/components/Button.vue";

const email = ref("");
const isSubmitting = ref(false);

const snackbar = useSnackbarStore();
const router = useRouter();
const auth = useAuthStore();

const emailError = computed(() => {
	if (!email.value) return "";
	if (!/^\S+@\S+\.\S+$/.test(email.value)) {
		return "Please enter a valid email address";
	}
	return "";
});

const handleReset = async () => {
	if (emailError.value || !email.value) return;

	isSubmitting.value = true;
	try {
		await auth.forgotPassword(email.value);

		snackbar.success("Reset link has been sent to your email!");

		router.push("/login");
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
		<div class="forgot-password">
			<div class="forgot-password__header">
				<h1>Forgot Password?</h1>
				<p>Enter your email address and we'll send you a link to reset your password.</p>
			</div>

			<div class="forgot-password__form">
				<Textbox
					v-model="email"
					label="Email Address"
					type="email"
					placeholder="Enter your registered email"
					:error="emailError"
					:disabled="isSubmitting"
				/>

				<Button
					block
					:loading="isSubmitting"
					:disabled="!!emailError || !email"
					@click="handleReset"
				>
					{{ isSubmitting ? "Sending..." : "Send Reset Link" }}
				</Button>

				<div class="forgot-password__back">
					<router-link to="/account/login" class="forgot-password__back-link">
						Back to Login
					</router-link>
				</div>
			</div>
		</div>
	</AuthLayout>
</template>
