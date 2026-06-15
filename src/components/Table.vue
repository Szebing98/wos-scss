<template>
	<table class="data-table">
		<thead>
			<tr>
				<th 
					v-for="header in headers" 
					:key="header.key" 
					:class="`u-text-${header.align || 'left'}`"
					:style="{ width: header.width }"
				>
					{{ header.label }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="(item, index) in items" :key="index">
				<td 
					v-for="header in headers" 
					:key="header.key"
					:class="`u-text-${header.align || 'left'}`"
				>
					<slot :name="`item-${header.key}`" :item="item" :index="index">
						{{ item[header.key] }}
					</slot>
				</td>
			</tr>
			<tr v-if="!items || items.length === 0">
				<td :colspan="headers.length" class="data-table__empty">
					{{ emptyMessage || 'No data available.' }}
				</td>
			</tr>
		</tbody>
	</table>
</template>

<script setup lang="ts">
export interface TableHeader {
	key: string;
	label: string;
	align?: "left" | "center" | "right";
	width?: string;
}

defineProps<{
	headers: TableHeader[];
	items: any[];
	emptyMessage?: string;
}>();
</script>

<style lang="scss" scoped>
.data-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
	table-layout: fixed;

	th,
	td {
		padding: var(--spacing-sm) var(--spacing-md);
		text-align: left;
	}

	th {
		color: var(--colors-text-muted);
		border-bottom: 1px solid var(--colors-surface-border);
		font-weight: 600;
	}

	tr {
		border-bottom: 1px solid var(--colors-surface-border);
		&:last-child {
			border-bottom: none;
		}
		&:hover {
			background-color: var(--colors-surface-hover);
		}
	}

	&__empty {
		text-align: center !important;
		color: var(--colors-text-muted);
		padding: 32px !important;
	}
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
</style>
