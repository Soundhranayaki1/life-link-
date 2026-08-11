/**
 * LIFE LINK – Dynamic Notification Radius & Emergency Escalation Engine
 * Controls multi-round distance expansion waves (0-3km -> 3-5km -> 5-8km).
 */

const EscalationEngine = {
  // Configured distance wave thresholds (in km)
  WAVE_THRESHOLDS: [3, 5, 8, 10],

  /**
   * Initialize escalation wave state for an emergency request
   */
  createEscalationState(request) {
    return {
      requestId: request.id || request._id,
      currentRound: 1,
      currentRadiusKm: this.WAVE_THRESHOLDS[0],
      donorsNotifiedCount: 0,
      responsesCount: 0,
      status: 'SEARCHING', // CREATED, SEARCHING, DONORS_NOTIFIED, PARTIALLY_FULFILLED, FULFILLED, EXPIRED
      wavesLog: [
        {
          round: 1,
          radiusKm: this.WAVE_THRESHOLDS[0],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          donorsNotified: 0,
          responses: 0,
          status: 'ACTIVE'
        }
      ]
    };
  },

  /**
   * Expand radius to next wave round if unfulfilled
   */
  expandNextRound(state, request, donors) {
    if (!state) return null;
    const nextRoundIndex = state.currentRound;

    if (nextRoundIndex >= this.WAVE_THRESHOLDS.length) {
      state.status = 'MAX_RADIUS_REACHED';
      return state;
    }

    const newRadius = this.WAVE_THRESHOLDS[nextRoundIndex];
    state.currentRound += 1;
    state.currentRadiusKm = newRadius;

    // Mark previous wave completed
    if (state.wavesLog.length > 0) {
      state.wavesLog[state.wavesLog.length - 1].status = 'COMPLETED';
    }

    // Get additional donors in expanded radius
    const prioritized = MatchingService.getPrioritizedDonors(request, donors, newRadius);
    const newCount = Math.max(0, prioritized.length - state.donorsNotifiedCount);
    state.donorsNotifiedCount = prioritized.length;

    state.wavesLog.push({
      round: state.currentRound,
      radiusKm: newRadius,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      donorsNotified: newCount,
      responses: 0,
      status: 'ACTIVE'
    });

    state.status = 'DONORS_NOTIFIED';

    if (typeof AuditLogger !== 'undefined') {
      AuditLogger.logEvent(state.requestId, `WAVE_EXPANDED_ROUND_${state.currentRound}`, `Radius expanded to ${newRadius} km. ${newCount} additional donors notified.`);
    }

    return state;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EscalationEngine;
}
