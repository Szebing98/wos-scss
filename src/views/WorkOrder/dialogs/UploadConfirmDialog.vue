<script setup lang="ts">
import { ref } from "vue";
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";

const isOpen = ref(false);

defineProps<{
	fileName: string;
	previewUrl?: string;
}>();

const emit = defineEmits<{
	(e: "update:fileName", value: string): void;
	(e: "confirm"): void;
	(e: "cancel"): void;
}>();

function open() {
	isOpen.value = true;
}

function close() {
	isOpen.value = false;
}

function cancel() {
	close();
	emit("cancel");
}

function confirm() {
	close();
	emit("confirm");
}

defineExpose({ open, close });
</script>
<template>
	<Dialog v-model="isOpen" title="Confirm Upload" maxWidth="500px" @cancel="emit('cancel')">
		<div style="display: flex; flex-direction: column; gap: 16px">
			<img
				v-if="previewUrl"
				:src="previewUrl"
				alt="Upload preview"
				style="max-height: 280px; max-width: 100%; object-fit: contain; border-radius: 8px"
			/>
			<label style="display: flex; flex-direction: column; gap: 6px">
				<span>File name</span>
				<input
					:value="fileName"
					type="text"
					class="form-control"
					@input="emit('update:fileName', ($event.target as HTMLInputElement).value)"
					@keyup.enter="fileName.trim() && confirm()"
				/>
			</label>
		</div>
		<template #footer>
			<Button variant="secondary" @click="cancel">Cancel</Button>
			<Button variant="primary" :disabled="!fileName.trim()" @click="confirm">Upload</Button>
		</template>
	</Dialog>
</template>
