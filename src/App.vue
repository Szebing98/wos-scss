<script setup lang="ts">
import { useThemeStore } from "@/stores/theme.store";

const theme = useThemeStore();
</script>

<template>
	<button @click="theme.toggleTheme()">Toggle Theme</button>
</template>
