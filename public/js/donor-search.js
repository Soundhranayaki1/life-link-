/**
 * LIFE LINK – Donor Directory & Live Search
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('donorCardsGrid')) {
    loadDonors();
    setupFilters();
  }
});

async function loadDonors() {
  const container = document.getElementById('donorCardsGrid');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--slate-muted);">
      Searching available donors...
    </div>
  `;

  const bg = document.getElementById('searchBloodGroup')?.value || 'All';
  const city = document.getElementById('searchCity')?.value || '';
  const search = document.getElementById('searchInput')?.value || '';
  const availableOnly = document.getElementById('searchAvailableOnly')?.checked ? 'true' : 'false';

  const query = `?bloodGroup=${encodeURIComponent(bg)}&city=${encodeURIComponent(city)}&search=${encodeURIComponent(search)}&availableOnly=${availableOnly}`;

  const res = await API.request(`/api/donors${query}`);

  if (res.ok && res.data.success) {
    renderDonorCards(res.data.donors);
    updateSubtitle(res.data.count);
  } else {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--status-critical); padding: 3rem;">
        Failed to load donor database. Please try again.
      </div>
    `;
  }
}

function renderDonorCards(donors) {
  const container = document.getElementById('donorCardsGrid');
  if (!container) return;

  if (donors.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;" class="card card-body">
        <h3 style="margin-bottom: 0.5rem;">No Matching Donors Found</h3>
        <p style="color: var(--slate-muted);">Try adjusting your blood type or location filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = donors.map(d => `
    <div class="card card-body card-hover" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <div class="blood-pill">${d.bloodGroup}</div>
          <span class="badge ${d.isAvailable ? 'badge-success' : 'badge-neutral'}">
            ${d.isAvailable ? 'Available Now' : 'Donated Recently'}
          </span>
        </div>

        <h3 style="font-size: 1.25rem; margin-bottom: 0.35rem;">${d.name}</h3>
        <div style="color: var(--slate-muted); font-size: 0.9rem; margin-bottom: 0.35rem;">
          📍 Location: <strong>${d.city}${d.address ? ', ' + d.address : ''}</strong>
        </div>
        <div style="color: var(--slate-muted); font-size: 0.9rem; margin-bottom: 0.35rem;">
          ⭐ Completed Donations: <strong>${d.totalDonations || 0} times</strong>
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--slate-border);">
        <a href="tel:${d.phone}" class="btn btn-primary btn-sm" style="flex: 1;">
          Call Donor (${d.phone})
        </a>
      </div>
    </div>
  `).join('');
}

function updateSubtitle(count) {
  const el = document.getElementById('donorCountSubtitle');
  if (el) {
    el.textContent = `Found ${count} registered voluntary blood donor(s)`;
  }
}

function setupFilters() {
  const ids = ['searchBloodGroup', 'searchCity', 'searchInput', 'searchAvailableOnly'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', debounce(loadDonors, 300));
      el.addEventListener('change', loadDonors);
    }
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
