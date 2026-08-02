
<script setup lang="ts">
import { ref } from 'vue';
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";
import Textbox from "@/components/Textbox.vue";
import DatePicker from "@/components/DatePicker.vue";
import { workOrderApi } from "@/api/work-order/work-order.api";
import { useSnackbarStore } from "@/stores/snackbar.store";

const props = defineProps<{ woNumber: string; workOrder: any }>();
const emit = defineEmits(['refresh']);
const snackbar = useSnackbarStore();

const isOpen = ref(false);
const form = ref<any>({ newEstimatedEndDate: "", extensionReason: "" });
const isSaving = ref(false);

function open() {
	form.value = {
		newEstimatedEndDate: "",
		extensionReason: "",
	};
	isOpen.value = true;
}

async function submit() {
	if (!form.value.newEstimatedEndDate) return;
	isSaving.value = true;
	try {
		const { error } = await workOrderApi.extendEndDate(props.woNumber, form.value);
		if (error) {
			snackbar.error(error.error?.message || "Failed to extend work order.");
			return;
		}
		snackbar.success("Work Order Extended Successfully!");
		isOpen.value = false;
        emit('refresh');
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to extend work order.");
	} finally {
		isSaving.value = false;
	}
}

defineExpose({ open });
</script>
<template>
	<Dialog v-model="isOpen" title="Extend Work Order" maxWidth="500px">
		<div style="display: flex; flex-direction: column; gap: 16px">
			<DatePicker v-model="form.newEstimatedEndDate" label="New Estimated End Date *" required type="datetime-local" />
			<Textbox v-model="form.extensionReason" label="Extension Reason" multiline :rows="3" />
		</div>
		<template #footer>
			<Button variant="secondary" @click="isOpen = false">Cancel</Button>
			<Button variant="primary" @click="submit" :loading="isSaving" :disabled="!form.newEstimatedEndDate">Confirm Extension</Button>
		</template>
	</Dialog>
</template>
