/**
 * Visitor Management System — Express Server
 *
 * Reads configuration from config.json, bootstraps required data
 * directories, mounts API routes, and serves static assets.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { hashPassword } = require('./utils/cryptoUtils');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const loadConfig = require('./utils/configLoader');
const config = loadConfig();
const DATA_PATH = path.resolve(config.dataPath);
const PORT = config.port || 3000;

// ---------------------------------------------------------------------------
// Bootstrap — create data directories if they don't exist
// ---------------------------------------------------------------------------

const dirsToCreate = [
  DATA_PATH,
  path.join(DATA_PATH, 'visitors'),
  path.join(DATA_PATH, 'photos'),
];

for (const dir of dirsToCreate) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

const usersFile = path.join(DATA_PATH, 'users.json');
if (!fs.existsSync(usersFile)) {
  const { salt, hash } = hashPassword('admin');
  const defaultAdmin = [{
    username: 'admin',
    salt,
    passwordHash: hash,
    role: 'admin',
    requiresPasswordChange: true
  }];
  fs.writeFileSync(usersFile, JSON.stringify(defaultAdmin, null, 2), 'utf8');
  console.log('Seeded default admin user in users.json');
}

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------

const app = express();

// Make dataPath available to route handlers via req.app.get('dataPath')
app.set('dataPath', DATA_PATH);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));          // large limit for base64 photos
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static front-end files from ./public/
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

const visitorsRouter = require('./routes/visitors');
const employeesRouter = require('./routes/employees');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const { authenticateToken } = require('./utils/authUtils');

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/visitors', authenticateToken, visitorsRouter);
app.use('/api/employees', authenticateToken, employeesRouter);
app.use('/api/users', authenticateToken, usersRouter);

// ---------------------------------------------------------------------------
// Global Error-Handling Middleware
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal Server Error',
  });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log('='.repeat(56));
  console.log(' Visitor Management System');
  console.log(`   Port      : ${PORT}`);
  console.log(`   Data Path : ${DATA_PATH}`);
  console.log(`   Static Dir: ${path.join(__dirname, 'public')}`);
  console.log('='.repeat(56));
  
  // Auto-open the browser
  const url = `http://localhost:${PORT}`;
  console.log(` Opening browser at: ${url}`);
  const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${startCmd} ${url}`);
});
