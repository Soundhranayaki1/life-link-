/**
 * LIFE LINK – Authentication & OTP Handler
 */

let isMobileVerified = false;

document.addEventListener('DOMContentLoaded', () => {
  setupLoginHandler();
  setupDonorRegistration();
  setupOrgRegistration();
});

function setupLoginHandler() {
  const loginForm = document.getElementById('signInForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const res = await API.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res.ok && res.data.success) {
      API.setSession(res.data.token, res.data.user);
      showToast('Signed in successfully', 'success');

      const role = res.data.user.role;
      const redirectUrl = {
        'Donor': 'donor-dashboard.html',
        'Organization': 'requester-dashboard.html',
        'BloodBank': 'blood-bank-dashboard.html',
        'Admin': 'admin-dashboard.html'
      }[role] || 'donor-dashboard.html';

      setTimeout(() => { window.location.href = redirectUrl; }, 400);
    } else {
      showToast(res.data.message || 'Invalid credentials', 'error');
    }
  });
}

// Step 1: Send OTP to Mobile
async function handleSendOtp() {
  const phoneInput = document.getElementById('donorPhone');
  const phone = phoneInput ? phoneInput.value.trim() : '';

  if (!phone) {
    showToast('Please enter a valid mobile number first', 'error');
    return;
  }

  const res = await API.request('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone })
  });

  if (res.ok && res.data.success) {
    showToast(res.data.message, 'success');
    const verifySec = document.getElementById('otpVerifySection');
    if (verifySec) verifySec.style.display = 'block';

    // Auto-fill dev code for convenience if returned
    if (res.data.code && document.getElementById('otpCodeInput')) {
      document.getElementById('otpCodeInput').value = res.data.code;
    }
  } else {
    showToast(res.data.message || 'Failed to send OTP', 'error');
  }
}

// Step 2: Verify OTP
async function handleVerifyOtp() {
  const phone = document.getElementById('donorPhone').value.trim();
  const code = document.getElementById('otpCodeInput').value.trim();

  if (!code) {
    showToast('Please enter the 6-digit OTP code', 'error');
    return;
  }

  const res = await API.request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code })
  });

  if (res.ok && res.data.success) {
    isMobileVerified = true;
    showToast('Mobile number verified! Please complete your profile.', 'success');

    const badge = document.getElementById('otpStatusBadge');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.textContent = '✓ Mobile Number Verified';
    }

    const step2 = document.getElementById('donorDetailsStep');
    if (step2) {
      step2.style.opacity = '1';
      step2.style.pointerEvents = 'all';
    }

    const submitBtn = document.getElementById('completeDonorRegBtn');
    if (submitBtn) submitBtn.disabled = false;
  } else {
    showToast(res.data.message || 'Verification failed', 'error');
  }
}

// Step 3: Complete Verified Donor Registration
function setupDonorRegistration() {
  const form = document.getElementById('donorForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isMobileVerified) {
      showToast('You must verify your mobile number via OTP first', 'error');
      return;
    }

    const name = document.getElementById('donorName').value;
    const email = document.getElementById('donorEmail').value;
    const phone = document.getElementById('donorPhone').value;
    const otpCode = document.getElementById('otpCodeInput').value;
    const bloodGroup = document.getElementById('donorBloodGroup').value;
    const city = document.getElementById('donorCity').value;
    const district = document.getElementById('donorDistrict').value;
    const password = document.getElementById('donorPassword').value;

    const res = await API.request('/api/auth/register-donor', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        phone,
        otpCode,
        bloodGroup,
        city,
        district,
        password
      })
    });

    if (res.ok && res.data.success) {
      API.setSession(res.data.token, res.data.user);
      showToast('Verified Donor account created!', 'success');
      setTimeout(() => { window.location.href = 'donor-dashboard.html'; }, 400);
    } else {
      showToast(res.data.message || 'Registration failed', 'error');
    }
  });
}

// Organization Registration Handler
function setupOrgRegistration() {
  const form = document.getElementById('orgForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('orgName').value;
    const orgType = document.getElementById('orgType').value;
    const certificationNumber = document.getElementById('orgCertNum').value;
    const phone = document.getElementById('orgPhone').value;
    const email = document.getElementById('orgEmail').value;
    const city = document.getElementById('orgCity').value;
    const representativeName = document.getElementById('orgRepName').value;
    const officialAddress = document.getElementById('orgAddress').value;
    const password = document.getElementById('orgPassword').value;

    const res = await API.request('/api/auth/register-org', {
      method: 'POST',
      body: JSON.stringify({
        name,
        orgType,
        certificationNumber,
        phone,
        email,
        city,
        representativeName,
        officialAddress,
        password
      })
    });

    if (res.ok && res.data.success) {
      API.setSession(res.data.token, res.data.user);
      showToast('Organization registered! Status is PENDING_VERIFICATION until Admin approval.', 'info');
      setTimeout(() => { window.location.href = 'requester-dashboard.html'; }, 500);
    } else {
      showToast(res.data.message || 'Registration failed', 'error');
    }
  });
}
