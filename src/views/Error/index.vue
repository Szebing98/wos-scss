<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Card from "@/components/Card.vue";
import Button from "@/components/Button.vue";

const route = useRoute();
const router = useRouter();

const errorCode = computed(() => {
	const code = route.query.code;
	if (typeof code === "string" && ["403", "404", "500"].includes(code)) {
		return code;
	}
	return "404";
});

const errorDetails = computed(() => {
	switch (errorCode.value) {
		case "403":
			return {
				title: "Access Denied",
				description: "You don't have permission to view this page or perform this action.",
				icon: "mdi-shield-lock-outline",
			};
		case "500":
			return {
				title: "Internal Server Error",
				description: "Oops, something went wrong on our end. Please try again later.",
				icon: "mdi-server-network-off",
			};
		case "404":
		default:
			return {
				title: "Page Not Found",
				description: "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.",
				icon: "mdi-file-question-outline",
			};
	}
});

function goHome() {
	router.push("/dashboard");
}

function goBack() {
	router.back();
}
</script>

<template>
	<div class="error-page">
		<Card class="error-card">
			<div class="error-content">
				<div class="error-icon-wrapper">
					<i class="mdi" :class="errorDetails.icon"></i>
				</div>
				<h1 class="error-code">{{ errorCode }}</h1>
				<h2 class="error-title">{{ errorDetails.title }}</h2>
				<p class="error-description">{{ errorDetails.description }}</p>
				
				<div class="error-actions">
					<Button variant="secondary" @click="goBack">Go Back</Button>
					<Button variant="primary" @click="goHome">Return to Dashboard</Button>
				</div>
			</div>
		</Card>
	</div>
</template>
