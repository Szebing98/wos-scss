<template>
	<div class="select-field">
		<label v-if="label" class="select-field__label">{{ label }}</label>
		<div class="select-wrapper">
			<select 
				:value="modelValue" 
				@change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
				class="select-control"
				:disabled="disabled"
			>
				<slot></slot>
			</select>
			<i class="mdi mdi-chevron-down select-icon"></i>
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	modelValue?: string | number;
	label?: string;
	disabled?: boolean;
}>();

defineEmits<{
	(e: "update:modelValue", value: string): void;
}>();
</script>

<style lang="scss" scoped>
.select-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 100%;

	&__label {
		font-size: 11px;
		font-weight: 600;
		color: var(--colors-text-secondary);
		text-transform: uppercase;
	}
}

.select-wrapper {
	position: relative;
	display: flex;
	align-items: center;

	.select-control {
		width: 100%;
		appearance: none;
		-webkit-appearance: none;
		padding: 6px 32px 6px 8px;
		border-radius: 4px;
		border: 1px solid var(--colors-surface-border);
		background: var(--colors-surface-card);
		color: var(--colors-text-primary);
		font-size: 13px;
		outline: none;
		cursor: pointer;
		transition: border-color 0.2s ease;

		&:focus {
			border-color: var(--colors-brand-primary);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.select-icon {
		position: absolute;
		right: 8px;
		color: var(--colors-text-muted);
		pointer-events: none;
		font-size: 16px;
	}
}
</style>
