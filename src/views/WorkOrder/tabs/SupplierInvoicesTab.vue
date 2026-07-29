<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";

const props = defineProps<{
	supplierInvoicePhotos: any[];
	isEditing: boolean;
	isManager: boolean;
	workOrderStatus: string;
}>();

const emit = defineEmits(["upload", "delete"]);
const supplierInvoiceInput = ref<HTMLInputElement | null>(null);
</script>

<template>
	<div class="card-header" style="display: flex; justify-content: space-between; align-items: center">
		<div>
			<h3>Supplier Invoices</h3>
			<p class="text-muted">Upload up to 12 supplier invoice photos or scanned documents.</p>
		</div>
		<div style="display: flex; align-items: center; gap: 12px">
			<span class="photo-counter-badge">{{ supplierInvoicePhotos.length }}/12 Files</span>
			<input type="file" ref="supplierInvoiceInput" style="display: none;" @change="emit('upload', $event)" accept="image/*,application/pdf" />
			<Button
				v-if="isEditing || (isManager && workOrderStatus === 'Claimed')"
				variant="primary"
				@click="supplierInvoiceInput?.click()"
				:disabled="supplierInvoicePhotos.length >= 12"
			>
				<i class="mdi mdi-file-upload" style="margin-right: 4px"></i> Add Invoice
			</Button>
		</div>
	</div>
	<div class="photo-grid-12">
		<div
			v-for="photo in supplierInvoicePhotos"
			:key="photo.id"
			class="photo-slot"
		>
			<div class="photo-slot__img-wrap">
				<img :src="photo.url" :alt="photo.name" class="photo-slot__img" />
				<button
					v-if="isEditing || (isManager && workOrderStatus === 'Claimed')"
					class="photo-slot__del"
					@click="emit('delete', photo.guid || '')"
					title="Remove invoice"
				>
					<i class="mdi mdi-close"></i>
				</button>
			</div>
			<div class="photo-slot__name">{{ photo.name }}</div>
		</div>
		<div
			v-if="(isEditing || (isManager && workOrderStatus === 'Claimed')) && supplierInvoicePhotos.length < 12"
			class="photo-slot photo-slot--add"
			@click="supplierInvoiceInput?.click()"
		>
			<i class="mdi mdi-file-plus"></i>
			<span>Upload Invoice</span>
		</div>
		<div v-if="supplierInvoicePhotos.length === 0 && !isEditing && workOrderStatus !== 'Claimed'" class="photo-grid-empty">
			<i class="mdi mdi-file-document-outline"></i>
			<p>No supplier invoices uploaded yet.</p>
		</div>
	</div>
</template>

<style scoped lang="scss">
.photo-counter-badge {
	background: rgba(80, 88, 242, 0.1);
	color: var(--colors-brand-primary);
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 12px;
	font-weight: 600;
}

.photo-grid-12 {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 16px;
	padding-top: 16px;
}

.photo-slot {
	display: flex;
	flex-direction: column;
	gap: 6px;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	padding: 8px;

	&__img-wrap {
		position: relative;
		width: 100%;
		height: 120px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--colors-surface-background);
	}

	&__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	button {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 14px;
		transition: transform 0.2s, background-color 0.2s;

		&:hover {
			background: #dc2626;
			transform: scale(1.1);
		}
	}

	&__name {
		font-size: 11px;
		color: var(--colors-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: center;
	}

	&--add {
		height: 154px;
		border: 2px dashed var(--colors-surface-border);
		background: transparent;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		color: var(--colors-text-muted);
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			border-color: var(--colors-brand-primary);
			color: var(--colors-brand-primary);
			background: rgba(80, 88, 242, 0.04);
		}

		i {
			font-size: 28px;
		}

		span {
			font-size: 12px;
			font-weight: 500;
		}
	}
}

.photo-grid-empty {
	grid-column: 1 / -1;
	text-align: center;
	padding: 40px 20px;
	color: var(--colors-text-muted);

	i {
		font-size: 40px;
		margin-bottom: 8px;
		opacity: 0.4;
	}

	p {
		margin: 0;
		font-size: 13px;
	}
}
</style>
