/**
 * LIFE LINK – Role-Based Application Controller
 * Connected to Real MongoDB API Backend.
 */

document.addEventListener('DOMContentLoaded', () => {
  MockAuth.renderRoleNavigation('home');
  renderNotificationDrawer();
  if (document.getElementById('emergencyCarouselTrack')) renderDonorRequestCarousel();
  loadLoggedInUserData();
});

let currentDetailReqId = null;

// Fetch & Bind Logged In User Data Across Navbar & Headers
async function loadLoggedInUserData() {
  const token = MockAuth.getToken();
  if (!token) return;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const user = data.user;
      const profile = data.profile;

      // Update LocalStorage Session
      MockAuth.setCurrentUser(user, token, profile, data.organization);

      // Update Header Elements if on donor pages
      const greeting = document.getElementById('donorGreetingName');
      if (greeting && user.name) greeting.textContent = user.name.split(' ')[0] + '.';

      const bloodPill = document.getElementById('donorBloodTypePill');
      if (bloodPill && profile) bloodPill.innerHTML = `<i class="fa-solid fa-droplet"></i> ${profile.bloodGroup} DONOR`;

      const locEl = document.getElementById('donorLocationText');
      if (locEl && profile) locEl.textContent = `📍 ${profile.city}`;

      if (profile && typeof MockData !== 'undefined' && MockData.calculateEligibility) {
        const eligibility = MockData.calculateEligibility(profile.lastDonationDate);
        const pill = document.getElementById('eligibilityBadgePill');
        const lastEl = document.getElementById('lastDonationText');
        const nextEl = document.getElementById('nextEligibleText');

        if (pill) {
          if (eligibility.isEligible) {
            pill.className = 'pill-green';
            pill.innerHTML = '✓ Eligible to Donate';
          } else {
            pill.className = 'pill-red';
            pill.innerHTML = `⚠️ Not Eligible Yet (${eligibility.daysRemaining}d left)`;
          }
        }
        if (lastEl) lastEl.textContent = eligibility.lastDonationFormatted;
        if (nextEl) nextEl.textContent = eligibility.nextEligibleFormatted;
      }
    }
  } catch (err) {
    console.error('Error loading active user session:', err);
  }
}

// Horizontal Carousel Controls
function scrollCarousel(direction) {
  const track = document.getElementById('emergencyCarouselTrack');
  if (!track) return;

  const scrollAmount = 360;
  track.scrollBy({
    left: direction === 'right' ? scrollAmount : -scrollAmount,
    behavior: 'smooth'
  });
}

// Render Donor-Relevant Emergency Request Carousel from Real MongoDB
async function renderDonorRequestCarousel() {
  const track = document.getElementById('emergencyCarouselTrack');
  if (!track) return;

  const token = MockAuth.getToken();
  if (!token) return;

  try {
    const res = await fetch('/api/requests/donor-feed', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const requests = (data.success && data.requests) ? data.requests : [];

    if (requests.length === 0) {
      track.innerHTML = `
        <div style="padding: 2rem; background: #ffffff; border-radius: 14px; border: 1px solid #E2E8F0; width: 100%; text-align: center;">
          <p style="color: #64748B; font-size: 0.92rem;">No active emergency requests matching your blood group at this moment.</p>
        </div>
      `;
      return;
    }

    track.innerHTML = requests.map(r => `
      <div class="carousel-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <div class="blood-badge-square">${r.bloodGroup}</div>
          <span class="badge badge-critical">${r.urgency || 'URGENT'}</span>
        </div>

        <div style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem;">
          ${r.unitsNeeded} UNITS REQUIRED
        </div>

        <div style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin-bottom: 0.25rem;">
          🏥 ${r.hospitalName || r.orgName}
        </div>

        <div style="font-size: 0.88rem; color: #64748B; margin-bottom: 0.75rem;">
          📍 ${r.approxDistance || r.city}
        </div>

        <div style="background: #F8FAFC; padding: 0.65rem 0.85rem; border-radius: 10px; margin-bottom: 1.25rem; font-size: 0.85rem; display: flex; justify-content: space-between;">
          <span style="color: #64748B;">Required within:</span>
          <strong style="color: #E6002E;">${r.requiredBy || 'Within 3 Hours'}</strong>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem;">
          <button onclick="openReferralModal('${r.id}')" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.35rem 0.65rem;">
            <i class="fa-solid fa-user-plus"></i> REFER DONOR
          </button>
          <button onclick="openRequestDetail('${r.id}')" class="btn btn-primary btn-sm" style="font-size: 0.72rem; padding: 0.35rem 0.65rem;">
            VIEW REQUEST
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading donor request feed:', err);
  }
}

// Request Detail Modal Handler
async function openRequestDetail(reqId) {
  currentDetailReqId = reqId;
  const modal = document.getElementById('requestDetailModal');
  const body = document.getElementById('requestDetailModalBody');

  if (!modal || !body) return;

  try {
    const res = await fetch(`/api/requests/${reqId}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert('Request details could not be loaded.');
      return;
    }
    const req = data.request;

    body.innerHTML = `
      <div style="padding: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="blood-badge-square" style="width: 60px; height: 60px; font-size: 1.6rem;">${req.bloodGroup}</div>
            <div>
              <h3 style="font-size: 1.4rem;">${req.bloodGroup} BLOOD REQUIRED</h3>
              <div style="color: #E6002E; font-size: 1.1rem; font-weight: 800;">${req.unitsNeeded} Units Needed</div>
            </div>
          </div>

          <button onclick="closeRequestDetailModal()" style="background: none; border: none; font-size: 1.6rem; cursor: pointer; color: #64748B;">&times;</button>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <span class="badge badge-success" style="margin-bottom: 0.5rem;">✓ VERIFIED HEALTHCARE FACILITY</span>
          <h4 style="font-size: 1.2rem; margin-bottom: 0.25rem;">${req.hospitalName || req.orgName}</h4>
          <p style="color: #64748B; font-size: 0.9rem;">📍 ${req.city} • Contact: ${req.contactPhone}</p>
        </div>

        <div style="background: #F8FAFC; padding: 1rem 1.25rem; border-radius: 10px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 0.82rem; color: #64748B;">Time Remaining</span>
            <strong style="color: #E6002E; display: block; font-size: 1.1rem;">${req.requiredBy || 'Within 3 Hours'}</strong>
          </div>

          <span class="badge badge-critical">${req.urgency || 'URGENT'} REQUIREMENT</span>
        </div>

        ${req.additionalNotes ? `
          <div style="font-size: 0.9rem; color: #334155; margin-bottom: 2rem; background: #FFF0F3; padding: 1rem; border-radius: 10px; border: 1px solid #FFE0E6;">
            ℹ️ ${req.additionalNotes}
          </div>
        ` : ''}

        <div id="modalDetailActions" style="display: flex; gap: 1rem;">
          <button onclick="handleModalResponse(true, '${req._id || req.id}')" class="btn btn-primary btn-lg" style="flex: 1;">
            I CAN DONATE
          </button>
          <button onclick="handleModalResponse(false, '${req._id || req.id}')" class="btn btn-secondary btn-lg" style="flex: 1;">
            NOT AVAILABLE
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  } catch (err) {
    console.error('Error fetching request detail:', err);
  }
}

function closeRequestDetailModal() {
  const modal = document.getElementById('requestDetailModal');
  if (modal) modal.classList.remove('active');
}

async function handleModalResponse(canDonate, reqId) {
  const actions = document.getElementById('modalDetailActions');
  if (!actions) return;

  const targetId = reqId || currentDetailReqId;
  const token = MockAuth.getToken();

  if (canDonate) {
    try {
      const res = await fetch(`/api/requests/${targetId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        actions.innerHTML = `
          <div style="width: 100%; padding: 1rem; background: #F0FDF4; color: #16A34A; border-radius: 10px; text-align: center; font-weight: 700;">
            ✓ Thank you! Your response has been saved to MongoDB and communicated to the hospital.
          </div>
        `;
        renderDonorRequestCarousel();
      } else {
        alert(data.message || 'Error responding to request.');
      }
    } catch (err) {
      console.error('Error submitting donor response:', err);
    }
  } else {
    actions.innerHTML = `
      <div style="width: 100%; padding: 1rem; background: #F8FAFC; color: #64748B; border-radius: 10px; text-align: center;">
        Your status response has been updated.
      </div>
    `;
  }
}

// Notification Drawer Toggle & Renderer
function toggleNotificationDrawer() {
  const overlay = document.getElementById('notificationOverlay');
  const drawer = document.getElementById('notificationDrawer');

  if (overlay && drawer) {
    overlay.classList.toggle('active');
    drawer.classList.toggle('active');
  }
}

async function renderNotificationDrawer() {
  const container = document.getElementById('notificationListContainer');
  if (!container) return;

  const token = MockAuth.getToken();
  if (!token) return;

  try {
    const res = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const notifications = (data.success && data.notifications) ? data.notifications : [];

    if (notifications.length === 0) {
      container.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #64748B; font-size: 0.88rem;">
          No notifications found.
        </div>
      `;
      return;
    }

    container.innerHTML = notifications.map(n => `
      <div style="padding: 1rem; border-bottom: 1px solid #E2E8F0; background: ${n.isRead ? '#FFFFFF' : '#FFF0F3'};">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
          <strong style="font-size: 0.95rem; color: #0F172A;">${n.title}</strong>
          <span style="font-size: 0.75rem; color: #64748B;">${new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <p style="font-size: 0.88rem; color: #334155; margin-bottom: 0.35rem;">${n.message}</p>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
}

function scrollToImpact() {
  const section = document.getElementById('impactSection');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// DONOR REFERRAL MODAL HANDLERS
function openReferralModal(reqId = '') {
  let modal = document.getElementById('globalReferralModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'globalReferralModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(6px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 1rem;';
    modal.innerHTML = `
      <div style="background: #FFFFFF; border-radius: 16px; width: 100%; max-width: 520px; padding: 1.75rem; border: 1px solid #E2E8F0; box-shadow: 0 20px 40px rgba(15,23,42,0.2); position: relative;">
        <button onclick="closeReferralModal()" style="position: absolute; top: 1.25rem; right: 1.25rem; background: none; border: none; font-size: 1.5rem; color: #64748B; cursor: pointer;">&times;</button>
        
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <div style="width: 42px; height: 42px; background: #FFF0F3; border-radius: 10px; color: #E6002E; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
            <i class="fa-solid fa-user-plus"></i>
          </div>
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: #0F172A; margin: 0;">Refer a Donor</h3>
            <p style="font-size: 0.82rem; color: #64748B; margin: 0;">Send a secure invitation link to a friend</p>
          </div>
        </div>

        <form id="referralFormModal" onsubmit="submitReferralForm(event)">
          <input type="hidden" id="referralReqId" value="${reqId}">
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #0F172A; margin-bottom: 0.4rem;">
              Friend's Full Name <span style="color: #E6002E;">*</span>
            </label>
            <input type="text" id="referralNameInput" required placeholder="Friend's Name" style="width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.95rem; margin-bottom: 0.75rem;">

            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #0F172A; margin-bottom: 0.4rem;">
              Friend's Mobile Number <span style="color: #E6002E;">*</span>
            </label>
            <div style="position: relative;">
              <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); font-weight: 600; color: #64748B; font-size: 0.9rem;">+91</span>
              <input type="tel" id="referralPhoneInput" required placeholder="98765 43210" pattern="[0-9]{10}" style="width: 100%; padding: 0.65rem 0.85rem 0.65rem 3.4rem; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.95rem; font-weight: 600;">
            </div>
          </div>

          <div id="referralResultBox" style="display: none; margin-bottom: 1.25rem;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" onclick="closeReferralModal()" style="padding: 0.6rem 1.2rem; background: #F1F5F9; color: #475569; border: none; border-radius: 9999px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">Cancel</button>
            <button type="submit" style="padding: 0.6rem 1.4rem; background: #E6002E; color: white; border: none; border-radius: 9999px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">
              <i class="fa-solid fa-paper-plane"></i> Send Referral
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    document.getElementById('referralReqId').value = reqId;
    document.getElementById('referralPhoneInput').value = '';
    const resBox = document.getElementById('referralResultBox');
    if (resBox) resBox.style.display = 'none';
    modal.style.display = 'flex';
  }
}

function closeReferralModal() {
  const modal = document.getElementById('globalReferralModal');
  if (modal) modal.style.display = 'none';
}

async function submitReferralForm(e) {
  e.preventDefault();
  const phone = document.getElementById('referralPhoneInput').value.trim();
  const name = document.getElementById('referralNameInput')?.value.trim() || 'Friend';
  const reqId = document.getElementById('referralReqId')?.value || '';
  const resBox = document.getElementById('referralResultBox');

  const token = MockAuth.getToken();
  try {
    const res = await fetch('/api/referrals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ refereeName: name, refereePhone: '+91 ' + phone, requestId: reqId })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      resBox.style.display = 'block';
      resBox.innerHTML = `
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 1rem; color: #166534; font-size: 0.85rem;">
          <strong>✓ Referral Sent Successfully!</strong> Code: ${data.referral.referralCode}
        </div>
      `;
    } else {
      alert(data.message || 'Referral error');
    }
  } catch(err) {
    console.error(err);
  }
}

async function toggleAvailabilityFromNotif() {
  const token = MockAuth.getToken();
  try {
    const res = await fetch('/api/donors/availability', {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`Availability updated: ${data.isAvailable ? 'AVAILABLE' : 'PAUSED'}`);
    }
  } catch(e) {}
}
