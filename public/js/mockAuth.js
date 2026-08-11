/**
 * LIFE LINK – Mock Authentication & Role-Specific Navigation Renderer
 */

const MockAuth = {
  getCurrentUser() {
    const data = localStorage.getItem('lifelink_current_user');
    if (data) return JSON.parse(data);
    
    // Default mock user if none set: Arun Kumar (Donor)
    const defaultDonor = {
      id: 'donor_demo_1',
      name: 'Arun Kumar',
      email: 'arun.kumar@example.com',
      phone: '+91 98765 43210',
      role: 'Donor',
      bloodGroup: 'O+',
      city: 'Mumbai',
      isAvailable: true,
      totalDonations: 4,
      livesHelped: 12,
      status: 'VERIFIED'
    };
    this.setCurrentUser(defaultDonor);
    return defaultDonor;
  },

  setCurrentUser(user) {
    localStorage.setItem('lifelink_current_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('lifelink_current_user');
    window.location.href = 'login.html';
  },

  // Role-Specific Navigation Renderer
  renderRoleNavigation(activePage = 'home') {
    const menu = document.getElementById('roleNavMenu');
    const authArea = document.getElementById('navAuthArea');
    const user = this.getCurrentUser();

    if (!user) return;

    if (menu) {
      if (user.role === 'Donor') {
        // DONOR NAVIGATION ONLY (No admin or general donor directory links)
        menu.innerHTML = `
          <li><a href="donor-dashboard.html" class="nav-item ${activePage === 'home' ? 'active' : ''}">Home</a></li>
          <li><a href="emergency-requests.html" class="nav-item ${activePage === 'requests' ? 'active' : ''}">My Requests</a></li>
          <li><a href="#impactSection" onclick="scrollToImpact()" class="nav-item">My Donations</a></li>
          <li><a href="javascript:void(0)" onclick="toggleNotificationDrawer()" class="nav-item">Notifications</a></li>
          <li><a href="donor-profile.html" class="nav-item ${activePage === 'profile' ? 'active' : ''}">Profile</a></li>
        `;
      } else if (user.role === 'Organization' || user.role === 'BloodBank') {
        // ORGANIZATION NAVIGATION
        menu.innerHTML = `
          <li><a href="requester-dashboard.html" class="nav-item ${activePage === 'home' ? 'active' : ''}">Dashboard</a></li>
          <li><a href="emergency-requests.html" class="nav-item ${activePage === 'requests' ? 'active' : ''}">Active Requests</a></li>
          <li><a href="blood-banks.html" class="nav-item">Blood Stock</a></li>
          <li><a href="javascript:void(0)" onclick="toggleNotificationDrawer()" class="nav-item">Notifications</a></li>
        `;
      } else if (user.role === 'Admin') {
        // ADMIN NAVIGATION
        menu.innerHTML = `
          <li><a href="admin-dashboard.html" class="nav-item ${activePage === 'home' ? 'active' : ''}">Overview</a></li>
          <li><a href="find-donors.html" class="nav-item">Donors Directory</a></li>
          <li><a href="emergency-requests.html" class="nav-item">All Requests</a></li>
          <li><a href="blood-banks.html" class="nav-item">Blood Stock</a></li>
        </ul>
        `;
      }
    }

    if (authArea) {
      const unreadCount = MockData.notifications.filter(n => n.isUnread).length;
      authArea.innerHTML = `
        <button onclick="toggleNotificationDrawer()" class="btn btn-secondary btn-sm" style="position: relative;">
          🔔
          ${unreadCount > 0 ? `<span class="badge badge-critical" style="position: absolute; top: -6px; right: -6px; padding: 0.15rem 0.4rem; font-size: 0.7rem;">${unreadCount}</span>` : ''}
        </button>

        <a href="${user.role === 'Donor' ? 'donor-profile.html' : 'donor-dashboard.html'}" class="btn btn-secondary btn-sm">
          👤 ${user.name.split(' ')[0]}
        </a>

        <button onclick="MockAuth.logout()" class="btn btn-outline btn-sm" title="Sign Out">Sign Out</button>
      `;
    }
  },

  quickDemoLogin(role) {
    const presets = {
      'Donor': {
        id: 'donor_demo_1',
        name: 'Arun Kumar',
        email: 'arun.kumar@example.com',
        phone: '+91 98765 43210',
        role: 'Donor',
        bloodGroup: 'O+',
        city: 'Mumbai',
        isAvailable: true,
        totalDonations: 4,
        livesHelped: 12,
        status: 'VERIFIED'
      },
      'Organization': {
        id: 'org_demo_1',
        name: 'XYZ Government Hospital',
        email: 'contact@xyzhospital.gov.in',
        phone: '+91 22 2493 1111',
        role: 'Organization',
        orgType: 'GovtHospital',
        certificationNumber: 'GOVT-HOSP-2026-991',
        representativeName: 'Dr. S. K. Mehta',
        city: 'Mumbai',
        status: 'VERIFIED'
      },
      'Admin': {
        id: 'admin_demo_1',
        name: 'System Administrator',
        email: 'admin@lifelink.org',
        phone: '+91 90000 11111',
        role: 'Admin',
        status: 'VERIFIED'
      }
    };

    const user = presets[role] || presets['Donor'];
    this.setCurrentUser(user);
    return user;
  }
};
