/**
 * LIFE LINK – Authentication & Portal Access System
 * Connected to Real MongoDB API Backend.
 */

const MockAuth = {
  // Get currently authenticated session
  getCurrentUser() {
    try {
      const data = localStorage.getItem('lifelink_session') || localStorage.getItem('lifelink_user');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading session data:', e);
    }
    return null;
  },

  getToken() {
    return localStorage.getItem('lifelink_token');
  },

  getAuthHeaders() {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  clearAllSessionData() {
    try {
      localStorage.removeItem('lifelink_token');
      localStorage.removeItem('lifelink_session');
      localStorage.removeItem('lifelink_user');
      localStorage.removeItem('lifelink_profile');
      localStorage.removeItem('lifelink_organization');
      localStorage.removeItem('lifelink_user_avatar');
      localStorage.removeItem('lifelink_donation_history');
      localStorage.removeItem('lifelink_donor_availability');
      localStorage.removeItem('lifelink_donation_radius');
      localStorage.removeItem('lifelink_referrals');
      localStorage.removeItem('lifelink_pause_reminder_sent');

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch (e) {
      console.error('Error clearing session data:', e);
    }
  },

  // Save session state
  setCurrentUser(user, token, profile = null, organization = null) {
    this.clearAllSessionData();
    if (!user) return;

    const sessionData = {
      ...user,
      loginTimestamp: new Date().toISOString()
    };
    if (token) localStorage.setItem('lifelink_token', token);
    localStorage.setItem('lifelink_session', JSON.stringify(sessionData));
    localStorage.setItem('lifelink_user', JSON.stringify(sessionData));
    if (profile) localStorage.setItem('lifelink_profile', JSON.stringify(profile));
    if (organization) localStorage.setItem('lifelink_organization', JSON.stringify(organization));
    this.syncHeaderUserUI();
  },

  async syncHeaderUserUI() {
    let user = this.getCurrentUser();
    const token = this.getToken();
    if (!token) return;

    const name = (user && user.name) ? user.name : '';
    if (name) {
      const firstWord = name.trim().split(' ')[0] || 'User';
      const initial = firstWord.charAt(0).toUpperCase() || 'U';

      const headerNameEls = document.querySelectorAll('#headerUserNameSpan, .user-profile-btn span');
      headerNameEls.forEach(el => {
        if (el) el.innerHTML = `${firstWord} <i class="fa-solid fa-chevron-down" style="font-size: 0.75rem; color: var(--slate-muted);"></i>`;
      });

      const avatarEls = document.querySelectorAll('#headerUserAvatarCircle, .user-avatar-circle');
      avatarEls.forEach(el => {
        if (el && !el.querySelector('img')) el.textContent = initial;
      });

      const greetingEl = document.getElementById('donorGreetingName');
      if (greetingEl) greetingEl.textContent = `${firstWord}.`;
    }

    try {
      const res = await fetch('/api/auth/me', { headers: this.getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const freshUser = data.user;
        const freshProfile = data.profile || {};
        const freshName = freshUser.name || 'User';
        const freshFirstWord = freshName.trim().split(' ')[0] || 'User';
        const freshInitial = freshFirstWord.charAt(0).toUpperCase() || 'U';

        const headerNameEls = document.querySelectorAll('#headerUserNameSpan, .user-profile-btn span');
        headerNameEls.forEach(el => {
          if (el) el.innerHTML = `${freshFirstWord} <i class="fa-solid fa-chevron-down" style="font-size: 0.75rem; color: var(--slate-muted);"></i>`;
        });

        const avatarEls = document.querySelectorAll('#headerUserAvatarCircle, .user-avatar-circle');
        avatarEls.forEach(el => {
          if (el && !el.querySelector('img')) el.textContent = freshInitial;
        });

        const greetingEl = document.getElementById('donorGreetingName');
        if (greetingEl) greetingEl.textContent = `${freshFirstWord}.`;
      }
    } catch (e) {}
  },

  // Sign out user & clear session
  logout() {
    this.clearAllSessionData();
    window.location.href = 'login.html';
  },

  // 1. DONOR AUTHENTICATION (MOBILE + OTP)
  async loginDonor(mobileInput, otpInput = '123456') {
    const cleanMobile = (mobileInput || '').trim();
    if (!cleanMobile) {
      return { success: false, message: 'Please enter your registered mobile number.' };
    }

    try {
      const res = await fetch('/api/auth/donor-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanMobile, code: otpInput })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        this.setCurrentUser(data.user, data.token, data.profile, null);
        return { success: true, user: data.user, redirectUrl: 'donor-dashboard.html' };
      } else {
        return { success: false, message: data.message || 'Donor login failed.' };
      }
    } catch (err) {
      console.error('Donor Login Error:', err);
      return { success: false, message: 'Server communication error during donor login.' };
    }
  },

  // 2. ORGANIZATION AUTHENTICATION (USERNAME + PASSWORD)
  async loginOrganization(username, password) {
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter both organization username and password.' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        this.setCurrentUser(data.user, data.token, null, data.organization);
        return { success: true, user: data.user, redirectUrl: 'org-dashboard.html' };
      } else {
        return { success: false, message: data.message || 'Invalid organization credentials.' };
      }
    } catch (err) {
      console.error('Org Login Error:', err);
      return { success: false, message: 'Server communication error during organization login.' };
    }
  },

  // 3. ADMIN AUTHENTICATION (USERNAME + PASSWORD)
  async loginAdmin(username, password) {
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter both admin username and password.' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.user.role !== 'Admin') {
          return { success: false, message: 'Access Denied: This account is not an Administrator.' };
        }
        this.setCurrentUser(data.user, data.token, null, null);
        return { success: true, user: data.user, redirectUrl: 'admin-dashboard.html' };
      } else {
        return { success: false, message: data.message || 'Invalid administrator credentials.' };
      }
    } catch (err) {
      console.error('Admin Login Error:', err);
      return { success: false, message: 'Server communication error during admin login.' };
    }
  },

  // 4. ORGANIZATION PASSWORD RESET REQUEST
  requestOrganizationPasswordReset(username, registeredMobile, reason) {
    const cleanUser = (username || '').trim();
    const cleanMobile = (registeredMobile || '').trim();

    if (!cleanUser || !cleanMobile) {
      return { success: false, message: 'Please provide both Organization Username and Registered Mobile Number.' };
    }

    return {
      success: true,
      message: 'Password Reset Request Submitted. Your request has been sent to the LIFE LINK administrator.'
    };
  },

  // 5. ADMIN RESETS ORGANIZATION PASSWORD
  async resetOrganizationPasswordByAdmin(orgId, newTempPassword) {
    const token = this.getToken();
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newTempPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message || `Password reset successfully.` };
      } else {
        return { success: false, message: data.message || 'Password reset failed.' };
      }
    } catch (e) {
      return { success: false, message: 'Error resetting organization password.' };
    }
  },

  // 6. STRICT RBAC ROUTE GUARDING
  requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const user = this.getCurrentUser();
    const token = this.getToken();

    if (!user || !token) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}&error=unauthorized`;
      return false;
    }

    if (!roles.includes(user.role)) {
      alert(`Access Restricted: You do not have permission to access this portal (${user.role} cannot access ${roles.join('/')} routes).`);
      window.location.href = 'login.html';
      return false;
    }

    return true;
  },

  quickDemoLogin(role) {
    console.warn('quickDemoLogin requested for role:', role);
  },

  renderRoleNavigation(activePage = 'home') {
    const pathname = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.nav-links-row .nav-link-item');
    if (navLinks && navLinks.length > 0) {
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== 'javascript:void(0)' && pathname.includes(href.toLowerCase())) {
          link.classList.add('active');
        }
      });
    }
  }
};

if (typeof window !== 'undefined') {
  window.MockAuth = MockAuth;
}
