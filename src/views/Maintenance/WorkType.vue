<script setup lang="ts">
import { ref, computed } from "vue";

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
const isItemDialogOpen = ref(false);
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
	if (!searchType.value) return workTypes.value;
	return workTypes.value.filter(
		(t) =>
			t.name.toLowerCase().includes(searchType.value.toLowerCase()) ||
			t.code.toLowerCase().includes(searchType.value.toLowerCase()),
	);
});

const filteredItems = computed(() => {
	if (!selectedType.value) return [];
	return items.value.filter((i) => i.workTypeCode === selectedType.value?.code);
});

function selectType(type: WorkType) {
	selectedType.value = type;
}

function createNewType() {
	console.log("Creating new work type...");
}

function saveType() {
	console.log("Type details updated local-store successfully", selectedType.value);
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
				<div class="search-box">
					<i class="mdi mdi-magnify search-box__icon"></i>
					<input
						v-model="searchType"
						type="text"
						placeholder="Search types..."
						class="search-box__input"
					/>
				</div>

				<div class="type-list">
					<div
						v-for="type in filteredWorkTypes"
						:key="type.code"
						class="type-item"
						:class="{ 'type-item--selected': selectedType?.code === type.code }"
						@click="selectType(type)"
					>
						<div class="type-item__content">
							<span
								class="type-item__name"
								:class="{ 'type-item__name--disabled': !type.isActive }"
							>
								{{ type.name }}
							</span>
							<span class="type-item__code">Code: {{ type.code }}</span>
						</div>
						<div
							v-if="type.withEquipmentForm"
							class="type-item__badge"
							title="Equipment Form Required"
						>
							<i class="mdi mdi-assignment"></i>
						</div>
					</div>
				</div>
			</div>

			<div class="maintenance-grid__right-panel">
				<div v-if="selectedType" class="detail-container">
					<div class="panel-card panel-card--bordered">
						<div class="panel-card__header">
							<h2>
								Work Type Details: <strong>{{ selectedType.code }}</strong>
							</h2>
							<label class="switch-toggle">
								<input type="checkbox" v-model="selectedType.isActive" />
								<span class="switch-toggle__slider"></span>
								<span class="switch-toggle__label">Active</span>
							</label>
						</div>

						<div class="form-grid">
							<div class="form-group">
								<label class="form-group__label">Work Type Name</label>
								<input
									v-model="selectedType.name"
									type="text"
									class="form-group__input"
								/>
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

						<div class="panel-card__actions">
							<button
								class="action-btn action-btn--primary action-btn--sm"
								@click="saveType"
							>
								Update Work Type
							</button>
						</div>
					</div>

					<div class="panel-card mt-lg">
						<div class="panel-card__header">
							<h2>Work Type Items</h2>
							<button
								class="action-btn action-btn--outlined action-btn--sm"
								@click="addNewItem"
							>
								<i class="mdi mdi-plus"></i> Add Item
							</button>
						</div>

						<table class="data-table">
							<thead>
								<tr>
									<th>Code</th>
									<th>Item Name</th>
									<th>Status</th>
									<th class="u-text-right" style="width: 100px">Actions</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="item in filteredItems" :key="item.code">
									<td class="u-font-mono">{{ item.code }}</td>
									<td>{{ item.name }}</td>
									<td>
										<span
											class="badge"
											:class="
												item.isActive ? 'badge--success' : 'badge--disabled'
											"
										>
											{{ item.isActive ? "Active" : "Disabled" }}
										</span>
									</td>
									<td class="u-text-right">
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
									</td>
								</tr>
								<tr v-if="filteredItems.length === 0">
									<td colspan="4" class="data-table__empty">
										No work items found under this category.
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<div v-else class="empty-state">
					<i class="mdi mdi-category empty-state__icon"></i>
					<p>Select a Work Type to manage its details and items</p>
				</div>
			</div>
		</div>

		<div class="modal-mask" v-if="isItemDialogOpen">
			<div class="modal-box">
				<div class="modal-box__header">
					<h3>{{ editingItem.id === 0 ? "New" : "Edit" }} Work Item</h3>
				</div>
				<div class="modal-box__body">
					<div class="form-group">
						<label class="form-group__label">Item Code</label>
						<input
							v-model="editingItem.code"
							type="text"
							class="form-group__input"
							:disabled="editingItem.id !== 0"
						/>
					</div>
					<div class="form-group">
						<label class="form-group__label">Item Name</label>
						<input v-model="editingItem.name" type="text" class="form-group__input" />
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
				</div>
				<div class="modal-box__footer">
					<button class="action-btn action-btn--text" @click="isItemDialogOpen = false">
						Cancel
					</button>
					<button class="action-btn action-btn--primary" @click="saveItem">
						Save Item
					</button>
				</div>
			</div>
		</div>
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
			font-size: 24px;
			font-weight: 700;
			margin: 0 0 4px 0;
			color: var(--text-main);
		}
		p {
			font-size: 13px;
			color: #64748b;
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
		background: white;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xxs, 12px);
		padding: var(--spacing-md);
		height: 650px;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
	}

	&__right-panel {
		min-height: 650px;
		height: 100%;
	}
}

// 搜索栏
.search-box {
	position: relative;
	width: 100%;

	&__icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: #94a3b8;
		font-size: 18px;
	}

	&__input {
		width: 100%;
		padding: 8px 12px 8px 38px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		box-sizing: border-box;
		&:focus {
			border-color: var(--colors-primary-deepblue);
		}
	}
}

// 工单类别列表项
.type-list {
	flex-grow: 1;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.type-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-sm) var(--spacing-md);
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		background-color: #f1f5f9;
	}

	&--selected {
		background-color: #eff6ff !important;
		border-left: 4px solid var(--colors-primary-deepblue);
		.type-item__name {
			color: var(--colors-primary-deepblue);
			font-weight: 600;
		}
	}

	&__content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	&__name {
		font-size: 14px;
		color: #1e293b;
		font-weight: 500;

		&--disabled {
			color: #94a3b8 !important;
			text-decoration: line-through;
		}
	}

	&__code {
		font-size: 11px;
		color: #64748b;
	}
	&__badge {
		color: var(--colors-primary-deepblue);
		font-size: 16px;
	}
}

// 详情控制板
.panel-card {
	background: white;
	border: 1px solid var(--border-color);
	border-radius: var(--radius-xxs, 12px);
	padding: var(--spacing-lg);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

	&--bordered {
		border-left: 6px solid var(--colors-primary-deepblue); // 复刻原版 Primary Accent
	}

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-lg);
		h2 {
			font-size: 16px;
			font-weight: 600;
			margin: 0;
			color: #1e293b;
		}
	}

	&__actions {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--spacing-md);
	}
}

// 内置表单排版
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
			border-color: var(--colors-primary-deepblue);
		}
	}
}

// 原生手写开关 Toggle 按钮 (替代 MudSwitch)
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

// 原生手写 Checkbox 框 (替代 MudCheckBox)
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
		background-color: var(--colors-primary-deepblue);
		border-color: var(--colors-primary-deepblue);
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

// 数据表格排版
.data-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
	th,
	td {
		padding: 10px 12px;
		text-align: left;
	}
	th {
		color: #64748b;
		border-bottom: 1px solid var(--border-color);
		font-weight: 600;
	}
	tr {
		border-bottom: 1px solid #f1f5f9;
		&:hover {
			background-color: #f8fafc;
		}
	}
	&__empty {
		text-align: center !important;
		color: #94a3b8;
		padding: 32px !important;
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
	transition: background-color 0.15s;

	&--primary {
		background-color: var(--colors-primary-deepblue);
		color: white;
		&:hover {
			background-color: #444acf;
		}
	}
	&--outlined {
		background-color: transparent;
		border: 1px solid #3b82f6;
		color: #3b82f6;
		&:hover {
			background-color: #eff6ff;
		}
	}
	&--text {
		background: transparent;
		color: #64748b;
		&:hover {
			background: #f1f5f9;
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
		color: var(--colors-primary-deepblue);
	}
	&--danger {
		&:hover {
			background-color: #fef2f2;
			color: #ef4444;
		}
	}
}

// 右边栏默认空状态
.empty-state {
	height: 100%;
	min-height: 400px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-md);
	background: white;
	border: 1px solid var(--border-color);
	border-radius: 12px;
	color: #94a3b8;
	&__icon {
		font-size: 5rem;
		opacity: 0.15;
	}
	p {
		font-size: 15px;
		font-weight: 500;
	}
}

// 标签小圆圈
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

// 🌟 手搓 Modal 弹窗阴影背板与卡片
.modal-mask {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.4);
	backdrop-filter: blur(2px);
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
}
.modal-box {
	background: white;
	border-radius: 12px;
	width: 100%;
	max-width: 460px;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;

	&__header {
		padding: var(--spacing-md) var(--spacing-lg);
		border-bottom: 1px solid #e2e8f0;
		h3 {
			font-size: 16px;
			font-weight: 600;
			margin: 0;
		}
	}
	&__body {
		padding: var(--spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}
	&__footer {
		padding: var(--spacing-md) var(--spacing-lg);
		border-top: 1px solid #e2e8f0;
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-sm);
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
