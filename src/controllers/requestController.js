const BloodRequest = require('../models/BloodRequest');
const Organization = require('../models/Organization');
const { mockRequests } = require('../utils/mockStore');

// @desc    Create new blood request (VERIFIED ORGANIZATIONS ONLY)
// @route   POST /api/requests
// @access  Private (Verified Organizations & Admins Only)
const createRequest = async (req, res, next) => {
  try {
    const {
      patientName,
      hospitalName,
      bloodGroup,
      unitsNeeded,
      city,
      contactPhone,
      urgency,
      additionalNotes
    } = req.body;

    if (!patientName || !hospitalName || !bloodGroup || !unitsNeeded || !city || !contactPhone) {
      return res.status(400).json({ success: false, message: 'Please fill in all required request fields' });
    }

    const userId = req.user ? (req.user.id || req.user._id) : null;
    let organizationId = null;
    let orgName = '✓ VERIFIED HEALTHCARE ORGANIZATION';
    let orgType = 'GovtHospital';

    if (BloodRequest.db && BloodRequest.db.readyState === 1) {
      const org = await Organization.findOne({ userId });
      if (org) {
        organizationId = org._id;
        orgName = `✓ VERIFIED ${org.orgType === 'GovtHospital' ? 'GOVERNMENT HOSPITAL' : 'HEALTHCARE ORGANIZATION'} (${org.orgName})`;
        orgType = org.orgType;
      }

      const newRequest = await BloodRequest.create({
        patientName,
        organizationId,
        authorizedUserId: userId,
        orgName,
        orgType,
        hospitalName,
        bloodGroup,
        unitsNeeded: parseInt(unitsNeeded),
        city,
        contactPhone,
        urgency: urgency || 'Urgent',
        additionalNotes: additionalNotes || ''
      });

      return res.status(201).json({
        success: true,
        message: 'Emergency blood request broadcasted successfully by Verified Organization!',
        request: newRequest
      });
    } else {
      const newRequest = {
        _id: 'mock_req_' + Date.now(),
        patientName,
        organizationId: 'mock_org_id',
        authorizedUserId: userId || 'mock_user_id',
        orgName: '✓ VERIFIED GOVERNMENT HOSPITAL',
        orgType: 'GovtHospital',
        hospitalName,
        bloodGroup,
        unitsNeeded: parseInt(unitsNeeded),
        unitsFulfilled: 0,
        city,
        contactPhone,
        urgency: urgency || 'Urgent',
        status: 'Pending',
        additionalNotes: additionalNotes || '',
        respondedDonors: [],
        createdAt: new Date()
      };

      mockRequests.unshift(newRequest);

      return res.status(201).json({
        success: true,
        message: 'Emergency blood request broadcasted successfully (Demo Mode)',
        request: newRequest
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active blood requests
// @route   GET /api/requests
// @access  Public
const getRequests = async (req, res, next) => {
  try {
    const { bloodGroup, city, urgency, status } = req.query;

    if (BloodRequest.db && BloodRequest.db.readyState === 1) {
      let query = {};

      if (bloodGroup && bloodGroup !== 'All') query.bloodGroup = bloodGroup;
      if (city && city.trim() !== '') query.city = { $regex: city.trim(), $options: 'i' };
      if (urgency && urgency !== 'All') query.urgency = urgency;
      if (status && status !== 'All') query.status = status;

      const requests = await BloodRequest.find(query).sort({ createdAt: -1 });

      return res.json({
        success: true,
        count: requests.length,
        requests
      });
    } else {
      let results = [...mockRequests];

      if (bloodGroup && bloodGroup !== 'All') {
        results = results.filter(r => r.bloodGroup === bloodGroup);
      }
      if (city && city.trim() !== '') {
        results = results.filter(r => r.city.toLowerCase().includes(city.trim().toLowerCase()));
      }
      if (urgency && urgency !== 'All') {
        results = results.filter(r => r.urgency === urgency);
      }
      if (status && status !== 'All') {
        results = results.filter(r => r.status === status);
      }

      return res.json({
        success: true,
        count: results.length,
        requests: results
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to a blood request (VERIFIED DONORS ONLY)
// @route   POST /api/requests/:id/respond
// @access  Private (Verified Donors Only)
const respondToRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const donorId = req.user.id || req.user._id;
    const donorName = req.user.name;
    const donorPhone = req.user.phone;

    if (BloodRequest.db && BloodRequest.db.readyState === 1) {
      const request = await BloodRequest.findById(id);
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

      const alreadyResponded = request.respondedDonors.some(d => d.donorId && d.donorId.toString() === donorId.toString());
      if (alreadyResponded) {
        return res.status(400).json({ success: false, message: 'You have already offered to donate for this emergency request' });
      }

      request.respondedDonors.push({
        donorId,
        donorName,
        donorPhone,
        status: 'Accepted',
        respondedAt: new Date()
      });

      if (request.status === 'Pending') {
        request.status = 'In Progress';
      }

      await request.save();

      return res.json({
        success: true,
        message: 'Thank you! Your donation commitment has been submitted to the verified organization.',
        request
      });
    } else {
      const request = mockRequests.find(r => r._id.toString() === id.toString());
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

      request.respondedDonors.push({
        donorId,
        donorName,
        donorPhone,
        status: 'Accepted',
        respondedAt: new Date()
      });

      if (request.status === 'Pending') {
        request.status = 'In Progress';
      }

      return res.json({
        success: true,
        message: 'Thank you! Your donation commitment has been submitted (Demo)',
        request
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  getRequests,
  respondToRequest
};
