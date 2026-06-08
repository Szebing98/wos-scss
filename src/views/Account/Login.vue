<template>
	<AuthLayout>
		<div class="login">
			<div class="login__header">
				<h1>Welcome Back</h1>
				<p>Sign in to continue</p>
			</div>

			<div class="login__form">
				<BaseInput v-model="form.email" label="Email" type="email" />

				<BaseInput v-model="form.password" label="Password" type="password" />

				<Button block @click="login"> Sign In </Button>
			</div>
		</div>
	</AuthLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import AuthLayout from "@/layouts/AuthLayout.vue";
import BaseInput from "@/components/BaseInput.vue";
import Button from "@/components/BaseButton.vue";

const form = ref({
	email: "",
	password: "",
});

const auth = useAuthStore();
const router = useRouter();

const login = async () => {
	await auth.login(form.value.email, form.value.password);
	router.push("/dashboard");
};
</script>
