const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { hashPassword } = require('../utils/cryptoUtils');
const { requireAdmin } = require('../utils/authUtils');

// All user routes require admin
router.use(requireAdmin);

async function readUsers(dataPath) {
  const file = path.join(dataPath, 'users.json');
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

async function writeUsers(dataPath, users) {
  const file = path.join(dataPath, 'users.json');
  await fs.writeFile(file, JSON.stringify(users, null, 2), 'utf-8');
}

/**
 * GET /api/users
 * Returns a list of all users (without password hashes).
 */
router.get('/', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const users = await readUsers(dataPath);
    
    const safeUsers = users.map(u => ({
      username: u.username,
      role: u.role,
      requiresPasswordChange: u.requiresPasswordChange
    }));

    res.json(safeUsers);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users
 * Create a new user. Admin only.
 */
router.post('/', async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: true, message: 'Username and password required.' });
    }

    const dataPath = req.app.get('dataPath');
    const users = await readUsers(dataPath);

    if (users.some(u => u.username === username)) {
      return res.status(400).json({ error: true, message: 'Username already exists.' });
    }

    const { salt, hash } = hashPassword(password);
    const newUser = {
      username,
      salt,
      passwordHash: hash,
      role: role === 'admin' ? 'admin' : 'user',
      requiresPasswordChange: true // Always force new users to change their password
    };

    users.push(newUser);
    await writeUsers(dataPath, users);

    res.status(201).json({
      username: newUser.username,
      role: newUser.role,
      requiresPasswordChange: true
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:username
 * Edit an existing user (e.g. change password or role).
 */
router.put('/:username', async (req, res, next) => {
  try {
    const { password, role } = req.body;
    const targetUsername = req.params.username;

    const dataPath = req.app.get('dataPath');
    const users = await readUsers(dataPath);
    
    const userIndex = users.findIndex(u => u.username === targetUsername);
    if (userIndex === -1) {
      return res.status(404).json({ error: true, message: 'User not found.' });
    }

    if (password) {
      const { salt, hash } = hashPassword(password);
      users[userIndex].salt = salt;
      users[userIndex].passwordHash = hash;
      users[userIndex].requiresPasswordChange = true; // Force them to change if admin resets it
    }

    if (role && targetUsername !== 'admin') { // Prevent changing the default admin role
      users[userIndex].role = role === 'admin' ? 'admin' : 'user';
    }

    await writeUsers(dataPath, users);

    res.json({
      username: users[userIndex].username,
      role: users[userIndex].role,
      requiresPasswordChange: users[userIndex].requiresPasswordChange
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
