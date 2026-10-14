const fs = require('fs');
const s = fs.readFileSync(process.argv[1], 'utf8');
let b = 0, p = 0, t = 0, str = false, esc = false, comment = false, cmtType = '*';
for (const ch of s) {
  if (str) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') str = false; continue; }
  if (comment) { if (cmtType === '*') { if (ch === '*') cmtType = '[]'; } else { if (ch === '/') comment = false; else if (ch === '*') cmtType = '*'; } continue; }
  switch (ch) {
    case '`': t++; break;
    case '"': case "'": str = true; break;
    case '/*': comment = true; cmtType = '/*'; break;
    case '*/': comment = false; cmtType = '*'; break;
    case '{': b++; break;
    case '}': b--; break;
    case '(': p++; break;
    case ')': p--; break;
    case '[': t++; break;
    case ']': t--; break;
  }
}
console.log('backticks:', t, 'parens:', p, 'braces:', b, 'comment:', comment ? cmtType : 'none');
console.log('lines:', s.split('\n').length);