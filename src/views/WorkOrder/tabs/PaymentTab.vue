<script setup lang="ts">
import { getFileIcon } from "@/utils/file";
import { ref } from "vue";
import Button from "@/components/Button.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();

const props = defineProps<{
	workOrder: any;
	invoices: any[];
	payments: any[];
	totalInvoiceIssued: number;
	totalPaymentReceived: number;
	balanceRemaining: number;
	isFullyPaid: boolean;
}>();

const emit = defineEmits([
	"uploadInvoice",
	"editInvoice",
	"deleteFile",
	"uploadPayment",
	"deletePayment",
	"preview",
	"editPayment",
]);

const invoiceInput = ref<HTMLInputElement | null>(null);
const paymentInput = ref<HTMLInputElement | null>(null);
const dateFormatStore = useDateFormatStore();
</script>

<template>
	<!-- Payment Header -->
	<div
		class="card-header"
		style="display: flex; justify-content: space-between; align-items: flex-start"
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

	<!-- Payment Content -->
	<div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px">
		<!-- Payment Status Alert -->
		<div
			v-if="invoices.length > 0"
			class="payment-status-alert"
			:class="isFullyPaid ? 'alert-success' : 'alert-pending'"
		>
			<i :class="isFullyPaid ? 'mdi mdi-check-decagram' : 'mdi mdi-information-outline'"></i>
			<span v-if="isFullyPaid">
				All invoices are fully paid. The payment balance is RM 0.00.
			</span>
			<span v-else>
				Payment is pending. Remaining balance:
				<strong>RM {{ Math.max(0, balanceRemaining).toFixed(2) }}</strong>
			</span>
		</div>

		<!-- Payment Summary Bar -->
		<div class="payment-summary-bar" v-if="invoices.length > 0">
			<div class="psum-item">
				<span class="psum-label">Total Invoice Issued</span>
				<span class="psum-value">RM {{ totalInvoiceIssued.toFixed(2) }}</span>
			</div>
			<div class="psum-divider"></div>
			<div class="psum-item">
				<span class="psum-label">Total Payment Received</span>
				<span class="psum-value psum-value--paid"
					>RM {{ totalPaymentReceived.toFixed(2) }}</span
				>
			</div>
			<div class="psum-divider"></div>
			<div class="psum-item">
				<span class="psum-label">Balance Remaining</span>
				<span
					class="psum-value"
					:class="balanceRemaining <= 0 ? 'psum-value--zero' : 'psum-value--due'"
				>
					RM {{ Math.max(0, balanceRemaining).toFixed(2) }}
				</span>
			</div>
		</div>
	</div>

	<!-- Invoices Section -->
	<div class="payment-section">
		<div class="payment-section__header">
			<div>
				<h4 class="payment-section__title">
					<i class="mdi mdi-file-document-multiple"></i>
					Invoices Issued
				</h4>
				<p class="text-muted" style="font-size: 13px; margin: 4px 0 0 0">
					{{ invoices.length }} invoice(s) totalling RM
					{{ totalInvoiceIssued.toFixed(2) }}
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
				v-if="workOrder?.status === 'Completed' && authStore.can('create', 'WorkOrderInvoice')"
			>
				<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Invoice
			</Button>
		</div>

		<div v-if="invoices.length === 0" class="payment-empty-state">
			<i class="mdi mdi-file-document-outline"></i>
			<p>No invoices added yet. Click "Add Invoice" to get started.</p>
		</div>

		<div class="invoice-list" v-else>
			<div
				v-for="inv in invoices"
				:key="inv.id"
				class="document-card"
				@click="emit('preview', inv)"
			>
				<div class="doc-icon">
					<i class="mdi text-danger" :class="getFileIcon(inv.name)" style="font-size: 32px"></i>
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
								>RM {{ inv.amount.toFixed(2) }}</span
							>
						</div>
					</div>
				</div>
				<div class="doc-actions">
					<button
						class="btn-icon"
						@click.stop="emit('preview', inv)"
						title="View Invoice"
					>
						<i class="mdi mdi-eye-outline" style="font-size: 19px"></i>
					</button>
					<button
						v-if="
							(workOrder?.status === 'Completed' || workOrder?.status === 'Claimed') &&
							authStore.can('update', 'WorkOrderInvoice')
						"
						class="btn-icon"
						@click.stop="emit('editInvoice', inv.guid || '')"
						title="Edit Details"
					>
						<i class="mdi mdi-pencil" style="font-size: 18px"></i>
					</button>
					<button
						v-if="
							(workOrder?.status === 'Completed' || workOrder?.status === 'Claimed') &&
							authStore.can('delete', 'WorkOrderInvoice')
						"
						class="btn-icon"
						@click.stop="emit('deleteFile', inv.guid || '')"
						title="Remove Invoice"
					>
						<i class="mdi mdi-delete" style="font-size: 20px"></i>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Payments Section -->
	<div
		class="payment-section"
		v-if="workOrder?.status === 'Claimed' || workOrder?.status === 'Closed'"
	>
		<div class="payment-section__header">
			<div>
				<h4 class="payment-section__title">
					<i class="mdi mdi-cash-multiple"></i> Payments Received
				</h4>
				<p class="text-muted" style="font-size: 13px; margin: 4px 0 0 0">
					{{ payments.length }} payment(s) totalling RM
					{{ totalPaymentReceived.toFixed(2) }}
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
				v-if="workOrder?.status === 'Claimed' && authStore.can('create', 'Payment')"
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
						<th>Payment File</th>
						<th>Date</th>
						<th>Reference</th>
						<th style="text-align: right">Amount</th>
						<th style="width: 132px; text-align: right">Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="pay in payments"
						:key="pay.id"
						class="pay-table__clickable-row"
						@click="emit('preview', pay)"
					>
						<td>
							<div class="payment-file-cell">
								<div>
									<div class="payment-file-name">{{ pay.fileName }}</div>
									<div class="payment-file-type">PDF document</div>
								</div>
							</div>
						</td>
						<td>{{ dateFormatStore.formatDate(pay.date) }}</td>
						<td class="text-muted">{{ pay.reference || "—" }}</td>
						<td style="text-align: right; font-weight: 600">
							{{ pay.amount.toFixed(2) }}
						</td>
						<td>
							<div class="payment-row-actions">
								<button
									class="btn-icon-sm"
									@click.stop="emit('preview', pay)"
									title="View Payment File"
								>
									<i class="mdi mdi-eye-outline"></i>
								</button>
								<button
									v-if="workOrder?.status === 'Claimed' && authStore.can('update', 'Payment')"
									class="btn-icon-sm"
									@click.stop="emit('editPayment', pay.guid || '')"
									title="Edit Payment Details"
								>
									<i class="mdi mdi-pencil-outline"></i>
								</button>
								<button
									v-if="workOrder?.status === 'Claimed' && authStore.can('delete', 'Payment')"
									class="btn-icon-sm btn-icon-sm--danger"
									@click.stop="emit('deletePayment', pay.guid || '')"
									title="Remove Payment"
								>
									<i class="mdi mdi-delete-outline"></i>
								</button>
							</div>
						</td>
					</tr>
				</tbody>
				<tfoot>
					<tr>
						<td colspan="3" style="text-align: right; font-weight: 600">
							Total Received:
						</td>
						<td
							colspan="2"
							style="
								text-align: left;
								font-weight: 700;
								font-size: 16px;
								color: #10b981;
							"
						>
							RM {{ totalPaymentReceived.toFixed(2) }}
						</td>
						<td></td>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use "@/styles/pages/WorkOrder/tabs/_payment-tab.scss";
</style>
