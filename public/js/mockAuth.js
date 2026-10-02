/**
 * LIFE LINK – Role-Based Authentication & Portal Access System
 * Handles strict RBAC, Donor Mobile+OTP Login, Organization Credentials,
 * Admin Authentication, Password Reset Requests, Audit Events & Route Guarding.
 */

const MockAuth = {
  // Get currently authenticated session
  getCurrentUser() {
    try {
      const data = localStorage.getItem('lifelink_session') || localStorage.getItem('lifelink_current_user');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading session data:', e);
    }
    return null;
  },

  // Save session state
  setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem('lifelink_session');
      localStorage.removeItem('lifelink_current_user');
      return;
    }
    const sessionData = {
      ...user,
      loginTimestamp: new Date().toISOString()
    };
    localStorage.setItem('lifelink_session', JSON.stringify(sessionData));
    localStorage.setItem('lifelink_current_user', JSON.stringify(sessionData));
  },

  // Sign out user & clear session
  logout() {
    const user = this.getCurrentUser();
    if (user && typeof MockData !== 'undefined' && typeof MockData.logAudit === 'function') {
      MockData.logAudit('User Logged Out', user.name || user.username || 'User', 'LOGOUT', `User signed out from ${user.role} Portal`, user.username || user.phone || 'User');
    }
    localStorage.removeItem('lifelink_session');
    localStorage.removeItem('lifelink_current_user');
    window.location.href = 'login.html';
  },

  // 1. DONOR AUTHENTICATION (MOBILE + OTP)
  loginDonor(mobileInput, otpInput = '123456') {
    const cleanMobile = (mobileInput || '').trim();
    
    const donorUser = {
      id: 'LL-D1024',
      name: 'Arun Kumar',
      role: 'Donor',
      phone: cleanMobile || '+91 98765 43210',
      bloodGroup: 'O+',
      city: 'Hosur',
      status: 'ACTIVE',
      accountStatus: 'ACTIVE',
      portalAccess: 'ACTIVE',
      totalDonations: 4,
      livesHelped: 12
    };

    this.setCurrentUser(donorUser);

    if (typeof MockData !== 'undefined' && typeof MockData.logAudit === 'function') {
      MockData.logAudit('Donor OTP Verified', 'Donor Mobile Auth', 'DONOR_OTP_VERIFIED', `Donor logged in via mobile OTP verification (${cleanMobile})`, cleanMobile);
    }

    return { success: true, user: donorUser, redirectUrl: 'donor-dashboard.html' };
  },

  // 2. ORGANIZATION AUTHENTICATION (USERNAME + PASSWORD)
  loginOrganization(username, password) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter both organization username and password.' };
    }

    // Default pre-seeded organizations list
    const defaultOrgs = [
      {
        id: 'LL-GH-2026-001',
        name: 'Government General Hospital',
        type: 'Government Hospital',
        location: 'Hosur, Tamil Nadu',
        username: 'govgeneralhosur',
        password: 'Hospital@123',
        registeredMobile: '+91 98430 12345',
        status: 'VERIFIED',
        portalAccess: 'ACTIVE'
      },
      {
        id: 'LL-ORG-2026-002',
        name: 'City Blood Bank',
        type: 'Private Blood Bank',
        location: 'Bengaluru, Karnataka',
        username: 'citybloodbank',
        password: 'BloodBank@123',
        registeredMobile: '+91 98800 55443',
        status: 'VERIFIED',
        portalAccess: 'ACTIVE'
      },
      {
        id: 'LL-ORG-2026-003',
        name: 'Emergency Care Centre',
        type: 'Authorized Healthcare Organization',
        location: 'Chennai, Tamil Nadu',
        username: 'emergencycare',
        password: 'Care@123',
        registeredMobile: '+91 94440 99887',
        status: 'PENDING VERIFICATION',
        portalAccess: 'LOCKED'
      },
      {
        id: 'LL-ORG-2026-004',
        name: 'District Blood Bank',
        type: 'Government Blood Bank',
        location: 'Krishnagiri, Tamil Nadu',
        username: 'districtbloodbank',
        password: 'District@123',
        registeredMobile: '+91 94432 11000',
        status: 'VERIFIED',
        portalAccess: 'ACTIVE'
      },
      {
        id: 'LL-ORG-2026-005',
        name: 'Salem Regional Blood Bank',
        type: 'Private Blood Bank',
        location: 'Salem, Tamil Nadu',
        username: 'salembloodbank',
        password: 'Salem@123',
        registeredMobile: '+91 98427 88990',
        status: 'SUSPENDED',
        portalAccess: 'LOCKED'
      }
    ];

    let mockDataOrgs = [];
    if (typeof MockData !== 'undefined' && Array.isArray(MockData.organizations)) {
      mockDataOrgs = MockData.organizations;
    } else if (typeof window !== 'undefined' && window.MockData && Array.isArray(window.MockData.organizations)) {
      mockDataOrgs = window.MockData.organizations;
    }

    let localOrgs = [];
    try {
      localOrgs = JSON.parse(localStorage.getItem('lifelink_organizations') || '[]');
    } catch(e) {}

    const allOrgs = [...mockDataOrgs, ...defaultOrgs, ...localOrgs];

    const org = allOrgs.find(o => 
      (o.username && o.username.toLowerCase() === cleanUser) || 
      (o.id && o.id.toLowerCase() === cleanUser) ||
      (o.name && o.name.toLowerCase().includes(cleanUser))
    );

    if (!org) {
      // Fallback for demo org credentials
      const fallbackOrg = {
        id: 'LL-GH-2026-001',
        name: 'Government General Hospital',
        username: cleanUser,
        password: cleanPass,
        status: 'VERIFIED',
        portalAccess: 'ACTIVE'
      };
      this.setCurrentUser({
        id: fallbackOrg.id,
        name: fallbackOrg.name,
        username: cleanUser,
        role: 'Organization',
        orgType: 'Government Hospital',
        city: 'Hosur, Tamil Nadu',
        phone: '+91 4344 220000',
        email: 'dispatch@ggh-hosur.tn.gov.in',
        status: 'VERIFIED',
        accountStatus: 'VERIFIED',
        portalAccess: 'ACTIVE'
      });
      return { success: true, user: fallbackOrg, redirectUrl: 'org-dashboard.html' };
    }

    // Account Status & Portal Access Checks
    if (org.status === 'PENDING VERIFICATION' || org.portalAccess === 'LOCKED') {
      return { 
        success: false, 
        message: 'Portal Access Locked: Your organization account is PENDING VERIFICATION by LIFE LINK administration.' 
      };
    }

    if (org.status === 'SUSPENDED' || org.status === 'DISABLED') {
      return { 
        success: false, 
        message: 'Account Suspended: This organization portal account has been suspended or disabled by administration.' 
      };
    }

    const orgUser = {
      id: org.id,
      name: org.name,
      username: org.username || cleanUser,
      role: 'Organization',
      orgType: org.type || 'Government Hospital',
      city: org.city || org.location || 'Hosur, Tamil Nadu',
      phone: org.phone || '+91 4344 220000',
      email: org.email || 'dispatch@ggh-hosur.tn.gov.in',
      status: org.status || 'VERIFIED',
      accountStatus: org.status || 'VERIFIED',
      portalAccess: org.portalAccess || 'ACTIVE'
    };

    this.setCurrentUser(orgUser);

    if (typeof MockData !== 'undefined' && typeof MockData.logAudit === 'function') {
      MockData.logAudit('Organization Login', org.name, 'ORGANIZATION_LOGIN', `Organization signed into portal (${org.username || cleanUser})`, org.username || cleanUser);
    }

    return { success: true, user: orgUser, redirectUrl: 'org-dashboard.html' };
  },

  // 3. ADMIN AUTHENTICATION (USERNAME + PASSWORD)
  loginAdmin(username, password) {
    const cleanUser = (username || '').trim().toLowerCase();
    
    const adminUser = {
      id: 'admin_sys_01',
      name: 'System Administrator',
      username: cleanUser || 'admin',
      email: 'admin@lifelink.org',
      role: 'Admin',
      status: 'ACTIVE',
      accountStatus: 'ACTIVE',
      portalAccess: 'ACTIVE'
    };

    this.setCurrentUser(adminUser);

    if (typeof MockData !== 'undefined' && typeof MockData.logAudit === 'function') {
      MockData.logAudit('Admin Portal Login', 'System Admin', 'ADMIN_LOGIN', 'Administrator authenticated successfully', 'admin');
    }

    return { success: true, user: adminUser, redirectUrl: 'admin-dashboard.html' };
  },

  // 4. ORGANIZATION PASSWORD RESET REQUEST
  requestOrganizationPasswordReset(username, registeredMobile, reason) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanMobile = (registeredMobile || '').trim();
    const cleanReason = (reason || '').trim() || 'Forgotten organization portal password';

    if (!cleanUser || !cleanMobile) {
      return { success: false, message: 'Please provide both Organization Username and Registered Mobile Number.' };
    }

    const newRequest = {
      id: 'PRR-' + Math.floor(1000 + Math.random() * 9000),
      orgId: 'LL-GH-2026-001',
      orgName: cleanUser,
      username: cleanUser,
      registeredMobile: cleanMobile,
      reason: cleanReason,
      submittedTime: new Date().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'PENDING'
    };

    try {
      const existingRequests = JSON.parse(localStorage.getItem('lifelink_reset_requests') || '[]');
      existingRequests.unshift(newRequest);
      localStorage.setItem('lifelink_reset_requests', JSON.stringify(existingRequests));
    } catch(e) {}

    if (typeof MockData !== 'undefined') {
      if (!Array.isArray(MockData.passwordResetRequests)) MockData.passwordResetRequests = [];
      MockData.passwordResetRequests.unshift(newRequest);
      if (typeof MockData.logAudit === 'function') {
        MockData.logAudit('Password Reset Requested', cleanUser, 'ORGANIZATION_PASSWORD_RESET_REQUESTED', `Password reset request submitted by organization (${cleanUser}). Reason: ${cleanReason}`, cleanUser);
      }
    }

    return { 
      success: true, 
      request: newRequest,
      message: 'Password Reset Request Submitted. Your request has been sent to the LIFE LINK administrator. Portal access will be restored after administrator verification.' 
    };
  },

  // 5. ADMIN RESETS ORGANIZATION PASSWORD
  resetOrganizationPasswordByAdmin(orgId, newTempPassword) {
    let orgs = (typeof MockData !== 'undefined' && Array.isArray(MockData.organizations)) ? MockData.organizations : [];
    let targetOrg = orgs.find(o => o.id === orgId || o.username === orgId);

    if (!targetOrg) {
      targetOrg = {
        id: orgId || 'LL-GH-2026-001',
        name: 'Government General Hospital',
        username: 'govgeneralhosur'
      };
    }

    targetOrg.password = newTempPassword;
    targetOrg.status = 'VERIFIED';
    targetOrg.portalAccess = 'ACTIVE';
    targetOrg.lastUpdated = new Date().toLocaleString();

    try {
      let requests = JSON.parse(localStorage.getItem('lifelink_reset_requests') || '[]');
      requests = requests.map(r => (r.orgId === targetOrg.id || r.username === targetOrg.username) ? { ...r, status: 'RESOLVED' } : r);
      localStorage.setItem('lifelink_reset_requests', JSON.stringify(requests));
    } catch(e) {}

    if (typeof MockData !== 'undefined') {
      if (Array.isArray(MockData.passwordResetRequests)) {
        MockData.passwordResetRequests = MockData.passwordResetRequests.map(r => (r.orgId === targetOrg.id || r.username === targetOrg.username) ? { ...r, status: 'RESOLVED' } : r);
      }
      if (typeof MockData.logAudit === 'function') {
        MockData.logAudit('Organization Password Reset', targetOrg.name, 'ORGANIZATION_PASSWORD_RESET_BY_ADMIN', `Temporary password generated for ${targetOrg.username} by Administrator`, 'System Admin');
      }
    }

    return { success: true, message: `Password reset successfully for ${targetOrg.name}. Temporary password set.` };
  },

  // 6. STRICT RBAC ROUTE GUARDING
  requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const user = this.getCurrentUser();

    if (!user) {
      if (typeof MockData !== 'undefined' && typeof MockData.logAudit === 'function') {
        MockData.logAudit('Unauthorized Access Attempt', 'Unauthenticated User', 'UNAUTHORIZED_ACCESS_ATTEMPT', `Unauthenticated user blocked from opening ${window.location.pathname}`);
      }
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}&error=unauthorized`;
      return false;
    }

    if (!roles.includes(user.role)) {
      if (typeof MockData !== 'undefined' && typeof MockData.logAudit === 'function') {
        MockData.logAudit('Access Restricted', user.name || user.role, 'UNAUTHORIZED_ACCESS_ATTEMPT', `Role [${user.role}] attempted to open route requiring [${roles.join(', ')}]`);
      }
      alert(`Access Restricted: You do not have permission to access this portal (${user.role} cannot access ${roles.join('/')} routes).`);
      window.location.href = 'login.html';
      return false;
    }

    if (user.role === 'Organization' && (user.portalAccess === 'LOCKED' || user.status === 'PENDING VERIFICATION')) {
      alert('Access Restricted: Organization portal access is locked pending administrator verification.');
      window.location.href = 'login.html';
      return false;
    }

    return true;
  },

  // Quick Demo Compatibility Wrapper
  quickDemoLogin(role) {
    if (role === 'Donor') return this.loginDonor('9876543210', '123456');
    if (role === 'Organization') return this.loginOrganization('govgeneralhosur', 'Hospital@123');
    if (role === 'Admin') return this.loginAdmin('admin', 'admin123');
    return this.loginDonor('9876543210', '123456');
  },

  // Role Navigation Renderer & Helper
  renderRoleNavigation(activePage = 'home') {
    // Safely sync navigation state if elements are present on page
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

// Explicitly attach to window object
if (typeof window !== 'undefined') {
  window.MockAuth = MockAuth;
}
