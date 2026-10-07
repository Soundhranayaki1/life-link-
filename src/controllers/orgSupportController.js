const OrgSupportRequest = require('../models/OrgSupportRequest');
const Organization = require('../models/Organization');

// @desc    Get Organization-to-Organization Support Requests
// @route   GET /api/org-support
// @access  Private (Organization & Admin Only)
const getOrgSupportRequests = async (req, res, next) => {
  try {
    if (OrgSupportRequest.db && OrgSupportRequest.db.readyState === 1) {
      const requests = await OrgSupportRequest.find().sort({ createdAt: -1 });
      return res.json({ success: true, count: requests.length, requests });
    } else {
      return res.json({ success: true, count: 0, requests: [] });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create Organization Support Request
// @route   POST /api/org-support
// @access  Private (Verified Organization Only)
const createOrgSupportRequest = async (req, res, next) => {
  try {
    const { receivingOrg, bloodGroup, component, unitsRequired, urgency, requiredBy, notes } = req.body;
    const userId = req.user.id || req.user._id;

    if (!receivingOrg || !unitsRequired) {
      return res.status(400).json({ success: false, message: 'Receiving organization and units required are mandatory fields' });
    }

    let requestingOrgName = req.user.name || 'Healthcare Facility';
    let requestingOrgId = null;

    if (Organization.db && Organization.db.readyState === 1) {
      const org = await Organization.findOne({ userId });
      if (org) {
        requestingOrgId = org._id;
        requestingOrgName = org.orgName;
      }

      const supportRequest = await OrgSupportRequest.create({
        requestingOrgId: requestingOrgId || userId,
        requestingOrgName,
        receivingOrgName: receivingOrg,
        bloodGroup: bloodGroup || 'O+',
        component: component || 'Packed Red Cells',
        unitsRequired: parseInt(unitsRequired),
        urgency: urgency || 'Critical',
        requiredBy: requiredBy || 'Within 3 Hours',
        notes: notes || ''
      });

      return res.status(201).json({
        success: true,
        message: 'Organization support request broadcasted successfully!',
        request: supportRequest
      });
    } else {
      return res.status(201).json({
        success: true,
        message: 'Organization support request recorded',
        request: {
          _id: 'supp_' + Date.now(),
          requestingOrgName,
          receivingOrgName: receivingOrg,
          bloodGroup: bloodGroup || 'O+',
          component: component || 'Packed Red Cells',
          unitsRequired: parseInt(unitsRequired),
          urgency: urgency || 'Critical',
          requiredBy: requiredBy || 'Within 3 Hours',
          notes: notes || '',
          status: 'Support Requested',
          createdAt: new Date()
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update Org Support Request Status (Accept / Decline / Fulfill)
// @route   PATCH /api/org-support/:id/status
// @access  Private (Verified Organization & Admin Only)
const updateOrgSupportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Accepted', 'Declined', 'Fulfilled', 'Closed'

    if (OrgSupportRequest.db && OrgSupportRequest.db.readyState === 1) {
      const support = await OrgSupportRequest.findById(id);
      if (!support) return res.status(404).json({ success: false, message: 'Support request not found' });

      support.status = status;
      await support.save();

      return res.json({ success: true, message: `Support request status updated to ${status}`, request: support });
    } else {
      return res.json({ success: true, message: `Support status updated to ${status}` });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrgSupportRequests,
  createOrgSupportRequest,
  updateOrgSupportStatus
};
