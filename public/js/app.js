/**
 * VMS.App — Main application controller
 *
 * Orchestrates SPA navigation, page lifecycle, dashboard stats,
 * and provides Toast / Modal utilities shared by all modules.
 */
window.VMS = window.VMS || {};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VMS.Toast — Notification toasts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VMS.Toast = (function () {
  'use strict';

  /** Map toast type → lucide icon name */
  var ICONS = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info',
  };

  return {
    /**
     * Show a toast notification.
     * @param {string} message  - Text to display
     * @param {string} type     - 'success' | 'error' | 'warning' | 'info'
     */
    show: function (message, type) {
      type = type || 'info';

      var container = document.getElementById('toast-container');
      if (!container) {
        // Create the container if it doesn't exist yet
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }

      var toast = document.createElement('div');
      toast.className = 'toast ' + type;

      var iconName = ICONS[type] || 'info';
      toast.innerHTML =
        '<i data-lucide="' + iconName + '"></i>' +
        '<span>' + VMS.App._esc(message) + '</span>' +
        '<button class="toast-close" aria-label="Close">&times;</button>';

      container.appendChild(toast);

      // Render the lucide icon we just inserted
      if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [toast] });
      }

      // Animate in
      requestAnimationFrame(function () {
        toast.classList.add('toast-visible');
      });

      // Close button
      toast.querySelector('.toast-close').addEventListener('click', function () {
        removeToast(toast);
      });

      // Auto-remove after 4 seconds
      setTimeout(function () {
        removeToast(toast);
      }, 4000);
    },
  };

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });
    // Fallback removal if animationend never fires
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 500);
  }
})();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VMS.Modal — Confirmation modal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VMS.Modal = (function () {
  'use strict';

  /** Stored confirm callback for the current modal. */
  var _onConfirm = null;

  function hide() {
    var overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('show');
    _onConfirm = null;
  }

  // Wire up cancel / overlay click once the DOM is ready
  function _bindOnce() {
    var cancel = document.getElementById('modal-cancel-btn');
    if (cancel) {
      cancel.addEventListener('click', hide);
    }

    var confirm = document.getElementById('modal-confirm-btn');
    if (confirm) {
      confirm.addEventListener('click', function () {
        if (typeof _onConfirm === 'function') {
          _onConfirm();
        }
        hide();
      });
    }

    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        // Close only if clicking the backdrop, not the modal itself
        if (e.target === overlay) hide();
      });
    }
  }

  // Will be called from VMS.App.init()
  return {
    _bindOnce: _bindOnce,

    /**
     * Display a confirmation modal.
     * @param {string}   title     - Modal heading
     * @param {string}   message   - HTML-safe body text
     * @param {Function} onConfirm - Callback when confirmed
     */
    show: function (title, message, onConfirm) {
      _onConfirm = onConfirm;

      var overlay = document.getElementById('modal-overlay');
      var titleEl = document.getElementById('modal-title');
      var bodyEl = document.getElementById('modal-body');

      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.innerHTML = message; // intentionally innerHTML for <strong> etc.
      if (overlay) overlay.classList.add('show');
    },
  };
})();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VMS.App — SPA navigation & lifecycle
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VMS.App = (function () {
  'use strict';

  // ── Page registry ─────────────────────────────────────────────────
  var pages = {
    login:              { title: 'Login' },
    users:              { title: 'User Management' },
    dashboard:          { title: 'Dashboard' },
    'new-visitor':      { title: 'New Visitor' },
    'returning-visitor':{ title: 'Returning Visitor' },
    reprint:            { title: 'Reprint Pass' },
    signout:            { title: 'Sign Out' },
    reports:            { title: 'Reports' },
  };

  var currentPage = null;
  var _clockInterval = null;

  // ── Helpers ───────────────────────────────────────────────────────

  /**
   * Return today's date as YYYY-MM-DD.
   */
  function todayISO() {
    var d = new Date();
    return (
      d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  /**
   * Escape HTML entities.
   */
  function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Update the top-bar clock display.
   */
  function updateClock() {
    var dateEl = document.getElementById('topbar-date');
    var timeEl = document.getElementById('topbar-time');

    var now = new Date();
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
  }

  // ── Public API ────────────────────────────────────────────────────
  return {
    /** Expose esc for VMS.Toast which references VMS.App._esc */
    _esc: esc,

    currentPage: null,

    // ── Init ──────────────────────────────────────────────────────

    /**
     * Application entry point — called on DOMContentLoaded.
     */
    async init() {
      // Initialise lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      // Modal bindings
      VMS.Modal._bindOnce();

      // Navigation — sidebar nav items
      this._setupNavigation();

      // Sidebar toggle for mobile
      this._setupSidebarToggle();

      // Initialise the Visitor module (employees, cameras, forms)
      try {
        await VMS.Visitor.init();
      } catch (err) {
        console.error('Visitor module init error:', err);
      }

      // Determine initial page from URL hash
      var hash = window.location.hash.replace('#', '') || 'dashboard';
      if (!pages[hash]) hash = 'dashboard';

      this.navigate(hash);

      // Start the top-bar clock
      updateClock();
      _clockInterval = setInterval(updateClock, 1000);

      // Listen for hash changes (back/forward)
      window.addEventListener('hashchange', () => {
        var h = window.location.hash.replace('#', '') || 'dashboard';
        if (h !== currentPage && pages[h]) {
          this.navigate(h);
        }
      });
    },

    // ── Navigation ────────────────────────────────────────────────

    /**
     * Wire up all navigation triggers:
     * - Sidebar links with [data-page]
     * - Dashboard cards with [data-navigate]
     */
    _setupNavigation() {
      var self = this;

      // Sidebar nav items
      document.querySelectorAll('[data-page]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var page = this.getAttribute('data-page');
          if (page) self.navigate(page);
        });
      });

      // Dashboard quick-action cards
      document.querySelectorAll('[data-navigate]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var page = this.getAttribute('data-navigate');
          if (page) self.navigate(page);
        });
      });
    },

    /**
     * Navigate to a page: hide others, show target, run lifecycle hooks.
     * @param {string} pageName
     */
    navigate(pageName) {
      if (!pages[pageName]) return;

      var previousPage = currentPage;
      currentPage = pageName;
      this.currentPage = pageName;
        if (pageName === 'login') {
          document.body.classList.add('login-mode');
        } else {
          document.body.classList.remove('login-mode');
        }

      // ── Stop cameras when leaving camera pages ──
      if (previousPage === 'new-visitor' && VMS.Visitor.camera) {
        VMS.Visitor.camera.stop();
      }
      if (previousPage === 'returning-visitor' && VMS.Visitor.retCamera) {
        VMS.Visitor.retCamera.stop();
      }

      // ── Toggle page visibility ──
      document.querySelectorAll('.page').forEach(function (section) {
        section.classList.remove('active');
      });

      var target = document.getElementById('page-' + pageName);
      if (target) target.classList.add('active');

      // ── Update sidebar active state ──
      document.querySelectorAll('[data-page]').forEach(function (link) {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
          link.classList.add('active');
        }
      });

      // ── Update page title ──
      var titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = pages[pageName].title;

      // ── Update URL hash (without triggering hashchange) ──
      history.replaceState(null, '', '#' + pageName);

      // ── Close mobile sidebar if open ──
      var sidebar = document.getElementById('sidebar');
      var sidebarOverlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');

      // ── Page-specific init hooks ──
      switch (pageName) {
        case 'dashboard':
          this.loadDashboardStats();
          break;

        case 'new-visitor':
          if (VMS.Visitor.camera) VMS.Visitor.camera.start();
          break;

        case 'returning-visitor':
          if (VMS.Visitor.retCamera) VMS.Visitor.retCamera.start();
          break;

        case 'signout':
          VMS.SignOut.init();
          break;

        case 'reports':
          VMS.Reports.init();
          break;

        case 'reprint':
          this._initReprintPage();
          break;
        case 'users':
          if (window.VMS.Users) VMS.Users.loadUsers();
          break;
      }
    },

    // ── Sidebar toggle (mobile) ─────────────────────────────────

    _setupSidebarToggle() {
      var toggle = document.getElementById('sidebar-toggle');
      var sidebar = document.getElementById('sidebar');
      var overlay = document.getElementById('sidebar-overlay');
      if (toggle && sidebar) {
        toggle.addEventListener('click', function () {
          var isOpen = sidebar.classList.toggle('open');
          if (overlay) {
            if (isOpen) overlay.classList.add('active');
            else overlay.classList.remove('active');
          }
        });
      }
      if (overlay) {
        overlay.addEventListener('click', function () {
          if (sidebar) sidebar.classList.remove('open');
          overlay.classList.remove('active');
        });
      }
    },

    // ── Dashboard ───────────────────────────────────────────────

    /**
     * Fetch today's visitor data and update dashboard stat cards + recent table.
     */
    async loadDashboardStats() {
      var today = todayISO();

      try {
        var visitors = await VMS.API.getVisitors(today, today);
        visitors = visitors || [];

        var total = visitors.length;
        var active = visitors.filter(function (v) { return !v.checkOutTime; }).length;
        var signedOut = total - active;

        // Update stat cards
        this._setStat('stat-today-total', total);
        this._setStat('stat-today-active', active);
        this._setStat('stat-today-signedout', signedOut);

        // Populate recent visitors table (last 5)
        this._renderRecentVisitors(visitors.slice(-5).reverse());
      } catch (err) {
        console.error('Dashboard stats error:', err);
      }
    },

    /**
     * Set the .stat-number text inside a stat card.
     * @param {string} cardId
     * @param {number|string} value
     */
    _setStat(cardId, value) {
      var card = document.getElementById(cardId);
      if (!card) return;
      var num = card.querySelector('.stat-number');
      if (num) num.textContent = value;
    },

    /**
     * Render the last N visitors in the dashboard recent table.
     * @param {Array} visitors
     */
    _renderRecentVisitors(visitors) {
      var tbody = document.getElementById('recent-visitors-tbody');
      if (!tbody) return;

      if (!visitors || visitors.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="empty-state">No visitors today yet.</td></tr>';
        return;
      }

      tbody.innerHTML = '';

      visitors.forEach(function (v) {
        var isActive = !v.checkOutTime;
        var badgeClass = isActive ? 'badge badge-active' : 'badge badge-signed-out';
        var badgeText = isActive ? 'Active' : 'Signed Out';

        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + esc(v.passId) + '</td>' +
          '<td>' + esc(v.fullName) + '</td>' +
          '<td>' + esc(v.company) + '</td>' +
          '<td>' + esc(v.whoToMeet) + '</td>' +
          '<td>' + VMS.Pass.formatDateTime(v.checkInTime) + '</td>' +
          '<td><span class="' + badgeClass + '">' + badgeText + '</span></td>';

        tbody.appendChild(tr);
      });
    },

    // ── Reprint Page ────────────────────────────────────────────

    /**
     * Wire up the reprint page search and print buttons.
     */
    _reprintInitialized: false,

    _initReprintPage() {
      if (this._reprintInitialized) return;
      this._reprintInitialized = true;

      var self = this;

      var searchBtn = document.getElementById('btn-reprint-search');
      if (searchBtn) {
        searchBtn.addEventListener('click', function () {
          self._searchReprint();
        });
      }

      var inputField = document.getElementById('input-reprint-passid');
      if (inputField) {
        inputField.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            self._searchReprint();
          }
        });
      }

      var printBtn = document.getElementById('btn-reprint');
      if (printBtn) {
        printBtn.addEventListener('click', function () {
          VMS.Pass.print();
        });
      }
    },

    async _searchReprint() {
      var passId = (document.getElementById('input-reprint-passid').value || '').trim();
      if (!passId) {
        VMS.Toast.show('Please enter a Pass ID.', 'warning');
        return;
      }

      var resultDiv = document.getElementById('reprint-result');
      var notFoundDiv = document.getElementById('reprint-not-found');
      var infoDiv = document.getElementById('reprint-visitor-info');

      if (resultDiv) resultDiv.classList.add('hidden');
      if (notFoundDiv) notFoundDiv.classList.add('hidden');

      try {
        var visitor = await VMS.API.getVisitor(passId);

        if (!visitor) {
          if (notFoundDiv) notFoundDiv.classList.remove('hidden');
          return;
        }

        // Show visitor info
        if (infoDiv) {
          infoDiv.innerHTML =
            '<div class="info-row"><strong>Pass ID:</strong> ' + esc(visitor.passId) + '</div>' +
            '<div class="info-row"><strong>Name:</strong> ' + esc(visitor.fullName) + '</div>' +
            '<div class="info-row"><strong>Company:</strong> ' + esc(visitor.company) + '</div>' +
            '<div class="info-row"><strong>Who to Meet:</strong> ' + esc(visitor.whoToMeet) + '</div>' +
            '<div class="info-row"><strong>Check-in:</strong> ' + VMS.Pass.formatDateTime(visitor.checkInTime) + '</div>' +
            '<div class="info-row"><strong>Status:</strong> <span class="badge ' +
              (!visitor.checkOutTime ? 'badge-active' : 'badge-signed-out') + '">' +
              (!visitor.checkOutTime ? 'Active' : 'Signed Out') + '</span></div>';
        }

        // Render the pass for printing
        VMS.Pass.render(visitor);

        if (resultDiv) resultDiv.classList.remove('hidden');
      } catch (err) {
        console.error('Reprint search error:', err);
        if (notFoundDiv) notFoundDiv.classList.remove('hidden');
      }
    },
  };
})();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Bootstrap on DOM ready
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.addEventListener('DOMContentLoaded', function () {
  VMS.App.init();
});
