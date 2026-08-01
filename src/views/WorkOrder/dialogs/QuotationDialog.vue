
<script setup lang="ts">
import { ref } from 'vue';
import Dialog from "@/components/Dialog.vue";
import Textbox from "@/components/Textbox.vue";
import DatePicker from "@/components/DatePicker.vue";
import Button from "@/components/Button.vue";
import { workOrderApi } from "@/api/work-order/work-order.api";
import { useSnackbarStore } from "@/stores/snackbar.store";

const props = defineProps<{ items: any[] }>();
const emit = defineEmits(['refresh']);
const snackbar = useSnackbarStore();

const isOpen = ref(false);
const form = ref<any>({});
const isSaving = ref(false);
const editingGuid = ref("");

function open(guid: string) {
	const found = props.items.find((item) => item.guid === guid);
	if (!found) return;
	editingGuid.value = guid;
	form.value = {
		reference: found.reference || found.refNo,
		date: found.date,
		amount: found.amount,
		name: found.fileName,
	};
	isOpen.value = true;
}

async function submit() {
	if (!editingGuid.value || !form.value.name?.trim()) return;
	isSaving.value = true;
	try {
		const docDate = form.value.date ? new Date(form.value.date).toISOString() : null;
		const { error } = await workOrderApi.updateFile(editingGuid.value, {
			fileName: form.value.name.trim(),
			docNo: form.value.reference?.trim() || null,
			docAmount: form.value.amount ?? null,
			docDate,
		});
		if (error) {
			snackbar.error(`Failed to update quotation: ${error.error?.message || "Unknown error"}`);
		} else {
			snackbar.success("Edit Quotation updated successfully!");
			isOpen.value = false;
			emit('refresh');
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to update quotation");
	} finally {
		isSaving.value = false;
	}
}

defineExpose({ open });
</script>
<template>
	<Dialog v-model="isOpen" title="Edit Quotation" maxWidth="500px">
		<div style="display: flex; flex-direction: column; gap: 16px">
			<Textbox v-model="form.name" label="File Name *" required />
			<Textbox v-model="form.reference" label="Reference No." />
			<DatePicker v-model="form.date" label="Date" type="date" />
			<Textbox v-model.number="form.amount" label="Amount" type="number" />
		</div>
		<template #footer>
			<Button variant="secondary" @click="isOpen = false">Cancel</Button>
			<Button variant="primary" @click="submit" :disabled="isSaving || !form.name">Save Changes</Button>
		</template>
	</Dialog>
</template>
