<template>
	<div class="container">
		<h2>Login</h2>

		<input v-model="email" placeholder="Email" />
		<input v-model="password" type="password" placeholder="Password" />

		<button @click="login">Login</button>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");

const auth = useAuthStore();
const router = useRouter();

const login = async () => {
	await auth.login(email.value, password.value);
	router.push("/dashboard");
};
</script>
