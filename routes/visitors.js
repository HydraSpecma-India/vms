/**
 * routes/visitors.js
 *
 * All visitor-related endpoints: registration, sign-out, search,
 * photo retrieval, CSV export, and listing.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const emailUtils = require('../utils/emailUtils');
const { requireAdmin } = require('../utils/authUtils');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return today's date formatted as YYYYMMDD.
 */
function todayStamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Return today's date formatted as YYYY-MM-DD (for counter comparison).
 */
function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Read counter.json, increment (or reset) the daily count, write it back,
 * and return the new Pass ID string.
 *
 * Counter format:  { "date": "2026-06-02", "count": 3 }
 * Pass ID format:  VIS-20260602-003
 */
async function generatePassId(dataPath) {
  const counterFile = path.join(dataPath, 'counter.json');
  let counter = { date: todayISO(), count: 0 };

  try {
    const raw = await fs.readFile(counterFile, 'utf-8');
    counter = JSON.parse(raw);
  } catch {
    // File doesn't exist yet — use defaults
  }

  // Reset counter if the stored date is not today
  if (counter.date !== todayISO()) {
    counter.date = todayISO();
    counter.count = 0;
  }

  counter.count += 1;

  // Persist updated counter
  await fs.writeFile(counterFile, JSON.stringify(counter, null, 2), 'utf-8');

  const paddedCount = String(counter.count).padStart(3, '0');
  return `VIS-${todayStamp()}-${paddedCount}`;
}

/**
 * Read every .json file in the visitors/ directory and return an array of
 * parsed visitor objects.
 */
async function readAllVisitors(dataPath) {
  const visitorsDir = path.join(dataPath, 'visitors');

  let files;
  try {
    files = await fs.readdir(visitorsDir);
  } catch {
    return [];
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const visitors = await Promise.all(
    jsonFiles.map(async (file) => {
      try {
        const raw = await fs.readFile(path.join(visitorsDir, file), 'utf-8');
        return JSON.parse(raw);
      } catch {
        return null; // skip corrupt files
      }
    }),
  );

  return visitors.filter(Boolean);
}

/**
 * Sort visitors array by checkInTime descending (newest first).
 */
function sortByCheckInDesc(visitors) {
  return visitors.sort(
    (a, b) => new Date(b.checkInTime) - new Date(a.checkInTime),
  );
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /next-id
 *
 * Preview the next Pass ID for today without actually consuming it.
 * (We DO consume it here so the caller can reserve it — matches the spec.)
 */
router.get('/next-id', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const passId = await generatePassId(dataPath);
    res.json({ passId });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /
 *
 * Register a new visitor. Expects JSON body with visitor details and an
 * optional base64-encoded photo.
 */
router.post('/', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');

    const {
      fullName,
      mobile,
      email,
      company,
      purpose,
      whoToMeet,
      hostDepartment,
      hostTitle,
      hostEmail,
      numberOfVisitors,
      photo,
    } = req.body;

    // Basic validation
    if (!fullName || !mobile) {
      return res.status(400).json({ error: true, message: 'fullName and mobile are required.' });
    }

    // Generate the unique Pass ID for today
    const passId = await generatePassId(dataPath);

    // Build visitor record
    const visitor = {
      passId,
      fullName,
      mobile,
      email: email || '',
      company: company || '',
      purpose: purpose || '',
      whoToMeet: whoToMeet || '',
      hostDepartment: hostDepartment || '',
      hostTitle: hostTitle || '',
      numberOfVisitors: numberOfVisitors || 1,
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      status: 'active',
    };

    // Save visitor JSON --------------------------------------------------
    const visitorFile = path.join(dataPath, 'visitors', `${passId}.json`);
    await fs.writeFile(visitorFile, JSON.stringify(visitor, null, 2), 'utf-8');

    // Save photo (if provided) -------------------------------------------
    if (photo) {
      // Strip the data-URL prefix:  data:image/jpeg;base64,...
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
      const photoFile = path.join(dataPath, 'photos', `${passId}.jpg`);
      await fs.writeFile(photoFile, Buffer.from(base64Data, 'base64'));
    }

    // Send email notification (non-blocking)
    emailUtils.sendCheckInNotification(visitor, hostEmail).catch(err => {
      console.error('Email notification failed in background:', err);
    });

    res.status(201).json(visitor);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /active
 *
 * Return all visitors whose status is 'active', sorted newest-first.
 */
router.get('/active', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const all = await readAllVisitors(dataPath);
    const active = all.filter((v) => v.status === 'active');
    res.json(sortByCheckInDesc(active));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /search/mobile/:mobile
 *
 * Search visitors by mobile number (partial match).
 */
router.get('/search/mobile/:mobile', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const query = req.params.mobile.toLowerCase();
    const all = await readAllVisitors(dataPath);
    const matches = all.filter((v) => 
      (v.mobile && v.mobile.includes(query)) ||
      (v.fullName && v.fullName.toLowerCase().includes(query)) ||
      (v.company && v.company.toLowerCase().includes(query))
    );
    res.json(sortByCheckInDesc(matches));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /export/csv
 *
 * Export visitors as a downloadable CSV file.
 * Accepts optional query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get('/export/csv', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    let visitors = await readAllVisitors(dataPath);

    // Date-range filter
    const { from, to } = req.query;
    if (from) {
      const fromDate = new Date(from);
      visitors = visitors.filter((v) => new Date(v.checkInTime) >= fromDate);
    }
    if (to) {
      // Include the entire "to" day by adding one day
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      visitors = visitors.filter((v) => new Date(v.checkInTime) < toDate);
    }

    visitors = sortByCheckInDesc(visitors);

    // Build CSV content
    const headers = [
      'Pass ID',
      'Full Name',
      'Mobile',
      'Email',
      'Company',
      'Purpose',
      'Who to Meet',
      'Department',
      'Title',
      'Visitors',
      'Check In',
      'Check Out',
      'Status',
    ];

    const escapeCSV = (val) => {
      const str = val == null ? '' : String(val);
      // Wrap in quotes if the value contains a comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = visitors.map((v) =>
      [
        v.passId,
        v.fullName,
        v.mobile,
        v.email,
        v.company,
        v.purpose,
        v.whoToMeet,
        v.hostDepartment,
        v.hostTitle,
        v.numberOfVisitors,
        v.checkInTime,
        v.checkOutTime || '',
        v.status,
      ]
        .map(escapeCSV)
        .join(','),
    );

    const csv = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="visitors.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /:passId/photo
 *
 * Serve the visitor's photo as a JPEG image.
 */
router.get('/:passId/photo', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const photoPath = path.join(dataPath, 'photos', `${req.params.passId}.jpg`);

    try {
      await fs.access(photoPath);
    } catch {
      return res.status(404).json({ error: true, message: 'Photo not found.' });
    }

    res.sendFile(photoPath);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /:passId
 *
 * Retrieve a single visitor record by Pass ID.
 */
router.get('/:passId', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const filePath = path.join(dataPath, 'visitors', `${req.params.passId}.json`);

    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      return res.status(404).json({ error: true, message: 'Visitor not found.' });
    }

    res.json(JSON.parse(raw));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /:passId/signout
 *
 * Sign out a visitor — sets checkOutTime and status to 'signed-out'.
 */
router.put('/:passId/signout', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const filePath = path.join(dataPath, 'visitors', `${req.params.passId}.json`);

    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      return res.status(404).json({ error: true, message: 'Visitor not found.' });
    }

    const visitor = JSON.parse(raw);
    visitor.checkOutTime = new Date().toISOString();
    visitor.status = 'signed-out';

    await fs.writeFile(filePath, JSON.stringify(visitor, null, 2), 'utf-8');

    res.json(visitor);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /:passId
 *
 * Full edit of a visitor record. Only Admins can access this.
 */
router.put('/:passId', requireAdmin, async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    const filePath = path.join(dataPath, 'visitors', `${req.params.passId}.json`);

    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      return res.status(404).json({ error: true, message: 'Visitor not found.' });
    }

    const visitor = JSON.parse(raw);
    
    // Update fields from body
    const updatableFields = ['fullName', 'mobile', 'email', 'company', 'purpose', 'whoToMeet', 'hostDepartment', 'hostTitle', 'numberOfVisitors'];
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        visitor[field] = req.body[field];
      }
    }

    await fs.writeFile(filePath, JSON.stringify(visitor, null, 2), 'utf-8');

    res.json(visitor);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /
 *
 * List all visitors with optional date-range filter.
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get('/', async (req, res, next) => {
  try {
    const dataPath = req.app.get('dataPath');
    let visitors = await readAllVisitors(dataPath);

    const { from, to } = req.query;
    if (from) {
      const fromDate = new Date(from);
      visitors = visitors.filter((v) => new Date(v.checkInTime) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      visitors = visitors.filter((v) => new Date(v.checkInTime) < toDate);
    }

    res.json(sortByCheckInDesc(visitors));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
