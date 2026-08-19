const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, 'public', 'assets', 'logo.png');
const htmlPath = path.join(__dirname, 'public', 'index.html');

try {
  // Read the image as base64
  const imgBuffer = fs.readFileSync(imgPath);
  const base64Str = 'data:image/png;base64,' + imgBuffer.toString('base64');
  
  // Read index.html
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // 1. Replace the sidebar logo icon with the base64 image
  const sidebarTarget = `<div class="sidebar-logo">
          <i data-lucide="shield-check"></i>
        </div>`;
  const sidebarReplacement = `<div class="sidebar-logo-img">
          <img src="${base64Str}" alt="Company Logo" style="max-width:160px; height:auto;">
        </div>`;
  html = html.replace(sidebarTarget, sidebarReplacement);
  
  // 2. Replace the pass title with the base64 image
  const printTarget = `<div class="pass-company-name">Visitor Management System</div>`;
  const printReplacement = `<div class="pass-company-logo">
        <img src="${base64Str}" alt="Company Logo" style="max-height:40px; margin: 0 auto; display:block;">
      </div>`;
  html = html.replace(printTarget, printReplacement);
  
  // Write back to index.html
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('Logo successfully embedded in index.html');
  
} catch (err) {
  console.error('Error embedding logo:', err);
}
