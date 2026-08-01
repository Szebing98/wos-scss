<template>
	<div class="loader-wrapper" :class="{ 'loader-wrapper--fullscreen': fullscreen, 'loader-wrapper--overlay': overlay }">
		<div class="loader" :style="{ width: size + 'px', height: size + 'px', borderWidth: thickness + 'px' }"></div>
		<p v-if="text" class="loader-wrapper__text">{{ text }}</p>
	</div>
</template>

<script setup lang="ts">
defineProps({
	fullscreen: {
		type: Boolean,
		default: false,
	},
	overlay: {
		type: Boolean,
		default: false,
	},
	text: {
		type: String,
		default: "",
	},
	size: {
		type: Number,
		default: 40,
	},
	thickness: {
		type: Number,
		default: 4,
	},
});
</script>

<style lang="scss" scoped>
@use "@/styles/components/_loader.scss";
</style>
