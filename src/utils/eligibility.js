/**
 * LIFE LINK – 48-Day Donation Eligibility Utility
 */

const ELIGIBILITY_INTERVAL_DAYS = 48;

/**
 * Calculate donor eligibility based on last donation date
 * @param {Date|string|null} lastDonationDate 
 * @returns {Object} { isEligible, daysRemaining, nextEligibleDate, statusText, lastDonationFormatted }
 */
function calculateEligibility(lastDonationDate) {
  if (!lastDonationDate) {
    return {
      isEligible: true,
      daysRemaining: 0,
      nextEligibleDate: new Date(),
      statusText: 'Eligible to Donate',
      lastDonationFormatted: 'No prior donations recorded'
    };
  }

  const lastDate = new Date(lastDonationDate);
  if (isNaN(lastDate.getTime())) {
    return {
      isEligible: true,
      daysRemaining: 0,
      nextEligibleDate: new Date(),
      statusText: 'Eligible to Donate',
      lastDonationFormatted: 'No prior donations recorded'
    };
  }

  const nextEligible = new Date(lastDate.getTime() + (ELIGIBILITY_INTERVAL_DAYS * 24 * 60 * 60 * 1000));
  const now = new Date();
  const diffMs = nextEligible.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const isEligible = daysRemaining === 0;

  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  const lastDonationFormatted = lastDate.toLocaleDateString('en-US', options);
  const nextEligibleFormatted = nextEligible.toLocaleDateString('en-US', options);

  return {
    isEligible,
    daysRemaining,
    nextEligibleDate: nextEligible,
    nextEligibleFormatted,
    statusText: isEligible ? 'Eligible to Donate' : 'Not Eligible Yet',
    lastDonationFormatted
  };
}

module.exports = {
  ELIGIBILITY_INTERVAL_DAYS,
  calculateEligibility
};
