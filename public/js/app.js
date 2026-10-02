/**
 * LIFE LINK – Role-Based Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  MockAuth.renderRoleNavigation('home');
  renderNotificationDrawer();
  if (document.getElementById('emergencyCarouselTrack')) renderDonorRequestCarousel();
});

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

// Render Donor-Relevant Emergency Request Carousel
function renderDonorRequestCarousel() {
  const track = document.getElementById('emergencyCarouselTrack');
  if (!track) return;

  const user = MockAuth.getCurrentUser();
  const donorBloodGroup = (user && user.bloodGroup) ? user.bloodGroup : 'O+';

  // Filter requests relevant to logged-in donor's blood compatibility
  const relevantRequests = MockData.emergencyRequests.filter(req => 
    MockData.isCompatible(donorBloodGroup, req.bloodGroup)
  );

  if (relevantRequests.length === 0) {
    track.innerHTML = `
      <div style="padding: 2rem; background: #ffffff; border-radius: var(--radius-md); border: 1px solid var(--navy-border); width: 100%; text-align: center;">
        <p style="color: var(--navy-muted);">No urgent emergency requests matching your blood group (${donorBloodGroup}) at this moment.</p>
      </div>
    `;
    return;
  }

  track.innerHTML = relevantRequests.map(r => `
    <div class="carousel-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
        <div class="blood-badge-square">${r.bloodGroup}</div>
        <span class="badge badge-critical">${r.urgency}</span>
      </div>

      <div style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 0.25rem;">
        ${r.unitsNeeded} UNITS REQUIRED
      </div>

      <div style="font-size: 0.95rem; font-weight: 700; color: var(--navy-dark); margin-bottom: 0.25rem;">
        🏥 ${r.orgName}
      </div>

      <div style="font-size: 0.88rem; color: var(--navy-muted); margin-bottom: 0.75rem;">
        📍 ${r.humanDistance}
      </div>

      <div style="background: var(--bg-soft-gray); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem; font-size: 0.85rem; display: flex; justify-content: space-between;">
        <span style="color: var(--navy-muted);">Required within:</span>
        <strong style="color: var(--crimson-red);">${r.timeRemaining.replace('Required within ', '')}</strong>
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
}

// Request Detail Modal Handler
function openRequestDetail(reqId) {
  const req = MockData.emergencyRequests.find(r => r.id === reqId) || MockData.emergencyRequests[0];
  const modal = document.getElementById('requestDetailModal');
  const body = document.getElementById('requestDetailModalBody');

  if (!modal || !body) return;

  body.innerHTML = `
    <div style="padding: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="blood-badge-square" style="width: 60px; height: 60px; font-size: 1.6rem;">${req.bloodGroup}</div>
          <div>
            <h3 style="font-size: 1.4rem;">${req.bloodGroup} BLOOD REQUIRED</h3>
            <div style="color: var(--crimson-red); font-size: 1.1rem; font-weight: 800;">${req.unitsNeeded} Units Needed</div>
          </div>
        </div>

        <button onclick="closeRequestDetailModal()" style="background: none; border: none; font-size: 1.6rem; cursor: pointer; color: var(--navy-muted);">&times;</button>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <span class="badge badge-success" style="margin-bottom: 0.5rem;">✓ VERIFIED GOVERNMENT HOSPITAL</span>
        <h4 style="font-size: 1.2rem; margin-bottom: 0.25rem;">${req.orgName}</h4>
        <p style="color: var(--navy-muted); font-size: 0.9rem;">📍 ${req.hospitalLocation} (${req.humanDistance})</p>
      </div>

      <div style="background: var(--bg-soft-gray); padding: 1rem 1.25rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 0.82rem; color: var(--navy-muted);">Time Remaining</span>
          <strong style="color: var(--crimson-red); display: block; font-size: 1.1rem;">${req.timeRemaining}</strong>
        </div>

        <span class="badge badge-critical">${req.urgency} REQUIREMENT</span>
      </div>

      <div style="font-size: 0.9rem; color: var(--navy-body); margin-bottom: 2rem; background: var(--bg-warm-ivory); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--navy-border);">
        ℹ️ ${req.additionalNotes}
      </div>

      <div id="modalDetailActions" style="display: flex; gap: 1rem;">
        <button onclick="handleModalResponse(true)" class="btn btn-primary btn-lg" style="flex: 1;">
          I CAN DONATE
        </button>
        <button onclick="handleModalResponse(false)" class="btn btn-secondary btn-lg" style="flex: 1;">
          NOT AVAILABLE
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeRequestDetailModal() {
  const modal = document.getElementById('requestDetailModal');
  if (modal) modal.classList.remove('active');
}

function handleModalResponse(canDonate) {
  const actions = document.getElementById('modalDetailActions');
  if (!actions) return;

  if (canDonate) {
    actions.innerHTML = `
      <div style="width: 100%; padding: 1rem; background: var(--status-success-bg); color: var(--status-success); border-radius: var(--radius-sm); text-align: center; font-weight: 700;">
        ✓ Thank you. Your response has been sent to the authorized organization.
      </div>
    `;
  } else {
    actions.innerHTML = `
      <div style="width: 100%; padding: 1rem; background: var(--bg-soft-gray); color: var(--navy-muted); border-radius: var(--radius-sm); text-align: center;">
        Your availability has been updated.
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

function renderNotificationDrawer() {
  const container = document.getElementById('notificationListContainer');
  if (!container) return;

  container.innerHTML = MockData.notifications.map(n => `
    <div style="padding: 1rem; border-bottom: 1px solid var(--navy-border); background: ${n.isUnread ? 'var(--bg-warm-ivory)' : '#ffffff'};">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
        <strong style="font-size: 0.95rem; color: var(--navy-dark);">${n.title}</strong>
        <span style="font-size: 0.75rem; color: var(--navy-muted);">${n.timeAgo}</span>
      </div>
      <p style="font-size: 0.88rem; color: var(--navy-body); margin-bottom: 0.35rem;">${n.message}</p>
      <div style="font-size: 0.78rem; color: var(--navy-muted);">${n.locationText}</div>
    </div>
  `).join('');
}

function scrollToImpact() {
  const section = document.getElementById('impactSection');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// ----------------------------------------------------
// DONOR REFERRAL MODAL HANDLERS
// ----------------------------------------------------
function openReferralModal(reqId = 'REQ-8821') {
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

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.83rem; color: #334155;">
          🔒 <strong>Privacy Protection:</strong> You only enter your friend's mobile number. You do NOT enter their blood group or medical info. They will verify their own details privately.
        </div>

        <form id="referralFormModal" onsubmit="submitReferralForm(event)">
          <input type="hidden" id="referralReqId" value="${reqId}">
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #0F172A; margin-bottom: 0.4rem;">
              Friend's Mobile Number <span style="color: #E6002E;">*</span>
            </label>
            <div style="position: relative;">
              <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); font-weight: 600; color: #64748B; font-size: 0.9rem;">+91</span>
              <input type="tel" id="referralPhoneInput" required placeholder="98765 43210" pattern="[0-9]{10}" style="width: 100%; padding: 0.65rem 0.85rem 0.65rem 3.4rem; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 0.95rem; font-weight: 600; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#E6002E'" onblur="this.style.borderColor='#CBD5E1'">
            </div>
          </div>

          <div style="background: #FFF5F7; border: 1px dashed #FFB8C6; border-radius: 10px; padding: 0.85rem; margin-bottom: 1.25rem;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #E6002E; text-transform: uppercase; margin-bottom: 0.35rem;">Sample Invitation SMS/WhatsApp</div>
            <p style="font-size: 0.82rem; color: #334155; line-height: 1.4; margin: 0; font-style: italic;">
              "LIFE LINK Emergency Blood Request<br>
              A friend has referred you for a nearby emergency blood requirement.<br>
              If you are eligible and willing to help, securely check the request here: [Link]"
            </p>
          </div>

          <div id="referralResultBox" style="display: none; margin-bottom: 1.25rem;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" onclick="closeReferralModal()" style="padding: 0.6rem 1.2rem; background: #F1F5F9; color: #475569; border: none; border-radius: 9999px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">Cancel</button>
            <button type="submit" style="padding: 0.6rem 1.4rem; background: #E6002E; color: white; border: none; border-radius: 9999px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-paper-plane"></i> Send Secure Referral
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

function submitReferralForm(e) {
  e.preventDefault();
  const phone = document.getElementById('referralPhoneInput').value.trim();
  const reqId = document.getElementById('referralReqId').value;
  const resBox = document.getElementById('referralResultBox');

  if (!phone || phone.length < 10) {
    alert('Please enter a valid 10-digit mobile number.');
    return;
  }

  const newRef = MockData.addReferral(phone, reqId);
  const referralLink = `${window.location.origin}/referral.html?ref=${newRef.refToken}`;

  resBox.style.display = 'block';
  resBox.innerHTML = `
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 1rem; color: #166534; font-size: 0.85rem;">
      <div style="font-weight: 800; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.35rem;">
        <i class="fa-solid fa-circle-check"></i> Secure Referral Sent Successfully!
      </div>
      <p style="margin-bottom: 0.6rem; color: #15803D;">SMS/WhatsApp invitation link sent to <strong>${newRef.anonymizedPhone}</strong>.</p>
      <div style="background: #FFFFFF; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #DCFCE7; word-break: break-all; font-family: monospace; font-size: 0.78rem; color: #0F172A;">
        ${referralLink}
      </div>
      <div style="margin-top: 0.6rem; text-align: right;">
        <a href="referral.html?ref=${newRef.refToken}" target="_blank" style="color: #2563EB; font-weight: 700; text-decoration: underline; font-size: 0.82rem;">
          Simulate Opening Referral Link as Friend →
        </a>
      </div>
    </div>
  `;

  setTimeout(() => {
    if (typeof loadReferralData === 'function') {
      loadReferralData();
    }
  }, 300);
}

function resumeAvailabilityFromNotif() {
  MockData.setDonorAvailability('AVAILABLE');
  if (typeof updateAvailabilityUI === 'function') {
    updateAvailabilityUI();
  }
  alert('Your donor availability has been resumed successfully! You are now eligible for compatible emergency requests.');
  window.location.href = 'emergency-requests.html';
}
