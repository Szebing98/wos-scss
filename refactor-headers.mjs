import fs from 'fs';
import path from 'path';

const searchRegex = /(settings-page|maintenance-view|customer-view|user-view|workorder-view|workorder-form-view|services-view|notifications-page|dashboard)__header/g;
const titleRegex = /(settings-page|maintenance-view|customer-view|user-view|workorder-view|workorder-form-view|services-view|notifications-page|dashboard)__title-area/g;
const subtitleRegex = /(settings-page|maintenance-view|customer-view|user-view|workorder-view|workorder-form-view|services-view|notifications-page|dashboard)__subtitle/g;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    content = content.replace(searchRegex, 'page-header');
    content = content.replace(titleRegex, 'page-header__title-area');
    content = content.replace(subtitleRegex, 'page-header__subtitle');
    
    // Replace class="header-actions" with class="page-header__actions"
    content = content.replace(/class="header-actions"/g, 'class="page-header__actions"');
    
    // Fix buttons that don't have .btn-text wrapper for their text
    // A bit tricky with regex, we only need to ensure the action buttons have icons and .btn-text.
    // The user's request will hide .btn-text. If they already have .btn-text, good.
    // If they don't, I will manually inspect or they might just hide the whole button text.
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Updated', filePath);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.vue')) {
            processFile(fullPath);
        }
    }
}

walk('./src/views');
console.log('Refactoring complete.');
