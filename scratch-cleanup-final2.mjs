import fs from 'fs';
let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

const funcsToComment = [
    /function isPdfFile\(filename: string\) \{[\s\S]*?\n\}/,
    /async function confirmFileUpload\(\) \{[\s\S]*?finally \{\n\t\tisUploading\.value = false;\n\t\}\n\}/,
    /async function savePreviewFileRename\(\) \{[\s\S]*?finally \{\n\t\tisPreviewLoading\.value = false;\n\t\}\n\}/
];

for (const f of funcsToComment) {
    const match = content.match(f);
    if (match) {
        content = content.replace(f, `/*\n${match[0]}\n*/`);
    }
}

fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);
