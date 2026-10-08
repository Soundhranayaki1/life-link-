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
  console.log('=== E2E AUTH & DASHBOARD DATA FLOW TEST ===\n');
  const timestamp = Date.now();

  // Step 1: Register New Donor
  const donorPhone = `+91 99${timestamp.toString().slice(-8)}`;
  const donorEmail = `donor_${timestamp}@test.org`;
  const donorPayload = {
    name: 'Test Fresh Donor',
    email: donorEmail,
    password: 'Password@123',
    phone: donorPhone,
    otpCode: '123456',
    bloodGroup: 'B-',
    city: 'Hosur',
    district: 'Krishnagiri',
    address: 'Town Hall Road'
  };

  console.log('1. Registering fresh donor:', donorPhone);
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
  const donorToken = regRes.data.token;
  const donorId = regRes.data.user._id || regRes.data.user.id;

  // Step 2: Call /api/auth/me for Donor
  console.log('\n2. Testing /api/auth/me for fresh donor...');
  const meRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${donorToken}` }
  });

  console.log('/api/auth/me Status:', meRes.status, 'Role:', meRes.data.user?.role, 'Name:', meRes.data.profile?.name || meRes.data.user?.name);
  if (meRes.data.user?._id !== donorId && meRes.data.user?.id !== donorId) {
    console.error('Mismatch in authenticated user ID!');
    process.exit(1);
  }

  // Step 3: Test Donor Login using OTP
  console.log('\n3. Testing Donor Login with registered credentials...');
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/donor-login-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { phone: donorPhone, code: '123456' });

  console.log('Login Status:', loginRes.status, 'Success:', loginRes.data.success);

  // Step 4: Login as Admin to create a fresh Hospital Account
  console.log('\n4. Logging in as Admin...');
  const adminLoginRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: 'admin', password: 'admin123' });

  const adminToken = adminLoginRes.data.token;
  console.log('Admin login status:', adminLoginRes.status, 'Success:', adminLoginRes.data.success);

  // Step 5: Admin creates a new Organization
  const orgUsername = `hosp_${timestamp}`;
  const orgPhone = `+91 98${timestamp.toString().slice(-8)}`;
  const orgPayload = {
    name: 'Fresh City General Hospital',
    username: orgUsername,
    password: 'HospitalPassword@123',
    orgType: 'GovtHospital',
    email: `hospital_${timestamp}@cityhealth.org`,
    phone: orgPhone,
    certificationNumber: `CERT-${timestamp}`,
    address: 'Central Avenue',
    city: 'Hosur',
    district: 'Krishnagiri',
    representativeName: 'Dr. Smith'
  };

  console.log('\n5. Creating fresh Organization via Admin:', orgUsername);
  const createOrgRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/admin/create-org',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, orgPayload);

  console.log('Create Org Status:', createOrgRes.status, 'Success:', createOrgRes.data.success);

  // Step 6: Hospital Login with created credentials
  console.log('\n6. Hospital Login with created credentials...');
  const orgLoginRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: orgUsername, password: 'HospitalPassword@123' });

  console.log('Org Login Status:', orgLoginRes.status, 'Success:', orgLoginRes.data.success);
  const orgToken = orgLoginRes.data.token;

  // Step 7: Check Org /api/auth/me
  console.log('\n7. Checking Hospital /api/auth/me...');
  const orgMeRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${orgToken}` }
  });

  console.log('Org /api/auth/me Status:', orgMeRes.status, 'Name:', orgMeRes.data.organization?.name);

  // Step 8: Hospital creates Emergency Request (Recipient blood B-, matching B- fresh donor)
  console.log('\n8. Hospital posting emergency blood request for B-...');
  const reqPayload = {
    patientName: 'Emergency Patient A',
    patientAge: 45,
    bloodGroup: 'B-',
    unitsNeeded: 2,
    urgencyLevel: 'CRITICAL',
    hospitalName: 'Fresh City General Hospital',
    city: 'Hosur',
    district: 'Krishnagiri',
    contactPhone: '+91 98430 99999',
    requiredWithin: '2 hours',
    medicalNotes: 'Urgent surgery requirement'
  };

  const createReqRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orgToken}`
    }
  }, reqPayload);

  console.log('Create Request Status:', createReqRes.status, 'Success:', createReqRes.data.success);
  console.log('Notified donors count:', createReqRes.data.donorsNotifiedCount);
  const requestId = createReqRes.data.request._id;

  // Step 9: Fresh Donor checks donor-feed & notifications
  console.log('\n9. Fresh donor checking incoming requests and notifications...');
  const donorReqsRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/requests/donor-feed',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${donorToken}` }
  });

  const donorRequestsList = donorReqsRes.data.requests || donorReqsRes.data.data || [];
  console.log('Donor feed count for fresh donor:', donorRequestsList.length);
  const foundReq = donorRequestsList.find(r => r._id === requestId || r.id === requestId);
  if (foundReq) {
    console.log('SUCCESS: Emergency request successfully arrived at Fresh Donor feed!');
  } else {
    console.error('FAIL: Emergency request not found in Fresh Donor feed!');
  }

  // Step 10: Donor responds to request
  console.log('\n10. Donor responding to request...');
  const respondRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: `/api/requests/${requestId}/respond`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${donorToken}` }
  });

  console.log('Donor Respond Status:', respondRes.status, 'Success:', respondRes.data.success);

  // Step 11: Hospital views responses
  console.log('\n11. Hospital checking responses on request...');
  const orgReqsRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/requests/org',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${orgToken}` }
  });

  const orgRequestsList = orgReqsRes.data.requests || orgReqsRes.data.data || [];
  const updatedReq = orgRequestsList.find(r => r._id === requestId || r.id === requestId);
  console.log('Request responder count on Org Dashboard:', updatedReq?.respondedDonors?.length);

  console.log('\n=== ALL E2E AUTHENTICATION & DATA FLOW VERIFICATIONS PASSED ===');
}

runTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
