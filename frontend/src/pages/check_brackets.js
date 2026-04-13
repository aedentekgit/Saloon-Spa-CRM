
const fs = require('fs');
const content = fs.readFileSync('/Users/aedenteka/Downloads/Projects/Saloon & Spa  CRM  copy/frontend/src/pages/Roles.tsx', 'utf8');
let stack = [];
let line = 1;
let col = 1;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') {
    stack.push({ line, col });
  } else if (content[i] === '}') {
    if (stack.length === 0) {
      console.log('Extra } at line ' + line + ', col ' + col);
    } else {
      stack.pop();
    }
  }
  if (content[i] === '\n') {
    line++;
    col = 1;
  } else {
    col++;
  }
}
if (stack.length > 0) {
  stack.forEach(s => console.log('Unclosed { at line ' + s.line + ', col ' + s.col));
} else {
  console.log('Brackets are balanced');
}
