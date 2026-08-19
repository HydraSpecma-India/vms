/**
 * VMS.Auth - Authentication handling
 */
window.VMS = window.VMS || {};

VMS.Auth = (function () {
  'use strict';

  function init() {
    bindEvents();
    setupLoginLogo();
    checkAuthOnLoad();
  }

  function bindEvents() {
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }

    const changePasswordForm = document.getElementById('form-change-password');
    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', handleChangePassword);
    }

    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    window.addEventListener('vms-auth-failed', () => {
      handleLogout(null, true);
    });

    window.addEventListener('vms-password-change-required', () => {
      showChangePasswordModal(true);
    });

    const changePasswordBtn = document.getElementById('nav-change-password');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showChangePasswordModal(false);
      });
    }
  }

  function showChangePasswordModal(forced = false) {
    const modal = document.getElementById('modal-password');
    if (!modal) return;

    const title = modal.querySelector('.modal-title');
    const desc = modal.querySelector('.modal-body p');
    const cancelBtn = document.getElementById('btn-cancel-password-change');

    if (forced) {
      if (title) title.textContent = 'Change Password Required';
      if (desc) desc.textContent = 'For security reasons, you must change your default password before continuing.';
      if (cancelBtn) cancelBtn.style.display = 'none';
    } else {
      if (title) title.textContent = 'Change Password';
      if (desc) desc.textContent = 'Enter your new password below to update your login credentials.';
      if (cancelBtn) cancelBtn.style.display = 'inline-block';
    }

    modal.classList.add('show');
  }

  function setupLoginLogo() {
    const printLogo = document.querySelector('#print-pass-container .pass-company-logo img');
    const loginLogoContainer = document.getElementById('login-logo-container');
    if (printLogo && loginLogoContainer && !loginLogoContainer.hasChildNodes()) {
      const clonedLogo = printLogo.cloneNode();
      clonedLogo.style.height = '60px'; // Adjust size for login screen
      loginLogoContainer.appendChild(clonedLogo);
    }
  }

  function checkAuthOnLoad() {
    const token = localStorage.getItem('vms_token');
    if (!token) {
      VMS.App.navigate('login');
      return;
    }

    try {
      const user = parseJwt(token);
      if (user && user.role === 'admin') {
        document.getElementById('nav-users').style.display = 'flex';
      }
      // Trigger navigation to dashboard if currently on login
      if (window.location.hash === '' || window.location.hash === '#login') {
         VMS.App.navigate('dashboard');
      }
    } catch (e) {
      handleLogout(null, true);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('input-login-username');
    const passwordInput = document.getElementById('input-login-password');
    const btn = e.target.querySelector('button[type="submit"]');

    const originalText = btn.innerHTML;
    btn.innerHTML = 'Logging in...';
    btn.disabled = true;

    try {
      const res = await VMS.API.login(usernameInput.value, passwordInput.value);
      localStorage.setItem('vms_token', res.token);
      
      VMS.Toast.show('Login successful', 'success');
      
      if (res.requiresPasswordChange) {
        showChangePasswordModal(true);
      } else {
        checkAuthOnLoad();
        VMS.App.navigate('dashboard');
      }
      e.target.reset();
    } catch (err) {
      VMS.Toast.show(err.message || 'Login failed', 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const newPasswordInput = document.getElementById('input-new-password');
    const btn = e.target.querySelector('button[type="submit"]');
    
    btn.disabled = true;
    try {
      const res = await VMS.API.changePassword(newPasswordInput.value);
      localStorage.setItem('vms_token', res.token);
      document.getElementById('modal-password').classList.remove('show');
      VMS.Toast.show('Password updated successfully', 'success');
      
      checkAuthOnLoad();
      VMS.App.navigate('dashboard');
      e.target.reset();
    } catch (err) {
      VMS.Toast.show(err.message || 'Failed to change password', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  function handleLogout(e, force = false) {
    if (e) e.preventDefault();
    localStorage.removeItem('vms_token');
    document.getElementById('nav-users').style.display = 'none';
    if (!force) {
      VMS.Toast.show('Logged out successfully', 'success');
    } else {
      VMS.Toast.show('Session expired. Please log in again.', 'warning');
    }
    VMS.App.navigate('login');
  }

  function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  function isAdmin() {
    const token = localStorage.getItem('vms_token');
    if (!token) return false;
    try {
      return parseJwt(token).role === 'admin';
    } catch (e) {
      return false;
    }
  }

  return {
    init,
    isAdmin
  };
})();

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  if (VMS.Auth) VMS.Auth.init();
});
