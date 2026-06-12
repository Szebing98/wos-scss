<script setup lang="ts">
import { useSnackbarStore } from "@/stores/snackbar.store";
const snackbar = useSnackbarStore();

const icons = {
	success: "mdi-check-circle",
	error: "mdi-close-circle",
	info: "mdi-information",
	warning: "mdi-alert",
};
</script>

<template>
	<div class="snackbar-container">
		<div
			v-for="t in snackbar.items"
			:key="t.id"
			class="snackbar"
			:class="`snackbar--${t.type}`"
		>
			<i class="snackbar__icon mdi" :class="icons[t.type]" />

			<span class="snackbar__message">
				{{ t.message }}
			</span>
		</div>
	</div>
</template>
