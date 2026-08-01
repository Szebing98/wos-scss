import fs from 'fs';
let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

function replaceExact(target, replacement) {
    const idx = content.indexOf(target);
    if (idx === -1) {
        console.error("COULD NOT FIND:", target.substring(0, 50));
        process.exit(1);
    }
    content = content.substring(0, idx) + replacement + content.substring(idx + target.length);
}

// 1. Imports
const mappings = [
    { from: /@\/utils\/avatar/g, to: '@/utils/User/avatar' },
    { from: /@\/utils\/user-display/g, to: '@/utils/User/user-display' },
    { from: /@\/utils\/role/g, to: '@/utils/Settings/role' },
    { from: /@\/utils\/permission-label/g, to: '@/utils/Settings/permission-label' },
    { from: /@\/utils\/work-order/g, to: '@/utils/WorkOrder/work-order' }
];
for (const map of mappings) {
    content = content.replace(map.from, map.to);
}

replaceExact(
    'import GeneralTab from "./tabs/GeneralTab.vue";',
    'import RejectDialog from "./dialogs/RejectDialog.vue";\nimport NoteDialog from "./dialogs/NoteDialog.vue";\nimport RepeatDialog from "./dialogs/RepeatDialog.vue";\nimport TransferDialog from "./dialogs/TransferDialog.vue";\nimport ExtendDialog from "./dialogs/ExtendDialog.vue";\nimport ConfirmDialog from "./dialogs/ConfirmDialog.vue";\nimport QuotationDialog from "./dialogs/QuotationDialog.vue";\nimport InvoiceDialog from "./dialogs/InvoiceDialog.vue";\nimport PaymentDialog from "./dialogs/PaymentDialog.vue";\nimport GeneralTab from "./tabs/GeneralTab.vue";'
);

replaceExact(
    'const loading = ref(false);',
    'const loading = ref(false);\nconst rejectDialogRef = ref<InstanceType<typeof RejectDialog> | null>(null);\nconst noteDialogRef = ref<InstanceType<typeof NoteDialog> | null>(null);\nconst repeatDialogRef = ref<InstanceType<typeof RepeatDialog> | null>(null);\nconst transferDialogRef = ref<InstanceType<typeof TransferDialog> | null>(null);\nconst extendDialogRef = ref<InstanceType<typeof ExtendDialog> | null>(null);\nconst confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);\nconst quotationDialogRef = ref<InstanceType<typeof QuotationDialog> | null>(null);\nconst invoiceDialogRef = ref<InstanceType<typeof InvoiceDialog> | null>(null);\nconst paymentDialogRef = ref<InstanceType<typeof PaymentDialog> | null>(null);'
);

// We will NOT comment out any variables! We will simply redirect the open triggers to our dialog refs!
content = content.replace(
    /function openRejectDoneDialog\(\) \{[\s\S]*?\n\}/,
    '// @ts-ignore\nfunction openRejectDoneDialog() { rejectDialogRef.value?.open(); }'
);

content = content.replace(
    /function openAddNoteDialog\(\) \{[\s\S]*?\n\}/,
    '// @ts-ignore\nfunction openAddNoteDialog() { noteDialogRef.value?.openAdd(); }'
);

content = content.replace(
    /function openEditNoteDialog\(note: any\) \{[\s\S]*?\n\}/,
    '// @ts-ignore\nfunction openEditNoteDialog(note: any) { noteDialogRef.value?.openEdit(note); }'
);

content = content.replace(
    /function openExtendDialog\(\) \{[\s\S]*?\n\}/,
    '// @ts-ignore\nfunction openExtendDialog() { extendDialogRef.value?.open(); }'
);

content = content.replace(
    /function triggerConfirmation\([\s\S]*?\} \{[\s\S]*?\n\}/,
    '// @ts-ignore\nfunction triggerConfirmation(config: { title: string; message: string; action: () => void; variant?: string; buttonText?: string; confirmText?: string; }) {\n\tconfirmDialogRef.value?.open({ title: config.title, message: config.message, onConfirm: config.action, variant: config.variant, buttonText: config.confirmText || config.buttonText });\n}'
);

content = content.replace(
    /function openEditQuotation\(guid: string\) \{[\s\S]*?\n\}/,
    '// @ts-ignore\nfunction openEditQuotation(guid: string) { quotationDialogRef.value?.open(guid); }'
);

content = content.replace(
    /function openEditInvoice\(guid: string\) \{[\s\S]*?\n\}/,
    '// @ts-ignore\nfunction openEditInvoice(guid: string) { invoiceDialogRef.value?.open(guid); }'
);

content = content.replace(
    /function openEditPayment\(guid: string\) \{[\s\S]*?\n\}/,
    '// @ts-ignore\nfunction openEditPayment(guid: string) { paymentDialogRef.value?.open(guid); }'
);

// HTML Templates Replacements (100% safe regex because they are at the end)
content = content.replace(/<!-- Reject Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<RejectDialog ref="rejectDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Add\/Edit Note Dialog -->[\s\S]*?<\/Dialog>/, '<NoteDialog ref="noteDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Repeat Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<RepeatDialog ref="repeatDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />');
content = content.replace(/<!-- Transfer Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<TransferDialog ref="transferDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />');
content = content.replace(/<!-- Extend Work Order Dialog-->[\s\S]*?<\/Dialog>/, '<ExtendDialog ref="extendDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Reusable Confirmation Dialog -->[\s\S]*?<\/Dialog>/, '<ConfirmDialog ref="confirmDialogRef" />');
content = content.replace(/<!-- Edit Quotation Dialog -->[\s\S]*?<\/Dialog>/, '<QuotationDialog ref="quotationDialogRef" :items="quotations" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');
content = content.replace(/<!-- Edit Invoice Dialog -->[\s\S]*?<\/Dialog>/, '<InvoiceDialog ref="invoiceDialogRef" :items="invoices" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');
content = content.replace(/<!-- Edit Payment Dialog -->[\s\S]*?<\/Dialog>/, '<PaymentDialog ref="paymentDialogRef" :items="payments" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');

// HTML handler adjustments
content = content.replace(/isRepeatDialogOpen = true/g, 'repeatDialogRef?.open()');
content = content.replace(/isTransferDialogOpen = true/g, 'transferDialogRef?.open()');

// Fix triggerConfirmation calls with positional args to object format
content = content.replace(/triggerConfirmation\(\n\t\t\t\t\t"Closed Work Order",\n\t\t\t\t\t"Invoice and payment totals match\. Mark this work order as complete\?",\n\t\t\t\t\t/g, 'triggerConfirmation({\n\t\t\t\t\ttitle: "Closed Work Order",\n\t\t\t\t\tmessage: "Invoice and payment totals match. Mark this work order as complete?",\n\t\t\t\t\taction: ');
content = content.replace(/triggerConfirmation\(\n\t\t\t"Delete Work Order",\n\t\t\t"Are you sure you want to delete this work order\? This cannot be undone\.",\n\t\t\t/g, 'triggerConfirmation({\n\t\t\ttitle: "Delete Work Order",\n\t\t\tmessage: "Are you sure you want to delete this work order? This cannot be undone.",\n\t\t\taction: ');
content = content.replace(/triggerConfirmation\(\n\t\t\t\t"Cancel Work Order",\n\t\t\t\t"Are you sure you want to cancel this work order\? This cannot be undone\.",\n\t\t\t\t/g, 'triggerConfirmation({\n\t\t\t\ttitle: "Cancel Work Order",\n\t\t\t\tmessage: "Are you sure you want to cancel this work order? This cannot be undone.",\n\t\t\t\taction: ');
content = content.replace(/triggerConfirmation\(\n\t\t\t"Delete Note",\n\t\t\t"Are you sure you want to delete this note\?",\n\t\t\t/g, 'triggerConfirmation({\n\t\t\ttitle: "Delete Note",\n\t\t\tmessage: "Are you sure you want to delete this note?",\n\t\t\taction: ');
content = content.replace(/,\n\t\t\t\t\t"danger",\n\t\t\t\t\t"Mark as Closed",\n\t\t\t\t\)/g, ',\n\t\t\t\t\tvariant: "danger",\n\t\t\t\t\tconfirmText: "Mark as Closed"\n\t\t\t\t})');
content = content.replace(/,\n\t\t\t"danger",\n\t\t\t"Yes, Delete",\n\t\t\)/g, ',\n\t\t\tvariant: "danger",\n\t\t\tconfirmText: "Yes, Delete"\n\t\t})');
content = content.replace(/,\n\t\t\t\t"danger",\n\t\t\t\t"Yes, Cancel",\n\t\t\t\)/g, ',\n\t\t\t\tvariant: "danger",\n\t\t\t\tconfirmText: "Yes, Cancel"\n\t\t\t})');

fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);
console.log("Surgical extraction complete.");
