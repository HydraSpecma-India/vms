const fs = require('fs');

const path = 'C:\\Users\\mapa\\.gemini\\antigravity\\scratch\\visitor-management-system\\public\\index.html';
let content = fs.readFileSync(path, 'utf8');

const target = '<script src="js/app.js"></script>';
const replacement = `<script src="js/auth.js"></script>\n  <script src="js/users.js"></script>\n  <script src="js/app.js"></script>`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Scripts added to index.html successfully.');
