/**
 * LIFE LINK – Automated Adaptive Dispatch Wave Engine
 */

const BloodRequest = require('../models/BloodRequest');
const DonorProfile = require('../models/DonorProfile');
const Organization = require('../models/Organization');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const SystemSetting = require('../models/SystemSetting');
const { getCompatibleDonors, isCompatible } = require('./compatibility');
const { calculateDistance } = require('./distance');

// Helper to fetch current system settings
async function getSystemSettingsMap() {
  const settingsObj = {
    initial_radius: 3,
    expansion_step: 2,
    max_radius: 8,
    required_confirmations: 2,
    evaluation_window: 15,
    notification_cooldown: 48
  };

  try {
    if (SystemSetting.db && SystemSetting.db.readyState === 1) {
      const records = await SystemSetting.find();
      records.forEach(r => { settingsObj[r.key] = r.value; });
    }
  } catch (err) {
    console.error('[DispatchEngine] Failed to read SystemSettings:', err.message);
  }

  return settingsObj;
}

/**
 * Evaluate & automatically trigger adaptive dispatch expansion for a blood request
 * @param {String|Object} requestId Mongoose ID or BloodRequest document
 * @param {String} triggerType 'AUTO' | 'MANUAL' | 'INITIAL'
 */
async function evaluateRequestDispatch(requestId, triggerType = 'AUTO') {
  if (!BloodRequest.db || BloodRequest.db.readyState !== 1) {
    return { success: false, message: 'Database disconnected' };
  }

  const id = typeof requestId === 'object' ? requestId._id : requestId;
  const request = await BloodRequest.findById(id);
  if (!request) {
    return { success: false, message: 'Request not found' };
  }

  // 1. Check if Request was Cancelled, Fulfilled, or Expired
  if (['Cancelled', 'Fulfilled', 'Closed', 'Expired'].includes(request.status)) {
    const finalStatus = request.status === 'Cancelled' ? 'CANCELLED' :
                        request.status === 'Fulfilled' ? 'FULFILLED' : 'EXPIRED';
    if (request.dispatchStatus !== finalStatus) {
      request.dispatchStatus = finalStatus;
      request.lastEvaluatedAt = new Date();
      await request.save();
    }
    return {
      success: true,
      evaluated: true,
      dispatchStatus: request.dispatchStatus,
      message: `Request is ${request.status}. Dispatch halted.`
    };
  }

  // 2. Check if Dispatch is already completed or stopped
  if (['COMPLETED', 'MAX_RADIUS_REACHED', 'CANCELLED', 'FULFILLED', 'EXPIRED'].includes(request.dispatchStatus)) {
    return {
      success: true,
      evaluated: false,
      dispatchStatus: request.dispatchStatus,
      message: `Dispatch already in final state: ${request.dispatchStatus}`
    };
  }

  // Fetch current system settings
  const settings = await getSystemSettingsMap();
  const initialRadius = parseFloat(settings.initial_radius) || 3.0;
  const expansionStep = parseFloat(settings.expansion_step) || 2.0;
  const maxRadius = parseFloat(settings.max_radius) || 8.0;
  const evaluationWindowMinutes = parseFloat(settings.evaluation_window) || 15;
  const cooldownHours = parseFloat(settings.notification_cooldown) || 48;
  const targetConfirmations = request.targetConfirmations || request.unitsNeeded || parseInt(settings.required_confirmations) || 2;

  // 3. Count confirmed/accepted donor responses
  const confirmedDonors = request.respondedDonors.filter(d => 
    ['Accepted', 'ACCEPTED', 'Confirmed', 'CONFIRMED', 'Arrived', 'ARRIVED', 'Completed', 'COMPLETED'].includes(d.status)
  ).length;

  // RULE A: Target confirmations reached -> STOP further dispatch!
  if (confirmedDonors >= targetConfirmations) {
    request.dispatchStatus = 'COMPLETED';
    request.lastEvaluatedAt = new Date();
    await request.save();

    await AuditLog.create({
      action: 'Dispatch Completed - Target Reached',
      performerName: 'SYSTEM_DISPATCH_ENGINE',
      role: 'System',
      category: 'EMERGENCY_DISPATCH',
      description: `Target confirmations (${confirmedDonors}/${targetConfirmations}) reached for request ${request._id}. Adaptive dispatch halted.`,
      target: request._id.toString()
    });

    return {
      success: true,
      evaluated: true,
      dispatchStatus: 'COMPLETED',
      message: `Target confirmations (${confirmedDonors}/${targetConfirmations}) reached. Dispatch completed!`
    };
  }

  // RULE B: Requirement NOT met -> Check if Max Radius is reached
  if (request.currentRadiusKm >= maxRadius) {
    request.dispatchStatus = 'MAX_RADIUS_REACHED';
    request.lastEvaluatedAt = new Date();
    await request.save();

    await AuditLog.create({
      action: 'Dispatch Halted - Max Radius Reached',
      performerName: 'SYSTEM_DISPATCH_ENGINE',
      role: 'System',
      category: 'EMERGENCY_DISPATCH',
      description: `Maximum configured radius (${maxRadius} km) reached for request ${request._id}. No further geographic expansion.`,
      target: request._id.toString()
    });

    return {
      success: true,
      evaluated: true,
      dispatchStatus: 'MAX_RADIUS_REACHED',
      message: `Maximum radius (${maxRadius} km) reached. Dispatch halted.`
    };
  }

  // RULE C: Automatically activate next geographic wave
  const minRadius = request.currentRadiusKm;
  const maxRadiusForWave = Math.min(maxRadius, minRadius + expansionStep);
  const nextWaveNumber = request.currentWaveNumber + 1;
  const newWaveTitle = `Round ${nextWaveNumber} (${minRadius}–${maxRadiusForWave} km)`;

  const hospitalLocation = {
    city: request.city,
    district: request.district,
    latitude: request.locationCoords ? request.locationCoords.latitude : null,
    longitude: request.locationCoords ? request.locationCoords.longitude : null
  };
  if (!hospitalLocation.latitude && request.organizationId) {
    const org = await Organization.findById(request.organizationId);
    if (org && org.locationCoords && org.locationCoords.latitude) {
      if (!request.city || (org.city && org.city.trim().toLowerCase() === request.city.trim().toLowerCase())) {
        hospitalLocation.latitude = org.locationCoords.latitude;
        hospitalLocation.longitude = org.locationCoords.longitude;
      }
    }
  }

  const compatibleGroups = getCompatibleDonors(request.bloodGroup);
  const activeProfiles = await DonorProfile.find({
    bloodGroup: { $in: compatibleGroups },
    isAvailable: true
  }).populate('userId');

  const now = Date.now();
  const cooldownMs = cooldownHours * 3600 * 1000;
  let newlyNotified = 0;

  for (const p of activeProfiles) {
    if (!p.userId || p.userId.status === 'SUSPENDED') continue;
    if (!isCompatible(p.bloodGroup, request.bloodGroup)) continue;

    // STRICT RULE: Do NOT repeatedly notify donors who were already notified in previous waves!
    const alreadyNotified = request.notifiedDonorIds.some(notifiedId => 
      notifiedId.toString() === p.userId._id.toString()
    );
    if (alreadyNotified) continue;

    const donorLoc = {
      city: p.city,
      district: p.district,
      latitude: p.locationCoords ? p.locationCoords.latitude : null,
      longitude: p.locationCoords ? p.locationCoords.longitude : null
    };
    const dist = calculateDistance(donorLoc, hospitalLocation);

    // Filter: Donor must be in newly expanded range AND within donor's configured donation radius
    if (dist > minRadius && dist <= maxRadiusForWave && dist <= (p.donationRadiusKm || 10)) {
      request.notifiedDonorIds.push(p.userId._id);
      newlyNotified++;

      await Notification.create({
        recipientId: p.userId._id,
        title: `🚨 Emergency Alert (${newWaveTitle}): ${request.bloodGroup} needed at ${request.hospitalName}`,
        message: `Adaptive dispatch wave activated (${newWaveTitle}): ${request.unitsNeeded} Units of ${request.bloodGroup} needed at ${request.hospitalName} (~${dist} km away).`,
        type: 'EmergencyRequest',
        link: 'donor-dashboard.html'
      });

      p.lastNotifiedAt = new Date();
      await p.save();
    }
  }

  // Update request state & persist wave history
  request.currentWaveNumber = nextWaveNumber;
  request.currentRadiusKm = maxRadiusForWave;
  request.nextWaveRadiusKm = Math.min(maxRadius, maxRadiusForWave + expansionStep);
  request.dispatchWave = newWaveTitle;
  request.donorsNotifiedCount = request.notifiedDonorIds.length;
  request.lastEvaluatedAt = new Date();
  request.nextEvaluationAt = new Date(now + evaluationWindowMinutes * 60 * 1000);

  request.waveHistory.push({
    waveNumber: nextWaveNumber,
    waveTitle: newWaveTitle,
    minRadiusKm: minRadius,
    maxRadiusKm: maxRadiusForWave,
    donorsNotifiedCount: request.notifiedDonorIds.length,
    newlyNotifiedCount: newlyNotified,
    confirmedDonorsAtTrigger: confirmedDonors,
    triggeredAt: new Date(),
    triggerType
  });

  await request.save();

  await AuditLog.create({
    action: `Automated Wave ${nextWaveNumber} Activation`,
    performerName: triggerType === 'MANUAL' ? 'ORGANIZATION_OPERATOR' : 'SYSTEM_DISPATCH_ENGINE',
    role: triggerType === 'MANUAL' ? 'Organization' : 'System',
    category: 'EMERGENCY_DISPATCH',
    description: `Adaptive wave activated (${newWaveTitle}). Notified ${newlyNotified} newly eligible donors for request ${request._id}. Total notified: ${request.notifiedDonorIds.length}.`,
    target: request._id.toString()
  });

  return {
    success: true,
    evaluated: true,
    dispatchStatus: request.dispatchStatus,
    newWaveTitle,
    newlyNotified,
    totalNotified: request.notifiedDonorIds.length,
    message: `Activated ${newWaveTitle}. Notified ${newlyNotified} additional donor(s).`
  };
}

/**
 * Background Service Worker to evaluate all active emergency blood requests
 */
async function runBackgroundDispatchCycle() {
  try {
    if (!BloodRequest.db || BloodRequest.db.readyState !== 1) return;

    const activeRequests = await BloodRequest.find({
      status: { $in: ['Pending', 'In Progress'] },
      dispatchStatus: 'IN_PROGRESS'
    });

    const now = Date.now();
    for (const req of activeRequests) {
      if (!req.nextEvaluationAt || now >= new Date(req.nextEvaluationAt).getTime()) {
        await evaluateRequestDispatch(req._id, 'AUTO');
      }
    }
  } catch (err) {
    console.error('[DispatchEngine] Cycle execution error:', err.message);
  }
}

/**
 * Automatically match a newly registered/active donor against existing active blood requests in MongoDB
 * @param {Object} user User document
 * @param {Object} profile DonorProfile document
 */
async function matchNewDonorWithActiveRequests(user, profile) {
  try {
    console.log(`[matchNewDonor] Starting for user ${user._id || user.id} (Blood: ${profile ? profile.bloodGroup : 'N/A'})`);
    if (!user || !profile || profile.isAvailable === false) {
      console.log(`[matchNewDonor] Bailed early: user=${!!user}, profile=${!!profile}, isAvailable=${profile ? profile.isAvailable : false}`);
      return;
    }
    
    // Check 48-day eligibility
    const { calculateEligibility } = require('./eligibility');
    const eligibility = calculateEligibility(profile.lastDonationDate);
    if (!eligibility.isEligible) {
      console.log(`[matchNewDonor] Not eligible:`, eligibility);
      return;
    }

    // Find all active blood requests
    const activeRequests = await BloodRequest.find({
      status: { $in: ['Pending', 'In Progress'] }
    });
    console.log(`[matchNewDonor] Found ${activeRequests.length} active requests in DB`);

    for (const req of activeRequests) {
      // Check medical compatibility
      const comp = isCompatible(profile.bloodGroup, req.bloodGroup);
      if (!comp) continue;

      const userIdStr = (user._id || user.id).toString();
      const alreadyNotified = req.notifiedDonorIds && req.notifiedDonorIds.some(
        id => id.toString() === userIdStr
      );

      if (!alreadyNotified) {
        req.notifiedDonorIds.push(user._id || user.id);
        req.donorsNotifiedCount = req.notifiedDonorIds.length;
        await req.save();

        // Create Notification document for the donor with BSON ObjectId
        const mongoose = require('mongoose');
        const recipientObjId = mongoose.Types.ObjectId.isValid(user._id || user.id)
          ? new mongoose.Types.ObjectId(user._id || user.id)
          : (user._id || user.id);

        const cleanUrgency = req.urgency || 'Urgent';
        const notifDoc = await Notification.create({
          recipientId: recipientObjId,
          title: `🚨 ${cleanUrgency} Request: ${req.bloodGroup} needed at ${req.hospitalName || req.orgName}`,
          message: `Active emergency requirement: ${req.unitsNeeded} Units of ${req.bloodGroup} at ${req.hospitalName || req.orgName}, ${req.city}. Tap to respond.`,
          type: 'EmergencyRequest',
          link: 'donor-dashboard.html'
        });
        console.log(`[matchNewDonor] Created Notification ${notifDoc._id} for recipientId ${notifDoc.recipientId}`);

        profile.lastNotifiedAt = new Date();
        await profile.save();
      }
    }
  } catch (err) {
    console.error('[matchNewDonorWithActiveRequests] Error:', err.message);
  }
}

module.exports = {
  getSystemSettingsMap,
  evaluateRequestDispatch,
  runBackgroundDispatchCycle,
  matchNewDonorWithActiveRequests
};
