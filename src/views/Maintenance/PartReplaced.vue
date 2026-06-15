<template>
    <div class="parts-view">
        <!-- 顶部标题与操作 (对齐你之前喜欢的标题右侧加号设计) -->
        <div class="parts-view__header">
            <div class="parts-view__title-area">
                <div class="title-with-action">
                    <h1>Parts Library</h1>
                    <button class="icon-action-btn icon-action-btn--primary" @click="prepareCreate" title="Add New Part">
                        <i class="mdi mdi-plus"></i>
                    </button>
                </div>
                <p class="parts-view__subtitle">Manage replacement parts, pricing, and units of measure</p>
            </div>
        </div>

        <!-- 搜索与过滤器工具栏 -->
        <div class="filter-panel">
            <div class="filter-panel__left">
                <div class="search-box">
                    <i class="mdi mdi-magnify search-box__icon"></i>
                    <input 
                        v-model="searchString" 
                        type="text" 
                        placeholder="Search Code, Name or Part No..." 
                        class="search-box__input"
                    />
                </div>
                <label class="checkbox-container">
                    <input type="checkbox" v-model="showActiveOnly" />
                    <span class="checkbox-container__box"></span>
                    Active Only
                </label>
            </div>
        </div>

        <!-- 零件数据表格 (带固定高度、条纹与悬浮特效) -->
        <Card class="table-scroll-container" style="padding: 0;">
            <Table :headers="tableHeaders" :items="filteredParts" emptyMessage="No replacement parts found in the library.">
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
                    <Chip :type="item.isActive ? 'success' : 'default'">
                        {{ item.isActive ? 'Active' : 'Disabled' }}
                    </Chip>
                </template>
                <template #item-actions="{ item }">
                    <button class="icon-action-btn" @click="prepareEdit(item)" title="Edit Details">
                        <i class="mdi mdi-pencil"></i>
                    </button>
                    <button class="icon-action-btn icon-action-btn--danger" @click="deletePart(item)" title="Delete Part">
                        <i class="mdi mdi-delete"></i>
                    </button>
                </template>
            </Table>
        </Card>

        <!-- 🌟 侧拉滑动式零件控制舱 (Drawer Engine) -->
        <Dialog v-model="isDrawerOpen">
            <template #header>
                <h2>{{ isNewRecord ? 'Create New Part' : 'Edit Part Details' }}</h2>
                <p>Configure hardware components and billing rates</p>
            </template>

            <div class="form-grid">
                <div class="form-group form-group--full">
                    <label class="form-group__label">Part Number <span class="u-required">*</span></label>
                    <input v-model="editingPart.partNo" type="text" class="form-group__input" placeholder="Manufacturer Part No" />
                </div>

                <div class="form-group form-group--full">
                    <label class="form-group__label">Internal System Code <span class="u-required">*</span></label>
                    <input v-model="editingPart.code" type="text" class="form-group__input" :disabled="!isNewRecord" placeholder="e.g. FIL-001" />
                </div>

                <div class="form-group form-group--full">
                    <label class="form-group__label">Part Name <span class="u-required">*</span></label>
                    <input v-model="editingPart.name" type="text" class="form-group__input" />
                </div>

                <div class="form-group">
                    <label class="form-group__label">Unit Price</label>
                    <input v-model.number="editingPart.unitPrice" type="number" step="0.01" class="form-group__input u-text-right" />
                </div>

                <div class="form-group">
                    <label class="form-group__label">UOM</label>
                    <select v-model="editingPart.uom" class="filter-dropdown">
                        <option value="PCS">Pieces (PCS)</option>
                        <option value="SET">Set</option>
                        <option value="UNIT">Unit</option>
                        <option value="LTR">Litre</option>
                    </select>
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
                <button class="action-btn action-btn--text" @click="isDrawerOpen = false">Cancel</button>
                <button class="action-btn action-btn--primary" @click="savePart">Save Changes</button>
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
const showActiveOnly = ref(false);
const isDrawerOpen = ref(false);
const isNewRecord = ref(false);

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

// 多维度综合过滤器
const filteredParts = computed(() => {
    if (!parts.value) return [];
    return parts.value.filter(x => {
        if (!x) return false;
        
        const search = searchString.value.toLowerCase();
        const matchesSearch = !searchString.value ||
            (x.name && x.name.toLowerCase().includes(search)) ||
            (x.code && x.code.toLowerCase().includes(search)) ||
            (x.partNo && x.partNo.toLowerCase().includes(search));

        const matchesActive = !showActiveOnly.value || x.isActive;

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
    // 采用展开运算符浅拷贝隔离，防止修改未保存的数据
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

// 金额千分位本地化格式化辅助
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
        p { font-size: 13px; color: var(--colors-text-muted); margin: 0; }
    }
}

// 标题右侧加号雷达
.title-with-action {
    @include flex-row($align: center, $gap: 12px);
    h1 { font-size: 24px; font-weight: 700; margin: 0; color: var(--text-main); }
    
    .icon-action-btn--primary {
        background-color: rgba(80, 88, 242, 0.08);
        color: var(--colors-primary-deepblue);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        &:hover { background-color: var(--colors-primary-deepblue); color: white; }
    }
}

// 过滤控制面板
.filter-panel {
    background: var(--colors-surface-card);
    border: 1px solid var(--colors-surface-border);
    border-radius: var(--radius-xxs, 12px);
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
    &__input, &__textarea, .filter-dropdown {
        width: 100%; padding: 8px 12px; border: 1px solid var(--colors-surface-border); border-radius: 6px;
        font-size: 13px; outline: none; font-family: inherit; box-sizing: border-box;
        background: var(--colors-surface-background); color: var(--colors-text-primary);
        &:focus { border-color: var(--colors-brand-primary); }
    }
}

// 基础全局公用表格元素
.search-box { position: relative; flex-grow: 1; .search-box__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--colors-text-muted); font-size: 18px; } .search-box__input { width: 100%; padding: 8px 12px 8px 38px; border: 1px solid var(--colors-surface-border); border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; background: var(--colors-surface-background); color: var(--colors-text-primary); &:focus { border-color: var(--colors-brand-primary); } } }
.checkbox-container { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; color: var(--colors-text-primary); input { display: none; } &__box { width: 16px; height: 16px; border: 2px solid var(--colors-surface-border); border-radius: 4px; position: relative; transition: all 0.15s; } input:checked + &__box { background-color: var(--colors-brand-primary); border-color: var(--colors-brand-primary); &::after { content: '✓'; position: absolute; color: white; font-size: 11px; font-weight: bold; left: 2px; top: -2px; } } }
.switch-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; input { display: none; } &__slider { width: 34px; height: 18px; background-color: var(--colors-surface-border); border-radius: 20px; position: relative; transition: background-color 0.2s; &::before { content: ''; position: absolute; left: 2px; top: 2px; width: 14px; height: 14px; background-color: white; border-radius: 50%; transition: transform 0.2s; } } input:checked + &__slider { background-color: #22c55e; &::before { transform: translateX(16px); } } &__label { font-size: 13px; font-weight: 600; color: var(--colors-text-primary); } }
.action-btn { border: none; border-radius: 6px; font-size: 13px; font-weight: 600; padding: 8px 16px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; &--primary { background-color: var(--colors-brand-primary); color: white; &:hover { opacity: 0.9; } } &--text { background: transparent; color: var(--colors-text-muted); &:hover { background: var(--colors-surface-hover); } } }
.icon-action-btn { background: transparent; border: none; font-size: 16px; color: var(--colors-text-secondary); padding: 6px; cursor: pointer; border-radius: 6px; &:hover { background-color: var(--colors-surface-hover); color: var(--colors-brand-primary); } &--danger { &:hover { background-color: rgba(239, 68, 68, 0.1); color: #ef4444; } } }

.u-text-right { text-align: right !important; }
.u-text-primary { color: var(--colors-brand-primary) !important; }
.u-font-mono { font-family: monospace; font-weight: 600; }
.u-font-weight-medium { font-weight: 500; }
.u-font-weight-bold { font-weight: 700; }
.u-required { color: #ef4444; margin-left: 2px; }
</style>