<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";

const props = defineProps<{
	supplierInvoicePhotos: any[];
	isEditing: boolean;
	isManager: boolean;
	workOrderStatus: string;
}>();

const emit = defineEmits(["upload", "delete", "preview"]);
const supplierInvoiceInput = ref<HTMLInputElement | null>(null);

function isPdfFile(fileName: string) {
	return /\.(pdf)$/i.test(fileName || "");
}
</script>

<template>
	<div
		class="card-header"
		style="display: flex; justify-content: space-between; align-items: center"
	>
		<div style="display: block">
			<div style="display: flex; align-items: center; gap: 12px">
				<h3>Supplier Invoices</h3>
				<span><b> ({{ supplierInvoicePhotos.length }}/12) </b></span>
			</div>
			<p class="text-muted" style="margin: 2px">
				Upload up to 12 supplier invoice photos or scanned documents.
			</p>
		</div>

		<input
			type="file"
			ref="supplierInvoiceInput"
			style="display: none"
			@change="emit('upload', $event)"
			accept="image/*,application/pdf"
		/>

		<Button
			v-if="isEditing || (isManager && workOrderStatus === 'Claimed')"
			variant="primary"
			@click="supplierInvoiceInput?.click()"
			:disabled="supplierInvoicePhotos.length >= 12"
		>
			<i class="mdi mdi-file-upload" style="margin-right: 4px"></i> Add Invoice
		</Button>
	</div>

	<div class="photo-grid-12">
		<div v-for="photo in supplierInvoicePhotos" :key="photo.id" class="photo-slot">
			<button
				v-if="isEditing || (isManager && workOrderStatus === 'Claimed')"
				class="photo-slot__del"
				@click.stop="emit('delete', photo.guid || '')"
				title="Remove invoice"
			>
				<i class="mdi mdi-trash-can-outline"></i>
			</button>
			<div class="photo-slot__img-wrap" @click="emit('preview', photo)">
				<a
					v-if="isPdfFile(photo.name)"
					:href="photo.url"
					target="_blank"
					class="photo-slot__pdf-link"
					@click.stop
				>
					<i class="mdi mdi-file-pdf-box"></i>
					<span>View PDF</span>
				</a>
				<img v-else :src="photo.url" :alt="photo.name" class="photo-slot__img" />
			</div>
			<div class="photo-slot__name" @click="emit('preview', photo)">{{ photo.name }}</div>
		</div>
		<div
			v-if="
				(isEditing || (isManager && workOrderStatus === 'Claimed')) &&
				supplierInvoicePhotos.length < 12
			"
			class="photo-slot photo-slot--add"
			@click="supplierInvoiceInput?.click()"
		>
			<i class="mdi mdi-file-plus"></i>
			<span>Upload Invoice</span>
		</div>
		<div
			v-if="supplierInvoicePhotos.length === 0 && !isEditing && workOrderStatus !== 'Claimed'"
			class="photo-grid-empty"
		>
			<i class="mdi mdi-file-document-outline"></i>
			<p>No supplier invoices uploaded yet.</p>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use "@/styles/pages/WorkOrder/tabs/_supplier-invoices-tab.scss";
</style>
