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
@use "@/styles/components/_table.scss";
</style>
