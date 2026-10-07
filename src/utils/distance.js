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
  if (!origin || !destination) return 3.0;

  // 1. Haversine calculation if coordinates are present
  if (
    origin.latitude && origin.longitude &&
    destination.latitude && destination.longitude
  ) {
    const R = 6371; // Earth radius in km
    const dLat = toRad(destination.latitude - origin.latitude);
    const dLon = toRad(destination.longitude - origin.longitude);
    const lat1 = toRad(origin.latitude);
    const lat2 = toRad(destination.latitude);

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

  if (origCity && destCity && origCity === destCity) {
    // Same city: calculate proximity based on district or name hash
    const hash = simpleHash((origin.address || origin.district || '') + (destination.district || ''));
    const intraDist = 1.2 + (hash % 2.5); // Range ~1.2 km to 3.7 km inside same city
    return Math.round(intraDist * 10) / 10;
  } else if (origCity && destCity) {
    // Different city penalty: ~5.5 km to 12.0 km
    const hash = simpleHash(origCity + destCity);
    const interDist = 5.5 + (hash % 6.5);
    return Math.round(interDist * 10) / 10;
  }

  return 2.8;
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
