<script setup lang="ts">
withDefaults(defineProps<{ rows?: number; columns?: number }>(), {
	rows: 8,
	columns: 6,
});
</script>

<template>
	<div
		class="content-loader content-loader--table"
		:style="{ '--loader-columns': columns }"
		role="status"
		aria-label="Loading table"
	>
		<div class="content-loader__table-header">
			<span v-for="column in columns" :key="column" class="content-loader__line" />
		</div>
		<div v-for="row in rows" :key="row" class="content-loader__table-row">
			<span
				v-for="column in columns"
				:key="column"
				class="content-loader__line"
				:class="{ 'content-loader__line--short': column === 1 || column === columns }"
			/>
		</div>
	</div>
</template>
