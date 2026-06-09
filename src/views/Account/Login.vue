<template>
	<AuthLayout>
		<div class="login">
			<div class="login__header">
				<h1>Login</h1>
				<p>Sign in with your credentials to continue</p>
			</div>

			<div class="login__form">
				<Textbox
					v-model="form.email"
					label="Email"
					type="email"
					placeholder="Email"
					:error="emailError"
				/>

				<Textbox
					v-model="form.password"
					label="Password"
					type="password"
					placeholder="Password"
					:error="passwordError"
				/>

				<div class="login__options">
					<Checkbox v-model="form.remember"> Remember me </Checkbox>
				</div>

				<Button block @click="login"> Sign In </Button>
			</div>
		</div>
	</AuthLayout>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { useRouter } from "vue-router";

import AuthLayout from "@/layouts/AuthLayout.vue";
import Textbox from "@/components/Textbox.vue";
import Checkbox from "@/components/Checkbox.vue";
import Button from "@/components/Button.vue";

const form = ref({
	email: "",
	password: "",
	remember: false,
});

const emailError = computed(() => {
	if (!form.value.email) return "";
	if (!/^\S+@\S+\.\S+$/.test(form.value.email)) {
		return "Invalid email format";
	}
	return "";
});

const passwordError = computed(() => {
	if (!form.value.password) return "";
	if (form.value.password.length < 8) {
		return "Password must be at least 8 characters";
	}
	return "";
});

const error = ref<string | null>(null);

const auth = useAuthStore();
const snackbar = useSnackbarStore();
const router = useRouter();

const login = async () => {
	if (emailError.value || passwordError.value) return;

	try {
		await auth.login(form.value.email, form.value.password, form.value.remember);
		snackbar.success("Logged in successfully");
		router.push("/dashboard");
	} catch (e) {
		const msg = (e as Error).message;
		error.value = msg;
		snackbar.error(msg);
	}
};
</script>
