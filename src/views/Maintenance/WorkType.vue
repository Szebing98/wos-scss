<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Card from "@/components/Card.vue";
import Badge from "@/components/Badge.vue";
import Dialog from "@/components/Dialog.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Table from "@/components/Table.vue";
import Textbox from "@/components/Textbox.vue";
import type { TableHeader } from "@/components/Table.vue";
import http from "@/utils/http";

interface WorkType {
	guid?: string;
	id?: number;
	code: string;
	name: string;
	description: string;
	withEquipmentForm: boolean;
	isActive: boolean;
}

interface WorkTypeItem {
	guid?: string;
	id?: number;
	workTypeGuid?: string;
	workTypeCode?: string;
	code: string;
	name: string;
	description: string;
	isActive: boolean;
}

const searchType = ref("");
const selectedType = ref<WorkType | null>(null);
const isEditing = ref(false);
const isTypeDialogOpen = ref(false);
const isNewRecord = ref(false);
const isItemDialogOpen = ref(false);
const filterActive = ref("all");
const filterForm = ref("all");

const workTypeFormData = ref<Partial<WorkType>>({
	code: "",
	name: "",
	description: "",
	withEquipmentForm: false,
	isActive: true,
});

const itemHeaders: TableHeader[] = [
	{ key: "code", label: "Code", width: "120px", minWidth: "100px" },
	{ key: "name", label: "Item Name", width: "180px", minWidth: "140px" },
	{ key: "description", label: "Description", minWidth: "150px" },
	{ key: "status", label: "Status", width: "100px", minWidth: "90px" },
	{ key: "actions", label: "Actions", align: "right", width: "100px", minWidth: "90px" },
];

const searchItem = ref("");
const filterItemStatus = ref("all");
const editingItem = ref<WorkTypeItem>({
	code: "",
	name: "",
	description: "",
	isActive: true,
});

const workTypes = ref<WorkType[]>([]);
const items = ref<WorkTypeItem[]>([]);

async function fetchWorkTypes() {
	try {
		const res = await http.get("/work-type", { params: { pageSize: 100 } });
		const data = res.data?.data || res.data || [];
		workTypes.value = data;
		if (workTypes.value.length > 0 && !selectedType.value) {
			selectType(workTypes.value[0]);
		}
	} catch (e) {
		console.error("Failed to fetch work types", e);
	}
}

async function selectType(type: WorkType) {
	selectedType.value = { ...type };
	isEditing.value = false;
	await fetchItemsForWorkType(type);
}

async function fetchItemsForWorkType(type: WorkType) {
	if (!type) return;
	try {
		if (type.guid) {
			const res = await http.get(`/work-type/${type.guid}`);
			items.value = res.data?.items || res.data?.data?.items || [];
		} else {
			items.value = [];
		}
	} catch (e) {
		console.error("Failed to fetch work type items", e);
		items.value = [];
	}
}

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
	let result = items.value;

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

function openCreateTypeModal() {
	isNewRecord.value = true;
	workTypeFormData.value = {
		code: "",
		name: "",
		description: "",
		withEquipmentForm: false,
		isActive: true,
	};
	isTypeDialogOpen.value = true;
}

function openEditTypeModal(type: WorkType) {
	isNewRecord.value = false;
	selectedType.value = type;
	workTypeFormData.value = { ...type };
	isTypeDialogOpen.value = true;
}

async function saveTypeModal() {
	if (!workTypeFormData.value.code?.trim() || !workTypeFormData.value.name?.trim()) {
		alert("Work Type Code and Name are required.");
		return;
	}

	try {
		if (isNewRecord.value) {
			const res = await http.post("/work-type", {
				code: workTypeFormData.value.code.trim(),
				name: workTypeFormData.value.name.trim(),
				description: workTypeFormData.value.description || "",
				withEquipmentForm: workTypeFormData.value.withEquipmentForm ?? false,
				isActive: workTypeFormData.value.isActive ?? true,
			});
			if (res.data?.guid) {
				const newType = { ...workTypeFormData.value, guid: res.data.guid } as WorkType;
				selectType(newType);
			}
		} else if (workTypeFormData.value.guid) {
			await http.put(`/work-type/${workTypeFormData.value.guid}`, {
				name: workTypeFormData.value.name.trim(),
				description: workTypeFormData.value.description || "",
				withEquipmentForm: workTypeFormData.value.withEquipmentForm ?? false,
				isActive: workTypeFormData.value.isActive ?? true,
			});
		}
		isTypeDialogOpen.value = false;
		await fetchWorkTypes();
	} catch (e) {
		console.error("Failed to save work type", e);
	}
}

function addNewItem() {
	if (!selectedType.value) return;
	const prefix = (selectedType.value.code || "ITEM").toUpperCase();
	const existingCount = items.value.length;
	const nextSeq = String(existingCount + 1).padStart(4, "0");
	const autoCode = `${prefix}-${nextSeq}`;

	editingItem.value = {
		guid: "",
		code: autoCode,
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

async function saveItem() {
	if (!selectedType.value?.code) return;
	try {
		if (editingItem.value.guid) {
			await http.put(`/work-type-item/${editingItem.value.guid}`, {
				name: editingItem.value.name,
				description: editingItem.value.description,
				isActive: editingItem.value.isActive,
			});
		} else {
			await http.post("/work-type-item", {
				workTypeCode: selectedType.value.code,
				code: editingItem.value.code,
				name: editingItem.value.name,
				description: editingItem.value.description || "",
				isActive: editingItem.value.isActive,
			});
		}
		isItemDialogOpen.value = false;
		await fetchItemsForWorkType(selectedType.value);
	} catch (e) {
		console.error("Failed to save work type item", e);
	}
}

const isConfirmItemStatusOpen = ref(false);
const itemToToggle = ref<WorkTypeItem | null>(null);

function requestToggleItemStatus(item: WorkTypeItem) {
	itemToToggle.value = item;
	isConfirmItemStatusOpen.value = true;
}

async function confirmToggleItemStatus() {
	if (!itemToToggle.value?.guid) return;
	try {
		const newStatus = !itemToToggle.value.isActive;
		await http.put(`/work-type-item/${itemToToggle.value.guid}`, {
			name: itemToToggle.value.name,
			description: itemToToggle.value.description,
			isActive: newStatus,
		});
		isConfirmItemStatusOpen.value = false;
		itemToToggle.value = null;
		if (selectedType.value) {
			await fetchItemsForWorkType(selectedType.value);
		}
	} catch (e) {
		console.error("Failed to toggle item status:", e);
	}
}

onMounted(() => {
	fetchWorkTypes();
});
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
			<button
				class="action-btn action-btn--primary add-worktype-btn"
				@click="openCreateTypeModal"
				style="display: flex; align-items: center; gap: 6px"
			>
				<i class="mdi mdi-plus"></i>
				<span class="btn-text">New Work Type</span>
			</button>
		</div>

		<div class="maintenance-grid">
			<div class="maintenance-grid__left-panel">
				<div class="list-controls">
					<Textbox
						v-model="searchType"
						placeholder="Search types..."
						style="flex: 1"
						hide-footer
					>
						<template #prefix>
							<i
								class="mdi mdi-magnify"
								style="font-size: 18px; margin-right: 4px"
							></i>
						</template>
					</Textbox>

					<FilterPanel show-reset align="right" @reset="resetTypeFilter">
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
									<Badge :type="type.isActive ? 'success' : 'error'">
										{{ type.isActive ? "Active" : "Inactive" }}
									</Badge>
									<Badge
										v-if="type.withEquipmentForm"
										type="info"
										icon="mdi-assignment"
									>
										With Equipment Form
									</Badge>
								</div>
							</div>
						</div>
					</template>
					<div
						v-else
						class="empty-state"
						style="
							height: auto;
							min-height: 200px;
							background: transparent;
							border: none;
						"
					>
						<i
							class="mdi mdi-magnify-close empty-state__icon"
							style="font-size: 36px; margin-bottom: 8px"
						></i>
						<p style="font-size: 13px">No data found</p>
					</div>
				</div>
			</div>

			<div class="maintenance-grid__right-panel">
				<div v-if="selectedType" class="detail-container">
					<Card>
						<template #header>
							<h2>
								{{ selectedType.name }}<strong> ({{ selectedType.code }})</strong>
							</h2>
							<button
								class="action-btn action-btn--sm action-btn--outlined"
								@click="openEditTypeModal(selectedType)"
							>
								<i class="mdi mdi-pencil"></i> Edit
							</button>
						</template>

						<div v-if="!isEditing" class="detail-view">
							<div class="detail-view__group">
								<label>Work Type Name</label>
								<p>{{ selectedType.name }}</p>
							</div>
							<div class="detail-view__group">
								<label>Status</label>
								<p>
									<Badge :type="selectedType.isActive ? 'success' : 'error'">
										{{ selectedType.isActive ? "Active" : "Inactive" }}
									</Badge>
								</p>
							</div>
							<div class="detail-view__group">
								<label>Equipment Form</label>
								<p>
									<Badge
										:type="selectedType.withEquipmentForm ? 'info' : 'warning'"
									>
										{{
											selectedType.withEquipmentForm
												? "Required"
												: "Not Required"
										}}
									</Badge>
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
								@click="saveTypeModal"
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
								style="flex: 1"
								hide-footer
							>
								<template #prefix>
									<i
										class="mdi mdi-magnify"
										style="font-size: 18px; margin-right: 4px"
									></i>
								</template>
							</Textbox>

							<FilterPanel show-reset align="right" @reset="resetItemFilter">
								<Select v-model="filterItemStatus" label="Status">
									<option value="all">All</option>
									<option value="active">Active</option>
									<option value="inactive">Inactive</option>
								</Select>
							</FilterPanel>
						</div>

						<Table
							paginate
							storageKey="worktype-items"
							:headers="itemHeaders"
							:items="filteredItems"
							emptyMessage="No work items found under this category."
						>
							<template #item-code="{ item }">
								<span class="u-font-mono">{{ item.code }}</span>
							</template>
							<template #item-description="{ item }">
								<span class="u-text-muted">{{ item.description || "—" }}</span>
							</template>
							<template #item-status="{ item }">
								<Badge :type="item.isActive ? 'success' : 'error'">
									{{ item.isActive ? "Active" : "Inactive" }}
								</Badge>
							</template>
							<template #item-actions="{ item }">
								<div
									style="
										display: flex;
										gap: 6px;
										justify-content: flex-end;
										align-items: center;
									"
								>
									<button
										class="btn btn--icon"
										@click="editItem(item)"
										title="Edit Item"
									>
										<i class="mdi mdi-pencil"></i>
									</button>
									<button
										class="btn btn--icon"
										@click="requestToggleItemStatus(item)"
										:title="item.isActive ? 'Deactivate Item' : 'Activate Item'"
									>
										<i
											class="mdi"
											:class="
												item.isActive
													? 'mdi-check-circle-outline'
													: 'mdi-pause-circle-outline'
											"
										></i>
									</button>
								</div>
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
				<h2>{{ editingItem.guid ? "Edit Work Type Item" : "Create Work Type Item" }}</h2>
				<p>Manage task item specifications for {{ selectedType?.name }}</p>
			</template>

			<div class="form-group">
				<label class="form-group__label">
					Item Code
					<span
						style="
							font-size: 11px;
							color: var(--colors-text-muted);
							font-weight: normal;
						"
						>(System Auto-Generated)</span
					>
				</label>
				<Textbox v-model="editingItem.code" disabled class="u-font-mono" />
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
					<span class="switch-toggle__label">Activate Work Type Item</span>
				</label>
			</div>

			<template #footer>
				<button class="action-btn action-btn--text" @click="isItemDialogOpen = false">
					Cancel
				</button>
				<button class="action-btn action-btn--primary" @click="saveItem">Save Item</button>
			</template>
		</Dialog>

		<!-- Work Type Create / Edit Dialog Modal -->
		<Dialog v-model="isTypeDialogOpen">
			<template #header>
				<h2>{{ isNewRecord ? "Create Work Type" : "Edit Work Type Details" }}</h2>
				<p>Manage service categories and form requirements</p>
			</template>

			<div class="form-grid">
				<div class="form-group form-group--full">
					<label class="form-group__label"
						>Work Type Code <span class="u-required">*</span></label
					>
					<Textbox
						v-model="workTypeFormData.code"
						:disabled="!isNewRecord"
						placeholder="e.g. WT-ELEC, WT-HVAC"
						class="u-font-mono"
					/>
				</div>

				<div class="form-group form-group--full">
					<label class="form-group__label"
						>Work Type Name <span class="u-required">*</span></label
					>
					<Textbox
						v-model="workTypeFormData.name"
						placeholder="e.g. Electrical Maintenance"
					/>
				</div>

				<div class="form-group form-group--full">
					<label class="form-group__label">Description</label>
					<textarea
						v-model="workTypeFormData.description"
						rows="3"
						class="form-group__textarea"
						placeholder="Optional description of service category..."
					></textarea>
				</div>

				<div class="form-group form-group--full">
					<label class="checkbox-container">
						<input type="checkbox" v-model="workTypeFormData.withEquipmentForm" />
						<span class="checkbox-container__box"></span>
						Requires Equipment Form
					</label>
				</div>

				<div class="form-group form-group--full" style="padding-top: 8px">
					<label class="switch-toggle">
						<input type="checkbox" v-model="workTypeFormData.isActive" />
						<span class="switch-toggle__slider"></span>
						<span class="switch-toggle__label">Activate Work Type</span>
					</label>
				</div>
			</div>

			<template #footer>
				<button class="btn btn--secondary" @click="isTypeDialogOpen = false">Cancel</button>
				<button class="btn btn--primary" @click="saveTypeModal">Save Work Type</button>
			</template>
		</Dialog>

		<!-- Item Status Toggle Confirmation Dialog -->
		<Dialog v-model="isConfirmItemStatusOpen">
			<template #header>
				<h2>Confirm Status Change</h2>
			</template>

			<p style="padding: 8px 0; font-size: 14px; line-height: 1.5">
				Are you sure you want to
				{{ itemToToggle?.isActive ? "deactivate" : "activate" }} work type item
				<strong>"{{ itemToToggle?.name }}"</strong> ({{ itemToToggle?.code }})?
			</p>

			<template #footer>
				<button class="btn btn--secondary" @click="isConfirmItemStatusOpen = false">
					Cancel
				</button>
				<button class="btn btn--primary" @click="confirmToggleItemStatus">Confirm</button>
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

.add-worktype-btn {
	flex-shrink: 0;
	white-space: nowrap;

	@media (max-width: 640px) {
		padding: 8px 12px !important;
		min-width: 40px;

		.btn-text {
			display: none;
		}
	}
}

.maintenance-grid {
	display: grid;
	grid-template-columns: 4fr 8fr;
	gap: var(--spacing-lg);
	align-items: start;
	min-height: 0;

	@media (max-width: 960px) {
		grid-template-columns: 1fr;
	}

	&__left-panel {
		background: var(--colors-surface-card);
		border: 1px solid var(--colors-surface-border);
		border-radius: var(--radius-xxs, 12px);
		padding: var(--spacing-md);
		height: min(650px, calc(100vh - var(--topbar-h) - 170px));
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
		position: sticky;
		top: var(--spacing-lg);

		@media (max-width: 960px) {
			position: static;
			height: auto;
			max-height: 400px;
		}
	}

	&__right-panel {
		height: calc(100vh - var(--topbar-h) - 170px);
		min-height: 480px;
		overflow-y: auto;
		padding-right: 4px;
		scrollbar-gutter: stable;

		@media (max-width: 960px) {
			height: auto;
			min-height: auto;
			overflow: visible;
			padding-right: 0;
		}
	}
}

.list-controls {
	display: flex;
	gap: 8px;
	align-items: center;
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
		background-color: var(--colors-text-inverse);
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
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}
	input:checked + &__box {
		background-color: #ffffff;
		border-color: var(--colors-brand-primary);
		&::after {
			content: "✓";
			color: var(--colors-brand-primary);
			font-size: 12px;
			font-weight: bold;
			line-height: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			margin-top: -1px;
		}
	}
}

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
