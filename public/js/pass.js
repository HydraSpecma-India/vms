/**
 * VMS.Pass — Visitor pass renderer & printer
 *
 * Populates the #print-pass-container with visitor data
 * and triggers the browser print dialog.
 */
window.VMS = window.VMS || {};

VMS.Pass = (function () {
  'use strict';

  // ── Date formatting helper ──────────────────────────────────────────
  const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /**
   * Format an ISO date string to "DD-MMM-YYYY hh:mm AM/PM".
   * @param {string|Date} dateInput
   * @returns {string} Formatted date string, or '-' if invalid.
   */
  function formatDateTime(dateInput) {
    if (!dateInput) return '-';

    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const mon = MONTHS[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // convert 0 → 12
    const hh = String(hours).padStart(2, '0');

    return `${day}-${mon}-${year} ${hh}:${mins} ${ampm}`;
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  /**
   * Safely set the textContent of an element by ID.
   * @param {string} id
   * @param {string} text
   */
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  // ── Public API ──────────────────────────────────────────────────────
  return {
    /** Expose the formatter for reuse by other modules. */
    formatDateTime: formatDateTime,

    /**
     * Populate the pass container with visitor details.
     * @param {Object} visitor
     */
    render: function (visitor) {
      if (!visitor) return;

      setText('pass-id-display', visitor.passId);
      setText('pass-name', visitor.fullName);
      setText('pass-company', visitor.company);
      setText('pass-mobile', visitor.mobile);
      setText('pass-who-to-meet', visitor.whoToMeet);
      setText('pass-department', visitor.hostDepartment);
      setText('pass-title', visitor.hostTitle);
      setText('pass-purpose', visitor.purpose);
      setText('pass-num-visitors', visitor.numberOfVisitors);
      setText(
        'pass-checkin-time',
        formatDateTime(visitor.checkInTime || visitor.createdAt)
      );

      // Photo — prefer base64 data already available, fall back to API URL
      const photoEl = document.getElementById('pass-photo');
      if (photoEl) {
        if (visitor.photo && visitor.photo.startsWith('data:')) {
          photoEl.src = visitor.photo;
        } else {
          photoEl.src = VMS.API.getPhotoUrl(visitor.passId);
        }
      }
    },

    /**
     * Trigger the browser print dialog.
     * Relies on print.css to isolate #print-pass-container.
     */
    print: function () {
      window.print();
    },

    /**
     * Convenience: render the pass and immediately open the print dialog.
     * @param {Object} visitor
     */
    renderAndPrint: function (visitor) {
      this.render(visitor);
      // Small timeout lets the browser repaint before opening the dialog
      setTimeout(() => this.print(), 300);
    },
  };
})();
