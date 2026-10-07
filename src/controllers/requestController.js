const BloodRequest = require('../models/BloodRequest');
const Organization = require('../models/Organization');
const Notification = require('../models/Notification');
const DonorProfile = require('../models/DonorProfile');
const User = require('../models/User');
const DonationHistory = require('../models/DonationHistory');
const BloodStock = require('../models/BloodStock');
const AuditLog = require('../models/AuditLog');
const SystemSetting = require('../models/SystemSetting');
const { getCompatibleDonors } = require('../utils/compatibility');
const { calculateDistance } = require('../utils/distance');
const { evaluateRequestDispatch, getSystemSettingsMap } = require('../utils/dispatchEngine');
const { mockRequests } = require('../utils/mockStore');

// @desc    Create new emergency blood request & trigger geo-matching engine
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
      district,
      contactPhone,
      urgency,
      additionalNotes,
      requiredBy
    } = req.body;

    if (!patientName || !hospitalName || !bloodGroup || !unitsNeeded || !city || !contactPhone) {
      return res.status(400).json({ success: false, message: 'Please fill in all required request fields' });
    }

    const userId = req.user ? (req.user.id || req.user._id) : null;
    let organizationId = null;
    let orgName = '✓ VERIFIED HEALTHCARE ORGANIZATION';
    let orgType = 'GovtHospital';
    let hospitalLocation = { city: city.trim(), district: (district || '').trim() };

    const settings = await getSystemSettingsMap();
    const initialRadius = parseFloat(settings.initial_radius) || 3.0;
    const expansionStep = parseFloat(settings.expansion_step) || 2.0;
    const maxRadius = parseFloat(settings.max_radius) || 8.0;
    const cooldownHours = parseFloat(settings.notification_cooldown) || 48;
    const evaluationWindowMinutes = parseFloat(settings.evaluation_window) || 15;
    const targetConfirmations = parseInt(unitsNeeded) || parseInt(settings.required_confirmations) || 2;

    if (BloodRequest.db && BloodRequest.db.readyState === 1) {
      const org = await Organization.findOne({ userId });
      if (org) {
        organizationId = org._id;
        orgName = `✓ VERIFIED ${org.orgType === 'GovtHospital' ? 'GOVERNMENT HOSPITAL' : 'HEALTHCARE ORGANIZATION'} (${org.orgName})`;
        orgType = org.orgType;
        if (org.city) hospitalLocation.city = org.city;
        if (org.district) hospitalLocation.district = org.district;
        if (org.locationCoords && org.locationCoords.latitude) {
          hospitalLocation.latitude = org.locationCoords.latitude;
          hospitalLocation.longitude = org.locationCoords.longitude;
        }
      }

      // 1. Save Request to DB
      const newRequest = await BloodRequest.create({
        patientName,
        organizationId,
        authorizedUserId: userId,
        orgName,
        orgType,
        hospitalName,
        bloodGroup,
        unitsNeeded: parseInt(unitsNeeded),
        city: city.trim(),
        contactPhone,
        urgency: urgency || 'Urgent',
        requiredBy: requiredBy || 'Within 3 Hours',
        status: 'Pending',
        additionalNotes: additionalNotes || '',
        dispatchWave,
        dispatchStatus: 'IN_PROGRESS',
        currentWaveNumber: 1,
        currentRadiusKm: initialRadius,
        nextWaveRadiusKm: Math.min(maxRadius, initialRadius + expansionStep),
        initialRadius,
        maxRadius,
        targetConfirmations,
        evaluationWindowMinutes,
        lastEvaluatedAt: new Date(),
        nextEvaluationAt: new Date(Date.now() + evaluationWindowMinutes * 60 * 1000)
      });

      // 2. Execute Real-Time Geo-Based Donor Matching Engine
      const compatibleGroups = getCompatibleDonors(bloodGroup);
      const activeProfiles = await DonorProfile.find({
        bloodGroup: { $in: compatibleGroups },
        isAvailable: true
      }).populate('userId');

      const notifiedIds = [];
      const now = Date.now();
      const cooldownMs = cooldownHours * 3600 * 1000;

      for (const p of activeProfiles) {
        if (!p.userId || p.userId.status === 'SUSPENDED') continue;

        // Check Notification Cooldown Rule
        if (p.lastNotifiedAt && (now - new Date(p.lastNotifiedAt).getTime()) < cooldownMs) {
          continue; // Blocked by notification fatigue protection
        }

        // Calculate Backend Distance
        const donorLocation = {
          city: p.city,
          district: p.district,
          latitude: p.locationCoords ? p.locationCoords.latitude : null,
          longitude: p.locationCoords ? p.locationCoords.longitude : null
        };
        const distanceKm = calculateDistance(donorLocation, hospitalLocation);
        const donorRadius = p.donationRadiusKm || 10;

        // MATCHING RULE: Must be within Round 1 Initial Radius AND within Donor's configured donation radius
        if (distanceKm <= initialRadius && distanceKm <= donorRadius) {
          notifiedIds.push(p.userId._id);

          // Persistent Notification in DB
          await Notification.create({
            recipientId: p.userId._id,
            title: `🚨 ${urgency || 'Emergency'} Request: ${bloodGroup} needed at ${hospitalName}`,
            message: `Emergency requirement: ${unitsNeeded} Units of ${bloodGroup} at ${hospitalName}, ${city} (~${distanceKm} km away). Tap to respond.`,
            type: 'EmergencyRequest',
            link: 'donor-dashboard.html'
          });

          // Update donor notification timestamp to prevent fatigue
          p.lastNotifiedAt = new Date();
          await p.save();
        }
      }

      // Update request notification tracking & initial wave history
      newRequest.notifiedDonorIds = notifiedIds;
      newRequest.donorsNotifiedCount = notifiedIds.length;
      newRequest.waveHistory = [{
        waveNumber: 1,
        waveTitle: dispatchWave,
        minRadiusKm: 0,
        maxRadiusKm: initialRadius,
        donorsNotifiedCount: notifiedIds.length,
        newlyNotifiedCount: notifiedIds.length,
        confirmedDonorsAtTrigger: 0,
        triggeredAt: new Date(),
        triggerType: 'INITIAL'
      }];
      await newRequest.save();

      await AuditLog.create({
        action: 'Emergency Request & Geo-Dispatch Triggered',
        performerName: req.user ? req.user.name : 'Organization',
        role: 'Organization',
        category: 'EMERGENCY_DISPATCH',
        description: `Geo-dispatch Round 1 (0–${initialRadius} km) triggered for ${unitsNeeded} units of ${bloodGroup}. Notified ${notifiedIds.length} matching donors.`,
        target: newRequest._id.toString()
      });

      return res.status(201).json({
        success: true,
        message: `Emergency request broadcasted! Notified ${notifiedIds.length} eligible donor(s) within ${initialRadius} km in Round 1.`,
        request: newRequest,
        donorsNotifiedCount: notifiedIds.length
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
        requiredBy: requiredBy || 'Within 3 Hours',
        status: 'Pending',
        additionalNotes: additionalNotes || '',
        dispatchWave,
        donorsNotifiedCount: 3,
        respondedDonors: [],
        createdAt: new Date()
      };

      mockRequests.unshift(newRequest);

      return res.status(201).json({
        success: true,
        message: 'Emergency request broadcasted successfully!',
        request: newRequest,
        donorsNotifiedCount: 3
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Expand Dispatch Wave / Evaluate Adaptive Wave (Round 1 -> Round 2 -> Round 3)
// @route   PATCH /api/requests/:id/expand-wave
// @access  Private (Verified Organizations & Admins Only)
const expandDispatchWave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await evaluateRequestDispatch(id, 'MANUAL');
    const request = await BloodRequest.findById(id);
    return res.json({
      success: result.success,
      message: result.message,
      result,
      request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get donor emergency requests feed (Matching & notified requests for authenticated donor)
// @route   GET /api/requests/donor-feed
// @access  Private (Donor Only)
const getDonorFeed = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (BloodRequest.db && BloodRequest.db.readyState === 1) {
      const profile = await DonorProfile.findOne({ userId });
      if (!profile) return res.json({ success: true, count: 0, requests: [] });

      const compatibleGroups = getCompatibleDonors(profile.bloodGroup);
      const donorLoc = { city: profile.city, district: profile.district };

      // Find active requests matching donor's blood group & location
      const requests = await BloodRequest.find({
        bloodGroup: { $in: compatibleGroups },
        status: { $in: ['Pending', 'In Progress'] }
      }).sort({ createdAt: -1 });

      const feed = requests
        .map(r => {
          const hospLoc = { city: r.city };
          const dist = calculateDistance(donorLoc, hospLoc);
          const hasResponded = r.respondedDonors.some(d => d.donorId && d.donorId.toString() === userId.toString());

          return {
            id: r._id,
            patientName: r.patientName,
            hospitalName: r.hospitalName,
            orgName: r.orgName,
            bloodGroup: r.bloodGroup,
            unitsNeeded: r.unitsNeeded,
            unitsFulfilled: r.unitsFulfilled,
            city: r.city,
            contactPhone: r.contactPhone,
            urgency: r.urgency,
            requiredBy: r.requiredBy || 'Within 3 Hours',
            status: r.status,
            dispatchWave: r.dispatchWave,
            approxDistance: `~${dist} km`,
            distanceKm: dist,
            additionalNotes: r.additionalNotes,
            hasResponded,
            createdAt: r.createdAt
          };
        })
        .filter(r => r.distanceKm <= (profile.donationRadiusKm || 10));

      return res.json({ success: true, count: feed.length, requests: feed });
    } else {
      return res.json({ success: true, count: mockRequests.length, requests: mockRequests });
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

// @desc    Get requests created by authenticated organization
// @route   GET /api/requests/org
// @access  Private (Organization Only)
const getOrgRequests = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (BloodRequest.db && BloodRequest.db.readyState === 1) {
      const org = await Organization.findOne({ userId });
      const query = org ? { organizationId: org._id } : { authorizedUserId: userId };

      const requests = await BloodRequest.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, count: requests.length, requests });
    } else {
      const results = mockRequests.filter(r => r.authorizedUserId === userId || r.requesterId === userId);
      return res.json({ success: true, count: results.length, requests: results.length > 0 ? results : mockRequests });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get single request details & real-time responder statistics
// @route   GET /api/requests/:id
// @access  Public
const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (BloodRequest.db && BloodRequest.db.readyState === 1) {
      const request = await BloodRequest.findById(id);
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

      const targetConfirmations = request.targetConfirmations || request.unitsNeeded || 2;
      const responsesCount = request.respondedDonors.length;
      const confirmedCount = request.respondedDonors.filter(d => ['Confirmed', 'CONFIRMED', 'Arrived', 'ARRIVED', 'Completed', 'COMPLETED', 'Accepted', 'ACCEPTED'].includes(d.status)).length;
      const standbyCount = request.respondedDonors.filter(d => ['Accepted', 'ACCEPTED', 'Standby', 'STANDBY'].includes(d.status)).length;
      const remainingRequired = Math.max(0, targetConfirmations - confirmedCount);
      const nextWaveText = request.currentRadiusKm < request.maxRadius ? `Round ${(request.currentWaveNumber || 1) + 1} (${request.currentRadiusKm}–${Math.min(request.maxRadius, (request.currentRadiusKm || 3) + 2)} km)` : 'Max Radius Reached (8 km)';

      return res.json({
        success: true,
        request,
        stats: {
          currentDispatchWave: request.dispatchWave || 'Round 1 (0–3 km)',
          currentWaveNumber: request.currentWaveNumber || 1,
          donorsNotified: request.donorsNotifiedCount || 0,
          responsesReceived: responsesCount,
          confirmedDonors: confirmedCount,
          standbyDonors: standbyCount,
          unitsNeeded: request.unitsNeeded,
          unitsFulfilled: request.unitsFulfilled,
          targetConfirmations,
          remainingRequired,
          currentRadius: `${request.currentRadiusKm || 3} km`,
          currentRadiusKm: request.currentRadiusKm || 3,
          nextWave: nextWaveText,
          dispatchStatus: request.dispatchStatus || 'IN_PROGRESS',
          waveHistory: request.waveHistory || [],
          progressPercentage: Math.min(100, Math.round((confirmedCount / targetConfirmations) * 100))
        }
      });
    } else {
      const request = mockRequests.find(r => r._id.toString() === id.toString());
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
      return res.json({ success: true, request });
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

      const donorProfile = await DonorProfile.findOne({ userId: donorId });
      const bloodGroup = donorProfile ? donorProfile.bloodGroup : 'O+';

      const donorLoc = donorProfile ? { city: donorProfile.city, district: donorProfile.district } : { city: request.city };
      const hospLoc = { city: request.city };
      const dist = calculateDistance(donorLoc, hospLoc);
      const approxDistance = `~${dist} km`;

      request.respondedDonors.push({
        donorId,
        donorName,
        donorPhone,
        bloodGroup,
        approxDistance,
        status: 'Accepted',
        respondedAt: new Date()
      });

      if (request.status === 'Pending') {
        request.status = 'In Progress';
      }

      await request.save();
      await evaluateRequestDispatch(request._id, 'AUTO');

      // Notify Organization in DB
      if (request.authorizedUserId) {
        await Notification.create({
          recipientId: request.authorizedUserId,
          title: `✓ Donor Response Received for ${request.patientName}`,
          message: `${donorName} (${bloodGroup}, ${approxDistance}) accepted the emergency request. Phone: ${donorPhone}.`,
          type: 'OrgResponse',
          link: 'org-dashboard.html'
        });
      }

      await AuditLog.create({
        action: 'Donor Responded to Emergency Request',
        performerName: donorName,
        role: 'Donor',
        category: 'DONOR_RESPONSE',
        description: `Donor ${donorName} (${bloodGroup}) accepted emergency request ${id}.`,
        target: id
      });

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
        bloodGroup: req.user.bloodGroup || 'O+',
        approxDistance: '~2.8 km',
        status: 'Accepted',
        respondedAt: new Date()
      });

      if (request.status === 'Pending') {
        request.status = 'In Progress';
      }

      return res.json({
        success: true,
        message: 'Thank you! Your donation commitment has been submitted.',
        request
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update donor responder status (Organization action: CONFIRMED / UNABLE / ARRIVED)
// @route   PATCH /api/requests/:id/responders/:donorId
// @access  Private (Organization Only)
const updateResponderStatus = async (req, res, next) => {
  try {
    const { id, donorId } = req.params;
    const { status } = req.body;

    if (BloodRequest.db && BloodRequest.db.readyState === 1) {
      const request = await BloodRequest.findById(id);
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

      const responder = request.respondedDonors.find(d => d.donorId && d.donorId.toString() === donorId.toString());
      if (!responder) return res.status(404).json({ success: false, message: 'Responder not found in request' });

      responder.status = status;
      if (status === 'ARRIVED' || status === 'Arrived') responder.arrivedAt = new Date();
      await request.save();

      // Notify Donor in DB
      await Notification.create({
        recipientId: donorId,
        title: ['Confirmed', 'CONFIRMED'].includes(status) ? '✓ Donation Appointment Confirmed' : ['Arrived', 'ARRIVED'].includes(status) ? '🏥 Arrival Confirmed' : 'Status Update',
        message: `Your donation response status for emergency request at ${request.hospitalName} is updated to ${status}.`,
        type: 'MatchAlert',
        link: 'donor-dashboard.html'
      });

      return res.json({ success: true, message: `Responder status updated to ${status}`, request });
    } else {
      return res.json({ success: true, message: `Responder status updated to ${status}` });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Mark Emergency Request Fulfilled & Record Donation
// @route   PATCH /api/requests/:id/fulfill
// @access  Private (Organization Only)
const fulfillRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (BloodRequest.db && BloodRequest.db.readyState === 1) {
      const request = await BloodRequest.findById(id);
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

      request.status = 'Fulfilled';
      request.unitsFulfilled = request.unitsNeeded;
      await request.save();

      for (const responder of request.respondedDonors) {
        if (['Confirmed', 'CONFIRMED', 'Arrived', 'ARRIVED', 'Accepted', 'ACCEPTED'].includes(responder.status)) {
          responder.status = 'Completed';
          responder.fulfilledAt = new Date();

          await DonationHistory.create({
            donorId: responder.donorId,
            requestId: request._id,
            bloodGroup: request.bloodGroup,
            unitsDonated: 1,
            donationDate: new Date(),
            location: request.hospitalName
          });

          let profile = await DonorProfile.findOne({ userId: responder.donorId });
          if (profile) {
            profile.lastDonationDate = new Date();
            profile.totalDonations += 1;
            profile.livesHelped += 3;
            await profile.save();
          }

          await Notification.create({
            recipientId: responder.donorId,
            title: '❤️ Donation Completed - Thank You!',
            message: `Your blood donation at ${request.hospitalName} has been recorded. You helped save lives!`,
            type: 'Fulfillment',
            link: 'my-donations.html'
          });
        }
      }
      await request.save();

      let stock = await BloodStock.findOne({ bloodGroup: request.bloodGroup });
      if (stock) {
        stock.unitsAvailable += request.unitsNeeded;
        stock.lastUpdated = new Date();
        await stock.save();
      }

      await AuditLog.create({
        action: 'Request Fulfilled',
        performerName: req.user ? req.user.name : 'Organization',
        role: 'Organization',
        category: 'EMERGENCY_REQUEST',
        description: `Emergency request ${id} marked as FULFILLED. Donor dispatch stopped.`,
        target: id
      });

      return res.json({ success: true, message: 'Emergency request marked as FULFILLED! Dispatch stopped.', request });
    } else {
      const request = mockRequests.find(r => r._id.toString() === id.toString());
      if (request) {
        request.status = 'Fulfilled';
        request.unitsFulfilled = request.unitsNeeded;
      }
      return res.json({ success: true, message: 'Emergency request marked as FULFILLED (Demo)', request });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  expandDispatchWave,
  getDonorFeed,
  getRequests,
  getOrgRequests,
  getRequestById,
  respondToRequest,
  updateResponderStatus,
  fulfillRequest
};
