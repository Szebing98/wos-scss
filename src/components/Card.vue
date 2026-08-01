<template>
	<div class="panel-card" :class="{ 'panel-card--bordered': bordered }">
		<div v-if="$slots.header" class="panel-card__header">
			<slot name="header" />
		</div>
		<div class="panel-card__content">
			<slot />
		</div>
		<div v-if="$slots.actions" class="panel-card__actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	bordered?: boolean;
}>();
</script>

<style lang="scss" scoped>
@use "@/styles/components/_card.scss";
</style>
