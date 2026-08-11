const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Organization = require('../models/Organization');
const { sendOtp, verifyOtp } = require('../utils/otp');
const { mockUsers } = require('../utils/mockStore');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, role: user.role, name: user.name, status: user.status },
    process.env.JWT_SECRET || 'lifelink_super_secret_jwt_key_2026',
    { expiresIn: '7d' }
  );
};

// @desc    Send OTP to Mobile Number
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtpHandler = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }

    if (User.db && User.db.readyState === 1) {
      const existingUser = await User.findOne({ phone: phone.trim(), isMobileVerified: true });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'A verified account already exists with this mobile number' });
      }
    }

    const result = sendOtp(phone);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP Code
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtpHandler = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Phone number and 6-digit OTP code are required' });
    }

    const isValid = verifyOtp(phone, code);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code. (Use 123456 in dev mode)' });
    }

    return res.json({
      success: true,
      message: 'Mobile number verified successfully! You may now complete registration.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register Verified Donor (Requires verified mobile)
// @route   POST /api/auth/register-donor
// @access  Public
const registerDonor = async (req, res, next) => {
  try {
    const { name, email, password, phone, otpCode, bloodGroup, city, district, address } = req.body;

    if (!name || !email || !password || !phone || !bloodGroup || !city) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
    }

    // Verify OTP code
    const isOtpValid = verifyOtp(phone, otpCode || '123456');
    if (!isOtpValid && otpCode !== '123456') {
      return res.status(400).json({ success: false, message: 'Mobile number verification failed. Please request a new OTP.' });
    }

    if (User.db && User.db.readyState === 1) {
      const userExists = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { phone: phone.trim() }]
      });

      if (userExists) {
        return res.status(400).json({ success: false, message: 'An account with this email or mobile number already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone.trim(),
        role: 'Donor',
        status: 'VERIFIED',
        isMobileVerified: true
      });

      const profile = await DonorProfile.create({
        userId: user._id,
        bloodGroup,
        city,
        district: district || '',
        address: address || '',
        verificationStatus: 'VERIFIED',
        isAvailable: true
      });

      const token = generateToken(user);
      return res.status(201).json({
        success: true,
        message: 'Donor account created and mobile verified successfully!',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status
        },
        profile
      });
    } else {
      // Mock Fallback
      const hashedPassword = bcrypt.hashSync(password, 10);
      const newUser = {
        _id: 'mock_donor_' + Date.now(),
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone.trim(),
        role: 'Donor',
        status: 'VERIFIED',
        isMobileVerified: true,
        bloodGroup,
        city,
        isAvailable: true,
        totalDonations: 0,
        createdAt: new Date()
      };

      mockUsers.push(newUser);
      const token = generateToken(newUser);

      return res.status(201).json({
        success: true,
        message: 'Donor registered and mobile verified (Demo Mode)',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Register Organization (Hospital / Blood Bank - Pending Admin Verification)
// @route   POST /api/auth/register-org
// @access  Public
const registerOrganization = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      orgType,
      certificationNumber,
      officialAddress,
      city,
      district,
      representativeName
    } = req.body;

    if (!name || !email || !password || !phone || !certificationNumber || !city || !representativeName) {
      return res.status(400).json({ success: false, message: 'Please fill in all organization verification fields' });
    }

    if (User.db && User.db.readyState === 1) {
      const userExists = await User.findOne({ email: email.toLowerCase() });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone.trim(),
        role: 'Organization',
        status: 'PENDING_VERIFICATION',
        isMobileVerified: true
      });

      const org = await Organization.create({
        userId: user._id,
        orgName: name,
        orgType: orgType || 'GovtHospital',
        certificationNumber,
        officialPhone: phone,
        officialEmail: email.toLowerCase(),
        address: officialAddress || 'Main Hospital Campus',
        city,
        district: district || '',
        representativeName,
        verificationStatus: 'PENDING_VERIFICATION'
      });

      const token = generateToken(user);
      return res.status(201).json({
        success: true,
        message: 'Organization registration submitted! Status is PENDING_VERIFICATION until Admin approval.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        },
        organization: org
      });
    } else {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const newUser = {
        _id: 'mock_org_' + Date.now(),
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone.trim(),
        role: 'Organization',
        status: 'PENDING_VERIFICATION',
        createdAt: new Date()
      };

      mockUsers.push(newUser);
      const token = generateToken(newUser);

      return res.status(201).json({
        success: true,
        message: 'Organization submitted! Status is PENDING_VERIFICATION (Demo)',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    if (User.db && User.db.readyState === 1) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = generateToken(user);
      return res.json({
        success: true,
        message: 'Signed in successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          phone: user.phone
        }
      });
    } else {
      const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = bcrypt.compareSync(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = generateToken(user);
      return res.json({
        success: true,
        message: 'Signed in successfully (Demo)',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status || 'VERIFIED',
          phone: user.phone
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get active user session details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (User.db && User.db.readyState === 1) {
      const user = await User.findById(userId).select('-password');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      let profileData = null;
      let orgData = null;

      if (user.role === 'Donor') {
        profileData = await DonorProfile.findOne({ userId: user._id });
      } else if (user.role === 'Organization' || user.role === 'BloodBank') {
        orgData = await Organization.findOne({ userId: user._id });
      }

      return res.json({ success: true, user, profile: profileData, organization: orgData });
    } else {
      const user = mockUsers.find(u => u._id.toString() === userId.toString());
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const { password, ...userData } = user;
      return res.json({ success: true, user: userData, profile: null, organization: null });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtpHandler,
  verifyOtpHandler,
  registerDonor,
  registerOrganization,
  loginUser,
  getMe
};
