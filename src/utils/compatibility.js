/**
 * Blood Type Compatibility Matrix & Logic Helper
 */

const COMPATIBILITY_RULES = {
  'A+': {
    canGiveTo: ['A+', 'AB+'],
    canReceiveFrom: ['A+', 'A-', 'O+', 'O-']
  },
  'A-': {
    canGiveTo: ['A+', 'A-', 'AB+', 'AB-'],
    canReceiveFrom: ['A-', 'O-']
  },
  'B+': {
    canGiveTo: ['B+', 'AB+'],
    canReceiveFrom: ['B+', 'B-', 'O+', 'O-']
  },
  'B-': {
    canGiveTo: ['B+', 'B-', 'AB+', 'AB-'],
    canReceiveFrom: ['B-', 'O-']
  },
  'AB+': {
    canGiveTo: ['AB+'],
    canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] // Universal recipient
  },
  'AB-': {
    canGiveTo: ['AB+', 'AB-'],
    canReceiveFrom: ['AB-', 'A-', 'B-', 'O-']
  },
  'O+': {
    canGiveTo: ['O+', 'A+', 'B+', 'AB+'],
    canReceiveFrom: ['O+', 'O-']
  },
  'O-': {
    canGiveTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal donor
    canReceiveFrom: ['O-']
  }
};

/**
 * Get compatible donor blood types for a patient needing blood of targetGroup
 * @param {string} targetGroup 
 * @returns {Array<string>} List of compatible donor blood groups
 */
function getCompatibleDonors(targetGroup) {
  const rule = COMPATIBILITY_RULES[targetGroup];
  return rule ? rule.canReceiveFrom : [targetGroup];
}

/**
 * Get compatible recipient blood types for a donor having donorGroup
 * @param {string} donorGroup 
 * @returns {Array<string>} List of compatible recipient blood groups
 */
function getCompatibleRecipients(donorGroup) {
  const rule = COMPATIBILITY_RULES[donorGroup];
  return rule ? rule.canGiveTo : [donorGroup];
}

/**
 * Check if a donor is compatible with a recipient
 * @param {string} donorGroup 
 * @param {string} recipientGroup 
 * @returns {boolean}
 */
function isCompatible(donorGroup, recipientGroup) {
  const compatibleDonors = getCompatibleDonors(recipientGroup);
  return compatibleDonors.includes(donorGroup);
}

module.exports = {
  COMPATIBILITY_RULES,
  getCompatibleDonors,
  getCompatibleRecipients,
  isCompatible
};
