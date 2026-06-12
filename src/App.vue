<script setup lang="ts">
import Snackbar from "@/components/Snackbar.vue";
</script>

<template>
	<router-view />
	<Snackbar />
</template>

<style lang="scss" scoped>
/* 可以在这里放一些你全栈通用的全局重置样式 */
body {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

.status-card {
	background-color: var(--card-color);
	color: white;

	:global([data-theme="dark"]) & {
		background: linear-gradient(135deg, #1e1e2d 0%, #151521 100%);
		color: #ffffff;
		border-left: 5px solid var(--card-color);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	}
}
</style>
