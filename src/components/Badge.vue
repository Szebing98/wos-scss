<script setup lang="ts">
interface Props {
	type?:
		| "success"
		| "warning"
		| "error"
		| "info"
		| "default"
		| "disabled"
		| "primary"
		| "new"
		| "pending"
		| "pending-approval"
		| "progress"
		| "in-progress"
		| "done"
		| "completed"
		| "claimed"
		| "closed"
		| "cancelled"
		| "rejected";
	icon?: string;
}

withDefaults(defineProps<Props>(), {
	type: "default",
	icon: "",
});
</script>

<template>
	<span class="badge" :class="`badge--${type}`">
		<slot name="icon">
			<i v-if="icon" class="mdi" :class="icon" style="margin-right: 4px;"></i>
		</slot>
		<slot></slot>
	</span>
</template>
