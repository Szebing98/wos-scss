<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";
import HighlightText from "@/components/HighlightText.vue";

export interface TableHeader {
	key: string;
	label: string;
	align?: "left" | "center" | "right";
	width?: string;
	minWidth?: string;
	sortable?: boolean;
	mobileIcon?: string;
	fixed?: "left" | "right";
	fixedOffset?: string;
	defaultVisible?: boolean;
}

interface InternalHeader extends TableHeader {
	visible: boolean;
	_width?: string;
}

const props = withDefaults(
	defineProps<{
		headers: TableHeader[];
		items: any[];
		emptyMessage?: string;
		hover?: boolean;
		striped?: boolean;
		dense?: boolean;
		bordered?: boolean;
		elevation?: number;
		outlined?: boolean;
		paginate?: boolean;
		rowsPerPageOptions?: number[];
		storageKey?: string;
		searchQuery?: string;
	}>(),
	{
		emptyMessage: "No data available.",
		hover: false,
		striped: false,
		dense: false,
		bordered: true,
		elevation: 0,
		outlined: false,
		paginate: false,
		rowsPerPageOptions: () => [10, 25, 50, 100],
		storageKey: undefined,
		searchQuery: undefined,
	},
);

const emit = defineEmits<{
	"row-click": [item: any];
}>();

// --- Internal Headers State (Customization, Order, Width) ---
const internalHeaders = ref<InternalHeader[]>([]);

// --- Sorting State (Multi-column support with priority badges 1, 2, 3) ---
export interface SortRule {
	key: string;
	order: "asc" | "desc";
}

const sortRules = ref<SortRule[]>([]);

function loadTablePreferences() {
	if (!props.storageKey) return;
	try {
		const saved = localStorage.getItem(`table_pref_${props.storageKey}`);
		if (saved) {
			const parsed = JSON.parse(saved);
			if (parsed.sortRules && Array.isArray(parsed.sortRules)) {
				sortRules.value = parsed.sortRules;
			} else if (parsed.sortKey) {
				sortRules.value = [{ key: parsed.sortKey, order: parsed.sortOrder || "asc" }];
			}
			if (parsed.headers && Array.isArray(parsed.headers)) {
				const savedMap = new Map(parsed.headers.map((h: any) => [h.key, h]));
				const restored: InternalHeader[] = [];
				parsed.headers.forEach((h: any) => {
					const propH = props.headers.find((ph) => ph.key === h.key);
					if (propH) {
						restored.push({
							...propH,
							visible: h.visible !== undefined ? h.visible : true,
							_width: h._width || propH.width,
						});
					}
				});
				props.headers.forEach((ph) => {
					if (!savedMap.has(ph.key)) {
						restored.push({ ...ph, visible: ph.defaultVisible !== false });
					}
				});
				internalHeaders.value = restored;
			}
		}
	} catch (e) {
		console.error("Failed to load table preferences:", e);
	}
}

function saveTablePreferences() {
	if (!props.storageKey) return;
	try {
		const payload = {
			sortRules: sortRules.value,
			headers: internalHeaders.value.map((h) => ({
				key: h.key,
				visible: h.visible,
				_width: h._width,
			})),
		};
		localStorage.setItem(`table_pref_${props.storageKey}`, JSON.stringify(payload));
	} catch (e) {
		console.error("Failed to save table preferences:", e);
	}
}

watch(
	() => props.headers,
	(newHeaders) => {
		const currentMap = new Map(internalHeaders.value.map((h) => [h.key, h]));
		internalHeaders.value = newHeaders.map((h) => {
			const existing = currentMap.get(h.key);
			return {
				...h,
				visible:
					existing !== undefined ? existing.visible : h.defaultVisible !== false,
				_width: existing?._width || h.width,
			};
		});
		if (props.storageKey) {
			loadTablePreferences();
		}
	},
	{ immediate: true, deep: true },
);

watch(
	[sortRules, internalHeaders],
	() => {
		saveTablePreferences();
	},
	{ deep: true },
);

const visibleHeaders = computed(() => internalHeaders.value.filter((h) => h.visible));

const showColumnSettings = ref(false);
const tempHeaders = ref<InternalHeader[]>([]);

function toggleColumnSettings() {
	if (!showColumnSettings.value) {
		tempHeaders.value = internalHeaders.value
			.filter(
				(h) =>
					h.label && h.label.trim() !== "" && h.key !== "actions" && h.key !== "action",
			)
			.map((h) => ({ ...h }));
	}
	showColumnSettings.value = !showColumnSettings.value;
}

function toggleSelectAll() {
	// Always keep at least 1 column selected (select all)
	tempHeaders.value.forEach((h) => (h.visible = true));
}

function applyColumnSettings() {
	const visibleCount = tempHeaders.value.filter((h) => h.visible).length;
	if (visibleCount === 0) {
		// Automatically preserve primary column (title, name, customer, woNumber, details, code)
		const primaryHeader =
			tempHeaders.value.find((h) =>
				["title", "name", "customer", "woNumber", "details", "code"].includes(h.key),
			) || tempHeaders.value[0];
		if (primaryHeader) {
			primaryHeader.visible = true;
		}
	}
	const tempVisibilityMap = new Map(tempHeaders.value.map((h) => [h.key, h.visible]));
	internalHeaders.value = internalHeaders.value.map((h) => {
		if (h.key === "actions" || h.key === "action") {
			return { ...h, visible: true };
		}
		if (tempVisibilityMap.has(h.key)) {
			return { ...h, visible: tempVisibilityMap.get(h.key)! };
		}
		return h;
	});
	showColumnSettings.value = false;
}

// --- Drag & Drop Reordering ---
const draggedColumn = ref<string | null>(null);

function onDragStart(event: DragEvent, key: string) {
	draggedColumn.value = key;
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = "move";
	}
}

function onDragOver(event: DragEvent) {
	event.preventDefault();
	if (event.dataTransfer) {
		event.dataTransfer.dropEffect = "move";
	}
}

function onDrop(event: DragEvent, targetKey: string) {
	event.preventDefault();
	if (draggedColumn.value && draggedColumn.value !== targetKey) {
		const draggedIndex = internalHeaders.value.findIndex((h) => h.key === draggedColumn.value);
		const targetIndex = internalHeaders.value.findIndex((h) => h.key === targetKey);

		if (draggedIndex !== -1 && targetIndex !== -1) {
			const temp = [...internalHeaders.value];
			const [removed] = temp.splice(draggedIndex, 1);
			temp.splice(targetIndex, 0, removed);
			internalHeaders.value = temp;
		}
	}
	draggedColumn.value = null;
}

// --- Resizing ---
const isTableFixed = ref(false);
const resizingColumn = ref<string | null>(null);
const startX = ref(0);
const startWidth = ref(0);
const isHoveringResizer = ref(false);

function onResizeStart(event: MouseEvent, key: string) {
	event.stopPropagation();
	isTableFixed.value = true;
	resizingColumn.value = key;
	startX.value = event.clientX;

	const th = (event.target as HTMLElement).closest("th");
	startWidth.value = th ? th.offsetWidth : 0;

	// Initialize _width for all visible headers using their current actual offsetWidth
	// to prevent layout shifts when table-layout switches to fixed.
	const tr = th?.closest("tr");
	const thElements = tr?.querySelectorAll("th");
	if (thElements) {
		visibleHeaders.value.forEach((header, index) => {
			if (!header._width) {
				const thEl = thElements[index] as HTMLElement;
				if (thEl) {
					header._width = `${thEl.offsetWidth}px`;
				}
			}
		});
	}

	document.addEventListener("mousemove", onResizeMove);
	document.addEventListener("mouseup", onResizeEnd);
}

function onResizeMove(event: MouseEvent) {
	if (resizingColumn.value) {
		const diffX = event.clientX - startX.value;
		const newWidth = Math.max(50, startWidth.value + diffX);
		const header = internalHeaders.value.find((h) => h.key === resizingColumn.value);
		if (header) {
			header._width = `${newWidth}px`;
		}
	}
}

function onResizeEnd() {
	resizingColumn.value = null;
	document.removeEventListener("mousemove", onResizeMove);
	document.removeEventListener("mouseup", onResizeEnd);
}

onUnmounted(() => {
	document.removeEventListener("mousemove", onResizeMove);
	document.removeEventListener("mouseup", onResizeEnd);
});

const isAnyHeaderResized = computed(() => visibleHeaders.value.some((h) => !!h._width));

const tableStyle = computed(() => {
	if (isTableFixed.value || isAnyHeaderResized.value) {
		return { tableLayout: "fixed" as const };
	}
	return {};
});

// --- Sorting ---
function isHeaderSortable(header: TableHeader): boolean {
	if (header.sortable !== undefined) return header.sortable;
	if (header.key === "actions" || header.key === "action" || header.key === "select")
		return false;
	return true;
}

function getSortPriority(key: string): number | null {
	const index = sortRules.value.findIndex((r) => r.key === key);
	return index !== -1 ? index + 1 : null;
}

function getSortOrder(key: string): "asc" | "desc" | null {
	const rule = sortRules.value.find((r) => r.key === key);
	return rule ? rule.order : null;
}

function toggleSort(key: string, event?: MouseEvent) {
	const header = internalHeaders.value.find((h) => h.key === key);
	if (header && !isHeaderSortable(header)) return;

	const isShift = event?.shiftKey;
	const existingIndex = sortRules.value.findIndex((r) => r.key === key);

	if (isShift) {
		// Shift + Click: Add or cycle in multi-sort rule list
		if (existingIndex !== -1) {
			const currentOrder = sortRules.value[existingIndex].order;
			if (currentOrder === "asc") {
				sortRules.value[existingIndex].order = "desc";
			} else {
				sortRules.value.splice(existingIndex, 1);
			}
		} else {
			sortRules.value.push({ key, order: "asc" });
		}
	} else {
		// Normal Click: Replace with single column sort, or cycle asc -> desc -> none
		if (existingIndex !== -1) {
			if (sortRules.value.length === 1) {
				const currentOrder = sortRules.value[0].order;
				if (currentOrder === "asc") {
					sortRules.value[0].order = "desc";
				} else {
					sortRules.value = [];
				}
			} else {
				sortRules.value = [{ key, order: "asc" }];
			}
		} else {
			sortRules.value = [{ key, order: "asc" }];
		}
	}
}

function getSortableValue(item: any, key: string): any {
	if (item[key] !== undefined && item[key] !== null) return item[key];
	if (key === "employee") return item.name || item.displayName || item.employeeName || "";
	if (key === "status")
		return item.isActive !== undefined
			? item.isActive
				? "Active"
				: "Inactive"
			: item.status || "";
	return "";
}

const sortedItems = computed(() => {
	if (!sortRules.value.length) return props.items || [];
	return [...(props.items || [])].sort((a, b) => {
		for (const rule of sortRules.value) {
			const valA = getSortableValue(a, rule.key);
			const valB = getSortableValue(b, rule.key);
			if (valA === valB) continue;
			if (valA == null) return 1;
			if (valB == null) return -1;

			const strA = String(valA).toLowerCase();
			const strB = String(valB).toLowerCase();
			if (strA < strB) return rule.order === "asc" ? -1 : 1;
			if (strA > strB) return rule.order === "asc" ? 1 : -1;
		}
		return 0;
	});
});

// --- Pagination ---
const currentPage = ref(1);
const rowsPerPage = ref(10);

if (props.rowsPerPageOptions && props.rowsPerPageOptions.length > 0) {
	rowsPerPage.value = props.rowsPerPageOptions[0];
}

const totalItems = computed(() => sortedItems.value?.length || 0);
const totalPages = computed(() => Math.ceil(totalItems.value / rowsPerPage.value) || 1);

const paginatedItems = computed(() => {
	if (!props.paginate) return sortedItems.value;
	const start = (currentPage.value - 1) * rowsPerPage.value;
	return sortedItems.value.slice(start, start + rowsPerPage.value);
});

function goToPage(page: number) {
	if (page >= 1 && page <= totalPages.value) {
		currentPage.value = page;
	}
}

function handleRowsPerPageChange(event: Event) {
	const target = event.target as HTMLSelectElement;
	rowsPerPage.value = parseInt(target.value, 10);
	currentPage.value = 1;
}

const paginationText = computed(() => {
	if (totalItems.value === 0) return "0-0 of 0";
	const start = (currentPage.value - 1) * rowsPerPage.value + 1;
	const end = Math.min(start + rowsPerPage.value - 1, totalItems.value);
	return `${start}-${end} of ${totalItems.value}`;
});
</script>

<template>
	<div
		class="mud-table-container"
		:class="{
			[`mud-elevation-${elevation}`]: 0,
			'mud-table-outlined': outlined,
		}"
	>
		<table
			class="mud-table-root"
			:class="{ 'mud-table-root--bordered': bordered }"
			:style="tableStyle"
		>
			<thead class="mud-table-head">
				<tr>
					<th
						v-for="header in visibleHeaders"
						:key="header.key"
						class="mud-table-cell mud-table-cell-header"
						:class="[
							`mud-table-cell-${header.key}`,
							`u-text-${header.align || 'left'}`,
							{
								dragging: draggedColumn === header.key,
								'sortable-header': isHeaderSortable(header),
								'mud-table-cell-fixed-left': header.fixed === 'left',
								'mud-table-cell-fixed-right': header.fixed === 'right',
							},
						]"
						:style="{
							width: header._width || header.width,
							minWidth:
								header._width ||
								header.minWidth ||
								(header.width && header.width.endsWith('px')
									? header.width
									: '100px'),
							left: header.fixed === 'left' ? header.fixedOffset || '0' : undefined,
							right: header.fixed === 'right' ? header.fixedOffset || '0' : undefined,
						}"
						:draggable="!isHoveringResizer && !resizingColumn"
						@dragstart="onDragStart($event, header.key)"
						@dragover="onDragOver($event)"
						@drop="onDrop($event, header.key)"
						@click="isHeaderSortable(header) && toggleSort(header.key, $event)"
						:title="
							isHeaderSortable(header)
								? 'Click to sort, Shift + Click for multi-column sort'
								: undefined
						"
					>
						<div class="header-content">
							<slot :name="`header-${header.key}`" :header="header">
								{{ header.label }}
							</slot>
							<span
								v-if="isHeaderSortable(header) && getSortOrder(header.key)"
								class="sort-icon-group"
							>
								<i
									:class="
										getSortOrder(header.key) === 'asc'
											? 'mdi mdi-arrow-up'
											: 'mdi mdi-arrow-down'
									"
								></i>
								<span v-if="sortRules.length > 1" class="sort-priority-badge">
									{{ getSortPriority(header.key) }}
								</span>
							</span>
						</div>
						<div
							class="resizer"
							:class="{ resizing: resizingColumn === header.key }"
							@mousedown.stop="onResizeStart($event, header.key)"
							@mouseenter="isHoveringResizer = true"
							@mouseleave="isHoveringResizer = false"
						></div>
					</th>
				</tr>
			</thead>
			<tbody class="mud-table-body">
				<tr
					v-for="(item, index) in paginatedItems"
					:key="index"
					class="mud-table-row"
					:class="{
						'mud-table-row-hover': hover,
						'mud-table-row-striped': striped,
						'mud-table-row-clickable': hover,
					}"
					@click="emit('row-click', item)"
				>
					<td
						v-for="header in visibleHeaders"
						:key="header.key"
						class="mud-table-cell"
						:class="[
							`mud-table-cell-${header.key}`,
							`u-text-${header.align || 'left'}`,
							{
								'mud-table-cell-dense': dense,
								'mud-table-cell-fixed-left': header.fixed === 'left',
								'mud-table-cell-fixed-right': header.fixed === 'right',
							},
						]"
						:style="{
							width: header._width || header.width,
							minWidth:
								header._width ||
								header.minWidth ||
								(header.width && header.width.endsWith('px')
									? header.width
									: '100px'),
							left: header.fixed === 'left' ? header.fixedOffset || '0' : undefined,
							right: header.fixed === 'right' ? header.fixedOffset || '0' : undefined,
						}"
						:data-label="header.label"
					>
						<span v-if="header.label" class="mud-table-mobile-label">
							<i v-if="header.mobileIcon" class="mdi" :class="header.mobileIcon"></i>
							{{ header.label }}
						</span>
						<slot :name="`item-${header.key}`" :item="item" :index="index">
							<HighlightText :text="item[header.key]" :query="searchQuery" />
						</slot>
					</td>
				</tr>
				<tr v-if="!items || items.length === 0" class="mud-table-empty-row">
					<td
						:colspan="visibleHeaders.length"
						class="mud-table-cell mud-table-empty-cell"
					>
						{{ emptyMessage || "No data available." }}
					</td>
				</tr>
			</tbody>
		</table>
		<div class="mud-table-pagination" v-if="paginate && items && items.length > 0">
			<div class="mud-table-column-settings" style="margin-right: auto">
				<button
					class="btn btn--outlined"
					@click="toggleColumnSettings"
					title="Customize Columns"
					style="display: flex; align-items: center; gap: 6px"
				>
					<i class="mdi mdi-view-column-outline"></i> Columns
				</button>
				<Teleport to="body">
					<Dialog v-model="showColumnSettings" title="Customize Columns">
						<div class="column-settings-container">
							<div class="column-settings-list">
								<label
									v-for="header in tempHeaders"
									:key="header.key"
									class="column-setting-item"
								>
									<div class="checkbox-wrapper">
										<input type="checkbox" v-model="header.visible" />
										<div class="checkbox-custom">
											<i class="mdi mdi-check"></i>
										</div>
									</div>
									<span class="column-label">{{ header.label }}</span>
								</label>
							</div>
						</div>
						<template #footer>
							<div
								style="
									display: flex;
									align-items: center;
									justify-content: space-between;
									width: 100%;
								"
							>
								<Button
									variant="outlined"
									@click="toggleSelectAll"
									style="
										padding: 6px 14px;
										font-size: 13px;
										display: flex;
										align-items: center;
										gap: 6px;
									"
								>
									<i class="mdi mdi-check-all"></i> Select All
								</Button>
								<div style="display: flex; align-items: center; gap: 8px">
									<Button variant="secondary" @click="showColumnSettings = false"
										>Cancel</Button
									>
									<Button variant="primary" @click="applyColumnSettings"
										>Apply</Button
									>
								</div>
							</div>
						</template>
					</Dialog>
				</Teleport>
			</div>
			<div class="mud-table-pagination-spacer"></div>
			<div class="mud-table-pagination-select">
				<span>Rows per page:</span>
				<select :value="rowsPerPage" @change="handleRowsPerPageChange">
					<option v-for="opt in rowsPerPageOptions" :key="opt" :value="opt">
						{{ opt }}
					</option>
				</select>
			</div>
			<div class="mud-table-pagination-display">
				{{ paginationText }}
			</div>
			<div class="mud-table-pagination-actions">
				<button
					class="btn btn--icon"
					:disabled="currentPage === 1"
					@click="goToPage(1)"
					title="First page"
				>
					<i class="mdi mdi-page-first"></i>
				</button>
				<button
					class="btn btn--icon"
					:disabled="currentPage === 1"
					@click="goToPage(currentPage - 1)"
					title="Previous page"
				>
					<i class="mdi mdi-chevron-left"></i>
				</button>
				<button
					class="btn btn--icon"
					:disabled="currentPage === totalPages"
					@click="goToPage(currentPage + 1)"
					title="Next page"
				>
					<i class="mdi mdi-chevron-right"></i>
				</button>
				<button
					class="btn btn--icon"
					:disabled="currentPage === totalPages"
					@click="goToPage(totalPages)"
					title="Last page"
				>
					<i class="mdi mdi-page-last"></i>
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.mud-table-container {
	width: 100%;
	max-width: 100%;
	background-color: var(--colors-surface-card);
	color: var(--colors-text-primary);
	border-radius: 6px;
	overflow-x: auto;
	-webkit-overflow-scrolling: touch;
	transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;

	&.mud-table-outlined {
		border: 1px solid var(--colors-surface-border);
	}
}

.mud-table-root {
	width: 100%;
	min-width: 100%;
	display: table;
	border-spacing: 0;
	border-collapse: collapse;

	&--bordered {
		.mud-table-cell {
			border-right: 1px solid var(--colors-surface-border);

			&:last-child {
				border-right: none;
			}
		}
	}
}

.mud-table-head {
	display: table-header-group;
	background-color: var(--colors-brand-primary);

	.mud-table-cell {
		color: #ffffff;
		font-weight: 600;
		line-height: 1.5rem;
		border-bottom: 1px solid var(--colors-surface-border);
		padding: 14px 16px;
		white-space: nowrap;
		box-sizing: border-box;
	}

	:global([data-theme="dark"]) & {
		background-color: #333336;

		.mud-table-cell {
			color: var(--colors-text-primary);
			border-bottom-color: #404040;
		}
	}
}

.mud-table-body {
	display: table-row-group;
}

.mud-table-row {
	color: inherit;
	display: table-row;
	vertical-align: middle;
	outline: 0;

	&.mud-table-row-hover:hover {
		background-color: var(--colors-surface-hover);
	}

	&:nth-of-type(even) {
		background-color: rgba(0, 0, 0, 0.05);
	}

	&.mud-table-row-striped:nth-of-type(odd) {
		background-color: rgba(0, 0, 0, 0.02);
	}

	&:last-child .mud-table-cell {
		border-bottom: none;
	}
}

.mud-table-row-clickable {
	cursor: pointer;
}

:global([data-theme="dark"]) .mud-table-row-striped:nth-of-type(odd) {
	background-color: rgba(255, 255, 255, 0.02);
}

:global([data-theme="dark"]) .mud-table-row:nth-of-type(even) {
	background-color: rgba(255, 255, 255, 0.03);
}

.mud-table-cell {
	display: table-cell;
	padding: 14px 16px;
	font-size: 0.875rem;
	text-align: left;
	font-weight: 400;
	line-height: 1.43;
	border-bottom: 1px solid var(--colors-surface-border);
	letter-spacing: 0.01071em;
	vertical-align: middle;
	white-space: normal;
	word-break: break-word;
	overflow-wrap: break-word;

	&-dense {
		padding: 6px 24px 6px 16px;
	}
}

.mud-table-cell-fixed-left,
.mud-table-cell-fixed-right {
	position: sticky;
	z-index: 2;
	background: var(--colors-surface-card);
}

.mud-table-cell-header.mud-table-cell-fixed-left,
.mud-table-cell-header.mud-table-cell-fixed-right {
	z-index: 4;
	background: var(--colors-brand-primary);
}

.mud-table-mobile-label {
	display: none;
}

.mud-table-cell-actions,
.mud-table-cell-status,
.mud-table-cell-select,
.mud-table-cell-code,
.mud-table-cell-woNumber,
.mud-table-cell-createdAt {
	white-space: nowrap;
}

.sort-icon-group {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	margin-left: 6px;
	vertical-align: middle;

	i {
		font-size: 14px;
	}
}

.sort-priority-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 16px;
	height: 16px;
	padding: 0 4px;
	font-size: 10px;
	font-weight: 700;
	border-radius: 8px;
	background-color: var(--colors-brand-primary, #5058f2);
	color: #ffffff;
	line-height: 1;
}

.mud-table-empty-row {
	display: table-row;
	vertical-align: middle;
}

.mud-table-empty-cell {
	text-align: center !important;
	color: var(--colors-text-muted);
	padding: 32px 16px !important;
	border-bottom: none;
}

/* Elevation classes based on Material Design */
.mud-elevation-1 {
	box-shadow:
		0px 2px 1px -1px rgba(0, 0, 0, 0.2),
		0px 1px 1px 0px rgba(0, 0, 0, 0.14),
		0px 1px 3px 0px rgba(0, 0, 0, 0.12);
}
.mud-elevation-2 {
	box-shadow:
		0px 3px 1px -2px rgba(0, 0, 0, 0.2),
		0px 2px 2px 0px rgba(0, 0, 0, 0.14),
		0px 1px 5px 0px rgba(0, 0, 0, 0.12);
}
.mud-elevation-3 {
	box-shadow:
		0px 3px 3px -2px rgba(0, 0, 0, 0.2),
		0px 3px 4px 0px rgba(0, 0, 0, 0.14),
		0px 1px 8px 0px rgba(0, 0, 0, 0.12);
}
.mud-elevation-4 {
	box-shadow:
		0px 2px 4px -1px rgba(0, 0, 0, 0.2),
		0px 4px 5px 0px rgba(0, 0, 0, 0.14),
		0px 1px 10px 0px rgba(0, 0, 0, 0.12);
}

.u-text-left {
	text-align: left !important;
}
.u-text-center {
	text-align: center !important;
}
.u-text-right {
	text-align: right !important;
}

/* Pagination Styles */
.mud-table-pagination {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: 12px 16px;
	border-top: 1px solid var(--colors-surface-border);
	font-size: 0.875rem;
	color: var(--colors-text-secondary);
	gap: 24px;
	flex-wrap: wrap;

	&-spacer {
		flex: 1 1 100%;
		display: none;
	}

	&-select {
		display: flex;
		align-items: center;
		gap: 8px;

		select {
			background: transparent;
			border: none;
			color: inherit;
			font-size: inherit;
			outline: none;
			cursor: pointer;
			padding: 4px;

			&:focus {
				border-bottom: 1px solid var(--colors-brand-primary);
			}

			option {
				color: var(--colors-text-primary);
				background: var(--colors-surface-card);
			}
		}
	}

	&-display {
		min-width: 80px;
		text-align: right;
	}

	&-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	@media (max-width: 767px) {
		justify-content: center;
		padding: 12px;
		gap: 16px;

		&-display {
			width: 100%;
			text-align: center;
			order: -1;
			margin-bottom: 4px;
		}

		&-select {
			margin-right: auto;
		}

		&-actions {
			margin-left: auto;
		}
	}
}

@media (max-width: 767px) {
	.mud-table-head {
		display: none;
	}

	.mud-table-root {
		min-width: 100%;
		border-collapse: separate;
		border-spacing: 0 16px; /* adds spacing between rows instead of margin */
	}

	.mud-table-body {
		display: block;
	}

	.mud-table-row {
		display: block;
		margin-bottom: 16px;
		background: var(--colors-surface-card);
		border: 1px solid var(--colors-surface-border);
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		overflow: hidden;

		&.mud-table-row-striped:nth-of-type(odd) {
			background-color: var(--colors-surface-card);
		}
	}

	.mud-table-empty-row {
		display: block;
		box-shadow: none;
		border: none;
		background: transparent;
	}

	.mud-table-cell {
		position: static !important;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		text-align: right;
		white-space: normal;
		border-bottom: 1px solid var(--colors-surface-border);
		gap: 16px;
		width: 100% !important;
		min-width: 0 !important;
		max-width: none !important;
		box-sizing: border-box;
		word-break: break-word;

		// Override all u-text-* alignment classes in mobile — value always right-aligned
		&.u-text-left,
		&.u-text-center,
		&.u-text-right {
			text-align: right !important;
		}

		&:last-child {
			border-bottom: none;
		}

		.mud-table-mobile-label {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			font-weight: 600;
			color: var(--colors-text-secondary);
			text-align: left;
			flex-shrink: 0;
			max-width: 45%;

			i {
				font-size: 16px;
				color: var(--colors-brand-primary);
			}
		}
	}

	.mud-table-cell-select {
		display: none !important;
	}

	.mud-table-empty-cell {
		justify-content: center;

		&::before {
			display: none;
		}
	}
}

@media (max-width: 767px) {
	.mud-table-container {
		background: transparent !important;
		box-shadow: none !important;
		border: none !important;
		padding: 0 !important;
	}
}

/* Header Specific Additions */
.mud-table-cell-header {
	position: relative;
	user-select: none;

	&.sortable-header {
		cursor: pointer;
	}

	&.dragging {
		opacity: 0.5;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.sort-icon {
		font-size: 14px;
		display: flex;
		align-items: center;
	}

	.resizer {
		position: absolute;
		right: -8px;
		top: 0;
		bottom: 0;
		width: 16px;
		cursor: col-resize;
		z-index: 10;
		background-color: transparent;
		touch-action: none;

		&::after {
			content: "";
			position: absolute;
			left: 7px;
			top: 0;
			bottom: 0;
			width: 2px;
			background-color: transparent;
			transition: background-color 0.2s;
		}

		&:hover::after,
		&.resizing::after {
			background-color: rgba(255, 255, 255, 0.6);
		}
	}

	:global([data-theme="dark"]) .resizer {
		&:hover::after,
		&.resizing::after {
			background-color: rgba(255, 255, 255, 0.4);
		}
	}
}

.mud-table-column-settings {
	position: relative;
	display: flex;
	align-items: center;
}

/* Customize Columns Modal Styles */
.column-settings-container {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 8px 0;
	min-width: 320px;
}

.column-settings-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: 16px;
	border-top: 1px solid var(--colors-surface-border);
	margin-top: 8px;

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: 0.875rem;
		padding: 0 16px;
		height: 36px;
		min-width: 120px;
		color: var(--colors-text-primary);
		background-color: transparent;
		border: 1px solid var(--colors-surface-border);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			color: var(--colors-brand-primary);
			border-color: var(--colors-brand-primary);
			background-color: var(--colors-surface-hover);
		}

		&:active {
			transform: scale(0.98);
		}

		&.apply-btn {
			background-color: var(--colors-brand-primary);
			color: #ffffff;
			border-color: var(--colors-brand-primary);
			font-weight: 500;

			&:hover {
				opacity: 0.9;
				color: #ffffff;
			}
		}

		i {
			font-size: 1.1rem;
		}
	}
}

.column-settings-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 8px 16px;
	max-height: 400px;
	overflow-y: auto;
	padding-right: 8px;

	/* Custom Scrollbar */
	&::-webkit-scrollbar {
		width: 6px;
	}
	&::-webkit-scrollbar-track {
		background: transparent;
	}
	&::-webkit-scrollbar-thumb {
		background: var(--colors-surface-border);
		border-radius: 4px;
	}
	&::-webkit-scrollbar-thumb:hover {
		background: var(--colors-text-muted);
	}
}

.column-setting-item {
	display: flex;
	align-items: center;
	gap: 12px;
	cursor: pointer;
	padding: 8px 12px;
	border-radius: 8px;
	transition:
		background-color 0.2s,
		transform 0.1s;
	user-select: none;
	border: 1px solid transparent;

	&:hover {
		background-color: var(--colors-surface-hover);
		border-color: var(--colors-surface-border);
	}

	&:active {
		transform: scale(0.98);
	}

	.column-label {
		font-size: 0.95rem;
		color: var(--colors-text-primary);
		font-weight: 500;
	}
}

.checkbox-wrapper {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;

	input[type="checkbox"] {
		position: absolute;
		opacity: 0;
		width: 100%;
		height: 100%;
		cursor: pointer;
		z-index: 2;
		margin: 0;

		&:checked + .checkbox-custom {
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

			i {
				display: none;
			}
		}

		&:focus-visible + .checkbox-custom {
			box-shadow:
				0 0 0 2px var(--colors-surface-card),
				0 0 0 4px var(--colors-brand-primary);
		}
	}
}

.checkbox-custom {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	border: 2px solid var(--colors-text-muted);
	border-radius: 4px;
	background-color: transparent;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1;

	i {
		color: white;
		font-size: 14px;
		transform: scale(0.5);
		opacity: 0;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		font-weight: bold;
	}
}
</style>
