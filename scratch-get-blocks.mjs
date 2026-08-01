import fs from 'fs';
let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

// Function to find exact blocks
function extractBlock(startMarker, endMarker) {
    let startIdx = content.indexOf(startMarker);
    if (startIdx === -1) return null;
    let endIdx = content.indexOf(endMarker, startIdx);
    if (endIdx === -1) return null;
    endIdx += endMarker.length;
    return content.substring(startIdx, endIdx);
}

const rejectBlock = extractBlock('const isRejectDialogOpen = ref(false);', 'loading.value = false;\n\t}\n}');
const noteBlock = extractBlock('const isNoteDialogOpen = ref(false);', 'loading.value = false;\n\t}\n}');
const repeatBlock = extractBlock('const isRepeatDialogOpen = ref(false);', 'isRepeating.value = false;\n\t}\n}');
const transferBlock = extractBlock('const isTransferDialogOpen = ref(false);', 'isTransferring.value = false;\n\t}\n}');
const extendBlock = extractBlock('const isExtendDialogOpen = ref(false);', 'isExtending.value = false;\n\t}\n}');
const confirmBlock = extractBlock('const isConfirmDialogOpen = ref(false);', 'isConfirmDialogOpen.value = false;\n}');

// FOR QUOTATION, INVOICE, PAYMENT: I must be very careful where the block ends.
// Let's dump the raw script section to a file so I can inspect it safely.
fs.writeFileSync('scratch-script-setup.txt', content.substring(0, content.indexOf('</script>')));
console.log("Dumped script to scratch-script-setup.txt");
