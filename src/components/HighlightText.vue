<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
	text: string | number | null | undefined;
	query?: string;
}>();

const parts = computed(() => {
	const str = props.text != null ? String(props.text) : "";
	const q = props.query ? props.query.trim() : "";
	if (!str || !q) {
		return [{ text: str, isMatch: false }];
	}

	// Escape special regex characters in search query
	const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`(${escaped})`, "gi");
	const splitStr = str.split(regex);

	return splitStr.filter(Boolean).map((part) => ({
		text: part,
		isMatch: part.toLowerCase() === q.toLowerCase(),
	}));
});
</script>

<template>
	<span class="highlight-text-wrapper">
		<template v-for="(part, index) in parts" :key="index">
			<mark v-if="part.isMatch" class="highlight-mark">{{ part.text }}</mark>
			<template v-else>{{ part.text }}</template>
		</template>
	</span>
</template>

<style lang="scss">
@use "@/styles/components/_highlight-text.scss";
</style>
