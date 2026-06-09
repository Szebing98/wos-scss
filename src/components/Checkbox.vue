<script setup lang="ts">
defineProps<{
	modelValue: boolean;
	disabled?: boolean;
	label?: string;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
}>();

function toggle(e: Event) {
	const target = e.target as HTMLInputElement;
	emit("update:modelValue", target.checked);
}
</script>

<template>
	<label class="checkbox">
		<input
			type="checkbox"
			:checked="modelValue"
			:disabled="disabled"
			class="checkbox__input"
			@change="toggle"
		/>

		<span class="checkbox__box" />

		<span v-if="$slots.default" class="checkbox__label">
			<slot />
		</span>
	</label>
</template>
