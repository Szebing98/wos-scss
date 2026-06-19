<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
	modelValue?: number | null;
	label?: string;
	currencySymbol?: string;
	disabled?: boolean;
	error?: string;
	hint?: string;
	hideFooter?: boolean;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: number | null): void;
}>();

const isFocused = ref(false);
const hasValue = computed(() => props.modelValue !== null && props.modelValue !== undefined && props.modelValue.toString() !== '');

function onInput(e: Event) {
	const target = e.target as HTMLInputElement;
	const value = target.value === "" ? null : Number(target.value);
	emit("update:modelValue", value);
}
</script>

<template>
	<div class="mud-input-control" :class="{ 'mud-input-error': error, 'mud-input-disabled': disabled }">
		<div class="mud-input-root" :class="{ 'mud-input-root-focused': isFocused, 'mud-input-root-has-value': hasValue }">
			<label v-if="label" class="mud-input-label">
				{{ label }}
			</label>
			<div class="mud-input-adornment-start">
				<span class="mud-input-symbol">{{ currencySymbol || '$' }}</span>
			</div>
			<input
				:value="modelValue"
				type="number"
				step="0.01"
				:disabled="disabled"
				class="mud-input-slot u-text-right"
				@input="onInput"
				@focus="isFocused = true"
				@blur="isFocused = false"
			/>
		</div>

		<div class="mud-input-helper-text" v-if="!hideFooter">
			<Transition name="fade-slide">
				<p v-if="error" class="mud-input-error-text">
					<i class="mdi mdi-alert-circle-outline"></i>
					<span>{{ error }}</span>
				</p>
				<p v-else-if="hint" class="mud-input-hint-text">
					{{ hint }}
				</p>
			</Transition>
		</div>
	</div>
</template>

<style scoped>
.mud-input-control {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.mud-input-root {
	position: relative;
	display: flex;
	align-items: baseline;
	background-color: var(--colors-surface-hover);
	border-radius: var(--radius-md, 4px) var(--radius-md, 4px) 0 0;
	padding: 22px 12px 6px 12px;
	transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	border-bottom: 1px solid var(--colors-surface-border);
	cursor: text;
}

.mud-input-root:hover {
	background-color: var(--colors-surface-border);
}

.mud-input-root::after {
	content: "";
	position: absolute;
	bottom: -1px;
	left: 0;
	right: 0;
	height: 2px;
	background-color: var(--colors-brand-primary);
	transform: scaleX(0);
	transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.mud-input-root-focused::after {
	transform: scaleX(1);
}

.mud-input-label {
	position: absolute;
	left: 12px;
	top: 14px;
	font-size: 15px;
	color: var(--colors-text-secondary);
	transform-origin: top left;
	transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	pointer-events: none;
}

.mud-input-root-focused .mud-input-label,
.mud-input-root-has-value .mud-input-label {
	transform: translate(0, -8px) scale(0.75);
}

.mud-input-root-focused .mud-input-label {
	color: var(--colors-brand-primary);
}

.mud-input-adornment-start {
	margin-right: 8px;
	display: flex;
	align-items: center;
}

.mud-input-symbol {
	font-size: 14px;
	color: var(--colors-text-muted);
	font-weight: 500;
}

.mud-input-slot {
	flex: 1;
	width: 100%;
	border: none;
	outline: none;
	background: transparent;
	color: var(--colors-text-primary);
	font-size: 15px;
	padding: 0;
}

.mud-input-disabled .mud-input-root {
	opacity: 0.5;
	pointer-events: none;
	border-bottom-style: dashed;
}

.mud-input-error .mud-input-root {
	border-bottom-color: var(--colors-state-error);
}
.mud-input-error .mud-input-root::after {
	background-color: var(--colors-state-error);
}
.mud-input-error .mud-input-label {
	color: var(--colors-state-error) !important;
}

.mud-input-helper-text {
	min-height: 20px;
	padding: 4px 12px 0;
}

.mud-input-error-text {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	color: var(--colors-state-error);
	margin: 0;
}

.mud-input-hint-text {
	font-size: 12px;
	color: var(--colors-text-muted);
	margin: 0;
}

.u-text-right {
	text-align: right !important;
}

/* Hide number spinner arrows */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
	-webkit-appearance: none;
	margin: 0;
}
input[type="number"] {
	appearance: textfield;
}

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
