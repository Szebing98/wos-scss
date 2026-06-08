<script setup lang="ts">
defineProps<{
	modelValue?: string;
	label?: string;
	placeholder?: string;
	type?: string;
	disabled?: boolean;
	error?: string;
	hint?: string;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: string): void;
}>();

function onInput(e: Event) {
	const target = e.target as HTMLInputElement;
	emit("update:modelValue", target.value);
}
</script>

<template>
	<div class="input-field">
		<label v-if="label" class="input-field__label">
			{{ label }}
		</label>

		<div
			class="input"
			:class="{
				'input--error': error,
				'input--disabled': disabled,
			}"
		>
			<slot name="prefix" />

			<input
				:value="modelValue"
				:type="type ?? 'text'"
				:placeholder="placeholder"
				:disabled="disabled"
				class="input__control"
				@input="onInput"
			/>

			<slot name="suffix" />
		</div>

		<p v-if="error" class="input-field__error">
			{{ error }}
		</p>

		<p v-else-if="hint" class="input-field__hint">
			{{ hint }}
		</p>
	</div>
</template>
