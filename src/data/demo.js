export const stats = [
  { label: 'Items reported', value: '128', hint: 'This semester' },
  { label: 'Potential matches', value: '34', hint: 'Awaiting review' },
  { label: 'Returned', value: '19', hint: 'Verified owners' },
  { label: 'Avg. return time', value: '2.4d', hint: 'Demo campus' },
]

export const items = [
  {
    id: 'LF-2041',
    type: 'lost',
    title: 'Navy North Face backpack',
    category: 'Bags',
    location: 'Central Library, 2nd floor',
    date: 'Sep 8, 2026',
    status: 'Open',
    owner: 'A. Sharma',
  },
  {
    id: 'LF-2048',
    type: 'found',
    title: 'Silver Casio calculator',
    category: 'Electronics',
    location: 'Engineering Block A',
    date: 'Sep 9, 2026',
    status: 'Unclaimed',
    owner: 'Campus desk',
  },
  {
    id: 'LF-2052',
    type: 'lost',
    title: 'Black AirPods case',
    category: 'Electronics',
    location: 'Cafeteria courtyard',
    date: 'Sep 9, 2026',
    status: 'Open',
    owner: 'M. Patel',
  },
  {
    id: 'LF-2055',
    type: 'found',
    title: 'Student ID lanyard (red)',
    category: 'IDs',
    location: 'Sports complex lobby',
    date: 'Sep 10, 2026',
    status: 'Unclaimed',
    owner: 'Campus desk',
  },
  {
    id: 'LF-2033',
    type: 'lost',
    title: 'Maroon umbrella',
    category: 'Accessories',
    location: 'Bus stop 3',
    date: 'Sep 6, 2026',
    status: 'Matched',
    owner: 'R. Iyer',
  },
  {
    id: 'LF-2038',
    type: 'found',
    title: 'Blue water bottle, dented lid',
    category: 'Personal',
    location: 'Lecture Hall 4',
    date: 'Sep 7, 2026',
    status: 'Returned',
    owner: 'Campus desk',
  },
]

export const matches = [
  {
    id: 'M-118',
    lost: 'Navy North Face backpack',
    found: 'Blue-navy backpack, library desk',
    confidence: 86,
    reason: 'Same building, similar color, reported within 24 hours.',
    status: 'Needs review',
  },
  {
    id: 'M-121',
    lost: 'Black AirPods case',
    found: 'Black earbud case near cafeteria',
    confidence: 74,
    reason: 'Matching category and nearby location.',
    status: 'Needs review',
  },
  {
    id: 'M-109',
    lost: 'Maroon umbrella',
    found: 'Maroon umbrella, bus stop 3',
    confidence: 91,
    reason: 'Exact location overlap and distinctive color.',
    status: 'In verification',
  },
]

export const activity = [
  { time: '9:12 AM', text: 'New found item posted from Sports complex lobby.' },
  { time: '8:40 AM', text: 'Match M-121 flagged for student review.' },
  { time: 'Yesterday', text: 'Blue water bottle marked as returned.' },
  { time: 'Yesterday', text: 'Lost report opened for Black AirPods case.' },
]
