/**
 * VMS.Visitor — New & returning visitor registration
 *
 * Manages the two registration forms, employee autocomplete,
 * camera integration, and API submission.
 */
window.VMS = window.VMS || {};

VMS.Visitor = (function () {
  'use strict';

  return {
    /** Cached employee list fetched from the server. */
    employees: [],

    /** Camera instance for the new-visitor form. */
    camera: null,

    /** Camera instance for the returning-visitor form. */
    retCamera: null,

    // ── Initialisation ────────────────────────────────────────────────

    /**
     * Bootstrap the visitor module:
     * 1. Fetch employees
     * 2. Create camera instances
     * 3. Wire up form handlers and employee search
     */
    async init() {
      try {
        this.employees = await VMS.API.getEmployees();
      } catch (err) {
        console.error('Failed to load employees:', err);
        this.employees = [];
      }

      // Camera for new visitor form
      this.camera = new VMS.Camera({
        videoId: 'camera-video',
        canvasId: 'camera-canvas',
        photoId: 'camera-photo',
        captureBtn: 'btn-capture',
        retakeBtn: 'btn-retake',
        containerId: 'camera-container',
      });

      // Camera for returning visitor form
      this.retCamera = new VMS.Camera({
        videoId: 'ret-camera-video',
        canvasId: 'ret-camera-canvas',
        photoId: 'ret-camera-photo',
        captureBtn: 'ret-btn-capture',
        retakeBtn: 'ret-btn-retake',
        containerId: 'ret-camera-container',
      });

      // Employee search autocomplete
      this.setupEmployeeSearch('input-who-to-meet', 'dropdown-who-to-meet');
      this.setupEmployeeSearch('ret-input-who-to-meet', 'ret-dropdown-who-to-meet');

      // Form submissions
      const newForm = document.getElementById('form-new-visitor');
      if (newForm) {
        newForm.addEventListener('submit', (e) => this.submitNewVisitor(e));
      }

      const retForm = document.getElementById('form-returning-visitor');
      if (retForm) {
        retForm.addEventListener('submit', (e) => this.submitReturningVisitor(e));
      }

      // Returning visitor search
      const searchBtn = document.getElementById('btn-search-returning');
      if (searchBtn) {
        searchBtn.addEventListener('click', () => this.searchReturningVisitor());
      }

      // Also trigger search on Enter key
      const searchInput = document.getElementById('input-search-mobile');
      if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.searchReturningVisitor();
          }
        });
      }
    },

    // ── Employee autocomplete ─────────────────────────────────────────

    /**
     * Attach an autocomplete dropdown to an input for employee search.
     * @param {string} inputId    - ID of the text input
     * @param {string} dropdownId - ID of the dropdown container
     */
    setupEmployeeSearch(inputId, dropdownId) {
      const input = document.getElementById(inputId);
      const dropdown = document.getElementById(dropdownId);
      if (!input || !dropdown) return;

      const self = this;

      /**
       * Render matching employees in the dropdown.
       * @param {string} query
       */
      function showMatches(query) {
        dropdown.innerHTML = '';
        if (!query) {
          dropdown.style.display = 'none';
          return;
        }

        const lowerQ = query.toLowerCase();
        const matches = self.employees.filter(function (emp) {
          return emp.displayName && emp.displayName.toLowerCase().includes(lowerQ);
        });

        if (matches.length === 0) {
          dropdown.style.display = 'none';
          return;
        }

        matches.slice(0, 20).forEach(function (emp) {
          const option = document.createElement('div');
          option.className = 'employee-option';
          option.textContent =
            emp.displayName +
            ' — ' +
            (emp.department || '') +
            ' — ' +
            (emp.jobTitle || '');

          option.addEventListener('mousedown', function (e) {
            // mousedown fires before blur, so we can set the value
            e.preventDefault();
            input.value = emp.displayName;
            input.dataset.department = emp.department || '';
            input.dataset.title = emp.jobTitle || '';
            input.dataset.email = emp.email || '';
            dropdown.style.display = 'none';
          });

          dropdown.appendChild(option);
        });

        dropdown.style.display = 'block';
      }

      input.addEventListener('input', function () {
        showMatches(this.value.trim());
      });

      input.addEventListener('focus', function () {
        if (this.value.trim()) {
          showMatches(this.value.trim());
        }
      });

      input.addEventListener('blur', function () {
        // Delay hide so that mousedown on an option can fire first
        setTimeout(function () {
          dropdown.style.display = 'none';
        }, 200);
      });
    },

    // ── New visitor submission ─────────────────────────────────────────

    /**
     * Gather data from the new-visitor form, validate, and submit.
     * @param {Event} e - Submit event
     */
    async submitNewVisitor(e) {
      e.preventDefault();

      const fullName = (document.getElementById('input-fullname').value || '').trim();
      const mobile = (document.getElementById('input-mobile').value || '').trim();
      const email = (document.getElementById('input-email').value || '').trim();
      const company = (document.getElementById('input-company').value || '').trim();
      const purpose = (document.getElementById('input-purpose').value || '').trim();

      const whoToMeetInput = document.getElementById('input-who-to-meet');
      const whoToMeet = (whoToMeetInput.value || '').trim();
      const hostDepartment = whoToMeetInput.dataset.department || '';
      const hostTitle = whoToMeetInput.dataset.title || '';
      const hostEmail = whoToMeetInput.dataset.email || '';

      const numberOfVisitors = document.getElementById('input-num-visitors').value || '1';
      const photo = this.camera.getPhoto();

      // Validation
      if (!fullName) {
        VMS.Toast.show('Full name is required.', 'error');
        return;
      }
      if (!mobile) {
        VMS.Toast.show('Mobile number is required.', 'error');
        return;
      }
      if (!company) {
        VMS.Toast.show('Company name is required.', 'error');
        return;
      }
      if (!photo) {
        VMS.Toast.show('Please capture a photo before submitting.', 'error');
        return;
      }

      const data = {
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
      };

      try {
        const visitor = await VMS.API.createVisitor(data);
        VMS.Toast.show('Visitor checked in successfully!', 'success');

        // Attach local photo base64 to bypass reloading it from the server
        visitor.photo = photo;

        // Render and print the visitor pass
        VMS.Pass.renderAndPrint(visitor);

        // Reset the form and camera
        document.getElementById('form-new-visitor').reset();
        // Clear dataset attributes
        whoToMeetInput.dataset.department = '';
        whoToMeetInput.dataset.title = '';
        whoToMeetInput.dataset.email = '';
        this.camera.stop();
      } catch (err) {
        console.error('Create visitor error:', err);
        VMS.Toast.show(err.message || 'Failed to check in visitor.', 'error');
      }
    },

    // ── Returning visitor search ──────────────────────────────────────

    /**
     * Search for previous visitors by mobile number and display result cards.
     */
    async searchReturningVisitor() {
      const query = (document.getElementById('input-search-mobile').value || '').trim();
      if (!query) {
        VMS.Toast.show('Please enter a search query (name, mobile, or company).', 'warning');
        return;
      }

      const resultsContainer = document.getElementById('returning-visitor-results');
      if (!resultsContainer) return;

      resultsContainer.classList.remove('hidden');
      resultsContainer.innerHTML = '<p class="loading-text">Searching…</p>';

      try {
        const visitors = await VMS.API.searchByMobile(query);

        if (!visitors || visitors.length === 0) {
          resultsContainer.innerHTML =
            '<p class="empty-state">No previous visits found for this query.</p>';
          return;
        }

        resultsContainer.innerHTML = '';

        // Deduplicate: group by unique Name + Mobile + Company and show only the latest check-in
        const uniqueVisitors = [];
        const seen = new Set();
        visitors.forEach((v) => {
          const key = `${(v.fullName || '').trim().toLowerCase()}|${(v.company || '').trim().toLowerCase()}|${(v.mobile || '').trim().toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueVisitors.push(v);
          }
        });

        uniqueVisitors.forEach((v) => {
          const card = document.createElement('div');
          card.className = 'visitor-card';
          card.innerHTML =
            '<div class="visitor-card-info">' +
              '<strong>' + this._esc(v.fullName) + '</strong>' +
              '<span>' + this._esc(v.company) + '</span>' +
              '<span>' + this._esc(v.mobile) + '</span>' +
              '<span>Last visit: ' + VMS.Pass.formatDateTime(v.checkInTime) + '</span>' +
            '</div>' +
            '<button class="btn btn-primary btn-use-visitor" type="button">Use This Visitor</button>';

          card.querySelector('.btn-use-visitor').addEventListener('click', () => {
            this._prefillReturningForm(v);
          });

          resultsContainer.appendChild(card);
        });
      } catch (err) {
        console.error('Search error:', err);
        resultsContainer.innerHTML = '';
        VMS.Toast.show(err.message || 'Search failed.', 'error');
      }
    },

    /**
     * Prefill the returning visitor form with data from a previous visit.
     * @param {Object} visitor
     */
    _prefillReturningForm(visitor) {
      const setVal = function (id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      };

      setVal('ret-input-fullname', visitor.fullName);
      setVal('ret-input-mobile', visitor.mobile);
      setVal('ret-input-email', visitor.email);
      setVal('ret-input-company', visitor.company);
      setVal('ret-input-purpose', visitor.purpose);
      setVal('ret-input-who-to-meet', visitor.whoToMeet);
      setVal('ret-input-num-visitors', visitor.numberOfVisitors || '1');

      const whoInput = document.getElementById('ret-input-who-to-meet');
      if (whoInput) {
        whoInput.dataset.department = visitor.hostDepartment || '';
        whoInput.dataset.title = visitor.hostTitle || '';
      }

      // Show the returning visitor form section
      const formSection = document.getElementById('returning-visitor-form-section');
      if (formSection) formSection.style.display = 'block';

      VMS.Toast.show('Visitor data loaded. Please capture a new photo.', 'info');
    },

    // ── Returning visitor submission ──────────────────────────────────

    /**
     * Submit the returning visitor form.
     * @param {Event} e
     */
    async submitReturningVisitor(e) {
      e.preventDefault();

      const fullName = (document.getElementById('ret-input-fullname').value || '').trim();
      const mobile = (document.getElementById('ret-input-mobile').value || '').trim();
      const email = (document.getElementById('ret-input-email').value || '').trim();
      const company = (document.getElementById('ret-input-company').value || '').trim();
      const purpose = (document.getElementById('ret-input-purpose').value || '').trim();

      const whoToMeetInput = document.getElementById('ret-input-who-to-meet');
      const whoToMeet = (whoToMeetInput.value || '').trim();
      const hostDepartment = whoToMeetInput.dataset.department || '';
      const hostTitle = whoToMeetInput.dataset.title || '';
      const hostEmail = whoToMeetInput.dataset.email || '';

      const numberOfVisitors = document.getElementById('ret-input-num-visitors').value || '1';
      const photo = this.retCamera.getPhoto();

      // Validation
      if (!fullName) {
        VMS.Toast.show('Full name is required.', 'error');
        return;
      }
      if (!mobile) {
        VMS.Toast.show('Mobile number is required.', 'error');
        return;
      }
      if (!company) {
        VMS.Toast.show('Company name is required.', 'error');
        return;
      }
      if (!photo) {
        VMS.Toast.show('Please capture a photo before submitting.', 'error');
        return;
      }

      const data = {
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
      };

      try {
        const visitor = await VMS.API.createVisitor(data);
        VMS.Toast.show('Returning visitor checked in successfully!', 'success');

        // Attach local photo base64 to bypass reloading it from the server
        visitor.photo = photo;

        VMS.Pass.renderAndPrint(visitor);

        document.getElementById('form-returning-visitor').reset();
        whoToMeetInput.dataset.department = '';
        whoToMeetInput.dataset.title = '';
        this.retCamera.stop();

        // Hide form section
        const formSection = document.getElementById('returning-visitor-form-section');
        if (formSection) formSection.style.display = 'none';
      } catch (err) {
        console.error('Returning visitor error:', err);
        VMS.Toast.show(err.message || 'Failed to check in visitor.', 'error');
      }
    },

    // ── Utility ───────────────────────────────────────────────────────

    /**
     * Escape HTML entities to prevent XSS in injected content.
     * @param {string} str
     * @returns {string}
     */
    _esc(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },
  };
})();
