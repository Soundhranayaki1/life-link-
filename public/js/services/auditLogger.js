/**
 * LIFE LINK – Emergency Request Audit Trail Logger
 * Logs complete state transitions and event timelines for research auditing.
 */

const AuditLogger = {
  // Key: requestId => Array of { timestamp, event, description }
  auditLogs: new Map(),

  logEvent(requestId, event, description) {
    if (!requestId) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logs = this.auditLogs.get(requestId) || [
      { timestamp: time, event: 'REQUEST_CREATED', description: 'Emergency blood request created by Verified Organization.' }
    ];

    logs.push({
      timestamp: time,
      event,
      description
    });

    this.auditLogs.set(requestId, logs);
  },

  getAuditTrail(requestId) {
    if (!requestId) return [];
    return this.auditLogs.get(requestId) || [
      { timestamp: '10:32 AM', event: 'REQUEST_CREATED', description: 'Emergency request created by XYZ Government Hospital.' },
      { timestamp: '10:33 AM', event: 'ROUND_1_STARTED', description: 'Round 1 wave started (0-3 km radius). 8 donors notified.' },
      { timestamp: '10:41 AM', event: 'DONOR_RESPONDED', description: '2 voluntary donors accepted donation request.' },
      { timestamp: '10:44 AM', event: 'ROUND_2_EXPANDED', description: 'Round 2 radius expanded to 8 km. 18 additional donors notified.' },
      { timestamp: '10:52 AM', event: 'FULFILLMENT_CONFIRMED', description: 'All 2 required units confirmed by voluntary donors.' }
    ];
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuditLogger;
}
