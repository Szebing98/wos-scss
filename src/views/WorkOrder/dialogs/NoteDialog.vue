
<script setup lang="ts">
import { getApiErrorMessage } from "@/utils/error";
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
const isEditing = ref(false);
const editingGuid = ref("");
const form = ref({ content: "", viewLevel: "internal" });
const isSaving = ref(false);

function openAdd() {
    isEditing.value = false;
    editingGuid.value = "";
    form.value = { content: "", viewLevel: "internal" };
    isOpen.value = true;
}

function openEdit(note: any) {
    isEditing.value = true;
    editingGuid.value = note.guid;
    form.value = { content: note.content || "", viewLevel: note.viewLevel || "internal" };
    isOpen.value = true;
}

async function submit() {
    if (!form.value.content.trim()) return;
    isSaving.value = true;
    try {
        let res;
        if (isEditing.value && editingGuid.value) {
            res = await workOrderApi.updateNote(editingGuid.value, {
                content: form.value.content,
                viewLevel: form.value.viewLevel,
            });
        } else {
            res = await workOrderApi.createNote(props.woNumber, {
                content: form.value.content,
                viewLevel: form.value.viewLevel,
            });
        }
        if (res?.error) {
            snackbar.error(getApiErrorMessage(res.error, "Failed to save note"));
            return;
        }
        snackbar.success(isEditing.value ? "Note updated." : "Note added.");
        isOpen.value = false;
        emit('refresh');
    } catch (e) {
        console.error(e);
        snackbar.error("Failed to save note");
    } finally {
        isSaving.value = false;
    }
}

defineExpose({ openAdd, openEdit });
</script>

<template>
	<Dialog v-model="isOpen" :title="isEditing ? 'Edit Note' : 'Add Note'" maxWidth="500px">
		<div style="display: flex; flex-direction: column; gap: 16px">
			<Textbox v-model="form.content" label="Note Content *" required multiline :rows="4" />
			<div class="textbox-field">
				<label class="custom-label">View Level *</label>
				<select v-model="form.viewLevel" class="custom-select">
					<option value="internal">Internal (Team Only)</option>
					<option value="customer">External (Customer Viewable)</option>
				</select>
			</div>
		</div>
		<template #footer>
			<Button variant="secondary" @click="isOpen = false">Cancel</Button>
			<Button variant="primary" @click="submit" :loading="isSaving" :disabled="!form.content">Save Note</Button>
		</template>
	</Dialog>
</template>
