const fs = require('fs');
const code = fs.readFileSync('app/routes/app.settings.jsx', 'utf8');

const regex = /<(\/?)([A-Za-z.]+)([^>]*)>/g;
let stack = [];
let match;
let lines = code.split('\n');

while ((match = regex.exec(code)) !== null) {
    let isClosing = match[1] === '/';
    let tagName = match[2];
    let attrs = match[3];

    // check if self-closing
    if (!isClosing && attrs.trim().endsWith('/')) continue;
    if (!isClosing && ['br', 'img', 'hr', 'input'].includes(tagName.toLowerCase())) continue;

    let lineNo = 1 + code.substring(0, match.index).split('\n').length - 1;

    if (isClosing) {
        if (stack.length === 0) {
            console.log(`Unmatched closing tag at line ${lineNo}: </${tagName}>`);
        } else {
            let top = stack.pop();
            if (top.tag !== tagName) {
                console.log(`Mismatch at line ${lineNo}: expected </${top.tag}> (opened at ${top.line}), but found </${tagName}>`);
                break;
            }
        }
    } else {
        stack.push({ tag: tagName, line: lineNo });
    }
}

if (stack.length > 0) {
    console.log('Unclosed tags remaining:');
    stack.forEach(t => console.log(`- <${t.tag}> opened at ${t.line}`));
} else {
    console.log('All tags balanced!');
}
