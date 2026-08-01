<template>
	<div class="modal-mask" v-if="modelValue">
		<div class="modal-box" :style="{ maxWidth: maxWidth || '460px' }">
			<div v-if="title || $slots.header" class="modal-box__header">
				<div class="modal-box__title">
					<slot name="header">
						<h3>{{ title }}</h3>
					</slot>
				</div>
				<button
					class="btn btn--icon"
					style="margin-right: -8px"
					@click="handleCancel"
					title="Close"
				>
					<i class="mdi mdi-close"></i>
				</button>
			</div>
			<div
				class="modal-box__body"
				:class="{ 'modal-box__body--overflow-visible': overflowVisible }"
			>
				<slot></slot>
			</div>
			<div v-if="$slots.footer || confirmText || cancelText" class="modal-box__footer">
				<slot name="footer">
					<Button variant="secondary" :disabled="loading" @click="handleCancel">
						{{ cancelText || 'Cancel' }}
					</Button>
					<Button v-if="confirmText" :variant="confirmVariant" :loading="loading" @click="handleConfirm">
						{{ confirmText }}
					</Button>
				</slot>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Button from "@/components/Button.vue";

const props = withDefaults(defineProps<{
	modelValue: boolean;
	title?: string;
	maxWidth?: string;
	overflowVisible?: boolean;
	confirmText?: string;
	cancelText?: string;
	loading?: boolean;
	confirmVariant?: "primary" | "secondary" | "outlined" | "danger";
}>(), {
	confirmText: "",
	cancelText: "Cancel",
	confirmVariant: "primary",
	loading: false,
});

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
	(e: "confirm"): void;
	(e: "cancel"): void;
}>();

function handleCancel() {
	emit("cancel");
	emit("update:modelValue", false);
}

function handleConfirm() {
	emit("confirm");
}
</script>

<style lang="scss" scoped>
@use "@/styles/components/_dialog.scss";
</style>
