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
			<slot name="prefix" />

			<input
				:value="modelValue"
				:type="type ?? 'text'"
				:placeholder="placeholder"
				:disabled="disabled"
				class="textbox__control"
				@input="onInput"
			/>

			<slot name="suffix" />
		</div>

		<p v-if="error" class="textbox-field__error">
			<span class="material-icons" style="font-size: 14px">error_outline</span>
			{{ error }}
		</p>

		<p v-else-if="hint" class="textbox-field__hint">
			{{ hint }}
		</p>
	</div>
</template>
