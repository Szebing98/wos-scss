<script setup lang="ts">
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";

const modelValue = defineModel<boolean>({ default: false });

const emit = defineEmits<{
	(e: "confirm"): void;
}>();
</script>

<template>
	<Dialog v-model="modelValue" title="Confirm Logout">
		<div class="logout-dialog-content">
			<i class="mdi mdi-logout-variant logout-dialog-icon"></i>
			<p>Are you sure you want to log out?</p>
			<span class="logout-dialog-sub">
				You will need to sign in again to access the system.
			</span>
		</div>
		<template #footer>
			<Button variant="secondary" @click="modelValue = false">Cancel</Button>
			<Button variant="danger" @click="emit('confirm')">Logout</Button>
		</template>
	</Dialog>
</template>
