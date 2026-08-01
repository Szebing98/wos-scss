<script setup lang="ts">
import { ref } from 'vue';
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";

const isOpen = ref(false);

function open() {
    isOpen.value = true;
}

defineExpose({ open });
</script>
<template>
    <Dialog v-model="isOpen" title="Confirm Upload" maxWidth="500px">
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <p>Ready to upload file.</p>
        </div>
        <template #footer>
            <Button variant="secondary" @click="isOpen = false">Cancel</Button>
            <Button variant="primary">Upload</Button>
        </template>
    </Dialog>
</template>
