
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'client/src/pages/David.tsx');
const content = fs.readFileSync(filePath, 'utf-8');

const stack: { tag: string; line: number }[] = [];
const lines = content.split('\n');

const selfClosing = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
    // Common React components that might be self-closing if they have no children, but here we look for />
]);

let errors = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const regex = /<\/?([a-zA-Z0-9\.]+)[^>]*\/?>/g;
    let match;

    // Ignore comments
    if (line.trim().startsWith('{/*') || line.trim().startsWith('//')) continue;

    while ((match = regex.exec(line)) !== null) {
        const fullTag = match[0];
        const tagName = match[1];

        if (fullTag.startsWith('</')) {
            // Closing tag
            if (stack.length === 0) {
                console.error(`Line ${i + 1}: Unexpected closing tag </${tagName}> (Stack empty)`);
                errors++;
            } else {
                const last = stack.pop();
                if (last && last.tag !== tagName) {
                    console.error(`Line ${i + 1}: Expected </${last.tag}> (opened at ${last.line}), found </${tagName}>`);
                    // Put it back to continue checking? Or assume missing?
                    // Heuristic: If we found <Div> then </Span>, maybe Stack has [Div, Span] and we missed closing Span?
                    // No, here we popped 'Div' and found 'Span'. 
                    // If mismatch, printing error is key.
                    stack.push(last); // Put back
                    errors++;
                }
            }
        } else if (fullTag.endsWith('/>')) {
            // Self closing, ignore
        } else {
            // Opening tag
            // Check if it is a void element in HTML
            if (!selfClosing.has(tagName.toLowerCase())) {
                stack.push({ tag: tagName, line: i + 1 });
            }
        }
    }
}

if (stack.length > 0) {
    console.error("End of file: Still open tags:");
    stack.forEach(s => console.error(`  <${s.tag}> at line ${s.line}`));
    errors++;
}

if (errors === 0) {
    console.log("✅ JSX Structure seems balanced.");
}
