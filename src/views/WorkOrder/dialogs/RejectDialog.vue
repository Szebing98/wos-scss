
<script setup lang="ts">
import { ref } from 'vue';
import Dialog from "@/components/Dialog.vue";
import Textbox from "@/components/Textbox.vue";
import Button from "@/components/Button.vue";
import { workOrderApi } from "@/api/work-order/work-order.api";
import { useSnackbarStore } from "@/stores/snackbar.store";

const props = defineProps<{ woNumber: string }>();
const emit = defineEmits(['refresh']);
const snackbar = useSnackbarStore();

const isOpen = ref(false);
const rejectForm = ref({ reason: "" });
const isRejecting = ref(false);

function open() {
	rejectForm.value.reason = "";
	isOpen.value = true;
}

async function submitReject() {
	if (!rejectForm.value.reason.trim()) {
		snackbar.error("Reason is required.");
		return;
	}
	isRejecting.value = true;
	try {
		const { error } = await workOrderApi.reject(props.woNumber, { rejectedReason: rejectForm.value.reason });
		if (error) {
			snackbar.error(error.error?.message || "Failed to reject work order.");
			return;
		}
		snackbar.success("Work Order Rejected.");
		isOpen.value = false;
		emit('refresh');
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to reject work order.");
	} finally {
		isRejecting.value = false;
	}
}

defineExpose({ open });
</script>

<template>
	<Dialog v-model="isOpen" title="Reject Work Order" maxWidth="450px">
		<p style="margin: 0 0 16px 0; font-size: 14px; color: var(--colors-text-secondary)">
			Please provide a reason for rejecting this work order. This cannot be undone.
		</p>
		<div class="form-grid">
			<Textbox
				v-model="rejectForm.reason"
				label="Rejection Reason"
				required
				placeholder="Why is this rejected?"
			/>
		</div>
		<template #footer>
			<Button variant="secondary" @click="isOpen = false">Cancel</Button>
			<Button variant="primary" @click="submitReject" :loading="isRejecting">
				Reject Order
			</Button>
		</template>
	</Dialog>
</template>
