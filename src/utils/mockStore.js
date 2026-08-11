const bcrypt = require('bcryptjs');

// Pre-hashed default password 'password123'
const defaultHashedPassword = bcrypt.hashSync('password123', 10);

const mockUsers = [
  {
    _id: '65c123456789012345678901',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    password: defaultHashedPassword,
    phone: '+91 98765 43210',
    role: 'Donor',
    bloodGroup: 'O-',
    city: 'Mumbai',
    address: 'Andheri East',
    isAvailable: true,
    lastDonationDate: '2025-11-10T00:00:00.000Z',
    totalDonations: 4,
    age: 26,
    gender: 'Male',
    createdAt: new Date()
  },
  {
    _id: '65c123456789012345678902',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    password: defaultHashedPassword,
    phone: '+91 98123 45678',
    role: 'Donor',
    bloodGroup: 'A+',
    city: 'Delhi',
    address: 'Connaught Place',
    isAvailable: true,
    lastDonationDate: '2026-01-15T00:00:00.000Z',
    totalDonations: 2,
    age: 24,
    gender: 'Female',
    createdAt: new Date()
  },
  {
    _id: '65c123456789012345678903',
    name: 'Dr. Amitav Roy',
    email: 'amitav.roy@cityhospital.org',
    password: defaultHashedPassword,
    phone: '+91 99887 76655',
    role: 'Hospital',
    bloodGroup: 'B+',
    city: 'Bangalore',
    address: 'Indiranagar Main Rd',
    isAvailable: false,
    lastDonationDate: null,
    totalDonations: 0,
    age: 42,
    gender: 'Male',
    createdAt: new Date()
  },
  {
    _id: '65c123456789012345678904',
    name: 'Ananya Deshmukh',
    email: 'ananya.d@example.com',
    password: defaultHashedPassword,
    phone: '+91 97654 32109',
    role: 'Donor',
    bloodGroup: 'AB+',
    city: 'Pune',
    address: 'Kothrud',
    isAvailable: true,
    lastDonationDate: '2025-08-20T00:00:00.000Z',
    totalDonations: 5,
    age: 29,
    gender: 'Female',
    createdAt: new Date()
  },
  {
    _id: '65c123456789012345678905',
    name: 'Siddharth Nair',
    email: 'siddharth.nair@example.com',
    password: defaultHashedPassword,
    phone: '+91 94433 22110',
    role: 'Donor',
    bloodGroup: 'O+',
    city: 'Chennai',
    address: 'T. Nagar',
    isAvailable: true,
    lastDonationDate: '2026-02-01T00:00:00.000Z',
    totalDonations: 3,
    age: 31,
    gender: 'Male',
    createdAt: new Date()
  },
  {
    _id: '65c123456789012345678906',
    name: 'Dr. Sarah Khan',
    email: 'admin@lifelink.org',
    password: defaultHashedPassword,
    phone: '+91 90000 11111',
    role: 'Admin',
    bloodGroup: 'O-',
    city: 'Mumbai',
    address: 'LifeLink HQ',
    isAvailable: true,
    lastDonationDate: null,
    totalDonations: 6,
    age: 35,
    gender: 'Female',
    createdAt: new Date()
  }
];

const mockRequests = [
  {
    _id: '65r123456789012345678901',
    patientName: 'Karan Malhotra',
    requesterId: '65c123456789012345678903',
    requesterName: 'Dr. Amitav Roy',
    hospitalName: 'Apollo Speciality Hospital',
    bloodGroup: 'O-',
    unitsNeeded: 3,
    unitsFulfilled: 1,
    city: 'Mumbai',
    contactPhone: '+91 98765 00000',
    urgency: 'Critical',
    status: 'Pending',
    additionalNotes: 'Urgent surgery scheduled. Universal donor needed immediately.',
    dateNeededBy: new Date(Date.now() + 24 * 60 * 60 * 1000),
    respondedDonors: [
      {
        donorId: '65c123456789012345678901',
        donorName: 'Rahul Sharma',
        donorPhone: '+91 98765 43210',
        status: 'Accepted',
        respondedAt: new Date()
      }
    ],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
  },
  {
    _id: '65r123456789012345678902',
    patientName: 'Sunita Verma',
    requesterId: '65c123456789012345678902',
    requesterName: 'Priya Patel',
    hospitalName: 'Fortis Hospital',
    bloodGroup: 'B+',
    unitsNeeded: 2,
    unitsFulfilled: 2,
    city: 'Delhi',
    contactPhone: '+91 98123 99999',
    urgency: 'High',
    status: 'Fulfilled',
    additionalNotes: 'Dengue treatment requirement fulfilled thanks to donors!',
    dateNeededBy: new Date(Date.now() + 48 * 60 * 60 * 1000),
    respondedDonors: [],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    _id: '65r123456789012345678903',
    patientName: 'Vikram Joshi',
    requesterId: '65c123456789012345678904',
    requesterName: 'Ananya Deshmukh',
    hospitalName: 'Manipal Hospital',
    bloodGroup: 'A+',
    unitsNeeded: 4,
    unitsFulfilled: 2,
    city: 'Bangalore',
    contactPhone: '+91 97654 88888',
    urgency: 'Normal',
    status: 'In Progress',
    additionalNotes: 'Scheduled procedure on weekend.',
    dateNeededBy: new Date(Date.now() + 72 * 60 * 60 * 1000),
    respondedDonors: [],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
  }
];

const mockInventory = [
  { bloodGroup: 'A+', unitsAvailable: 45, lastUpdated: new Date() },
  { bloodGroup: 'A-', unitsAvailable: 12, lastUpdated: new Date() },
  { bloodGroup: 'B+', unitsAvailable: 58, lastUpdated: new Date() },
  { bloodGroup: 'B-', unitsAvailable: 18, lastUpdated: new Date() },
  { bloodGroup: 'AB+', unitsAvailable: 30, lastUpdated: new Date() },
  { bloodGroup: 'AB-', unitsAvailable: 8, lastUpdated: new Date() },
  { bloodGroup: 'O+', unitsAvailable: 75, lastUpdated: new Date() },
  { bloodGroup: 'O-', unitsAvailable: 15, lastUpdated: new Date() }
];

module.exports = {
  mockUsers,
  mockRequests,
  mockInventory
};
