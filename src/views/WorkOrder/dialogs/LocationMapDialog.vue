<script setup lang="ts">
import { ref } from 'vue';
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";

const props = defineProps<{ woNumber: string; workOrder: any }>();
const isOpen = ref(false);

function open() {
    isOpen.value = true;
}

defineExpose({ open });
</script>
<template>
    <Dialog v-model="isOpen" title="Location Map" maxWidth="600px">
        <div style="height: 400px; display: flex; align-items: center; justify-content: center; background: #eee; color: #666; border-radius: 8px;">
            Map Placeholder
        </div>
        <template #footer>
            <Button variant="secondary" @click="isOpen = false">Close</Button>
        </template>
    </Dialog>
</template>
