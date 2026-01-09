/* eslint-disable no-use-before-define, no-restricted-globals, func-names */
// Users management page script
(function () {
  const USERS_KEY = 'users';
  const ACT_KEY = 'activityLog';
  let users = [];
  let editingUser = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadUsers();
    seedDefaultUsersIfNeeded();
    bindUI();
    renderUsers();
    checkAccess();
  }

  function loadUsers() {
    try {
      users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (error) {
      console.warn('Failed to load users', error);
      users = [];
    }
  }
  function saveUsers() {
    localStorage.setItem(USERS_KEY, JSON.stringify(users || []));
  }

  function seedDefaultUsersIfNeeded() {
    if (!users || users.length === 0) {
      users = [
        // Admin user
        {
          username: 'admin',
          password: 'admin',
          role: 'admin',
          branch: 'Admin',
        },
        // Maganjo Branch
        {
          username: 'maganjo_manager',
          password: 'password',
          role: 'manager',
          branch: 'Maganjo',
        },
        {
          username: 'maganjo_attendant1',
          password: 'password',
          role: 'attendant',
          branch: 'Maganjo',
        },
        {
          username: 'maganjo_attendant2',
          password: 'password',
          role: 'attendant',
          branch: 'Maganjo',
        },
        // Matugga Branch
        {
          username: 'matugga_manager',
          password: 'password',
          role: 'manager',
          branch: 'Matugga',
        },
        {
          username: 'matugga_attendant1',
          password: 'password',
          role: 'attendant',
          branch: 'Matugga',
        },
        {
          username: 'matugga_attendant2',
          password: 'password',
          role: 'attendant',
          branch: 'Matugga',
        },
      ];
      saveUsers();
    }
  }

  function bindUI() {
    document.getElementById('addUserBtn').addEventListener('click', () => showUserModal());
    document.getElementById('closeUserModal').addEventListener('click', hideUserModal);
    document.getElementById('cancelUser').addEventListener('click', hideUserModal);
    document.getElementById('userForm').addEventListener('submit', (e) => {
      e.preventDefault();
      handleUserSubmit();
    });
    document.getElementById('usersSearch').addEventListener('input', renderUsers);
  }

  function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    const q = (document.getElementById('usersSearch').value || '').toLowerCase();
    const list = users.filter((u) => u.username.toLowerCase().includes(q));
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.7;">No users found</td></tr>';
      return;
    }
    tbody.innerHTML = list
      .map(
        (u) => `
            <tr>
                <td>${u.username}</td>
                <td>${(u.role || '').toUpperCase()}</td>
                <td>${u.branch || 'Admin'}</td>
                <td>
                    <button class="btn-primary small edit" data-user="${u.username}">Edit</button>
                    <button class="btn-secondary small delete" data-user="${u.username}">Delete</button>
                </td>
            </tr>
        `,
      )
      .join('');

    tbody.querySelectorAll('.edit').forEach((b) => b.addEventListener('click', () => {
      showUserModal(b.dataset.user);
    }));
    tbody.querySelectorAll('.delete').forEach((b) => b.addEventListener('click', () => {
      deleteUser(b.dataset.user);
    }));
  }

  function showUserModal(username) {
    editingUser = username || null;
    document.getElementById('userModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('userForm').reset();
    document.getElementById('userModalTitle').textContent = editingUser ? 'Edit User' : 'Add User';
    if (editingUser) {
      const u = users.find((x) => x.username === editingUser);
      if (u) {
        document.getElementById('userUsername').value = u.username;
        document.getElementById('userUsername').disabled = true;
        document.getElementById('userRole').value = u.role;
        document.getElementById('userBranch').value = u.branch || 'Admin';
      }
    } else {
      document.getElementById('userUsername').disabled = false;
    }
  }
  function hideUserModal() {
    document.getElementById('userModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    editingUser = null;
  }

  function handleUserSubmit() {
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value.trim();
    const role = document.getElementById('userRole').value;
    const branch = document.getElementById('userBranch').value;
    if (!username || !role) {
      alert('Please enter username and role');
      return;
    }
    if (editingUser) {
      const idx = users.findIndex((u) => u.username === editingUser);
      if (idx !== -1) {
        users[idx].role = role;
        users[idx].branch = branch;
        if (password) users[idx].password = password;
        saveUsers();
        addActivity('update-user', { user: username });
        hideUserModal();
        renderUsers();
        return;
      }
    }
    // create new user
    if (users.find((u) => u.username === username)) {
      alert('Username already exists');
      return;
    }
    users.push({
      username,
      password: password || 'password',
      role,
      branch,
    });
    saveUsers();
    addActivity('add-user', { user: username });
    hideUserModal();
    renderUsers();
  }

  function deleteUser(username) {
    if (!confirm(`Delete user ${username}?`)) return;
    // prevent deleting the only admin
    const toDelete = users.find((u) => u.username === username);
    if (!toDelete) return;
    if (toDelete.role === 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        alert('Cannot delete the only admin');
        return;
      }
    }
    users = users.filter((u) => u.username !== username);
    saveUsers();
    addActivity('delete-user', { user: username });
    renderUsers();
  }

  function addActivity(action, data) {
    try {
      const a = JSON.parse(localStorage.getItem(ACT_KEY)) || [];
      a.unshift({
        id: Date.now().toString(),
        action,
        data,
        user: (JSON.parse(localStorage.getItem('currentUser')) || {}).username || 'System',
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(ACT_KEY, JSON.stringify(a));
    } catch (error) {
      console.warn('Failed to add user activity', error);
    }
  }

  function checkAccess() {
    const cu = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!cu || cu.role !== 'admin') {
      document.querySelector('.main-content').innerHTML = '<div style="padding:2rem"><h2>Access denied</h2><p>Only administrators can manage users.</p></div>';
    }
  }
}());
