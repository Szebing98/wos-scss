<script setup lang="ts">
import PageHeader from "@/components/PageHeader.vue";
import FormLoader from "@/components/FormLoader.vue";
import { ref, computed, onMounted, watch } from "vue";
import Card from "@/components/Card.vue";
import Badge from "@/components/Badge.vue";
import Dialog from "@/components/Dialog.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Table from "@/components/Table.vue";
import Textbox from "@/components/Textbox.vue";
import type { TableHeader } from "@/components/Table.vue";
import { useAuthStore } from "@/stores/auth.store";
import http from "@/utils/http";
import { useSnackbarStore } from "@/stores/snackbar.store";

const snackbar = useSnackbarStore();

const authStore = useAuthStore();

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

const codeError = ref("");

watch(
	() => workTypeFormData.value.code,
	(val) => {
		if (isNewRecord.value && val && val.length > 20) {
			codeError.value = "Work Type Code cannot exceed 20 characters";
		} else {
			codeError.value = "";
		}
	},
);

const itemHeaders = computed<TableHeader[]>(() => {
	const baseHeaders: TableHeader[] = [
		{ key: "code", label: "Code", width: "120px", minWidth: "100px" },
		{ key: "name", label: "Item Name", width: "180px", minWidth: "140px" },
		{ key: "description", label: "Description", minWidth: "150px" },
		{ key: "status", label: "Status", width: "100px", minWidth: "90px" },
	];
	if (authStore.can("update", "WorkTypeItem")) {
		baseHeaders.push({ key: "actions", label: "Actions", align: "right", width: "100px", minWidth: "90px" });
	}
	return baseHeaders;
});

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
const isLoadingItems = ref(false);
const isLoadingWorkTypes = ref(false);
const isSavingType = ref(false);
const isSavingItem = ref(false);
const isUpdatingItemStatus = ref(false);

async function fetchWorkTypes() {
	isLoadingWorkTypes.value = true;
	try {
		const res = await http.get("/work-type", { params: { pageSize: 100 } });
		const data = res.data?.data || res.data || [];
		workTypes.value = data;
		if (workTypes.value.length > 0 && !selectedType.value) {
			selectType(workTypes.value[0]);
		}
	} catch (e) {
		console.error("Failed to fetch work types", e);
	} finally {
		isLoadingWorkTypes.value = false;
	}
}

async function selectType(type: WorkType) {
	selectedType.value = { ...type };
	isEditing.value = false;
	await fetchItemsForWorkType(type);
}

async function fetchItemsForWorkType(type: WorkType) {
	if (!type) return;
	isLoadingItems.value = true;
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
	} finally {
		isLoadingItems.value = false;
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
	codeError.value = "";
	isTypeDialogOpen.value = true;
}

function openEditTypeModal(type: WorkType) {
	isNewRecord.value = false;
	selectedType.value = type;
	workTypeFormData.value = { ...type };
	codeError.value = "";
	isTypeDialogOpen.value = true;
}

async function saveTypeModal() {
	if (isNewRecord.value && codeError.value) {
		return;
	}
	if (!workTypeFormData.value.code?.trim() || !workTypeFormData.value.name?.trim()) {
		snackbar.error("Work Type Code and Name are required.");
		return;
	}
	if (isNewRecord.value && workTypeFormData.value.code && workTypeFormData.value.code.length > 20) {
		codeError.value = "Work Type Code cannot exceed 20 characters";
		return;
	}

	try {
		isSavingType.value = true;
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
	} finally {
		isSavingType.value = false;
	}
}

function addNewItem() {
	if (!selectedType.value) return;
	const prefix = (selectedType.value.code || "ITEM")
		.replace(/\s+/g, "_")
		.replace(/[^a-zA-Z0-9_-]/g, "")
		.toUpperCase();
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
		isSavingItem.value = true;
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
	} finally {
		isSavingItem.value = false;
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
		isUpdatingItemStatus.value = true;
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
	} finally {
		isUpdatingItemStatus.value = false;
	}
}

onMounted(() => {
	fetchWorkTypes();
});
</script>

<template>
	<div class="maintenance-view">
		<PageHeader>
        <template #title>
            <h1>Work Type Maintenance</h1>
                
        </template>
        <template #subtitle>
            <p class="page-header__subtitle">
					Define service categories and their specific task items
				</p>
        </template>
        <template #actions>
            <button
				v-if="authStore.can('create', 'WorkType')"
				class="btn btn--primary add-worktype-btn"
				@click="openCreateTypeModal"
				style="display: flex; align-items: center; gap: 6px"
			>
				<i class="mdi mdi-plus"></i>
				<span class="btn-text">New Work Type</span>
			</button>
        </template>
    </PageHeader>
		<FormLoader v-if="isLoadingWorkTypes" overlay :sections="3" :fields-per-section="4" />

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
								v-if="authStore.can('update', 'WorkType')"
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
							<Textbox label="Work Type Name" v-model="selectedType.name" />
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
							<PageHeader title="Work Type Items" mobile-icon-only style="margin-bottom: 0; width: 100%;">
								<template #actions>
									<button
										v-if="authStore.can('create', 'WorkTypeItem')"
										class="btn btn--primary btn--sm"
										@click="addNewItem"
									>
										<i class="mdi mdi-plus"></i> <span class="btn-text">Add Item</span>
									</button>
								</template>
							</PageHeader>
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
							:loading="isLoadingItems"
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

			<Textbox label="Item Code
					(System Auto-Generated)" v-model="editingItem.code" disabled class="u-font-mono" />
			<Textbox label="Item Name" v-model="editingItem.name" />
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
				<button class="action-btn action-btn--primary" :disabled="isSavingItem" @click="saveItem">
					<i v-if="isSavingItem" class="mdi mdi-loading mdi-spin"></i>
					{{ isSavingItem ? "Saving..." : "Save Item" }}
				</button>
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
						:error="codeError"
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
				<button class="btn btn--primary" :disabled="isSavingType || (isNewRecord && !!codeError)" @click="saveTypeModal">
					<i v-if="isSavingType" class="mdi mdi-loading mdi-spin"></i>
					{{ isSavingType ? "Saving..." : "Save Work Type" }}
				</button>
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
				<button class="btn btn--primary" :disabled="isUpdatingItemStatus" @click="confirmToggleItemStatus">
					<i v-if="isUpdatingItemStatus" class="mdi mdi-loading mdi-spin"></i>
					{{ isUpdatingItemStatus ? "Updating..." : "Confirm" }}
				</button>
			</template>
		</Dialog>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/Maintenance/_work-type.scss";
</style>
