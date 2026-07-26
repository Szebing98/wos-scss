<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

export interface AutocompleteOption {
	id: string | number;
	name: string;
	code?: string;
	info?: string;
}

const props = defineProps<{
	modelValue?: string | number;
	options: AutocompleteOption[];
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	error?: string;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: string | number): void;
	(e: "select", option: AutocompleteOption): void;
}>();

const searchInput = ref("");
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const selectedOption = computed(() => {
	return props.options.find((opt) => String(opt.id) === String(props.modelValue));
});

// Sync input display text with selected model value when closed
watch(
	() => props.modelValue,
	() => {
		if (selectedOption.value) {
			searchInput.value = selectedOption.value.name;
		}
	},
	{ immediate: true },
);

const filteredOptions = computed(() => {
	const query = searchInput.value.trim().toLowerCase();
	if (!query) return props.options;

	return props.options.filter((opt) => {
		const nameMatch = opt.name.toLowerCase().includes(query);
		const codeMatch = opt.code ? opt.code.toLowerCase().includes(query) : false;
		return nameMatch || codeMatch;
	});
});

function onInputFocus() {
	if (props.disabled) return;
	isOpen.value = true;
}

function onInputClick() {
	if (props.disabled) return;
	isOpen.value = true;
}

function selectOption(option: AutocompleteOption) {
	if (props.disabled) return;
	emit("update:modelValue", option.id);
	emit("select", option);
	searchInput.value = option.name;
	isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
	if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
		isOpen.value = false;
		if (selectedOption.value) {
			searchInput.value = selectedOption.value.name;
		}
	}
}

onMounted(() => {
	document.addEventListener("click", handleClickOutside);
	if (selectedOption.value) {
		searchInput.value = selectedOption.value.name;
	}
});

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
	<div class="autocomplete-field" ref="containerRef">
		<label v-if="label" class="autocomplete-field__label">
			<template v-if="label.includes('*')">
				{{ label.replace('*', '').trim() }} <span class="required-asterisk">*</span>
			</template>
			<template v-else>
				{{ label }}
			</template>
		</label>

		<div
			class="autocomplete-control"
			:class="{
				'autocomplete-control--disabled': disabled,
				'autocomplete-control--open': isOpen,
				'autocomplete-control--error': error,
			}"
		>
			<i class="mdi mdi-magnify search-icon"></i>
			<input
				type="text"
				v-model="searchInput"
				:placeholder="placeholder || 'Type to search...'"
				:disabled="disabled"
				@focus="onInputFocus"
				@click="onInputClick"
				class="autocomplete-input"
			/>
			<i
				class="mdi mdi-chevron-down chevron-icon"
				@click.stop="!disabled && (isOpen = !isOpen)"
			></i>
		</div>

		<div class="autocomplete-dropdown" v-if="isOpen">
			<ul v-if="filteredOptions.length > 0" class="options-list">
				<li
					v-for="opt in filteredOptions"
					:key="opt.id"
					class="option-item"
					:class="{ 'option-item--selected': String(opt.id) === String(modelValue) }"
					@click="selectOption(opt)"
				>
					<span class="option-name">{{ opt.name }}</span>
					<span v-if="opt.code" class="option-code">({{ opt.code }})</span>
					<span v-if="opt.info" class="option-info">{{ opt.info }}</span>
				</li>
			</ul>
			<div v-else class="empty-list">No matching results found</div>
		</div>

		<div class="autocomplete-field__footer" v-if="error">
			<p class="autocomplete-field__error">
				<i class="mdi mdi-alert-circle-outline"></i>
				<span>{{ error }}</span>
			</p>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.autocomplete-field {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs, 4px);
	width: 100%;

	&__label {
		font-size: var(--typography-fontSize-sm, 12px);
		font-weight: var(--typography-fontWeight-medium, 500);
		color: var(--colors-text-secondary, #64748b);
	}
}

.autocomplete-control {
	position: relative;
	display: flex;
	align-items: center;
	border-radius: var(--radius-md, 6px);
	border: 1px solid var(--colors-surface-border, #cbd5e1);
	background: var(--colors-surface-card, #ffffff);
	height: 40px;
	box-sizing: border-box;
	transition: all 0.2s ease;

	&--open,
	&:focus-within {
		border-color: var(--colors-brand-primary, #3b82f6);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
	}

	&--error {
		border-color: var(--colors-state-error, #ef4444);
	}

	&--disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: var(--colors-surface-background, #f8fafc);
	}

	.search-icon {
		position: absolute;
		left: 10px;
		color: var(--colors-text-muted, #94a3b8);
		font-size: 18px;
		pointer-events: none;
	}

	.autocomplete-input {
		width: 100%;
		border: none;
		background: transparent;
		padding: 0 32px 0 34px;
		height: 100%;
		font-size: 13px;
		color: var(--colors-text-primary, #1e293b);
		outline: none;

		&::placeholder {
			color: var(--colors-text-muted, #94a3b8);
		}
	}

	.chevron-icon {
		position: absolute;
		right: 10px;
		color: var(--colors-text-muted, #94a3b8);
		font-size: 18px;
		cursor: pointer;
	}
}

.autocomplete-dropdown {
	position: absolute;
	top: calc(100% + 4px);
	left: 0;
	right: 0;
	z-index: 100;
	background: var(--colors-surface-card, #ffffff);
	border: 1px solid var(--colors-surface-border, #e2e8f0);
	border-radius: var(--radius-md, 6px);
	box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
	max-height: 220px;
	overflow-y: auto;
}

.options-list {
	list-style: none;
	margin: 0;
	padding: 4px 0;
}

.option-item {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 12px;
	font-size: 13px;
	color: var(--colors-text-primary, #1e293b);
	cursor: pointer;
	transition: background 0.15s ease;

	&:hover {
		background: var(--colors-surface-hover, #f1f5f9);
	}

	&--selected {
		background: var(--colors-brand-light, #eff6ff);
		font-weight: 500;
		color: var(--colors-brand-primary, #3b82f6);
	}

	.option-name {
		font-weight: 500;
	}

	.option-code {
		color: var(--colors-text-muted, #64748b);
		font-size: 12px;
	}

	.option-info {
		margin-left: auto;
		font-size: 11px;
		color: var(--colors-brand-primary, #3b82f6);
		background: #eff6ff;
		padding: 2px 6px;
		border-radius: 4px;
	}
}

.empty-list {
	padding: 12px;
	text-align: center;
	font-size: 13px;
	color: var(--colors-text-muted, #94a3b8);
}

.autocomplete-field__footer {
	font-size: 11px;
}

.autocomplete-field__error {
	display: flex;
	align-items: center;
	gap: 4px;
	color: var(--colors-state-error, #ef4444);
	margin: 2px 0 0 0;
}
</style>
