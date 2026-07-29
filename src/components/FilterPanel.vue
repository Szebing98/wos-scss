<template>
	<div class="filter-panel-wrapper" ref="wrapperRef">
		<div @click="toggle" class="filter-trigger">
			<slot name="trigger" :isActive="isOpen">
				<Button
					variant="outlined"
					:class="{ 'btn--active': isOpen }"
					title="Filter"
					style="display: inline-flex; align-items: center; gap: 6px"
				>
					<i class="mdi mdi-filter-variant" style="font-size: 18px"></i>
					<span class="filter-label-text">Filter</span>
				</Button>
			</slot>
		</div>

		<Teleport to="body">
			<Transition name="fade">
				<div v-if="isOpen" class="filter-backdrop" @click="close"></div>
			</Transition>

			<Transition name="popover">
				<div v-if="isOpen" class="filter-modal-container" @click.self="close">
					<div class="filter-popover filter-popover--modal">
						<div class="filter-popover__header">
							<h4>Filters</h4>
							<button class="btn btn--icon" @click="close" title="Close">
								<i class="mdi mdi-close"></i>
							</button>
						</div>
						<div class="filter-popover__body">
							<slot></slot>
						</div>
						<div class="filter-popover__footer">
							<Button v-if="showReset" variant="text" @click="handleReset"
								>Reset Filters</Button
							>
							<div style="flex-grow: 1"></div>
							<Button variant="primary" @click="handleApply">Apply</Button>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Button from "./Button.vue";

withDefaults(
	defineProps<{
		showReset?: boolean;
		align?: "left" | "right";
		count?: number;
	}>(),
	{
		showReset: true,
	},
);

const emit = defineEmits<{
	(e: "reset"): void;
	(e: "apply"): void;
}>();

const isOpen = ref(false);

function toggle() {
	isOpen.value = !isOpen.value;
}

function close() {
	isOpen.value = false;
}

function handleApply() {
	emit("apply");
	close();
}

function handleReset() {
	emit("reset");
	close();
}
</script>

<style lang="scss" scoped>
.filter-panel-wrapper {
	position: relative;
	display: inline-block;
}

.filter-trigger {
	display: inline-block;

	:deep(.btn--icon) {
		width: 40px;
		height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--colors-surface-background);
		border: 1px solid var(--colors-surface-border);
		border-radius: 6px;
		color: var(--colors-text-secondary);
		cursor: pointer;
		font-size: 20px;
		transition: all 0.2s;
		padding: 0;

		&:hover,
		&.btn--icon-active {
			background: var(--colors-surface-hover);
			color: var(--colors-brand-primary);
		}
	}
}

.filter-backdrop {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 900;
}

.filter-modal-container {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 901;
	padding: 24px;
}

.filter-popover {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	width: 100%;
	max-width: 400px;
	display: flex;
	flex-direction: column;
	max-height: 90vh;

	:global([data-theme="dark"]) & {
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
	}

	&__header {
		padding: 12px 16px;
		border-bottom: 1px solid var(--colors-surface-border);
		display: flex;
		justify-content: space-between;
		align-items: center;

		h4 {
			margin: 0;
			font-size: 13px;
			font-weight: 600;
			color: var(--colors-text-primary);
		}

		.icon-btn {
			background: transparent;
			border: none;
			color: var(--colors-text-muted);
			cursor: pointer;
			padding: 4px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 4px;

			&:hover {
				background: var(--colors-surface-hover);
				color: var(--colors-text-primary);
			}
		}
	}

	&__body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	&__footer {
		padding: 12px 16px;
		border-top: 1px solid var(--colors-surface-border);
		background: var(--colors-surface-background);
		border-bottom-left-radius: 8px;
		border-bottom-right-radius: 8px;
		display: flex;
		justify-content: flex-end;

		.text-link {
			background: transparent;
			border: none;
			color: var(--colors-brand-primary);
			font-size: 12px;
			font-weight: 500;
			cursor: pointer;

			&:hover {
				text-decoration: underline;
			}
		}
	}
}

.popover-enter-active,
.popover-leave-active {
	transition:
		opacity 0.2s,
		transform 0.2s;
}

.popover-enter-from,
.popover-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
