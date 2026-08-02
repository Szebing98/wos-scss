<script setup lang="ts">
withDefaults(defineProps<{ sections?: number; fieldsPerSection?: number }>(), {
	sections: 3,
	fieldsPerSection: 6,
});
</script>

<template>
	<div class="content-loader content-loader--form" role="status" aria-label="Loading form">
		<div v-for="section in sections" :key="section" class="content-loader__form-section panel-card">
			<span class="content-loader__line content-loader__line--heading" />
			<div class="content-loader__form-grid">
				<div v-for="field in fieldsPerSection" :key="field" class="content-loader__field">
					<span class="content-loader__line content-loader__line--label" />
					<span class="content-loader__control" />
				</div>
			</div>
		</div>
	</div>
</template>
