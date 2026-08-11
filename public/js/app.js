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

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="badge badge-success" style="font-size: 0.7rem;">✓ Verified Org</span>
        <button onclick="openRequestDetail('${r.id}')" class="btn btn-primary btn-sm">
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
