<script setup lang="ts">
defineProps<{
	modelValue?: string | number;
	label?: string;
	disabled?: boolean;
	error?: string;
}>();

defineEmits<{
	(e: "update:modelValue", value: string): void;
}>();
</script>

<template>
	<div class="select-field">
		<label v-if="label || $slots.label" class="select-field__label">
            <slot name="label">{{ label }}</slot>
        </label>
		<div class="select-wrapper">
			<select 
				:value="modelValue" 
				@change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
				class="select-control"
				:class="{ 'select-control--error': error }"
				:disabled="disabled"
			>
				<slot></slot>
			</select>
			<i class="mdi mdi-chevron-down select-icon"></i>
		</div>
		<div class="select-field__footer" v-if="error">
			<p class="select-field__error">
				<i class="mdi mdi-alert-circle-outline select-field__error-icon"></i>
				<span class="select-field__error-text">{{ error }}</span>
			</p>
		</div>
	</div>
</template>


<style lang="scss" scoped>
.select-field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	line-height: 20px;
	width: 100%;

	&__label {
		font-size: var(--typography-fontSize-sm);
		font-weight: var(--typography-fontWeight-medium);
		color: var(--colors-text-secondary);
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
		padding: 0 32px 0 var(--spacing-md);
		border-radius: var(--radius-md, 6px);
		border: 1px solid var(--colors-surface-border);
		background: var(--colors-surface-background, var(--colors-surface-card));
		color: var(--colors-text-primary);
		height: 40px;
		box-sizing: border-box;
		font-size: 13px;
		outline: none;
		cursor: pointer;
		transition: border-color 0.2s ease;

		&:focus {
			border-color: var(--colors-brand-primary);
		}

		&--error {
			border-color: var(--colors-state-error);
			
			&:focus {
				box-shadow: 0 0 0 3px rgb(239 68 68 / 0.15);
			}
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

.select-field__footer {
	min-height: 20px;
	position: relative;
}

.select-field__error {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: var(--typography-fontSize-xs, 12px);
	color: var(--colors-state-error);
	margin: 0;
	font-weight: 500;

	&-icon {
		font-size: 16px !important;
		display: inline-block;
	}

	&-text {
		letter-spacing: 0.01em;
		line-height: 1;
	}
}
</style>
