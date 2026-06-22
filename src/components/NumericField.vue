<script setup lang="ts">
const props = defineProps<{
	modelValue?: number | null;
	label?: string;
	currencySymbol?: string;
	disabled?: boolean;
	error?: string;
	hint?: string;
	hideFooter?: boolean;
	placeholder?: string;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: number | null): void;
}>();

function onInput(e: Event) {
	const target = e.target as HTMLInputElement;
	const value = target.value === "" ? null : Number(target.value);
	emit("update:modelValue", value);
}
</script>

<template>
	<div class="textbox-field">
		<label v-if="label" class="textbox-field__label">
			{{ label }}
		</label>

		<div
			class="textbox"
			:class="{
				'textbox--error': error,
				'textbox--disabled': disabled,
			}"
		>
			<span class="numeric-prefix">{{ currencySymbol || "$" }}</span>

			<input
				:value="modelValue"
				type="number"
				step="0.01"
				:placeholder="placeholder ?? '0.00'"
				:disabled="disabled"
				class="textbox__control u-text-right"
				@input="onInput"
			/>
		</div>

		<div class="textbox-field__footer" v-if="!hideFooter">
			<Transition name="fade-slide">
				<p v-if="error" class="textbox-field__error">
					<i class="mdi mdi-alert-circle-outline textbox-field__error-icon"></i>
					<span class="textbox-field__error-text">{{ error }}</span>
				</p>
				<p v-else-if="hint" class="textbox-field__hint">
					{{ hint }}
				</p>
			</Transition>
		</div>
	</div>
</template>

<style scoped>
/* Inherit all Textbox styles via global CSS; only add NumericField-specific overrides here */

.numeric-prefix {
	display: flex;
	align-items: center;
	padding: 0 8px 0 12px;
	font-size: 14px;
	font-weight: 500;
	color: var(--colors-text-muted);
	pointer-events: none;
	user-select: none;
	flex-shrink: 0;
}

.u-text-right {
	text-align: right !important;
}

/* Hide browser number spinner arrows */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
	-webkit-appearance: none;
	margin: 0;
}
input[type="number"] {
	appearance: textfield;
}

/* Transition for error/hint */
.fade-slide-enter-active,
.fade-slide-leave-active {
	transition: all 0.2s ease-out;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
