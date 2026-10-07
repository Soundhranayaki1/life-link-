/**
 * LIFE LINK – Role Dashboard Controllers with Real API Connections & Production Empty States
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

  const authData = await API.requireAuth('Donor');
  if (!authData) return;

  const user = authData.user;
  const profile = authData.profile || { bloodGroup: 'O+', isAvailable: true, city: 'City Not Set' };

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
            📍 ${profile.city || 'Location Not Specified'} • 📞 ${user.phone}
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
          <p style="color: var(--slate-muted);">No compatible emergency blood requests are currently active in your area.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = res.data.requests.map(r => `
      <div class="card card-body card-hover" style="border-left: 4px solid var(--primary-red);">
        <div style="margin-bottom: 0.5rem;">
          <span class="badge badge-success" style="font-size: 0.72rem;">${r.orgName || '✓ VERIFIED HEALTHCARE ORGANIZATION'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.15rem;">${r.patientName}</h3>
          <span class="badge badge-critical">${r.urgency}</span>
        </div>
        <p style="font-size: 0.88rem; color: var(--slate-muted); margin-bottom: 0.35rem;">🏥 ${r.hospitalName}, ${r.city}</p>
        <p style="font-size: 0.88rem; color: var(--slate-muted); margin-bottom: 1rem;">Needed: <strong>${r.unitsNeeded} Units of ${r.bloodGroup}</strong></p>

        <button onclick="handleRespondRequest('${r._id}')" class="btn btn-primary btn-sm" style="width: 100%;">
          I Can Donate
        </button>
      </div>
    `).join('');
  }
}

async function handleRespondRequest(requestId) {
  const res = await API.request(`/api/requests/${requestId}/respond`, { method: 'POST' });
  if (res.ok && res.data.success) {
    showToast(res.data.message, 'success');
    initDonorDashboard();
  } else {
    showToast(res.data.message || 'Response failed', 'error');
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
        <td colspan="5" style="text-align: center; color: var(--slate-muted); padding: 2rem;">No prior donation history records found.</td>
      </tr>
    `;
  }
}

/* ==========================================================
   REQUESTER / ORGANIZATION DASHBOARD LOGIC
   ========================================================== */
async function initRequesterDashboard() {
  const headerCard = document.getElementById('orgHeaderCard');

  const authData = await API.requireAuth('Organization');
  if (!authData) return;

  const user = authData.user;
  const org = authData.organization || {
    orgName: user.name,
    certificationNumber: 'PENDING',
    verificationStatus: user.status || 'PENDING_VERIFICATION',
    representativeName: user.name,
    city: 'Mumbai'
  };

  const isVerified = org.verificationStatus === 'VERIFIED' || user.status === 'VERIFIED';

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
            📜 Cert #: <strong>${org.certificationNumber}</strong> • Representative: <strong>${org.representativeName}</strong> • 📍 ${org.city}
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

  const res = await API.request('/api/requests/org');
  if (res.ok && res.data.success) {
    if (res.data.requests.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; padding: 2rem;" class="card card-body">
          <p style="color: var(--slate-muted);">No emergency blood requests created yet by your organization.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = res.data.requests.map(r => {
      const target = r.targetConfirmations || r.unitsNeeded || 2;
      const responses = r.respondedDonors ? r.respondedDonors.length : 0;
      const confirmed = r.respondedDonors ? r.respondedDonors.filter(d => ['Confirmed', 'CONFIRMED', 'Arrived', 'ARRIVED', 'Completed', 'COMPLETED', 'Accepted', 'ACCEPTED'].includes(d.status)).length : 0;
      const remaining = Math.max(0, target - confirmed);
      const curRadius = r.currentRadiusKm || r.initialRadius || 3;
      const maxRad = r.maxRadius || 8;
      const nextWaveText = curRadius < maxRad ? `Round ${(r.currentWaveNumber || 1) + 1} (${curRadius}–${Math.min(maxRad, curRadius + 2)} km)` : 'Max Radius Reached (8 km)';
      const dispatchStatusText = r.dispatchStatus === 'COMPLETED' ? 'COMPLETED ✓' :
                                 r.dispatchStatus === 'MAX_RADIUS_REACHED' ? 'MAX RADIUS REACHED' :
                                 r.dispatchStatus === 'CANCELLED' ? 'CANCELLED' :
                                 r.dispatchStatus === 'FULFILLED' ? 'FULFILLED ✓' : 'DISPATCH IN PROGRESS 🟢';

      return `
        <div class="card card-body card-hover">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <h3 style="font-size: 1.2rem; margin-bottom: 0.2rem;">${r.patientName}</h3>
              <span class="badge badge-success" style="font-size: 0.72rem;">🏥 ${r.hospitalName}, ${r.city}</span>
            </div>
            <span class="badge ${r.status === 'Fulfilled' ? 'badge-success' : 'badge-warning'}">${r.status}</span>
          </div>

          <div style="background: var(--bg-light, #F8FAFC); padding: 0.85rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid var(--slate-border, #E2E8F0);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--navy-dark);">
              <span>Wave: <span style="color: var(--primary-red);">${r.dispatchWave || 'Round 1 (0–3 km)'}</span></span>
              <span class="badge ${r.dispatchStatus === 'COMPLETED' ? 'badge-success' : 'badge-neutral'}" style="font-size: 0.68rem;">${dispatchStatusText}</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; font-size: 0.78rem; text-align: center;">
              <div style="background: white; padding: 0.4rem; border-radius: 8px; border: 1px solid #E2E8F0;">
                <div style="color: var(--slate-muted); font-size: 0.68rem;">Donors Notified</div>
                <strong>${r.donorsNotifiedCount || 0}</strong>
              </div>
              <div style="background: white; padding: 0.4rem; border-radius: 8px; border: 1px solid #E2E8F0;">
                <div style="color: var(--slate-muted); font-size: 0.68rem;">Responses</div>
                <strong>${responses}</strong>
              </div>
              <div style="background: white; padding: 0.4rem; border-radius: 8px; border: 1px solid #E2E8F0;">
                <div style="color: var(--slate-muted); font-size: 0.68rem;">Confirmed</div>
                <strong style="color: #10B981;">${confirmed} / ${target}</strong>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-top: 0.5rem; color: var(--slate-muted);">
              <span>Remaining Required: <strong>${remaining}</strong></span>
              <span>Current Radius: <strong>${curRadius} km</strong></span>
              <span>Next Wave: <strong>${nextWaveText}</strong></span>
            </div>
          </div>

          <div style="border-top: 1px solid var(--slate-border); padding-top: 0.75rem; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
            <a href="tel:${r.contactPhone}" class="btn btn-secondary btn-sm">Contact Hotline (${r.contactPhone})</a>
            ${curRadius < maxRad && r.dispatchStatus === 'IN_PROGRESS' ? `
              <button onclick="handleTriggerWaveExpansion('${r._id}')" class="btn btn-primary btn-sm">
                Expand Wave Now
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

async function handleTriggerWaveExpansion(requestId) {
  const res = await API.request(`/api/requests/${requestId}/expand-wave`, { method: 'PATCH' });
  if (res.ok && res.data.success) {
    showToast(res.data.message || 'Dispatch wave expanded', 'success');
    loadRequesterRequests();
  } else {
    showToast(res.data.message || 'Expansion failed', 'error');
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

  const authData = await API.requireAuth('Admin');
  if (!authData) return;

  const res = await API.request('/api/admin/stats');
  if (res.ok && res.data.success) {
    const s = res.data.stats;
    kpiGrid.innerHTML = `
      <div class="card card-body" style="text-align: center;">
        <div style="font-size: 0.85rem; color: var(--slate-muted);">Total Registered Users</div>
        <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: var(--slate-dark);">${s.totalUsers || 0}</div>
      </div>
      <div class="card card-body" style="text-align: center;">
        <div style="font-size: 0.85rem; color: var(--slate-muted);">Pending Org Verifications</div>
        <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: var(--status-warning);">${s.pendingOrgs || 0}</div>
      </div>
      <div class="card card-body" style="text-align: center;">
        <div style="font-size: 0.85rem; color: var(--slate-muted);">Verified Organizations</div>
        <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: var(--status-success);">${s.verifiedOrgs || 0}</div>
      </div>
      <div class="card card-body" style="text-align: center;">
        <div style="font-size: 0.85rem; color: var(--slate-muted);">Total Blood Units in Stock</div>
        <div style="font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: #3B82F6;">${s.totalUnitsInStock || 0}</div>
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
        <td colspan="7" style="text-align: center; color: var(--slate-muted); padding: 2rem;">No organization records found.</td>
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
