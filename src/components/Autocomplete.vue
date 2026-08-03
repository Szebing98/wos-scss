<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";

export interface AutocompleteOption {
	id: string | number;
	name: string;
	code?: string;
	info?: string;
}

const props = withDefaults(defineProps<{
	modelValue?: string | number;
	options: AutocompleteOption[];
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	error?: string;
	emptyMessage?: string;
	showCode?: boolean;
	serverSearch?: boolean;
	loading?: boolean;
}>(), {
	emptyMessage: "Not found",
	showCode: true,
	serverSearch: false,
	loading: false,
});

const emit = defineEmits<{
	(e: "update:modelValue", value: string | number): void;
	(e: "select", option: AutocompleteOption): void;
	(e: "search", query: string): void;
}>();

const searchInput = ref("");
const isOpen = ref(false);
const opensAbove = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const selectedOption = computed(() => {
	return props.options.find((opt) => String(opt.id) === String(props.modelValue));
});

// Sync input display text with selected model value when closed
watch(
	[() => props.modelValue, selectedOption],
	([val]) => {
		if (!val) {
			searchInput.value = "";
		} else if (selectedOption.value) {
			searchInput.value = selectedOption.value.name;
		} else {
			searchInput.value = String(val);
		}
	},
	{ immediate: true },
);

const filteredOptions = computed(() => {
	if (props.serverSearch) return props.options;
	const query = searchInput.value.trim().toLowerCase();
	if (!query) return props.options;

	return props.options.filter((opt) => {
		const nameMatch = opt.name.toLowerCase().includes(query);
		const codeMatch = opt.code ? opt.code.toLowerCase().includes(query) : false;
		return nameMatch || codeMatch;
	});
});

function handleSearchInput() {
	if (props.serverSearch) emit("search", searchInput.value.trim());
}

async function updateDropdownDirection() {
	await nextTick();
	const rect = containerRef.value?.getBoundingClientRect();
	if (!rect) return;

	const spaceBelow = window.innerHeight - rect.bottom;
	const spaceAbove = rect.top;
	const preferredHeight = Math.min(260, Math.max(160, window.innerHeight * 0.35));
	opensAbove.value = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
}

function openDropdown() {
	isOpen.value = true;
	void updateDropdownDirection();
}

function onInputFocus() {
	if (props.disabled) return;
	openDropdown();
}

function onInputClick() {
	if (props.disabled) return;
	openDropdown();
}

function selectOption(option: AutocompleteOption) {
	if (props.disabled) return;
	emit("update:modelValue", option.id);
	emit("select", option);
	searchInput.value = option.name;
	isOpen.value = false;
}

function clearSelection(event?: MouseEvent) {
	if (event) event.stopPropagation();
	if (props.disabled) return;
	searchInput.value = "";
	emit("update:modelValue", "");
	if (props.serverSearch) emit("search", "");
	openDropdown();
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
				@input="handleSearchInput"
				:placeholder="placeholder || 'Type to search...'"
				:disabled="disabled"
				@focus="onInputFocus"
				@click="onInputClick"
				class="autocomplete-input"
			/>
			<div v-if="$slots.suffix" class="autocomplete-suffix" @click.stop>
				<slot name="suffix"></slot>
			</div>
			<i
				v-if="modelValue || searchInput"
				class="mdi mdi-close-circle clear-icon"
				title="Clear selection"
				@click.stop="clearSelection"
			></i>
			<i
				v-else
				class="mdi mdi-chevron-down chevron-icon"
				@click.stop="!disabled && (isOpen ? (isOpen = false) : openDropdown())"
			></i>
		</div>

		<div
			class="autocomplete-dropdown"
			:class="{ 'autocomplete-dropdown--above': opensAbove }"
			v-if="isOpen"
		>
			<div v-if="loading" class="empty-list">Searching...</div>
			<ul v-else-if="filteredOptions.length > 0" class="options-list">
				<li
					v-for="opt in filteredOptions"
					:key="opt.id"
					class="option-item"
					:class="{ 'option-item--selected': String(opt.id) === String(modelValue) }"
					@click="selectOption(opt)"
				>
					<span class="option-name">{{ opt.name }}</span>
					<span v-if="showCode && opt.code" class="option-code">({{ opt.code }})</span>
					<span v-if="opt.info" class="option-info">{{ opt.info }}</span>
				</li>
			</ul>
			<div v-else class="empty-list">{{ emptyMessage || 'Not found' }}</div>
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
@use "@/styles/components/_autocomplete.scss";
</style>
