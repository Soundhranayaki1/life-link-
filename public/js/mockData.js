/**
 * LIFE LINK – Mock Data Store & Core Logic Engine
 */

const MockData = {
  // Blood compatibility checker
  isCompatible(donorGroup, reqGroup) {
    if (donorGroup === 'O-') return true; // Universal donor
    if (donorGroup === 'O+' && (reqGroup === 'O+' || reqGroup === 'A+' || reqGroup === 'B+' || reqGroup === 'AB+')) return true;
    if (donorGroup === reqGroup) return true;
    return false;
  },

  // 48-Day Donation Eligibility Calculator
  calculateEligibility(lastDonationDate) {
    if (!lastDonationDate) {
      return {
        isEligible: true,
        daysRemaining: 0,
        nextEligibleFormatted: 'Eligible Now',
        statusText: 'Eligible to Donate',
        lastDonationFormatted: 'No prior donations recorded'
      };
    }

    const lastDate = new Date(lastDonationDate);
    if (isNaN(lastDate.getTime())) {
      return {
        isEligible: true,
        daysRemaining: 0,
        nextEligibleFormatted: 'Eligible Now',
        statusText: 'Eligible to Donate',
        lastDonationFormatted: 'No prior donations recorded'
      };
    }

    const nextEligible = new Date(lastDate.getTime() + (48 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const diffMs = nextEligible.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isEligible = daysRemaining === 0;

    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const lastDonationFormatted = lastDate.toLocaleDateString('en-US', options);
    const nextEligibleFormatted = nextEligible.toLocaleDateString('en-US', options);

    return {
      isEligible,
      daysRemaining,
      nextEligibleDate: nextEligible,
      nextEligibleFormatted,
      statusText: isEligible ? 'Eligible to Donate' : 'Not Eligible Yet',
      lastDonationFormatted
    };
  },

  // Registered Donors for Smart Matching & Admin Governance (Privacy Masked)
  donors: [
    {
      id: 'LL-D1024',
      name: 'Arun Kumar',
      bloodGroup: 'O+',
      distanceKm: 2.8,
      approxArea: 'Hosur (~2.8 km from request)',
      isAvailable: true,
      isVerified: true,
      city: 'Hosur',
      maskedPhone: '+91 ******4321',
      lastDonationDate: '2025-11-10',
      totalDonations: 4,
      livesHelped: 12,
      accountStatus: 'ACTIVE',
      eligibilityStatus: 'Eligible to Donate',
      notificationHistory: [
        { id: 'notif_1', title: '🚨 Emergency Request REQ-1042', time: '10 mins ago', action: 'Accepted' },
        { id: 'notif_2', title: '✓ Donation Confirmed', time: '1 month ago', action: 'Completed' }
      ]
    },
    {
      id: 'LL-D1025',
      name: 'Priya Patel',
      bloodGroup: 'B+',
      distanceKm: 4.1,
      approxArea: 'Bengaluru (~4.1 km from request)',
      isAvailable: true,
      isVerified: true,
      city: 'Bengaluru',
      maskedPhone: '+91 ******9876',
      lastDonationDate: '2026-01-15',
      totalDonations: 2,
      livesHelped: 6,
      accountStatus: 'ACTIVE',
      eligibilityStatus: 'Eligible to Donate',
      notificationHistory: [
        { id: 'notif_3', title: '🚨 Emergency Request REQ-1041', time: '45 mins ago', action: 'Accepted' }
      ]
    },
    {
      id: 'LL-D1026',
      name: 'Rahul Sharma',
      bloodGroup: 'A-',
      distanceKm: 5.5,
      approxArea: 'Chennai (~5.5 km from request)',
      isAvailable: false,
      isVerified: true,
      city: 'Chennai',
      maskedPhone: '+91 ******1122',
      lastDonationDate: '2026-02-28',
      totalDonations: 5,
      livesHelped: 15,
      accountStatus: 'ACTIVE',
      eligibilityStatus: 'Not Eligible Yet (Cooldown: 18 days remaining)',
      notificationHistory: [
        { id: 'notif_4', title: '🚨 Emergency Request REQ-1039', time: '2 hours ago', action: 'Declined' }
      ]
    },
    {
      id: 'LL-D1027',
      name: 'Vikram Singh',
      bloodGroup: 'O-',
      distanceKm: 1.9,
      approxArea: 'Krishnagiri (~1.9 km from request)',
      isAvailable: true,
      isVerified: true,
      city: 'Krishnagiri',
      maskedPhone: '+91 ******3344',
      lastDonationDate: '2025-09-12',
      totalDonations: 6,
      livesHelped: 18,
      accountStatus: 'ACTIVE',
      eligibilityStatus: 'Eligible to Donate (Universal Donor)',
      notificationHistory: [
        { id: 'notif_5', title: '🚨 Emergency Request REQ-1028', time: '3 days ago', action: 'Completed' }
      ]
    },
    {
      id: 'LL-D1028',
      name: 'Neha Gupta',
      bloodGroup: 'AB+',
      distanceKm: 6.2,
      approxArea: 'Hosur (~6.2 km from request)',
      isAvailable: false,
      isVerified: true,
      city: 'Hosur',
      maskedPhone: '+91 ******5566',
      lastDonationDate: '2025-10-05',
      totalDonations: 3,
      livesHelped: 9,
      accountStatus: 'SUSPENDED',
      eligibilityStatus: 'Account Temporarily Inactive',
      notificationHistory: []
    }
  ],

  // Smart Donor Search & Ranked Matching Engine
  matchDonors(requestGroup = 'O+', city = 'Mumbai') {
    return this.donors
      .filter(d => this.isCompatible(d.bloodGroup, requestGroup))
      .map(d => {
        const eligibility = this.calculateEligibility(d.lastDonationDate);
        let dist = d.distanceKm || 2.5;
        
        let waveRound = 'Round 1 (0–3 km)';
        if (dist > 3.0 && dist <= 5.0) waveRound = 'Round 2 (3–5 km)';
        else if (dist > 5.0) waveRound = 'Round 3 (5–8 km)';

        let matchStatus = 'Compatible';
        if (d.bloodGroup === requestGroup && d.isAvailable && eligibility.isEligible) {
          matchStatus = '100% Match • Eligible';
        } else if (!eligibility.isEligible) {
          matchStatus = 'Ineligible (Recent Donor)';
        } else if (!d.isAvailable) {
          matchStatus = 'Unavailable';
        } else if (d.bloodGroup === 'O-') {
          matchStatus = 'Universal Donor Match';
        }

        return {
          ...d,
          approxDistance: `~${dist} km`,
          isEligible: eligibility.isEligible,
          eligibilityStatus: eligibility.statusText,
          nextEligibleFormatted: eligibility.nextEligibleFormatted,
          matchStatus,
          waveRound
        };
      });
  },

  // All 8 Blood Stock Groups Tracking
  bloodStock: [
    { bloodGroup: 'A+', unitsAvailable: 45, maxCapacity: 100, status: 'AVAILABLE' },
    { bloodGroup: 'A-', unitsAvailable: 12, maxCapacity: 100, status: 'LOW' },
    { bloodGroup: 'B+', unitsAvailable: 58, maxCapacity: 100, status: 'AVAILABLE' },
    { bloodGroup: 'B-', unitsAvailable: 18, maxCapacity: 100, status: 'LOW' },
    { bloodGroup: 'AB+', unitsAvailable: 30, maxCapacity: 100, status: 'AVAILABLE' },
    { bloodGroup: 'AB-', unitsAvailable: 6, maxCapacity: 100, status: 'CRITICAL' },
    { bloodGroup: 'O+', unitsAvailable: 75, maxCapacity: 100, status: 'AVAILABLE' },
    { bloodGroup: 'O-', unitsAvailable: 0, maxCapacity: 100, status: 'OUT OF STOCK' }
  ],

  // Update Blood Stock (Authorized User Only)
  updateStock(bloodGroup, action, units = 1) {
    const item = this.bloodStock.find(s => s.bloodGroup === bloodGroup);
    if (!item) return false;

    let qty = parseInt(units) || 1;
    if (action === 'add') item.unitsAvailable += qty;
    else if (action === 'subtract') item.unitsAvailable = Math.max(0, item.unitsAvailable - qty);
    else item.unitsAvailable = Math.max(0, qty);

    if (item.unitsAvailable === 0) item.status = 'OUT OF STOCK';
    else if (item.unitsAvailable <= 8) item.status = 'CRITICAL';
    else if (item.unitsAvailable <= 20) item.status = 'LOW';
    else item.status = 'AVAILABLE';

    return true;
  },

  // Authorized Donation Recording Workflow
  recordDonation(donorId, bloodGroup, donationDate, hospitalName, donationType = 'Whole Blood', units = 1) {
    const donor = this.donors.find(d => d.id === donorId || d.name.toLowerCase().includes(donorId.toLowerCase()));
    const recDate = donationDate ? new Date(donationDate) : new Date();

    if (donor) {
      donor.lastDonationDate = recDate.toISOString().split('T')[0];
      donor.totalDonations = (donor.totalDonations || 0) + units;
      donor.livesHelped = (donor.livesHelped || 0) + (units * 3);
    }

    // Auto-update blood stock inventory (+units)
    this.updateStock(bloodGroup, 'add', units);

    // Save record to local donation history
    const history = JSON.parse(localStorage.getItem('lifelink_donation_history') || '[]');
    const newRecord = {
      id: 'dh_' + Date.now(),
      donorName: donor ? donor.name : 'Arun Kumar',
      bloodGroup,
      unitsDonated: units,
      donationDate: recDate.toISOString().split('T')[0],
      location: hospitalName || 'XYZ Government Hospital, Mumbai',
      donationType,
      status: 'COMPLETED'
    };
    history.unshift(newRecord);
    localStorage.setItem('lifelink_donation_history', JSON.stringify(history));

    return newRecord;
  },

  // Logged-in Donor's Notifications
  notifications: [
    {
      id: 'n1',
      title: '🚨 Urgent O+ Request Nearby',
      message: 'XYZ Government Hospital needs 2 units of O+ blood.',
      locationText: '3.4 km away • Required within 2 hours',
      timeAgo: '10 mins ago',
      isUnread: true,
      requestId: 'REQ-8821'
    },
    {
      id: 'n2',
      title: '✓ Response Confirmed',
      message: 'Your donation commitment was received by XYZ Government Hospital.',
      locationText: 'Hospital contact line is open for your visit',
      timeAgo: '1 hour ago',
      isUnread: true
    },
    {
      id: 'n3',
      title: '🟢 Availability Active',
      message: 'Your profile is currently visible to emergency healthcare providers nearby.',
      locationText: '8 km notification radius enabled',
      timeAgo: 'Yesterday',
      isUnread: false
    }
  ],

  // Active Emergency Blood Requests with Adaptive Wave Notification Metrics
  emergencyRequests: [
    {
      id: 'REQ-1042',
      patientName: 'Emergency ICU Patient #42',
      bloodGroup: 'O+',
      unitsNeeded: 3,
      unitsFulfilled: 2,
      orgName: 'Government General Hospital',
      orgType: 'Government Hospital',
      isVerifiedOrg: true,
      hospitalLocation: 'Hosur, Tamil Nadu',
      distanceKm: 3.2,
      humanDistance: 'Hosur (~3.2 km radius)',
      createdTime: '28 Sep 2026 • 10:42 AM',
      elapsedTime: '11 mins elapsed',
      urgency: 'CRITICAL',
      searchRadiusKm: 5,
      currentWave: 'Round 2 (3–5 km)',
      status: 'ACTIVE',
      donorsNotified: 30,
      responsesCount: 7,
      confirmedCount: 2,
      additionalNotes: 'Critical ICU trauma case. Immediate O+ blood units required.',
      roundsDetail: [
        { roundName: 'Round 1 (0–3 km)', notified: 12, responded: 3, confirmed: 1, status: 'COMPLETED' },
        { roundName: 'Round 2 (3–5 km)', notified: 18, responded: 4, confirmed: 1, status: 'ACTIVE' },
        { roundName: 'Round 3 (5–8 km)', notified: 0, responded: 0, confirmed: 0, status: 'NOT REQUIRED YET' }
      ],
      respondedDonors: [
        { donorId: 'LL-D1024', donorName: 'Arun Kumar', approxDist: '~2.8 km', bloodGroup: 'O+', status: 'Confirmed & En Route' },
        { donorId: 'LL-D1027', donorName: 'Vikram Singh', approxDist: '~1.9 km', bloodGroup: 'O-', status: 'Confirmed (Arrival ~15 mins)' }
      ]
    },
    {
      id: 'REQ-1041',
      patientName: 'Surgical Unit Patient #18',
      bloodGroup: 'B+',
      unitsNeeded: 2,
      unitsFulfilled: 2,
      orgName: 'City Blood Bank',
      orgType: 'Private Blood Bank',
      isVerifiedOrg: true,
      hospitalLocation: 'Bengaluru, Karnataka',
      distanceKm: 2.5,
      humanDistance: 'Bengaluru (~2.5 km radius)',
      createdTime: '28 Sep 2026 • 10:15 AM',
      elapsedTime: '38 mins elapsed',
      urgency: 'HIGH',
      searchRadiusKm: 3,
      currentWave: 'Round 1 (0–3 km)',
      status: 'FULFILLED',
      donorsNotified: 14,
      responsesCount: 4,
      confirmedCount: 2,
      additionalNotes: 'Elective surgery requirement. Required quantity fulfilled.',
      roundsDetail: [
        { roundName: 'Round 1 (0–3 km)', notified: 14, responded: 4, confirmed: 2, status: 'COMPLETED' }
      ],
      respondedDonors: [
        { donorId: 'LL-D1025', donorName: 'Priya Patel', approxDist: '~2.1 km', bloodGroup: 'B+', status: 'Completed' }
      ]
    },
    {
      id: 'REQ-1039',
      patientName: 'Pediatric Care Patient #09',
      bloodGroup: 'AB+',
      unitsNeeded: 1,
      unitsFulfilled: 0,
      orgName: 'Emergency Care Centre',
      orgType: 'Authorized Healthcare Organization',
      isVerifiedOrg: false,
      hospitalLocation: 'Chennai, Tamil Nadu',
      distanceKm: 6.8,
      humanDistance: 'Chennai (~6.8 km radius)',
      createdTime: '28 Sep 2026 • 09:30 AM',
      elapsedTime: '1h 23m elapsed',
      urgency: 'NORMAL',
      searchRadiusKm: 8,
      currentWave: 'Round 3 (5–8 km)',
      status: 'ESCALATED',
      donorsNotified: 38,
      responsesCount: 1,
      confirmedCount: 0,
      additionalNotes: 'Rare blood group request. Wave escalation in progress.',
      roundsDetail: [
        { roundName: 'Round 1 (0–3 km)', notified: 10, responded: 0, confirmed: 0, status: 'COMPLETED' },
        { roundName: 'Round 2 (3–5 km)', notified: 12, responded: 1, confirmed: 0, status: 'COMPLETED' },
        { roundName: 'Round 3 (5–8 km)', notified: 16, responded: 0, confirmed: 0, status: 'ACTIVE' }
      ],
      respondedDonors: []
    },
    {
      id: 'REQ-1031',
      patientName: 'Maternity Ward #12',
      bloodGroup: 'B+',
      unitsNeeded: 2,
      unitsFulfilled: 2,
      orgName: 'District Blood Bank',
      orgType: 'Government Blood Bank',
      isVerifiedOrg: true,
      hospitalLocation: 'Krishnagiri, Tamil Nadu',
      createdTime: '18 Aug 2026',
      urgency: 'NORMAL',
      status: 'FULFILLED',
      donorsNotified: 16,
      confirmedCount: 2
    },
    {
      id: 'REQ-1028',
      patientName: 'Cardiac Care #05',
      bloodGroup: 'O-',
      unitsNeeded: 4,
      unitsFulfilled: 4,
      orgName: 'Government General Hospital',
      orgType: 'Government Hospital',
      isVerifiedOrg: true,
      hospitalLocation: 'Hosur, Tamil Nadu',
      createdTime: '16 Aug 2026',
      urgency: 'CRITICAL',
      status: 'FULFILLED',
      donorsNotified: 45,
      confirmedCount: 4
    },
    {
      id: 'REQ-1024',
      patientName: 'Trauma Unit #02',
      bloodGroup: 'AB+',
      unitsNeeded: 2,
      unitsFulfilled: 0,
      orgName: 'Salem Regional Blood Bank',
      orgType: 'Private Blood Bank',
      isVerifiedOrg: false,
      hospitalLocation: 'Salem, Tamil Nadu',
      createdTime: '14 Aug 2026',
      urgency: 'HIGH',
      status: 'EXPIRED',
      donorsNotified: 22,
      confirmedCount: 0
    }
  ],

  // Radius Wave Escalation Handler
  escalateWave(requestId) {
    const req = this.emergencyRequests.find(r => r.id === requestId);
    if (!req) return false;

    if (req.searchRadiusKm === 3) {
      req.searchRadiusKm = 5;
      req.currentWave = 'Round 2 (3–5 km)';
      req.donorsNotified += 12;
    } else if (req.searchRadiusKm === 5) {
      req.searchRadiusKm = 8;
      req.currentWave = 'Round 3 (5–8 km)';
      req.donorsNotified += 18;
    } else if (req.searchRadiusKm === 8) {
      req.searchRadiusKm = 12;
      req.currentWave = 'Round 4 (8–12 km Extended)';
      req.donorsNotified += 25;
    }
    return req;
  },

  // Certified Blood Banks Directory
  bloodBanks: [
    {
      id: 'bb1',
      bankName: 'City Central Blood Bank',
      licenseNumber: 'LIC-MH-9921',
      city: 'Mumbai',
      address: 'Dr. E Moses Rd, Worli',
      contactPhone: '+91 22 2493 0000',
      verificationStatus: 'VERIFIED',
      operatingHours: '24x7 Emergency Operations'
    },
    {
      id: 'bb2',
      bankName: 'Red Cross Regional Blood Center',
      licenseNumber: 'LIC-DL-4482',
      city: 'Delhi',
      address: '1 Red Cross Rd, Connaught Place',
      contactPhone: '+91 11 2371 6441',
      verificationStatus: 'VERIFIED',
      operatingHours: '24x7 Emergency Operations'
    }
  ],

  // Organization Management Master Store
  organizations: [
    {
      id: 'LL-GH-2026-001',
      name: 'Government General Hospital',
      type: 'Government Hospital',
      location: 'Hosur, Tamil Nadu',
      address: 'Government Hospital Road, Railway Station Area',
      city: 'Hosur',
      state: 'Tamil Nadu',
      pincode: '635109',
      phone: '+91 4344 220000',
      email: 'dispatch@ggh-hosur.tn.gov.in',
      emergencyContact: '+91 98430 12345',
      regNumber: 'GOVT-TN-HOSP-9912',
      issuingAuthority: 'Department of Health & Family Welfare, Govt of Tamil Nadu',
      validUntil: '2030-12-31',
      representative: 'Dr. A. Ramanathan (Medical Superintendent)',
      username: 'govgeneralhosur',
      password: 'Hospital@123',
      registeredMobile: '+91 98430 12345',
      status: 'VERIFIED',
      portalAccess: 'ACTIVE',
      verifiedBy: 'State Health Director',
      verificationDate: '2026-01-10',
      lastUpdated: '28 Sep 2026 • 10:45 AM',
      lastLogin: '28 Sep 2026 • 10:45 AM',
      history: [
        { date: '28 Sep 2026 — 10:45 AM', event: 'Official phone number updated', author: 'System Admin' },
        { date: '28 Sep 2026 — 10:40 AM', event: 'Admin approved change request CHG-1024', author: 'System Admin' },
        { date: '28 Sep 2026 — 10:32 AM', event: 'Organization submitted change request', author: 'Govt General Hospital' },
        { date: '15 Aug 2026', event: 'Organization verified by State Health Board', author: 'Admin' },
        { date: '10 Aug 2026', event: 'Organization registered on LIFE LINK', author: 'System' }
      ]
    },
    {
      id: 'LL-ORG-2026-002',
      name: 'City Blood Bank',
      type: 'Private Blood Bank',
      location: 'Bengaluru, Karnataka',
      address: '12 Brigade Road, Ashok Nagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      phone: '+91 80 2558 9000',
      email: 'info@citybloodbank.org',
      emergencyContact: '+91 98800 55443',
      regNumber: 'BB-KA-2025-441',
      issuingAuthority: 'Karnataka State Blood Transfusion Council',
      validUntil: '2028-06-30',
      representative: 'Dr. Rajesh Vardhan',
      username: 'citybloodbank',
      password: 'BloodBank@123',
      registeredMobile: '+91 98800 55443',
      status: 'VERIFIED',
      portalAccess: 'ACTIVE',
      verifiedBy: 'Karnataka Drug Controller',
      verificationDate: '2026-02-14',
      lastUpdated: '25 Sep 2026',
      lastLogin: '27 Sep 2026 • 09:15 AM',
      history: [
        { date: '25 Sep 2026', event: 'Annual verification compliance checked', author: 'Admin' },
        { date: '14 Feb 2026', event: 'Organization verified', author: 'Admin' }
      ]
    },
    {
      id: 'LL-ORG-2026-003',
      name: 'Emergency Care Centre',
      type: 'Authorized Healthcare Organization',
      location: 'Chennai, Tamil Nadu',
      address: '45 Anna Salai, Thousand Lights',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600006',
      phone: '+91 44 2829 1122',
      email: 'contact@emergencycare.org',
      emergencyContact: '+91 94440 99887',
      regNumber: 'CERT-2026-008',
      issuingAuthority: 'Tamil Nadu Medical Council',
      validUntil: '2027-11-20',
      representative: 'Dr. Meena Sundaram',
      username: 'emergencycare',
      password: 'Care@123',
      registeredMobile: '+91 94440 99887',
      status: 'PENDING VERIFICATION',
      portalAccess: 'LOCKED',
      verifiedBy: 'Pending Review',
      verificationDate: 'Pending',
      lastUpdated: '28 Sep 2026',
      lastLogin: 'Never',
      history: [
        { date: '28 Sep 2026', event: 'Organization application submitted for verification', author: 'Emergency Care Centre' }
      ]
    },
    {
      id: 'LL-ORG-2026-004',
      name: 'District Blood Bank',
      type: 'Government Blood Bank',
      location: 'Krishnagiri, Tamil Nadu',
      address: 'District Headquarters Hospital Campus',
      city: 'Krishnagiri',
      state: 'Tamil Nadu',
      pincode: '635001',
      phone: '+91 4343 232100',
      email: 'dbb.krishnagiri@tn.gov.in',
      emergencyContact: '+91 94432 11000',
      regNumber: 'GOVT-BB-TN-331',
      issuingAuthority: 'Directorate of Medical Services, Govt of Tamil Nadu',
      validUntil: '2029-08-15',
      representative: 'Dr. K. Periasamy',
      username: 'districtbloodbank',
      password: 'District@123',
      registeredMobile: '+91 94432 11000',
      status: 'VERIFIED',
      portalAccess: 'ACTIVE',
      verifiedBy: 'District Collector Officer',
      verificationDate: '2026-03-01',
      lastUpdated: '20 Sep 2026',
      lastLogin: '26 Sep 2026 • 02:30 PM',
      history: [
        { date: '01 Mar 2026', event: 'Organization verified', author: 'Admin' }
      ]
    },
    {
      id: 'LL-ORG-2026-005',
      name: 'Salem Regional Blood Bank',
      type: 'Private Blood Bank',
      location: 'Salem, Tamil Nadu',
      address: '88 Omalur Main Road',
      city: 'Salem',
      state: 'Tamil Nadu',
      pincode: '636009',
      phone: '+91 427 244 5566',
      email: 'salembloodbank@gmail.com',
      emergencyContact: '+91 98427 88990',
      regNumber: 'PBB-SLM-8812',
      issuingAuthority: 'State Licensing Authority',
      validUntil: '2026-09-01',
      representative: 'Dr. S. Thangavel',
      username: 'salembloodbank',
      password: 'Salem@123',
      registeredMobile: '+91 98427 88990',
      status: 'SUSPENDED',
      portalAccess: 'LOCKED',
      suspensionReason: 'Audit non-compliance: Failure to renew mandatory blood storage license.',
      verifiedBy: 'Admin (Suspended)',
      verificationDate: '2025-10-10',
      lastUpdated: '27 Sep 2026',
      lastLogin: '20 Sep 2026',
      history: [
        { date: '27 Sep 2026', event: 'Organization suspended due to license expiry', author: 'Admin' }
      ]
    }
  ],

  // Password Reset Requests Store
  passwordResetRequests: [
    {
      id: 'PRR-1001',
      orgId: 'LL-GH-2026-001',
      orgName: 'Government General Hospital',
      username: 'govgeneralhosur',
      registeredMobile: '+91 ******2345',
      reason: 'I have forgotten the organization portal password after IT system migration.',
      submittedTime: '28 Sep 2026 • 11:05 AM',
      status: 'PENDING'
    }
  ],

  // Change Requests Store
  changeRequests: [
    {
      id: 'CHG-1024',
      orgId: 'LL-GH-2026-001',
      orgName: 'Government General Hospital',
      changeType: 'Official Emergency Phone Number',
      currentValue: '+91 4344 220000',
      requestedValue: '+91 4344 229999',
      fieldToUpdate: 'phone',
      reason: 'Official emergency contact desk number updated by health department.',
      submittedDate: '28 Sep 2026 • 10:32 AM',
      status: 'PENDING'
    },
    {
      id: 'CHG-1025',
      orgId: 'LL-ORG-2026-002',
      orgName: 'City Blood Bank',
      changeType: 'Emergency Representative',
      currentValue: 'Dr. Rajesh Vardhan',
      requestedValue: 'Dr. Ananya Rao (Chief Medical Officer)',
      fieldToUpdate: 'representative',
      reason: 'Change in senior medical officer leadership.',
      submittedDate: '27 Sep 2026 • 04:15 PM',
      status: 'PENDING'
    }
  ],

  // Administrative Audit Logs Store
  auditLogs: [
    { timestamp: '28 Sep 2026 • 11:05 AM', action: 'Password Reset Requested', orgName: 'Government General Hospital', actionType: 'ORGANIZATION_PASSWORD_RESET_REQUESTED', user: 'govgeneralhosur', details: 'Organization requested portal password reset via security recovery form.' },
    { timestamp: '28 Sep 2026 • 10:45 AM', action: 'Organization Updated', orgName: 'Government General Hospital', actionType: 'UPDATE', user: 'System Admin', details: 'Phone number changed after approved request CHG-1024' },
    { timestamp: '28 Sep 2026 • 10:40 AM', action: 'Change Request Approved', orgName: 'Government General Hospital', actionType: 'APPROVAL', user: 'System Admin', details: 'CHG-1024 approved by System Admin' },
    { timestamp: '27 Sep 2026 • 02:30 PM', action: 'Organization Suspended', orgName: 'Salem Regional Blood Bank', actionType: 'ORGANIZATION_ACCOUNT_SUSPENDED', user: 'System Admin', details: 'Suspended due to license renewal compliance delay' },
    { timestamp: '15 Aug 2026 • 09:00 AM', action: 'Organization Verified', orgName: 'Government General Hospital', actionType: 'ORGANIZATION_VERIFIED', user: 'State Health Director', details: 'Verification completed by State Health Board' },
    { timestamp: '10 Aug 2026 • 11:15 AM', action: 'Organization Created', orgName: 'Government General Hospital', actionType: 'ORGANIZATION_CREATED', user: 'System Admin', details: 'Organization record LL-GH-2026-001 created' }
  ],

  // Admin Audit Log Creator
  logAudit(action, orgName, actionType, details, user = 'System') {
    const newLog = {
      timestamp: new Date().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      action,
      orgName: orgName || 'System',
      actionType,
      user,
      details
    };
    this.auditLogs.unshift(newLog);
    // Save to localStorage
    try {
      localStorage.setItem('lifelink_audit_logs', JSON.stringify(this.auditLogs));
    } catch(e) {}
    return newLog;
  },

  // ----------------------------------------------------
  // DONOR MODULE IMPROVEMENTS & STATE HELPERS
  // ----------------------------------------------------

  // 1. Availability Management
  getDonorAvailability() {
    try {
      const data = localStorage.getItem('lifelink_donor_availability');
      if (data) return JSON.parse(data);
    } catch(e) {}
    return { status: 'AVAILABLE', pausedUntil: null, pausedAt: null };
  },

  setDonorAvailability(status, duration = 'Until I Resume') {
    let pausedAt = null;
    let pausedUntil = null;
    if (status === 'PAUSED') {
      pausedAt = new Date().toISOString();
      const now = new Date();
      if (duration === '1 Day') {
        now.setDate(now.getDate() + 1);
        pausedUntil = now.toISOString();
      } else if (duration === '3 Days') {
        now.setDate(now.getDate() + 3);
        pausedUntil = now.toISOString();
      } else {
        pausedUntil = 'RESUME_MANUAL';
      }
    }

    const stateObj = { status, duration, pausedAt, pausedUntil };
    localStorage.setItem('lifelink_donor_availability', JSON.stringify(stateObj));

    // Update current donor in MockData donors list
    const donor = this.donors.find(d => d.id === 'LL-D1024');
    if (donor) {
      donor.isAvailable = (status === 'AVAILABLE');
    }

    return stateObj;
  },

  isDonorAvailable() {
    const avail = this.getDonorAvailability();
    return avail.status === 'AVAILABLE';
  },

  // 2. Donation Radius Management (default 5 km)
  getDonationRadius() {
    try {
      const radius = localStorage.getItem('lifelink_donation_radius');
      if (radius) return parseInt(radius, 10);
    } catch(e) {}
    return 5;
  },

  setDonationRadius(radiusKm) {
    const num = parseInt(radiusKm, 10) || 5;
    localStorage.setItem('lifelink_donation_radius', num.toString());
    return num;
  },

  // 3. Website 24-Hour Pause Reminder Handler
  checkPauseReminder() {
    const avail = this.getDonorAvailability();
    if (avail.status !== 'PAUSED' || !avail.pausedAt) return false;

    const pausedTime = new Date(avail.pausedAt).getTime();
    const nowTime = new Date().getTime();
    const diffHours = (nowTime - pausedTime) / (1000 * 60 * 60);

    // Check if 24 hours passed or if simulated pause active
    const reminderSent = localStorage.getItem('lifelink_pause_reminder_sent');
    if ((diffHours >= 24 || avail.simulated24h) && !reminderSent) {
      const newNotif = {
        id: 'notif_pause_reminder_' + Date.now(),
        title: 'Your donor availability is still paused',
        message: "You have been unavailable for more than 24 hours. If you're ready to help again, resume your availability to receive compatible emergency requests.",
        timeAgo: '24h Reminder',
        isUnread: true,
        type: 'PAUSE_REMINDER',
        locationText: 'Availability Status: Paused'
      };

      if (Array.isArray(this.notifications)) {
        // Prevent duplicate
        const exists = this.notifications.some(n => n.type === 'PAUSE_REMINDER');
        if (!exists) {
          this.notifications.unshift(newNotif);
        }
      }
      localStorage.setItem('lifelink_pause_reminder_sent', 'true');
      return true;
    }
    return false;
  },

  // 4. Referrals & Recognition Store
  getReferrals() {
    try {
      const data = localStorage.getItem('lifelink_referrals');
      if (data) return JSON.parse(data);
    } catch(e) {}

    // Initial default pre-seeded referral data for demonstration
    const defaultReferrals = [
      {
        id: 'REF-8921',
        refToken: 'LL-REF-8921-TOKEN',
        anonymizedPhone: '+91 98*** **321',
        rawPhone: '9876543321',
        friendBloodGroup: 'O+',
        referralDate: '2026-10-01',
        status: 'Donation Completed',
        requestId: 'REQ-8821',
        isVerified: true,
        isMatched: true,
        hasResponded: true,
        hasDonated: true
      },
      {
        id: 'REF-8922',
        refToken: 'LL-REF-8922-TOKEN',
        anonymizedPhone: '+91 94*** **567',
        rawPhone: '9456712345',
        friendBloodGroup: 'O+',
        referralDate: '2026-10-02',
        status: 'OTP Verified',
        requestId: 'REQ-8822',
        isVerified: true,
        isMatched: true,
        hasResponded: false,
        hasDonated: false
      },
      {
        id: 'REF-8923',
        refToken: 'LL-REF-8923-TOKEN',
        anonymizedPhone: '+91 97*** **890',
        rawPhone: '9789012345',
        friendBloodGroup: 'B+',
        referralDate: '2026-09-28',
        status: 'Not Compatible',
        requestId: 'REQ-8821',
        isVerified: true,
        isMatched: false,
        hasResponded: false,
        hasDonated: false
      }
    ];

    localStorage.setItem('lifelink_referrals', JSON.stringify(defaultReferrals));
    return defaultReferrals;
  },

  addReferral(mobileNumber, requestId = 'REQ-8821') {
    const referrals = this.getReferrals();
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    const anonymized = cleanMobile.length >= 10 
      ? `+91 ${cleanMobile.substring(0,2)}*** **${cleanMobile.substring(7)}` 
      : `+91 ${cleanMobile} (Anonymized)`;

    const randomId = 'REF-' + Math.floor(8000 + Math.random() * 1000);
    const token = 'LL-REF-TOKEN-' + Date.now();

    const newRef = {
      id: randomId,
      refToken: token,
      anonymizedPhone: anonymized,
      rawPhone: cleanMobile,
      referralDate: new Date().toISOString().split('T')[0],
      status: 'Invitation Sent',
      requestId: requestId,
      isVerified: false,
      isMatched: false,
      hasResponded: false,
      hasDonated: false
    };

    referrals.unshift(newRef);
    localStorage.setItem('lifelink_referrals', JSON.stringify(referrals));
    return newRef;
  },

  calculateReferralStats() {
    const referrals = this.getReferrals();
    const totalReferred = referrals.length;
    const verifiedCount = referrals.filter(r => r.isVerified || r.status !== 'Invitation Sent').length;
    const matchedCount = referrals.filter(r => r.isMatched || r.status === 'Matched' || r.status === 'Emergency Response' || r.status === 'Donation Completed').length;
    const respondedCount = referrals.filter(r => r.hasResponded || r.status === 'Emergency Response' || r.status === 'Donation Completed').length;
    const donatedCount = referrals.filter(r => r.hasDonated || r.status === 'Donation Completed').length;

    const successRate = totalReferred > 0 
      ? ((donatedCount / totalReferred) * 100).toFixed(1)
      : '0.0';

    return {
      totalReferred,
      verifiedCount,
      matchedCount,
      respondedCount,
      donatedCount,
      successRate
    };
  },

  // ----------------------------------------------------
  // ORGANIZATION MODULE & ADAPTIVE DISPATCH HELPERS
  // ----------------------------------------------------

  // 1. Organization Profile Management
  getOrgProfile() {
    try {
      const data = localStorage.getItem('lifelink_org_profile');
      if (data) return JSON.parse(data);
    } catch(e) {}

    return {
      id: 'LL-GH-2026-001',
      name: 'Government General Hospital',
      type: 'Government Hospital',
      certificationNo: 'LL-GH-2026-001',
      address: 'Government Hospital Road, Railway Station Area, Hosur, Tamil Nadu 635109',
      email: 'dispatch@ggh-hosur.tn.gov.in',
      deskPhone: '+91 4344 220000',
      emergencyHotline: '+91 98430 12345',
      contactPerson: 'Dr. Rajesh Vardhan (Chief Medical Officer)',
      verificationStatus: 'VERIFIED',
      imageUrl: 'assets/images/lifelink-logo.png'
    };
  },

  saveOrgProfile(data) {
    const current = this.getOrgProfile();
    const updated = { ...current, ...data };
    localStorage.setItem('lifelink_org_profile', JSON.stringify(updated));
    this.logAudit('Organization Profile Updated', updated.name, 'ORGANIZATION_PROFILE_UPDATE', `Updated organization contact & profile details by ${updated.contactPerson || 'Authorized User'}`);
    return updated;
  },

  // 2. Adaptive Dispatch Settings Management
  getAdaptiveDispatchSettings() {
    try {
      const data = localStorage.getItem('lifelink_adaptive_settings');
      if (data) return JSON.parse(data);
    } catch(e) {}

    return {
      initialRadius: 3,
      expansionStep: 2,
      maxRadius: 8,
      requiredConfirmations: 3,
      evaluationWindow: 10,
      renotificationCooldown: 24,
      deprioritizeRecent: true,
      maxNotificationsPerEmergency: 1,
      exactAddressHidden: true,
      approximateDistanceDisplay: true,
      rbacEnforced: true,
      orgVerificationRequired: true,
      auditLoggingEnabled: true
    };
  },

  saveAdaptiveDispatchSettings(settings) {
    const current = this.getAdaptiveDispatchSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem('lifelink_adaptive_settings', JSON.stringify(updated));
    this.logAudit('System Settings Updated', 'System Admin', 'SYSTEM_SETTINGS_UPDATE', `Adaptive dispatch settings updated: ${updated.initialRadius}km initial, ${updated.expansionStep}km step, ${updated.maxRadius}km max`);
    return updated;
  },

  calculateDispatchRounds(initialRadius = 3, expansionStep = 2, maxRadius = 8) {
    const init = parseInt(initialRadius, 10) || 3;
    const step = parseInt(expansionStep, 10) || 2;
    const max = parseInt(maxRadius, 10) || 8;

    const rounds = [];
    let currentStart = 0;
    let currentEnd = init;
    let roundNum = 1;

    while (currentStart < max) {
      if (currentEnd > max) currentEnd = max;
      rounds.push({
        round: roundNum,
        label: `Round ${roundNum} (${currentStart}–${currentEnd} km)`,
        startKm: currentStart,
        endKm: currentEnd
      });

      if (currentEnd >= max) break;
      currentStart = currentEnd;
      currentEnd = currentStart + step;
      roundNum++;
    }

    return rounds;
  },

  // 3. Responder Pool & Fulfillment Workflow Store
  getRespondersForRequest(requestId = 'REQ-1042') {
    try {
      const data = localStorage.getItem('lifelink_responders_' + requestId);
      if (data) return JSON.parse(data);
    } catch(e) {}

    // Pre-seeded responder pool for demonstration (e.g. 8 responded, 3 required)
    const defaultResponders = [
      { id: 'LL-D-1024', name: 'Arun Kumar', bloodGroup: 'O+', distanceKm: 1.8, responseTime: '8 mins ago', status: 'CONFIRMED', phone: '+91 98765 43210', maskedPhone: '+91 ******4321', arrived: false },
      { id: 'LL-D-1028', name: 'Priya Patel', bloodGroup: 'O+', distanceKm: 2.7, responseTime: '12 mins ago', status: 'CONFIRMED', phone: '+91 98800 12345', maskedPhone: '+91 ******2345', arrived: false },
      { id: 'LL-D-1031', name: 'Rahul Sharma', bloodGroup: 'O+', distanceKm: 3.2, responseTime: '15 mins ago', status: 'CONFIRMED', phone: '+91 97654 32109', maskedPhone: '+91 ******2109', arrived: false },
      { id: 'LL-D-1035', name: 'Vikram Singh', bloodGroup: 'O+', distanceKm: 3.8, responseTime: '18 mins ago', status: 'STANDBY', phone: '+91 96543 21098', maskedPhone: '+91 ******1098', arrived: false },
      { id: 'LL-D-1038', name: 'Ananya Rao', bloodGroup: 'O+', distanceKm: 4.5, responseTime: '22 mins ago', status: 'STANDBY', phone: '+91 95432 10987', maskedPhone: '+91 ******0987', arrived: false },
      { id: 'LL-D-1042', name: 'Karthik Raja', bloodGroup: 'O+', distanceKm: 5.1, responseTime: '25 mins ago', status: 'STANDBY', phone: '+91 94321 09876', maskedPhone: '+91 ******9876', arrived: false },
      { id: 'LL-D-1045', name: 'Meera Nair', bloodGroup: 'O+', distanceKm: 5.8, responseTime: '28 mins ago', status: 'NO_LONGER_REQUIRED', phone: '+91 93210 98765', maskedPhone: '+91 ******8765', arrived: false },
      { id: 'LL-D-1050', name: 'Siddharth V', bloodGroup: 'O+', distanceKm: 6.4, responseTime: '30 mins ago', status: 'NO_LONGER_REQUIRED', phone: '+91 92109 87654', maskedPhone: '+91 ******7654', arrived: false }
    ];

    localStorage.setItem('lifelink_responders_' + requestId, JSON.stringify(defaultResponders));
    return defaultResponders;
  },

  updateResponderStatus(requestId, donorId, newStatus) {
    const responders = this.getRespondersForRequest(requestId);
    const donor = responders.find(r => r.id === donorId);
    if (donor) {
      donor.status = newStatus;
      localStorage.setItem('lifelink_responders_' + requestId, JSON.stringify(responders));
      this.logAudit(`Donor Status Changed to ${newStatus}`, donor.name, 'DONOR_STATUS_UPDATE', `Donor ${donor.id} (${donor.name}) status updated to ${newStatus} for request ${requestId}`);
    }
    return responders;
  },

  markDonorArrived(requestId, donorId) {
    const responders = this.getRespondersForRequest(requestId);
    const donor = responders.find(r => r.id === donorId);
    if (donor) {
      donor.arrived = true;
      donor.status = 'ARRIVED';
      localStorage.setItem('lifelink_responders_' + requestId, JSON.stringify(responders));
      this.logAudit('Donor Marked Arrived', donor.name, 'DONOR_ARRIVED', `Organization verified physical arrival of donor ${donor.name} (${donor.id}) for request ${requestId}`);
    }
    return responders;
  },

  markRequestFulfilled(requestId = 'REQ-1042') {
    const responders = this.getRespondersForRequest(requestId);
    // Mark remaining non-confirmed responders as NO_LONGER_REQUIRED
    responders.forEach(r => {
      if (r.status === 'STANDBY' || r.status === 'RESPONDED') {
        r.status = 'NO_LONGER_REQUIRED';
      }
    });
    localStorage.setItem('lifelink_responders_' + requestId, JSON.stringify(responders));

    this.logAudit('Fulfillment Confirmed', 'Government General Hospital', 'REQUEST_FULFILLED', `Emergency request ${requestId} marked FULFILLED. Stopped further donor dispatch.`);
    return true;
  },

  // 4. Organization-to-Organization Support Store
  getOrgSupportRequests() {
    try {
      const data = localStorage.getItem('lifelink_org_support_requests');
      if (data) return JSON.parse(data);
    } catch(e) {}

    const defaultSupport = [
      {
        id: 'SUP-2026-001',
        requestingOrg: 'Government General Hospital',
        receivingOrg: 'City Blood Bank',
        bloodGroup: 'O+',
        component: 'Packed Red Cells',
        unitsRequired: 3,
        urgency: 'CRITICAL',
        requiredBy: '2 hours',
        status: 'Support Requested',
        timestamp: '2026-10-02 11:30 AM'
      },
      {
        id: 'SUP-2026-002',
        requestingOrg: 'District Blood Bank',
        receivingOrg: 'Government General Hospital',
        bloodGroup: 'AB-',
        component: 'Platelets',
        unitsRequired: 2,
        urgency: 'HIGH',
        requiredBy: '4 hours',
        status: 'Accepted',
        timestamp: '2026-10-02 09:15 AM'
      }
    ];

    localStorage.setItem('lifelink_org_support_requests', JSON.stringify(defaultSupport));
    return defaultSupport;
  },

  createOrgSupportRequest(data) {
    const requests = this.getOrgSupportRequests();
    const newSupport = {
      id: 'SUP-2026-' + Math.floor(100 + Math.random() * 900),
      requestingOrg: data.requestingOrg || 'Government General Hospital',
      receivingOrg: data.receivingOrg || 'City Blood Bank',
      bloodGroup: data.bloodGroup || 'O+',
      component: data.component || 'Whole Blood',
      unitsRequired: parseInt(data.unitsRequired, 10) || 3,
      urgency: data.urgency || 'CRITICAL',
      requiredBy: data.requiredBy || '3 hours',
      status: 'Support Requested',
      timestamp: new Date().toLocaleString()
    };

    requests.unshift(newSupport);
    localStorage.setItem('lifelink_org_support_requests', JSON.stringify(requests));
    this.logAudit('Organization Support Requested', newSupport.requestingOrg, 'ORG_SUPPORT_REQUESTED', `Requested ${newSupport.unitsRequired} units ${newSupport.bloodGroup} support from ${newSupport.receivingOrg}`);
    return newSupport;
  },

  updateOrgSupportStatus(supportId, newStatus) {
    let requests = this.getOrgSupportRequests();
    const target = requests.find(s => s.id === supportId);
    if (target) {
      target.status = newStatus;
      localStorage.setItem('lifelink_org_support_requests', JSON.stringify(requests));
      this.logAudit(`Organization Support Status: ${newStatus}`, target.receivingOrg, 'ORG_SUPPORT_STATUS_UPDATE', `Inter-organization support ${supportId} updated to ${newStatus}`);
    }
    return requests;
  }
};

// Check pause reminder initialization
if (typeof MockData !== 'undefined' && typeof MockData.checkPauseReminder === 'function') {
  MockData.checkPauseReminder();
}

// Explicitly attach to window object for global availability
if (typeof window !== 'undefined') {
  window.MockData = MockData;
}

