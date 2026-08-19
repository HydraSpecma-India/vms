const fs = require('fs');

const path = 'C:\\Users\\mapa\\.gemini\\antigravity\\scratch\\visitor-management-system\\public\\index.html';
let content = fs.readFileSync(path, 'utf8');

const target = '<th>Status</th>';
const replacement = `<th>Status</th>\n                  <th class="admin-only" style="display: none;">Actions</th>`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Actions header added to index.html successfully.');
