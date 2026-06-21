<script setup lang="ts">
import { ref, computed } from "vue";
import Card from "@/components/Card.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import MultiSelect from "@/components/MultiSelect.vue";
import Button from "@/components/Button.vue";
import Badge from "@/components/Badge.vue";
import DatePicker from "@/components/DatePicker.vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

const isEditMode = computed(() => !!route.params.id);
const pageTitle = computed(() => isEditMode.value ? "Edit Work Order" : "Create New Work Order");

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const nextWeekStr = `${nextWeek.getFullYear()}-${pad(nextWeek.getMonth()+1)}-${pad(nextWeek.getDate())}T${pad(nextWeek.getHours())}:${pad(nextWeek.getMinutes())}`;

const formData = ref({
    status: "Draft",
    orderTypeCode: "mechanical",
    orderTypeItemCode: "",
    title: "",
    description: "",
    customerCode: "",
    salesAgent: "",
    personInChargeCode: "",
    startDate: todayStr,
    estimatedEndDate: nextWeekStr,
    leadEngineerCode: "",
    assistantEngineers: [],
    
    // Equipment
    equipment: {
        name: "",
        serialNo: "",
        brand: "",
        model: "",
        equipmentType: ""
    },
    
    // Technical
    technical: {
        flowHead: "",
        brandName: "",
        serialNo: "",
        ratedVoltage: "",
        ratedSpeed: "",
        ratedCurrent: "",
        ratedPower: "",
        phase: "",
        frameSize: ""
    },

    // Misc
    contractNo: "",
    location: "",
    latitude: 0,
    longitude: 0
});

// Mock Options
const workTypeItems = [
    { code: "wt-01", name: "Installation" },
    { code: "wt-02", name: "Maintenance" },
    { code: "wt-03", name: "Repair" }
];

const users = [
    { code: "usr-1", name: "Alice Smith", role: "Manager" },
    { code: "usr-2", name: "Bob Jones", role: "Sales" },
    { code: "usr-3", name: "Charlie Davis", role: "Engineer" },
    { code: "usr-4", name: "Diana Prince", role: "Engineer" }
];

const customers = [
    { code: "cust-1", name: "Acme Corp" },
    { code: "cust-2", name: "Stark Industries" },
    { code: "cust-3", name: "Wayne Enterprises" }
];

const phases = [
    { id: "1", name: "Single Phase" },
    { id: "2", name: "Two Phase" },
    { id: "3", name: "Three Phase" }
];

const isMechanical = computed(() => formData.value.orderTypeCode === 'mechanical');

const formErrors = ref<Record<string, string>>({});

function validateForm() {
    formErrors.value = {};
    let isValid = true;

    // Required fields for Request Approval
    if (!formData.value.orderTypeItemCode) { formErrors.value.orderTypeItemCode = "Work Type Item is required"; isValid = false; }
    if (!formData.value.title) { formErrors.value.title = "Title is required"; isValid = false; }
    if (!formData.value.personInChargeCode) { formErrors.value.personInChargeCode = "Person in Charge is required"; isValid = false; }
    if (!formData.value.startDate) { formErrors.value.startDate = "Start Date is required"; isValid = false; }
    if (!formData.value.estimatedEndDate) { formErrors.value.estimatedEndDate = "Estimated Date of Completion is required"; isValid = false; }
    if (!formData.value.leadEngineerCode) { formErrors.value.leadEngineerCode = "Lead Engineer is required"; isValid = false; }
    if (!formData.value.description) { formErrors.value.description = "Work Description is required"; isValid = false; }
    if (!formData.value.customerCode) { formErrors.value.customerCode = "Customer is required"; isValid = false; }
    if (!formData.value.contractNo) { formErrors.value.contractNo = "Contract No is required"; isValid = false; }
    if (!formData.value.location) { formErrors.value.location = "Location is required"; isValid = false; }

    // End date must be after start date
    if (formData.value.startDate && formData.value.estimatedEndDate) {
        if (new Date(formData.value.estimatedEndDate) <= new Date(formData.value.startDate)) {
            formErrors.value.estimatedEndDate = "End date must be after the start date";
            isValid = false;
        }
    }

    if (isMechanical.value) {
        if (!formData.value.equipment.name) { formErrors.value['equipment.name'] = "Equipment Name is required"; isValid = false; }
        if (!formData.value.equipment.serialNo) { formErrors.value['equipment.serialNo'] = "Equipment Serial No is required"; isValid = false; }
        if (!formData.value.equipment.brand) { formErrors.value['equipment.brand'] = "Equipment Brand is required"; isValid = false; }
        if (!formData.value.equipment.model) { formErrors.value['equipment.model'] = "Equipment Model is required"; isValid = false; }
        if (!formData.value.equipment.equipmentType) { formErrors.value['equipment.equipmentType'] = "Equipment Type is required"; isValid = false; }

        if (!formData.value.technical.flowHead) { formErrors.value['technical.flowHead'] = "Flow & Head is required"; isValid = false; }
        if (!formData.value.technical.brandName) { formErrors.value['technical.brandName'] = "Brand Name is required"; isValid = false; }
        if (!formData.value.technical.serialNo) { formErrors.value['technical.serialNo'] = "Serial No is required"; isValid = false; }
        if (!formData.value.technical.ratedVoltage) { formErrors.value['technical.ratedVoltage'] = "Rated Voltage is required"; isValid = false; }
        if (!formData.value.technical.ratedSpeed) { formErrors.value['technical.ratedSpeed'] = "Rated Speed is required"; isValid = false; }
        if (!formData.value.technical.ratedCurrent) { formErrors.value['technical.ratedCurrent'] = "Rated Current is required"; isValid = false; }
        if (!formData.value.technical.ratedPower) { formErrors.value['technical.ratedPower'] = "Rated Power is required"; isValid = false; }
        if (!formData.value.technical.phase) { formErrors.value['technical.phase'] = "Phase is required"; isValid = false; }
        if (!formData.value.technical.frameSize) { formErrors.value['technical.frameSize'] = "Frame Size is required"; isValid = false; }
    }
    
    return isValid;
}

function submitForm() {
    formErrors.value = {}; // Clear errors when saving as draft
    console.log("Form Saved as Draft", formData.value);
}

function submitAndRequestApproval() {
    if (!validateForm()) {
        console.error("Validation failed", formErrors.value);
        return;
    }
    console.log("Submitted and requested approval", formData.value);
}

function submitChanges() {
    if (!validateForm()) {
        console.error("Validation failed", formErrors.value);
        return;
    }
    console.log("Changes Saved", formData.value);
}

function toggleAssistantEngineer(code: string) {
    const index = formData.value.assistantEngineers.indexOf(code as never);
    if (index > -1) formData.value.assistantEngineers.splice(index, 1);
    else formData.value.assistantEngineers.push(code as never);
}

function cancel() {
    router.back();
}
</script>

<template>
    <div class="workorder-form-view">
        <div class="workorder-form-view__header">
            <div class="title-area">
                <h1>{{ pageTitle }}</h1>
                <p>Set the work order details, assign the right schedule and resources.</p>
            </div>
            <div class="actions-area">
                <Button variant="secondary" @click="cancel">Cancel</Button>
                <template v-if="!isEditMode || formData.status === 'Draft'">
                    <Button variant="outlined" @click="submitForm">
                        <i class="mdi mdi-content-save-outline"></i> Save as Draft
                    </Button>
                    <Button variant="primary" @click="submitAndRequestApproval">
                        <i class="mdi mdi-check"></i> Save & Request Approval
                    </Button>
                </template>
                <template v-else>
                    <Button variant="primary" @click="submitChanges">
                        <i class="mdi mdi-content-save"></i> Save Changes
                    </Button>
                </template>
            </div>
        </div>

        <div class="form-grid">
            <div class="form-grid__main">
                <!-- Work Order Details -->
                <Card>
                    <template #header>
                        <h2>Work Order Details</h2>
                        <Badge type="info" icon="mdi-clipboard-text-outline">Mechanical</Badge>
                    </template>
                    <div class="grid-row">
                        <div class="col-12">
                            <Select v-model="formData.orderTypeItemCode" label="Work Type Item" :error="formErrors.orderTypeItemCode">
                                <option value="" disabled>Select Work Type Item</option>
                                <option v-for="item in workTypeItems" :key="item.code" :value="item.code">
                                    {{ item.name }}
                                </option>
                            </Select>
                        </div>
                        <div class="col-12">
                            <Textbox v-model="formData.title" label="Title *" placeholder="Enter Title" :error="formErrors.title" />
                        </div>
                        <div class="col-6">
                            <Select v-model="formData.salesAgent" label="Sales Agent" :error="formErrors.salesAgent">
                                <option value="" disabled>Select Sales Agent</option>
                                <option v-for="user in users" :key="user.code" :value="user.code">
                                    {{ user.name }} ({{ user.code }})
                                </option>
                            </Select>
                        </div>
                        <div class="col-6">
                            <Select v-model="formData.personInChargeCode" label="Project Person In Charge *" :error="formErrors.personInChargeCode">
                                <option value="" disabled>Select Person In Charge</option>
                                <option v-for="user in users" :key="user.code" :value="user.code" :disabled="user.code === formData.leadEngineerCode">
                                    {{ user.name }} ({{ user.code }})
                                </option>
                            </Select>
                        </div>
                        <div class="col-6">
                            <DatePicker v-model="formData.startDate" label="Start Date *" :error="formErrors.startDate" :enableTime="true" />
                        </div>
                        <div class="col-6">
                            <DatePicker v-model="formData.estimatedEndDate" label="Estimated Date of Completion *" :min="formData.startDate" :error="formErrors.estimatedEndDate" :enableTime="true" />
                        </div>
                        <div class="col-12">
                            <Select v-model="formData.leadEngineerCode" label="Lead Engineer *" :error="formErrors.leadEngineerCode">
                                <option value="" disabled>Select Lead Engineer</option>
                                <option v-for="user in users" :key="user.code" :value="user.code" :disabled="user.code === formData.personInChargeCode || formData.assistantEngineers.includes(user.code as never)">
                                    {{ user.name }} ({{ user.code }})
                                </option>
                            </Select>
                        </div>
                        <div class="col-12 textbox-field">
                            <MultiSelect 
                                v-model="formData.assistantEngineers" 
                                :options="users.filter(u => u.code !== formData.leadEngineerCode && u.code !== formData.personInChargeCode)" 
                                label="Assistant Engineers" 
                                placeholder="Search to add engineers..." 
                            />
                        </div>
                        <div class="col-12 textbox-field" style="margin-top: 8px;">
                            <label class="custom-label">Work Description *</label>
                            <textarea v-model="formData.description" class="custom-textarea" :class="{'custom-textarea--error': formErrors.description}" placeholder="Enter Description" rows="4"></textarea>
                            <div class="textbox-field__footer" v-if="formErrors.description">
                                <p class="textbox-field__error">
                                    <i class="mdi mdi-alert-circle-outline textbox-field__error-icon"></i>
                                    <span class="textbox-field__error-text">{{ formErrors.description }}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                <!-- Equipment Information -->
                <Card v-if="isMechanical" style="margin-top: var(--spacing-lg);">
                    <template #header>
                        <h2>Equipment Information</h2>
                    </template>
                    <p class="section-subtitle">Capture equipment specifications.</p>
                    <div class="grid-row">
                        <div class="col-6">
                            <Textbox v-model="formData.equipment.name" label="Equipment Name *" placeholder="Enter Equipment name" :error="formErrors['equipment.name']" />
                        </div>
                        <div class="col-6">
                            <Textbox v-model="formData.equipment.serialNo" label="Equipment Serial No *" placeholder="Enter Equipment Serial No" :error="formErrors['equipment.serialNo']" />
                        </div>
                        <div class="col-4">
                            <Textbox v-model="formData.equipment.brand" label="Equipment Brand *" placeholder="Enter Equipment Brand" :error="formErrors['equipment.brand']" />
                        </div>
                        <div class="col-4">
                            <Textbox v-model="formData.equipment.model" label="Equipment Model *" placeholder="Enter Equipment Model" :error="formErrors['equipment.model']" />
                        </div>
                        <div class="col-4">
                            <Textbox v-model="formData.equipment.equipmentType" label="Equipment Type *" placeholder="Enter Equipment Type" :error="formErrors['equipment.equipmentType']" />
                        </div>
                    </div>
                </Card>

                <!-- Mechanical / Technical Information -->
                <Card v-if="isMechanical" style="margin-top: var(--spacing-lg);">
                    <template #header>
                        <h2>Mechanical Information</h2>
                    </template>
                    <p class="section-subtitle">Capture Technical and Electrical specifications.</p>
                    
                    <h3 class="subsection-title">Technical Data</h3>
                    <div class="grid-row">
                        <div class="col-12">
                            <Textbox v-model="formData.technical.flowHead" label="Flow & Head *" placeholder="Enter Flow & Head" :error="formErrors['technical.flowHead']" />
                        </div>
                    </div>

                    <hr class="divider" />

                    <h3 class="subsection-title">Electrical Data</h3>
                    <div class="grid-row">
                        <div class="col-6">
                            <Textbox v-model="formData.technical.brandName" label="Brand Name *" placeholder="Enter Brand Name" :error="formErrors['technical.brandName']" />
                        </div>
                        <div class="col-6">
                            <Textbox v-model="formData.technical.serialNo" label="Serial No *" placeholder="Enter Serial No" :error="formErrors['technical.serialNo']" />
                        </div>
                        <div class="col-4">
                            <Textbox v-model="formData.technical.ratedVoltage" label="Rated Voltage *" placeholder="Enter Rated Voltage" :error="formErrors['technical.ratedVoltage']" />
                        </div>
                        <div class="col-4">
                            <Textbox v-model="formData.technical.ratedSpeed" label="Rated Speed *" placeholder="Enter Rated Speed" :error="formErrors['technical.ratedSpeed']" />
                        </div>
                        <div class="col-4">
                            <Textbox v-model="formData.technical.ratedCurrent" label="Rated Current *" placeholder="Enter Rated Current" :error="formErrors['technical.ratedCurrent']" />
                        </div>
                        <div class="col-4">
                            <Textbox v-model="formData.technical.ratedPower" label="Rated Power *" placeholder="Enter Rated Power" :error="formErrors['technical.ratedPower']" />
                        </div>
                        <div class="col-4">
                            <Select v-model="formData.technical.phase" label="Phase *" :error="formErrors['technical.phase']">
                                <option value="" disabled>Select Phase</option>
                                <option v-for="phase in phases" :key="phase.id" :value="phase.id">
                                    {{ phase.name }}
                                </option>
                            </Select>
                        </div>
                        <div class="col-4">
                            <Textbox v-model="formData.technical.frameSize" label="Frame Size *" placeholder="Enter Frame Size" :error="formErrors['technical.frameSize']" />
                        </div>
                    </div>
                </Card>
            </div>

            <!-- Sidebar -->
            <div class="form-grid__sidebar">
                <Card>
                    <template #header>
                        <h2>Customer</h2>
                    </template>
                    <div class="grid-row">
                        <div class="col-12">
                            <Select v-model="formData.customerCode" label="Customer *" :error="formErrors.customerCode">
                                <option value="" disabled>Select Customer</option>
                                <option v-for="cust in customers" :key="cust.code" :value="cust.code">
                                    {{ cust.name }} ({{ cust.code }})
                                </option>
                            </Select>
                        </div>
                        <div class="col-12">
                            <Textbox v-model="formData.contractNo" label="Contract No *" placeholder="Enter Contract No" :error="formErrors.contractNo" />
                        </div>
                    </div>
                </Card>

                <Card style="margin-top: var(--spacing-lg);">
                    <template #header>
                        <h2>Location</h2>
                    </template>
                    <p class="section-subtitle">Type to search the location or use the pin to mark the location map.</p>
                    <div class="grid-row">
                        <div class="col-12">
                            <Textbox v-model="formData.location" label="Location *" placeholder="Enter Location" :error="formErrors.location">
                                <template #suffix>
                                    <i class="mdi mdi-map-marker text-muted" style="margin-right: 8px;"></i>
                                </template>
                            </Textbox>
                        </div>
                        <div class="col-12">
                            <div class="map-placeholder">
                                <i class="mdi mdi-map"></i>
                                <span>Google Map Integration</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.workorder-form-view {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding-bottom: 40px;

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--spacing-md);
    }
}

.title-area {
    h1 {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 4px;
        color: var(--colors-text-primary);
    }
    p {
        font-size: 13px;
        color: var(--colors-text-muted);
        margin: 0;
    }
}

.actions-area {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);

    @media (min-width: 1024px) {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    }

    &__main {
        display: flex;
        flex-direction: column;
    }

    &__sidebar {
        display: flex;
        flex-direction: column;
    }
}

.grid-row {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -10px;
    
    > [class^="col-"] {
        padding: 10px;
    }
    
    .col-12 {
        flex: 0 0 100%;
        max-width: 100%;
    }
    
    .col-6 {
        flex: 0 0 50%;
        max-width: 50%;
    }
    
    .col-4 {
        flex: 0 0 33.333333%;
        max-width: 33.333333%;
    }
}

.section-subtitle {
    font-size: 13px;
    color: var(--colors-text-muted);
    margin: -10px 0 16px;
}

.subsection-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--colors-text-primary);
    margin: 8px 0 12px;
}

.divider {
    border: none;
    border-top: 1px dashed var(--colors-surface-border);
    margin: 20px 0;
}

.custom-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--colors-text-secondary);
    text-transform: uppercase;
    margin-bottom: 4px;
}

.checkbox-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px; border: 1px solid var(--colors-surface-border); border-radius: 8px; background: var(--colors-surface-background); }
.checkbox-list-item { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; }

.custom-textarea {
    width: 100%;
    padding: 10px 12px;
    border-radius: 4px;
    border: 1px solid var(--colors-surface-border);
    background: var(--colors-surface-card);
    color: var(--colors-text-primary);
    font-size: 13px;
    outline: none;
    resize: vertical;
    transition: border-color 0.2s ease;
    font-family: inherit;

    &--error {
        border-color: var(--colors-state-error);
        
        &:focus {
            box-shadow: 0 0 0 3px rgb(239 68 68 / 0.15);
        }
    }

    &:focus {
        border-color: var(--colors-brand-primary);
    }
}

.map-placeholder {
    width: 100%;
    height: 200px;
    background: var(--colors-surface-background);
    border: 1px dashed var(--colors-surface-border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--colors-text-muted);
    gap: 8px;

    i {
        font-size: 32px;
    }
    span {
        font-size: 13px;
        font-weight: 500;
    }
}
</style>
