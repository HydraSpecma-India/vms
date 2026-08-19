/**
 * VMS.SignOut — Active visitors display & sign-out workflow
 *
 * Shows all currently checked-in visitors as cards, provides
 * search/filter, and handles sign-out with confirmation.
 */
window.VMS = window.VMS || {};

VMS.SignOut = (function () {
  'use strict';

  /** Locally cached list for filtering. */
  let _activeVisitors = [];

  return {
    // ── Initialisation ──────────────────────────────────────────────

    /**
     * Load active visitors and wire up event listeners.
     */
    async init() {
      await this.loadActiveVisitors();
      this.setupSearch();
      this._setupDelegation();
    },

    // ── Load & render ───────────────────────────────────────────────

    /**
     * Fetch active visitors from the API and render cards.
     */
    async loadActiveVisitors() {
      const list = document.getElementById('active-visitors-list');
      if (!list) return;

      list.innerHTML = '<p class="loading-text">Loading active visitors…</p>';

      try {
        _activeVisitors = await VMS.API.getActiveVisitors();
        this._renderCards(_activeVisitors);
      } catch (err) {
        console.error('Load active visitors error:', err);
        list.innerHTML =
          '<p class="empty-state">Failed to load active visitors.</p>';
      }
    },

    /**
     * Render an array of visitor objects as cards.
     * @param {Array} visitors
     */
    _renderCards(visitors) {
      const list = document.getElementById('active-visitors-list');
      if (!list) return;

      if (!visitors || visitors.length === 0) {
        list.innerHTML =
          '<div class="empty-state">' +
            '<i data-lucide="users"></i>' +
            '<p>No active visitors at the moment.</p>' +
          '</div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      list.innerHTML = '';

      visitors.forEach((v) => {
        const card = document.createElement('div');
        card.className = 'visitor-card active-visitor-card';
        card.dataset.passid = v.passId;
        card.dataset.name = (v.fullName || '').toLowerCase();

        const photoSrc = VMS.API.getPhotoUrl(v.passId);

        card.innerHTML =
          '<div class="visitor-card-photo">' +
            '<img src="' + this._esc(photoSrc) + '" alt="Visitor photo" ' +
              'onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2240%22>?</text></svg>\'" />' +
          '</div>' +
          '<div class="visitor-card-info">' +
            '<strong>' + this._esc(v.fullName) + '</strong>' +
            '<span>' + this._esc(v.company) + '</span>' +
            '<span>Meeting: ' + this._esc(v.whoToMeet) + '</span>' +
            '<span>Check-in: ' + VMS.Pass.formatDateTime(v.checkInTime) + '</span>' +
            '<span class="pass-id-label">Pass #' + this._esc(v.passId) + '</span>' +
          '</div>' +
          '<div class="visitor-card-actions">' +
            '<button class="btn btn-danger btn-signout" data-passid="' +
              this._esc(v.passId) + '">Sign Out</button>' +
          '</div>';

        list.appendChild(card);
      });

      if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // ── Sign-out handler ────────────────────────────────────────────

    /**
     * Confirm and execute the sign-out of a visitor.
     * @param {string} passId
     */
    async handleSignOut(passId) {
      // Find the visitor name for the confirmation prompt
      const visitor = _activeVisitors.find(function (v) {
        return v.passId === passId;
      });
      const name = visitor ? visitor.fullName : passId;

      VMS.Modal.show(
        'Confirm Sign Out',
        'Are you sure you want to sign out <strong>' + this._esc(name) + '</strong>?',
        async () => {
          try {
            await VMS.API.signOutVisitor(passId);
            VMS.Toast.show(name + ' has been signed out.', 'success');

            // Refresh the list
            await this.loadActiveVisitors();

            // Update dashboard stats if the helper is available
            if (VMS.App && typeof VMS.App.loadDashboardStats === 'function') {
              VMS.App.loadDashboardStats();
            }
          } catch (err) {
            console.error('Sign-out error:', err);
            VMS.Toast.show(err.message || 'Failed to sign out visitor.', 'error');
          }
        }
      );
    },

    // ── Search / filter ─────────────────────────────────────────────

    /**
     * Wire up the search input to filter visible cards.
     */
    setupSearch() {
      const input = document.getElementById('input-signout-search');
      if (!input) return;

      input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        this._filterCards(query);
      });
    },

    /**
     * Show / hide cards based on the search query (name or pass ID).
     * @param {string} query
     */
    _filterCards(query) {
      const list = document.getElementById('active-visitors-list');
      if (!list) return;

      const cards = list.querySelectorAll('.active-visitor-card');
      cards.forEach(function (card) {
        const name = card.dataset.name || '';
        const pid = (card.dataset.passid || '').toLowerCase();
        const matches = !query || name.includes(query) || pid.includes(query);
        card.style.display = matches ? '' : 'none';
      });
    },

    // ── Event delegation ────────────────────────────────────────────

    /**
     * Use event delegation on the list container to handle sign-out clicks.
     */
    _setupDelegation() {
      const list = document.getElementById('active-visitors-list');
      if (!list) return;

      list.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-signout');
        if (btn && btn.dataset.passid) {
          this.handleSignOut(btn.dataset.passid);
        }
      });
    },

    // ── Utility ─────────────────────────────────────────────────────

    _esc(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },
  };
})();
