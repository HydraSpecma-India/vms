/**
 * VMS.API — API communication layer
 * All methods use fetch() with async/await, return parsed JSON,
 * and throw descriptive errors on failure.
 */
window.VMS = window.VMS || {};

VMS.API = (function () {
  'use strict';

  const BASE_URL = '';

  // ── Helper ──────────────────────────────────────────────────────────
  /**
   * Generic fetch wrapper that handles response status and JSON parsing.
   */
  async function request(url, options = {}) {
    try {
      options.headers = options.headers || {};
      const token = localStorage.getItem('vms_token');
      if (token && !options.headers['Authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
        let requiresPasswordChange = false;
        try {
          const body = await response.json();
          if (body && body.message) {
            errorMsg = body.message;
          }
          if (body && body.requiresPasswordChange) {
            requiresPasswordChange = true;
          }
        } catch (_) {}
        
        const err = new Error(errorMsg);
        err.status = response.status;
        err.requiresPasswordChange = requiresPasswordChange;
        
        // Handle global auth failures
        if (response.status === 401 || (response.status === 403 && !requiresPasswordChange)) {
          window.dispatchEvent(new CustomEvent('vms-auth-failed'));
        } else if (requiresPasswordChange) {
          window.dispatchEvent(new CustomEvent('vms-password-change-required'));
        }
        
        throw err;
      }

      // Some endpoints may return 204 No Content
      if (response.status === 204) return null;

      return await response.json();
    } catch (err) {
      // Re-throw with a cleaner message for network-level errors
      if (err.name === 'TypeError') {
        throw new Error('Network error — please check your connection.');
      }
      throw err;
    }
  }

  // ── Public API ──────────────────────────────────────────────────────
  return {
    async login(username, password) {
      return request(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
    },

    async changePassword(newPassword) {
      return request(`${BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
    },

    async getUsers() {
      return request(`${BASE_URL}/api/users`);
    },

    async addUser(username, password, role) {
      return request(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
    },

    async editUser(username, data) {
      return request(`${BASE_URL}/api/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },

    async editVisitor(passId, data) {
      return request(`${BASE_URL}/api/visitors/${encodeURIComponent(passId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },

    /**
     * Fetch the next available pass ID.
     * @returns {Promise<{passId: string}>}
     */
    async getNextId() {
      return request(`${BASE_URL}/api/visitors/next-id`);
    },

    /**
     * Create a new visitor record.
     * @param {Object} data - Visitor data including base64 photo.
     * @returns {Promise<Object>} Created visitor record.
     */
    async createVisitor(data) {
      return request(`${BASE_URL}/api/visitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },

    /**
     * Get a single visitor by pass ID.
     * @param {string} passId
     * @returns {Promise<Object>}
     */
    async getVisitor(passId) {
      return request(`${BASE_URL}/api/visitors/${encodeURIComponent(passId)}`);
    },

    /**
     * Search visitors by mobile number.
     * @param {string} mobile
     * @returns {Promise<Array>}
     */
    async searchByMobile(mobile) {
      return request(
        `${BASE_URL}/api/visitors/search/mobile/${encodeURIComponent(mobile)}`
      );
    },

    /**
     * Sign out a visitor.
     * @param {string} passId
     * @returns {Promise<Object>} Updated visitor record.
     */
    async signOutVisitor(passId) {
      return request(
        `${BASE_URL}/api/visitors/${encodeURIComponent(passId)}/signout`,
        { method: 'PUT' }
      );
    },

    /**
     * Get all currently active (checked-in, not signed-out) visitors.
     * @returns {Promise<Array>}
     */
    async getActiveVisitors() {
      return request(`${BASE_URL}/api/visitors/active`);
    },

    /**
     * Get visitors within a date range.
     * @param {string} from - ISO date string or YYYY-MM-DD.
     * @param {string} to   - ISO date string or YYYY-MM-DD.
     * @returns {Promise<Array>}
     */
    async getVisitors(from, to) {
      const params = new URLSearchParams({ from, to });
      return request(`${BASE_URL}/api/visitors?${params.toString()}`);
    },

    async exportCSV(from, to) {
      try {
        const params = new URLSearchParams({ from, to });
        const token = localStorage.getItem('vms_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(
          `${BASE_URL}/api/visitors/export/csv?${params.toString()}`,
          { headers }
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            window.dispatchEvent(new CustomEvent('vms-auth-failed'));
          }
          throw new Error(`CSV export failed: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor to trigger the download
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `visitors_${from}_to_${to}.csv`;
        document.body.appendChild(anchor);
        anchor.click();

        // Cleanup
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } catch (err) {
        if (err.name === 'TypeError') {
          throw new Error('Network error — please check your connection.');
        }
        throw err;
      }
    },

    /**
     * Fetch the list of employees (hosts).
     * @returns {Promise<Array<{displayName, department, jobTitle, email}>>}
     */
    async getEmployees() {
      return request(`${BASE_URL}/api/employees`);
    },

    /**
     * Refresh the employee list from the upstream directory.
     * @returns {Promise<Array>}
     */
    async refreshEmployees() {
      return request(`${BASE_URL}/api/employees/refresh`);
    },

    /**
     * Build the photo URL for a given pass ID.
     * @param {string} passId
     * @returns {string}
     */
    getPhotoUrl(passId) {
      const token = localStorage.getItem('vms_token');
      return `${BASE_URL}/api/visitors/${encodeURIComponent(passId)}/photo${token ? '?token=' + encodeURIComponent(token) : ''}`;
    },
  };
})();
