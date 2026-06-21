<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from '@/components/Button.vue';
import Card from '@/components/Card.vue';
import Checkbox from '@/components/Checkbox.vue';
import Textbox from '@/components/Textbox.vue';
import Select from '@/components/Select.vue';
import DatePicker from '@/components/DatePicker.vue';
import Table from '@/components/Table.vue';
import Dialog from '@/components/Dialog.vue';
import NumericField from '@/components/NumericField.vue';
import MultiSelect from '@/components/MultiSelect.vue';

const route = useRoute();
const router = useRouter();

const woNumber = route.params.id as string;

// Mock Data
const steps = [
    { label: 'New Request', date: '6 May 2026' },
    { label: 'Request Approved', date: '6 May 2026' },
    { label: 'In Progress', date: '6 May 2026' },
    { label: 'Verifying', date: '' },
    { label: 'Completed', date: '' },
    { label: 'Payment', date: '' },
    { label: 'Closed', date: '' }
];
const currentStepIndex = 2; // In Progress
const isEditing = computed(() => currentStepIndex === 2);

interface ImageRecord { id: number; category: string; url: string; name: string; }
interface LineItem { id: number; code: string; name: string; qty: number; unitPrice: number; subtotal: number; }

const workOrder = ref({
    woNumber: woNumber || 'WO-00032',
    title: 'Test OCR',
    status: 'InProgress',
    workTypeItem: 'New Assembly',
    salesAgent: '',
    projectPersonInCharge: 'usr-3',
    startDate: '2026-06-20T09:00',
    estimatedEndDate: '2026-06-25T17:00',
    description: 'Testing the OCR scanning functionality.',
    location: 'Building A, Floor 3',
    leadEngineer: 'usr-3',
    assistantEngineers: ['usr-4'] as string[],
    customer: { name: 'Globex Corp', email: 'support@globex.com', phone: '555-1234' },
    equipment: { name: 'Conveyor Motor', serialNo: 'SN-998877', brand: 'Siemens', model: 'M-1000', equipmentType: 'Motor' },
    servicesProvided: [] as LineItem[],
    partsReplaced: [] as LineItem[],
    images: [] as ImageRecord[]
});

const users = [
    { code: "usr-1", name: "Alice Admin" },
    { code: "usr-2", name: "Bob Sales" },
    { code: "usr-3", name: "Tommie Parker" },
    { code: "usr-4", name: "Diana Technician" },
];

const workTypes = [
    { code: 'WT-1', name: 'New Assembly' },
    { code: 'WT-2', name: 'Repair' },
    { code: 'WT-3', name: 'Maintenance' },
];

const tabs = [
    { id: 'general', label: 'General' },
    { id: 'activity', label: 'Activity Log' },
    { id: 'services', label: 'Services Provided' },
    { id: 'parts', label: 'Parts Replaced' },
    { id: 'images', label: 'Images' },
    { id: 'notes', label: 'Work Notes' },
    { id: 'finance', label: 'Finance' }
];

const activeTab = ref('general');

const isItemDialogOpen = ref(false);
const itemDialogType = ref<'service' | 'part'>('service');
const editingItemId = ref<number | null>(null);
const itemForm = ref({ code: '', name: '', qty: 1, unitPrice: 0 });

const isMapDialogOpen = ref(false);

const maintenanceServices = [
    { code: 'SRV-001', name: 'Electrical Inspection', defaultPrice: 150 },
    { code: 'SRV-002', name: 'Lighting Replacement', defaultPrice: 75 },
];

const maintenanceParts = [
    { code: 'PRT-001', name: 'LED Tube 120cm', defaultPrice: 20 },
    { code: 'PRT-002', name: 'Ballast Unit', defaultPrice: 45 },
];

function openItemDialog(type: 'service' | 'part') {
    itemDialogType.value = type;
    editingItemId.value = null;
    itemForm.value = { code: '', name: '', qty: 1, unitPrice: 0 };
    isItemDialogOpen.value = true;
}

function editItem(type: 'service' | 'part', id: number) {
    const targetList = type === 'service' ? workOrder.value.servicesProvided : workOrder.value.partsReplaced;
    const found = targetList.find(x => x.id === id);
    if (found) {
        itemDialogType.value = type;
        editingItemId.value = id;
        itemForm.value = { code: found.code, name: found.name, qty: found.qty, unitPrice: found.unitPrice };
        isItemDialogOpen.value = true;
    }
}

function handleItemSelect(code: string) {
    const list = itemDialogType.value === 'service' ? maintenanceServices : maintenanceParts;
    const found = list.find(x => x.code === code);
    if (found) {
        itemForm.value.name = found.name;
        itemForm.value.unitPrice = found.defaultPrice;
    }
}

function addItem() {
    if (!itemForm.value.code) return;
    const subtotal = itemForm.value.qty * itemForm.value.unitPrice;
    const targetList = itemDialogType.value === 'service' ? workOrder.value.servicesProvided : workOrder.value.partsReplaced;
    
    if (editingItemId.value) {
        const found = targetList.find(x => x.id === editingItemId.value);
        if (found) {
            found.code = itemForm.value.code;
            found.name = itemForm.value.name;
            found.qty = itemForm.value.qty;
            found.unitPrice = itemForm.value.unitPrice;
            found.subtotal = subtotal;
        }
    } else {
        targetList.push({
            id: Date.now(),
            code: itemForm.value.code,
            name: itemForm.value.name,
            qty: itemForm.value.qty,
            unitPrice: itemForm.value.unitPrice,
            subtotal
        });
    }
    
    isItemDialogOpen.value = false;
}

function removeItem(type: 'service' | 'part', id: number) {
    const targetList = type === 'service' ? workOrder.value.servicesProvided : workOrder.value.partsReplaced;
    const idx = targetList.findIndex(x => x.id === id);
    if (idx > -1) targetList.splice(idx, 1);
}

const totalServicesCost = computed(() => workOrder.value.servicesProvided.reduce((sum, item) => sum + item.subtotal, 0));
const totalPartsCost = computed(() => workOrder.value.partsReplaced.reduce((sum, item) => sum + item.subtotal, 0));
const totalCost = computed(() => totalServicesCost.value + totalPartsCost.value);

// Assistant Engineers Toggle
function toggleAssistantEngineer(code: string) {
    const index = workOrder.value.assistantEngineers.indexOf(code);
    if (index > -1) workOrder.value.assistantEngineers.splice(index, 1);
    else workOrder.value.assistantEngineers.push(code);
}

// Image Logic
function addDummyImage(category: string) {
    const count = workOrder.value.images.filter(img => img.category === category).length;
    if (count >= 4) {
        alert("Maximum 4 images allowed for " + category);
        return;
    }
    workOrder.value.images.push({
        id: Date.now(),
        category,
        url: 'https://placehold.co/150x150/e2e8f0/64748b?text=Image',
        name: `IMG_${Date.now().toString().slice(-4)}.jpg`
    });
}
function removeImage(id: number) {
    const idx = workOrder.value.images.findIndex(img => img.id === id);
    if (idx > -1) workOrder.value.images.splice(idx, 1);
}

function markAsDone() {
    alert('Work order marked as done!');
}

const tableHeaders = [
    { key: 'name', label: 'Item Name' },
    { key: 'qty', label: 'Quantity' },
    { key: 'unitPrice', label: 'Unit Price ($)' },
    { key: 'subtotal', label: 'Subtotal ($)' },
    { key: 'actions', label: 'Actions', width: '100px' }
];

// Activity Log Mock
const activityLogs = [
    { id: 1, title: 'Work Order Started', description: 'Technician arrived on site.', date: '6 May 2026, 09:00 AM', user: 'Tommie Parker', icon: 'mdi-play-circle', color: 'primary' },
    { id: 2, title: 'Request Approved', description: 'Approval granted by management.', date: '6 May 2026, 08:30 AM', user: 'Alice Admin', icon: 'mdi-check-circle', color: 'success' },
];
</script>

<template>
    <div class="wo-detail-page">
        <!-- Header -->
        <div class="page-header">
            <div class="header-left">
                <div class="breadcrumb">
                    <span class="text-muted">Work Orders</span>
                    <i class="mdi mdi-chevron-right text-muted"></i>
                    <span class="text-muted">In Progress</span>
                    <i class="mdi mdi-chevron-right text-muted"></i>
                    <span class="fw-500">View Detail</span>
                </div>
                <h2>{{ workOrder.woNumber }}</h2>
            </div>
            <div class="header-actions">
                <Button variant="outlined" @click="router.push('/work-order')">
                    <i class="mdi mdi-chevron-left" style="margin-right: 4px;"></i> Back
                </Button>
                <Button variant="primary" @click="markAsDone" v-if="isEditing">Mark as Done</Button>
            </div>
        </div>

        <!-- Horizontal Tabs -->
        <div class="tabs-horizontal">
            <button class="nav-arrow"><i class="mdi mdi-chevron-left"></i></button>
            <div class="tabs-wrapper">
                <div 
                    v-for="tab in tabs" 
                    :key="tab.id" 
                    class="tab-item"
                    :class="{ 'is-active': activeTab === tab.id }"
                    @click="activeTab = tab.id"
                >
                    {{ tab.label }}
                </div>
            </div>
            <button class="nav-arrow"><i class="mdi mdi-chevron-right"></i></button>
        </div>

        <!-- Main Workspace -->
        <div class="workspace-area">
            
            <!-- Alert -->
            <div class="alert-box alert-info" v-if="isEditing">
                <i class="mdi mdi-information"></i>
                <span>Services, parts, images, work notes, and quotation tab are opened. Mark the work order as done if ready.</span>
            </div>

            <!-- Stepper -->
            <div class="stepper-horizontal">
                <div 
                    v-for="(step, index) in steps" 
                    :key="step.label" 
                    class="step"
                    :class="{ 
                        'is-active': index === currentStepIndex,
                        'is-completed': index < currentStepIndex 
                    }"
                >
                    <div class="step-icon-container">
                        <div class="step-circle" :class="{ 'step-circle-completed': index < currentStepIndex }">
                            <i v-if="index === currentStepIndex" class="mdi mdi-hourglass-empty"></i>
                            <i v-else-if="index === 0" class="mdi mdi-file-document-outline"></i>
                            <i v-else-if="index === 1" class="mdi mdi-check-decagram-outline"></i>
                            <i v-else-if="index === 4" class="mdi mdi-clipboard-check-outline"></i>
                            <i v-else-if="index === 5" class="mdi mdi-credit-card-outline"></i>
                            <i v-else-if="index === 6" class="mdi mdi-check-circle-outline"></i>
                            <i v-else class="mdi mdi-circle-medium"></i>
                        </div>
                    </div>
                    <div class="step-content">
                        <div class="step-label">{{ step.label }}</div>
                        <div class="step-date" v-if="step.date">{{ step.date }}</div>
                    </div>
                    <div class="step-line" v-if="index < steps.length - 1"></div>
                </div>
            </div>

            <!-- Content Card -->
            <Card class="content-card">
                <!-- GENERAL TAB -->
                <div v-if="activeTab === 'general'">
                    <div class="card-header">
                        <div class="header-title-flex">
                            <h3>Work Order Details</h3>
                            <Button variant="primary" style="background-color: var(--colors-brand-primary); padding: 4px 12px; font-size: 12px; border-radius: 16px;">
                                <i class="mdi mdi-pipe" style="margin-right: 4px;"></i> PIPING
                            </Button>
                        </div>
                        <p class="text-muted">Set the work order type and assign the right schedule and resources.</p>
                    </div>

                    <div class="form-grid">
                        <div class="col-12"><h4 class="section-title">General Information</h4></div>
                        <div class="col-12">
                            <Select v-model="workOrder.workTypeItem" label="Work Type Item *" disabled>
                                <option v-for="wt in workTypes" :key="wt.code" :value="wt.name">{{ wt.name }}</option>
                            </Select>
                        </div>
                        <div class="col-12">
                            <Textbox v-model="workOrder.title" label="Title *" disabled />
                        </div>
                        <div class="col-6">
                            <Select v-model="workOrder.salesAgent" label="Sales Agent" disabled>
                                <option value="">Select Sales Agent</option>
                                <option v-for="u in users" :key="u.code" :value="u.code">{{ u.name }}</option>
                            </Select>
                        </div>
                        <div class="col-6">
                            <div class="info-label-flex">
                                <i class="mdi mdi-information text-primary" style="margin-right: 4px; font-size: 14px;"></i>
                                <Select v-model="workOrder.projectPersonInCharge" label="Project Person In Charge *" style="flex-grow: 1;" :disabled="!isEditing">
                                    <option v-for="u in users" :key="u.code" :value="u.code">{{ u.name }}</option>
                                </Select>
                            </div>
                        </div>
                        <div class="col-6">
                            <DatePicker v-model="workOrder.startDate" label="Start Date *" :enableTime="true" disabled />
                        </div>
                        <div class="col-6">
                            <DatePicker v-model="workOrder.estimatedEndDate" label="Estimated Date of Completion *" :enableTime="true" :disabled="!isEditing" />
                        </div>

                        <!-- Ported Fields from Dialog -->
                        <div class="col-12"><h4 class="section-title" style="margin-top: 16px;">Execution Details</h4></div>
                        <div class="col-6">
                            <Select v-model="workOrder.leadEngineer" label="Lead Engineer" :disabled="!isEditing">
                                <option value="">Select Lead Engineer</option>
                                <option v-for="u in users" :key="u.code" :value="u.code" :disabled="workOrder.assistantEngineers.includes(u.code)">{{ u.name }}</option>
                            </Select>
                        </div>
                        <div class="col-6">
                            <Textbox v-model="workOrder.location" label="Location" :disabled="!isEditing">
                                <template #suffix>
                                    <button 
                                        class="btn-icon-map" 
                                        @click="isMapDialogOpen = true" 
                                        title="View Map"
                                        :disabled="!isEditing"
                                    >
                                        <i class="mdi mdi-map-marker"></i>
                                    </button>
                                </template>
                            </Textbox>
                        </div>
                        <div class="col-12">
                            <MultiSelect 
                                v-model="workOrder.assistantEngineers" 
                                :options="users.filter(u => u.code !== workOrder.leadEngineer && u.code !== workOrder.projectPersonInCharge)" 
                                label="Assistant Engineers" 
                                placeholder="Search to add engineers..." 
                                :disabled="!isEditing"
                            />
                        </div>

                        <div class="col-12"><h4 class="section-title" style="margin-top: 16px;">Customer & Equipment (Read-Only)</h4></div>
                        <div class="col-4">
                            <label class="custom-label">Customer Name</label>
                            <div class="read-only-val">{{ workOrder.customer.name }}</div>
                        </div>
                        <div class="col-4">
                            <label class="custom-label">Customer Email</label>
                            <div class="read-only-val">{{ workOrder.customer.email }}</div>
                        </div>
                        <div class="col-4">
                            <label class="custom-label">Customer Phone</label>
                            <div class="read-only-val">{{ workOrder.customer.phone }}</div>
                        </div>
                        <div class="col-4">
                            <label class="custom-label">Equipment Name</label>
                            <div class="read-only-val">{{ workOrder.equipment.name }}</div>
                        </div>
                        <div class="col-4">
                            <label class="custom-label">Serial Number</label>
                            <div class="read-only-val">{{ workOrder.equipment.serialNo }}</div>
                        </div>
                    </div>
                </div>

                <!-- SERVICES PROVIDED -->
                <div v-if="activeTab === 'services'">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3>Services Provided</h3>
                            <p class="text-muted">Manage the services executed during this work order.</p>
                        </div>
                        <Button v-if="isEditing" variant="primary" @click="openItemDialog('service')">
                            <i class="mdi mdi-plus" style="margin-right: 4px;"></i> Add Service
                        </Button>
                    </div>

                    <Table :items="workOrder.servicesProvided" :headers="tableHeaders">
                        <template #item-subtotal="{ item }">${{ item.subtotal.toFixed(2) }}</template>
                        <template #item-unitPrice="{ item }">${{ item.unitPrice.toFixed(2) }}</template>
                        <template #item-actions="{ item }">
                            <div style="display: flex; gap: 8px;" v-if="isEditing">
                                <Button variant="outlined" @click="editItem('service', item.id)" style="padding: 4px 8px; font-size: 16px;">
                                    <i class="mdi mdi-pencil"></i>
                                </Button>
                                <Button variant="danger" @click="removeItem('service', item.id)" style="padding: 4px 8px; font-size: 16px;">
                                    <i class="mdi mdi-delete"></i>
                                </Button>
                            </div>
                        </template>
                    </Table>
                    <div class="table-total">
                        <strong>Total Services:</strong> ${{ totalServicesCost.toFixed(2) }}
                    </div>
                </div>

                <!-- PARTS REPLACED -->
                <div v-if="activeTab === 'parts'">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3>Parts Replaced</h3>
                            <p class="text-muted">Manage the parts consumed from inventory.</p>
                        </div>
                        <Button v-if="isEditing" variant="primary" @click="openItemDialog('part')">
                            <i class="mdi mdi-plus" style="margin-right: 4px;"></i> Add Part
                        </Button>
                    </div>

                    <Table :items="workOrder.partsReplaced" :headers="tableHeaders">
                        <template #item-subtotal="{ item }">${{ item.subtotal.toFixed(2) }}</template>
                        <template #item-unitPrice="{ item }">${{ item.unitPrice.toFixed(2) }}</template>
                        <template #item-actions="{ item }">
                            <div style="display: flex; gap: 8px;" v-if="isEditing">
                                <Button variant="outlined" @click="editItem('part', item.id)" style="padding: 4px 8px; font-size: 16px;">
                                    <i class="mdi mdi-pencil"></i>
                                </Button>
                                <Button variant="danger" @click="removeItem('part', item.id)" style="padding: 4px 8px; font-size: 16px;">
                                    <i class="mdi mdi-delete"></i>
                                </Button>
                            </div>
                        </template>
                    </Table>
                    <div class="table-total">
                        <strong>Total Parts:</strong> ${{ totalPartsCost.toFixed(2) }}
                    </div>
                </div>

                <!-- IMAGES -->
                <div v-if="activeTab === 'images'">
                    <div class="card-header">
                        <h3>Job Images</h3>
                        <p class="text-muted">Upload and rename photos for each stage of the job.</p>
                    </div>
                    <div class="image-categories">
                        <div class="image-category" v-for="cat in ['Before', 'In Progress', 'After']" :key="cat">
                            <h4>{{ cat }} <small class="text-muted">({{ workOrder.images.filter(i => i.category === cat).length }}/4)</small></h4>
                            <div class="image-grid">
                                <div class="image-card" v-for="img in workOrder.images.filter(i => i.category === cat)" :key="img.id">
                                    <div class="image-preview" :style="{ backgroundImage: `url(${img.url})` }">
                                        <button v-if="isEditing" class="del-btn" @click="removeImage(img.id)"><i class="mdi mdi-close"></i></button>
                                    </div>
                                    <input v-if="isEditing" type="text" v-model="img.name" class="image-name-input" />
                                    <div v-else class="image-name-display">{{ img.name }}</div>
                                </div>
                                <div class="image-placeholder" v-if="isEditing && workOrder.images.filter(i => i.category === cat).length < 4" @click="addDummyImage(cat)">
                                    <i class="mdi mdi-camera-plus"></i>
                                    <span>Upload Photo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- WORK NOTES -->
                <div v-if="activeTab === 'notes'">
                    <div class="card-header">
                        <h3>Work Notes</h3>
                    </div>
                    <textarea 
                        v-model="workOrder.description"
                        class="custom-textarea" 
                        rows="6" 
                        :disabled="!isEditing"
                        placeholder="Enter detailed work execution notes..."
                    ></textarea>
                </div>

                <!-- FINANCE -->
                <div v-if="activeTab === 'finance'">
                    <div class="card-header">
                        <h3>Finance & Quotation</h3>
                    </div>
                    <div class="finance-grid">
                        <div class="finance-summary-box">
                            <div class="summary-row">
                                <span>Total Services</span>
                                <span>${{ totalServicesCost.toFixed(2) }}</span>
                            </div>
                            <div class="summary-row">
                                <span>Total Parts</span>
                                <span>${{ totalPartsCost.toFixed(2) }}</span>
                            </div>
                            <div class="summary-row total-row">
                                <span>Grand Total</span>
                                <span>${{ totalCost.toFixed(2) }}</span>
                            </div>
                        </div>

                        <div class="file-upload" v-if="isEditing">
                            <i class="mdi mdi-cloud-upload"></i>
                            <span>Drag and drop Quotation PDF here</span>
                            <Button variant="outlined" style="margin-top: 12px;">Browse Files</Button>
                        </div>
                    </div>
                </div>

                <!-- ACTIVITY LOG -->
                <div v-if="activeTab === 'activity'">
                    <div class="card-header">
                        <h3>Activity Log</h3>
                    </div>
                    <div class="timeline">
                        <div class="timeline-item" v-for="log in activityLogs" :key="log.id">
                            <div class="timeline-icon" :class="`icon-${log.color}`">
                                <i :class="`mdi ${log.icon}`"></i>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-header">
                                    <span class="timeline-title">{{ log.title }}</span>
                                    <span class="timeline-date">{{ log.date }}</span>
                                </div>
                                <div class="timeline-body">{{ log.description }}</div>
                                <div class="timeline-user">
                                    <div class="avatar"><i class="mdi mdi-account"></i></div>
                                    <span>{{ log.user }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </Card>
        </div>

        <!-- Add Item Dialog -->
        <Dialog v-model="isItemDialogOpen" :title="`Add ${itemDialogType === 'service' ? 'Service' : 'Part'}`" maxWidth="500px">
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <Select v-model="itemForm.code" label="Select Item *" @update:modelValue="handleItemSelect">
                    <option value="" disabled>Choose...</option>
                    <option v-for="opt in (itemDialogType === 'service' ? maintenanceServices : maintenanceParts)" :key="opt.code" :value="opt.code">
                        {{ opt.name }} ({{ opt.code }})
                    </option>
                </Select>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <NumericField v-model="itemForm.qty" label="Quantity *" />
                    <NumericField v-model="itemForm.unitPrice" label="Unit Price ($) *" />
                </div>
                <div class="dialog-subtotal">
                    Subtotal: <strong>${{ (itemForm.qty * itemForm.unitPrice).toFixed(2) }}</strong>
                </div>
            </div>
            <template #footer>
                <Button variant="secondary" @click="isItemDialogOpen = false">Cancel</Button>
                <Button variant="primary" @click="addItem" :disabled="!itemForm.code">
                    {{ editingItemId ? 'Save Changes' : 'Add to Table' }}
                </Button>
            </template>
        </Dialog>

        <!-- Map Dialog -->
        <Dialog v-model="isMapDialogOpen" title="Location Map" maxWidth="600px">
            <div class="map-container">
                <i class="mdi mdi-map"></i>
                <span>Google Maps Integration</span>
                <p class="text-muted" style="font-size: 13px; margin-top: 8px;">Location: {{ workOrder.location || 'Not Set' }}</p>
            </div>
            <template #footer>
                <Button variant="primary" @click="isMapDialogOpen = false">Close</Button>
            </template>
        </Dialog>
    </div>
</template>

<style lang="scss" scoped>
/* Same CSS as before plus some new additions */
.wo-detail-page { display: flex; flex-direction: column; min-height: 100vh; background: var(--colors-surface-background); }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; padding: 24px 32px 16px 32px; background: white; .header-left { .breadcrumb { font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; i { font-size: 16px; } } h2 { margin: 0; font-size: 28px; color: var(--colors-text-primary); font-weight: 500; } } .header-actions { display: flex; gap: 12px; } }
.tabs-horizontal { display: flex; align-items: center; background: white; padding: 0 16px; border-bottom: 1px solid var(--colors-surface-border); .nav-arrow { background: none; border: none; cursor: pointer; color: var(--colors-text-muted); padding: 8px; font-size: 20px; &:hover { color: var(--colors-text-primary); } } .tabs-wrapper { display: flex; overflow-x: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } } .tab-item { padding: 16px 20px; font-size: 14px; font-weight: 500; color: var(--colors-text-secondary); cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent; transition: all 0.2s; &:hover { color: var(--colors-brand-primary); } &.is-active { color: var(--colors-brand-primary); border-bottom-color: var(--colors-brand-primary); } } }
.workspace-area { padding: 24px 32px; max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 32px; }
.alert-info { display: flex; align-items: flex-start; gap: 12px; background-color: #EBF5FF; color: #1E40AF; padding: 16px 20px; border-radius: 8px; border: 1px solid #BFDBFE; i { font-size: 20px; margin-top: -2px; } span { font-size: 14px; line-height: 1.5; } }
.stepper-horizontal { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; padding: 16px 0; }
.step { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; .step-icon-container { position: relative; z-index: 2; background: var(--colors-surface-background); padding: 0 10px; } .step-circle { width: 40px; height: 40px; border-radius: 50%; background: #F1F5F9; color: var(--colors-text-muted); display: flex; align-items: center; justify-content: center; font-size: 20px; &.step-circle-completed { background: var(--colors-success); color: white; } } .step-content { margin-top: 12px; text-align: center; .step-label { font-size: 12px; font-weight: 500; color: var(--colors-text-secondary); } .step-date { font-size: 11px; color: var(--colors-text-muted); margin-top: 4px; font-weight: 600; } } .step-line { position: absolute; top: 20px; left: 50%; width: 100%; height: 2px; background: #E2E8F0; z-index: 1; } &.is-active { .step-circle { background: var(--colors-brand-primary); color: white; box-shadow: 0 0 0 4px rgba(var(--colors-brand-primary-rgb), 0.15); } .step-label { color: var(--colors-text-primary); font-weight: 600; } } &.is-completed { .step-line { background: var(--colors-success); } } }
.content-card { padding: 32px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); .card-header { margin-bottom: 24px; .header-title-flex { display: flex; align-items: center; justify-content: space-between; } h3 { margin: 0 0 8px 0; font-size: 20px; color: var(--colors-text-primary); } p { margin: 0; font-size: 14px; } } }
.form-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px; .col-12 { grid-column: span 12; } .col-6 { grid-column: span 6; } .col-4 { grid-column: span 4; } }
.section-title { margin: 0; font-size: 16px; color: var(--colors-text-primary); border-bottom: 1px solid var(--colors-surface-border); padding-bottom: 8px; }
.info-label-flex { display: flex; align-items: center; }
.text-muted { color: var(--colors-text-muted); }
.text-primary { color: var(--colors-brand-primary); }
.fw-500 { font-weight: 500; }

.custom-label { display: block; font-size: 11px; font-weight: 600; color: var(--colors-text-secondary); text-transform: uppercase; margin-bottom: 4px; }
.read-only-val { font-size: 14px; color: var(--colors-text-primary); padding: 8px 0; font-weight: 500; }
.checkbox-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px; border: 1px solid var(--colors-surface-border); border-radius: 8px; background: var(--colors-surface-background); }
.checkbox-list-item { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; &.is-disabled { opacity: 0.6; pointer-events: none; } }

.btn-icon-map { background: none; border: none; cursor: pointer; color: var(--colors-text-muted); font-size: 18px; padding: 4px 8px; transition: color 0.2s; &:hover { color: var(--colors-brand-primary); } &:disabled { opacity: 0.5; cursor: not-allowed; } }
.map-container { width: 100%; height: 300px; background: var(--colors-surface-background); border: 2px dashed var(--colors-surface-border); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--colors-text-muted); i { font-size: 48px; color: var(--colors-text-secondary); margin-bottom: 8px; } span { font-weight: 500; font-size: 16px; } }

.table-total { text-align: right; margin-top: 16px; font-size: 18px; color: var(--colors-text-primary); }
.dialog-subtotal { background: var(--colors-surface-background); padding: 12px; border-radius: 8px; text-align: right; font-size: 16px; }

.image-categories { display: flex; flex-direction: column; gap: 24px; .image-category { h4 { margin: 0 0 12px 0; font-size: 14px; color: var(--colors-text-secondary); border-bottom: 1px solid var(--colors-surface-border); padding-bottom: 8px; } } }
.image-grid { display: flex; flex-wrap: wrap; gap: 16px; }
.image-card { display: flex; flex-direction: column; gap: 8px; width: 140px; flex-shrink: 0; .image-preview { aspect-ratio: 1; border-radius: 8px; background-size: cover; background-position: center; position: relative; border: 1px solid var(--colors-surface-border); .del-btn { position: absolute; top: -6px; right: -6px; background: var(--colors-danger); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.2s; &:hover { transform: scale(1.1); } } } .image-name-input { width: 100%; padding: 6px; font-size: 12px; border: 1px solid var(--colors-surface-border); border-radius: 4px; } .image-name-display { font-size: 12px; color: var(--colors-text-secondary); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } }
.image-placeholder { width: 140px; aspect-ratio: 1; border: 2px dashed var(--colors-surface-border); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--colors-text-muted); cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; &:hover { border-color: var(--colors-brand-primary); color: var(--colors-brand-primary); background: rgba(var(--colors-brand-primary-rgb), 0.05); } i { font-size: 24px; } span { font-size: 12px; font-weight: 500; } }

.custom-textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--colors-surface-border); background: var(--colors-surface-card); color: var(--colors-text-primary); font-size: 14px; outline: none; resize: vertical; font-family: inherit; &:focus { border-color: var(--colors-brand-primary); } &:disabled { background: var(--colors-surface-background); opacity: 0.7; } }

.finance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.finance-summary-box { background: var(--colors-surface-background); border: 1px solid var(--colors-surface-border); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 16px; .summary-row { display: flex; justify-content: space-between; font-size: 15px; color: var(--colors-text-secondary); } .total-row { border-top: 1px solid var(--colors-surface-border); padding-top: 16px; font-size: 18px; font-weight: 600; color: var(--colors-text-primary); } }
.file-upload { border: 2px dashed var(--colors-surface-border); border-radius: 12px; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--colors-text-muted); background: var(--colors-surface-background); i { font-size: 48px; color: var(--colors-text-secondary); } span { font-size: 15px; font-weight: 500; } }

/* Timeline */
.timeline { display: flex; flex-direction: column; gap: 24px; }
.timeline-item { display: flex; gap: 16px; }
.timeline-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; &.icon-primary { background: rgba(var(--colors-brand-primary-rgb), 0.1); color: var(--colors-brand-primary); } &.icon-success { background: rgba(16, 185, 129, 0.1); color: #10B981; } &.icon-default { background: #F1F5F9; color: var(--colors-text-muted); } }
.timeline-content { flex-grow: 1; display: flex; flex-direction: column; gap: 4px; .timeline-header { display: flex; justify-content: space-between; align-items: center; .timeline-title { font-weight: 600; font-size: 14px; color: var(--colors-text-primary); } .timeline-date { font-size: 12px; color: var(--colors-text-muted); } } .timeline-body { font-size: 14px; color: var(--colors-text-secondary); margin-bottom: 8px; } .timeline-user { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: var(--colors-text-primary); .avatar { width: 20px; height: 20px; border-radius: 50%; background: #E2E8F0; display: flex; align-items: center; justify-content: center; color: var(--colors-text-secondary); font-size: 12px; } } }
</style>
