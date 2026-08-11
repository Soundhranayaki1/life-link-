/**
 * LIFE LINK - Dashboard & Analytics JavaScript
 */

let donorChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dashboardStatsRow') || document.getElementById('inventoryGrid')) {
    loadDashboardStats();
    loadBloodInventory();
    loadUserProfile();
  }
});

async function loadDashboardStats() {
  const res = await fetchAPI('/api/inventory/stats');
  if (res.ok && res.data.success) {
    const s = res.data.stats;
    updateCounter('statTotalDonors', s.totalDonors || 0);
    updateCounter('statAvailableDonors', s.availableDonors || 0);
    updateCounter('statActiveRequests', s.activeRequests || 0);
    updateCounter('statFulfilledRequests', s.fulfilledRequests || 0);
    updateCounter('statUnitsInStock', s.totalUnitsInStock || 0);

    if (document.getElementById('donorChart')) {
      renderDonorChart(s.donorBreakdown || {});
    }
  }
}

function updateCounter(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadBloodInventory() {
  const container = document.getElementById('inventoryGrid');
  if (!container) return;

  const res = await fetchAPI('/api/inventory');
  if (res.ok && res.data.success) {
    const items = res.data.inventory;

    container.innerHTML = items.map(item => `
      <div class="inventory-card glass-panel">
        <div class="inventory-bg-type">${item.bloodGroup}</div>
        <div class="inventory-count">${item.unitsAvailable}</div>
        <div class="inventory-unit-label">Units Available</div>
        ${state.user && state.user.role === 'Admin' ? `
          <button onclick="openUpdateStockModal('${item.bloodGroup}', ${item.unitsAvailable})" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem; width: 100%;">
            ✏️ Update
          </button>
        ` : ''}
      </div>
    `).join('');
  }
}

async function loadUserProfile() {
  const profileCard = document.getElementById('userProfileCard');
  if (!profileCard) return;

  if (!state.token || !state.user) {
    profileCard.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color: var(--text-muted); margin-bottom: 1rem;">Log in to access your donor profile and availability status.</p>
        <button onclick="openAuthModal('login')" class="btn btn-primary">Login Now</button>
      </div>
    `;
    return;
  }

  // Fetch updated profile
  const res = await fetchAPI('/api/auth/me');
  const user = (res.ok && res.data.success) ? res.data.user : state.user;

  profileCard.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div class="blood-badge" style="width: 60px; height: 60px; font-size: 1.5rem;">${user.bloodGroup}</div>
        <div>
          <h2 style="font-size: 1.5rem;">${user.name}</h2>
          <div style="color: var(--text-muted); font-size: 0.9rem;">${user.role} • 📍 ${user.city}</div>
        </div>
      </div>

      <div style="text-align: right;">
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Availability Status</div>
        <button onclick="toggleDonorAvailability()" class="status-tag ${user.isAvailable ? 'available' : 'unavailable'}" style="cursor: pointer; border: none; font-size: 0.85rem; padding: 0.4rem 1rem;">
          ${user.isAvailable ? '🟢 Available to Donate' : '🔴 Currently Unavailable'}
        </button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.2rem;">
      <div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Email</div>
        <div style="font-weight: 600;">${user.email}</div>
      </div>
      <div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Phone Number</div>
        <div style="font-weight: 600;">${user.phone}</div>
      </div>
      <div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Total Donations</div>
        <div style="font-weight: 700; color: var(--primary-red);">${user.totalDonations || 0} Times</div>
      </div>
      <div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Last Donation Date</div>
        <div style="font-weight: 600;">${user.lastDonationDate ? new Date(user.lastDonationDate).toLocaleDateString() : 'N/A'}</div>
      </div>
    </div>
  `;
}

async function toggleDonorAvailability() {
  const res = await fetchAPI('/api/donors/availability', { method: 'PATCH' });

  if (res.ok && res.data.success) {
    showToast(res.data.message, 'success');
    if (state.user) {
      state.user.isAvailable = res.data.isAvailable;
      localStorage.setItem('lifelink_user', JSON.stringify(state.user));
    }
    loadUserProfile();
    loadDashboardStats();
  } else {
    showToast(res.data.message || 'Failed to update status', 'error');
  }
}

function renderDonorChart(breakdown) {
  const ctx = document.getElementById('donorChart').getContext('2d');
  if (!ctx) return;

  const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const counts = groups.map(g => breakdown[g] || 0);

  if (donorChartInstance) {
    donorChartInstance.destroy();
  }

  // Create smooth dynamic Chart.js chart
  donorChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: groups,
      datasets: [{
        label: 'Registered Donors Count',
        data: counts,
        backgroundColor: [
          '#e63946', '#c1121f', '#d62828', '#f77f00',
          '#00b4d8', '#2a9d8f', '#ffb703', '#e63946'
        ],
        borderRadius: 8,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: state.theme === 'dark' ? '#94a3b8' : '#475569', font: { family: 'Outfit', weight: 'bold' } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: state.theme === 'dark' ? '#94a3b8' : '#475569', stepSize: 1 }
        }
      }
    }
  });
}
