<script setup lang="ts">
import { ref, computed } from "vue";
import Chip from "@/components/Chip.vue";
import Dialog from "@/components/Dialog.vue";
import Card from "@/components/Card.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Select from "@/components/Select.vue";

interface DocNoFormatModel {
	id: number;
	module: string;
	prefix: string;
	dateFormat: string;
	delimiter: string;
	padding: number;
	nextNumber: number;
	isActive: boolean;
}

const searchString = ref("");
const filterActive = ref("all");
const isNewRecord = ref(false);
const isDialogOpen = ref(false);
const selectedFormat = ref<DocNoFormatModel | null>(null);

const formData = ref<DocNoFormatModel>({
	id: 0,
	module: "",
	prefix: "",
	dateFormat: "YYYYMM",
	delimiter: "-",
	padding: 4,
	nextNumber: 1,
	isActive: true,
});

const formats = ref<DocNoFormatModel[]>([
	{
		id: 1,
		module: "INV",
		prefix: "INV",
		dateFormat: "YYYYMM",
		delimiter: "-",
		padding: 4,
		nextNumber: 1,
		isActive: true,
	},
	{
		id: 2,
		module: "PO",
		prefix: "PO",
		dateFormat: "YYYYMMDD",
		delimiter: "/",
		padding: 5,
		nextNumber: 25,
		isActive: true,
	},
	{
		id: 3,
		module: "DO",
		prefix: "DO",
		dateFormat: "YYMM",
		delimiter: "",
		padding: 4,
		nextNumber: 120,
		isActive: true,
	},
]);

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
}

function selectFormat(item: DocNoFormatModel) {
	selectedFormat.value = item;
}

function generatePreview(format: DocNoFormatModel) {
	if (!format) return "---";

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
			default:
				datePart = "";
		}
	}

	const delimiter = format.delimiter ?? "";
	const runningNo = String(format.nextNumber).padStart(format.padding, "0");

	const parts: string[] = [format.prefix];
	if (datePart) parts.push(datePart);
	parts.push(runningNo);

	return parts.filter((p) => p !== "").join(delimiter);
}

function prepareNewFormat() {
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
	};
	isDialogOpen.value = true;
}

function openEditModal() {
	if (!selectedFormat.value) return;
	isNewRecord.value = false;
	formData.value = { ...selectedFormat.value };
	isDialogOpen.value = true;
}

function saveFormat() {
	if (!formData.value.module || !formData.value.prefix) {
		alert("Module Code and Prefix are mandatory fields.");
		return;
	}

	if (isNewRecord.value) {
		const duplicate = formats.value.some(
			(x) => x.module.toLowerCase() === formData.value.module.toLowerCase(),
		);
		if (duplicate) {
			alert(`The module code [${formData.value.module.toUpperCase()}] already exists.`);
			return;
		}
		formData.value.id = Date.now();
		formats.value.push({ ...formData.value });
		selectedFormat.value = formats.value[formats.value.length - 1];
	} else {
		const index = formats.value.findIndex((x) => x.id === formData.value.id);
		if (index !== -1) {
			formats.value[index] = { ...formData.value };
			selectedFormat.value = formats.value[index];
		}
	}
	isDialogOpen.value = false;
}

function deleteFormat(item: DocNoFormatModel) {
	formats.value = formats.value.filter((x) => x.id !== item.id);
	selectedFormat.value = null;
}
</script>

<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<div class="title-with-action">
					<h1>Document Number Format</h1>
					<button
						class="icon-action-btn icon-action-btn--primary"
						@click="prepareNewFormat"
						title="Add New Format"
					>
						<i class="mdi mdi-plus"></i>
					</button>
				</div>
				<p class="maintenance-view__subtitle">
					Configure numbering rules and generation patterns for system modules
				</p>
			</div>
		</div>

		<div class="maintenance-grid">
			<Card class="maintenance-grid__left-panel">
				<div class="list-controls">
					<div class="search-box">
						<i class="mdi mdi-magnify search-box__icon"></i>
						<input
							v-model="searchString"
							type="text"
							placeholder="Search module or prefix..."
							class="search-box__input"
						/>
					</div>

					<FilterPanel show-reset align="right" @reset="resetFilter">
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
						<Chip :type="item.isActive ? 'success' : 'default'">
							{{ item.isActive ? "Active" : "Disabled" }}
						</Chip>
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
						<Chip type="info" icon="mdi-xml">Sample Output</Chip>
					</div>

					<Card class="panel-card--readonly mt-md">
						<div class="panel-card__header">
							<h2>Configuration Rules</h2>
							<button
								class="icon-action-btn icon-action-btn--edit"
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
									selectedFormat.delimiter || "None (Seamless String)"
								}}</span>
							</div>
							<div class="readonly-item">
								<span class="readonly-item__label">Running No. Digits</span>
								<span class="readonly-item__value"
									>{{ selectedFormat.padding }} Digits (e.g.
									{{ "0".repeat(selectedFormat.padding - 1) }}1)</span
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
								class="action-btn action-btn--danger-text"
								@click="deleteFormat(selectedFormat)"
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
					<input
						v-model="formData.module"
						type="text"
						class="form-group__input"
						:disabled="!isNewRecord"
						placeholder="e.g. INV, PO, WO"
					/>
				</div>
				<div class="form-group">
					<label class="form-group__label"
						>Prefix <span class="u-required">*</span></label
					>
					<input
						v-model="formData.prefix"
						type="text"
						class="form-group__input"
						placeholder="e.g. TECH, MYS"
					/>
				</div>
				<div class="form-group">
					<label class="form-group__label">Date Format Pattern</label>
					<select v-model="formData.dateFormat" class="filter-dropdown">
						<option value="YYYYMMDD">YYYYMMDD (e.g. 20260616)</option>
						<option value="YYYYMM">YYYYMM (e.g. 202606)</option>
						<option value="YYMM">YYMM (e.g. 2606)</option>
						<option value="">None (Disable)</option>
					</select>
				</div>
				<div class="form-group">
					<label class="form-group__label">Delimiter Separator</label>
					<input
						v-model="formData.delimiter"
						type="text"
						maxlength="5"
						class="form-group__input u-font-mono"
						placeholder="e.g. -, /, _"
					/>
				</div>
				<div class="form-group">
					<label class="form-group__label">Serial Code Width</label>
					<input
						v-model.number="formData.padding"
						type="number"
						min="1"
						max="10"
						class="form-group__input"
					/>
				</div>
				<div class="form-group">
					<label class="form-group__label">Next Serial Counter</label>
					<input
						v-model.number="formData.nextNumber"
						type="number"
						min="1"
						class="form-group__input u-text-primary u-font-weight-bold"
					/>
				</div>
				<div class="form-group form-group--full" style="padding-top: var(--spacing-xs)">
					<label class="switch-toggle">
						<input type="checkbox" v-model="formData.isActive" />
						<span class="switch-toggle__slider"></span>
						<span class="switch-toggle__label">Enable Global Automation Engine</span>
					</label>
				</div>
			</div>

			<template #footer>
				<button class="action-btn action-btn--text" @click="isDialogOpen = false">
					Cancel
				</button>
				<button class="action-btn action-btn--primary" @click="saveFormat">
					Save Configuration
				</button>
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
		p {
			font-size: 13px;
			color: var(--colors-text-muted);
			margin: 0;
		}
	}
}

.title-with-action {
	@include flex-row($align: center, $gap: 12px);
	h1 {
		font-size: 24px;
		font-weight: 700;
		margin: 0;
		color: var(--text-main);
	}

	.icon-action-btn--primary {
		background-color: rgba(80, 88, 242, 0.08);
		color: var(--colors-primary-deepblue);
		border-radius: 50%;
		width: 32px;
		height: 32px;
		&:hover {
			background-color: var(--colors-primary-deepblue);
			color: white;
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
		min-height: 560px;
		height: 100%;
		@media (max-width: 960px) {
			min-height: auto;
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
		}
	}
	.icon-action-btn--edit {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-brand-primary);
		background: var(--colors-surface-hover);
		padding: 4px 12px;
		border-radius: 6px;
		gap: 4px;
		display: inline-flex;
		align-items: center;
		border: none;
		cursor: pointer;
		&:hover {
			background: var(--colors-brand-primary);
			color: white;
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
		transform: translateY(-1px);
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
.search-box {
	position: relative;
	width: 100%;
	.search-box__icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--colors-text-muted);
		font-size: 18px;
	}
	.search-box__input {
		width: 100%;
		padding: 8px 12px 8px 38px;
		border: 1px solid var(--colors-surface-border);
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		box-sizing: border-box;
		background: var(--colors-surface-background);
		color: var(--colors-text-primary);
		&:focus {
			border-color: var(--colors-brand-primary);
		}
	}
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
	&__input,
	.filter-dropdown,
	&__textarea {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid var(--colors-surface-border);
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		font-family: inherit;
		box-sizing: border-box;
		background: var(--colors-surface-background);
		color: var(--colors-text-primary);
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
		background-color: #22c55e;
		&::before {
			transform: translateX(16px);
		}
	}
	&__label {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-primary);
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
	&--primary {
		background-color: var(--colors-brand-primary);
		color: white;
		&:hover {
			opacity: 0.9;
		}
	}
	&--text {
		background: transparent;
		color: var(--colors-text-muted);
		&:hover {
			background: var(--colors-surface-hover);
		}
	}
	&--danger-text {
		background: transparent;
		color: #ef4444;
		padding: 4px 8px;
		font-size: 12px;
		&:hover {
			background: rgba(239, 68, 68, 0.1);
		}
	}
}
.icon-action-btn {
	background: transparent;
	border: none;
	font-size: 16px;
	color: var(--colors-text-secondary);
	padding: 6px;
	cursor: pointer;
	border-radius: 6px;
	&:hover {
		background-color: var(--colors-surface-hover);
		color: var(--colors-brand-primary);
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
