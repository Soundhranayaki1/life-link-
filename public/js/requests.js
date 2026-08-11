/**
 * LIFE LINK - Urgent Blood Requests JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('requestsFeed')) {
    fetchAndRenderRequests();
    setupRequestFilterListeners();
  }
  renderCreateRequestModalHTML();
});

async function fetchAndRenderRequests() {
  const feed = document.getElementById('requestsFeed');
  if (!feed) return;

  feed.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
    Fetching active blood requests...
  </div>`;

  const bloodGroup = document.getElementById('reqFilterBloodGroup')?.value || 'All';
  const urgency = document.getElementById('reqFilterUrgency')?.value || 'All';
  const status = document.getElementById('reqFilterStatus')?.value || 'All';
  const city = document.getElementById('reqFilterCity')?.value || '';

  let query = `?bloodGroup=${encodeURIComponent(bloodGroup)}&urgency=${encodeURIComponent(urgency)}&status=${encodeURIComponent(status)}&city=${encodeURIComponent(city)}`;

  const res = await fetchAPI(`/api/requests${query}`);

  if (res.ok && res.data.success) {
    renderRequestCards(res.data.requests);
  } else {
    feed.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 3rem;">
      Failed to load blood requests.
    </div>`;
  }
}

function renderRequestCards(requests) {
  const feed = document.getElementById('requestsFeed');
  if (!feed) return;

  if (requests.length === 0) {
    feed.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;" class="glass-panel">
      <div style="font-size: 3rem; margin-bottom: 0.5rem;">🚨</div>
      <h3>No Active Blood Requests</h3>
      <p style="color: var(--text-muted); margin-top: 0.5rem;">There are currently no urgent blood requests matching your filters.</p>
    </div>`;
    return;
  }

  feed.innerHTML = requests.map(req => {
    const isCritical = req.urgency === 'Critical';
    const isFulfilled = req.status === 'Fulfilled';

    return `
      <div class="request-card glass-panel ${isCritical ? 'critical' : ''}">
        <div class="request-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="blood-badge" style="width: 38px; height: 38px; font-size: 1rem;">${req.bloodGroup}</span>
              <h3 style="font-size: 1.2rem;">${req.patientName}</h3>
            </div>
            <div style="color: var(--text-muted); font-size: 0.85rem;">
              🏥 ${req.hospitalName}, ${req.city}
            </div>
          </div>
          <span class="urgency-badge ${req.urgency ? req.urgency.toLowerCase() : 'normal'}">
            ${req.urgency} Urgency
          </span>
        </div>

        <div style="margin: 1rem 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: var(--radius-sm);">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Units Required</div>
            <div style="font-weight: 700; font-size: 1.1rem; color: var(--primary-red);">${req.unitsNeeded} Unit(s)</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Status</div>
            <div style="font-weight: 600; font-size: 0.95rem;">${req.status}</div>
          </div>
        </div>

        ${req.additionalNotes ? `<p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">ℹ️ ${req.additionalNotes}</p>` : ''}

        <div style="display: flex; gap: 0.5rem; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <a href="tel:${req.contactPhone}" class="btn btn-outline btn-sm">
            📞 ${req.contactPhone}
          </a>

          ${!isFulfilled ? `
            <button onclick="handleDonorRespond('${req._id}', '${req.bloodGroup}')" class="btn btn-primary btn-sm">
              🩸 Offer to Donate
            </button>
          ` : `
            <span class="status-tag available" style="background: rgba(42,157,143,0.2);">FULFILLED ✅</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function setupRequestFilterListeners() {
  const ids = ['reqFilterBloodGroup', 'reqFilterUrgency', 'reqFilterStatus', 'reqFilterCity'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', fetchAndRenderRequests);
      el.addEventListener('change', fetchAndRenderRequests);
    }
  });
}

function renderCreateRequestModalHTML() {
  if (document.getElementById('createRequestModalBackdrop')) return;

  const modalHTML = `
    <div id="createRequestModalBackdrop" class="modal-backdrop">
      <div class="modal-card glass-panel" style="max-width: 580px;">
        <div class="modal-header">
          <h3>🚨 Post Emergency Blood Request</h3>
          <button class="modal-close" onclick="closeCreateRequestModal()">&times;</button>
        </div>

        <form id="createRequestForm">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Patient Name</label>
              <input type="text" id="reqPatientName" class="form-control" placeholder="Patient Full Name" required>
            </div>
            <div class="form-group">
              <label class="form-label">Hospital Name</label>
              <input type="text" id="reqHospitalName" class="form-control" placeholder="Apollo Hospital" required>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Blood Group</label>
              <select id="reqBloodGroup" class="form-select" required>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Units Needed</label>
              <input type="number" id="reqUnitsNeeded" class="form-control" min="1" max="20" value="2" required>
            </div>
            <div class="form-group">
              <label class="form-label">Urgency</label>
              <select id="reqUrgency" class="form-select">
                <option value="Critical">Critical (Immediate)</option>
                <option value="High" selected>High (24 hours)</option>
                <option value="Normal">Normal (3 days)</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">City / District</label>
              <input type="text" id="reqCity" class="form-control" placeholder="Mumbai" required>
            </div>
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input type="tel" id="reqPhone" class="form-control" placeholder="+91 98765 00000" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Additional Notes</label>
            <textarea id="reqNotes" class="form-control" rows="2" placeholder="Specific hospital block, ICU unit, or timing details..."></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
            📢 Broadcast Request to Donors
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const form = document.getElementById('createRequestForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        patientName: document.getElementById('reqPatientName').value,
        hospitalName: document.getElementById('reqHospitalName').value,
        bloodGroup: document.getElementById('reqBloodGroup').value,
        unitsNeeded: document.getElementById('reqUnitsNeeded').value,
        urgency: document.getElementById('reqUrgency').value,
        city: document.getElementById('reqCity').value,
        contactPhone: document.getElementById('reqPhone').value,
        additionalNotes: document.getElementById('reqNotes').value
      };

      const res = await fetchAPI('/api/requests', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data.success) {
        showToast('Emergency blood request broadcasted successfully!', 'success');
        closeCreateRequestModal();
        form.reset();
        fetchAndRenderRequests();
      } else {
        showToast(res.data.message || 'Failed to submit request', 'error');
      }
    });
  }
}

function openCreateRequestModal() {
  const modal = document.getElementById('createRequestModalBackdrop');
  if (modal) modal.classList.add('active');
}

function closeCreateRequestModal() {
  const modal = document.getElementById('createRequestModalBackdrop');
  if (modal) modal.classList.remove('active');
}

async function handleDonorRespond(requestId, requiredBloodGroup) {
  if (!state.token) {
    showToast('Please log in as a donor to respond to blood requests.', 'info');
    openAuthModal('login');
    return;
  }

  const res = await fetchAPI(`/api/requests/${requestId}/respond`, {
    method: 'POST'
  });

  if (res.ok && res.data.success) {
    showToast('Thank you for offering to donate! The hospital / family has been notified.', 'success');
    fetchAndRenderRequests();
  } else {
    showToast(res.data.message || 'Error responding to request', 'error');
  }
}
