/**
 * LIFE LINK - Main Global JavaScript Logic
 */

// Global State
const state = {
  token: localStorage.getItem('lifelink_token') || null,
  user: JSON.parse(localStorage.getItem('lifelink_user') || 'null'),
  theme: localStorage.getItem('lifelink_theme') || 'dark'
};

// Initialize Theme
document.documentElement.setAttribute('data-theme', state.theme);

// DOM Ready Handler
document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  updateNavbarAuthStatus();
});

// Theme Switcher
function setupThemeToggle() {
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('lifelink_theme', state.theme);
      btn.innerHTML = state.theme === 'dark' ? '🌙' : '☀️';
    });
  });
}

// Update Navbar based on logged in user
function updateNavbarAuthStatus() {
  const authContainer = document.getElementById('navAuthContainer');
  if (!authContainer) return;

  if (state.token && state.user) {
    authContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <a href="dashboard.html" class="btn btn-secondary btn-sm">
          👤 ${state.user.name.split(' ')[0]} (${state.user.bloodGroup})
        </a>
        <button onclick="handleLogout()" class="btn btn-outline btn-sm">Logout</button>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button onclick="openAuthModal('login')" class="btn btn-outline btn-sm">Login</button>
      <button onclick="openAuthModal('register')" class="btn btn-primary btn-sm">Register</button>
    `;
  }
}

// Global Toast Notification Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global Logout Handler
function handleLogout() {
  localStorage.removeItem('lifelink_token');
  localStorage.removeItem('lifelink_user');
  state.token = null;
  state.user = null;
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 500);
}

// API Fetch Helper wrapper with Auth Header
async function fetchAPI(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    console.error('API Fetch Error:', err);
    return { ok: false, status: 500, data: { success: false, message: 'Network connection failed' } };
  }
}
