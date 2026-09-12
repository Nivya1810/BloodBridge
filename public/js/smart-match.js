/**
 * BloodBridge Smart Matching Engine
 * Implements clinical ABO/Rh compatibility standards and weighted scoring.
 * 
 * IMPORTANT DISCLAIMER:
 * This algorithm is for logistics and coordination triage only.
 * Final compatibility, cross-matching, antibody screening, and transfusion
 * safety must be verified by qualified blood bank pathologists.
 */

const BloodBridgeMatching = (function() {
  // RBC Transfusion Compatibility Rules (Recipient -> Compatible Donors)
  const COMPATIBILITY_RULES = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'] // Universal donor
  };

  function isCompatible(donorGroup, recipientGroup) {
    if (!donorGroup || !recipientGroup) return false;
    const compatibleDonors = COMPATIBILITY_RULES[recipientGroup.trim().toUpperCase()] || [];
    return compatibleDonors.includes(donorGroup.trim().toUpperCase());
  }

  function calculateScore(donor, request) {
    // 1. Antigen Biological Compatibility Check
    const compatible = isCompatible(donor.bloodGroup, request.bloodGroup);
    if (!compatible) return 0;

    let score = 40; // Base score for compatibility

    // Identical blood group bonus
    if (donor.bloodGroup.toUpperCase() === request.bloodGroup.toUpperCase()) {
      score += 10;
    }

    // 2. Availability (up to 20 pts)
    if (donor.availability) {
      score += 20;
    } else {
      score -= 15;
    }

    // 3. Distance Proximity (up to 15 pts)
    const dist = donor.distanceKm || 5;
    if (dist <= 3) score += 15;
    else if (dist <= 7) score += 10;
    else if (dist <= 15) score += 5;
    else score += 2;

    // 4. Clinical Cooldown Safety (90-day whole blood rule) (up to 10 pts)
    if (donor.lastDonationDate) {
      const lastDate = new Date(donor.lastDonationDate);
      const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 90) score += 10;
      else if (diffDays >= 60) score += 4;
      else score -= 25; // Critical safety penalty for recent donation
    } else {
      score += 10; // First-time volunteer
    }

    // 5. Verification & Urgency factors
    if (donor.verified) score += 3;
    if (request.urgency === 'Critical') score += 2;

    return Math.min(Math.max(score, 0), 100);
  }

  function getCompatibilitySummary(bloodGroup) {
    const bg = bloodGroup.toUpperCase();
    const canReceiveFrom = COMPATIBILITY_RULES[bg] || [];
    
    // Calculate who this group can donate to
    const canDonateTo = [];
    for (const [recip, donors] of Object.entries(COMPATIBILITY_RULES)) {
      if (donors.includes(bg)) canDonateTo.push(recip);
    }

    return {
      group: bg,
      canReceiveFrom,
      canDonateTo,
      isUniversalDonor: bg === 'O-',
      isUniversalRecipient: bg === 'AB+'
    };
  }

  return {
    isCompatible,
    calculateScore,
    getCompatibilitySummary,
    COMPATIBILITY_RULES
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BloodBridgeMatching;
}
