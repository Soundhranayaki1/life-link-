const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Organization = require('../models/Organization');
const BloodBank = require('../models/BloodBank');
const BloodStock = require('../models/BloodStock');
const BloodRequest = require('../models/BloodRequest');

dotenv.config();

const defaultPassword = bcrypt.hashSync('password123', 10);

const seedData = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifelink';
    console.log(`Connecting to MongoDB at ${connUri}...`);

    await mongoose.connect(connUri, { serverSelectionTimeoutMS: 5000, dbName: 'lifelink' });
    console.log('Connected to MongoDB for seeding.');

    // Clear existing collections
    await User.deleteMany();
    await DonorProfile.deleteMany();
    await Organization.deleteMany();
    await BloodBank.deleteMany();
    await BloodStock.deleteMany();
    await BloodRequest.deleteMany();
    console.log('Cleared existing MongoDB collections.');

    // 1. Create Verified Donors (OTP Verified)
    const donorUser1 = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      password: defaultPassword,
      phone: '+91 98765 43210',
      role: 'Donor',
      status: 'VERIFIED',
      isMobileVerified: true
    });

    await DonorProfile.create({
      userId: donorUser1._id,
      bloodGroup: 'O-',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      address: 'Andheri East',
      verificationStatus: 'VERIFIED',
      isAvailable: true,
      totalDonations: 4,
      lastDonationDate: new Date('2025-11-10')
    });

    const donorUser2 = await User.create({
      name: 'Priya Patel',
      email: 'priya.patel@example.com',
      password: defaultPassword,
      phone: '+91 98123 45678',
      role: 'Donor',
      status: 'VERIFIED',
      isMobileVerified: true
    });

    await DonorProfile.create({
      userId: donorUser2._id,
      bloodGroup: 'A+',
      city: 'Delhi',
      district: 'Central Delhi',
      address: 'Connaught Place',
      verificationStatus: 'VERIFIED',
      isAvailable: true,
      totalDonations: 2,
      lastDonationDate: new Date('2026-01-15')
    });

    // 2. Create Verified Government Hospital Organization
    const hospitalUser = await User.create({
      name: 'Apollo Government Hospital',
      email: 'contact@apollohosp.gov.in',
      password: defaultPassword,
      phone: '+91 22 2493 1111',
      role: 'Organization',
      status: 'VERIFIED',
      isMobileVerified: true
    });

    const hospitalOrg = await Organization.create({
      userId: hospitalUser._id,
      orgName: 'Apollo Government Hospital',
      orgType: 'GovtHospital',
      certificationNumber: 'GOVT-HOSP-2026-991',
      officialPhone: '+91 22 2493 1111',
      officialEmail: 'contact@apollohosp.gov.in',
      address: 'Central Hospital Zone, Worli',
      city: 'Mumbai',
      district: 'Mumbai City',
      representativeName: 'Dr. S. K. Mehta',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date()
    });

    // 3. Create Pending Organization
    const pendingOrgUser = await User.create({
      name: 'Red Cross Regional Blood Bank',
      email: 'info@redcrossblood.org',
      password: defaultPassword,
      phone: '+91 11 2371 6441',
      role: 'Organization',
      status: 'PENDING_VERIFICATION',
      isMobileVerified: true
    });

    await Organization.create({
      userId: pendingOrgUser._id,
      orgName: 'Red Cross Regional Blood Bank',
      orgType: 'CertifiedBloodBank',
      certificationNumber: 'BB-LIC-8820',
      officialPhone: '+91 11 2371 6441',
      officialEmail: 'info@redcrossblood.org',
      address: '1 Red Cross Rd, Connaught Place',
      city: 'Delhi',
      district: 'New Delhi',
      representativeName: 'Dr. Ananya Roy',
      verificationStatus: 'PENDING_VERIFICATION'
    });

    // 4. Create Blood Bank Facility & Stock
    const bankUser = await User.create({
      name: 'City Central Blood Bank',
      email: 'admin@citybloodbank.org',
      password: defaultPassword,
      phone: '+91 22 2493 0000',
      role: 'BloodBank',
      status: 'VERIFIED',
      isMobileVerified: true
    });

    const bankProfile = await BloodBank.create({
      userId: bankUser._id,
      bankName: 'City Central Blood Bank',
      licenseNumber: 'LIC-MH-9921',
      city: 'Mumbai',
      district: 'Mumbai City',
      address: 'Dr. E Moses Rd, Worli',
      contactPhone: '+91 22 2493 0000',
      verificationStatus: 'Approved'
    });

    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const defaultUnits = [45, 12, 58, 18, 30, 8, 75, 15];
    for (let i = 0; i < groups.length; i++) {
      await BloodStock.create({
        bloodBankId: bankProfile._id,
        bloodGroup: groups[i],
        unitsAvailable: defaultUnits[i]
      });
    }

    // 5. Create Emergency Request posted by Verified Organization
    await BloodRequest.create({
      patientName: 'Karan Malhotra',
      organizationId: hospitalOrg._id,
      authorizedUserId: hospitalUser._id,
      orgName: '✓ VERIFIED GOVERNMENT HOSPITAL (Apollo Hospital)',
      orgType: 'GovtHospital',
      hospitalName: 'Apollo Government Hospital',
      bloodGroup: 'O-',
      unitsNeeded: 3,
      unitsFulfilled: 1,
      city: 'Mumbai',
      contactPhone: '+91 22 2493 1111',
      urgency: 'Critical',
      status: 'Pending',
      additionalNotes: 'Urgent surgery scheduled in ICU. Verified O- donor needed within 2 hours.'
    });

    // 6. Create Admin User
    await User.create({
      name: 'System Administrator',
      email: 'admin@lifelink.org',
      password: defaultPassword,
      phone: '+91 90000 11111',
      role: 'Admin',
      status: 'VERIFIED',
      isMobileVerified: true
    });

    console.log('\n[SUCCESS] HealthTech Verified Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n[ERROR] Seeding failed:', error.message);
    process.exit(1);
  }
};

seedData();
