/**
 * LIFE LINK – Smart Donor Matching & Adaptive Dispatch System
 */

const { getCompatibleDonors } = require('./compatibility');
const { calculateEligibility } = require('./eligibility');

/**
 * Perform smart ranked donor matching for an emergency request
 * @param {Object} request { bloodGroup, city, searchRadiusKm }
 * @param {Array} donors List of donor profiles/users
 * @returns {Array} Ranked list of matched donors
 */
function matchDonorsForRequest(request, donors) {
  if (!request || !Array.isArray(donors)) return [];

  const requiredGroup = request.bloodGroup || 'O+';
  const compatibleGroups = getCompatibleDonors(requiredGroup);
  const targetCity = (request.city || '').trim().toLowerCase();

  return donors
    .map(donor => {
      const donorGroup = donor.bloodGroup || 'O+';
      const isCompatible = compatibleGroups.includes(donorGroup);
      const isExactGroup = donorGroup === requiredGroup;
      const isUniversal = donorGroup === 'O-';

      const eligibility = calculateEligibility(donor.lastDonationDate);
      const isAvailable = donor.isAvailable !== false;

      // Distance estimation (Simulated proximity if exact coords not set)
      let dist = donor.distanceKm !== undefined ? parseFloat(donor.distanceKm) : (Math.random() * 6 + 1.2);
      if (targetCity && donor.city && !donor.city.toLowerCase().includes(targetCity)) {
        dist += 4.0; // Distance penalty for different city
      }
      dist = Math.round(dist * 10) / 10;

      // Determine Notification Wave Round
      let waveRound = 'Round 1 (0–3 km)';
      if (dist > 3.0 && dist <= 5.0) waveRound = 'Round 2 (3–5 km)';
      else if (dist > 5.0) waveRound = 'Round 3 (5–8 km)';

      // Calculate Match Score
      let matchScore = 0;
      if (isExactGroup) matchScore += 50;
      else if (isUniversal) matchScore += 45;
      else if (isCompatible) matchScore += 30;

      if (dist <= 3.0) matchScore += 30;
      else if (dist <= 5.0) matchScore += 20;
      else if (dist <= 8.0) matchScore += 10;

      if (isAvailable) matchScore += 10;
      if (eligibility.isEligible) matchScore += 10;

      // Match Status Tag
      let matchStatus = 'Compatible';
      if (isExactGroup && isAvailable && eligibility.isEligible) {
        matchStatus = '100% Match • Eligible';
      } else if (!eligibility.isEligible) {
        matchStatus = 'Ineligible (Recent Donor)';
      } else if (!isAvailable) {
        matchStatus = 'Unavailable';
      } else if (isUniversal) {
        matchStatus = 'Universal Donor Match';
      }

      return {
        id: donor.id || donor._id,
        name: donor.name || 'Voluntary Donor',
        bloodGroup: donorGroup,
        approxDistance: `~${dist} km`,
        distanceKm: dist,
        city: donor.city || 'Local Area',
        district: donor.district || '',
        isAvailable,
        isEligible: eligibility.isEligible,
        eligibilityStatus: eligibility.statusText,
        nextEligibleFormatted: eligibility.nextEligibleFormatted || 'Eligible Now',
        matchScore,
        matchStatus,
        waveRound,
        phone: donor.phone || ''
      };
    })
    .filter(d => compatibleGroups.includes(d.bloodGroup))
    .sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = {
  matchDonorsForRequest
};
