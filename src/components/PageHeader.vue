<script setup lang="ts">
defineProps<{
	title?: string;
	mobileIconOnly?: boolean;
}>(); // Force volar reload
</script>

<template>
	<div class="page-header" :class="{ 'page-header--mobile-icon-only': mobileIconOnly }">
		<div class="page-header__title-area">
			<slot name="title">
				<h1>{{ title }}</h1>
			</slot>
			<slot name="subtitle"></slot>
		</div>
		<div class="page-header__actions">
			<slot name="actions"></slot>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/components/_page-header.scss";
</style>
