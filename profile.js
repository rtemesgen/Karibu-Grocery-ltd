// Lightweight profile sync script: shows logged-in user role and username on any page
(function profileBootstrap() {
  function refreshProfileUI() {
    try {
      const cuRaw = localStorage.getItem('currentUser');
      const cu = cuRaw ? JSON.parse(cuRaw) : null;
      const roleEl = document.getElementById('profileRole');
      const nameEl = document.getElementById('profileName');
      const loginBtn = document.getElementById('loginBtn');
      if (roleEl) roleEl.textContent = cu ? (cu.role || '').toUpperCase() : 'Guest';
      if (nameEl) nameEl.textContent = cu ? cu.username : 'Not logged in';
      if (loginBtn) {
        loginBtn.innerHTML = cu
          ? '<i class="fas fa-sign-out-alt"></i>'
          : '<i class="fas fa-sign-in-alt"></i>';
      }
    } catch (error) {
      console.warn('Profile UI refresh failed', error);
    }
  }

  // Global logout handler used by buttons across pages
  window.handleGlobalLogout = function handleGlobalLogout(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      localStorage.removeItem('currentUser');
    } catch (error) {
      console.warn('Failed to clear current user', error);
    }
    // Redirect to main login page
    window.location.href = 'index.html';
  };

  // Attach click handlers to sidebar logout buttons so they clear currentUser first
  document.addEventListener('DOMContentLoaded', () => {
    refreshProfileUI();
    document.querySelectorAll('.sidebar-logout').forEach((btn) => {
      btn.addEventListener(
        'click',
        (e) => {
          // If someone is logged in, clear and redirect
          const cuRaw = localStorage.getItem('currentUser');
          const cu = cuRaw ? JSON.parse(cuRaw) : null;
          if (cu) {
            e.preventDefault();
            window.handleGlobalLogout(e);
          } else {
            // not logged in - just go to login page
            e.preventDefault();
            window.location.href = 'index.html';
          }
        },
        { passive: false },
      );
    });
  });
}());
