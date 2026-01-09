// Shared sidebar navigation component
(function sidebarModule() {
  const navItems = [
    { href: 'accounts.html', label: 'Accounts' },
    { href: 'sales.html', label: 'Sales track' },
    { href: 'stock.html', label: 'Stock' },
    { href: 'invoices.html', label: 'Invoices' },
    { href: 'tasks.html', label: 'Task schedule' },
    { href: 'communication.html', label: 'communication' },
    { href: 'reports.html', label: 'Report' },
    { href: 'users.html', label: 'Users' },
    { href: 'support.html', label: 'Support' },
  ];

  function renderSidebar(activePage) {
    const currentPage = activePage || window.location.pathname.split('/').pop();

    return `
      <div class="sidebar">
        <div class="profile-section">
          <div class="profile-avatar"></div>
          <div class="profile-info">
            <h3 id="profileRole">Guest</h3>
            <p id="profileName">Not logged in</p>
          </div>
        </div>
        <nav class="sidebar-nav">
          <ul class="nav-menu">
            ${navItems
    .map(
      (item) => `
              <li class="nav-item${currentPage === item.href ? ' active' : ''}">
                <a href="${item.href}" class="nav-link">
                  <span class="nav-icon"></span>
                  <span>${item.label}</span>
                </a>
              </li>
            `,
    )
    .join('')}
          </ul>
        </nav>
      </div>
    `;
  }

  // Auto-inject sidebar if placeholder exists
  document.addEventListener('DOMContentLoaded', () => {
    const placeholder = document.getElementById('sidebar-placeholder');
    if (placeholder) {
      placeholder.outerHTML = renderSidebar();
    }
  });

  window.renderSidebar = renderSidebar;
}());
