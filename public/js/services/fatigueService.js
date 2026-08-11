/**
 * LIFE LINK – Notification Fatigue Protection Service
 * Internal dispatch optimization preventing alert overload for voluntary donors.
 * Does NOT penalize or publicly rate donors.
 */

const FatigueService = {
  // Key: donorId => Array of { requestId, timestamp, urgency, action: 'NOTIFIED'|'ACCEPTED'|'DECLINED' }
  history: new Map(),

  recordNotification(donorId, requestId, urgency) {
    if (!donorId) return;
    const records = this.history.get(donorId) || [];
    records.push({
      requestId,
      urgency,
      timestamp: Date.now(),
      action: 'NOTIFIED'
    });
    this.history.get(donorId) ? null : this.history.set(donorId, records);
  },

  recordResponse(donorId, requestId, action) {
    if (!donorId) return;
    const records = this.history.get(donorId) || [];
    const item = records.find(r => r.requestId === requestId);
    if (item) {
      item.action = action; // 'ACCEPTED' | 'DECLINED'
    } else {
      records.push({ requestId, timestamp: Date.now(), action });
      this.history.set(donorId, records);
    }
  },

  // Calculate fatigue penalty weight (0.0 to 0.4)
  getFatigueScore(donorId, requestUrgency) {
    if (!donorId) return 0;
    const records = this.history.get(donorId) || [];

    // Critical requests override fatigue protection
    if (requestUrgency === 'CRITICAL') return 0;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentNotifs = records.filter(r => r.timestamp > oneDayAgo);

    if (recentNotifs.length >= 4) return 0.35;
    if (recentNotifs.length >= 2) return 0.15;
    return 0;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FatigueService;
}
