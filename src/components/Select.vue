<script setup lang="ts">
import { ref, computed, watch, useSlots, onMounted, onUnmounted } from "vue";
import Badge from "@/components/Badge.vue";

export interface SelectOption {
	value: string | number;
	label: string;
	disabled?: boolean;
	badgeText?: string;
	badgeType?: "success" | "warning" | "error" | "info" | "primary" | "secondary";
}

const props = defineProps<{
	modelValue?: string | number;
	options?: SelectOption[];
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	error?: string;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: any): void;
	(e: "change", event: Event): void;
}>();

const slots = useSlots();
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const parsedSlotOptions = ref<SelectOption[]>([]);

function getVNodeText(vnode: any): string {
	if (!vnode) return "";
	if (typeof vnode === "string" || typeof vnode === "number") return String(vnode);
	if (typeof vnode.children === "string") return vnode.children;
	if (Array.isArray(vnode.children)) {
		return vnode.children.map(getVNodeText).join("").trim();
	}
	if (vnode.children?.default) {
		try {
			const res = vnode.children.default();
			if (Array.isArray(res)) return res.map(getVNodeText).join("").trim();
			return String(res);
		} catch (e) {
			return "";
		}
	}
	return "";
}

function updateParsedOptions() {
	if (props.options && props.options.length > 0) {
		parsedSlotOptions.value = props.options;
		return;
	}
	const defaultSlot = slots.default?.();
	if (!defaultSlot) {
		parsedSlotOptions.value = [];
		return;
	}

	const list: SelectOption[] = [];

	function parseVNode(vnode: any) {
		if (!vnode) return;
		if (Array.isArray(vnode)) {
			vnode.forEach(parseVNode);
			return;
		}

		if (typeof vnode.type === "symbol" || Array.isArray(vnode.children)) {
			if (Array.isArray(vnode.children)) {
				vnode.children.forEach(parseVNode);
				return;
			}
		}

		if (vnode.type === "option" || vnode.type?.name === "option") {
			const val = vnode.props?.value !== undefined ? vnode.props.value : getVNodeText(vnode);
			const labelText = getVNodeText(vnode) || String(val);
			const isDisabled = vnode.props?.disabled !== undefined && vnode.props?.disabled !== false;
			list.push({
				value: val,
				label: labelText,
				disabled: isDisabled,
			});
		}
	}

	defaultSlot.forEach(parseVNode);
	parsedSlotOptions.value = list;
}

const availableOptions = computed<SelectOption[]>(() => {
	if (props.options && props.options.length > 0) {
		return props.options;
	}
	return parsedSlotOptions.value;
});

const selectedOption = computed(() => {
	return availableOptions.value.find((opt) => String(opt.value) === String(props.modelValue));
});

const selectedLabel = computed(() => {
	if (selectedOption.value) {
		return selectedOption.value.label;
	}
	if (props.placeholder) {
		return props.placeholder;
	}
	return props.modelValue !== undefined && props.modelValue !== "" ? String(props.modelValue) : "Select an option...";
});

function toggleOpen() {
	if (props.disabled) return;
	if (!isOpen.value) {
		updateParsedOptions();
	}
	isOpen.value = !isOpen.value;
}

function selectOption(opt: SelectOption) {
	if (opt.disabled || props.disabled) return;
	emit("update:modelValue", opt.value);
	const event = new CustomEvent("change", { bubbles: true });
	Object.defineProperty(event, "target", { value: { value: opt.value }, enumerable: true });
	emit("change", event as any);
	isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
	if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
		isOpen.value = false;
	}
}

watch([() => props.options, () => props.modelValue], () => {
	updateParsedOptions();
}, { immediate: true });

onMounted(() => {
	document.addEventListener("click", handleClickOutside);
	updateParsedOptions();
});

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
	<div class="select-field" ref="containerRef">
		<label v-if="label || $slots.label" class="select-field__label">
			<slot name="label">
				<template v-if="label && label.includes('*')">
					{{ label.replace('*', '').trim() }} <span class="required-asterisk">*</span>
				</template>
				<template v-else>
					{{ label }}
				</template>
			</slot>
		</label>

		<div
			class="select-control"
			:class="{
				'select-control--disabled': disabled,
				'select-control--open': isOpen,
				'select-control--error': error,
			}"
			@click="toggleOpen"
		>
			<span class="selected-text" :class="{ 'selected-text--placeholder': !selectedOption }">
				{{ selectedLabel }}
			</span>
			<div v-if="$slots.suffix" class="select-suffix" @click.stop>
				<slot name="suffix"></slot>
			</div>
			<i class="mdi mdi-chevron-down chevron-icon" :class="{ 'chevron-icon--open': isOpen }"></i>
		</div>

		<!-- Custom Floating Dropdown Menu (matching Autocomplete) -->
		<div class="select-dropdown" v-if="isOpen">
			<ul v-if="availableOptions.length > 0" class="options-list">
				<li
					v-for="opt in availableOptions"
					:key="String(opt.value)"
					class="option-item"
					:class="{
						'option-item--selected': String(opt.value) === String(modelValue),
						'option-item--disabled': opt.disabled
					}"
					@click.stop="selectOption(opt)"
				>
					<div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
						<span class="option-name">{{ opt.label }}</span>
						<Badge
							v-if="opt.badgeText"
							:type="(opt.badgeType || 'info') as any"
							size="sm"
						>
							{{ opt.badgeText }}
						</Badge>
					</div>
					<i v-if="String(opt.value) === String(modelValue)" class="mdi mdi-check check-icon"></i>
				</li>
			</ul>
			<div v-else class="empty-list">No options available</div>
		</div>

		<!-- Hidden native select for slot fallback / form compatibility -->
		<select
			style="display: none;"
			:value="modelValue"
			:disabled="disabled"
			@change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
		>
			<slot></slot>
		</select>

		<div class="select-field__footer" v-if="error">
			<p class="select-field__error">
				<i class="mdi mdi-alert-circle-outline select-field__error-icon"></i>
				<span class="select-field__error-text">{{ error }}</span>
			</p>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/components/_select.scss";
</style>
