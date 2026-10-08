const BloodRequest = require('../models/BloodRequest');
const Organization = require('../models/Organization');
const Notification = require('../models/Notification');
const DonorProfile = require('../models/DonorProfile');
const User = require('../models/User');
const DonationHistory = require('../models/DonationHistory');
const BloodStock = require('../models/BloodStock');
const AuditLog = require('../models/AuditLog');
const { getCompatibleDonors, getCompatibleRecipients, isCompatible } = require('../utils/compatibility');
const { calculateDistance } = require('../utils/distance');
const { calculateEligibility } = require('../utils/eligibility');
const { evaluateRequestDispatch, getSystemSettingsMap } = require('../utils/dispatchEngine');

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

    let cleanUrgency = (urgency || 'Urgent').trim();
    if (cleanUrgency.toUpperCase().includes('CRIT')) cleanUrgency = 'Critical';
    else if (cleanUrgency.toUpperCase().includes('URG')) cleanUrgency = 'Urgent';
    else if (cleanUrgency.toUpperCase().includes('STAN')) cleanUrgency = 'Standard';

    const userId = req.user ? (req.user.id || req.user._id) : null;
    let organizationId = null;
    let orgName = hospitalName || '✓ VERIFIED HEALTHCARE ORGANIZATION';
    let orgType = 'GovtHospital';
    let hospitalLocation = { city: city.trim(), district: (district || '').trim() };

    const settings = await getSystemSettingsMap();
    const initialRadius = parseFloat(settings.initial_radius) || 3.0;
    const expansionStep = parseFloat(settings.expansion_step) || 2.0;
    const maxRadius = parseFloat(settings.max_radius) || 8.0;
    const cooldownHours = parseFloat(settings.notification_cooldown) || 48;
    const evaluationWindowMinutes = parseFloat(settings.evaluation_window) || 15;
    const targetConfirmations = parseInt(unitsNeeded) || parseInt(settings.required_confirmations) || 2;

    const org = await Organization.findOne({ userId });
    if (org) {
      organizationId = org._id;
      orgName = org.orgName;
      orgType = org.orgType;
      // Only set hospitalLocation city/district from org if not explicitly provided in request form
      if (!hospitalLocation.city && org.city) hospitalLocation.city = org.city;
      if (!hospitalLocation.district && org.district) hospitalLocation.district = org.district;
      
      // Only use org coordinates if request city matches org city or org has coords
      if (org.locationCoords && org.locationCoords.latitude) {
        if (!city || (org.city && org.city.trim().toLowerCase() === city.trim().toLowerCase())) {
          hospitalLocation.latitude = org.locationCoords.latitude;
          hospitalLocation.longitude = org.locationCoords.longitude;
        }
      }
    }

    const dispatchWave = `Round 1 (0–${initialRadius} km)`;

    // 1. Save Request to DB
    const newRequest = await BloodRequest.create({
      patientName,
      organizationId,
      authorizedUserId: userId,
      orgName,
      orgType,
      hospitalName: hospitalName || orgName,
      bloodGroup,
      unitsNeeded: parseInt(unitsNeeded),
      city: city.trim(),
      district: hospitalLocation.district || '',
      locationCoords: {
        latitude: hospitalLocation.latitude || null,
        longitude: hospitalLocation.longitude || null
      },
      contactPhone,
      urgency: cleanUrgency,
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

    for (const p of activeProfiles) {
      if (!p.userId || p.userId.status === 'SUSPENDED') continue;

      // Check 48-day donation eligibility
      const eligibility = calculateEligibility(p.lastDonationDate);
      if (!eligibility.isEligible) continue;

      const donorLocation = {
        city: p.city,
        district: p.district,
        latitude: p.locationCoords ? p.locationCoords.latitude : null,
        longitude: p.locationCoords ? p.locationCoords.longitude : null
      };
      const distanceKm = calculateDistance(donorLocation, hospitalLocation);
      const donorRadius = p.donationRadiusKm || 10;
      const isSameCity = p.city && city && p.city.trim().toLowerCase() === city.trim().toLowerCase();

      // MATCHING RULE: Notify all active, verified & eligible compatible donors
      if (isCompatible(p.bloodGroup, bloodGroup)) {
        notifiedIds.push(p.userId._id);

        await Notification.create({
          recipientId: p.userId._id,
          title: `🚨 ${cleanUrgency} Request: ${bloodGroup} needed at ${hospitalName || orgName}`,
          message: `Emergency requirement: ${unitsNeeded} Units of ${bloodGroup} at ${hospitalName || orgName}, ${city} (~${distanceKm} km away). Tap to respond.`,
          type: 'EmergencyRequest',
          link: 'donor-dashboard.html'
        });

        p.lastNotifiedAt = new Date();
        await p.save();
      }
    }

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
  } catch (error) {
    next(error);
  }
};

// @desc    Expand Dispatch Wave / Evaluate Adaptive Wave
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

// @desc    Get donor emergency requests feed
// @route   GET /api/requests/donor-feed
// @access  Private (Donor Only)
const getDonorFeed = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    if (req.user.status === 'SUSPENDED') {
      return res.json({ success: true, count: 0, requests: [] });
    }

    const profile = await DonorProfile.findOne({ userId });
    if (!profile) return res.json({ success: true, count: 0, requests: [] });

    // Exclude if donor availability is paused
    if (profile.isAvailable === false) {
      return res.json({ success: true, count: 0, requests: [] });
    }

    // Exclude if donor is not eligible under 48-day rule
    const eligibility = calculateEligibility(profile.lastDonationDate);
    if (!eligibility.isEligible) {
      return res.json({ success: true, count: 0, requests: [] });
    }

    const { matchNewDonorWithActiveRequests } = require('../utils/dispatchEngine');
    await matchNewDonorWithActiveRequests(req.user, profile);

    const compatibleRecipientGroups = getCompatibleRecipients(profile.bloodGroup);
    const donorLoc = {
      city: profile.city,
      district: profile.district,
      latitude: profile.locationCoords ? profile.locationCoords.latitude : null,
      longitude: profile.locationCoords ? profile.locationCoords.longitude : null
    };

    const requests = await BloodRequest.find({
      bloodGroup: { $in: compatibleRecipientGroups },
      status: { $in: ['Pending', 'In Progress'] }
    }).sort({ createdAt: -1 });

    const feed = requests
      .filter(r => isCompatible(profile.bloodGroup, r.bloodGroup))
      .map(r => {
        const hospLoc = {
          city: r.city,
          district: r.district,
          latitude: r.locationCoords ? r.locationCoords.latitude : null,
          longitude: r.locationCoords ? r.locationCoords.longitude : null
        };
        const dist = calculateDistance(donorLoc, hospLoc);
        const hasResponded = r.respondedDonors && r.respondedDonors.some(d => d.donorId && d.donorId.toString() === userId.toString());

        return {
          id: r._id,
          _id: r._id,
          patientName: r.patientName,
          hospitalName: r.hospitalName || r.orgName,
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
      });

    return res.json({ success: true, count: feed.length, requests: feed });
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
  } catch (error) {
    next(error);
  }
};

// @desc    Get requests created by authenticated organization
// @route   GET /api/requests/org
// @access  Private (Organization Only)
// @desc    Get requests created by authenticated organization
// @route   GET /api/requests/org
// @access  Private (Organization Only)
const getOrgRequests = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const org = await Organization.findOne({ userId });
    const query = org ? { $or: [{ organizationId: org._id }, { authorizedUserId: userId }] } : { authorizedUserId: userId };

    const requests = await BloodRequest.find(query)
      .populate('respondedDonors.donorId', 'name phone email bloodGroup')
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map(reqDoc => {
      const r = reqDoc.toObject();
      const formattedRespondedDonors = (r.respondedDonors || []).map(d => {
        const statusClean = (d.status || '').toUpperCase();
        const isConfirmed = ['CONFIRMED', 'ACCEPTED', 'ARRIVED', 'COMPLETED'].includes(statusClean);
        const isWithdrawn = ['WITHDRAWN', 'DECLINED', 'UNABLE'].includes(statusClean);

        return {
          ...d,
          // PRIVACY RULE: Show real donor phone ONLY after donor confirms!
          donorPhone: isConfirmed ? (d.donorPhone || (d.donorId && d.donorId.phone) || 'Contact Available') : '(Contact Hidden Until Confirmed)',
          displayStatus: isWithdrawn ? 'Withdrawn / Unable to Help' : isConfirmed ? 'Confirmed — Will Donate' : (d.status || 'Responded')
        };
      });

      return {
        ...r,
        respondedDonors: formattedRespondedDonors,
        referrals: r.referrals || []
      };
    });

    return res.json({ success: true, count: formattedRequests.length, requests: formattedRequests });
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
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to or Withdraw from a blood request (VERIFIED DONORS ONLY)
// @route   POST /api/requests/:id/respond
// @access  Private (Verified Donors Only)
const respondToRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { action } = req.body || {};
    if (req.path.endsWith('/withdraw')) {
      action = 'withdraw';
    }
    const donorId = req.user.id || req.user._id;
    const donorName = req.user.name;
    const donorPhone = req.user.phone;

    const request = await BloodRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const existingIndex = request.respondedDonors.findIndex(d => {
      if (!d.donorId) return false;
      const idStr = d.donorId._id ? d.donorId._id.toString() : d.donorId.toString();
      return idStr === donorId.toString();
    });

    if (action === 'withdraw') {
      if (existingIndex === -1) {
        return res.status(400).json({ success: false, message: 'No active donation commitment found to withdraw.' });
      }

      request.respondedDonors[existingIndex].status = 'Withdrawn';
      request.respondedDonors[existingIndex].withdrawnAt = new Date();
      await request.save();

      if (request.authorizedUserId) {
        await Notification.create({
          recipientId: request.authorizedUserId,
          title: `⚠️ Donor Commitment Withdrawn for ${request.patientName}`,
          message: `${donorName} has withdrawn their donation commitment for ${request.bloodGroup} requirement.`,
          type: 'OrgResponse',
          link: 'org-dashboard.html'
        });
      }

      await AuditLog.create({
        action: 'Donor Withdrew Commitment',
        performerName: donorName,
        role: 'Donor',
        category: 'DONOR_RESPONSE',
        description: `Donor ${donorName} withdrew donation commitment for request ${id}.`,
        target: id.toString()
      });

      return res.json({
        success: true,
        message: 'Your donation commitment has been withdrawn. The hospital dashboard has been updated.',
        status: 'Withdrawn'
      });
    }

    // Default Action: Confirm Donation Commitment
    if (existingIndex !== -1) {
      const currentStatus = request.respondedDonors[existingIndex].status;
      if (['Confirmed', 'CONFIRMED', 'Accepted', 'ACCEPTED'].includes(currentStatus)) {
        return res.status(400).json({ success: false, message: 'You have already confirmed your donation commitment for this emergency request.' });
      } else {
        request.respondedDonors[existingIndex].status = 'Confirmed';
        request.respondedDonors[existingIndex].confirmedAt = new Date();
      }
    } else {
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
        status: 'Confirmed',
        respondedAt: new Date(),
        confirmedAt: new Date()
      });
    }

    if (request.status === 'Pending') {
      request.status = 'In Progress';
    }

    await request.save();
    await evaluateRequestDispatch(request._id, 'AUTO');

    if (request.authorizedUserId) {
      await Notification.create({
        recipientId: request.authorizedUserId,
        title: `✓ Confirmed Donor Commitment for ${request.patientName}`,
        message: `${donorName} (${req.user.bloodGroup || 'Donor'}, Phone: ${donorPhone}) CONFIRMED they will donate.`,
        type: 'OrgResponse',
        link: 'org-dashboard.html'
      });
    }

    await AuditLog.create({
      action: 'Donor Confirmed Commitment',
      performerName: donorName,
      role: 'Donor',
      category: 'DONOR_RESPONSE',
      description: `Donor ${donorName} confirmed donation commitment for request ${id}.`,
      target: id.toString()
    });

    return res.json({
      success: true,
      message: 'Thank you! Your donation commitment (Confirmed — Will Donate) has been recorded.',
      status: 'Confirmed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refer an eligible friend to a blood request
// @route   POST /api/requests/:id/refer
// @access  Private (Verified Donors Only)
const referEmergencyRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { referredPhone, referredName } = req.body;
    const donorId = req.user.id || req.user._id;
    const donorName = req.user.name;
    const donorPhone = req.user.phone;

    if (!referredPhone || !referredPhone.trim()) {
      return res.status(400).json({ success: false, message: "Please enter your referred contact's mobile number" });
    }

    const request = await BloodRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const cleanPhone = referredPhone.trim();
    const alreadyReferred = request.referrals && request.referrals.some(r => 
      r.referringDonorId && r.referringDonorId.toString() === donorId.toString() && r.referredPhone === cleanPhone
    );

    if (alreadyReferred) {
      return res.status(400).json({ success: false, message: 'You have already referred this contact number for this emergency request.' });
    }

    request.referrals.push({
      referringDonorId: donorId,
      referringDonorName: donorName,
      referringDonorPhone: donorPhone,
      referredPhone: cleanPhone,
      referredName: (referredName || '').trim(),
      status: 'Pending',
      referredAt: new Date()
    });

    await request.save();

    if (request.authorizedUserId) {
      await Notification.create({
        recipientId: request.authorizedUserId,
        title: `🤝 Donor Referral Received for ${request.patientName}`,
        message: `${donorName} referred a potential donor (${cleanPhone}) for ${request.bloodGroup} requirement.`,
        type: 'ReferralAlert',
        link: 'org-dashboard.html'
      });
    }

    await AuditLog.create({
      action: 'Donor Referred Contact for Emergency Request',
      performerName: donorName,
      role: 'Donor',
      category: 'REFERRAL',
      description: `Donor ${donorName} referred contact ${cleanPhone} for request ${id}.`,
      target: id.toString()
    });

    return res.json({
      success: true,
      message: 'Referral submitted successfully! The healthcare facility has been notified of your referral.'
    });
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

    const request = await BloodRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const responder = request.respondedDonors.find(d => {
      if (!d.donorId) return false;
      const idStr = d.donorId._id ? d.donorId._id.toString() : d.donorId.toString();
      return idStr === donorId.toString();
    });
    if (!responder) return res.status(404).json({ success: false, message: 'Responder not found in request' });

    responder.status = status;
    if (status === 'ARRIVED' || status === 'Arrived') responder.arrivedAt = new Date();
    await request.save();

    await Notification.create({
      recipientId: donorId,
      title: ['Confirmed', 'CONFIRMED'].includes(status) ? '✓ Donation Appointment Confirmed' : ['Arrived', 'ARRIVED'].includes(status) ? '🏥 Arrival Confirmed' : 'Status Update',
      message: `Your donation response status for emergency request at ${request.hospitalName} is updated to ${status}.`,
      type: 'MatchAlert',
      link: 'donor-dashboard.html'
    });

    return res.json({ success: true, message: `Responder status updated to ${status}`, request });
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
      target: id.toString()
    });

    return res.json({ success: true, message: 'Emergency request marked as FULFILLED! Dispatch stopped.', request });
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
  referEmergencyRequest,
  updateResponderStatus,
  fulfillRequest
};
