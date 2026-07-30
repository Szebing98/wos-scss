<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Dialog from "@/components/Dialog.vue";
import Card from "@/components/Card.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Select from "@/components/Select.vue";
import Textbox from "@/components/Textbox.vue";
import type { DocNoFormatModel } from "@/api/maintenance/doc-no-format/doc-no-format.types";

import http from "@/utils/http";

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
		alert("Module Code and Prefix are mandatory fields.");
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
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1>Document Number Format</h1>
				<p class="maintenance-view__subtitle">
					Configure numbering rules and generation patterns for system modules
				</p>
			</div>
			<button class="btn btn--primary" @click="prepareNewFormat">
				<i class="mdi mdi-plus"></i> New Format Rule
			</button>
		</div>

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
				<div class="form-group">
					<label class="form-group__label">Date Format Pattern (dateFormat)</label>
					<Select v-model="formData.dateFormat">
						<option value="YYYYMMDD">YYYYMMDD (e.g. 20260726)</option>
						<option value="YYYYMM">YYYYMM (e.g. 202607)</option>
						<option value="YYMM">YYMM (e.g. 2607)</option>
						<option value="YYYY">YYYY (e.g. 2026)</option>
						<option value="">None (No date component)</option>
					</Select>
				</div>
				<div class="form-group">
					<label class="form-group__label">Delimiter Separator</label>
					<Textbox
						v-model="formData.delimiter"
						maxlength="5"
						class="u-font-mono"
						placeholder="e.g. -, /, _"
					/>
				</div>
				<div class="form-group">
					<label class="form-group__label">Serial Code Width (padding)</label>
					<Textbox
						v-model.number="formData.padding"
						type="number"
						min="1"
						max="10"
					/>
				</div>
				<div class="form-group">
					<label class="form-group__label">Next Serial Counter</label>
					<Textbox
						v-model.number="formData.nextNumber"
						type="number"
						min="1"
						class="u-text-primary u-font-weight-bold"
					/>
				</div>
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
@mixin flex-row($align: stretch, $gap: 0) {
	display: flex;
	align-items: $align;
	gap: $gap;
}

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
			font-size: 24px;
			font-weight: 700;
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
	min-height: 0;

	@media (max-width: 960px) {
		grid-template-columns: 1fr;
	}

	&__left-panel {
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

.live-preview-bar {
	background-color: var(--colors-surface-card);
	border-left: 5px solid var(--colors-brand-primary);
	border-radius: 8px;
	padding: 14px 20px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow:
		inset 0 1px 3px rgba(0, 0, 0, 0.02),
		0 2px 8px rgba(0, 0, 0, 0.01);
	transition: all 0.2s ease;

	&__left {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	&__label {
		font-size: 10px;
		font-weight: 700;
		color: var(--colors-text-muted);
		letter-spacing: 0.08em;
	}
	&__value {
		font-size: 22px;
		font-weight: 800;
		color: var(--colors-brand-primary);
		letter-spacing: -0.02em;
	}
}

.modal-box__mini-preview {
	background-color: var(--colors-surface-background);
	color: var(--colors-brand-primary);
	font-size: 16px;
	font-weight: 700;
	padding: 12px 20px;
	text-align: center;
	border-left: 4px solid var(--colors-brand-primary);
	margin-bottom: var(--spacing-lg);
	border-radius: 6px;
	letter-spacing: 0.02em;
}

.panel-card--readonly {
	.panel-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-md);
		h2 {
			margin: 0;
			font-size: 16px;
			font-weight: 700;
		}
	}
}

.readonly-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 20px var(--spacing-md);
	padding: 8px 0;
	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
}

.readonly-item {
	display: flex;
	flex-direction: column;
	gap: 4px;
	&__label {
		font-size: 12px;
		font-weight: 600;
		color: var(--colors-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	&__value {
		font-size: 14px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}
}

.type-card {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	padding: 12px var(--spacing-md);
	border-radius: 10px;
	cursor: pointer;
	@include flex-row($align: center, $gap: 12px);
	justify-content: space-between;
	margin-bottom: 6px;
	transition: all 0.18s ease;

	&__content {
		display: flex;
		flex-direction: column;
		gap: 3px;
		overflow: hidden;
	}
	&__name {
		font-size: 14px;
		font-weight: 700;
		color: var(--colors-text-primary);
	}
	&__code {
		font-size: 11px;
		color: var(--colors-text-muted);
		font-family: monospace;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&:hover {
		border-color: var(--colors-brand-primary);
		background-color: var(--colors-surface-hover);
	}
	&--selected {
		background-color: var(--colors-surface-hover) !important;
		border-color: var(--colors-brand-primary) !important;
		.type-card__name {
			color: var(--colors-brand-primary);
		}
	}
}

.list-controls {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	margin-bottom: var(--spacing-sm);
}
.type-list {
	flex-grow: 1;
	overflow-y: auto;
	padding-right: 2px;
}

.form-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing-md);
	@media (max-width: 540px) {
		grid-template-columns: 1fr;
	}
}
.form-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
	&--full {
		grid-column: span 2;
	}
	&__label {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-primary);
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
		width: 34px;
		height: 18px;
		background-color: var(--colors-surface-border);
		border-radius: 20px;
		position: relative;
		transition: background-color 0.2s;
		&::before {
			content: "";
			position: absolute;
			left: 2px;
			top: 2px;
			width: 14px;
			height: 14px;
			background-color: white;
			border-radius: 50%;
			transition: transform 0.2s;
		}
	}
	input:checked + &__slider {
		background-color: var(--status-completed);
		&::before {
			transform: translateX(16px);
			background-color: #ffffff;
		}
	}
	&__label {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}
}

.btn--danger-text {
	background: transparent;
	border: none;
	color: #ef4444;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 8px;
	border-radius: 6px;
	&:hover {
		background-color: rgba(239, 68, 68, 0.1);
	}
}

.btn--danger {
	background-color: #ef4444;
	color: white;
	&:hover {
		background-color: #dc2626;
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
		font-size: 4rem;
		opacity: 0.15;
	}
	p {
		font-size: 14px;
		font-weight: 500;
	}
}

.mt-md {
	margin-top: var(--spacing-md);
}
.u-font-mono {
	font-family: monospace;
}
.u-font-weight-bold {
	font-weight: 700;
}
.u-text-primary {
	color: var(--colors-brand-primary);
}
.u-required {
	color: #ef4444;
}
</style>
