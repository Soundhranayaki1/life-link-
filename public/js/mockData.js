/**
 * LIFE LINK – Mock Data Store for Role-Based Experience
 */

const MockData = {
  // Blood compatibility checker
  isCompatible(donorGroup, reqGroup) {
    if (donorGroup === 'O-') return true; // Universal donor
    if (donorGroup === 'O+' && (reqGroup === 'O+' || reqGroup === 'A+' || reqGroup === 'B+' || reqGroup === 'AB+')) return true;
    if (donorGroup === reqGroup) return true;
    return false;
  },

  // Logged-in Donor's Personal Notifications
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
    },
    {
      id: 'n4',
      title: '👤 Donor Profile Verified',
      message: 'Mobile verification and blood group details recorded successfully.',
      locationText: 'Verified Voluntary Donor',
      timeAgo: '2 days ago',
      isUnread: false
    }
  ],

  // Registered Donors for Match Engine
  donors: [
    {
      id: 'd1',
      name: 'Arun Kumar',
      bloodGroup: 'O+',
      distanceKm: 1.8,
      isAvailable: true,
      isVerified: true,
      city: 'Mumbai',
      phone: '+91 98765 43210'
    },
    {
      id: 'd2',
      name: 'Priya Patel',
      bloodGroup: 'O+',
      distanceKm: 3.4,
      isAvailable: true,
      isVerified: true,
      city: 'Mumbai',
      phone: '+91 98123 45678'
    }
  ],

  // Active Emergency Blood Requests
  emergencyRequests: [
    {
      id: 'REQ-8821',
      patientName: 'Karan Malhotra',
      bloodGroup: 'O+',
      unitsNeeded: 2,
      unitsFulfilled: 0,
      orgName: 'XYZ Government Hospital',
      orgType: 'GovtHospital',
      isVerifiedOrg: true,
      hospitalLocation: 'XYZ Government Hospital, Worli',
      distanceKm: 3.4,
      humanDistance: '3.4 km from hospital',
      timeRemaining: 'Required within 1h 42m',
      urgency: 'CRITICAL',
      searchRadiusKm: 8,
      status: 'ACTIVE',
      donorsNotified: 18,
      additionalNotes: 'ICU Ward 4. Immediate blood transfusion required for emergency procedure.'
    },
    {
      id: 'REQ-8822',
      patientName: 'Sunita Verma',
      bloodGroup: 'O+',
      unitsNeeded: 3,
      unitsFulfilled: 1,
      orgName: 'Apollo City Hospital',
      orgType: 'CertifiedHospital',
      isVerifiedOrg: true,
      hospitalLocation: 'Apollo Hospital, Bandra East',
      distanceKm: 5.1,
      humanDistance: '5.1 km from hospital',
      timeRemaining: 'Required within 3h 15m',
      urgency: 'URGENT',
      searchRadiusKm: 8,
      status: 'ACTIVE',
      donorsNotified: 24,
      additionalNotes: 'Surgical unit preparation.'
    },
    {
      id: 'REQ-8823',
      patientName: 'Rajesh Nair',
      bloodGroup: 'A+',
      unitsNeeded: 1,
      unitsFulfilled: 0,
      orgName: 'Red Cross Center',
      orgType: 'CertifiedBloodBank',
      isVerifiedOrg: true,
      hospitalLocation: 'Red Cross Center, Andheri West',
      distanceKm: 4.2,
      humanDistance: '4.2 km from facility',
      timeRemaining: 'Required within 5 hours',
      urgency: 'STANDARD',
      searchRadiusKm: 8,
      status: 'ACTIVE',
      donorsNotified: 12,
      additionalNotes: 'Routine requirement.'
    }
  ],

  // Certified Blood Banks Directory
  bloodBanks: [
    {
      id: 'bb1',
      bankName: 'City Central Blood Bank',
      licenseNumber: 'LIC-MH-9921',
      city: 'Mumbai',
      address: 'Dr. E Moses Rd, Worli',
      contactPhone: '+91 22 2493 0000',
      verificationStatus: 'VERIFIED'
    }
  ]
};
