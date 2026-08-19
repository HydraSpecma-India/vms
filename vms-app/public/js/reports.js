/**
 * VMS.Reports — Visitor log reports with filtering, stats, and CSV export
 */
window.VMS = window.VMS || {};

VMS.Reports = (function () {
  'use strict';

  // ── Helpers ─────────────────────────────────────────────────────────

  /**
   * Return today's date as YYYY-MM-DD.
   * @returns {string}
   */
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /**
   * Escape HTML entities.
   */
  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Calculate average visit duration in minutes for signed-out visitors.
   * @param {Array} visitors
   * @returns {string} e.g. "42 min" or "-"
   */
  function avgDuration(visitors) {
    const signedOut = visitors.filter(function (v) {
      return v.checkOutTime;
    });

    if (signedOut.length === 0) return '-';

    const totalMs = signedOut.reduce(function (sum, v) {
      return sum + (new Date(v.checkOutTime) - new Date(v.checkInTime));
    }, 0);

    const avgMins = Math.round(totalMs / signedOut.length / 60000);

    if (avgMins < 60) return avgMins + ' min';
    const hrs = Math.floor(avgMins / 60);
    const mins = avgMins % 60;
    return hrs + 'h ' + mins + 'm';
  }

  /**
   * Find the most-visited person (host) in the visitor list.
   * @param {Array} visitors
   * @returns {string}
   */
  function mostVisited(visitors) {
    if (!visitors || visitors.length === 0) return '-';

    const counts = {};
    visitors.forEach(function (v) {
      const host = v.whoToMeet || 'Unknown';
      counts[host] = (counts[host] || 0) + 1;
    });

    let maxHost = '-';
    let maxCount = 0;
    Object.keys(counts).forEach(function (host) {
      if (counts[host] > maxCount) {
        maxCount = counts[host];
        maxHost = host;
      }
    });

    return maxHost + ' (' + maxCount + ')';
  }

  // ── Public API ──────────────────────────────────────────────────────
  return {
    // ── Initialisation ────────────────────────────────────────────────

    /**
     * Set default dates and load today's report.
     */
    async init() {
      const today = todayISO();

      const fromInput = document.getElementById('input-date-from');
      const toInput = document.getElementById('input-date-to');
      const quickFilter = document.getElementById('select-quick-filter');

      if (fromInput && !fromInput.value) fromInput.value = today;
      if (toInput && !toInput.value) toInput.value = today;
      if (quickFilter) quickFilter.value = 'today';

      this._attachHandlers();
      this._attachEditHandlers();
      await this.loadReport();
    },

    _attachEditHandlers() {
      const editForm = document.getElementById('form-edit-visitor');
      if (editForm) {
        editForm.addEventListener('submit', this._handleEditSubmit.bind(this));
      }
    },

    /**
     * Wire up filter and export buttons.
     */
    _attachHandlers() {
      const filterBtn = document.getElementById('btn-filter-reports');
      if (filterBtn) {
        filterBtn.addEventListener('click', () => this.loadReport());
      }

      const exportBtn = document.getElementById('btn-export-csv');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportCSV());
      }

      const quickFilter = document.getElementById('select-quick-filter');
      if (quickFilter) {
        quickFilter.addEventListener('change', (e) => this._onQuickFilterChange(e));
      }
    },

    // ── Report loading ────────────────────────────────────────────────

    /**
     * Fetch visitor records for the selected date range and render.
     */
    async loadReport() {
      const from = (document.getElementById('input-date-from') || {}).value || todayISO();
      const to = (document.getElementById('input-date-to') || {}).value || todayISO();
      const tbody = document.getElementById('reports-tbody');
      if (!tbody) return;

      tbody.innerHTML =
        '<tr><td colspan="9" class="loading-text">Loading report…</td></tr>';

      try {
        const visitors = await VMS.API.getVisitors(from, to);
        this._renderTable(visitors);
        this._renderSummary(visitors);
      } catch (err) {
        console.error('Load report error:', err);
        tbody.innerHTML =
          '<tr><td colspan="9" class="empty-state">Failed to load report.</td></tr>';
      }
    },

    /**
     * Populate the report table body.
     * @param {Array} visitors
     */
    _renderTable(visitors) {
      const tbody = document.getElementById('reports-tbody');
      if (!tbody) return;

      if (!visitors || visitors.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="9" class="empty-state">No visitor records found for the selected dates.</td></tr>';
        return;
      }

      tbody.innerHTML = '';

      visitors.forEach(function (v) {
        const isActive = !v.checkOutTime;
        const badgeClass = isActive ? 'badge badge-active' : 'badge badge-signed-out';
        const badgeText = isActive ? 'Active' : 'Signed Out';

        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + esc(v.passId) + '</td>' +
          '<td>' + esc(v.fullName) + '</td>' +
          '<td>' + esc(v.mobile) + '</td>' +
          '<td>' + esc(v.company) + '</td>' +
          '<td>' + esc(v.whoToMeet) + '</td>' +
          '<td>' + esc(v.hostDepartment) + '</td>' +
          '<td>' + VMS.Pass.formatDateTime(v.checkInTime) + '</td>' +
          '<td>' + (v.checkOutTime ? VMS.Pass.formatDateTime(v.checkOutTime) : '-') + '</td>' +
          '<td><span class="' + badgeClass + '">' + badgeText + '</span></td>' +
          '<td class="admin-only" style="display: none;">' +
            '<button class="btn btn-secondary btn-sm" onclick="VMS.Reports.editVisitor(\'' + v.passId + '\')"><i data-lucide="edit"></i> Edit</button>' +
          '</td>';

        tbody.appendChild(tr);
      });

      // Re-initialize lucide icons for new buttons
      if (window.lucide) {
        window.lucide.createIcons();
      }
      
      // Show admin-only columns if admin
      if (window.VMS.Auth && window.VMS.Auth.isAdmin()) {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
      }
    },

    /**
     * Update the summary section with aggregate stats.
     * @param {Array} visitors
     */
    _renderSummary(visitors) {
      const container = document.getElementById('reports-summary');
      if (!container) return;

      if (!visitors || visitors.length === 0) {
        container.innerHTML = '';
        return;
      }

      const total = visitors.length;
      const avg = avgDuration(visitors);
      const mvp = mostVisited(visitors);

      container.innerHTML =
        '<div class="summary-stat">' +
          '<span class="summary-label">Total Visitors</span>' +
          '<span class="summary-value">' + total + '</span>' +
        '</div>' +
        '<div class="summary-stat">' +
          '<span class="summary-label">Avg. Visit Duration</span>' +
          '<span class="summary-value">' + avg + '</span>' +
        '</div>' +
        '<div class="summary-stat">' +
          '<span class="summary-label">Most Visited Host</span>' +
          '<span class="summary-value">' + esc(mvp) + '</span>' +
        '</div>';
    },

    // ── CSV export ────────────────────────────────────────────────────

    /**
     * Trigger CSV download for the selected date range.
     */
    async exportCSV() {
      const from = (document.getElementById('input-date-from') || {}).value || todayISO();
      const to = (document.getElementById('input-date-to') || {}).value || todayISO();

      try {
        await VMS.API.exportCSV(from, to);
        VMS.Toast.show('CSV export started.', 'success');
      } catch (err) {
        console.error('CSV export error:', err);
        VMS.Toast.show(err.message || 'CSV export failed.', 'error');
      }
    },

    // ── Edit Visitor (Admin) ──────────────────────────────────────────

    async editVisitor(passId) {
      if (!VMS.Auth.isAdmin()) return;
      try {
        const v = await VMS.API.getVisitor(passId);
        document.getElementById('edit-visitor-passid').value = v.passId;
        document.getElementById('edit-input-fullname').value = v.fullName;
        document.getElementById('edit-input-mobile').value = v.mobile;
        document.getElementById('edit-input-company').value = v.company;
        document.getElementById('edit-input-purpose').value = v.purpose;
        document.getElementById('edit-input-who-to-meet').value = v.whoToMeet || '';
        document.getElementById('modal-edit-visitor').classList.add('show');
      } catch (err) {
        VMS.Toast.show('Failed to fetch visitor details', 'error');
      }
    },

    async _handleEditSubmit(e) {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const passId = document.getElementById('edit-visitor-passid').value;
      
      const data = {
        fullName: document.getElementById('edit-input-fullname').value,
        mobile: document.getElementById('edit-input-mobile').value,
        company: document.getElementById('edit-input-company').value,
        purpose: document.getElementById('edit-input-purpose').value,
        whoToMeet: document.getElementById('edit-input-who-to-meet').value
      };

      btn.disabled = true;
      try {
        await VMS.API.editVisitor(passId, data);
        VMS.Toast.show('Visitor updated successfully', 'success');
        document.getElementById('modal-edit-visitor').classList.remove('show');
        this.loadReport(); // Refresh table
      } catch (err) {
        VMS.Toast.show(err.message || 'Failed to update visitor', 'error');
      } finally {
        btn.disabled = false;
      }
    },

    _onQuickFilterChange(e) {
      const val = e.target.value;
      const fromInput = document.getElementById('input-date-from');
      const toInput = document.getElementById('input-date-to');
      if (!fromInput || !toInput) return;

      const today = new Date();
      const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const r = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${r}`;
      };

      if (val === 'today') {
        fromInput.value = formatDate(today);
        toInput.value = formatDate(today);
      } else if (val === '7days') {
        const past = new Date();
        past.setDate(today.getDate() - 7);
        fromInput.value = formatDate(past);
        toInput.value = formatDate(today);
      } else if (val === 'month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        fromInput.value = formatDate(start);
        toInput.value = formatDate(today);
      } else if (val === 'lastmonth') {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        fromInput.value = formatDate(start);
        toInput.value = formatDate(end);
      } else if (val === 'all') {
        fromInput.value = '';
        toInput.value = '';
      }

      this.loadReport();
    }
  };
})();
