const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTest() {
  console.log('=== DETAILED NEW DONOR REGISTRATION TEST ===\n');
  const timestamp = Date.now();

  const donorPhone = `+91 98${timestamp.toString().slice(-8)}`;
  const donorEmail = `donor_real_${timestamp}@testdomain.org`;
  const donorPayload = {
    name: 'Rohan Sharma',
    email: donorEmail,
    password: 'Password@123',
    phone: donorPhone,
    otpCode: '123456',
    bloodGroup: 'AB-',
    city: 'Bangalore',
    district: 'Indiranagar',
    address: '100 Feet Road',
    gender: 'Male',
    lastDonationDate: '2026-01-15',
    donationRadiusKm: 10,
    isAvailable: true
  };

  // Step 1: Register New Donor
  console.log('1. Submitting real donor registration payload...');
  const regRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/register-donor',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, donorPayload);

  console.log('Registration Status:', regRes.status, 'Success:', regRes.data.success);
  if (!regRes.data.success) {
    console.error('Registration failed:', regRes.data);
    process.exit(1);
  }

  const token = regRes.data.token;
  const user = regRes.data.user;
  const profile = regRes.data.profile;

  console.log('Returned User Name:', user.name);
  console.log('Returned User Phone:', user.phone);
  console.log('Returned Profile Blood Group:', profile.bloodGroup);
  console.log('Returned Profile City:', profile.city);
  console.log('Returned Profile Radius:', profile.donationRadiusKm);
  console.log('Returned Profile Availability:', profile.isAvailable);

  // Step 2: Test Duplicate Registration Rejection
  console.log('\n2. Testing Duplicate Registration Rejection...');
  const dupRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/register-donor',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, donorPayload);

  console.log('Duplicate Reg Status:', dupRes.status, 'Message:', dupRes.data.message);
  if (dupRes.status !== 400 || dupRes.data.success !== false) {
    console.error('FAIL: Duplicate registration was not rejected!');
    process.exit(1);
  }
  console.log('SUCCESS: Duplicate registration properly blocked by backend validation.');

  // Step 3: Immediate OTP Login with registered credentials
  console.log('\n3. Immediate Donor OTP Login...');
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/donor-login-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: donorPhone, code: '123456' });

  console.log('Login Status:', loginRes.status, 'Success:', loginRes.data.success);
  const loginToken = loginRes.data.token;

  // Step 4: Verify /api/auth/me session persistence
  console.log('\n4. Verifying /api/auth/me session data persistence...');
  const meRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${loginToken}` }
  });

  console.log('/api/auth/me Status:', meRes.status);
  console.log('Session User Name:', meRes.data.user?.name);
  console.log('Session Blood Group:', meRes.data.profile?.bloodGroup);
  console.log('Session City:', meRes.data.profile?.city);
  console.log('Session Radius:', meRes.data.profile?.donationRadiusKm);
  console.log('Session Availability:', meRes.data.profile?.isAvailable);

  if (
    meRes.data.user?.name === 'Rohan Sharma' &&
    meRes.data.profile?.bloodGroup === 'AB-' &&
    meRes.data.profile?.city === 'Bangalore'
  ) {
    console.log('\n=== REAL NEW DONOR REGISTRATION VERIFICATION COMPLETE & PASSED ===');
  } else {
    console.error('FAIL: Session data mismatch!');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
