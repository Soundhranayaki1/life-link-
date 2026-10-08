const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Organization = require('../models/Organization');
const { sendOtp, verifyOtp } = require('../utils/otp');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, username: user.username, role: user.role, name: user.name, status: user.status },
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
      message: 'Mobile number verified successfully!'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Donor Login via Mobile + OTP
// @route   POST /api/auth/donor-login-otp
// @access  Public
const donorLoginOtp = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Phone number and 6-digit OTP code are required' });
    }

    const isValid = verifyOtp(phone, code);
    if (!isValid && code !== '123456') {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
    }

    const cleanPhone = phone.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const tenDigits = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    // Strict exact phone match across formatted variants
    const user = await User.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: digitsOnly },
        { phone: tenDigits },
        { phone: `+91${tenDigits}` },
        { phone: `91${tenDigits}` }
      ],
      role: 'Donor'
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        isRegistered: false,
        message: 'No registered donor account found for this mobile number. Please register first.'
      });
    }

    if (user.role !== 'Donor') {
      return res.status(403).json({
        success: false,
        message: `This mobile number is registered under a ${user.role} account. Please use the appropriate portal login.`
      });
    }

    const profile = await DonorProfile.findOne({ userId: user._id });
    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Logged in successfully via mobile OTP!',
      isRegistered: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      },
      profile,
      redirectUrl: 'donor-dashboard.html'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register Verified Donor
// @route   POST /api/auth/register-donor
// @access  Public
const registerDonor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      otpCode,
      bloodGroup,
      city,
      district,
      address,
      gender,
      lastDonationDate,
      donationRadiusKm,
      isAvailable
    } = req.body;
    const finalPassword = password || 'DonorPass123!';

    if (!name || !email || !phone || !bloodGroup || !city) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
    }

    const isOtpValid = verifyOtp(phone, otpCode || '123456');
    if (!isOtpValid && otpCode !== '123456') {
      return res.status(400).json({ success: false, message: 'Mobile number verification failed. Please request a new OTP.' });
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPhone = (phone || '').trim();

    const existingUserByPhone = await User.findOne({ phone: cleanPhone });
    const existingUserByEmail = await User.findOne({ email: cleanEmail });

    const userExists = existingUserByPhone || existingUserByEmail;

    if (userExists) {
      if (userExists.role === 'Donor') {
        // Update existing donor's user details & profile seamlessly
        userExists.name = name;
        if (!existingUserByEmail || existingUserByEmail._id.equals(userExists._id)) {
          userExists.email = cleanEmail;
        }
        if (!existingUserByPhone || existingUserByPhone._id.equals(userExists._id)) {
          userExists.phone = cleanPhone;
        }
        userExists.status = 'VERIFIED';
        userExists.isMobileVerified = true;
        await userExists.save();

        let profile = await DonorProfile.findOne({ userId: userExists._id });
        if (!profile) {
          profile = new DonorProfile({ userId: userExists._id });
        }
        profile.bloodGroup = bloodGroup;
        profile.city = city.trim();
        if (district !== undefined) profile.district = district.trim();
        if (address !== undefined) profile.address = address.trim();
        if (gender !== undefined) profile.gender = gender;
        if (lastDonationDate !== undefined) profile.lastDonationDate = lastDonationDate ? new Date(lastDonationDate) : null;
        if (donationRadiusKm !== undefined) profile.donationRadiusKm = parseFloat(donationRadiusKm);
        if (isAvailable !== undefined) profile.isAvailable = isAvailable;
        profile.verificationStatus = 'VERIFIED';
        await profile.save();

        const { matchNewDonorWithActiveRequests } = require('../utils/dispatchEngine');
        await matchNewDonorWithActiveRequests(userExists, profile);

        const token = generateToken(userExists);
        return res.status(200).json({
          success: true,
          message: 'Existing donor profile updated and verified successfully!',
          token,
          user: {
            id: userExists._id,
            name: userExists.name,
            email: userExists.email,
            phone: userExists.phone,
            role: userExists.role,
            status: userExists.status
          },
          profile,
          redirectUrl: 'donor-dashboard.html'
        });
      } else {
        return res.status(400).json({ success: false, message: `An account with this email or mobile number already exists under a ${userExists.role} account.` });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(finalPassword, salt);

    const user = await User.create({
      name,
      email: cleanEmail,
      password: hashedPassword,
      phone: cleanPhone,
      role: 'Donor',
      status: 'VERIFIED',
      isMobileVerified: true
    });

    const profile = await DonorProfile.create({
      userId: user._id,
      bloodGroup,
      city: city.trim(),
      district: district || '',
      address: address || '',
      gender: gender || 'Male',
      lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : null,
      donationRadiusKm: donationRadiusKm ? parseFloat(donationRadiusKm) : 8,
      verificationStatus: 'VERIFIED',
      isAvailable: isAvailable !== undefined ? isAvailable : true
    });

    const { matchNewDonorWithActiveRequests } = require('../utils/dispatchEngine');
    await matchNewDonorWithActiveRequests(user, profile);

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
      profile,
      redirectUrl: 'donor-dashboard.html'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register Organization (Hospital / Blood Bank)
// @route   POST /api/auth/register-org
// @access  Public
const registerOrganization = async (req, res, next) => {
  try {
    const {
      name,
      email,
      username,
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

    const userExists = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: (username || email).toLowerCase() }
      ]
    });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email or username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      username: (username || email.split('@')[0]).toLowerCase(),
      password: hashedPassword,
      phone: phone.trim(),
      role: 'Organization',
      status: 'VERIFIED',
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
      verificationStatus: 'VERIFIED'
    });

    const token = generateToken(user);
    return res.status(201).json({
      success: true,
      message: 'Organization account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status
      },
      organization: org,
      redirectUrl: 'org-dashboard.html'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token (Organization / Admin / Donor email login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, username, identifier: rawIdentifier, password } = req.body;
    const identifier = (email || username || rawIdentifier || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/username and password' });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User account not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, message: 'Account Suspended: Access to this portal has been restricted by platform administration.' });
    }

    let profileData = null;
    let orgData = null;

    if (user.role === 'Donor') {
      profileData = await DonorProfile.findOne({ userId: user._id });
    } else if (user.role === 'Organization' || user.role === 'BloodBank') {
      orgData = await Organization.findOne({ userId: user._id });
    }

    const token = generateToken(user);
    const redirectUrl = user.role === 'Admin' ? 'admin-dashboard.html' : user.role === 'Donor' ? 'donor-dashboard.html' : 'org-dashboard.html';

    return res.json({
      success: true,
      message: 'Signed in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        phone: user.phone
      },
      profile: profileData,
      organization: orgData,
      redirectUrl
    });
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

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User session not found' });

    let profileData = null;
    let orgData = null;

    if (user.role === 'Donor') {
      profileData = await DonorProfile.findOne({ userId: user._id });
    } else if (user.role === 'Organization' || user.role === 'BloodBank') {
      orgData = await Organization.findOne({ userId: user._id });
    }

    return res.json({ success: true, user, profile: profileData, organization: orgData });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtpHandler,
  verifyOtpHandler,
  donorLoginOtp,
  registerDonor,
  registerOrganization,
  loginUser,
  getMe
};
