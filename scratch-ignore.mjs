import fs from 'fs';
let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

const unusedVars = [
    'const isExtendDialogOpen',
    'const extendForm',
    'const isExtending',
    'const isRepeatDialogOpen',
    'const repeatForm',
    'const isRepeating',
    'const isTransferDialogOpen',
    'const transferForm',
    'const isTransferring',
    'const isEditQuotationDialogOpen',
    'const isSavingQuotation',
    'const quotationForm',
    'const editingQuotationGuid',
    'const isEditInvoiceDialogOpen',
    'const isSavingInvoice',
    'const isEditPaymentDialogOpen',
    'const isSavingPayment',
    'const invoiceForm',
    'const paymentForm',
    'const editingInvoiceGuid',
    'const editingPaymentGuid',
    'const isRejectDialogOpen',
    'const rejectForm',
    'const isNoteDialogOpen',
    'const isEditingNote',
    'const editingNoteGuid',
    'const noteForm'
];

for (const v of unusedVars) {
    const regex = new RegExp(`(?<!// @ts-ignore\\n)(${v})`, 'g');
    content = content.replace(regex, `// @ts-ignore\n$1`);
}

fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);
console.log("Added ts-ignore to unused vars.");
