/**
 * LIFE LINK – HealthTech API Client Wrapper
 */

const API = {
  getToken() {
    return localStorage.getItem('lifelink_token');
  },

  getUser() {
    return JSON.parse(localStorage.getItem('lifelink_user') || 'null');
  },

  setSession(token, user) {
    localStorage.setItem('lifelink_token', token);
    localStorage.setItem('lifelink_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('lifelink_token');
    localStorage.removeItem('lifelink_user');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, { ...options, headers });
      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      console.error('[API Error]', error);
      return { ok: false, status: 500, data: { success: false, message: 'Server communication error' } };
    }
  }
};

// Global Toast Notification Helper
function showToast(message, type = 'info') {
  let stack = document.getElementById('toastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toastStack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> <div>${message}</div>`;

  stack.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Navbar authentication session renderer
function initNavbarAuth() {
  const container = document.getElementById('navAuthContainer');
  if (!container) return;

  const user = API.getUser();
  const token = API.getToken();

  if (token && user) {
    const roleDashboardUrl = {
      'Donor': 'donor-dashboard.html',
      'Requester': 'requester-dashboard.html',
      'BloodBank': 'blood-bank-dashboard.html',
      'Admin': 'admin-dashboard.html'
    }[user.role] || 'donor-dashboard.html';

    container.innerHTML = `
      <a href="${roleDashboardUrl}" class="btn btn-secondary btn-sm">
        Dashboard (${user.role})
      </a>
      <button onclick="handleLogout()" class="btn btn-outline btn-sm">Sign Out</button>
    `;
  } else {
    container.innerHTML = `
      <a href="login.html" class="btn btn-secondary btn-sm">Sign In</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }
}

function handleLogout() {
  API.clearSession();
  showToast('Signed out successfully', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 400);
}

document.addEventListener('DOMContentLoaded', initNavbarAuth);
