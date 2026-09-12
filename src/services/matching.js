// Lightweight, dependency-free lost/found matching engine.
// Pure functions only, so verification can reuse the same scoring later.

export const MATCH_THRESHOLD = 60
export const HIGH_CONFIDENCE_THRESHOLD = 85
const DATE_WINDOW_DAYS = 14

const WEIGHTS = {
  category: 0.2,
  name: 0.2,
  description: 0.2,
  location: 0.15,
  campus: 0.1,
  date: 0.1,
  attribute: 0.05,
}

// Canonical term first; every other entry is a wording variant that should
// be treated as the same thing. Add more groups here as new item types show up.
const SYNONYM_GROUPS = [
  ['earphone', 'earphones', 'earbud', 'earbuds', 'wireless earbuds', 'ear buds', 'headphone', 'headphones', 'airpods'],
  ['phone', 'smartphone', 'smart phone', 'mobile phone', 'mobile', 'cell phone', 'iphone'],
  ['backpack', 'bag', 'rucksack', 'knapsack'],
  ['charger', 'charging cable', 'charging cord', 'charging wire', 'power cable', 'usb cable', 'cable'],
  ['power bank', 'powerbank', 'battery bank', 'portable charger'],
  ['bottle', 'water bottle', 'flask'],
  ['wallet', 'purse'],
  ['id card', 'student id', 'identity card', 'id'],
  ['laptop', 'notebook computer'],
  ['keys', 'keychain', 'key set'],
]

const SYNONYM_PAIRS = SYNONYM_GROUPS.flatMap(([canonical, ...variants]) =>
  variants.map((variant) => [variant, canonical]),
).sort((a, b) => b[0].length - a[0].length)

const STOPWORDS = new Set([
  'a', 'an', 'the', 'with', 'and', 'or', 'of', 'in', 'on', 'near', 'at', 'for', 'is', 'was', 'has', 'have', 'no', 'not', 'to',
])

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applySynonyms(text) {
  return SYNONYM_PAIRS.reduce((result, [variant, canonical]) => {
    const pattern = new RegExp(`\\b${escapeRegExp(variant)}\\b`, 'gi')
    return result.replace(pattern, canonical)
  }, text)
}

function normalizeText(text) {
  if (!text) return ''
  const lowered = text.toString().toLowerCase()
  const withSynonyms = applySynonyms(lowered)
  return withSynonyms
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeSimple(text) {
  return (text ?? '').toString().trim().toLowerCase()
}

function tokenize(normalized) {
  if (!normalized) return []
  return normalized.split(' ').filter((token) => token && !STOPWORDS.has(token))
}

function jaccardSimilarity(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0
  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection += 1
  }
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

function levenshtein(a, b) {
  const rows = a.length + 1
  const cols = b.length + 1
  const distance = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)])
  for (let j = 0; j < cols; j += 1) distance[0][j] = j

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      distance[i][j] = Math.min(
        distance[i - 1][j] + 1,
        distance[i][j - 1] + 1,
        distance[i - 1][j - 1] + cost,
      )
    }
  }
  return distance[rows - 1][cols - 1]
}

// Combines token overlap (handles reordered/partial phrases) with edit
// distance (handles typos and near-identical strings) into one 0..1 score.
export function textSimilarity(rawA, rawB) {
  const normA = normalizeText(rawA)
  const normB = normalizeText(rawB)
  if (!normA || !normB) return 0
  if (normA === normB) return 1

  const jaccard = jaccardSimilarity(tokenize(normA), tokenize(normB))
  const maxLen = Math.max(normA.length, normB.length) || 1
  const editSimilarity = 1 - levenshtein(normA, normB) / maxLen

  return clamp(0.6 * jaccard + 0.4 * editSimilarity, 0, 1)
}

function exactSimilarity(rawA, rawB) {
  const a = normalizeSimple(rawA)
  const b = normalizeSimple(rawB)
  if (!a || !b) return 0
  return a === b ? 1 : 0
}

function dateProximityScore(dateA, dateB) {
  if (!dateA || !dateB) return 0
  const a = new Date(dateA)
  const b = new Date(dateB)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  const diffDays = Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays > DATE_WINDOW_DAYS) return 0
  return clamp(1 - diffDays / DATE_WINDOW_DAYS, 0, 1)
}

function attributeSimilarity(lostItem, foundItem) {
  const lostAttr = lostItem.distinguishing_detail || lostItem.description || ''
  const foundAttr = foundItem.distinguishing_detail || foundItem.description || ''
  return textSimilarity(lostAttr, foundAttr)
}

function buildReasons({ categorySim, nameSim, descriptionSim, locationSim, campusSim, dateSim, attributeSim, lostItem }) {
  const reasons = []

  if (categorySim === 1) reasons.push(`Same category (${lostItem.category})`)
  if (nameSim >= 0.75) reasons.push('Item names closely match')
  else if (nameSim >= 0.4) reasons.push('Similar item name')
  if (descriptionSim >= 0.6) reasons.push('Similar item description')
  if (attributeSim >= 0.5) reasons.push('Matching distinguishing details')
  if (campusSim === 1) reasons.push('Same campus')
  if (locationSim >= 0.7) reasons.push('Same location')
  else if (locationSim >= 0.35) reasons.push('Similar location')
  if (dateSim >= 0.95) reasons.push('Reported on the same day')
  else if (dateSim >= 0.6) reasons.push('Reports are close in time')

  if (reasons.length === 0) {
    reasons.push('Some overlap across category, timing, and description')
  }

  return reasons
}

// Deterministic 0..1 signals combined via the weights above, then rounded to
// a 0..100 score. No AI calls, no randomness — same inputs always score the same.
export function computeMatchScore(lostItem, foundItem) {
  const signals = {
    categorySim: exactSimilarity(lostItem.category, foundItem.category),
    nameSim: textSimilarity(lostItem.item_name, foundItem.item_name),
    descriptionSim: textSimilarity(lostItem.description, foundItem.description),
    locationSim: textSimilarity(lostItem.location, foundItem.location),
    campusSim: exactSimilarity(lostItem.campus, foundItem.campus),
    dateSim: dateProximityScore(lostItem.date_lost, foundItem.date_found),
    attributeSim: attributeSimilarity(lostItem, foundItem),
  }

  const weightedScore =
    signals.categorySim * WEIGHTS.category +
    signals.nameSim * WEIGHTS.name +
    signals.descriptionSim * WEIGHTS.description +
    signals.locationSim * WEIGHTS.location +
    signals.campusSim * WEIGHTS.campus +
    signals.dateSim * WEIGHTS.date +
    signals.attributeSim * WEIGHTS.attribute

  const score = Math.round(clamp(weightedScore, 0, 1) * 100)
  const reasons = buildReasons({ ...signals, lostItem, foundItem })

  return { score, reasons, breakdown: signals }
}

export function getMatchStatus(score) {
  return score >= HIGH_CONFIDENCE_THRESHOLD ? 'High Confidence' : 'Possible Match'
}

// Scores every lost x found pair, keeps ones at/above the threshold, and
// sorts strongest-first so the UI can render top matches directly.
export function findMatches(lostItems, foundItems, threshold = MATCH_THRESHOLD) {
  const results = []

  for (const lostItem of lostItems) {
    for (const foundItem of foundItems) {
      const { score, reasons, breakdown } = computeMatchScore(lostItem, foundItem)
      if (score >= threshold) {
        results.push({ lostItem, foundItem, score, reasons, breakdown })
      }
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

// How closely a claimant's answer must match the private record on the
// original lost report. Tuned for short phrases. Easy to retune here.
export const ANSWER_MATCH_THRESHOLD = 0.45

// Verification answers are typically a short phrase checked against a much
// longer stored reference (distinguishing_detail or description). Symmetric
// measures like textSimilarity() penalize that length mismatch too harshly
// (a long reference has many words the short answer never mentions), so this
// instead asks "is the answer's content contained in the reference", with an
// edit-distance fallback for short near-identical phrasing. A single-word
// answer is never trusted via containment alone (it would trivially match
// any one word from a long reference) -- it must be near-identical instead.
function answerSimilarity(reference, answer) {
  const normRef = normalizeText(reference)
  const normAns = normalizeText(answer)
  if (!normRef || !normAns) return 0
  if (normRef === normAns) return 1

  const refTokens = new Set(tokenize(normRef))
  const ansTokens = new Set(tokenize(normAns))
  const maxLen = Math.max(normRef.length, normAns.length) || 1
  const editSimilarity = 1 - levenshtein(normRef, normAns) / maxLen

  if (refTokens.size === 0 || ansTokens.size === 0 || ansTokens.size < 2) {
    return editSimilarity
  }

  let matched = 0
  for (const token of ansTokens) {
    if (refTokens.has(token)) matched += 1
  }

  const requiredMatches = 2
  if (matched < requiredMatches) return editSimilarity

  const containment = matched / ansTokens.size
  return clamp(Math.max(containment, editSimilarity), 0, 1)
}

// Compares a claimant's free-text answer against the selected lost report's
// distinguishing_detail AND description -- claimants (and finders reviewing
// their own lost report) don't always put the identifying feature in the
// dedicated "distinguishing detail" field; it's often folded into the free-text
// description instead. Checking both, and keeping whichever scores higher,
// keeps this generic across every item rather than trusting one field only.
export function checkAnswerMatch(lostItem, claimantAnswer) {
  const detailSimilarity = answerSimilarity(lostItem?.distinguishing_detail, claimantAnswer)
  const descriptionSimilarity = answerSimilarity(lostItem?.description, claimantAnswer)
  const similarity = Math.max(detailSimilarity, descriptionSimilarity)
  return { similarity, isMatch: similarity >= ANSWER_MATCH_THRESHOLD }
}
