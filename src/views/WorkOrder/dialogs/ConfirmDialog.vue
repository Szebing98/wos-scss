
<script setup lang="ts">
import { ref } from 'vue';
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";

const isOpen = ref(false);
const title = ref("Confirm Action");
const message = ref("Are you sure you want to proceed?");
const btnText = ref("Confirm");
const variant = ref<any>("primary");
let onConfirmCb: (() => void) | null = null;

function open(config: { title: string; message: string; buttonText?: string; variant?: string; onConfirm: () => void }) {
	title.value = config.title;
	message.value = config.message;
	btnText.value = config.buttonText || "Confirm";
	variant.value = config.variant || "primary";
	onConfirmCb = config.onConfirm;
	isOpen.value = true;
}

function handleConfirm() {
	if (onConfirmCb) onConfirmCb();
	isOpen.value = false;
}

defineExpose({ open });
</script>
<template>
	<Dialog v-model="isOpen" :title="title" maxWidth="400px">
		<p style="margin: 0 0 16px 0; font-size: 14px; color: var(--colors-text-secondary)">
			{{ message }}
		</p>
		<template #footer>
			<Button variant="secondary" @click="isOpen = false">Cancel</Button>
			<Button :variant="variant" @click="handleConfirm">{{ btnText }}</Button>
		</template>
	</Dialog>
</template>
