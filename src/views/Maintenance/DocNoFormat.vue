<script setup lang="ts">
import PageHeader from "@/components/PageHeader.vue";
import { ref, computed, onMounted } from "vue";
import Dialog from "@/components/Dialog.vue";
import Card from "@/components/Card.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Select from "@/components/Select.vue";
import Textbox from "@/components/Textbox.vue";
import type { DocNoFormatModel } from "@/api/maintenance/doc-no-format/doc-no-format.types";
import http from "@/utils/http";
import { useSnackbarStore } from "@/stores/snackbar.store";

const snackbar = useSnackbarStore();

const searchString = ref("");
const filterActive = ref("all");
const isNewRecord = ref(false);
const isDialogOpen = ref(false);
const isLoading = ref(false);
const isDeleting = ref(false);
const selectedFormat = ref<DocNoFormatModel | null>(null);

const formData = ref<{
	id?: number;
	module?: string;
	prefix?: string;
	dateFormat?: string;
	delimiter?: string;
	padding?: number;
	nextNumber?: number;
	isActive?: boolean;
	customerCode?: string | null;
}>({
	id: 0,
	module: "",
	prefix: "",
	dateFormat: "YYYYMM",
	delimiter: "-",
	padding: 4,
	nextNumber: 1,
	isActive: true,
	customerCode: null,
});

const formats = ref<DocNoFormatModel[]>([]);

async function loadFormats() {
	isLoading.value = true;
	try {
		const res = await http.get("/doc-no-format", { params: { pageSize: 100 } });
		const rawData = res?.data?.data || res?.data?.items || res?.data || [];
		formats.value = Array.isArray(rawData) ? rawData : [];
		if (!selectedFormat.value && formats.value.length > 0) {
			selectedFormat.value = formats.value[0];
		}
	} catch (err) {
		console.error("Failed to load DocNoFormat list:", err);
		formats.value = [];
	} finally {
		isLoading.value = false;
	}
}

onMounted(() => {
	loadFormats();
});

const filteredFormats = computed(() => {
	if (!formats.value) return [];
	return formats.value.filter((x) => {
		if (!x) return false;
		const search = searchString.value.toLowerCase();
		const matchesSearch =
			!searchString.value ||
			(x.module && x.module.toLowerCase().includes(search)) ||
			(x.prefix && x.prefix.toLowerCase().includes(search));

		const matchesStatus =
			filterActive.value === "all" ||
			(filterActive.value === "active" && x.isActive) ||
			(filterActive.value === "inactive" && !x.isActive);

		return matchesSearch && matchesStatus;
	});
});

function resetFilter() {
	filterActive.value = "all";
	searchString.value = "";
}

function selectFormat(item: DocNoFormatModel) {
	selectedFormat.value = item;
}

function generatePreview(format?: Partial<DocNoFormatModel> | null) {
	if (!format || !format.prefix) return "---";

	let datePart = "";
	const date = new Date();
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	if (format.dateFormat) {
		switch (format.dateFormat.toUpperCase()) {
			case "YYYYMMDD":
				datePart = `${year}${month}${day}`;
				break;
			case "YYYYMM":
				datePart = `${year}${month}`;
				break;
			case "YYMM":
				datePart = `${String(year).slice(-2)}${month}`;
				break;
			case "YYYY":
				datePart = `${year}`;
				break;
		}
	}

	const paddedNumber = String(format.nextNumber || 1).padStart(format.padding || 4, "0");

	let result = format.prefix;

	if (datePart) {
		result += (format.delimiter ?? "") + datePart;
	}

	result += (format.delimiter ?? "") + paddedNumber;

	return result;
}

function openCreateModal() {
	isNewRecord.value = true;
	formData.value = {
		id: 0,
		module: "",
		prefix: "",
		dateFormat: "YYYYMM",
		delimiter: "-",
		padding: 4,
		nextNumber: 1,
		isActive: true,
		customerCode: null,
	};
	isDialogOpen.value = true;
}

function openEditModal() {
	if (!selectedFormat.value) return;
	isNewRecord.value = false;
	formData.value = {
		...selectedFormat.value,
		dateFormat: selectedFormat.value.dateFormat || "",
	};
	isDialogOpen.value = true;
}

async function saveFormat() {
	if (!formData.value.module?.trim() || !formData.value.prefix?.trim()) {
		snackbar.error("Module Code and Prefix are mandatory fields.");
		return;
	}

	const payload = {
		module: formData.value.module.trim().toUpperCase(),
		prefix: formData.value.prefix.trim(),
		dateFormat: formData.value.dateFormat || "",
		delimiter: formData.value.delimiter ?? "-",
		padding: Number(formData.value.padding) || 4,
		nextNumber: Number(formData.value.nextNumber) || 1,
		isActive: formData.value.isActive ?? true,
		customerCode: formData.value.customerCode || null,
	};

	try {
		if (isNewRecord.value) {
			await http.post("/doc-no-format", payload);
		} else if (selectedFormat.value?.id) {
			await http.put(`/doc-no-format/${selectedFormat.value.id}`, payload);
		}
		isDialogOpen.value = false;
		await loadFormats();
	} catch (e) {
		console.error("Failed to save format:", e);
	}
}

function prepareNewFormat() {
	openCreateModal();
}

function promptDelete(item: DocNoFormatModel) {
	selectedFormat.value = item;
	isDeleting.value = true;
}

async function executeDelete() {
	if (!selectedFormat.value?.id) return;
	try {
		await http.delete(`/doc-no-format/${selectedFormat.value.id}`);
		selectedFormat.value = null;
		isDeleting.value = false;
		await loadFormats();
	} catch (e) {
		console.error("Failed to delete format:", e);
	}
}
</script>

<template>
	<div class="maintenance-view">
		<PageHeader>
        <template #title>
            <h1>Document Number Format</h1>
                
        </template>
        <template #subtitle>
            <p class="page-header__subtitle">
					Configure numbering rules and generation patterns for system modules
				</p>
        </template>
        <template #actions>
            <button class="btn btn--primary" @click="prepareNewFormat">
				<i class="mdi mdi-plus"></i><span class="btn-text">New Format Rule</span></button>
        </template>
    </PageHeader>

		<div class="maintenance-grid">
			<Card class="maintenance-grid__left-panel">
				<div class="list-controls">
					<Textbox
						v-model="searchString"
						placeholder="Search module or prefix..."
						style="flex: 1;"
						hide-footer
					>
						<template #prefix>
							<i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 4px;"></i>
						</template>
					</Textbox>

					<FilterPanel show-reset align="right" @reset="resetFilter">
						<Select v-model="filterActive" label="Status">
							<option value="all">All</option>
							<option value="active">Active</option>
							<option value="inactive">Disabled</option>
						</Select>
					</FilterPanel>
				</div>

				<div class="type-list">
					<div
						v-for="item in filteredFormats"
						:key="item.id"
						class="type-card"
						:class="{ 'type-card--selected': selectedFormat?.id === item.id }"
						@click="selectFormat(item)"
					>
						<div class="type-card__content">
							<span class="type-card__name">{{ item.module }}</span>
							<span class="type-card__code"
								>Preview: {{ generatePreview(item) }}</span
							>
						</div>
						<Badge :type="item.isActive ? 'success' : 'error'">
							{{ item.isActive ? "Active" : "Disabled" }}
						</Badge>
					</div>
				</div>
			</Card>

			<div class="maintenance-grid__right-panel">
				<div v-if="selectedFormat" class="detail-container">
					<div class="live-preview-bar">
						<div class="live-preview-bar__left">
							<span class="live-preview-bar__label">LIVE PREVIEW PATTERN</span>
							<span class="live-preview-bar__value u-font-mono">{{
								generatePreview(selectedFormat)
							}}</span>
						</div>
						<Badge type="info" icon="mdi-xml">Auto Generated Output</Badge>
					</div>

					<Card class="panel-card--readonly mt-md">
						<div class="panel-card__header">
							<h2>Configuration Rules</h2>
							<button
								class="btn btn--outlined"
								@click="openEditModal"
								title="Edit Configuration"
							>
								<i class="mdi mdi-pencil-outline"></i> Edit Rules
							</button>
						</div>

						<div class="readonly-grid">
							<div class="readonly-item">
								<span class="readonly-item__label">Module Code</span>
								<span class="readonly-item__value u-font-weight-bold">{{
									selectedFormat.module
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Prefix Text</span>
								<span class="readonly-item__value u-font-mono">{{
									selectedFormat.prefix
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Timestamp Format</span>
								<span class="readonly-item__value">{{
									selectedFormat.dateFormat || "None (Disable Timestamp)"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Delimiter Splitting</span>
								<span class="readonly-item__value u-font-mono">{{
									selectedFormat.delimiter !== "" ? selectedFormat.delimiter : "None (Seamless String)"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Running No. Digits</span>
								<span class="readonly-item__value"
									>{{ selectedFormat.padding }} Digits (e.g.
									{{ "0".repeat(Math.max(0, selectedFormat.padding - 1)) }}1)</span
								>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Next Serial Counter</span>
								<span
									class="readonly-item__value u-text-primary u-font-weight-bold"
									>{{ selectedFormat.nextNumber }}</span
								>
							</div>
						</div>

						<div
							class="panel-card__footer-actions"
							style="
								margin-top: 24px;
								padding-top: 16px;
								border-top: 1px dashed var(--colors-surface-border);
							"
						>
							<button
								class="btn btn--danger-text"
								@click="promptDelete(selectedFormat)"
							>
								<i class="mdi mdi-delete-outline"></i> Delete Format Rule
							</button>
						</div>
					</Card>
				</div>

				<div v-else class="empty-state">
					<i class="mdi mdi-format-list-numbered empty-state__icon"></i>
					<p>Select a module from the list to view or edit formatting rules.</p>
				</div>
			</div>
		</div>

		<!-- Dialog Modal for Create / Edit -->
		<Dialog v-model="isDialogOpen">
			<template #header>
				<h3>{{ isNewRecord ? "Create New" : "Edit" }} Numbering Format</h3>
			</template>

			<div class="modal-box__mini-preview u-font-mono">
				Preview: {{ generatePreview(formData) }}
			</div>

			<div class="form-grid">
				<div class="form-group">
					<label class="form-group__label"
						>Module Code <span class="u-required">*</span></label
					>
					<Textbox
						v-model="formData.module"
						:disabled="!isNewRecord"
						placeholder="e.g. WO, INV, PO, QT"
					/>
				</div>
				<div class="form-group">
					<label class="form-group__label"
						>Prefix <span class="u-required">*</span></label
					>
					<Textbox
						v-model="formData.prefix"
						placeholder="e.g. WO, INV, TECH"
					/>
				</div>
				<Select label="Date Format Pattern (dateFormat)" v-model="formData.dateFormat">
						<option value="YYYYMMDD">YYYYMMDD (e.g. 20260726)</option>
						<option value="YYYYMM">YYYYMM (e.g. 202607)</option>
						<option value="YYMM">YYMM (e.g. 2607)</option>
						<option value="YYYY">YYYY (e.g. 2026)</option>
						<option value="">None (No date component)</option>
					</Select />
				<Textbox label="Delimiter Separator" v-model="formData.delimiter"
						maxlength="5"
						class="u-font-mono"
						placeholder="e.g. -, /, _"
					/>
				<Textbox label="Serial Code Width (padding)" v-model.number="formData.padding"
						type="number"
						min="1"
						max="10"
					/>
				<Textbox label="Next Serial Counter" v-model.number="formData.nextNumber"
						type="number"
						min="1"
						class="u-text-primary u-font-weight-bold"
					/>
				<div class="form-group form-group--full" style="padding-top: var(--spacing-xs)">
					<label class="switch-toggle">
						<input type="checkbox" v-model="formData.isActive" />
						<span class="switch-toggle__slider"></span>
						<span class="switch-toggle__label">Enable Document Number Automation</span>
					</label>
				</div>
			</div>

			<template #footer>
				<button class="btn btn--secondary" @click="isDialogOpen = false">
					Cancel
				</button>
				<button class="btn btn--primary" @click="saveFormat">
					Save Configuration
				</button>
			</template>
		</Dialog>

		<!-- Delete Confirmation Modal -->
		<Dialog v-model="isDeleting">
			<template #header>
				<h3 style="color: #ef4444;">Delete Format Rule</h3>
			</template>
			<p>
				Are you sure you want to delete the format rule for module <strong>{{ selectedFormat?.module }}</strong>?
			</p>
			<template #footer>
				<button class="btn btn--secondary" @click="isDeleting = false">Cancel</button>
				<button class="btn btn--danger" @click="executeDelete">Delete</button>
			</template>
		</Dialog>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/Maintenance/_doc-no-format.scss";
</style>
