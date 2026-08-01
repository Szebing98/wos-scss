const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const stylesDir = 'src/styles/pages';
const viewsDir = 'src/views';

// Mapping of files to their new destinations relative to stylesDir
const fileMappings = {
    '_settings.scss': 'Settings/_settings.scss',
    '_user-user-profile.scss': 'User/_user-profile.scss',
    '_user-user-list.scss': 'User/_user-list.scss',
    '_work-order-tabs-payment-tab.scss': 'WorkOrder/tabs/_payment-tab.scss',
    '_work-order-tabs-notes-tab.scss': 'WorkOrder/tabs/_notes-tab.scss',
    '_work-order-tabs-general-tab.scss': 'WorkOrder/tabs/_general-tab.scss',
    '_work-order-tabs-part-info-tab.scss': 'WorkOrder/tabs/_part-info-tab.scss',
    '_work-order-tabs-supplier-invoices-tab.scss': 'WorkOrder/tabs/_supplier-invoices-tab.scss',
    '_work-order-tabs-report-tab.scss': 'WorkOrder/tabs/_report-tab.scss',
    '_work-order-tabs-images-tab.scss': 'WorkOrder/tabs/_images-tab.scss',
    '_work-order-tabs-finance-tab.scss': 'WorkOrder/tabs/_finance-tab.scss',
    '_work-order-tabs-verification-tab.scss': 'WorkOrder/tabs/_verification-tab.scss',
    '_work-order-work-order-list.scss': 'WorkOrder/_work-order-list.scss',
    '_work-order-work-order-form.scss': 'WorkOrder/_work-order-form.scss',
    '_work-order-work-order-detail.scss': 'WorkOrder/_work-order-detail.scss',
    '_maintenance-work-type.scss': 'Maintenance/_work-type.scss',
    '_maintenance-doc-no-format.scss': 'Maintenance/_doc-no-format.scss',
    '_maintenance-role-permission.scss': 'Maintenance/_role-permission.scss',
    '_maintenance-location.scss': 'Maintenance/_location.scss',
    '_maintenance-user-permission.scss': 'Maintenance/_user-permission.scss',
    '_maintenance-part-info.scss': 'Maintenance/_part-info.scss',
    '_maintenance-site.scss': 'Maintenance/_site.scss',
    '_maintenance-service-provided.scss': 'Maintenance/_service-provided.scss',
    '_notifications.scss': 'Notifications/_notifications.scss',
    '_customer-customer-profile.scss': 'Customer/_customer-profile.scss',
    '_customer-customer-list.scss': 'Customer/_customer-list.scss',
    '_customer-customer-form.scss': 'Customer/_customer-form.scss',
    '_audit-log.scss': 'AuditLog/_audit-log.scss'
};

// 1. Create directories and move files
for (const [oldName, newPath] of Object.entries(fileMappings)) {
    const oldFilePath = path.join(stylesDir, oldName);
    const newFilePath = path.join(stylesDir, newPath);
    const newDirPath = path.dirname(newFilePath);
    
    if (fs.existsSync(oldFilePath)) {
        fs.mkdirSync(newDirPath, { recursive: true });
        fs.renameSync(oldFilePath, newFilePath);
        console.log(`Moved ${oldName} -> ${newPath}`);
    } else {
        console.warn(`File not found: ${oldFilePath}`);
    }
}

// 2. Rename directories for Account and Dashboard
const dirMappings = {
    'account': 'Account',
    'dashboard': 'Dashboard'
};

for (const [oldDir, newDir] of Object.entries(dirMappings)) {
    const oldDirPath = path.join(stylesDir, oldDir);
    const newDirPath = path.join(stylesDir, newDir);
    if (fs.existsSync(oldDirPath)) {
        fs.renameSync(oldDirPath, newDirPath);
        console.log(`Renamed directory ${oldDir} -> ${newDir}`);
    }
}

// 3. Update Vue files with new import paths
function getAllVueFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllVueFiles(filePath, fileList);
        } else if (filePath.endsWith('.vue')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const vueFiles = getAllVueFiles(viewsDir);

for (const file of vueFiles) {
    let content = fs.readFileSync(file, 'utf-8');
    let hasChanges = false;
    
    for (const [oldName, newPath] of Object.entries(fileMappings)) {
        const oldImport = `@use "@/styles/pages/${oldName}";`;
        const newImport = `@use "@/styles/pages/${newPath}";`;
        
        if (content.includes(oldImport)) {
            content = content.replace(oldImport, newImport);
            hasChanges = true;
        }
    }
    
    // Also handle account and dashboard if they were imported
    if (content.includes('@use "@/styles/pages/account/')) {
        content = content.replace(/@use "@\/styles\/pages\/account\//g, '@use "@/styles/pages/Account/');
        hasChanges = true;
    }
    if (content.includes('@use "@/styles/pages/dashboard/')) {
        content = content.replace(/@use "@\/styles\/pages\/dashboard\//g, '@use "@/styles/pages/Dashboard/');
        hasChanges = true;
    }

    if (hasChanges) {
        fs.writeFileSync(file, content);
        console.log(`Updated imports in ${file}`);
    }
}

console.log("SCSS refactoring complete.");
