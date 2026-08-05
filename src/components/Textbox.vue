<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
	modelValue?: string | number | null;
	label?: string;
	placeholder?: string;
	type?: string;
	disabled?: boolean;
	error?: string;
	hint?: string;
	hideFooter?: boolean;
	maxlength?: number | string;
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: string | number | null): void;
}>();

// Control password visibility state
const isPasswordVisible = ref(false);

// Determine the input type based on props and password visibility
const inputType = computed(() => {
	if (props.type === "password") {
		return isPasswordVisible.value ? "text" : "password";
	}
	return props.type ?? "text";
});

function onInput(e: Event) {
	const target = e.target as HTMLInputElement;
	let value: string | number | null = target.value;
	if (props.type === "number") {
		value = target.value === "" ? null : Number(target.value);
	}
	emit("update:modelValue", value);
}

function togglePassword() {
	isPasswordVisible.value = !isPasswordVisible.value;
}
</script>

<template>
	<div class="textbox-field">
		<label v-if="label" class="textbox-field__label">
			<template v-if="label.includes('*')">
				{{ label.replace('*', '').trim() }} <span class="required-asterisk">*</span>
			</template>
			<template v-else>
				{{ label }}
			</template>
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
				:type="inputType"
				:placeholder="placeholder"
				:disabled="disabled"
				:maxlength="maxlength"
				class="textbox__control"
				@input="onInput"
			/>

			<div v-if="type === 'password'" class="textbox__toggle" @click="togglePassword">
				<i class="mdi" :class="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"></i>
			</div>

			<slot name="suffix" />
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
