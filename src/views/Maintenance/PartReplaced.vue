<script setup lang="ts">
import { ref, computed } from "vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Dialog from "@/components/Dialog.vue";
import Card from "@/components/Card.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Badge from "@/components/Badge.vue";

interface PartReplaced {
    id: number;
    code: string;
    name: string;
    unitPrice: number;
    uom: string;
    rate?: number | null;
    description: string;
    partNo: string;
    isActive: boolean;
}

const searchString = ref("");
const filterStatus = ref("all");
const isDrawerOpen = ref(false);
const isNewRecord = ref(false);

function resetFilters() {
    filterStatus.value = "all";
}

const tableHeaders: TableHeader[] = [
    { key: "code", label: "Code / Part No", width: "25%" },
    { key: "name", label: "Part Name", width: "30%" },
    { key: "uom", label: "UOM", width: "10%" },
    { key: "unitPrice", label: "Unit Price", align: "right", width: "15%" },
    { key: "status", label: "Status", width: "10%" },
    { key: "actions", label: "Actions", align: "right", width: "10%" }
];

const editingPart = ref<PartReplaced>({
    id: 0, code: "", name: "", unitPrice: 0, uom: "PCS", rate: null, description: "", partNo: "", isActive: true
});

// Mock Data
const parts = ref<PartReplaced[]>([
    { id: 1, code: "FIL-001", name: "Oil Filter A7", partNo: "P-99201", unitPrice: 45.50, uom: "PCS", rate: null, description: "Standard engine oil filter", isActive: true },
    { id: 2, code: "BELT-X", name: "V-Belt Heavy Duty", partNo: "BT-1122", unitPrice: 120.00, uom: "UNIT", rate: 15.00, description: "Reinforced rubber drive belt", isActive: true },
    { id: 3, code: "BRK-09", name: "Brake Pad Set", partNo: "BK-8871", unitPrice: 85.00, uom: "SET", rate: null, description: "Front wheels breakdown pads pack", isActive: false }
]);

const filteredParts = computed(() => {
    if (!parts.value) return [];
    return parts.value.filter(x => {
        if (!x) return false;
        
        const search = searchString.value.toLowerCase();
        const matchesSearch = !searchString.value ||
            (x.name && x.name.toLowerCase().includes(search)) ||
            (x.code && x.code.toLowerCase().includes(search)) ||
            (x.partNo && x.partNo.toLowerCase().includes(search));

        const matchesActive = 
            filterStatus.value === "all" || 
            (filterStatus.value === "active" ? x.isActive : !x.isActive);

        return matchesSearch && matchesActive;
    });
});

function prepareCreate() {
    editingPart.value = {
        id: 0, code: "", name: "", unitPrice: 0, uom: "PCS", rate: null, description: "", partNo: "", isActive: true
    };
    isNewRecord.value = true;
    isDrawerOpen.value = true;
}

function prepareEdit(part: PartReplaced) {
    editingPart.value = { ...part };
    isNewRecord.value = false;
    isDrawerOpen.value = true;
}

function savePart() {
    if (!editingPart.value.partNo || !editingPart.value.code || !editingPart.value.name) {
        alert("Please fill in all required fields.");
        return;
    }

    if (isNewRecord.value) {
        editingPart.value.id = Date.now();
        parts.value.push({ ...editingPart.value });
    } else {
        const index = parts.value.findIndex(p => p.code === editingPart.value.code);
        if (index !== -1) {
            parts.value[index] = { ...editingPart.value };
        }
    }
    isDrawerOpen.value = false;
}

function deletePart(part: PartReplaced) {
    parts.value = parts.value.filter(p => p.code !== part.code);
}

function formatPrice(value: number) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
</script>

<template>
    <div class="parts-view">
        <div class="parts-view__header">
            <div class="parts-view__title-area">
                <h1>Parts Library</h1>
                <p class="parts-view__subtitle">Manage replacement parts, pricing, and units of measure</p>
            </div>
            <button class="btn btn--primary" @click="prepareCreate">
                <i class="mdi mdi-plus"></i> Add Part
            </button>
        </div>

        <Card style="padding: var(--spacing-md);">
            <div class="filter-bar">
                <Textbox
                    v-model="searchString"
                    placeholder="Search Code, Name or Part No..."
                    style="flex: 1;"
                    hide-footer
                >
                    <template #prefix>
                        <i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 4px;"></i>
                    </template>
                </Textbox>
                <FilterPanel show-reset align="right" @reset="resetFilters">
                    <Select v-model="filterStatus" label="Status">
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Disabled</option>
                    </Select>
                </FilterPanel>
            </div>
        </Card>

        <Card class="table-scroll-container" style="padding: 0;">
            <Table paginate :headers="tableHeaders" :items="filteredParts" emptyMessage="No replacement parts found in the library.">
                <template #item-code="{ item }">
                    <div class="part-cell">
                        <span class="part-cell__no">{{ item.partNo }}</span>
                        <span class="part-cell__code">Internal: {{ item.code }}</span>
                    </div>
                </template>
                <template #item-name="{ item }">
                    <span class="u-font-weight-medium">{{ item.name }}</span>
                </template>
                <template #item-uom="{ item }">
                    <span class="u-font-mono">{{ item.uom }}</span>
                </template>
                <template #item-unitPrice="{ item }">
                    <span class="u-font-weight-bold u-text-primary">
                        {{ formatPrice(item.unitPrice) }}
                    </span>
                </template>
                <template #item-status="{ item }">
                    <Badge :type="item.isActive ? 'success' : 'error'">
                        {{ item.isActive ? 'Active' : 'Inactive' }}
                    </Badge>
                </template>
                <template #item-actions="{ item }">
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="btn btn--icon" @click="prepareEdit(item)" title="Edit Details">
                            <i class="mdi mdi-pencil"></i>
                        </button>
                        <button class="btn btn--icon btn--icon-danger" @click="deletePart(item)" title="Delete Part">
                            <i class="mdi mdi-delete"></i>
                        </button>
                    </div>
                </template>
            </Table>
        </Card>

        <Dialog v-model="isDrawerOpen">
            <template #header>
                <h2>{{ isNewRecord ? 'Create New Part' : 'Edit Part Details' }}</h2>
                <p>Configure hardware components and billing rates</p>
            </template>

            <div class="form-grid">
                <div class="form-group form-group--full">
                    <label class="form-group__label">Part Number <span class="u-required">*</span></label>
                    <Textbox v-model="editingPart.partNo" placeholder="Manufacturer Part No" />
                </div>

                <div class="form-group form-group--full">
                    <label class="form-group__label">Internal System Code <span class="u-required">*</span></label>
                    <Textbox v-model="editingPart.code" :disabled="!isNewRecord" placeholder="e.g. FIL-001" />
                </div>

                <div class="form-group form-group--full">
                    <label class="form-group__label">Part Name <span class="u-required">*</span></label>
                    <Textbox v-model="editingPart.name" />
                </div>

                <div class="form-group">
                    <label class="form-group__label">Unit Price</label>
                    <input v-model.number="editingPart.unitPrice" type="number" step="0.01" class="form-group__input u-text-right" />
                </div>

                <div class="form-group">
                    <label class="form-group__label">UOM</label>
                    <Select v-model="editingPart.uom">
                        <option value="PCS">Pieces (PCS)</option>
                        <option value="SET">Set</option>
                        <option value="UNIT">Unit</option>
                        <option value="LTR">Litre</option>
                    </Select>
                </div>

                <div class="form-group">
                    <label class="form-group__label">Standard Rate (Optional)</label>
                    <input v-model.number="editingPart.rate" type="number" step="0.01" class="form-group__input" />
                </div>

                <div class="form-group form-group--checkbox-row">
                    <label class="switch-toggle">
                        <input type="checkbox" v-model="editingPart.isActive" />
                        <span class="switch-toggle__slider"></span>
                        <span class="switch-toggle__label">Active Status</span>
                    </label>
                </div>

                <div class="form-group form-group--full">
                    <label class="form-group__label">Notes / Description</label>
                    <textarea v-model="editingPart.description" rows="3" class="form-group__textarea"></textarea>
                </div>
            </div>

            <template #footer>
                <button class="btn btn--text" @click="isDrawerOpen = false">Cancel</button>
                <button class="btn btn--primary" @click="savePart">Save Changes</button>
            </template>
        </Dialog>
    </div>
</template>



<style lang="scss" scoped>
@mixin flex-row($align: stretch, $gap: 0) {
    display: flex;
    align-items: $align;
    gap: $gap;
}

.parts-view {
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

    &__title-area {
        h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: var(--colors-text-primary); }
        p { font-size: 13px; color: var(--colors-text-muted); margin: 0; }
    }
}

// Filter bar inside Card
.filter-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

// 纵向混合零件单元格
.part-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;

    &__no { font-size: 13px; font-weight: 700; color: var(--colors-text-primary); }
    &__code { font-size: 11px; color: var(--colors-text-muted); font-family: monospace; }
}

// 表格滚动高度限制 (复刻 MudTable Height="600px")
.table-scroll-container {
    max-height: 600px;
    overflow-y: auto;
    padding: 0 !important; // 让表格边缘贴合卡片
}



// 内置表单项排版
.form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &--full { grid-column: span 2; }
    &--checkbox-row { grid-column: span 2; padding-top: var(--spacing-xs); align-items: center; display: flex; flex-direction: row; }

    &__label { font-size: 13px; font-weight: 600; color: var(--colors-text-primary); }
    &__input, &__textarea {
        width: 100%; padding: 8px 12px; border: 1px solid var(--colors-surface-border); border-radius: 6px;
        font-size: 13px; outline: none; font-family: inherit; box-sizing: border-box;
        background: var(--colors-surface-background); color: var(--colors-text-primary);
        &:focus { border-color: var(--colors-brand-primary); }
    }
}

.switch-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; input { display: none; } &__slider { width: 34px; height: 18px; background-color: var(--colors-surface-border); border-radius: 20px; position: relative; transition: background-color 0.2s; &::before { content: ''; position: absolute; left: 2px; top: 2px; width: 14px; height: 14px; background-color: var(--colors-text-primary); border-radius: 50%; transition: transform 0.2s; } } input:checked + &__slider { background-color: var(--status-completed); &::before { transform: translateX(16px); background-color: #ffffff; } } &__label { font-size: 13px; font-weight: 600; color: var(--colors-text-primary); } }



.u-text-right { text-align: right !important; }
.u-text-primary { color: var(--colors-brand-primary) !important; }
.u-font-mono { font-family: monospace; font-weight: 600; }
.u-font-weight-medium { font-weight: 500; }
.u-font-weight-bold { font-weight: 700; }
.u-required { color: #ef4444; margin-left: 2px; }
</style>