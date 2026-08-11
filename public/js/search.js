/**
 * LIFE LINK - Donor Search & Matching JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('donorGrid')) {
    fetchAndRenderDonors();
    setupSearchFilterListeners();
  }
});

async function fetchAndRenderDonors() {
  const grid = document.getElementById('donorGrid');
  if (!grid) return;

  grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
    <div class="brand-icon" style="margin: 0 auto 1rem;">🩸</div>
    Searching available donors...
  </div>`;

  const bloodGroup = document.getElementById('filterBloodGroup')?.value || 'All';
  const city = document.getElementById('filterCity')?.value || '';
  const availableOnly = document.getElementById('filterAvailableOnly')?.checked ? 'true' : 'false';
  const search = document.getElementById('filterSearchInput')?.value || '';

  let query = `?bloodGroup=${encodeURIComponent(bloodGroup)}&city=${encodeURIComponent(city)}&availableOnly=${availableOnly}&search=${encodeURIComponent(search)}`;

  const res = await fetchAPI(`/api/donors${query}`);

  if (res.ok && res.data.success) {
    renderDonorCards(res.data.donors);
    updateDonorCountHeader(res.data.count);
  } else {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #ef4444;">
      Failed to load donors list. Please try again.
    </div>`;
  }
}

function renderDonorCards(donors) {
  const grid = document.getElementById('donorGrid');
  if (!grid) return;

  if (donors.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;" class="glass-panel">
      <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔍</div>
      <h3>No Donors Found Matching Criteria</h3>
      <p style="color: var(--text-muted); margin-top: 0.5rem;">Try adjusting your blood type or location search filters.</p>
    </div>`;
    return;
  }

  grid.innerHTML = donors.map(donor => `
    <div class="donor-card glass-panel">
      <div>
        <div class="donor-header">
          <div class="blood-badge">${donor.bloodGroup}</div>
          <span class="status-tag ${donor.isAvailable ? 'available' : 'unavailable'}">
            ${donor.isAvailable ? 'Available Now' : 'Donated Recently'}
          </span>
        </div>

        <h3 class="donor-name">${donor.name}</h3>
        <div class="donor-detail">
          📍 <span>${donor.city}${donor.address ? ', ' + donor.address : ''}</span>
        </div>
        <div class="donor-detail">
          ⭐ <span>${donor.totalDonations || 0} Successful Donations</span>
        </div>
        <div class="donor-detail">
          📅 <span>Last Donated: ${donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : 'First-time Donor'}</span>
        </div>
      </div>

      <div class="donor-actions">
        <a href="tel:${donor.phone}" class="btn btn-primary btn-sm" style="flex: 1;">
          📞 Call Donor
        </a>
        <button onclick="shareDonorWhatsapp('${donor.name}', '${donor.bloodGroup}', '${donor.city}', '${donor.phone}')" class="btn btn-outline btn-sm" title="Share via WhatsApp">
          💬 WhatsApp
        </button>
      </div>
    </div>
  `).join('');
}

function updateDonorCountHeader(count) {
  const counterEl = document.getElementById('donorCountBadge');
  if (counterEl) {
    counterEl.textContent = `${count} Registered Donors Found`;
  }
}

function setupSearchFilterListeners() {
  const inputs = ['filterBloodGroup', 'filterCity', 'filterAvailableOnly', 'filterSearchInput'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', debounce(fetchAndRenderDonors, 300));
      el.addEventListener('change', fetchAndRenderDonors);
    }
  });
}

function shareDonorWhatsapp(name, bloodGroup, city, phone) {
  const text = `*LIFE LINK Blood Donor Alert*%0A%0A*Name:* ${name}%0A*Blood Group:* ${bloodGroup}%0A*Location:* ${city}%0A*Contact:* ${phone}%0A%0AFound via LIFE LINK Donor Management System.`;
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

// Utility debounce
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
