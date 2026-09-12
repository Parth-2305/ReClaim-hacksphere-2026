// Derives a single, mutually-exclusive display status for a lost/found report
// from real data (matches + match_verifications) instead of trusting a static
// "status" column. Nothing here mutates lost_items/found_items/match_verifications --
// it only reads the already-fetched arrays and computes a UI-facing label.
//
// Lifecycle (lost items): Lost -> Potential Match -> In Verification
//   (or Verification Failed) -> Verified
// Lifecycle (found items): Found -> Potential Match -> In Verification
//   (or Verification Failed) -> Verified
//
// "Recovered" is intentionally not modeled: there is no explicit handover/
// recovery action in the product, and a match/verification alone must not be
// read as a recovery.

export const REPORT_STATUS = {
  LOST: 'Lost',
  FOUND: 'Found',
  POTENTIAL_MATCH: 'Potential Match',
  IN_VERIFICATION: 'In Verification',
  VERIFICATION_FAILED: 'Verification Failed',
  VERIFIED: 'Verified',
}

import { getMatchStatus } from '../services/matching.js'

// Status for a single lost<->found pair (used on Matches cards and the
// Dashboard's Match activity list) so both pages always agree: a verified or
// in-progress pair takes priority over the plain score-based confidence tier.
export function deriveMatchPairStatus(score, verification) {
  if (verification?.status === 'verified') return REPORT_STATUS.VERIFIED
  if (verification?.status === 'pending') return REPORT_STATUS.IN_VERIFICATION
  if (verification?.status === 'failed') return REPORT_STATUS.VERIFICATION_FAILED
  return getMatchStatus(score)
}

// itemType: 'lost' | 'found'. matches: findMatches() output. verifications: raw match_verifications rows.
export function deriveReportStatus(item, itemType, { matches, verifications }) {
  const idField = itemType === 'lost' ? 'lost_item_id' : 'found_item_id'
  const matchField = itemType === 'lost' ? 'lostItem' : 'foundItem'

  const relatedVerifications = verifications.filter((v) => v[idField] === item.id)

  const verified = relatedVerifications.find((v) => v.status === 'verified')
  if (verified) {
    return { status: REPORT_STATUS.VERIFIED, verification: verified }
  }

  const pending = relatedVerifications.find((v) => v.status === 'pending')
  if (pending) {
    return { status: REPORT_STATUS.IN_VERIFICATION, verification: pending }
  }

  const failed = relatedVerifications.find((v) => v.status === 'failed')
  if (failed) {
    return { status: REPORT_STATUS.VERIFICATION_FAILED, verification: failed }
  }

  const relatedMatches = matches.filter((m) => m[matchField].id === item.id)
  if (relatedMatches.length > 0) {
    const bestScore = Math.max(...relatedMatches.map((m) => m.score))
    return { status: REPORT_STATUS.POTENTIAL_MATCH, matchCount: relatedMatches.length, bestScore }
  }

  return { status: itemType === 'lost' ? REPORT_STATUS.LOST : REPORT_STATUS.FOUND }
}
