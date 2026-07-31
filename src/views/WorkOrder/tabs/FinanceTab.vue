<script setup lang="ts">
import { ref, computed } from "vue";
import Button from "@/components/Button.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";

const props = defineProps<{
	quotations: any[];
	totalQuotationAmount: number;
	workOrderStatus: string;
	isEditing: boolean;
	isManager: boolean;
}>();

const emit = defineEmits(["upload", "delete", "edit", "preview"]);

const quotationInput = ref<HTMLInputElement | null>(null);
const dateFormatStore = useDateFormatStore();

const canUpload = computed(() => {
	return props.isEditing || props.workOrderStatus === 'InProgress' || (props.isManager && props.workOrderStatus === 'Claimed');
});
</script>

<template>
	<div
		class="card-header"
		style="display: flex; justify-content: space-between; align-items: flex-start"
	>
		<div>
			<h3>Finance & Quotation</h3>
			<p class="text-muted">Manage quotation documents and track cost summary.</p>
		</div>
	</div>

	<!-- Hidden quotation file input -->
	<input
		type="file"
		ref="quotationInput"
		style="display: none"
		@change="emit('upload', $event)"
		accept="application/pdf,image/*"
	/>

	<!-- Quotations Section -->
	<div class="payment-section">
		<div class="payment-section__header">
			<div>
				<h4 class="payment-section__title">
					<i class="mdi mdi-file-document-multiple"></i> Quotations
				</h4>
				<p class="text-muted" style="font-size: 13px; margin: 4px 0 0 0">
					{{ quotations.length }} quotation(s) totalling RM 
					{{
						totalQuotationAmount.toFixed(2)
					}}
				</p>
			</div>
			<Button
				variant="primary"
				@click="quotationInput?.click()"
				v-if="isEditing || workOrderStatus === 'InProgress' || (isManager && workOrderStatus === 'Claimed')"
			>
				<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Quotation
			</Button>
		</div>

		<div
			v-if="quotations.length === 0"
			class="payment-empty-state"
			:class="{ 'payment-empty-state--clickable': canUpload }"
			@click="canUpload ? quotationInput?.click() : null"
		>
			<i class="mdi mdi-file-document-outline"></i>
			<p>
				No quotations added yet. Click here or "Add Quotation" to upload and scan a quotation PDF.
			</p>
		</div>

		<div class="invoice-list" v-else>
			<div v-for="qt in quotations" :key="qt.id" class="document-card" @click="emit('preview', qt)">
				<div class="doc-icon">
					<i class="mdi mdi-file-pdf-box text-danger" style="font-size: 32px"></i>
				</div>
				<div class="doc-info">
					<h4>{{ qt.name }}</h4>
					<div class="ocr-details">
						<div class="ocr-field">
							<span class="label">Ref No:</span>
							<span class="value">{{ qt.refNo }}</span>
						</div>
						<div class="ocr-field">
							<span class="label">Date Issued:</span>
							<span class="value">{{ dateFormatStore.formatDate(qt.date) }}</span>
						</div>
						<div class="ocr-field">
							<span class="label">Amount:</span>
							<span class="value text-primary font-weight-bold"
								> RM {{ qt.amount.toFixed(2) }}</span
							>
						</div>
					</div>
				</div>
				<div class="doc-actions" v-if="isEditing || workOrderStatus === 'InProgress' || (isManager && workOrderStatus === 'Claimed')">
					<button
						class="btn-icon"
						@click.stop="emit('edit', qt.guid || '')"
						title="Edit Details"
					>
						<i class="mdi mdi-pencil" style="font-size: 18px"></i>
					</button>
					<button
						class="btn-icon"
						@click.stop="emit('delete', qt.guid || '')"
						title="Remove Quotation"
					>
						<i class="mdi mdi-delete" style="font-size: 20px"></i>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.payment-section {
	margin-bottom: 32px;
	&__header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 16px;
	}
	&__title {
		margin: 0 0 4px 0;
		font-size: 16px;
		color: var(--colors-text-primary);
		display: flex;
		align-items: center;
		gap: 8px;
		i {
			color: var(--colors-brand-primary);
		}
	}
}

.payment-empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 32px;
	border: 2px dashed var(--colors-surface-border);
	border-radius: 12px;
	color: var(--colors-text-muted);
	i {
		font-size: 36px;
	}
	p {
		margin: 0;
		font-size: 14px;
	}

	&--clickable {
		cursor: pointer;
		transition: all 0.2s ease-in-out;

		&:hover {
			border-color: var(--colors-brand-primary, #5058f2);
			background-color: rgba(80, 88, 242, 0.02);
			color: var(--colors-brand-primary, #5058f2);
		}
	}
}

.invoice-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.document-card {
	display: flex;
	align-items: center;
	background: var(--colors-surface-background);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: 16px;
	gap: 16px;
	cursor: pointer;
	transition: all 0.2s;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
	&:hover {
		border-color: var(--colors-brand-primary);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}
	.doc-icon {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: rgba(239, 68, 68, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.doc-info {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h4 {
		margin: 0;
		font-size: 15px;
		color: var(--colors-text-primary);
		font-weight: 600;
	}
	.doc-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.btn-icon {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--colors-text-muted);
		padding: 4px;
		border-radius: 4px;
		transition: all 0.2s;
		&:hover {
			color: var(--colors-danger);
			background: rgba(239, 68, 68, 0.1);
		}
	}
}

.ocr-details {
	display: flex;
	gap: 24px;
	flex-wrap: wrap;
}
.ocr-field {
	display: flex;
	flex-direction: column;
	gap: 2px;
	.label {
		font-size: 11px;
		color: var(--colors-text-muted);
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.5px;
	}
	.value {
		font-size: 13px;
		color: var(--colors-text-secondary);
	}
}

.text-danger {
	color: #ef4444;
}
.text-primary {
	color: var(--colors-brand-primary);
}
.font-weight-bold {
	font-weight: 600;
}
</style>
