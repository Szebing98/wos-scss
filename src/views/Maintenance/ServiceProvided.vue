<template>
    <div class="services-view">
        <div class="services-view__header">
            <div class="services-view__title-area">
                <div class="title-with-action">
                    <h1>Service Catalog</h1>
                    <button class="icon-action-btn icon-action-btn--primary" @click="prepareCreate" title="Add New Service">
                        <i class="mdi mdi-wrench-clock"></i>
                    </button>
                </div>
                <p class="services-view__subtitle">Manage labor services, technical fees, and standard rates</p>
            </div>
        </div>

        <div class="filter-panel">
            <div class="filter-panel__left">
                <div class="search-box">
                    <i class="mdi mdi-magnify search-box__icon"></i>
                    <input 
                        v-model="searchString" 
                        type="text" 
                        placeholder="Search Service No, Name or Code..." 
                        class="search-box__input"
                    />
                </div>
                <label class="checkbox-container">
                    <input type="checkbox" v-model="showActiveOnly" />
                    <span class="checkbox-container__box"></span>
                    Active Services Only
                </label>
            </div>
        </div>

        <Card class="table-scroll-container" style="padding: 0;">
            <Table :headers="tableHeaders" :items="filteredServices" emptyMessage="No labor services matching criteria found.">
                <template #item-code="{ item }">
                    <div class="service-cell">
                        <span class="service-cell__no">{{ item.serviceNo }}</span>
                        <span class="service-cell__code">System ID: {{ item.code }}</span>
                    </div>
                </template>
                <template #item-name="{ item }">
                    <span class="u-font-weight-medium">{{ item.name }}</span>
                </template>
                <template #item-uom="{ item }">
                    <Chip type="info">{{ item.uom }}</Chip>
                </template>
                <template #item-unitPrice="{ item }">
                    <span class="u-font-weight-bold u-text-primary">
                        RM {{ formatPrice(item.unitPrice) }}
                    </span>
                </template>
                <template #item-status="{ item }">
                    <Chip :type="item.isActive ? 'success' : 'default'">
                        {{ item.isActive ? 'Active' : 'Disabled' }}
                    </Chip>
                </template>
                <template #item-actions="{ item }">
                    <button class="icon-action-btn" @click="prepareEdit(item)" title="Modify Service">
                        <i class="mdi mdi-pencil"></i>
                    </button>
                    <button class="icon-action-btn icon-action-btn--danger" @click="deleteService(item)" title="Delete Service">
                        <i class="mdi mdi-delete"></i>
                    </button>
                </template>
            </Table>
        </Card>

        <Dialog v-model="isDrawerOpen">
            <template #header>
                <h2>{{ isNewRecord ? 'New Service Entry' : 'Modify Service' }}</h2>
                <p>Configure labor tasks and master rate pricing multiplier</p>
            </template>

            <div class="form-grid">
                <div class="form-group form-group--full">
                    <label class="form-group__label">Service No <span class="u-required">*</span></label>
                    <input v-model="editingService.serviceNo" type="text" class="form-group__input" placeholder="e.g. SVC-GEN-01" />
                </div>

                <div class="form-group form-group--full">
                    <label class="form-group__label">Internal Code <span class="u-required">*</span></label>
                    <input v-model="editingService.code" type="text" class="form-group__input" :disabled="!isNewRecord" placeholder="e.g. LAB-01" />
                </div>

                <div class="form-group form-group--full">
                    <label class="form-group__label">Service Description Name <span class="u-required">*</span></label>
                    <input v-model="editingService.name" type="text" class="form-group__input" />
                </div>

                <div class="form-group">
                    <label class="form-group__label">Standard Price (RM)</label>
                    <div class="money-input-wrapper">
                        <span class="money-input-wrapper__symbol">$</span>
                        <input v-model.number="editingService.unitPrice" type="number" step="0.01" class="form-group__input u-text-right" />
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-group__label">Unit (UOM)</label>
                    <select v-model="editingService.uom" class="filter-dropdown">
                        <option value="HOUR">Per Hour</option>
                        <option value="JOB">Per Job</option>
                        <option value="TRIP">Per Trip</option>
                        <option value="DAY">Per Day</option>
                    </select>
                </div>

                <div class="form-group form-group--full">
                    <label class="form-group__label">Efficiency Rate / Multiplier</label>
                    <input v-model.number="editingService.rate" type="number" step="0.1" class="form-group__input" placeholder="Standard service rate multiplier" />
                </div>

                <div class="form-group form-group--checkbox-row">
                    <label class="switch-toggle">
                        <input type="checkbox" v-model="editingService.isActive" />
                        <span class="switch-toggle__slider"></span>
                        <span class="switch-toggle__label">Service Availability</span>
                    </label>
                </div>

                <div class="form-group form-group--full">
                    <label class="form-group__label">Service Scope / Details</label>
                    <textarea v-model="editingService.description" rows="4" class="form-group__textarea"></textarea>
                </div>
            </div>

            <template #footer>
                <button class="action-btn action-btn--text" @click="isDrawerOpen = false">Dismiss</button>
                <button class="action-btn action-btn--primary" @click="saveService">Confirm & Save</button>
            </template>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import Chip from "@/components/Chip.vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Dialog from "@/components/Dialog.vue";
import Card from "@/components/Card.vue";

interface ServiceProvided {
    id: number;
    code: string;
    name: string;
    unitPrice: number;
    uom: string;
    rate: number | null;
    description: string;
    serviceNo: string;
    isActive: boolean;
}

const searchString = ref("");
const showActiveOnly = ref(true);
const isDrawerOpen = ref(false);
const isNewRecord = ref(false);

const tableHeaders: TableHeader[] = [
    { key: "code", label: "Service No / Code", width: "25%" },
    { key: "name", label: "Service Name", width: "30%" },
    { key: "uom", label: "UOM", width: "10%" },
    { key: "unitPrice", label: "Base Price", align: "right", width: "15%" },
    { key: "status", label: "Status", width: "10%" },
    { key: "actions", label: "Actions", align: "right", width: "10%" }
];

const editingService = ref<ServiceProvided>({
    id: 0, code: "", name: "", unitPrice: 0, uom: "HOUR", rate: null, description: "", serviceNo: "", isActive: true
});

// Mock Data (对齐 C# 原始集)
const services = ref<ServiceProvided[]>([
    { id: 1, code: "SVC-001", name: "Standard Aircond Overhaul", serviceNo: "REF-GEN-01", unitPrice: 250.00, uom: "JOB", rate: null, description: "Full chemical breakdown flushing and cleaning.", isActive: true },
    { id: 2, code: "LAB-01", name: "Senior Technician Labor Charge", serviceNo: "LAB-SNR", unitPrice: 85.00, uom: "HOUR", rate: 1.2, description: "Hourly base maintenance engineering fee.", isActive: true },
    { id: 3, code: "TRP-KL", name: "Outstation Transport Fee (KL)", serviceNo: "TRP-01", unitPrice: 150.00, uom: "TRIP", rate: null, description: "Travel toll and fuel accommodation standard cost.", isActive: true }
]);

const filteredServices = computed(() => {
    if (!services.value) return [];
    return services.value.filter(x => {
        if (!x) return false;
        
        const search = searchString.value.toLowerCase();
        const matchesSearch = !searchString.value ||
            (x.name && x.name.toLowerCase().includes(search)) ||
            (x.code && x.code.toLowerCase().includes(search)) ||
            (x.serviceNo && x.serviceNo.toLowerCase().includes(search));

        const matchesActive = !showActiveOnly.value || x.isActive;

        return matchesSearch && matchesActive;
    });
});

function prepareCreate() {
    editingService.value = {
        id: 0, code: "", name: "", unitPrice: 0, uom: "HOUR", rate: null, description: "", serviceNo: "", isActive: true
    };
    isNewRecord.value = true;
    isDrawerOpen.value = true;
}

function prepareEdit(service: ServiceProvided) {
    editingService.value = { ...service };
    isNewRecord.value = false;
    isDrawerOpen.value = true;
}

function saveService() {
    if (!editingService.value.serviceNo || !editingService.value.code || !editingService.value.name) {
        alert("Please fill in all mandatory fields.");
        return;
    }

    if (isNewRecord.value) {
        editingService.value.id = Date.now();
        services.value.push({ ...editingService.value });
    } else {
        const index = services.value.findIndex(s => s.code === editingService.value.code);
        if (index !== -1) {
            services.value[index] = { ...editingService.value };
        }
    }
    isDrawerOpen.value = false;
}

function deleteService(service: ServiceProvided) {
    services.value = services.value.filter(s => s.code !== service.code);
}

function formatPrice(value: number) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
</script>

<style lang="scss" scoped>
@mixin flex-row($align: stretch, $gap: 0) {
    display: flex;
    align-items: $align;
    gap: $gap;
}

.services-view {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--spacing-md);
    }
    &__title-area { p { font-size: 13px; color: var(--colors-text-muted); margin: 0; } }
}

// 极简圆形加号雷达
.title-with-action {
    @include flex-row($align: center, $gap: 12px);
    h1 { font-size: 24px; font-weight: 700; margin: 0; color: var(--text-main); }
    
    .icon-action-btn--primary {
        background-color: rgba(80, 88, 242, 0.08);
        color: var(--colors-primary-deepblue);
        border-radius: 50%; width: 32px; height: 32px;
        &:hover { background-color: var(--colors-primary-deepblue); color: white; }
    }
}

// 升级后的左侧镶嵌蓝色装饰条过滤器
.filter-panel {
    background: var(--colors-surface-card);
    border: 1px solid var(--colors-surface-border);
    border-left: 6px solid #06b6d4; // 🌟 完美致敬原版 MudBlazor Info 标志色条
    border-radius: 4px 12px 12px 4px;
    padding: var(--spacing-md);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);

    &__left {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
        flex-grow: 1;
        max-width: 500px;
        @media (max-width: 640px) { flex-direction: column; align-items: flex-start; gap: var(--spacing-sm); }
    }
}

// 纵向混合服务单元格
.service-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    &__no { font-size: 13px; font-weight: 700; color: var(--colors-text-primary); }
    &__code { font-size: 11px; color: var(--colors-text-muted); font-family: monospace; }
}

// 限制最高滚动
.table-scroll-container {
    max-height: 600px;
    overflow-y: auto;
    padding: 0 !important;
}

// 带美圆符号的前缀文本框外壳
.money-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;

    &__symbol {
        position: absolute; left: 12px; font-size: 14px;
        font-weight: 700; color: #94a3b8; pointer-events: none;
    }
    input { padding-left: 28px !important; }
}



// 表单格线
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); }
.form-group {
    display: flex; flex-direction: column; gap: 6px;
    &--full { grid-column: span 2; }
    &--checkbox-row { grid-column: span 2; padding-top: var(--spacing-xs); align-items: center; display: flex; flex-direction: row; }
    &__label { font-size: 13px; font-weight: 600; color: var(--colors-text-primary); }
    &__input, .filter-dropdown, &__textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--colors-surface-border); border-radius: 6px; font-size: 13px; outline: none; font-family: inherit; box-sizing: border-box; background: var(--colors-surface-background); color: var(--colors-text-primary); &:focus { border-color: var(--colors-brand-primary); } }
}

// 公用原子样式
.search-box { position: relative; flex-grow: 1; .search-box__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--colors-text-muted); font-size: 18px; } .search-box__input { width: 100%; padding: 8px 12px 8px 38px; border: 1px solid var(--colors-surface-border); border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; background: var(--colors-surface-background); color: var(--colors-text-primary); &:focus { border-color: var(--colors-brand-primary); } } }
.checkbox-container { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; color: var(--colors-text-primary); input { display: none; } &__box { width: 16px; height: 16px; border: 2px solid var(--colors-surface-border); border-radius: 4px; position: relative; transition: all 0.15s; } input:checked + &__box { background-color: var(--colors-brand-primary); border-color: var(--colors-brand-primary); &::after { content: '✓'; position: absolute; color: white; font-size: 11px; font-weight: bold; left: 2px; top: -2px; } } }
.switch-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; input { display: none; } &__slider { width: 34px; height: 18px; background-color: var(--colors-surface-border); border-radius: 20px; position: relative; transition: background-color 0.2s; &::before { content: ''; position: absolute; left: 2px; top: 2px; width: 14px; height: 14px; background-color: white; border-radius: 50%; transition: transform 0.2s; } } input:checked + &__slider { background-color: #22c55e; &::before { transform: translateX(16px); } } &__label { font-size: 13px; font-weight: 600; color: var(--colors-text-primary); } }
.action-btn { border: none; border-radius: 6px; font-size: 13px; font-weight: 600; padding: 8px 16px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; &--primary { background-color: var(--colors-brand-primary); color: white; &:hover { opacity: 0.9; } } &--text { background: transparent; color: var(--colors-text-muted); &:hover { background: var(--colors-surface-hover); } } }
.icon-action-btn { background: transparent; border: none; font-size: 16px; color: var(--colors-text-secondary); padding: 6px; cursor: pointer; border-radius: 6px; &:hover { background-color: var(--colors-surface-hover); color: var(--colors-brand-primary); } &--danger { &:hover { background-color: rgba(239, 68, 68, 0.1); color: #ef4444; } } }

.u-text-right { text-align: right !important; }
.u-font-mono { font-family: monospace; font-weight: 600; }
.u-font-weight-medium { font-weight: 500; }
.u-font-weight-bold { font-weight: 700; }
.u-text-primary { color: var(--colors-brand-primary) !important; }
.u-required { color: #ef4444; }
</style>