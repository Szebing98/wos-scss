
<script setup lang="ts">
import { ref } from 'vue';
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";
import { workOrderApi } from "@/api/work-order/work-order.api";
import { useSnackbarStore } from "@/stores/snackbar.store";

const props = defineProps<{ woNumber: string; workOrder: any }>();
const emit = defineEmits(['refresh', 'navigate']);
const snackbar = useSnackbarStore();

const isOpen = ref(false);
const form = ref<any>({});
const isSaving = ref(false);

function open() {
	form.value = {
		title: props.workOrder?.title ? `${props.workOrder.title} (Repeat)` : "",
		description: props.workOrder?.description || "",
	};
	isOpen.value = true;
}

async function submit() {
	isSaving.value = true;
	try {
		const { data, error } = await workOrderApi.repeat(props.woNumber, form.value);
		if (error) {
			snackbar.error(error.error?.message || "Failed to repeat work order.");
			return;
		}
		snackbar.success("Work Order Repeated Successfully!");
		isOpen.value = false;
        if (data?.data?.guid) {
            emit('navigate', data.data.guid);
        } else {
            emit('refresh');
        }
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to repeat work order.");
	} finally {
		isSaving.value = false;
	}
}

defineExpose({ open });
</script>
<template>
	<Dialog v-model="isOpen" title="Repeat Work Order" maxWidth="500px">
		<p style="margin: 0 0 16px 0; font-size: 14px; color: var(--colors-text-secondary)">
			This will create a new draft work order with the same details as this one.
		</p>
		<template #footer>
			<Button variant="secondary" @click="isOpen = false">Cancel</Button>
			<Button variant="primary" @click="submit" :disabled="isSaving">Confirm Repeat</Button>
		</template>
	</Dialog>
</template>
