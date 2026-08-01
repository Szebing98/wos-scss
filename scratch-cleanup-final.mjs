import fs from 'fs';
let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

// Unused imports from WorkOrderDetail
content = content.replace(/import Dialog from "@\/components\/Dialog\.vue";\n/, '');
content = content.replace(/import GoogleMapPicker from "@\/components\/GoogleMapPicker\.vue";\n/, '');

const unusedFuncs = [
    /function isPdfFile\(filename: string\) \{[\s\S]*?\n\}/,
    /function cancelFileUpload\(\) \{[\s\S]*?\n\}/,
    /async function confirmFileUpload\(\) \{[\s\S]*?finally \{\n\t\tisUploading\.value = false;\n\t\}\n\}/,
    /async function savePreviewFileRename\(\) \{[\s\S]*?finally \{\n\t\tisPreviewLoading\.value = false;\n\t\}\n\}/
];

for (const f of unusedFuncs) {
    const match = content.match(f);
    if (match) {
        content = content.replace(f, `/*\n${match[0]}\n*/`);
    }
}

const refsToIgnore = [
    'const locationMapDialogRef',
    'const uploadConfirmDialogRef',
    'const filePreviewDialogRef'
];
for (const r of refsToIgnore) {
    content = content.replace(new RegExp(`(?<!// @ts-ignore\\n)(const ${r.substring(6)})`, 'g'), `// @ts-ignore\n$1`);
}

fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);

let uploadDialog = fs.readFileSync('src/views/WorkOrder/dialogs/UploadConfirmDialog.vue', 'utf-8');
uploadDialog = uploadDialog.replace(/import Textbox from "@\/components\/Textbox\.vue";\n/, '');
fs.writeFileSync('src/views/WorkOrder/dialogs/UploadConfirmDialog.vue', uploadDialog);

console.log("Cleanup complete.");
