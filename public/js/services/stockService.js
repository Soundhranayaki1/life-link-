/**
 * LIFE LINK – Blood Stock Intelligence & Nearby Stock Visibility Service
 * Provides stock availability levels and nearby certified facility stock visibility for authorized orgs.
 * NOTE: Informational only. Final blood transfer handled by authorized medical personnel.
 */

const StockService = {
  getNearbyStockSources(bloodGroup, city = 'Mumbai') {
    return [
      {
        facilityName: 'City Central Blood Bank',
        facilityType: 'Certified Blood Bank',
        distanceKm: 4.6,
        bloodGroup: bloodGroup || 'O+',
        unitsAvailable: 18,
        contactPhone: '+91 22 2493 0000',
        verificationStatus: 'VERIFIED'
      },
      {
        facilityName: 'Red Cross Regional Blood Center',
        facilityType: 'Government-Certified Center',
        distanceKm: 6.2,
        bloodGroup: bloodGroup || 'O+',
        unitsAvailable: 11,
        contactPhone: '+91 11 2371 6441',
        verificationStatus: 'VERIFIED'
      }
    ];
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StockService;
}
