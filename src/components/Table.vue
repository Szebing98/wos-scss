<script setup lang="ts">
import { ref, computed } from "vue";

export interface TableHeader {
	key: string;
	label: string;
	align?: "left" | "center" | "right";
	width?: string;
}

const props = withDefaults(defineProps<{
	headers: TableHeader[];
	items: any[];
	emptyMessage?: string;
	hover?: boolean;
	striped?: boolean;
	dense?: boolean;
	elevation?: number;
	outlined?: boolean;
	paginate?: boolean;
	rowsPerPageOptions?: number[];
}>(), {
	emptyMessage: 'No data available.',
	hover: false,
	striped: false,
	dense: false,
	elevation: 0,
	outlined: false,
	paginate: false,
	rowsPerPageOptions: () => [10, 25, 50, 100]
});

const emit = defineEmits<{
	'row-click': [item: any]
}>();


const currentPage = ref(1);
const rowsPerPage = ref(10);

// Initialize rowsPerPage with the first option
if (props.rowsPerPageOptions && props.rowsPerPageOptions.length > 0) {
	rowsPerPage.value = props.rowsPerPageOptions[0];
}

const totalItems = computed(() => props.items?.length || 0);
const totalPages = computed(() => Math.ceil(totalItems.value / rowsPerPage.value) || 1);

const paginatedItems = computed(() => {
	if (!props.paginate) return props.items;
	const start = (currentPage.value - 1) * rowsPerPage.value;
	return props.items.slice(start, start + rowsPerPage.value);
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
	if (totalItems.value === 0) return '0-0 of 0';
	const start = (currentPage.value - 1) * rowsPerPage.value + 1;
	const end = Math.min(start + rowsPerPage.value - 1, totalItems.value);
	return `${start}-${end} of ${totalItems.value}`;
});

</script>

<template>
	<div 
		class="mud-table-container"
		:class="{
			[`mud-elevation-${elevation}`]:  0,
			'mud-table-outlined': outlined
		}"
	>
		<table class="mud-table-root">
			<thead class="mud-table-head">
				<tr>
					<th 
						v-for="header in headers" 
						:key="header.key" 
						class="mud-table-cell"
						:class="`u-text-${header.align || 'left'}`"
						:style="{ width: header.width }"
					>
						<slot :name="`header-${header.key}`" :header="header">
							{{ header.label }}
						</slot>
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
						'mud-table-row-clickable': hover
					}"
					@click="emit('row-click', item)"
				>
					<td 
						v-for="header in headers" 
						:key="header.key"
						class="mud-table-cell"
						:class="[
							`u-text-${header.align || 'left'}`,
							{ 'mud-table-cell-dense': dense }
						]"
					>
						<slot :name="`item-${header.key}`" :item="item" :index="index">
							{{ item[header.key] }}
						</slot>
					</td>
				</tr>
				<tr v-if="!items || items.length === 0" class="mud-table-empty-row">
					<td :colspan="headers.length" class="mud-table-cell mud-table-empty-cell">
						{{ emptyMessage || 'No data available.' }}
					</td>
				</tr>
			</tbody>
		</table>
		<div class="mud-table-pagination" v-if="paginate && items && items.length > 0">
			<div class="mud-table-pagination-spacer"></div>
			<div class="mud-table-pagination-select">
				<span>Rows per page:</span>
				<select :value="rowsPerPage" @change="handleRowsPerPageChange">
					<option v-for="opt in rowsPerPageOptions" :key="opt" :value="opt">{{ opt }}</option>
				</select>
			</div>
			<div class="mud-table-pagination-display">
				{{ paginationText }}
			</div>
			<div class="mud-table-pagination-actions">
				<button class="btn btn--icon" :disabled="currentPage === 1" @click="goToPage(1)" title="First page">
					<i class="mdi mdi-page-first"></i>
				</button>
				<button class="btn btn--icon" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)" title="Previous page">
					<i class="mdi mdi-chevron-left"></i>
				</button>
				<button class="btn btn--icon" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)" title="Next page">
					<i class="mdi mdi-chevron-right"></i>
				</button>
				<button class="btn btn--icon" :disabled="currentPage === totalPages" @click="goToPage(totalPages)" title="Last page">
					<i class="mdi mdi-page-last"></i>
				</button>
			</div>
		</div>
	</div>
</template>



<style lang="scss" scoped>
.mud-table-container {
	width: 100%;
	background-color: var(--colors-surface-card);
	color: var(--colors-text-primary);
	border-radius: 4px;
	overflow-x: auto;
	transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;

	&.mud-table-outlined {
		border: 1px solid var(--colors-surface-border);
	}
}

.mud-table-root {
	width: 100%;
	display: table;
	border-spacing: 0;
	border-collapse: collapse;
	table-layout: fixed;
}

.mud-table-head {
	display: table-header-group;
	
	.mud-table-cell {
		color: var(--colors-text-secondary);
		font-weight: 500;
		line-height: 1.5rem;
		border-bottom: 1px solid var(--colors-surface-border);
		padding: 16px;
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

:global(body[data-theme="dark"]) .mud-table-row-striped:nth-of-type(odd) {
	background-color: rgba(255, 255, 255, 0.02);
}

.mud-table-cell {
	display: table-cell;
	padding: 16px;
	font-size: 0.875rem;
	text-align: left;
	font-weight: 400;
	line-height: 1.43;
	border-bottom: 1px solid var(--colors-surface-border);
	letter-spacing: 0.01071em;
	vertical-align: inherit;

	&-dense {
		padding: 6px 24px 6px 16px;
	}
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
.mud-elevation-1 { box-shadow: 0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12); }
.mud-elevation-2 { box-shadow: 0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12); }
.mud-elevation-3 { box-shadow: 0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12); }
.mud-elevation-4 { box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12); }

.u-text-left { text-align: left !important; }
.u-text-center { text-align: center !important; }
.u-text-right { text-align: right !important; }

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
}
</style>
