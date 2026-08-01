import fs from 'fs';
let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

// Replace Method calls in HTML safely (only the ones that trigger dialogs)
content = content.replace(/isRejectDialogOpen = true/g, 'rejectDialogRef?.open()');
content = content.replace(/openAddNoteDialog\(\)/g, 'noteDialogRef?.openAdd()');
content = content.replace(/openEditNoteDialog\(/g, 'noteDialogRef?.openEdit(');
content = content.replace(/isRepeatDialogOpen = true/g, 'repeatDialogRef?.open()');
content = content.replace(/isTransferDialogOpen = true/g, 'transferDialogRef?.open()');
content = content.replace(/openExtendDialog\(\)/g, 'extendDialogRef?.open()');
content = content.replace(/openEditQuotation\(/g, 'quotationDialogRef?.open(');
content = content.replace(/openEditInvoice\(/g, 'invoiceDialogRef?.open(');
content = content.replace(/openEditPayment\(/g, 'paymentDialogRef?.open(');
// Note: handleConfirmDialog is replaced inside triggerConfirmation.
content = content.replace(/triggerConfirmation\(\n\t\t\t\t\t"Closed Work Order",\n\t\t\t\t\t"Invoice and payment totals match\. Mark this work order as complete\?",\n\t\t\t\t\t/g, 'triggerConfirmation({\n\t\t\t\t\ttitle: "Closed Work Order",\n\t\t\t\t\tmessage: "Invoice and payment totals match. Mark this work order as complete?",\n\t\t\t\t\taction: ');
content = content.replace(/triggerConfirmation\(\n\t\t\t"Delete Work Order",\n\t\t\t"Are you sure you want to delete this work order\? This cannot be undone\.",\n\t\t\t/g, 'triggerConfirmation({\n\t\t\ttitle: "Delete Work Order",\n\t\t\tmessage: "Are you sure you want to delete this work order? This cannot be undone.",\n\t\t\taction: ');
content = content.replace(/triggerConfirmation\(\n\t\t\t\t"Cancel Work Order",\n\t\t\t\t"Are you sure you want to cancel this work order\? This cannot be undone\.",\n\t\t\t\t/g, 'triggerConfirmation({\n\t\t\t\ttitle: "Cancel Work Order",\n\t\t\t\tmessage: "Are you sure you want to cancel this work order? This cannot be undone.",\n\t\t\t\taction: ');
content = content.replace(/triggerConfirmation\(\n\t\t\t"Delete Note",\n\t\t\t"Are you sure you want to delete this note\?",\n\t\t\t/g, 'triggerConfirmation({\n\t\t\ttitle: "Delete Note",\n\t\t\tmessage: "Are you sure you want to delete this note?",\n\t\t\taction: ');
content = content.replace(/,\n\t\t\t\t\t"danger",\n\t\t\t\t\t"Mark as Closed",\n\t\t\t\t\)/g, ',\n\t\t\t\t\tvariant: "danger",\n\t\t\t\t\tbuttonText: "Mark as Closed"\n\t\t\t\t})');
content = content.replace(/,\n\t\t\t"danger",\n\t\t\t"Yes, Delete",\n\t\t\)/g, ',\n\t\t\tvariant: "danger",\n\t\t\tbuttonText: "Yes, Delete"\n\t\t})');
content = content.replace(/,\n\t\t\t\t"danger",\n\t\t\t\t"Yes, Cancel",\n\t\t\t\)/g, ',\n\t\t\t\tvariant: "danger",\n\t\t\t\tbuttonText: "Yes, Cancel"\n\t\t\t})');

// We leave ALL the old unused variables in the script. `vue-tsc` might complain about unused variables like `isEditPaymentDialogOpen`, but since I haven't deleted `totalInvoiceIssued`, the logic works!
// To fix the unused variable error, I will just suppress it or comment them safely. Let's just comment the unused ones with specific strings.
const toComment = [
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

for (const line of toComment) {
    if (content.indexOf(line) !== -1) {
        content = content.replace(line, `// ${line}`);
    }
}

// Comment out the function implementations of the unused dialog functions
const funcsToComment = [
    /function openRejectDoneDialog\(\) \{[\s\S]*?\n\}/,
    /function closeRejectDialog\(\) \{[\s\S]*?\n\}/,
    /async function submitReject\(\) \{[\s\S]*?finally \{\n\t\tloading\.value = false;\n\t\}\n\}/,
    /function openAddNoteDialog\(\) \{[\s\S]*?\n\}/,
    /function openEditNoteDialog\(note: any\) \{[\s\S]*?\n\}/,
    /function closeNoteDialog\(\) \{[\s\S]*?\n\}/,
    /async function submitWorkNote\(\) \{[\s\S]*?finally \{\n\t\tloading\.value = false;\n\t\}\n\}/,
    /function openRepeatDialog\(\) \{[\s\S]*?\n\}/,
    /async function submitRepeat\(\) \{[\s\S]*?finally \{\n\t\tisRepeating\.value = false;\n\t\}\n\}/,
    /function openTransferDialog\(\) \{[\s\S]*?\n\}/,
    /async function submitTransfer\(\) \{[\s\S]*?finally \{\n\t\tisTransferring\.value = false;\n\t\}\n\}/,
    /function openExtendDialog\(\) \{[\s\S]*?\n\}/,
    /async function submitExtend\(\) \{[\s\S]*?finally \{\n\t\tisExtending\.value = false;\n\t\}\n\}/,
    /function triggerConfirmation\(\n\ttitle: string,\n\tmessage: string,\n\taction: \(\) => void,\n\tvariant = "primary",\n\tconfirmText = "Confirm",\n\) \{[\s\S]*?\n\}/,
    /function handleConfirmDialog\(\) \{[\s\S]*?\n\}/,
    /function openEditQuotation\(guid: string\) \{[\s\S]*?\n\}/,
    /async function saveEditQuotation\(\) \{[\s\S]*?finally \{\n\t\tisSavingQuotation\.value = false;\n\t\}\n\}/,
    /function openEditInvoice\(guid: string\) \{[\s\S]*?\n\}/,
    /async function saveEditInvoice\(\) \{[\s\S]*?finally \{\n\t\tisSavingInvoice\.value = false;\n\t\}\n\}/,
    /function openEditPayment\(guid: string\) \{[\s\S]*?\n\}/,
    /async function saveEditPayment\(\) \{[\s\S]*?finally \{\n\t\tisSavingPayment\.value = false;\n\t\}\n\}/
];

for (const f of funcsToComment) {
    const match = content.match(f);
    if (match) {
        content = content.replace(f, `/*\n${match[0]}\n*/`);
    }
}

// Add our triggerConfirmation replacement back since we commented it out
content = content.replace(/const confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> \| null>\(null\);/, 'const confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);\nfunction triggerConfirmation(config: { title: string; message: string; action: () => void; variant?: string; buttonText?: string }) {\n\tconfirmDialogRef.value?.open({ title: config.title, message: config.message, onConfirm: config.action, variant: config.variant, buttonText: config.buttonText });\n}');

fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);
console.log("Safe HTML method replacements complete.");
