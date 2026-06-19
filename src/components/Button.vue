<script setup lang="ts">
defineProps<{
	type?: "button" | "submit";
	variant?: "primary" | "secondary" | "danger" | "text" | "danger-text" | "icon" | "icon-primary" | "icon-edit" | "icon-danger" | "outlined" | "ghost";
	size?: "sm" | "md" | "lg";
	block?: boolean;
	disabled?: boolean;
	loading?: boolean;
	icon?: boolean;
}>();

const emit = defineEmits<{
	(e: "click", event: MouseEvent): void;
}>();

function onClick(e: MouseEvent) {
	emit("click", e);
}
</script>

<template>
	<button
		class="btn"
		:class="[
			`btn--${variant ?? 'primary'}`,
			`btn--${size ?? 'md'}`,
			{
				'btn--block': block,
				'btn--loading': loading,
			},
		]"
		:type="type ?? 'button'"
		:disabled="disabled || loading"
		@click="onClick"
	>
		<span v-if="loading" class="btn__spinner" />

		<span class="btn__content">
			<slot />
		</span>
	</button>
</template>
