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
@use "@/styles/components/_filter-panel.scss";
</style>
