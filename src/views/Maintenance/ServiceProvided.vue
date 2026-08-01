<script setup lang="ts">
import { ref, computed } from "vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Dialog from "@/components/Dialog.vue";
import Card from "@/components/Card.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import NumericField from "@/components/NumericField.vue";
import Badge from "@/components/Badge.vue";

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
const filterStatus = ref("active");
const isDrawerOpen = ref(false);
const isNewRecord = ref(false);

function resetFilters() {
	filterStatus.value = "all";
}

const tableHeaders: TableHeader[] = [
	{ key: "code", label: "Service No / Code", width: "25%" },
	{ key: "name", label: "Service Name", width: "30%" },
	{ key: "uom", label: "UOM", width: "10%" },
	{ key: "unitPrice", label: "Base Price", align: "right", width: "15%" },
	{ key: "status", label: "Status", width: "10%" },
	{ key: "actions", label: "Actions", align: "right", width: "10%" },
];

const editingService = ref<ServiceProvided>({
	id: 0,
	code: "",
	name: "",
	unitPrice: 0,
	uom: "HOUR",
	rate: null,
	description: "",
	serviceNo: "",
	isActive: true,
});

// Mock Data (对齐 C# 原始集)
const services = ref<ServiceProvided[]>([
	{
		id: 1,
		code: "SVC-001",
		name: "Standard Aircond Overhaul",
		serviceNo: "REF-GEN-01",
		unitPrice: 250.0,
		uom: "JOB",
		rate: null,
		description: "Full chemical breakdown flushing and cleaning.",
		isActive: true,
	},
	{
		id: 2,
		code: "LAB-01",
		name: "Senior Technician Labor Charge",
		serviceNo: "LAB-SNR",
		unitPrice: 85.0,
		uom: "HOUR",
		rate: 1.2,
		description: "Hourly base maintenance engineering fee.",
		isActive: true,
	},
	{
		id: 3,
		code: "TRP-KL",
		name: "Outstation Transport Fee (KL)",
		serviceNo: "TRP-01",
		unitPrice: 150.0,
		uom: "TRIP",
		rate: null,
		description: "Travel toll and fuel accommodation standard cost.",
		isActive: true,
	},
]);

const filteredServices = computed(() => {
	if (!services.value) return [];
	return services.value.filter((x) => {
		if (!x) return false;

		const search = searchString.value.toLowerCase();
		const matchesSearch =
			!searchString.value ||
			(x.name && x.name.toLowerCase().includes(search)) ||
			(x.code && x.code.toLowerCase().includes(search)) ||
			(x.serviceNo && x.serviceNo.toLowerCase().includes(search));

		const matchesActive = 
			filterStatus.value === "all" || 
			(filterStatus.value === "active" ? x.isActive : !x.isActive);

		return matchesSearch && matchesActive;
	});
});

function prepareCreate() {
	editingService.value = {
		id: 0,
		code: "",
		name: "",
		unitPrice: 0,
		uom: "HOUR",
		rate: null,
		description: "",
		serviceNo: "",
		isActive: true,
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
	if (
		!editingService.value.serviceNo ||
		!editingService.value.code ||
		!editingService.value.name
	) {
		alert("Please fill in all mandatory fields.");
		return;
	}

	if (isNewRecord.value) {
		editingService.value.id = Date.now();
		services.value.push({ ...editingService.value });
	} else {
		const index = services.value.findIndex((s) => s.code === editingService.value.code);
		if (index !== -1) {
			services.value[index] = { ...editingService.value };
		}
	}
	isDrawerOpen.value = false;
}

function deleteService(service: ServiceProvided) {
	services.value = services.value.filter((s) => s.code !== service.code);
}

function formatPrice(value: number) {
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}
</script>

<template>
	<div class="services-view">
		<div class="page-header">
			<div class="page-header__title-area">
				<h1>Service Catalog</h1>
				<p class="page-header__subtitle">
					Manage labor services, technical fees, and standard rates
				</p>
			</div>
			<button class="btn btn--primary" @click="prepareCreate">
				<i class="mdi mdi-plus"></i> Add Service
			</button>
		</div>

		<Card style="padding: var(--spacing-md);">
			<div class="filter-bar">
				<Textbox
					v-model="searchString"
					placeholder="Search Service No, Name or Code..."
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

		<Card class="table-scroll-container" style="padding: 0">
			<Table
				paginate
				:headers="tableHeaders"
				:items="filteredServices"
				emptyMessage="No labor services matching criteria found."
			>
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
					<Badge type="info">{{ item.uom }}</Badge>
				</template>
				<template #item-unitPrice="{ item }">
					<span class="u-font-weight-bold u-text-primary">
						RM {{ formatPrice(item.unitPrice) }}
					</span>
				</template>
				<template #item-status="{ item }">
					<Badge :type="item.isActive ? 'success' : 'error'">
						{{ item.isActive ? "Active" : "Inactive" }}
					</Badge>
				</template>
				<template #item-actions="{ item }">
					<div style="display: flex; gap: 4px; justify-content: flex-end;">
						<button
							class="btn btn--icon"
							@click="prepareEdit(item)"
							title="Modify Service"
						>
							<i class="mdi mdi-pencil"></i>
						</button>
						<button
							class="btn btn--icon btn--icon-danger"
							@click="deleteService(item)"
							title="Delete Service"
						>
							<i class="mdi mdi-delete"></i>
						</button>
					</div>
				</template>
			</Table>
		</Card>

		<Dialog v-model="isDrawerOpen">
			<template #header>
				<h2>{{ isNewRecord ? "New Service Entry" : "Modify Service" }}</h2>
				<p>Configure labor tasks and master rate pricing multiplier</p>
			</template>

			<div class="form-grid">
				<div class="form-group form-group--full">
					<label class="form-group__label"
						>Service No <span class="u-required">*</span></label
					>
					<Textbox
						v-model="editingService.serviceNo"
						placeholder="e.g. SVC-GEN-01"
					/>
				</div>

				<div class="form-group form-group--full">
					<label class="form-group__label"
						>Internal Code <span class="u-required">*</span></label
					>
					<Textbox
						v-model="editingService.code"
						:disabled="!isNewRecord"
						placeholder="e.g. LAB-01"
					/>
				</div>

				<div class="form-group form-group--full">
					<label class="form-group__label"
						>Service Description Name <span class="u-required">*</span></label
					>
					<Textbox v-model="editingService.name" />
				</div>

				<div class="form-group">
					<NumericField
						v-model="editingService.unitPrice"
						label="Standard Price (RM)"
						currency-symbol="$"
						hide-footer
					/>
				</div>

				<div class="form-group">
					<label class="form-group__label">Unit (UOM)</label>
					<Select v-model="editingService.uom">
						<option value="HOUR">Per Hour</option>
						<option value="JOB">Per Job</option>
						<option value="TRIP">Per Trip</option>
						<option value="DAY">Per Day</option>
					</Select>
				</div>

				<div class="form-group form-group--full">
					<label class="form-group__label">Efficiency Rate / Multiplier</label>
					<Textbox
						v-model.number="editingService.rate"
						type="number"
						step="0.1"
						placeholder="Standard service rate multiplier"
					/>
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
					<textarea
						v-model="editingService.description"
						rows="4"
						class="form-group__textarea"
					></textarea>
				</div>
			</div>

			<template #footer>
				<button class="btn btn--text" @click="isDrawerOpen = false">
					Cancel
				</button>
				<button class="btn btn--primary" @click="saveService">
					Confirm & Save
				</button>
			</template>
		</Dialog>
	</div>
</template>


<style lang="scss" scoped>
@use "@/styles/pages/Maintenance/_service-provided.scss";
</style>
