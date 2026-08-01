import fs from 'fs';
let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

// 1. HTML Replacements (100% safe)
content = content.replace(/<!-- Reject Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<RejectDialog ref="rejectDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Add\/Edit Note Dialog -->[\s\S]*?<\/Dialog>/, '<NoteDialog ref="noteDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Repeat Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<RepeatDialog ref="repeatDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />');
content = content.replace(/<!-- Transfer Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<TransferDialog ref="transferDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />');
content = content.replace(/<!-- Extend Work Order Dialog-->[\s\S]*?<\/Dialog>/, '<ExtendDialog ref="extendDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Reusable Confirmation Dialog -->[\s\S]*?<\/Dialog>/, '<ConfirmDialog ref="confirmDialogRef" />');
content = content.replace(/<!-- Edit Quotation Dialog -->[\s\S]*?<\/Dialog>/, '<QuotationDialog ref="quotationDialogRef" :items="quotations" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');
content = content.replace(/<!-- Edit Invoice Dialog -->[\s\S]*?<\/Dialog>/, '<InvoiceDialog ref="invoiceDialogRef" :items="invoices" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');
content = content.replace(/<!-- Edit Payment Dialog -->[\s\S]*?<\/Dialog>/, '<PaymentDialog ref="paymentDialogRef" :items="payments" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');

// 2. Add Imports and Refs
content = content.replace(
    /import GeneralTab from "\.\/tabs\/GeneralTab\.vue";/,
    'import RejectDialog from "./dialogs/RejectDialog.vue";\nimport NoteDialog from "./dialogs/NoteDialog.vue";\nimport RepeatDialog from "./dialogs/RepeatDialog.vue";\nimport TransferDialog from "./dialogs/TransferDialog.vue";\nimport ExtendDialog from "./dialogs/ExtendDialog.vue";\nimport ConfirmDialog from "./dialogs/ConfirmDialog.vue";\nimport QuotationDialog from "./dialogs/QuotationDialog.vue";\nimport InvoiceDialog from "./dialogs/InvoiceDialog.vue";\nimport PaymentDialog from "./dialogs/PaymentDialog.vue";\nimport GeneralTab from "./tabs/GeneralTab.vue";'
);

content = content.replace(
    /const loading = ref\(false\);/,
    'const loading = ref(false);\nconst rejectDialogRef = ref<InstanceType<typeof RejectDialog> | null>(null);\nconst noteDialogRef = ref<InstanceType<typeof NoteDialog> | null>(null);\nconst repeatDialogRef = ref<InstanceType<typeof RepeatDialog> | null>(null);\nconst transferDialogRef = ref<InstanceType<typeof TransferDialog> | null>(null);\nconst extendDialogRef = ref<InstanceType<typeof ExtendDialog> | null>(null);\nconst confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);\nconst quotationDialogRef = ref<InstanceType<typeof QuotationDialog> | null>(null);\nconst invoiceDialogRef = ref<InstanceType<typeof InvoiceDialog> | null>(null);\nconst paymentDialogRef = ref<InstanceType<typeof PaymentDialog> | null>(null);'
);

fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);
console.log("HTML replaced.");
