export const ENV_CENTERS = [
  // ── EPA Regional Offices ────────────────────────────────────────────────
  {
    id: 'epa_r1', name: 'EPA Region 1 — New England', type: 'epa_regional',
    lat: 42.360, lng: -71.059, phone: '1-888-372-7341',
    url: 'https://www.epa.gov/pfas', states: ['CT','MA','ME','NH','RI','VT'],
  },
  {
    id: 'epa_r2', name: 'EPA Region 2 — New York / New Jersey', type: 'epa_regional',
    lat: 40.713, lng: -74.006, phone: '1-212-637-3000',
    url: 'https://www.epa.gov/pfas', states: ['NJ','NY'],
  },
  {
    id: 'epa_r3', name: 'EPA Region 3 — Mid-Atlantic', type: 'epa_regional',
    lat: 39.953, lng: -75.165, phone: '1-800-438-2474',
    url: 'https://www.epa.gov/pfas', states: ['DC','DE','MD','PA','VA','WV'],
  },
  {
    id: 'epa_r4', name: 'EPA Region 4 — Southeast', type: 'epa_regional',
    lat: 33.749, lng: -84.388, phone: '1-800-241-1754',
    url: 'https://www.epa.gov/pfas', states: ['AL','FL','GA','KY','MS','NC','SC','TN'],
  },
  {
    id: 'epa_r5', name: 'EPA Region 5 — Great Lakes', type: 'epa_regional',
    lat: 41.878, lng: -87.630, phone: '1-800-621-8431',
    url: 'https://www.epa.gov/pfas', states: ['IL','IN','MI','MN','OH','WI'],
  },
  {
    id: 'epa_r7', name: 'EPA Region 7 — Central Plains', type: 'epa_regional',
    lat: 39.100, lng: -94.579, phone: '1-800-223-0425',
    url: 'https://www.epa.gov/pfas', states: ['IA','KS','MO','NE'],
  },
  {
    id: 'epa_r8', name: 'EPA Region 8 — Mountain West', type: 'epa_regional',
    lat: 39.739, lng: -104.990, phone: '1-800-227-8917',
    url: 'https://www.epa.gov/pfas', states: ['CO','MT','ND','SD','UT','WY'],
  },
  {
    id: 'epa_r9', name: 'EPA Region 9 — Pacific Southwest', type: 'epa_regional',
    lat: 37.775, lng: -122.419, phone: '1-866-372-9378',
    url: 'https://www.epa.gov/pfas', states: ['AZ','CA','HI','NV'],
  },
  // ── State PFAS Programs ─────────────────────────────────────────────────
  {
    id: 'state_mi', name: 'Michigan PFAS Action Response Team (MPART)', type: 'state_pfas',
    lat: 42.733, lng: -84.556, phone: '1-800-662-9278',
    url: 'https://www.michigan.gov/pfasresponse', states: ['MI'],
  },
  {
    id: 'state_nc', name: 'NC PFAS Testing Network — DHHS', type: 'state_pfas',
    lat: 35.780, lng: -78.638, phone: '1-919-707-5000',
    url: 'https://epi.dph.ncdhhs.gov', states: ['NC'],
  },
  {
    id: 'state_vt', name: 'Vermont PFAS Program — ANR', type: 'state_pfas',
    lat: 44.260, lng: -72.575, phone: '1-802-828-1535',
    url: 'https://dec.vermont.gov/pfas', states: ['VT'],
  },
  {
    id: 'state_nh', name: 'NH PFAS Investigation — DES', type: 'state_pfas',
    lat: 43.208, lng: -71.538, phone: '1-603-271-3503',
    url: 'https://www.des.nh.gov/pfas', states: ['NH'],
  },
  {
    id: 'state_nj', name: 'NJ PFAS Program — DEP', type: 'state_pfas',
    lat: 40.221, lng: -74.760, phone: '1-609-292-2885',
    url: 'https://www.nj.gov/dep/pfas', states: ['NJ'],
  },
  {
    id: 'state_pa', name: 'Pennsylvania PFAS Response — DEP', type: 'state_pfas',
    lat: 40.270, lng: -76.876, phone: '1-800-541-2050',
    url: 'https://www.dep.pa.gov/pfas', states: ['PA'],
  },
  // ── National Hotlines ───────────────────────────────────────────────────
  {
    id: 'nat_sdw', name: 'EPA Safe Drinking Water Hotline', type: 'national_hotline',
    lat: 38.907, lng: -77.037, phone: '1-800-426-4791',
    url: 'https://www.epa.gov/ground-water-and-drinking-water', states: ['*'],
  },
  {
    id: 'nat_atsdr', name: 'ATSDR PFAS Information Line', type: 'national_hotline',
    lat: 38.907, lng: -77.037, phone: '1-800-232-4636',
    url: 'https://www.atsdr.cdc.gov/pfas', states: ['*'],
  },
]

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearestCenter(lat, lng) {
  let best = null, bestDist = Infinity
  for (const c of ENV_CENTERS) {
    const d = haversineKm(lat, lng, c.lat, c.lng)
    if (d < bestDist) { bestDist = d; best = { ...c, distance_km: Math.round(d) } }
  }
  return best
}
