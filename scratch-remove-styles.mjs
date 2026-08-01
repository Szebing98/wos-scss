import fs from 'fs';
let content = fs.readFileSync('src/views/WorkOrder/WorkOrderDetail.vue', 'utf-8');

content = content.replace(
    /<style lang="scss" scoped>[\s\S]*?<\/style>/,
    '<style lang="scss" scoped>\n@use "@/styles/pages/WorkOrder/_work-order-detail.scss";\n</style>'
);

fs.writeFileSync('src/views/WorkOrder/WorkOrderDetail.vue', content);
console.log("Removed duplicated styles from WorkOrderDetail.vue");
