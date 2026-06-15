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
.panel-card {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: var(--radius-xxs, 12px);
	padding: var(--spacing-lg);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
	display: flex;
	flex-direction: column;


	&--bordered {
		border-left: 6px solid var(--colors-brand-primary);
	}

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-lg);

		:deep(h2), :deep(h3) {
			font-size: 16px;
			font-weight: 600;
			margin: 0;
			color: var(--colors-text-primary);
		}
	}

	&__content {
		flex: 1;
	}

	&__actions {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--spacing-md);
		gap: var(--spacing-sm);
	}
}
</style>
