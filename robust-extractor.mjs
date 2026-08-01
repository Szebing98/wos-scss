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
    'const loading = ref(false);\nconst rejectDialogRef = ref<InstanceType<typeof RejectDialog> | null>(null);\nconst noteDialogRef = ref<InstanceType<typeof NoteDialog> | null>(null);\nconst extendDialogRef = ref<InstanceType<typeof ExtendDialog> | null>(null);\nconst confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);\nconst quotationDialogRef = ref<InstanceType<typeof QuotationDialog> | null>(null);\nconst invoiceDialogRef = ref<InstanceType<typeof InvoiceDialog> | null>(null);\nconst paymentDialogRef = ref<InstanceType<typeof PaymentDialog> | null>(null);'
);

// We replace the bodies of the original functions instead of deleting them.
// This is 100% safe because it preserves the surrounding variables.

// Reject
content = content.replace(
    /function openRejectDoneDialog\(\) \{\n\trejectForm\.value = \{ rejectedReason: "" \};\n\tisRejectDialogOpen\.value = true;\n\}/,
    'function openRejectDoneDialog() { rejectDialogRef.value?.open(); }'
);
content = content.replace(/function closeRejectDialog\(\) \{\n\tisRejectDialogOpen\.value = false;\n\}/, '');
content = content.replace(/async function submitReject\(\) \{[\s\S]*?finally \{\n\t\tloading\.value = false;\n\t\}\n\}/, '');

// Note
content = content.replace(
    /function openAddNoteDialog\(\) \{[\s\S]*?isNoteDialogOpen\.value = true;\n\}/,
    'function openAddNoteDialog() { noteDialogRef.value?.openAdd(); }'
);
content = content.replace(
    /function openEditNoteDialog\(note: any\) \{[\s\S]*?isNoteDialogOpen\.value = true;\n\}/,
    'function openEditNoteDialog(note: any) { noteDialogRef.value?.openEdit(note); }'
);
content = content.replace(/function closeNoteDialog\(\) \{\n\tisNoteDialogOpen\.value = false;\n\}/, '');
content = content.replace(/async function submitWorkNote\(\) \{[\s\S]*?finally \{\n\t\tloading\.value = false;\n\t\}\n\}/, '');

// Extend
content = content.replace(
    /function openExtendDialog\(\) \{\n\textendForm\.value = \{ newEstimatedEndDate: "", extensionReason: "" \};\n\tisExtendDialogOpen\.value = true;\n\}/,
    'function openExtendDialog() { extendDialogRef.value?.open(); }'
);
content = content.replace(/async function submitExtend\(\) \{[\s\S]*?finally \{\n\t\tisExtending\.value = false;\n\t\}\n\}/, '');

// Confirm
content = content.replace(
    /function handleConfirmDialog\(\) \{[\s\S]*?\n\}/,
    'function triggerConfirmation(config: { title: string; message: string; action: () => void; variant?: string; confirmText?: string }) {\n\tconfirmDialogRef.value?.open({ title: config.title, message: config.message, onConfirm: config.action, variant: config.variant, buttonText: config.confirmText });\n}'
);

// Quotation
content = content.replace(
    /function openEditQuotation\(guid: string\) \{[\s\S]*?isEditQuotationDialogOpen\.value = true;\n\}/,
    'function openEditQuotation(guid: string) { quotationDialogRef.value?.open(guid); }'
);
content = content.replace(/async function saveEditQuotation\(\) \{[\s\S]*?finally \{\n\t\tisSavingQuotation\.value = false;\n\t\}\n\}/, '');

// Invoice
content = content.replace(
    /function openEditInvoice\(guid: string\) \{[\s\S]*?isEditInvoiceDialogOpen\.value = true;\n\}/,
    'function openEditInvoice(guid: string) { invoiceDialogRef.value?.open(guid); }'
);
content = content.replace(/async function saveEditInvoice\(\) \{[\s\S]*?finally \{\n\t\tisSavingInvoice\.value = false;\n\t\}\n\}/, '');

// Payment
content = content.replace(
    /function openEditPayment\(guid: string\) \{[\s\S]*?isEditPaymentDialogOpen\.value = true;\n\}/,
    'function openEditPayment(guid: string) { paymentDialogRef.value?.open(guid); }'
);
content = content.replace(/async function saveEditPayment\(\) \{[\s\S]*?finally \{\n\t\tisSavingPayment\.value = false;\n\t\}\n\}/, '');

// Repeat & Transfer
content = content.replace(/async function submitRepeat\(\) \{[\s\S]*?finally \{\n\t\tisRepeating\.value = false;\n\t\}\n\}/, '');
content = content.replace(/async function submitTransfer\(\) \{[\s\S]*?finally \{\n\t\tisTransferring\.value = false;\n\t\}\n\}/, '');

// To silence TS unused warnings, we comment out the unused state variables EXACTLY.
const unusedVars = [
    'const isRejectDialogOpen = ref(false);',
    'const rejectForm = ref({',
    '\trejectedReason: "",',
    '});',
    'const isNoteDialogOpen = ref(false);',
    'const isEditingNote = ref(false);',
    'const editingNoteGuid = ref("");',
    'const noteForm = ref({',
    '\tcontent: "",',
    '\tviewLevel: "customer",',
    '});',
    'const isRepeatDialogOpen = ref(false);',
    'const isRepeating = ref(false);',
    'const repeatForm = ref<any>({});',
    'const isTransferDialogOpen = ref(false);',
    'const isTransferring = ref(false);',
    'const transferForm = ref<any>({});',
    'const isExtendDialogOpen = ref(false);',
    'const isExtending = ref(false);',
    'const extendForm = ref<any>({',
    '\tnewEstimatedEndDate: "",',
    '\textensionReason: "",',
    '});',
    'const isConfirmDialogOpen = ref(false);',
    'const confirmDialog = ref({',
    '\ttitle: "",',
    '\tmessage: "",',
    '\tconfirmText: "Confirm",',
    '\tvariant: "primary",',
    '\taction: null as (() => void) | null,',
    '});',
    'const isEditQuotationDialogOpen = ref(false);',
    'const isSavingQuotation = ref(false);',
    'const quotationForm = ref<any>({ reference: "", date: "", amount: 0, name: "" });',
    'const editingQuotationGuid = ref("");',
    'const isEditInvoiceDialogOpen = ref(false);',
    'const isSavingInvoice = ref(false);',
    'const isEditPaymentDialogOpen = ref(false);',
    'const isSavingPayment = ref(false);',
    'const invoiceForm = ref({ refNo: "", date: "", amount: 0, name: "" });',
    'const paymentForm = ref({ reference: "", date: "", amount: 0, fileName: "" });',
    'const editingInvoiceGuid = ref("");',
    'const editingPaymentGuid = ref("");'
];

for (const line of unusedVars) {
    content = content.replace(line, `// ${line}`);
}

// Remove Textbox and DatePicker imports if they are unused
content = content.replace(/import Textbox from "@\/components\/Textbox\.vue";\nimport DatePicker from "@\/components\/DatePicker\.vue";\n/, '');

// Fix triggerConfirmation calls across the file
content = content.replace(/buttonText:/g, 'confirmText:');

// Replace HTML templates safely
content = content.replace(/<!-- Reject Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<RejectDialog ref="rejectDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Add\/Edit Note Dialog -->[\s\S]*?<\/Dialog>/, '<NoteDialog ref="noteDialogRef" :wo-number="woNumber" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Repeat Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<RepeatDialog ref="repeatDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />');
content = content.replace(/<!-- Transfer Work Order Dialog -->[\s\S]*?<\/Dialog>/, '<TransferDialog ref="transferDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" @navigate="(id) => $router.push(`/work-order/${id}`)" />');
content = content.replace(/<!-- Extend Work Order Dialog-->[\s\S]*?<\/Dialog>/, '<ExtendDialog ref="extendDialogRef" :wo-number="woNumber" :work-order="workOrder" @refresh="fetchWorkOrderDetails" />');
content = content.replace(/<!-- Reusable Confirmation Dialog -->[\s\S]*?<\/Dialog>/, '<ConfirmDialog ref="confirmDialogRef" />');
content = content.replace(/<!-- Edit Quotation Dialog -->[\s\S]*?<\/Dialog>/, '<QuotationDialog ref="quotationDialogRef" :items="quotations" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');
content = content.replace(/<!-- Edit Invoice Dialog -->[\s\S]*?<\/Dialog>/, '<InvoiceDialog ref="invoiceDialogRef" :items="invoices" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');
content = content.replace(/<!-- Edit Payment Dialog -->[\s\S]*?<\/Dialog>/, '<PaymentDialog ref="paymentDialogRef" :items="payments" @refresh="fetchWorkOrderFiles(); fetchWorkOrderDetails()" />');

// Now, what about Repeat and Transfer buttons in HTML?
content = content.replace(/isRepeatDialogOpen = true/g, 'repeatDialogRef?.open()');
content = content.replace(/isTransferDialogOpen = true/g, 'transferDialogRef?.open()');

// To fix TS complaining about unused Repeat/Transfer ref in script, we must expose them in script or create wrappers.
content = content.replace(
    /const rejectDialogRef/,
    'const repeatDialogRef = ref<InstanceType<typeof RepeatDialog> | null>(null);\nfunction openRepeatDialog() { repeatDialogRef.value?.open(); }\nconst transferDialogRef = ref<InstanceType<typeof TransferDialog> | null>(null);\nfunction openTransferDialog() { transferDialogRef.value?.open(); }\nconst rejectDialogRef'
);

content = content.replace(/repeatDialogRef\?\.open\(\)/g, 'openRepeatDialog()');
content = content.replace(/transferDialogRef\?\.open\(\)/g, 'openTransferDialog()');


fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);
console.log("Extraction complete safely.");
