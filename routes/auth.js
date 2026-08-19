const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { verifyPassword, hashPassword } = require('../utils/cryptoUtils');
const { generateToken, authenticateToken } = require('../utils/authUtils');

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
 * POST /api/auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: true, message: 'Username and password required.' });
    }

    const dataPath = req.app.get('dataPath');
    const users = await readUsers(dataPath);
    
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: true, message: 'Invalid credentials.' });
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: true, message: 'Invalid credentials.' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        requiresPasswordChange: user.requiresPasswordChange
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/change-password
 * Requires a valid token (even if requiresPasswordChange is true)
 */
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 5) {
      return res.status(400).json({ error: true, message: 'Password must be at least 5 characters.' });
    }

    const dataPath = req.app.get('dataPath');
    const users = await readUsers(dataPath);
    
    const userIndex = users.findIndex(u => u.username === req.user.username);
    if (userIndex === -1) {
      return res.status(404).json({ error: true, message: 'User not found.' });
    }

    const { salt, hash } = hashPassword(newPassword);
    users[userIndex].salt = salt;
    users[userIndex].passwordHash = hash;
    users[userIndex].requiresPasswordChange = false;

    await writeUsers(dataPath, users);

    // Issue a new token with requiresPasswordChange set to false
    const newToken = generateToken(users[userIndex]);
    
    res.json({ success: true, token: newToken });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
