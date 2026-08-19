const crypto = require('crypto');

/**
 * Generates a salt and hashes the given password.
 * @param {string} password - The plain text password
 * @returns {Object} { salt, hash }
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

/**
 * Verifies a password against a stored salt and hash.
 * @param {string} password - The plain text password
 * @param {string} salt - The stored salt
 * @param {string} storedHash - The stored hash
 * @returns {boolean} True if password matches, false otherwise
 */
function verifyPassword(password, salt, storedHash) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === storedHash;
}

module.exports = {
  hashPassword,
  verifyPassword
};
