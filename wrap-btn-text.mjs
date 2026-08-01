import fs from 'fs';
import path from 'path';

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Look for <button> or <Button> inside page-header__actions area.
    // Actually, let's just globally wrap text after <i class="mdi ..."></i> if it's inside a button,
    // or we can just target any text immediately following <i class="mdi ..."></i> that is not empty
    // and wrap it in <span class="btn-text">...</span>.
    
    // We only want to do this if the file contains page-header__actions to be safe.
    if (content.includes('page-header__actions')) {
        // Regex: <i class="mdi ..."[^>]*></i> \n? \s* (Text) \n? \s* </button>
        // Let's use a simpler approach:
        // Find: </i>\s*([^<\n]+?)\s*</button>
        // And for <Button>: </i>\s*([^<\n]+?)\s*</Button>
        // But the text might be on the next line.
        
        const regex1 = /(<\/i>)\s*([^<\n]+?)\s*(<\/button>)/gi;
        content = content.replace(regex1, (match, p1, p2, p3) => {
            if (p2.trim() === '') return match;
            return `${p1} <span class="btn-text">${p2.trim()}</span> ${p3}`;
        });

        const regex2 = /(<\/i>)\s*([^<\n]+?)\s*(<\/Button>)/gi;
        content = content.replace(regex2, (match, p1, p2, p3) => {
            if (p2.trim() === '') return match;
            return `${p1} <span class="btn-text">${p2.trim()}</span> ${p3}`;
        });
    }
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Wrapped text in', filePath);
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
console.log('Wrapping complete.');
