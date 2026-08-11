/**
 * LIFE LINK – Blood Stock & Facility Directory
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('stockGrid')) {
    loadBloodStock();
    loadBloodBanks();
  }
});

async function loadBloodStock() {
  const container = document.getElementById('stockGrid');
  if (!container) return;

  const res = await API.request('/api/stock');

  if (res.ok && res.data.success) {
    container.innerHTML = res.data.stock.map(item => `
      <div class="card card-body" style="text-align: center;">
        <div class="blood-pill blood-pill-lg" style="margin: 0 auto 0.75rem;">${item.bloodGroup}</div>
        <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1.75rem; color: var(--slate-dark);">
          ${item.unitsAvailable}
        </div>
        <div style="color: var(--slate-muted); font-size: 0.85rem;">Available Units</div>
      </div>
    `).join('');
  }
}

async function loadBloodBanks() {
  const container = document.getElementById('banksListGrid');
  if (!container) return;

  const res = await API.request('/api/blood-banks');

  if (res.ok && res.data.success) {
    if (res.data.bloodBanks.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;" class="card card-body">
          <h3>No Verified Blood Banks Registered Yet</h3>
        </div>
      `;
      return;
    }

    container.innerHTML = res.data.bloodBanks.map(b => `
      <div class="card card-body card-hover">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.2rem;">${b.bankName}</h3>
          <span class="badge badge-success">License Verified ✓</span>
        </div>
        <div style="color: var(--slate-muted); font-size: 0.88rem; margin-bottom: 0.35rem;">
          📜 License: <strong>${b.licenseNumber}</strong>
        </div>
        <div style="color: var(--slate-muted); font-size: 0.88rem; margin-bottom: 0.35rem;">
          📍 ${b.address}, ${b.city}
        </div>
        <div style="color: var(--slate-muted); font-size: 0.88rem; margin-bottom: 1rem;">
          📞 Contact: <strong>${b.contactPhone}</strong>
        </div>

        <a href="tel:${b.contactPhone}" class="btn btn-secondary btn-sm" style="width: 100%;">
          Call Blood Bank
        </a>
      </div>
    `).join('');
  }
}
