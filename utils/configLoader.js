const fs = require('fs');
const path = require('path');

/**
 * Dynamically loads config.json.
 * If running via node, it loads it from the project root.
 * If running via a pkg executable, it loads it from the folder containing the .exe.
 */
function loadConfig() {
  const isPkg = typeof process.pkg !== 'undefined';
  
  // process.execPath is the path to node.exe in dev, but path to vms.exe in production
  const basePath = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
  const configPath = path.join(basePath, 'config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file missing! Expected to find config.json at: ${configPath}`);
  }
  
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

module.exports = loadConfig;
