<script setup lang="ts">
import { ref, computed } from "vue";
import Card from "@/components/Card.vue";
import Chip from "@/components/Chip.vue";
import Dialog from "@/components/Dialog.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Table from "@/components/Table.vue";
import Textbox from "@/components/Textbox.vue";
import type { TableHeader } from "@/components/Table.vue";

interface WorkType {
	id: number;
	code: string;
	name: string;
	description: string;
	withEquipmentForm: boolean;
	isActive: boolean;
}

interface WorkTypeItem {
	id: number;
	workTypeCode: string;
	code: string;
	name: string;
	description: string;
	isActive: boolean;
}

const searchType = ref("");
const selectedType = ref<WorkType | null>(null);
const isEditing = ref(false);
const isItemDialogOpen = ref(false);
const filterActive = ref("all");
const filterForm = ref("all");

const itemHeaders: TableHeader[] = [
	{ key: "code", label: "Code" },
	{ key: "name", label: "Item Name" },
	{ key: "status", label: "Status" },
	{ key: "actions", label: "Actions", align: "right", width: "100px" },
];

const searchItem = ref("");
const filterItemStatus = ref("all");
const editingItem = ref<WorkTypeItem>({
	id: 0,
	workTypeCode: "",
	code: "",
	name: "",
	description: "",
	isActive: true,
});

const workTypes = ref<WorkType[]>([
	{
		id: 1,
		code: "PM",
		name: "Preventive Maintenance",
		description: "Regular scheduled maintenance routines",
		withEquipmentForm: true,
		isActive: true,
	},
	{
		id: 2,
		code: "BR",
		name: "Breakdown Repair",
		description: "Emergency repair when equipment fails",
		withEquipmentForm: true,
		isActive: true,
	},
	{
		id: 3,
		code: "IN",
		name: "Inspection",
		description: "Standard audit and checkpoints",
		withEquipmentForm: false,
		isActive: true,
	},
]);

const items = ref<WorkTypeItem[]>([
	{
		id: 1,
		workTypeCode: "PM",
		code: "PM-01",
		name: "Engine Oil Change",
		description: "",
		isActive: true,
	},
	{
		id: 2,
		workTypeCode: "PM",
		code: "PM-02",
		name: "Filter Replacement",
		description: "",
		isActive: true,
	},
]);

const filteredWorkTypes = computed(() => {
	let result = workTypes.value;

	if (searchType.value) {
		const q = searchType.value.toLowerCase();
		result = result.filter(
			(t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q),
		);
	}

	if (filterActive.value !== "all") {
		const isActive = filterActive.value === "active";
		result = result.filter((t) => t.isActive === isActive);
	}

	if (filterForm.value !== "all") {
		const isRequired = filterForm.value === "required";
		result = result.filter((t) => t.withEquipmentForm === isRequired);
	}

	return result;
});

const filteredItems = computed(() => {
	if (!selectedType.value) return [];

	let result = items.value.filter((i) => i.workTypeCode === selectedType.value?.code);

	if (searchItem.value) {
		const q = searchItem.value.toLowerCase();
		result = result.filter(
			(i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q),
		);
	}

	if (filterItemStatus.value !== "all") {
		const isActive = filterItemStatus.value === "active";
		result = result.filter((i) => i.isActive === isActive);
	}

	return result;
});

function resetTypeFilter() {
	searchType.value = "";
	filterActive.value = "all";
	filterForm.value = "all";
}

function resetItemFilter() {
	searchItem.value = "";
	filterItemStatus.value = "all";
}

function selectType(type: WorkType) {
	selectedType.value = type;
	isEditing.value = false;
}

function createNewType() {
	console.log("Creating new work type...");
}

function saveType() {
	console.log("Type details updated local-store successfully", selectedType.value);
	isEditing.value = false;
}

function addNewItem() {
	if (!selectedType.value) return;
	editingItem.value = {
		id: 0,
		workTypeCode: selectedType.value.code,
		code: "",
		name: "",
		description: "",
		isActive: true,
	};
	isItemDialogOpen.value = true;
}

function editItem(item: WorkTypeItem) {
	editingItem.value = { ...item };
	isItemDialogOpen.value = true;
}

function saveItem() {
	if (editingItem.value.id === 0) {
		editingItem.value.id = Date.now();
		items.value.push({ ...editingItem.value });
	} else {
		const index = items.value.findIndex((i) => i.code === editingItem.value.code);
		if (index !== -1) items.value[index] = { ...editingItem.value };
	}
	isItemDialogOpen.value = false;
}

function deleteItem(item: WorkTypeItem) {
	items.value = items.value.filter((i) => i.code !== item.code);
}
</script>

<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1>Work Type Maintenance</h1>
				<p class="maintenance-view__subtitle">
					Define service categories and their specific task items
				</p>
			</div>
			<button class="action-btn action-btn--primary" @click="createNewType">
				<i class="mdi mdi-plus"></i> New Work Type
			</button>
		</div>

		<div class="maintenance-grid">
			<div class="maintenance-grid__left-panel">
				<div class="list-controls">
					<Textbox
						v-model="searchType"
						placeholder="Search types..."
						style="flex: 1;"
						hide-footer
					>
						<template #prefix>
							<i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 4px;"></i>
						</template>
					</Textbox>

					<FilterPanel show-reset align="right" @reset="resetTypeFilter">
						<template #trigger="{ isActive }">
							<button
								class="icon-action-btn"
								:class="{ 'icon-action-btn--active': isActive }"
								title="Filter"
							>
								<i class="mdi mdi-filter-variant"></i>
							</button>
						</template>

						<Select v-model="filterActive" label="Status">
							<option value="all">All</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</Select>

						<Select v-model="filterForm" label="Equipment Form">
							<option value="all">All</option>
							<option value="required">Required</option>
							<option value="none">Not Required</option>
						</Select>
					</FilterPanel>
				</div>

				<div class="type-list">
					<template v-if="filteredWorkTypes.length > 0">
						<div
							v-for="type in filteredWorkTypes"
							:key="type.code"
							class="type-card"
							:class="{ 'type-card--selected': selectedType?.code === type.code }"
							@click="selectType(type)"
						>
							<div class="type-card__content">
								<span class="type-card__name">
									{{ type.name }}
									<span class="type-card__code">({{ type.code }})</span>
								</span>
								<div class="type-card__chips">
									<Chip :type="type.isActive ? 'success' : 'default'">
										{{ type.isActive ? "Active" : "Inactive" }}
									</Chip>
									<Chip
										v-if="type.withEquipmentForm"
										type="warning"
										icon="mdi-assignment"
									>
										With Equipment Form
									</Chip>
								</div>
							</div>
						</div>
					</template>
					<div v-else class="empty-state" style="height: auto; min-height: 200px; background: transparent; border: none;">
						<i class="mdi mdi-magnify-close empty-state__icon" style="font-size: 36px; margin-bottom: 8px;"></i>
						<p style="font-size: 13px;">No data found</p>
					</div>
				</div>
			</div>

			<div class="maintenance-grid__right-panel">
				<div v-if="selectedType" class="detail-container">
					<Card>
						<template #header>
							<h2>
								Work Type Details: <strong>{{ selectedType.code }}</strong>
							</h2>
							<button
								v-if="!isEditing"
								class="action-btn action-btn--sm action-btn--outlined"
								@click="isEditing = true"
							>
								<i class="mdi mdi-pencil"></i> Edit
							</button>
							<label v-else class="switch-toggle">
								<input type="checkbox" v-model="selectedType.isActive" />
								<span class="switch-toggle__slider"></span>
								<span class="switch-toggle__label">Active</span>
							</label>
						</template>

						<div v-if="!isEditing" class="detail-view">
							<div class="detail-view__group">
								<label>Work Type Name</label>
								<p>{{ selectedType.name }}</p>
							</div>
							<div class="detail-view__group">
								<label>Status</label>
								<p>
									<Chip :type="selectedType.isActive ? 'success' : 'default'">
										{{ selectedType.isActive ? "Active" : "Inactive" }}
									</Chip>
								</p>
							</div>
							<div class="detail-view__group">
								<label>Equipment Form</label>
								<p>
									{{
										selectedType.withEquipmentForm ? "Required" : "Not Required"
									}}
								</p>
							</div>
							<div class="detail-view__group detail-view__group--full">
								<label>Description</label>
								<p>{{ selectedType.description || "No description provided." }}</p>
							</div>
						</div>

						<div v-else class="form-grid">
							<div class="form-group">
								<label class="form-group__label">Work Type Name</label>
								<Textbox v-model="selectedType.name" />
							</div>
							<div class="form-group form-group--checkbox">
								<label class="checkbox-container">
									<input
										type="checkbox"
										v-model="selectedType.withEquipmentForm"
									/>
									<span class="checkbox-container__box"></span>
									Requires Equipment Form
								</label>
							</div>
							<div class="form-group form-group--full">
								<label class="form-group__label">Description</label>
								<textarea
									v-model="selectedType.description"
									rows="2"
									class="form-group__textarea"
								></textarea>
							</div>
						</div>

						<template #actions v-if="isEditing">
							<button
								class="action-btn action-btn--text action-btn--sm"
								@click="isEditing = false"
							>
								Cancel
							</button>
							<button
								class="action-btn action-btn--primary action-btn--sm"
								@click="saveType"
							>
								Save Changes
							</button>
						</template>
					</Card>

					<Card class="mt-lg">
						<template #header>
							<h2>Work Type Items</h2>
							<button
								class="action-btn action-btn--outlined action-btn--sm"
								@click="addNewItem"
							>
								<i class="mdi mdi-plus"></i> Add Item
							</button>
						</template>

						<div class="list-controls" style="margin-bottom: 16px">
							<Textbox
								v-model="searchItem"
								placeholder="Search items..."
								style="flex: 1;"
								hide-footer
							>
								<template #prefix>
									<i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 4px;"></i>
								</template>
							</Textbox>

							<FilterPanel show-reset align="right" @reset="resetItemFilter">
								<template #trigger="{ isActive }">
									<button
										class="icon-action-btn"
										:class="{ 'icon-action-btn--active': isActive }"
										title="Filter"
									>
										<i class="mdi mdi-filter-variant"></i>
									</button>
								</template>

								<Select v-model="filterItemStatus" label="Status">
									<option value="all">All</option>
									<option value="active">Active</option>
									<option value="inactive">Inactive</option>
								</Select>
							</FilterPanel>
						</div>

						<Table
							:headers="itemHeaders"
							:items="filteredItems"
							emptyMessage="No work items found under this category."
						>
							<template #item-code="{ item }">
								<span class="u-font-mono">{{ item.code }}</span>
							</template>
							<template #item-status="{ item }">
								<span
									class="badge"
									:class="item.isActive ? 'badge--success' : 'badge--disabled'"
								>
									{{ item.isActive ? "Active" : "Disabled" }}
								</span>
							</template>
							<template #item-actions="{ item }">
								<button
									class="icon-action-btn"
									@click="editItem(item)"
									title="Edit"
								>
									<i class="mdi mdi-pencil"></i>
								</button>
								<button
									class="icon-action-btn icon-action-btn--danger"
									@click="deleteItem(item)"
									title="Delete"
								>
									<i class="mdi mdi-delete"></i>
								</button>
							</template>
						</Table>
					</Card>
				</div>

				<div v-else class="empty-state">
					<i class="mdi mdi-category empty-state__icon"></i>
					<p>Select a Work Type to manage its details and items</p>
				</div>
			</div>
		</div>

		<Dialog v-model="isItemDialogOpen">
			<template #header>
				<h3>{{ editingItem.id === 0 ? "New" : "Edit" }} Work Item</h3>
			</template>

			<div class="form-group">
				<label class="form-group__label">Item Code</label>
				<Textbox
					v-model="editingItem.code"
					:disabled="editingItem.id !== 0"
				/>
			</div>
			<div class="form-group">
				<label class="form-group__label">Item Name</label>
				<Textbox v-model="editingItem.name" />
			</div>
			<div class="form-group">
				<label class="form-group__label">Description</label>
				<textarea
					v-model="editingItem.description"
					rows="2"
					class="form-group__textarea"
				></textarea>
			</div>
			<div class="form-group">
				<label class="switch-toggle">
					<input type="checkbox" v-model="editingItem.isActive" />
					<span class="switch-toggle__slider"></span>
					<span class="switch-toggle__label">Active</span>
				</label>
			</div>

			<template #footer>
				<button class="action-btn action-btn--text" @click="isItemDialogOpen = false">
					Cancel
				</button>
				<button class="action-btn action-btn--primary" @click="saveItem">Save Item</button>
			</template>
		</Dialog>
	</div>
</template>

<style lang="scss" scoped>
.maintenance-view {
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
		h1 {
			font-size: var(--typography-fontSize-lg);
			font-weight: var (--typography-fontWeight-bold);
			margin: 0 0 4px 0;
			color: var(--colors-text-primary);
		}
		p {
			font-size: 13px;
			color: var(--colors-text-muted);
			margin: 0;
		}
	}
}

.maintenance-grid {
	display: grid;
	grid-template-columns: 4fr 8fr;
	gap: var(--spacing-lg);
	align-items: start;

	@media (max-width: 960px) {
		grid-template-columns: 1fr;
	}

	&__left-panel {
		background: var(--colors-surface-card);
		border: 1px solid var(--colors-surface-border);
		border-radius: var(--radius-xxs, 12px);
		padding: var(--spacing-md);
		height: 650px;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

		@media (max-width: 960px) {
			height: auto;
			max-height: 400px;
		}
	}

	&__right-panel {
		min-height: 650px;
		height: 100%;

		@media (max-width: 960px) {
			min-height: auto;
		}
	}
}

.list-controls {
	display: flex;
	gap: 8px;
	align-items: center;

	.icon-action-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--colors-surface-background);
		border: 1px solid var(--colors-surface-border);
		border-radius: 6px;
		color: var(--colors-text-secondary);
		cursor: pointer;
		font-size: 20px;

		&:hover,
		&--active {
			background: var(--colors-surface-hover);
			color: var(--colors-brand-primary);
		}
	}
}

.type-list {
	flex-grow: 1;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
}

.type-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	padding: var(--spacing-sm) var(--spacing-md);
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		background-color: var(--colors-surface-hover);
	}

	&--selected {
		background-color: var(--colors-surface-hover) !important;
		border-color: var(--colors-brand-primary) !important;
		.type-item__name {
			color: var(--colors-brand-primary);
		}
	}

	&__content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
	}

	&__name {
		font-size: 14px;
		color: var(--colors-text-primary);
		font-weight: 500;
		display: flex;
		align-items: baseline;
		gap: 4px;

		.type-item--selected & {
			color: var(--colors-text-inverse);
		}

		&--disabled {
			color: var(--colors-text-muted) !important;
			text-decoration: line-through;
		}
	}

	&__code {
		font-size: 12px;
		color: var(--colors-text-secondary);
		font-weight: normal;
		.type-item--selected & {
			color: rgba(255, 255, 255, 0.8);
		}
	}

	&__chips {
		display: flex;
		gap: 6px;
		margin-top: 4px;
		flex-wrap: wrap;
	}
}

.detail-view {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing-lg);

	&__group {
		display: flex;
		flex-direction: column;
		gap: 4px;

		label {
			font-size: 12px;
			font-weight: 600;
			color: var(--colors-text-secondary);
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		p {
			font-size: 14px;
			color: var(--colors-text-primary);
			margin: 0;
			display: flex;
			align-items: center;
		}

		&--full {
			grid-column: 1 / -1;
		}
	}
}

.panel-card {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: var(--radius-xxs, 12px);
	padding: var(--spacing-lg);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-lg);
		h2 {
			font-size: 16px;
			font-weight: 600;
			margin: 0;
			color: var(--colors-text-primary);
		}
	}

	&__actions {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--spacing-md);
	}
}

.form-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing-md);

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 6px;

	&--full {
		grid-column: span 2;
		@media (max-width: 640px) {
			grid-column: span 1;
		}
	}
	&--checkbox {
		justify-content: center;
		padding-top: 18px;
	}

	&__label {
		font-size: 13px;
		font-weight: 500;
		color: #475569;
	}
	&__input,
	&__textarea {
		padding: 8px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		font-family: inherit;
		&:focus {
			border-color: var(--colors-brand-primary);
		}
	}
}

.switch-toggle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;

	input {
		display: none;
	}
	&__slider {
		width: 36px;
		height: 20px;
		background-color: #cbd5e1;
		border-radius: 20px;
		position: relative;
		transition: background-color 0.2s;
		&::before {
			content: "";
			position: absolute;
			left: 2px;
			top: 2px;
			width: 16px;
			height: 16px;
			background-color: white;
			border-radius: 50%;
			transition: transform 0.2s;
		}
	}
	input:checked + &__slider {
		background-color: #22c55e;
		&::before {
			transform: translateX(16px);
		}
	}
	&__label {
		font-size: 13px;
		font-weight: 500;
	}
}

.checkbox-container {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;

	input {
		display: none;
	}
	&__box {
		width: 16px;
		height: 16px;
		border: 2px solid #cbd5e1;
		border-radius: 4px;
		position: relative;
		transition: all 0.15s;
	}
	input:checked + &__box {
		background-color: var(--colors-brand-primary);
		border-color: var(--colors-brand-primary);
		&::after {
			content: "✓";
			position: absolute;
			color: white;
			font-size: 11px;
			font-weight: bold;
			left: 2px;
			top: -2px;
		}
	}
}

// 动作功能小按钮
.action-btn {
	border: none;
	border-radius: 6px;
	font-size: 13px;
	font-weight: 600;
	padding: 8px 16px;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	transition:
		background-color 0.15s,
		filter 0.15s;

	&--primary {
		background-color: var(--colors-brand-primary);
		color: white;
		&:hover {
			filter: brightness(1.1);
		}
	}
	&--outlined {
		background-color: transparent;
		border: 1px solid var(--colors-brand-primary);
		color: var(--colors-brand-primary);
		&:hover {
			background-color: var(--colors-brand-primarySoft);
		}
	}
	&--text {
		background: transparent;
		color: var(--colors-text-secondary);
		&:hover {
			background: var(--colors-surface-hover);
		}
	}
	&--sm {
		padding: 5px 12px;
		font-size: 12px;
	}
}

.icon-action-btn {
	background: transparent;
	border: none;
	font-size: 16px;
	color: #475569;
	padding: 4px;
	cursor: pointer;
	border-radius: 4px;
	&:hover {
		background-color: #f1f5f9;
		color: var(--colors-brand-primary);
	}
	&--danger {
		&:hover {
			background-color: #fef2f2;
			color: #ef4444;
		}
	}
}

.empty-state {
	height: 100%;
	min-height: 400px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-md);
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	color: var(--colors-text-muted);
	&__icon {
		font-size: 5rem;
		opacity: 0.15;
	}
	p {
		font-size: 15px;
		font-weight: 500;
	}
}

.badge {
	padding: 2px 8px;
	border-radius: 12px;
	font-size: 11px;
	font-weight: 600;
	&--success {
		color: #16a34a;
		background-color: #dcfce7;
	}
	&--disabled {
		color: #64748b;
		background-color: #f1f5f9;
	}
}

.mt-lg {
	margin-top: var(--spacing-lg);
}
.u-text-right {
	text-align: right !important;
}
.u-font-mono {
	font-family: monospace;
	font-weight: 600;
}
</style>
