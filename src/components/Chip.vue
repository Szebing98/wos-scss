<script setup lang="ts">
interface Props {
	type?:
		| "success"
		| "warning"
		| "error"
		| "info"
		| "default"
		| "status-new"
		| "status-pending"
		| "status-progress";
	icon?: string;
	squared?: boolean;
}

withDefaults(defineProps<Props>(), {
	type: "default",
	icon: "",
	squared: false,
});
</script>

<template>
	<span class="chip" :class="[`chip--${type}`, { 'chip--squared': squared }]">
		<slot name="icon">
			<i v-if="icon" class="mdi" :class="icon"></i>
		</slot>

		<span class="chip__content">
			<slot></slot>
		</span>
	</span>
</template>
