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
import { useSnackbarStore } from "@/stores/snackbar.store";

const snackbar = useSnackbarStore();

interface PartInfo {
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

const editingPart = ref<PartInfo>({
    id: 0, code: "", name: "", unitPrice: 0, uom: "PCS", rate: null, description: "", partNo: "", isActive: true
});

// Mock Data
const parts = ref<PartInfo[]>([
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

function prepareEdit(part: PartInfo) {
    editingPart.value = { ...part };
    isNewRecord.value = false;
    isDrawerOpen.value = true;
}

function savePart() {
    if (!editingPart.value.partNo || !editingPart.value.code || !editingPart.value.name) {
        snackbar.error("Please fill in all required fields.");
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

function deletePart(part: PartInfo) {
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
    <div class="maintenance-view">
        <div class="page-header">
            <div class="page-header__title-area">
                <h1>Part Info</h1>
                <p class="page-header__subtitle">Manage replacement parts, pricing, and units of measure</p>
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
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Disabled Only</option>
                    </Select>
                </FilterPanel>
            </div>

            <Table
                paginate
                :headers="tableHeaders"
                :items="filteredParts"
                emptyMessage="No spare parts found matching your filter criteria."
                style="margin-top: var(--spacing-md);"
            >
                <template #item-code="{ item }">
                    <div style="display: flex; flex-direction: column;">
                        <span class="u-font-mono u-font-weight-bold u-text-primary">{{ item.code }}</span>
                        <span class="u-text-muted" style="font-size: 11px;">Part No: {{ item.partNo }}</span>
                    </div>
                </template>
                <template #item-name="{ item }">
                    <div style="display: flex; flex-direction: column;">
                        <strong style="font-weight: 600;">{{ item.name }}</strong>
                        <span class="u-text-muted" style="font-size: 12px;">{{ item.description || "—" }}</span>
                    </div>
                </template>
                <template #item-uom="{ item }">
                    <Badge type="info" size="sm">{{ item.uom }}</Badge>
                </template>
                <template #item-unitPrice="{ item }">
                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                        <span class="u-font-mono" style="font-weight: 700;">RM {{ formatPrice(item.unitPrice) }}</span>
                        <span v-if="item.rate" class="u-text-muted" style="font-size: 11px;">Rate: RM {{ formatPrice(item.rate) }}</span>
                    </div>
                </template>
                <template #item-status="{ item }">
                    <Badge :type="item.isActive ? 'success' : 'error'">
                        {{ item.isActive ? "Active" : "Disabled" }}
                    </Badge>
                </template>
                <template #item-actions="{ item }">
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="btn btn--icon" @click="prepareEdit(item)" title="Edit Part">
                            <i class="mdi mdi-pencil"></i>
                        </button>
                        <button class="btn btn--icon btn--icon-danger" @click="deletePart(item)" title="Delete Part">
                            <i class="mdi mdi-delete"></i>
                        </button>
                    </div>
                </template>
            </Table>
        </Card>

        <!-- Create / Edit Dialog Modal -->
        <Dialog v-model="isDrawerOpen">
            <template #header>
                <h2>{{ isNewRecord ? "Create Replacement Part" : "Edit Part Info" }}</h2>
                <p>Configure part specifications, UOM, and base pricing</p>
            </template>

            <div class="form-grid">
                <Textbox label="Part Code *" v-model="editingPart.code"
                        :disabled="!isNewRecord"
                        placeholder="e.g. FIL-001, BELT-X"
                        class="u-font-mono"
                    />

                <Textbox label="Part No *" v-model="editingPart.partNo"
                        placeholder="e.g. P-99201, BT-1122"
                        class="u-font-mono"
                    />

                <div class="form-group form-group--full">
                    <label class="form-group__label">Part Name <span class="u-required">*</span></label>
                    <Textbox
                        v-model="editingPart.name"
                        placeholder="e.g. Heavy Duty Oil Filter"
                    />
                </div>

                <Textbox label="Unit Price (RM) *" v-model.number="editingPart.unitPrice"
                        type="number"
                        placeholder="0.00"
                    />

                <Select label="Unit of Measure (UOM)" v-model="editingPart.uom">
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="UNIT">UNIT</option>
                        <option value="SET">SET</option>
                        <option value="BOX">BOX</option>
                        <option value="KG">KG</option>
                        <option value="MTR">MTR (Meter)</option>
                    </Select />

                <div class="form-group form-group--full">
                    <label class="form-group__label">Description</label>
                    <textarea
                        v-model="editingPart.description"
                        rows="3"
                        class="form-group__textarea"
                        placeholder="Detailed part notes or compatibility details..."
                    ></textarea>
                </div>

                <div class="form-group form-group--full" style="padding-top: 8px;">
                    <label class="switch-toggle">
                        <input type="checkbox" v-model="editingPart.isActive" />
                        <span class="switch-toggle__slider"></span>
                        <span class="switch-toggle__label">Active Part (Available for Selection)</span>
                    </label>
                </div>
            </div>

            <template #footer>
                <button class="btn btn--secondary" @click="isDrawerOpen = false">
                    Cancel
                </button>
                <button class="btn btn--primary" @click="savePart">
                    Save Part
                </button>
            </template>
        </Dialog>
    </div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/Maintenance/_part-info.scss";
</style>
