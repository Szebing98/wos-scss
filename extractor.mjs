import fs from 'fs';

let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

// 0. Update imports (from Utils Restructuring Phase)
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

// 1. Add Dialog Imports
content = content.replace(
    /import GeneralTab from "\.\/tabs\/GeneralTab\.vue";/,
    'import RejectDialog from "./dialogs/RejectDialog.vue";\nimport NoteDialog from "./dialogs/NoteDialog.vue";\nimport RepeatDialog from "./dialogs/RepeatDialog.vue";\nimport TransferDialog from "./dialogs/TransferDialog.vue";\nimport ExtendDialog from "./dialogs/ExtendDialog.vue";\nimport ConfirmDialog from "./dialogs/ConfirmDialog.vue";\nimport QuotationDialog from "./dialogs/QuotationDialog.vue";\nimport InvoiceDialog from "./dialogs/InvoiceDialog.vue";\nimport PaymentDialog from "./dialogs/PaymentDialog.vue";\nimport GeneralTab from "./tabs/GeneralTab.vue";'
);

// 2. Add Dialog Refs
content = content.replace(
    /const loading = ref\(false\);/,
    'const loading = ref(false);\nconst rejectDialogRef = ref<InstanceType<typeof RejectDialog> | null>(null);\nconst noteDialogRef = ref<InstanceType<typeof NoteDialog> | null>(null);\n// const repeatDialogRef = ref<InstanceType<typeof RepeatDialog> | null>(null);\n// function openRepeatDialog() { repeatDialogRef.value?.open(); }\n// const transferDialogRef = ref<InstanceType<typeof TransferDialog> | null>(null);\n// function openTransferDialog() { transferDialogRef.value?.open(); }\nconst extendDialogRef = ref<InstanceType<typeof ExtendDialog> | null>(null);\nconst confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);\nconst quotationDialogRef = ref<InstanceType<typeof QuotationDialog> | null>(null);\nconst invoiceDialogRef = ref<InstanceType<typeof InvoiceDialog> | null>(null);\nconst paymentDialogRef = ref<InstanceType<typeof PaymentDialog> | null>(null);'
);

// 3. Remove/Replace Script Logic
// Reject
content = content.replace(/const isRejectDialogOpen = ref\(false\);\nconst rejectForm = ref\(\{[\s\S]*?finally \{\n\t\tloading\.value = false;\n\t\}\n\}/, 'function openRejectDoneDialog() { rejectDialogRef.value?.open(); }');
// Note
content = content.replace(/const isNoteDialogOpen = ref\(false\);[\s\S]*?async function submitWorkNote\(\) \{[\s\S]*?finally \{\n\t\tloading\.value = false;\n\t\}\n\}/, 'function openAddNoteDialog() { noteDialogRef.value?.openAdd(); }\nfunction openEditNoteDialog(note: any) { noteDialogRef.value?.openEdit(note); }');
// Extend
content = content.replace(/const isExtendDialogOpen = ref\(false\);[\s\S]*?async function submitExtend\(\) \{[\s\S]*?finally \{\n\t\tisExtending\.value = false;\n\t\}\n\}/, 'function openExtendDialog() { extendDialogRef.value?.open(); }');
// Confirm
content = content.replace(/const isConfirmDialogOpen = ref\(false\);[\s\S]*?function handleConfirmDialog\(\) \{[\s\S]*?\n\}/, 'function triggerConfirmation(config: { title: string; message: string; action: () => void; variant?: string; confirmText?: string }) {\n\tconfirmDialogRef.value?.open({ title: config.title, message: config.message, onConfirm: config.action, variant: config.variant, buttonText: config.confirmText });\n}');
// Repeat & Transfer
content = content.replace(/const isRepeatDialogOpen = ref\(false\);[\s\S]*?async function submitRepeat\(\) \{[\s\S]*?finally \{\n\t\tisRepeating\.value = false;\n\t\}\n\}/, '');
content = content.replace(/const isTransferDialogOpen = ref\(false\);[\s\S]*?async function submitTransfer\(\) \{[\s\S]*?finally \{\n\t\tisTransferring\.value = false;\n\t\}\n\}/, '');
// Quotation
content = content.replace(/const isEditQuotationDialogOpen = ref\(false\);[\s\S]*?async function saveEditQuotation\(\) \{[\s\S]*?finally \{\n\t\tisSavingQuotation\.value = false;\n\t\}\n\}/, 'function openEditQuotation(guid: string) { quotationDialogRef.value?.open(guid); }');
// Invoice
content = content.replace(/const isEditInvoiceDialogOpen = ref\(false\);[\s\S]*?async function saveEditInvoice\(\) \{[\s\S]*?finally \{\n\t\tisSavingInvoice\.value = false;\n\t\}\n\}/, 'function openEditInvoice(guid: string) { invoiceDialogRef.value?.open(guid); }');
// Payment
content = content.replace(/const isEditPaymentDialogOpen = ref\(false\);[\s\S]*?async function saveEditPayment\(\) \{[\s\S]*?finally \{\n\t\tisSavingPayment\.value = false;\n\t\}\n\}/, 'function openEditPayment(guid: string) { paymentDialogRef.value?.open(guid); }');

// Remove Textbox and DatePicker imports if they are unused, but let's just let the build error guide us if we missed something. Actually it's easier to just replace them.
content = content.replace(/import Textbox from "@\/components\/Textbox\.vue";\nimport DatePicker from "@\/components\/DatePicker\.vue";\n/, '');

// Fix triggerConfirmation calls across the file
content = content.replace(/buttonText:/g, 'confirmText:');

// Replace Method calls in HTML
content = content.replace(/isRepeatDialogOpen = true/g, 'openRepeatDialog');
content = content.replace(/isTransferDialogOpen = true/g, 'openTransferDialog');

// Replace HTML templates
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
console.log("Extraction complete.");
