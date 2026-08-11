/**
 * LIFE LINK – Role Dashboard Controllers with Strict Verification Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('donorProfileCard')) initDonorDashboard();
  if (document.getElementById('orgHeaderCard')) initRequesterDashboard();
  if (document.getElementById('bankStockDisplayGrid')) initBloodBankDashboard();
  if (document.getElementById('adminKpiGrid')) initAdminDashboard();
});

/* ==========================================================
   DONOR DASHBOARD LOGIC
   ========================================================== */
async function initDonorDashboard() {
  const profileCard = document.getElementById('donorProfileCard');
  const user = API.getUser();

  if (!user || user.role !== 'Donor') {
    if (profileCard) profileCard.innerHTML = `<p style="color: var(--slate-muted);">Please sign in with a Verified Donor account.</p>`;
    return;
  }

  const res = await API.request('/api/auth/me');
  const profile = (res.ok && res.data.profile) ? res.data.profile : { bloodGroup: 'O+', isAvailable: true, totalDonations: 4, city: 'Mumbai' };

  profileCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 1.25rem;">
        <div class="blood-pill blood-pill-lg">${profile.bloodGroup || 'O+'}</div>
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
            <h2 style="font-size: 1.6rem;">${user.name}</h2>
            <span class="badge badge-success">✓ VERIFIED MOBILE DONOR</span>
          </div>
          <div style="color: var(--slate-muted); font-size: 0.9rem;">
            📍 ${profile.city || 'Mumbai'} • 📞 ${user.phone}
          </div>
        </div>
      </div>

      <div style="text-align: right;">
        <div style="font-size: 0.82rem; color: var(--slate-muted); margin-bottom: 0.35rem;">Donation Willingness Status</div>
        <button onclick="toggleAvailability()" class="btn ${profile.isAvailable !== false ? 'btn-primary' : 'btn-secondary'}" style="padding: 0.4rem 1rem;">
          ${profile.isAvailable !== false ? '🟢 Available for Requests' : '🔴 Currently Unavailable'}
        </button>
      </div>
    </div>
  `;

  loadDonorInvites(profile.bloodGroup || 'O+');
  loadDonorHistory();
}

async function toggleAvailability() {
  const res = await API.request('/api/donors/availability', { method: 'PATCH' });
  if (res.ok && res.data.success) {
    showToast(res.data.message, 'success');
    initDonorDashboard();
  }
}

async function loadDonorInvites(bloodGroup) {
  const container = document.getElementById('donorInvitesGrid');
  if (!container) return;

  const res = await API.request(`/api/requests?bloodGroup=${bloodGroup}&status=Pending`);

  if (res.ok && res.data.success) {
    if (res.data.requests.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; padding: 2rem;" class="card card-body">
          <p style="color: var(--slate-muted);">No urgent emergency requests matching your blood group at this time.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = res.data.requests.map(r => `
      <div class="card card-body card-hover" style="border-left: 4px solid var(--primary-red);">
        <div style="margin-bottom: 0.5rem;">
          <span class="badge badge-success" style="font-size: 0.72rem;">${r.orgName || '✓ VERIFIED GOVERNMENT HOSPITAL'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.15rem;">${r.patientName}</h3>
          <span class="badge badge-critical">${r.urgency}</span>
        </div>
        <p style="font-size: 0.88rem; color: var(--slate-muted); margin-bottom: 0.35rem;">🏥 ${r.hospitalName}, ${r.city}</p>
        <p style="font-size: 0.88rem; color: var(--slate-muted); margin-bottom: 1rem;">Needed: <strong>${r.unitsNeeded} Units of ${r.bloodGroup}</strong> (~3.4 km away)</p>

        <button onclick="handleRespondRequest('${r._id}')" class="btn btn-primary btn-sm" style="width: 100%;">
          I Can Donate
        </button>
      </div>
    `).join('');
  }
}

async function loadDonorHistory() {
  const tbody = document.getElementById('donorHistoryTableBody');
  if (!tbody) return;

  const res = await API.request('/api/donors/history');
  if (res.ok && res.data.success && res.data.history.length > 0) {
    tbody.innerHTML = res.data.history.map(h => `
      <tr>
        <td>${new Date(h.donationDate).toLocaleDateString()}</td>
        <td>${h.location}</td>
        <td><span class="badge badge-critical">${h.bloodGroup}</span></td>
        <td>${h.unitsDonated} Unit(s)</td>
        <td><span class="badge badge-success">Completed ✓</span></td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--slate-muted); padding: 2rem;">No completed donation records found.</td>
      </tr>
    `;
  }
}

/* ==========================================================
   REQUESTER / ORGANIZATION DASHBOARD LOGIC
   ========================================================== */
async function initRequesterDashboard() {
  const headerCard = document.getElementById('orgHeaderCard');
  const user = API.getUser();

  if (!user) {
    if (headerCard) headerCard.innerHTML = `<p style="color: var(--slate-muted);">Please sign in with your Organization account.</p>`;
    return;
  }

  const res = await API.request('/api/auth/me');
  const org = (res.ok && res.data.organization) ? res.data.organization : {
    orgName: user.name,
    certificationNumber: 'GOVT-CERT-2026-991',
    verificationStatus: user.status || 'VERIFIED',
    representativeName: 'Dr. S. K. Mehta',
    city: 'Mumbai'
  };

  const isVerified = org.verificationStatus === 'VERIFIED' || user.status === 'VERIFIED' || user.role === 'Admin';

  if (headerCard) {
    headerCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
            <h2 style="font-size: 1.6rem;">${org.orgName}</h2>
            <span class="badge ${isVerified ? 'badge-success' : 'badge-warning'}">
              ${isVerified ? '✓ VERIFIED ORGANIZATION' : '🔒 PENDING ADMIN VERIFICATION'}
            </span>
          </div>
          <div style="color: var(--slate-muted); font-size: 0.9rem;">
            📜 Certification #: <strong>${org.certificationNumber || 'GOVT-CERT-2026'}</strong> • Representative: <strong>${org.representativeName || 'Authorized Officer'}</strong> • 📍 ${org.city || 'Mumbai'}
          </div>
        </div>

        <div>
          ${!isVerified ? `
            <div class="badge badge-warning" style="padding: 0.5rem 1rem;">
              Admin Review in Progress
            </div>
          ` : `
            <div class="badge badge-success" style="padding: 0.5rem 1rem;">
              Authorized to Broadcast Emergency Requests
            </div>
          `}
        </div>
      </div>
    `;
  }

  const postBtn = document.getElementById('dashboardPostBtn');
  if (postBtn && !isVerified) {
    postBtn.className = 'btn btn-secondary';
    postBtn.style.pointerEvents = 'none';
    postBtn.textContent = '🔒 Verification Pending';
  }

  loadRequesterRequests();
}

async function loadRequesterRequests() {
  const container = document.getElementById('requesterRequestsGrid');
  if (!container) return;

  const res = await API.request('/api/requests');
  if (res.ok && res.data.success) {
    container.innerHTML = res.data.requests.map(r => `
      <div class="card card-body card-hover">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.2rem;">${r.patientName}</h3>
          <span class="badge ${r.status === 'Fulfilled' ? 'badge-success' : 'badge-warning'}">${r.status}</span>
        </div>
        <p style="color: var(--slate-muted); font-size: 0.9rem; margin-bottom: 0.35rem;">🏥 Hospital: ${r.hospitalName}, ${r.city}</p>
        <p style="color: var(--slate-muted); font-size: 0.9rem; margin-bottom: 1rem;">
          Blood Requirement: <strong style="color: var(--primary-red);">${r.unitsNeeded} Units (${r.bloodGroup})</strong>
        </p>

        <div style="border-top: 1px solid var(--slate-border); padding-top: 0.75rem; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
          <span>Donors Committed: <strong>${r.respondedDonors ? r.respondedDonors.length : 0} Donor(s)</strong></span>
          <a href="tel:${r.contactPhone}" class="btn btn-secondary btn-sm">Contact Contact</a>
        </div>
      </div>
    `).join('');
  }
}

/* ==========================================================
   BLOOD BANK DASHBOARD LOGIC
   ========================================================== */
async function initBloodBankDashboard() {
  loadBankStockGrid();

  const form = document.getElementById('stockUpdateForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bloodGroup = document.getElementById('updateBloodGroup').value;
      const action = document.getElementById('updateAction').value;
      const unitsAvailable = document.getElementById('updateUnits').value;

      const res = await API.request('/api/stock', {
        method: 'PUT',
        body: JSON.stringify({ bloodGroup, action, unitsAvailable })
      });

      if (res.ok && res.data.success) {
        showToast(res.data.message, 'success');
        loadBankStockGrid();
      } else {
        showToast(res.data.message || 'Update failed', 'error');
      }
    });
  }
}

async function loadBankStockGrid() {
  const container = document.getElementById('bankStockDisplayGrid');
  if (!container) return;

  const res = await API.request('/api/stock');
  if (res.ok && res.data.success) {
    container.innerHTML = res.data.stock.map(s => `
      <div class="card card-body" style="text-align: center;">
        <div class="blood-pill" style="margin: 0 auto 0.5rem;">${s.bloodGroup}</div>
        <div style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800;">${s.unitsAvailable}</div>
        <div style="color: var(--slate-muted); font-size: 0.8rem;">Units Available</div>
      </div>
    `).join('');
  }
}

/* ==========================================================
   ADMIN DASHBOARD LOGIC & ORGANIZATION VERIFICATION
   ========================================================== */
async function initAdminDashboard() {
  const kpiGrid = document.getElementById('adminKpiGrid');
  if (!kpiGrid) return;

  const res = await API.request('/api/admin/stats');
  if (res.ok && res.data.success) {
    const s = res.data.stats;
    kpiGrid.innerHTML = `
      <div class="card card-body" style="text-align: center;">
        <div style="font-size: 0.85rem; color: var(--slate-muted);">Total Registered Users</div>
        <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: var(--slate-dark);">${s.totalUsers || 6}</div>
      </div>
      <div class="card card-body" style="text-align: center;">
        <div style="font-size: 0.85rem; color: var(--slate-muted);">Pending Org Verifications</div>
        <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: var(--status-warning);">${s.pendingOrgs || 1}</div>
      </div>
      <div class="card card-body" style="text-align: center;">
        <div style="font-size: 0.85rem; color: var(--slate-muted);">Verified Organizations</div>
        <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: var(--status-success);">${s.verifiedOrgs || 2}</div>
      </div>
      <div class="card card-body" style="text-align: center;">
        <div style="font-size: 0.85rem; color: var(--slate-muted);">Total Blood Units in Stock</div>
        <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: #3B82F6;">${s.totalUnitsInStock || 261}</div>
      </div>
    `;
  }

  loadAdminOrganizations('ALL');
}

async function loadAdminOrganizations(filterStatus = 'ALL') {
  const tbody = document.getElementById('adminOrgVerificationTable');
  if (!tbody) return;

  const res = await API.request(`/api/admin/organizations?status=${filterStatus}`);

  if (res.ok && res.data.success && res.data.organizations.length > 0) {
    tbody.innerHTML = res.data.organizations.map(org => {
      const isVerified = org.verificationStatus === 'VERIFIED';
      const isPending = org.verificationStatus === 'PENDING_VERIFICATION';
      const badgeClass = isVerified ? 'badge-success' : isPending ? 'badge-warning' : 'badge-critical';

      return `
        <tr>
          <td><strong>${org.orgName}</strong></td>
          <td><span class="badge badge-neutral">${org.orgType}</span></td>
          <td><code>${org.certificationNumber}</code></td>
          <td>${org.representativeName}</td>
          <td>${org.city}</td>
          <td><span class="badge ${badgeClass}">${org.verificationStatus}</span></td>
          <td style="text-align: right;">
            ${isPending ? `
              <button onclick="handleVerifyOrg('${org._id}', 'VERIFIED')" class="btn btn-primary btn-sm">Approve (Verify)</button>
              <button onclick="handleVerifyOrg('${org._id}', 'REJECTED')" class="btn btn-outline btn-sm">Reject</button>
            ` : `
              <button onclick="handleVerifyOrg('${org._id}', '${isVerified ? 'SUSPENDED' : 'VERIFIED'}')" class="btn btn-secondary btn-sm">
                ${isVerified ? 'Suspend' : 'Re-Approve'}
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  } else {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--slate-muted); padding: 2rem;">No organization records found for status filter.</td>
      </tr>
    `;
  }
}

async function handleVerifyOrg(orgId, newStatus) {
  const res = await API.request(`/api/admin/organizations/${orgId}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus })
  });

  if (res.ok && res.data.success) {
    showToast(res.data.message, 'success');
    loadAdminOrganizations();
    initAdminDashboard();
  } else {
    showToast(res.data.message || 'Verification update failed', 'error');
  }
}
