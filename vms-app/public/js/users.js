/**
 * VMS.Users - User management (Admin only)
 */
window.VMS = window.VMS || {};

VMS.Users = (function () {
  'use strict';

  let currentEditingUser = null;

  function init() {
    bindEvents();
  }

  function bindEvents() {
    const btnAddUser = document.getElementById('btn-add-user');
    if (btnAddUser) {
      btnAddUser.addEventListener('click', () => showUserModal());
    }

    const userForm = document.getElementById('form-user');
    if (userForm) {
      userForm.addEventListener('submit', handleSaveUser);
    }

    // When the users page is shown, fetch users
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#users') {
        loadUsers();
      }
    });
  }

  async function loadUsers() {
    if (!VMS.Auth.isAdmin()) {
      VMS.Toast.show('Unauthorized access', 'error');
      VMS.App.navigate('dashboard');
      return;
    }

    try {
      const users = await VMS.API.getUsers();
      renderUsers(users);
    } catch (err) {
      VMS.Toast.show('Failed to load users', 'error');
    }
  }

  function renderUsers(users) {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No users found</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${VMS.App._esc(user.username)}</td>
        <td><span class="badge ${user.role === 'admin' ? 'badge-active' : 'badge-signed-out'}">${VMS.App._esc(user.role)}</span></td>
        <td><span class="badge ${user.requiresPasswordChange ? 'badge-active' : 'badge-signed-out'}">${user.requiresPasswordChange ? 'Pending Password Change' : 'Active'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="VMS.Users.editUser('${VMS.App._esc(user.username)}', '${VMS.App._esc(user.role)}')">
            <i data-lucide="edit"></i> Edit
          </button>
        </td>
      </tr>
    `).join('');

    // Re-initialize icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function showUserModal(username = null, role = 'user') {
    currentEditingUser = username;
    const modal = document.getElementById('modal-user');
    const form = document.getElementById('form-user');
    const title = document.getElementById('modal-user-title');
    const inputUsername = document.getElementById('input-user-username');
    const inputPassword = document.getElementById('input-user-password');
    const inputRole = document.getElementById('input-user-role');

    form.reset();

    if (username) {
      title.textContent = 'Edit User';
      inputUsername.value = username;
      inputUsername.disabled = true;
      inputPassword.placeholder = 'Leave blank to keep current';
      inputPassword.required = false;
      inputRole.value = role;
    } else {
      title.textContent = 'Add User';
      inputUsername.disabled = false;
      inputPassword.placeholder = 'Enter password';
      inputPassword.required = true;
      inputRole.value = 'user';
    }

    modal.classList.add('show');
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const username = document.getElementById('input-user-username').value;
    const password = document.getElementById('input-user-password').value;
    const role = document.getElementById('input-user-role').value;

    btn.disabled = true;
    try {
      if (currentEditingUser) {
        const data = { role };
        if (password) data.password = password;
        await VMS.API.editUser(currentEditingUser, data);
        VMS.Toast.show('User updated successfully', 'success');
      } else {
        await VMS.API.addUser(username, password, role);
        VMS.Toast.show('User added successfully', 'success');
      }
      document.getElementById('modal-user').classList.remove('show');
      loadUsers();
    } catch (err) {
      VMS.Toast.show(err.message || 'Failed to save user', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  return {
    init,
    loadUsers,
    editUser: showUserModal
  };
})();

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  if (VMS.Users) VMS.Users.init();
});
