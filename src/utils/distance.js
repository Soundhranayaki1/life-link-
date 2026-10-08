/**
 * LIFE LINK – Geographic Distance & Location Proximity Engine
 */

/**
 * Calculate distance in kilometers using Haversine formula if coordinates exist,
 * or city/district proximity logic.
 * @param {Object} origin { city, district, latitude, longitude }
 * @param {Object} destination { city, district, latitude, longitude }
 * @returns {number} Distance in kilometers (rounded to 1 decimal place)
 */
function calculateDistance(origin, destination) {
  if (!origin || !destination) return 1.5;

  // 1. Haversine calculation if coordinates are present
  const origLat = parseFloat(origin.latitude || origin.lat);
  const origLng = parseFloat(origin.longitude || origin.lng || origin.lon);
  const destLat = parseFloat(destination.latitude || destination.lat);
  const destLng = parseFloat(destination.longitude || destination.lng || destination.lon);

  if (!isNaN(origLat) && !isNaN(origLng) && !isNaN(destLat) && !isNaN(destLng) && origLat !== 0 && destLat !== 0) {
    const R = 6371; // Earth radius in km
    const dLat = toRad(destLat - origLat);
    const dLon = toRad(destLng - origLng);
    const lat1 = toRad(origLat);
    const lat2 = toRad(destLat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Math.round(dist * 10) / 10;
  }

  // 2. City & District Proximity Evaluation
  const origCity = (origin.city || '').trim().toLowerCase();
  const destCity = (destination.city || '').trim().toLowerCase();

  if (origCity && destCity && (origCity === destCity || origCity.includes(destCity) || destCity.includes(origCity))) {
    // Same city or overlapping metro region: ~1.5 km (within Round 1 & donor radius)
    return 1.5;
  } else if (origCity && destCity) {
    // Different city: ~8.5 km
    const hash = simpleHash(origCity + destCity);
    const interDist = 8.5 + (hash % 8.5);
    return Math.round(interDist * 10) / 10;
  }

  return 1.5;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

module.exports = {
  calculateDistance
};
