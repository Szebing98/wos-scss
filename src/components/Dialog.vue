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
					@click="$emit('update:modelValue', false)"
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
			<div v-if="$slots.footer" class="modal-box__footer">
				<slot name="footer"></slot>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	modelValue: boolean;
	title?: string;
	maxWidth?: string;
	overflowVisible?: boolean;
}>();

defineEmits<{
	(e: "update:modelValue", value: boolean): void;
}>();
</script>

<style lang="scss" scoped>
.modal-mask {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.4);
	backdrop-filter: blur(2px);
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
}
.modal-box {
	background: var(--colors-surface-card);
	border-radius: 12px;
	width: 100%;
	max-height: 90vh;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
	display: flex;
	flex-direction: column;

	&__header {
		padding: var(--spacing-md) var(--spacing-lg);
		border-bottom: 1px solid var(--colors-surface-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		h3 {
			font-size: 16px;
			font-weight: 600;
			margin: 0;
			color: var(--colors-text-primary);
		}
	}
	&__title {
		flex-grow: 1;
	}
	&__body {
		padding: var(--spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		overflow-y: auto;

		&--overflow-visible {
			overflow: visible !important;
		}
	}
	&__footer {
		padding: var(--spacing-md) var(--spacing-lg);
		border-top: 1px solid var(--colors-surface-border);
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-sm);
	}
}
</style>
