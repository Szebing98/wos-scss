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
.highlight-text-wrapper {
	display: inline;
}

.highlight-mark {
	background-color: #fef08a !important; // Warm bright yellow background
	color: #854d0e !important;           // Contrast amber text color
	padding: 1px 3px !important;
	border-radius: 3px !important;
	font-weight: 600 !important;
	box-shadow: 0 1px 2px rgba(234, 179, 8, 0.25);
	line-height: inherit;
	font-family: inherit;
}
</style>
