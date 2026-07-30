<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";

const props = defineProps<{
	workOrder: any;
	invoices: any[];
	payments: any[];
	totalInvoiceIssued: number;
	totalPaymentReceived: number;
	balanceRemaining: number;
	isFullyPaid: boolean;
}>();

const emit = defineEmits(["uploadInvoice", "editInvoice", "deleteFile", "uploadPayment", "deletePayment"]);

const invoiceInput = ref<HTMLInputElement | null>(null);
const paymentInput = ref<HTMLInputElement | null>(null);
const dateFormatStore = useDateFormatStore();
</script>

<template>
	<div
		class="card-header"
		style="
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		"
	>
		<div>
			<h3>Payment</h3>
			<p class="text-muted">Manage invoices issued and payments received.</p>
		</div>
		<!-- Payment status badge -->
		<div
			v-if="invoices.length > 0"
			class="payment-status-badge"
			:class="isFullyPaid ? 'badge-paid' : 'badge-pending'"
		>
			<i :class="isFullyPaid ? 'mdi mdi-check-circle' : 'mdi mdi-clock-outline'"></i>
			{{ isFullyPaid ? "Fully Paid" : "Payment Pending" }}
		</div>
	</div>

	<!-- Payment Summary Bar -->
	<div class="payment-summary-bar" v-if="invoices.length > 0">
		<div class="psum-item">
			<span class="psum-label">Total Invoice Issued</span>
			<span class="psum-value">${{ totalInvoiceIssued.toFixed(2) }}</span>
		</div>
		<div class="psum-divider"></div>
		<div class="psum-item">
			<span class="psum-label">Total Payment Received</span>
			<span class="psum-value psum-value--paid">${{ totalPaymentReceived.toFixed(2) }}</span>
		</div>
		<div class="psum-divider"></div>
		<div class="psum-item">
			<span class="psum-label">Balance Remaining</span>
			<span
				class="psum-value"
				:class="balanceRemaining <= 0 ? 'psum-value--zero' : 'psum-value--due'"
			>
				${{ Math.max(0, balanceRemaining).toFixed(2) }}
			</span>
		</div>
	</div>

	<!-- Invoices Section -->
	<div class="payment-section">
		<div class="payment-section__header">
			<div>
				<h4 class="payment-section__title">
					<i class="mdi mdi-file-document-multiple"></i> Invoices Issued
				</h4>
				<p class="text-muted" style="font-size: 13px; margin: 4px 0 0 0">
					{{ invoices.length }} invoice(s) totalling ${{ totalInvoiceIssued.toFixed(2) }}
				</p>
			</div>
			<input
				type="file"
				ref="invoiceInput"
				style="display: none"
				@change="emit('uploadInvoice', $event)"
				accept="application/pdf,image/*"
			/>
			<Button
				variant="primary"
				@click="invoiceInput?.click()"
				v-if="workOrder?.status === 'Completed' || workOrder?.status === 'Claimed'"
			>
				<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Invoice
			</Button>
		</div>

		<div v-if="invoices.length === 0" class="payment-empty-state">
			<i class="mdi mdi-file-document-outline"></i>
			<p>No invoices added yet. Click "Add Invoice" to get started.</p>
		</div>

		<div class="invoice-list" v-else>
			<div v-for="inv in invoices" :key="inv.id" class="document-card">
				<div class="doc-icon">
					<i class="mdi mdi-file-pdf-box text-danger" style="font-size: 32px"></i>
				</div>
				<div class="doc-info">
					<h4>{{ inv.name }}</h4>
					<div class="ocr-details">
						<div class="ocr-field">
							<span class="label">Invoice No:</span>
							<span class="value">{{ inv.refNo }}</span>
						</div>
						<div class="ocr-field">
							<span class="label">Date Issued:</span>
							<span class="value">{{ dateFormatStore.formatDate(inv.date) }}</span>
						</div>
						<div class="ocr-field">
							<span class="label">Amount:</span>
							<span class="value text-primary font-weight-bold"
								>${{ inv.amount.toFixed(2) }}</span
							>
						</div>
					</div>
				</div>
				<div
					class="doc-actions"
					v-if="workOrder?.status === 'Completed' || workOrder?.status === 'Claimed'"
				>
					<button class="btn-icon" @click="emit('editInvoice', inv.guid || '')" title="Edit Details">
						<i class="mdi mdi-pencil" style="font-size: 18px"></i>
					</button>
					<button class="btn-icon" @click="emit('deleteFile', inv.guid || '')" title="Remove Invoice">
						<i class="mdi mdi-delete" style="font-size: 20px"></i>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Payments Section -->
	<div class="payment-section">
		<div class="payment-section__header">
			<div>
				<h4 class="payment-section__title">
					<i class="mdi mdi-cash-multiple"></i> Payments Received
				</h4>
				<p class="text-muted" style="font-size: 13px; margin: 4px 0 0 0">
					{{ payments.length }} payment(s) totalling ${{ totalPaymentReceived.toFixed(2) }}
				</p>
			</div>
			<input
				type="file"
				ref="paymentInput"
				style="display: none"
				@change="emit('uploadPayment', $event)"
				accept="application/pdf,image/*"
			/>
			<Button
				variant="primary"
				@click="paymentInput?.click()"
				v-if="workOrder?.status === 'Claimed'"
				:disabled="invoices.length === 0"
				:title="invoices.length === 0 ? 'Please add an invoice first' : 'Add Payment'"
			>
				<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Payment
			</Button>
		</div>

		<div v-if="payments.length === 0" class="payment-empty-state">
			<i class="mdi mdi-cash-remove"></i>
			<p>No payments recorded yet.</p>
		</div>

		<div class="payments-table" v-else>
			<table class="pay-table">
				<thead>
					<tr>
						<th>Date</th>
						<th>Payment Method</th>
						<th>Reference</th>
						<th style="text-align: right">Amount</th>
						<th style="width: 60px"></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="pay in payments" :key="pay.id">
						<td>{{ dateFormatStore.formatDate(pay.date) }}</td>
						<td>
							<span class="method-badge">
								<i class="mdi mdi-bank" v-if="pay.method === 'Bank Transfer'"></i>
								<i class="mdi mdi-credit-card" v-else-if="pay.method === 'Credit Card'"></i>
								<i class="mdi mdi-cash" v-else></i>
								{{ pay.method }}
							</span>
						</td>
						<td class="text-muted">{{ pay.reference || "—" }}</td>
						<td style="text-align: right; font-weight: 600; color: #10b981">
							${{ pay.amount.toFixed(2) }}
						</td>
						<td>
							<button
								v-if="workOrder?.status === 'Claimed'"
								class="btn-icon-sm"
								@click="emit('deletePayment', pay.guid || '')"
								title="Remove"
							>
								<i class="mdi mdi-delete-outline"></i>
							</button>
						</td>
					</tr>
				</tbody>
				<tfoot>
					<tr>
						<td colspan="3" style="text-align: right; font-weight: 600">Total Received:</td>
						<td style="text-align: right; font-weight: 700; font-size: 16px; color: #10b981">
							${{ totalPaymentReceived.toFixed(2) }}
						</td>
						<td></td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>

	<!-- Payment Status Alert -->
	<div
		v-if="invoices.length > 0"
		class="payment-status-alert"
		:class="isFullyPaid ? 'alert-success' : 'alert-pending'"
	>
		<i :class="isFullyPaid ? 'mdi mdi-check-decagram' : 'mdi mdi-information-outline'"></i>
		<span v-if="isFullyPaid">
			All invoices are fully paid. Use the
			<strong>Mark as Claimed</strong> button at the top right to proceed.
		</span>
		<span v-else>
			Payment is pending. Remaining balance:
			<strong>${{ Math.max(0, balanceRemaining).toFixed(2) }}</strong>
		</span>
	</div>
</template>

<style scoped lang="scss">
.payment-status-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 14px;
	border-radius: 20px;
	font-size: 13px;
	font-weight: 600;
	&.badge-paid {
		background: rgba(16, 185, 129, 0.12);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}
	&.badge-pending {
		background: rgba(245, 158, 11, 0.12);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}
}

.payment-summary-bar {
	display: flex;
	align-items: center;
	gap: 0;
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	overflow: hidden;
	margin-bottom: 24px;
}

.psum-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 16px 20px;
	.psum-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--colors-text-muted);
	}
	.psum-value {
		font-size: 20px;
		font-weight: 700;
		color: var(--colors-text-primary);
		&.psum-value--paid {
			color: #10b981;
		}
		&.psum-value--due {
			color: #ef4444;
		}
		&.psum-value--zero {
			color: #10b981;
		}
	}
}

.psum-divider {
	width: 1px;
	align-self: stretch;
	background: var(--colors-surface-border);
}

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

.pay-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 14px;
	th {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--colors-text-muted);
		padding: 8px 12px;
		border-bottom: 1px solid var(--colors-surface-border);
		text-align: left;
	}
	td {
		padding: 12px;
		border-bottom: 1px solid var(--colors-surface-border);
		color: var(--colors-text-secondary);
	}
	tfoot td {
		border-bottom: none;
		padding-top: 16px;
	}
	tr:last-child td {
		border-bottom: none;
	}
}

.method-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: var(--colors-surface-background);
	padding: 3px 10px;
	border-radius: 12px;
	font-size: 13px;
	border: 1px solid var(--colors-surface-border);
}

.btn-icon-sm {
	background: none;
	border: none;
	cursor: pointer;
	color: var(--colors-text-muted);
	padding: 4px;
	border-radius: 4px;
	font-size: 16px;
	transition: all 0.2s;
	&:hover {
		color: var(--colors-danger);
		background: rgba(239, 68, 68, 0.1);
	}
}

.payment-status-alert {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 18px;
	border-radius: 10px;
	font-size: 14px;
	line-height: 1.5;

	i {
		font-size: 20px;
		flex-shrink: 0;
	}

	&.alert-success {
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.25);
		color: #065f46;
		i {
			color: #10b981;
		}
	}
	&.alert-pending {
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.25);
		color: #92400e;
		i {
			color: #f59e0b;
		}
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
