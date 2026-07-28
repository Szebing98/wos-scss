<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Dialog from "@/components/Dialog.vue";
import Badge from "@/components/Badge.vue";
import Button from "@/components/Button.vue";
import { useRouter } from "vue-router";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import MultiSelect from "@/components/MultiSelect.vue";
import DatePicker from "@/components/DatePicker.vue";

interface CustomerModel {
	name: string;
	email: string;
	phone: string;
}

interface EquipmentModel {
	name: string;
	serialNo: string;
	brand: string;
	model: string;
	equipmentType: string;
}

interface TechnicalModel {
	flowHead?: string;
	brandName?: string;
	serialNo?: string;
	ratedVoltage?: string;
	ratedSpeed?: string;
	ratedCurrent?: string;
	ratedPower?: string;
	phase?: string;
	frameSize?: string;
}

interface WorkOrderModel {
	woNumber: string;
	title: string;
	personInCharge: string;
	customer: CustomerModel;
	workType: string;
	status: string;
	rejectedReason?: string;
	createdAt: string;
	estimatedEndDate?: string;
	leadEngineer?: string;
	assistantEngineers?: string[];
	description?: string;
	location?: string;
	latitude?: number;
	longitude?: number;
	equipment?: EquipmentModel;
	technical?: TechnicalModel;
}

const props = defineProps<{
	modelValue: boolean;
	workOrder: WorkOrderModel | null;
	users: { code: string; name: string }[];
	startInEditMode?: boolean;
}>();

const router = useRouter();

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
	(e: "edit", workOrder: WorkOrderModel): void;
	(e: "save-progress", workOrder: WorkOrderModel): void;
}>();

const isOpen = computed({
	get: () => props.modelValue,
	set: (val) => {
		emit("update:modelValue", val);
		if (!val) {
			isEditing.value = false;
		}
	},
});

const isEditing = ref(false);
const editData = ref<Partial<WorkOrderModel>>({});

watch(
	() => props.modelValue,
	(newVal) => {
		if (newVal && props.startInEditMode) {
			startEditing();
		} else if (!newVal) {
			isEditing.value = false;
		}
	},
);

watch(
	() => props.workOrder,
	(newVal) => {
		if (newVal) {
			editData.value = JSON.parse(JSON.stringify(newVal));
			if (!editData.value.assistantEngineers) {
				editData.value.assistantEngineers = [];
			}
		}
	},
	{ immediate: true },
);

function getStatusChipType(status: string) {
	if (!status) return "default";
	switch (status) {
		case "New":
		case "new":
			return "new";
		case "PendingApproval":
		case "pending":
		case "Pending Approval":
			return "pending-approval";
		case "InProgress":
		case "progress":
		case "in-progress":
		case "In Progress":
			return "in-progress";
		case "Done":
		case "done":
			return "done";
		case "Completed":
		case "completed":
			return "completed";
		case "Claimed":
		case "claimed":
			return "claimed";
		case "Closed":
		case "closed":
			return "closed";
		case "Cancelled":
		case "cancelled":
			return "cancelled";
		case "Rejected":
		case "rejected":
			return "rejected";
		default:
			return "default";
	}
}

function formatStatusLabel(status: string) {
	if (!status) return "";
	switch (status) {
		case "PendingApproval":
		case "pending":
		case "Pending Approval":
			return "Pending Approval";
		case "InProgress":
		case "progress":
		case "in-progress":
		case "In Progress":
			return "In Progress";
		case "New":
		case "new":
			return "New";
		case "Done":
		case "done":
			return "Done";
		case "Completed":
		case "completed":
			return "Completed";
		case "Claimed":
		case "claimed":
			return "Claimed";
		case "Closed":
		case "closed":
			return "Closed";
		case "Cancelled":
		case "cancelled":
			return "Cancelled";
		case "Rejected":
		case "rejected":
			return "Rejected";
		default:
			return status.replace(/([a-z])([A-Z])/g, "$1 $2");
	}
}

function handleEdit() {
	if (props.workOrder) {
		emit("edit", props.workOrder);
	}
}

function viewFullDetails() {
	if (props.workOrder) {
		isOpen.value = false;
		router.push({
			name: "Work Order Detail",
			params: { id: props.workOrder.woNumber },
			query: { status: props.workOrder.status.toLowerCase() },
		});
	}
}

function startEditing() {
	isEditing.value = true;
	if (props.workOrder) {
		editData.value = JSON.parse(JSON.stringify(props.workOrder));
		if (!editData.value.assistantEngineers) {
			editData.value.assistantEngineers = [];
		}
	}
}

function cancelEditing() {
	isEditing.value = false;
}

function saveProgress() {
	emit("save-progress", editData.value as WorkOrderModel);
	isEditing.value = false;
}
</script>

<template>
	<Dialog v-model="isOpen" title="Work Order Details" maxWidth="600px">
		<div v-if="workOrder" class="details-view">
			<div class="details-section">
				<h4>General Information</h4>
				<div class="details-grid">
					<div class="detail-item">
						<span class="detail-label">WO #</span>
						<span class="detail-value u-font-mono u-font-weight-medium">{{
							workOrder.woNumber
						}}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Title</span>
						<span class="detail-value u-font-weight-medium">{{ workOrder.title }}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Status</span>
						<span class="detail-value">
							<Badge :type="getStatusChipType(workOrder.status) as any">
								{{ formatStatusLabel(workOrder.status) }}
							</Badge>
						</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Work Type</span>
						<span class="detail-value">{{ workOrder.workType }}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Person In Charge</span>
						<span class="detail-value">{{ workOrder.personInCharge }}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Created At</span>
						<span class="detail-value">{{
							new Date(workOrder.createdAt).toLocaleString()
						}}</span>
					</div>
				</div>
			</div>

			<div class="details-section">
				<h4>Customer Information</h4>
				<div class="details-grid">
					<div class="detail-item">
						<span class="detail-label">Name</span>
						<span class="detail-value">{{ workOrder.customer.name }}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Email</span>
						<span class="detail-value">{{ workOrder.customer.email }}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Phone</span>
						<span class="detail-value">{{ workOrder.customer.phone }}</span>
					</div>
				</div>
			</div>

			<div
				class="details-section"
				v-if="workOrder.description || workOrder.estimatedEndDate || isEditing"
			>
				<h4>Description & Schedule</h4>
				<div class="details-grid" v-if="!isEditing">
					<div
						class="detail-item"
						style="grid-column: 1 / -1"
						v-if="workOrder.description"
					>
						<span class="detail-label">Work Description</span>
						<span
							class="detail-value"
							style="white-space: pre-wrap; line-height: 1.5"
							>{{ workOrder.description }}</span
						>
					</div>
					<div class="detail-item">
						<span class="detail-label">Lead Engineer</span>
						<span class="detail-value">{{
							users.find((u) => u.code === workOrder?.leadEngineer)?.name ||
							workOrder.leadEngineer ||
							"Unassigned"
						}}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Assistant Engineers</span>
						<span class="detail-value">
							{{
								workOrder.assistantEngineers?.length
									? workOrder.assistantEngineers
											.map(
												(code) =>
													users.find((u) => u.code === code)?.name ||
													code,
											)
											.join(", ")
									: "Unassigned"
							}}
						</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Est. Completion</span>
						<span class="detail-value">{{
							workOrder.estimatedEndDate
								? new Date(workOrder.estimatedEndDate).toLocaleString()
								: "Not Set"
						}}</span>
					</div>
				</div>

				<div class="form-grid-edit" v-else>
					<div class="textbox-field">
						<label class="custom-label">Work Description</label>
						<textarea
							v-model="editData.description"
							class="custom-textarea"
							placeholder="Enter Description"
							rows="3"
						></textarea>
					</div>

					<DatePicker
						v-model="editData.estimatedEndDate"
						label="Estimated Date of Completion"
						:enableTime="true"
					/>

					<Select v-model="editData.personInCharge" label="Person In Charge">
						<option value="" disabled>Select Person In Charge</option>
						<option v-for="user in users" :key="user.code" :value="user.code">
							{{ user.name }} ({{ user.code }})
						</option>
					</Select>

					<Select v-model="editData.leadEngineer" label="Lead Engineer">
						<option value="" disabled>Select Lead Engineer</option>
						<option
							v-for="user in users"
							:key="user.code"
							:value="user.code"
							:disabled="editData.assistantEngineers?.includes(user.code)"
						>
							{{ user.name }} ({{ user.code }})
						</option>
					</Select>

					<div class="textbox-field">
						<MultiSelect
							v-model="editData.assistantEngineers"
							:options="
								users.filter(
									(u) =>
										u.code !== editData.leadEngineer &&
										u.code !== editData.personInCharge,
								)
							"
							label="Assistant Engineers"
							placeholder="Search to add engineers..."
						/>
					</div>
				</div>
			</div>

			<div class="details-section" v-if="workOrder.location || isEditing">
				<h4>Location Information</h4>
				<div class="details-grid" v-if="!isEditing">
					<div class="detail-item" style="grid-column: 1 / -1">
						<span class="detail-label">Location</span>
						<span class="detail-value">{{
							workOrder.location || "Not specified"
						}}</span>
					</div>
				</div>
				<div class="form-grid-edit" v-else>
					<Textbox
						v-model="editData.location"
						label="Location"
						placeholder="Enter Location"
					>
						<template #suffix>
							<i class="mdi mdi-map-marker text-muted" style="margin-right: 8px"></i>
						</template>
					</Textbox>
					<div class="map-placeholder">
						<i class="mdi mdi-map"></i>
						<span>Google Map Integration</span>
					</div>
				</div>
			</div>

			<div class="details-section" v-if="workOrder.equipment">
				<h4>Equipment Information</h4>
				<div class="details-grid">
					<div class="detail-item">
						<span class="detail-label">Name</span>
						<span class="detail-value">{{ workOrder.equipment.name }}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Brand</span>
						<span class="detail-value">{{ workOrder.equipment.brand }}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Model</span>
						<span class="detail-value">{{ workOrder.equipment.model }}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Serial No</span>
						<span class="detail-value">{{ workOrder.equipment.serialNo }}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">Type</span>
						<span class="detail-value">{{ workOrder.equipment.equipmentType }}</span>
					</div>
				</div>
			</div>

			<div class="details-section" v-if="workOrder.rejectedReason">
				<h4>Rejection Details</h4>
				<div class="details-grid">
					<div class="detail-item" style="grid-column: 1 / -1">
						<span class="detail-label">Reason</span>
						<span class="detail-value u-text-error">{{
							workOrder.rejectedReason
						}}</span>
					</div>
				</div>
			</div>
		</div>
		<template #footer>
			<template v-if="!isEditing">
				<Button
					v-if="workOrder && !['New', 'PendingApproval'].includes(workOrder.status)"
					variant="outlined"
					@click="viewFullDetails"
				>
					View Full Details
				</Button>
				<div style="flex-grow: 1"></div>
				<Button variant="secondary" @click="isOpen = false">Close</Button>
				<Button
					v-if="
						workOrder &&
						['New', 'PendingApproval', 'InProgress'].includes(
							workOrder.status,
						)
					"
					variant="primary"
					@click="workOrder.status === 'InProgress' ? startEditing() : handleEdit()"
				>
					{{ workOrder.status === "InProgress" ? "Update Progress" : "Edit Work Order" }}
				</Button>
			</template>
			<template v-else>
				<Button variant="secondary" @click="cancelEditing">Cancel</Button>
				<Button variant="primary" @click="saveProgress">Save Progress</Button>
			</template>
		</template>
	</Dialog>
</template>

<style lang="scss" scoped>
.details-view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-lg);
}

.details-section {
	h4 {
		margin: 0 0 var(--spacing-sm) 0;
		font-size: 14px;
		color: var(--colors-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid var(--colors-surface-border);
		padding-bottom: 4px;
	}
}

.details-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing-md);
}

.detail-item {
	display: flex;
	flex-direction: column;
	gap: 4px;

	.detail-label {
		font-size: 12px;
		color: var(--colors-text-muted);
	}
	.detail-value {
		font-size: 14px;
		color: var(--colors-text-primary);
	}
}

.u-font-mono {
	font-family: monospace;
}
.u-font-weight-medium {
	font-weight: 500;
}
.u-text-error {
	color: #ef4444 !important;
}

.form-grid-edit {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
}

.custom-label {
	display: block;
	font-size: 11px;
	font-weight: 600;
	color: var(--colors-text-secondary);
	text-transform: uppercase;
	margin-bottom: 4px;
}

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

	&:focus {
		border-color: var(--colors-brand-primary);
	}
}

.checkbox-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
	border: 1px solid var(--colors-surface-border);
	border-radius: 4px;
	background: var(--colors-surface-background);
	max-height: 150px;
	overflow-y: auto;
}

.checkbox-list-item {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	font-size: 13px;
	color: var(--colors-text-primary);
}

.map-placeholder {
	width: 100%;
	height: 160px;
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
		font-size: 28px;
	}
	span {
		font-size: 13px;
		font-weight: 500;
	}
}
</style>
