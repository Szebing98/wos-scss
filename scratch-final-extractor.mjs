import fs from 'fs';

let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

// 1. Add Dialog Imports
content = content.replace(
    /import GeneralTab from "\.\/tabs\/GeneralTab\.vue";/,
    'import RejectDialog from "./dialogs/RejectDialog.vue";\nimport NoteDialog from "./dialogs/NoteDialog.vue";\nimport RepeatDialog from "./dialogs/RepeatDialog.vue";\nimport TransferDialog from "./dialogs/TransferDialog.vue";\nimport ExtendDialog from "./dialogs/ExtendDialog.vue";\nimport ConfirmDialog from "./dialogs/ConfirmDialog.vue";\nimport QuotationDialog from "./dialogs/QuotationDialog.vue";\nimport InvoiceDialog from "./dialogs/InvoiceDialog.vue";\nimport PaymentDialog from "./dialogs/PaymentDialog.vue";\nimport GeneralTab from "./tabs/GeneralTab.vue";'
);

// 2. Add Dialog Refs
content = content.replace(
    /const loading = ref\(false\);/,
    'const loading = ref(false);\nconst rejectDialogRef = ref<InstanceType<typeof RejectDialog> | null>(null);\nconst noteDialogRef = ref<InstanceType<typeof NoteDialog> | null>(null);\nconst extendDialogRef = ref<InstanceType<typeof ExtendDialog> | null>(null);\nconst confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);\nconst quotationDialogRef = ref<InstanceType<typeof QuotationDialog> | null>(null);\nconst invoiceDialogRef = ref<InstanceType<typeof InvoiceDialog> | null>(null);\nconst paymentDialogRef = ref<InstanceType<typeof PaymentDialog> | null>(null);\nconst repeatDialogRef = ref<InstanceType<typeof RepeatDialog> | null>(null);\nfunction openRepeatDialog() { repeatDialogRef.value?.open(); }\nconst transferDialogRef = ref<InstanceType<typeof TransferDialog> | null>(null);\nfunction openTransferDialog() { transferDialogRef.value?.open(); }'
);

function replaceExact(search, replacement) {
    const idx = content.indexOf(search);
    if (idx === -1) {
        console.error("COULD NOT FIND:", search.substring(0, 50));
        process.exit(1);
    }
    content = content.substring(0, idx) + replacement + content.substring(idx + search.length);
}

// Extract Reject
replaceExact(`const isRejectDialogOpen = ref(false);
const rejectForm = ref({
	rejectedReason: "",
});

function openRejectDoneDialog() {
	rejectForm.value = { rejectedReason: "" };
	isRejectDialogOpen.value = true;
}

function closeRejectDialog() {
	isRejectDialogOpen.value = false;
}

async function submitReject() {
	if (!rejectForm.value.rejectedReason) return;
	loading.value = true;
	try {
		const { error } = await workOrderApi.reject(woNumber, {
			rejectedReason: rejectForm.value.rejectedReason,
		});
		if (error) {
			snackbar.error(\`Failed to reject work order: \${error.error.message}\`);
		} else {
			snackbar.success(
				isPendingApproval.value
					? "Work order rejected successfully!"
					: "Work order rejected and sent back to In Progress!",
			);
			isRejectDialogOpen.value = false;
			await fetchWorkOrderDetails();
			await fetchActivityLogs();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}`, 'function openRejectDoneDialog() { rejectDialogRef.value?.open(); }');

// Extract Note
replaceExact(`const isNoteDialogOpen = ref(false);
const isEditingNote = ref(false);
const editingNoteGuid = ref("");
const noteForm = ref({
	content: "",
	viewLevel: "customer",
});

function openAddNoteDialog() {
	isEditingNote.value = false;
	editingNoteGuid.value = "";
	noteForm.value = {
		content: "",
		viewLevel: "customer",
	};
	isNoteDialogOpen.value = true;
}

function openEditNoteDialog(note: any) {
	isEditingNote.value = true;
	editingNoteGuid.value = note.guid;
	noteForm.value = {
		content: note.content || "",
		viewLevel: note.viewLevel || "customer",
	};
	isNoteDialogOpen.value = true;
}

function closeNoteDialog() {
	isNoteDialogOpen.value = false;
}

async function submitWorkNote() {
	if (!noteForm.value.content.trim()) return;
	loading.value = true;
	try {
		let res;
		if (isEditingNote.value && editingNoteGuid.value) {
			res = await workOrderApi.updateNote(editingNoteGuid.value, {
				content: noteForm.value.content,
				viewLevel: noteForm.value.viewLevel,
			});
		} else {
			res = await workOrderApi.createNote(woNumber, {
				content: noteForm.value.content,
				viewLevel: noteForm.value.viewLevel,
			});
		}

		if (res?.error) {
			snackbar.error(res.error.error?.message || "Failed to save note");
		} else {
			snackbar.success(isEditingNote.value ? "Note updated!" : "Note added!");
			isNoteDialogOpen.value = false;
			await fetchWorkOrderDetails();
			await fetchActivityLogs();
		}
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
}`, 'function openAddNoteDialog() { noteDialogRef.value?.openAdd(); }\nfunction openEditNoteDialog(note: any) { noteDialogRef.value?.openEdit(note); }');

// Repeat & Transfer
replaceExact(`const isRepeatDialogOpen = ref(false);
const isRepeating = ref(false);
const repeatForm = ref<any>({});

function openRepeatDialog() {
	repeatForm.value = {
		title: workOrder.value?.title ? \`\${workOrder.value.title} (Repeat)\` : "",
		description: workOrder.value?.description || "",
	};
	isRepeatDialogOpen.value = true;
}

async function submitRepeat() {
	isRepeating.value = true;
	try {
		const { data, error } = await workOrderApi.repeat(woNumber, repeatForm.value);
		if (error) {
			snackbar.error(error.error?.message || "Failed to repeat work order.");
			return;
		}
		snackbar.success("Work order repeated successfully!");
		isRepeatDialogOpen.value = false;
		if (data?.data?.guid) {
			router.push(\`/work-order/\${data.data.guid}\`);
		} else {
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to repeat work order");
	} finally {
		isRepeating.value = false;
	}
}`, '');

replaceExact(`const isTransferDialogOpen = ref(false);
const isTransferring = ref(false);
const transferForm = ref<any>({});

function openTransferDialog() {
	transferForm.value = {
		title: workOrder.value?.title ? \`\${workOrder.value.title} (Transfer)\` : "",
		description: workOrder.value?.description || "",
	};
	isTransferDialogOpen.value = true;
}

async function submitTransfer() {
	isTransferring.value = true;
	try {
		const { data, error } = await workOrderApi.transfer(woNumber, transferForm.value);
		if (error) {
			snackbar.error(error.error?.message || "Failed to transfer work order.");
			return;
		}
		snackbar.success("Work order transferred successfully!");
		isTransferDialogOpen.value = false;
		if (data?.data?.guid) {
			router.push(\`/work-order/\${data.data.guid}\`);
		} else {
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to transfer work order");
	} finally {
		isTransferring.value = false;
	}
}`, '');

// Extend
replaceExact(`const isExtendDialogOpen = ref(false);
const isExtending = ref(false);
const extendForm = ref<any>({
	newEstimatedEndDate: "",
	extensionReason: "",
});

function openExtendDialog() {
	extendForm.value = {
		newEstimatedEndDate: "",
		extensionReason: "",
	};
	isExtendDialogOpen.value = true;
}

async function submitExtend() {
	if (!extendForm.value.newEstimatedEndDate) return;
	isExtending.value = true;
	try {
		const { error } = await workOrderApi.extendEndDate(woNumber, extendForm.value);
		if (error) {
			snackbar.error(error.error?.message || "Failed to extend work order.");
			return;
		}
		snackbar.success("Work order extended successfully!");
		isExtendDialogOpen.value = false;
		await fetchWorkOrderDetails();
		await fetchActivityLogs();
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to extend work order");
	} finally {
		isExtending.value = false;
	}
}`, 'function openExtendDialog() { extendDialogRef.value?.open(); }');

// Confirm
replaceExact(`const isConfirmDialogOpen = ref(false);
const confirmDialog = ref({
	title: "",
	message: "",
	confirmText: "Confirm",
	variant: "primary",
	action: null as (() => void) | null,
});

function triggerConfirmation(
	title: string,
	message: string,
	action: () => void,
	variant = "primary",
	confirmText = "Confirm",
) {
	confirmDialog.value = { title, message, action, variant, confirmText };
	isConfirmDialogOpen.value = true;
}

function handleConfirmDialog() {
	if (confirmDialog.value.action) {
		confirmDialog.value.action();
	}
	isConfirmDialogOpen.value = false;
}`, 'function triggerConfirmation(config: { title: string; message: string; action: () => void; variant?: string; confirmText?: string }) {\n\tconfirmDialogRef.value?.open({ title: config.title, message: config.message, onConfirm: config.action, variant: config.variant, buttonText: config.confirmText });\n}');

// Quotation
replaceExact(`const isEditQuotationDialogOpen = ref(false);
const isSavingQuotation = ref(false);

const quotationForm = ref<any>({ reference: "", date: "", amount: 0, name: "" });
const editingQuotationGuid = ref("");

function openEditQuotation(guid: string) {
	const found = quotations.value.find((q) => q.guid === guid);
	if (!found) return;
	editingQuotationGuid.value = guid;
	quotationForm.value = {
		reference: found.reference,
		date: found.date,
		amount: found.amount,
		name: found.fileName,
	};
	isEditQuotationDialogOpen.value = true;
}

async function saveEditQuotation() {
	if (!editingQuotationGuid.value || !quotationForm.value.name.trim()) return;
	isSavingQuotation.value = true;
	try {
		const docDate = quotationForm.value.date
			? new Date(quotationForm.value.date).toISOString()
			: null;
		const { error } = await workOrderApi.updateFile(editingQuotationGuid.value, {
			fileName: quotationForm.value.name.trim(),
			docNo: quotationForm.value.reference.trim() || null,
			docAmount: quotationForm.value.amount ?? null,
			docDate,
		});
		if (error) {
			snackbar.error(\`Failed to update quotation: \${error.error?.message || "Unknown error"}\`);
		} else {
			snackbar.success("Quotation details updated successfully!");
			isEditQuotationDialogOpen.value = false;
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to update quotation");
	} finally {
		isSavingQuotation.value = false;
	}
}`, 'function openEditQuotation(guid: string) { quotationDialogRef.value?.open(guid); }');

// Invoice & Payment
replaceExact(`const isEditInvoiceDialogOpen = ref(false);
const isSavingInvoice = ref(false);
const isEditPaymentDialogOpen = ref(false);
const isSavingPayment = ref(false);

const invoiceForm = ref({ refNo: "", date: "", amount: 0, name: "" });
const paymentForm = ref({ reference: "", date: "", amount: 0, fileName: "" });
const editingInvoiceGuid = ref("");

function openEditInvoice(guid: string) {
	const found = invoices.value.find((inv) => inv.guid === guid);
	if (!found) return;
	editingInvoiceGuid.value = guid;
	invoiceForm.value = {
		refNo: found.refNo,
		date: found.date,
		amount: found.amount,
		name: found.fileName,
	};
	isEditInvoiceDialogOpen.value = true;
}

async function saveEditInvoice() {
	if (!editingInvoiceGuid.value || !invoiceForm.value.name.trim()) return;
	isSavingInvoice.value = true;
	try {
		const docDate = invoiceForm.value.date
			? new Date(invoiceForm.value.date).toISOString()
			: null;
		const { error } = await workOrderApi.updateFile(editingInvoiceGuid.value, {
			fileName: invoiceForm.value.name.trim(),
			docNo: invoiceForm.value.refNo.trim() || null,
			docAmount: invoiceForm.value.amount ?? null,
			docDate,
		});
		if (error) {
			snackbar.error(\`Failed to update invoice: \${error.error?.message || "Unknown error"}\`);
		} else {
			snackbar.success("Invoice details updated successfully!");
			isEditInvoiceDialogOpen.value = false;
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to update invoice");
	} finally {
		isSavingInvoice.value = false;
	}
}

const editingPaymentGuid = ref("");

function openEditPayment(guid: string) {
	const found = payments.value.find((payment) => payment.guid === guid);
	if (!found) return;
	editingPaymentGuid.value = guid;
	paymentForm.value = {
		reference: found.reference,
		date: found.date,
		amount: found.amount,
		fileName: found.fileName,
	};
	isEditPaymentDialogOpen.value = true;
}

async function saveEditPayment() {
	if (!editingPaymentGuid.value || !paymentForm.value.fileName.trim()) return;
	isSavingPayment.value = true;
	try {
		const docDate = paymentForm.value.date
			? new Date(paymentForm.value.date).toISOString()
			: null;
		const { error } = await workOrderApi.updateFile(editingPaymentGuid.value, {
			fileName: paymentForm.value.fileName.trim(),
			docNo: paymentForm.value.reference.trim() || null,
			docAmount: paymentForm.value.amount ?? null,
			docDate,
		});
		if (error) {
			snackbar.error(\`Failed to update payment: \${error.error?.message || "Unknown error"}\`);
		} else {
			snackbar.success("Payment details updated successfully!");
			isEditPaymentDialogOpen.value = false;
			await fetchWorkOrderFiles();
			await fetchWorkOrderDetails();
		}
	} catch (e) {
		console.error(e);
		snackbar.error("Failed to update payment");
	} finally {
		isSavingPayment.value = false;
	}
}`, 'function openEditInvoice(guid: string) { invoiceDialogRef.value?.open(guid); }\nfunction openEditPayment(guid: string) { paymentDialogRef.value?.open(guid); }');

content = content.replace(/import Textbox from "@\/components\/Textbox\.vue";\nimport DatePicker from "@\/components\/DatePicker\.vue";\n/, '');

// Fix triggerConfirmation calls across the file
content = content.replace(/triggerConfirmation\(\n\t\t\t\t\t"Closed Work Order",\n\t\t\t\t\t"Invoice and payment totals match\. Mark this work order as complete\?",\n\t\t\t\t\t/g, 'triggerConfirmation({\n\t\t\t\t\ttitle: "Closed Work Order",\n\t\t\t\t\tmessage: "Invoice and payment totals match. Mark this work order as complete?",\n\t\t\t\t\taction: ');
content = content.replace(/triggerConfirmation\(\n\t\t\t"Delete Work Order",\n\t\t\t"Are you sure you want to delete this work order\? This cannot be undone\.",\n\t\t\t/g, 'triggerConfirmation({\n\t\t\ttitle: "Delete Work Order",\n\t\t\tmessage: "Are you sure you want to delete this work order? This cannot be undone.",\n\t\t\taction: ');
content = content.replace(/triggerConfirmation\(\n\t\t\t\t"Cancel Work Order",\n\t\t\t\t"Are you sure you want to cancel this work order\? This cannot be undone\.",\n\t\t\t\t/g, 'triggerConfirmation({\n\t\t\t\ttitle: "Cancel Work Order",\n\t\t\t\tmessage: "Are you sure you want to cancel this work order? This cannot be undone.",\n\t\t\t\taction: ');
content = content.replace(/triggerConfirmation\(\n\t\t\t"Delete Note",\n\t\t\t"Are you sure you want to delete this note\?",\n\t\t\t/g, 'triggerConfirmation({\n\t\t\ttitle: "Delete Note",\n\t\t\tmessage: "Are you sure you want to delete this note?",\n\t\t\taction: ');
// Close the object literal on these specific ones
content = content.replace(/,\n\t\t\t\t\t"danger",\n\t\t\t\t\t"Mark as Closed",\n\t\t\t\t\)/g, ',\n\t\t\t\t\tvariant: "danger",\n\t\t\t\t\tconfirmText: "Mark as Closed"\n\t\t\t\t})');
content = content.replace(/,\n\t\t\t"danger",\n\t\t\t"Yes, Delete",\n\t\t\)/g, ',\n\t\t\tvariant: "danger",\n\t\t\tconfirmText: "Yes, Delete"\n\t\t})');
content = content.replace(/,\n\t\t\t\t"danger",\n\t\t\t\t"Yes, Cancel",\n\t\t\t\)/g, ',\n\t\t\t\tvariant: "danger",\n\t\t\t\tconfirmText: "Yes, Cancel"\n\t\t\t})');


// Fix HTML Method calls
content = content.replace(/openRepeatDialog/g, 'openRepeatDialog'); // Already handled
content = content.replace(/isRepeatDialogOpen = true/g, 'openRepeatDialog()');
content = content.replace(/isTransferDialogOpen = true/g, 'openTransferDialog()');

// HTML Templates Replace
content = content.replace(/<!-- Reject Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<RejectDialog ref="rejectDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Add\/Edit Note Dialog -->[\s\S]*?<\/Dialog>/, '<NoteDialog ref="noteDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Repeat Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<RepeatDialog ref="repeatDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />');
content = content.replace(/<!-- Transfer Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<TransferDialog ref="transferDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />');
content = content.replace(/<!-- Extend Work Order Dialog-->[\s\S]*?<\/Dialog>/, '<ExtendDialog ref="extendDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Reusable Confirmation Dialog -->[\s\S]*?<\/Dialog>/, '<ConfirmDialog ref="confirmDialogRef" />');
content = content.replace(/<!-- Edit Quotation Dialog -->[\s\S]*?<\/Dialog>/, '<QuotationDialog ref="quotationDialogRef" :items="quotations" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');
content = content.replace(/<!-- Edit Invoice Dialog -->[\s\S]*?<\/Dialog>/, '<InvoiceDialog ref="invoiceDialogRef" :items="invoices" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');
content = content.replace(/<!-- Edit Payment Dialog -->[\s\S]*?<\/Dialog>/, '<PaymentDialog ref="paymentDialogRef" :items="payments" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');

fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);
console.log("Extraction successful.");

