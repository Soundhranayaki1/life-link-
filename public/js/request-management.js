/**
 * LIFE LINK – Emergency Blood Requests & Verified Organization Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('requestFeedGrid')) {
    loadRequests();
    setupRequestFilters();
    initPostRequestButton();
  }
  setupNewRequestForm();
});

function initPostRequestButton() {
  const container = document.getElementById('postRequestBtnContainer');
  if (!container) return;

  const user = API.getUser();

  if (user && (user.role === 'Organization' || user.role === 'BloodBank' || user.role === 'Admin')) {
    if (user.status === 'VERIFIED' || user.role === 'Admin') {
      container.innerHTML = `
        <button onclick="openCreateRequestModal()" class="btn btn-primary">
          📢 Broadcast Emergency Request
        </button>
      `;
    } else {
      container.innerHTML = `
        <span class="badge badge-warning" title="Your organization verification is pending admin review">
          🔒 Verification Pending (Cannot Post Yet)
        </span>
      `;
    }
  } else {
    container.innerHTML = `
      <a href="register.html" class="btn btn-secondary btn-sm" title="Only verified healthcare organizations can post requests">
        Authorized Org Login Required to Post
      </a>
    `;
  }
}

async function loadRequests() {
  const container = document.getElementById('requestFeedGrid');
  if (!container) return;

  const bg = document.getElementById('reqBloodGroup')?.value || 'All';
  const urgency = document.getElementById('reqUrgency')?.value || 'All';
  const status = document.getElementById('reqStatus')?.value || 'All';
  const city = document.getElementById('reqCity')?.value || '';

  const query = `?bloodGroup=${encodeURIComponent(bg)}&urgency=${encodeURIComponent(urgency)}&status=${encodeURIComponent(status)}&city=${encodeURIComponent(city)}`;

  const res = await API.request(`/api/requests${query}`);

  if (res.ok && res.data.success) {
    renderRequests(res.data.requests);
  } else {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--status-critical); padding: 3rem;">
        Failed to load active requests feed.
      </div>
    `;
  }
}

function renderRequests(requests) {
  const container = document.getElementById('requestFeedGrid');
  if (!container) return;

  if (requests.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;" class="card card-body">
        <h3 style="margin-bottom: 0.5rem;">No Active Blood Requests</h3>
        <p style="color: var(--slate-muted);">There are currently no active emergency requests matching your criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = requests.map(r => {
    const isCritical = r.urgency === 'Critical';
    const isFulfilled = r.status === 'Fulfilled';
    const badgeClass = isCritical ? 'badge-critical' : r.urgency === 'Urgent' ? 'badge-warning' : 'badge-neutral';
    const orgLabel = r.orgName || '✓ VERIFIED GOVERNMENT HOSPITAL';

    return `
      <div class="card card-body card-hover" style="border-left: 4px solid ${isCritical ? 'var(--status-critical)' : 'var(--primary-red)'}">
        <div style="margin-bottom: 0.75rem;">
          <span class="badge badge-success" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; margin-bottom: 0.5rem; display: inline-block;">
            ${orgLabel}
          </span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="blood-pill">${r.bloodGroup}</div>
            <div>
              <h3 style="font-size: 1.2rem;">${r.patientName}</h3>
              <div style="color: var(--slate-muted); font-size: 0.85rem;">🏥 ${r.hospitalName}, ${r.city}</div>
            </div>
          </div>

          <span class="badge ${badgeClass}">${r.urgency}</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: var(--bg-light); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.88rem;">
          <div>
            <span style="color: var(--slate-muted);">Units Needed:</span>
            <strong style="color: var(--primary-red); display: block; font-size: 1.1rem;">${r.unitsNeeded} Unit(s)</strong>
          </div>
          <div>
            <span style="color: var(--slate-muted);">Distance:</span>
            <strong style="display: block; font-size: 0.95rem; color: var(--slate-dark);">~3.4 km away</strong>
          </div>
        </div>

        ${r.additionalNotes ? `<p style="font-size: 0.88rem; color: var(--slate-muted); margin-bottom: 1rem;">ℹ️ ${r.additionalNotes}</p>` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--slate-border); padding-top: 1rem;">
          <a href="tel:${r.contactPhone}" class="btn btn-secondary btn-sm">
            Call Hospital (${r.contactPhone})
          </a>

          ${!isFulfilled ? `
            <button onclick="handleRespondRequest('${r._id}')" class="btn btn-primary btn-sm">
              I Can Donate
            </button>
          ` : `
            <span class="badge badge-success">Fulfilled ✓</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function setupRequestFilters() {
  const ids = ['reqBloodGroup', 'reqUrgency', 'reqStatus', 'reqCity'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', loadRequests);
      el.addEventListener('change', loadRequests);
    }
  });
}

function openCreateRequestModal() {
  const modal = document.getElementById('createRequestModal');
  if (modal) modal.classList.add('active');
}

function closeCreateRequestModal() {
  const modal = document.getElementById('createRequestModal');
  if (modal) modal.classList.remove('active');
}

function setupNewRequestForm() {
  const form = document.getElementById('newRequestForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      patientName: document.getElementById('formPatientName').value,
      hospitalName: document.getElementById('formHospitalName').value,
      city: document.getElementById('formCity').value,
      bloodGroup: document.getElementById('formBloodGroup').value,
      unitsNeeded: document.getElementById('formUnitsNeeded').value,
      urgency: document.getElementById('formUrgency').value,
      contactPhone: document.getElementById('formContactPhone').value,
      additionalNotes: document.getElementById('formNotes').value
    };

    const res = await API.request('/api/requests', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok && res.data.success) {
      showToast(res.data.message, 'success');
      closeCreateRequestModal();
      form.reset();
      loadRequests();
    } else {
      showToast(res.data.message || 'Only verified healthcare organizations can post blood requests.', 'error');
    }
  });
}

async function handleRespondRequest(requestId) {
  const user = API.getUser();
  if (!user || user.role !== 'Donor') {
    showToast('Only Verified Donors can respond to emergency blood requests.', 'error');
    setTimeout(() => { window.location.href = 'register.html'; }, 600);
    return;
  }

  const res = await API.request(`/api/requests/${requestId}/respond`, {
    method: 'POST'
  });

  if (res.ok && res.data.success) {
    showToast('Thank you! Your donation commitment has been sent to the verified organization.', 'success');
    loadRequests();
  } else {
    showToast(res.data.message || 'Failed to record response', 'error');
  }
}
