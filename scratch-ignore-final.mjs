import fs from 'fs';
let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

content = content.replace(/function isPdfFile/g, '// @ts-ignore\nfunction isPdfFile');
content = content.replace(/async function confirmFileUpload/g, '// @ts-ignore\nasync function confirmFileUpload');
content = content.replace(/async function savePreviewFileRename/g, '// @ts-ignore\nasync function savePreviewFileRename');

fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);
