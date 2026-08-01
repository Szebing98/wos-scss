<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
    modelValue?: string[];
    options: { code: string; name: string }[];
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    showCode?: boolean;
}>();

const emit = defineEmits(['update:modelValue']);

const searchQuery = ref('');
const isDropdownOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const filteredOptions = computed(() => {
    const val = props.modelValue || [];
    return props.options.filter(opt => 
        !val.includes(opt.code) && 
        (opt.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
         opt.code.toLowerCase().includes(searchQuery.value.toLowerCase()))
    );
});

const selectedOptions = computed(() => {
    const val = props.modelValue || [];
    return val.map(code => props.options.find(opt => opt.code === code) || { code, name: code });
});

function selectOption(code: string) {
    if (props.disabled) return;
    const val = props.modelValue || [];
    emit('update:modelValue', [...val, code]);
    searchQuery.value = '';
    isDropdownOpen.value = false;
}

function removeOption(code: string) {
    if (props.disabled) return;
    const val = props.modelValue || [];
    emit('update:modelValue', val.filter(c => c !== code));
}

function handleClickOutside(event: MouseEvent) {
    if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
        isDropdownOpen.value = false;
    }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<template>
    <div class="multi-select" ref="containerRef">
        <label v-if="label" class="custom-label">{{ label }}</label>
        <div class="select-container" :class="{ 'is-disabled': disabled, 'is-open': isDropdownOpen }" @click="!disabled && (isDropdownOpen = true)">
            <div class="selected-chips">
                <div v-for="opt in selectedOptions" :key="opt.code" class="chip">
                    <span>{{ opt.name }}</span>
                    <i class="mdi mdi-close" v-if="!disabled" @click.stop="removeOption(opt.code)"></i>
                </div>
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    :placeholder="selectedOptions.length === 0 ? (placeholder || 'Search...') : ''"
                    @focus="isDropdownOpen = true"
                    :disabled="disabled"
                />
            </div>
            <i class="mdi mdi-chevron-down toggle-icon" @click.stop="!disabled && (isDropdownOpen = !isDropdownOpen)"></i>
        </div>
        
        <div class="dropdown-menu" v-if="isDropdownOpen && filteredOptions.length > 0">
            <div 
                v-for="opt in filteredOptions" 
                :key="opt.code" 
                class="dropdown-item"
                @click="selectOption(opt.code)"
            >
                {{ opt.name }} <span v-if="showCode !== false" class="opt-code">({{ opt.code }})</span>
            </div>
        </div>
        <div class="dropdown-menu empty-msg" v-else-if="isDropdownOpen">
            No matching options.
        </div>
    </div>
</template>

<style lang="scss" scoped>
@use "@/styles/components/_multi-select.scss";
</style>
