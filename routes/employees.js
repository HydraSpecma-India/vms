/**
 * routes/employees.js
 *
 * Endpoints for loading and caching employee data from a CSV file
 * (typically an M365 / Azure AD export).
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let employeeCache = null; // will hold the parsed array after first load
let employeeCacheMtime = null;

// ---------------------------------------------------------------------------
// CSV Parsing Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a single CSV line into an array of field values, respecting
 * double-quoted fields that may contain commas or escaped quotes.
 *
 * Example:  '"Smith, John",john@co.com,HR,"Sr. Manager"'
 *   => ['Smith, John', 'john@co.com', 'HR', 'Sr. Manager']
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Look ahead: doubled quote means escaped literal quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip the second quote
        } else {
          inQuotes = false; // closing quote
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }

  // Push the last field
  fields.push(current.trim());
  return fields;
}

/**
 * Map known header variations to our canonical field names.
 *
 * Supports both M365 export headers and simple lowercase headers:
 *   "Display name"  |  "displayName"   => displayName
 *   "User principal name" | "email"    => email
 *   "Department"    |  "department"    => department
 *   "Job title"     |  "jobTitle"      => jobTitle
 */
function canonicalHeader(raw) {
  const lower = raw.toLowerCase().trim();
  const map = {
    'display name': 'displayName',
    displayname: 'displayName',
    'user principal name': 'email',
    email: 'email',
    department: 'department',
    'job title': 'jobTitle',
    jobtitle: 'jobTitle',
  };
  return map[lower] || lower; // fall back to lowercased original
}

/**
 * Helper to determine the path to the employee/userdata CSV file.
 * Returns path to employees.csv or userdata.csv if either exists, or null.
 */
async function getCSVPath(dataPath) {
  const employeesPath = path.join(dataPath, 'employees.csv');
  try {
    await fs.access(employeesPath);
    return employeesPath;
  } catch {
    const userdataPath = path.join(dataPath, 'userdata.csv');
    try {
      await fs.access(userdataPath);
      return userdataPath;
    } catch {
      return null;
    }
  }
}

/**
 * Read and parse the employees CSV file, returning an array of
 * { displayName, email, department, jobTitle } objects.
 */
async function parseEmployeesCSV(dataPath) {
  const csvPath = await getCSVPath(dataPath);
  if (!csvPath) return null;

  let content;
  try {
    content = await fs.readFile(csvPath, 'utf-8');
  } catch {
    // File doesn't exist or can't be read
    return null;
  }

  // Split into non-empty lines (handle both \r\n and \n)
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  // Parse header row
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(canonicalHeader);

  // Parse data rows
  const employees = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });

    employees.push({
      displayName: record.displayName || '',
      email: record.email || '',
      department: record.department || '',
      jobTitle: record.jobTitle || '',
    });
  }

  return employees;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /
 *
 * Return all employees. Uses the in-memory cache if available;
 * otherwise reads and parses the CSV on first request.
 */
router.get('/', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const csvPath = await getCSVPath(dataPath);

    if (csvPath) {
      try {
        const stat = await fs.stat(csvPath);
        const mtime = stat.mtimeMs;
        if (employeeCache === null || employeeCacheMtime !== mtime) {
          const result = await parseEmployeesCSV(dataPath);
          if (result !== null) {
            employeeCache = result;
            employeeCacheMtime = mtime;
          } else {
            employeeCache = [];
            employeeCacheMtime = null;
          }
        }
      } catch (_) {
        employeeCache = [];
        employeeCacheMtime = null;
      }
    } else {
      employeeCache = [];
      employeeCacheMtime = null;
    }

    res.json(employeeCache);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /refresh
 *
 * Force a re-read of the employees CSV and update the cache.
 */
router.get('/refresh', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const csvPath = await getCSVPath(dataPath);
    const result = await parseEmployeesCSV(dataPath);

    if (result === null) {
      employeeCache = [];
      employeeCacheMtime = null;
      return res.json({
        employees: [],
        message:
          'Neither employees.csv nor userdata.csv was found. Please place your employee CSV file in ' +
          dataPath,
      });
    }

    if (csvPath) {
      try {
        const stat = await fs.stat(csvPath);
        employeeCacheMtime = stat.mtimeMs;
      } catch (_) {
        employeeCacheMtime = null;
      }
    } else {
      employeeCacheMtime = null;
    }

    employeeCache = result;
    res.json(employeeCache);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
