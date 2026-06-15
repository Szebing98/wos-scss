<template>
	<div class="filter-panel-wrapper" ref="wrapperRef">
		<div @click="toggle" class="filter-trigger">
			<slot name="trigger" :isActive="isOpen"></slot>
		</div>

		<Transition name="popover">
			<div v-if="isOpen" class="filter-popover" :class="`filter-popover--${align}`">
				<div class="filter-popover__header">
					<h4>Filters</h4>
					<button class="icon-btn" @click="close" title="Close">
						<i class="mdi mdi-close"></i>
					</button>
				</div>
				<div class="filter-popover__body" @change="close">
					<slot></slot>
				</div>
				<div class="filter-popover__footer" v-if="showReset">
					<button class="text-link" @click="handleReset">Reset Filters</button>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

defineProps<{
	showReset?: boolean;
	align?: "left" | "right";
}>();

const emit = defineEmits<{
	(e: "reset"): void;
}>();

const isOpen = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

function toggle() {
	isOpen.value = !isOpen.value;
}

function close() {
	isOpen.value = false;
}

function handleReset() {
	emit("reset");
	close();
}

function handleClickOutside(event: MouseEvent) {
	if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
		close();
	}
}

onMounted(() => {
	document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<style lang="scss" scoped>
.filter-panel-wrapper {
	position: relative;
	display: inline-block;
}

.filter-trigger {
	display: inline-block;
}

.filter-popover {
	position: absolute;
	top: calc(100% + 8px);
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	z-index: 100;
	min-width: 240px;
	display: flex;
	flex-direction: column;

	:global([data-theme="dark"]) & {
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
	}

	&--left {
		left: 0;
	}

	&--right {
		right: 0;
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
	transition: opacity 0.2s, transform 0.2s;
}

.popover-enter-from,
.popover-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
