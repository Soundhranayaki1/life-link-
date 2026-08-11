/**
 * LIFE LINK – Adaptive Donor Matching & Logistical Prioritization Engine
 * Internal dispatch prioritization mechanism based on proximity, blood compatibility,
 * emergency time sensitivity, and notification fatigue.
 *
 * NOTE: Does NOT produce fake medical compatibility percentages for donors.
 */

const MatchingService = {
  /**
   * Prioritize eligible donors for an emergency request
   * @param {object} request - Emergency request details
   * @param {Array} donors - List of registered donors
   * @param {number} maxRadiusKm - Current wave notification radius in km
   * @returns {Array} List of prioritized donors with human-readable distance info
   */
  getPrioritizedDonors(request, donors, maxRadiusKm = 8) {
    if (!request || !donors) return [];

    const reqBloodGroup = request.bloodGroup;
    const reqUrgency = request.urgency || 'URGENT';

    // 1. Filter eligible donors
    const eligible = donors.filter(d => {
      if (!d.isAvailable) return false;
      if (!MockData.isCompatible(d.bloodGroup, reqBloodGroup)) return false;
      if (d.distanceKm > maxRadiusKm) return false;
      return true;
    });

    // 2. Score & prioritize donors internally
    const scored = eligible.map(d => {
      let score = 100;

      // Distance factor (closer is prioritized)
      score -= d.distanceKm * 5;

      // Time sensitivity for critical requests (under 1 hour)
      if (reqUrgency === 'CRITICAL' && d.distanceKm <= 3) {
        score += 25;
      }

      // Notification fatigue protection
      const fatiguePenalty = (typeof FatigueService !== 'undefined')
        ? FatigueService.getFatigueScore(d.id, reqUrgency)
        : 0;

      score -= (fatiguePenalty * 50);

      return {
        donor: d,
        score,
        humanDistance: `${d.distanceKm} km away`,
        humanRadiusText: `Within requested ${maxRadiusKm} km radius`,
        isVerified: true
      };
    });

    // Sort by internal score descending
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MatchingService;
}
