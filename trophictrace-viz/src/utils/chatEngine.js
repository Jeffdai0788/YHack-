// ══════════════════════════════════════════════════════════════════
// Downstream Chat Engine — OpenAI-powered, data-aware Q&A
// Resolves locations and species from the query, pulls relevant
// segment data, and sends a focused prompt to GPT for a natural answer.
// ══════════════════════════════════════════════════════════════════

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// Location keywords → lat/lng bounding boxes for fuzzy geo matching
const LOCATION_ALIASES = {
  // States
  'alabama': { latMin: 30.2, latMax: 35, lngMin: -88.5, lngMax: -84.9 },
  'southern alabama': { latMin: 30.2, latMax: 32.5, lngMin: -88.5, lngMax: -84.9 },
  'northern alabama': { latMin: 33.5, latMax: 35, lngMin: -88.5, lngMax: -84.9 },
  'north carolina': { latMin: 33.8, latMax: 36.6, lngMin: -84.3, lngMax: -75.5 },
  'west virginia': { latMin: 37.2, latMax: 40.6, lngMin: -82.6, lngMax: -77.7 },
  'michigan': { latMin: 41.7, latMax: 46.5, lngMin: -90.4, lngMax: -82.1 },
  'wisconsin': { latMin: 42.5, latMax: 47, lngMin: -92.9, lngMax: -86.2 },
  'new jersey': { latMin: 38.9, latMax: 41.4, lngMin: -75.6, lngMax: -73.9 },
  'pennsylvania': { latMin: 39.7, latMax: 42.3, lngMin: -80.5, lngMax: -74.7 },
  'new hampshire': { latMin: 42.7, latMax: 45.3, lngMin: -72.6, lngMax: -70.7 },
  'ohio': { latMin: 38.4, latMax: 42, lngMin: -84.8, lngMax: -80.5 },
  'georgia': { latMin: 30.4, latMax: 35, lngMin: -85.6, lngMax: -80.8 },
  'massachusetts': { latMin: 41.2, latMax: 42.9, lngMin: -73.5, lngMax: -69.9 },
  'indiana': { latMin: 37.8, latMax: 41.8, lngMin: -88.1, lngMax: -84.8 },
  'minnesota': { latMin: 43.5, latMax: 49, lngMin: -97.2, lngMax: -89.5 },
  'connecticut': { latMin: 41, latMax: 42.1, lngMin: -73.7, lngMax: -71.8 },
  'virginia': { latMin: 36.5, latMax: 39.5, lngMin: -83.7, lngMax: -75.2 },
  'south dakota': { latMin: 42.5, latMax: 46, lngMin: -104.1, lngMax: -96.4 },
  'north dakota': { latMin: 45.9, latMax: 49, lngMin: -104.1, lngMax: -96.6 },
  'florida': { latMin: 24.5, latMax: 31, lngMin: -87.6, lngMax: -80 },
  'louisiana': { latMin: 29, latMax: 33, lngMin: -94.1, lngMax: -89 },
  'tennessee': { latMin: 35, latMax: 36.7, lngMin: -90.3, lngMax: -81.6 },
  'missouri': { latMin: 36, latMax: 40.6, lngMin: -95.8, lngMax: -89.1 },
  'new york': { latMin: 40.5, latMax: 45, lngMin: -79.8, lngMax: -71.9 },
  'california': { latMin: 32.5, latMax: 42, lngMin: -124.5, lngMax: -114 },
  'southern california': { latMin: 32.5, latMax: 35.5, lngMin: -121, lngMax: -114 },
  'northern california': { latMin: 37, latMax: 42, lngMin: -124.5, lngMax: -119 },
  'oregon': { latMin: 42, latMax: 46.3, lngMin: -124.6, lngMax: -116.5 },
  'washington': { latMin: 45.5, latMax: 49, lngMin: -124.8, lngMax: -116.9 },
  'washington state': { latMin: 45.5, latMax: 49, lngMin: -124.8, lngMax: -116.9 },
  'arizona': { latMin: 31.3, latMax: 37, lngMin: -115, lngMax: -109 },
  // Rivers / bodies
  'mississippi': { latMin: 29.5, latMax: 47, lngMin: -91.5, lngMax: -89 },
  'mississippi river': { latMin: 29.5, latMax: 47, lngMin: -91.5, lngMax: -89 },
  'ohio river': { latMin: 37, latMax: 40.5, lngMin: -89, lngMax: -80 },
  'missouri river': { latMin: 38.5, latMax: 48, lngMin: -104.5, lngMax: -90 },
  'cape fear': { latMin: 34, latMax: 35.5, lngMin: -79.5, lngMax: -78 },
  'cape fear river': { latMin: 34, latMax: 35.5, lngMin: -79.5, lngMax: -78 },
  'lake michigan': { latMin: 41.5, latMax: 46.2, lngMin: -88.2, lngMax: -84.5 },
  'lake erie': { latMin: 41.3, latMax: 42.9, lngMin: -83.6, lngMax: -78.8 },
  'lake ontario': { latMin: 43, latMax: 44.3, lngMin: -79.8, lngMax: -76 },
  'delaware river': { latMin: 39.5, latMax: 41.5, lngMin: -75.5, lngMax: -74.5 },
  'potomac': { latMin: 38, latMax: 39.8, lngMin: -78, lngMax: -76 },
  'potomac river': { latMin: 38, latMax: 39.8, lngMin: -78, lngMax: -76 },
  'tennessee river': { latMin: 34, latMax: 36, lngMin: -88, lngMax: -86 },
  'merrimack': { latMin: 42.6, latMax: 43.1, lngMin: -71.8, lngMax: -71 },
  'connecticut river': { latMin: 41, latMax: 43, lngMin: -72.8, lngMax: -72 },
  'savannah river': { latMin: 32, latMax: 34.5, lngMin: -82.8, lngMax: -81 },
  'charles river': { latMin: 42.3, latMax: 42.4, lngMin: -71.2, lngMax: -71 },
  'passaic': { latMin: 40.8, latMax: 41, lngMin: -74.3, lngMax: -74 },
  'cuyahoga': { latMin: 41.4, latMax: 41.6, lngMin: -81.8, lngMax: -81.6 },
  'huron river': { latMin: 42.2, latMax: 42.4, lngMin: -83.9, lngMax: -83.6 },
  'flint river': { latMin: 42.9, latMax: 43.1, lngMin: -83.8, lngMax: -83.6 },
  'fox river': { latMin: 44.3, latMax: 44.6, lngMin: -88.2, lngMax: -87.9 },
  'red river': { latMin: 45.5, latMax: 49, lngMin: -97.2, lngMax: -96.5 },
  'james river': { latMin: 37, latMax: 38, lngMin: -79.5, lngMax: -76 },
  'kalamazoo': { latMin: 42.3, latMax: 42.6, lngMin: -86.3, lngMax: -86 },
  'columbia river': { latMin: 45, latMax: 46.5, lngMin: -124.5, lngMax: -119 },
  'columbia': { latMin: 45, latMax: 46.5, lngMin: -124.5, lngMax: -119 },
  'puget sound': { latMin: 47, latMax: 48.5, lngMin: -123, lngMax: -122 },
  'sacramento river': { latMin: 38, latMax: 41, lngMin: -122.5, lngMax: -121 },
  'san francisco bay': { latMin: 37.5, latMax: 38, lngMin: -122.5, lngMax: -122 },
  'sf bay': { latMin: 37.5, latMax: 38, lngMin: -122.5, lngMax: -122 },
  'la river': { latMin: 33.8, latMax: 34.2, lngMin: -118.4, lngMax: -118 },
  'los angeles river': { latMin: 33.8, latMax: 34.2, lngMin: -118.4, lngMax: -118 },
  'san diego bay': { latMin: 32.6, latMax: 32.8, lngMin: -117.3, lngMax: -117 },
  'colorado river': { latMin: 32, latMax: 37, lngMin: -115, lngMax: -114 },
  'salt river': { latMin: 33.3, latMax: 33.6, lngMin: -112.1, lngMax: -111.8 },
  'willamette river': { latMin: 45.3, latMax: 45.6, lngMin: -122.8, lngMax: -122.5 },
  'willamette': { latMin: 45.3, latMax: 45.6, lngMin: -122.8, lngMax: -122.5 },
  // Cities
  'decatur': { latMin: 34.4, latMax: 34.7, lngMin: -87.2, lngMax: -86.8 },
  'parkersburg': { latMin: 39.1, latMax: 39.4, lngMin: -81.7, lngMax: -81.4 },
  'fayetteville': { latMin: 34.9, latMax: 35.2, lngMin: -79.1, lngMax: -78.7 },
  'minneapolis': { latMin: 44.9, latMax: 45.1, lngMin: -93.4, lngMax: -93.2 },
  'st. louis': { latMin: 38.5, latMax: 38.8, lngMin: -90.3, lngMax: -90.1 },
  'st louis': { latMin: 38.5, latMax: 38.8, lngMin: -90.3, lngMax: -90.1 },
  'new orleans': { latMin: 29.8, latMax: 30.1, lngMin: -90.2, lngMax: -89.9 },
  'memphis': { latMin: 35, latMax: 35.3, lngMin: -90.2, lngMax: -89.9 },
  'washington dc': { latMin: 38.8, latMax: 39, lngMin: -77.1, lngMax: -76.9 },
  'washington d.c.': { latMin: 38.8, latMax: 39, lngMin: -77.1, lngMax: -76.9 },
  'cleveland': { latMin: 41.4, latMax: 41.6, lngMin: -81.8, lngMax: -81.6 },
  'boston': { latMin: 42.3, latMax: 42.4, lngMin: -71.2, lngMax: -71 },
  'newark': { latMin: 40.7, latMax: 41, lngMin: -74.3, lngMax: -74 },
  'milwaukee': { latMin: 42.9, latMax: 43.1, lngMin: -88, lngMax: -87.8 },
  'green bay': { latMin: 44.3, latMax: 44.6, lngMin: -88.2, lngMax: -87.9 },
  'toledo': { latMin: 41.6, latMax: 41.8, lngMin: -83.6, lngMax: -83.4 },
  'rochester': { latMin: 43.1, latMax: 43.3, lngMin: -77.7, lngMax: -77.5 },
  'atlanta': { latMin: 33.7, latMax: 34, lngMin: -84.5, lngMax: -84.3 },
  'savannah': { latMin: 32, latMax: 32.2, lngMin: -81.2, lngMax: -81 },
  'sioux falls': { latMin: 43.4, latMax: 43.7, lngMin: -96.8, lngMax: -96.6 },
  'fargo': { latMin: 46.8, latMax: 47, lngMin: -96.9, lngMax: -96.7 },
  'bismarck': { latMin: 46.7, latMax: 46.9, lngMin: -100.9, lngMax: -100.6 },
  'ann arbor': { latMin: 42.2, latMax: 42.4, lngMin: -83.8, lngMax: -83.6 },
  'flint': { latMin: 42.9, latMax: 43.1, lngMin: -83.8, lngMax: -83.6 },
  'waukegan': { latMin: 42.3, latMax: 42.4, lngMin: -87.9, lngMax: -87.8 },
  'gary': { latMin: 41.5, latMax: 41.7, lngMin: -87.5, lngMax: -87.3 },
  'traverse city': { latMin: 44.7, latMax: 44.8, lngMin: -85.7, lngMax: -85.5 },
  'richmond': { latMin: 37.5, latMax: 37.6, lngMin: -77.5, lngMax: -77.3 },
  'harrisburg': { latMin: 40.2, latMax: 40.3, lngMin: -76.9, lngMax: -76.8 },
  'hartford': { latMin: 41.3, latMax: 41.8, lngMin: -72.7, lngMax: -72.3 },
  'portland': { latMin: 45.4, latMax: 45.6, lngMin: -122.8, lngMax: -122.5 },
  'seattle': { latMin: 47.5, latMax: 47.7, lngMin: -122.4, lngMax: -122.3 },
  'sacramento': { latMin: 38.5, latMax: 38.7, lngMin: -121.6, lngMax: -121.4 },
  'san francisco': { latMin: 37.7, latMax: 37.9, lngMin: -122.5, lngMax: -122.3 },
  'los angeles': { latMin: 33.9, latMax: 34.1, lngMin: -118.4, lngMax: -118.1 },
  'san diego': { latMin: 32.6, latMax: 32.8, lngMin: -117.3, lngMax: -117.1 },
  'phoenix': { latMin: 33.3, latMax: 33.6, lngMin: -112.1, lngMax: -111.8 },
  'yuma': { latMin: 32.6, latMax: 32.8, lngMin: -114.7, lngMax: -114.5 },
  'oak harbor': { latMin: 48.3, latMax: 48.4, lngMin: -122.7, lngMax: -122.6 },
  'orlando': { latMin: 28.3, latMax: 28.6, lngMin: -81.5, lngMax: -81.2 },
  'jacksonville': { latMin: 30.1, latMax: 30.4, lngMin: -81.8, lngMax: -81.5 },
  'miami': { latMin: 25.7, latMax: 25.9, lngMin: -80.4, lngMax: -80.2 },
  'tampa': { latMin: 27.7, latMax: 28, lngMin: -82.6, lngMax: -82.4 },
  'pensacola': { latMin: 30.3, latMax: 30.5, lngMin: -87.4, lngMax: -87.2 },
}

const SPECIES_ALIASES = {
  'largemouth bass': 'Largemouth Bass',
  'largemouth': 'Largemouth Bass',
  'bass': 'Largemouth Bass',
  'striped bass': 'Striped Bass',
  'striper': 'Striped Bass',
  'sea bass': 'Striped Bass',
  'channel catfish': 'Channel Catfish',
  'catfish': 'Channel Catfish',
  'bluegill': 'Bluegill',
  'common carp': 'Common Carp',
  'carp': 'Common Carp',
  'brown trout': 'Brown Trout',
  'trout': 'Brown Trout',
  'white perch': 'White Perch',
  'perch': 'White Perch',
  'flathead catfish': 'Flathead Catfish',
  'flathead': 'Flathead Catfish',
}

function findLocation(query) {
  const q = query.toLowerCase()
  const sorted = Object.keys(LOCATION_ALIASES).sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (q.includes(key)) return { name: key, bounds: LOCATION_ALIASES[key] }
  }
  return null
}

function findSpecies(query) {
  const q = query.toLowerCase()
  const sorted = Object.keys(SPECIES_ALIASES).sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (q.includes(key)) return SPECIES_ALIASES[key]
  }
  return null
}

function segmentsInBounds(segments, bounds) {
  return segments.filter(s =>
    s.latitude >= bounds.latMin && s.latitude <= bounds.latMax &&
    s.longitude >= bounds.lngMin && s.longitude <= bounds.lngMax
  )
}

// Build a concise data summary for the LLM prompt
function buildDataContext(query, allData) {
  const location = findLocation(query)
  const species = findSpecies(query)

  let relevantSegments = location
    ? segmentsInBounds(allData.segments, location.bounds)
    : null

  // If no location matched, take the top 20 most relevant by name similarity
  if (!relevantSegments || relevantSegments.length === 0) {
    relevantSegments = allData.segments.slice(0, 30)
  }

  // Cap at 40 segments to avoid token bloat
  if (relevantSegments.length > 40) {
    // Keep a representative sample: sort by PFAS desc, take top 15 + random 15
    const sorted = [...relevantSegments].sort((a, b) => b.predicted_water_pfas_ng_l - a.predicted_water_pfas_ng_l)
    const top = sorted.slice(0, 15)
    const rest = sorted.slice(15)
    const sampled = rest.sort(() => Math.random() - 0.5).slice(0, 15)
    relevantSegments = [...top, ...sampled]
  }

  // Summarize segments
  const segSummaries = relevantSegments.map(s => {
    const speciesList = (s.species || []).map(sp =>
      `${sp.common_name}: tissue=${sp.tissue_total_pfas_ng_g}ng/g, safety=${sp.safety_status_recreational}, servings/mo=${sp.safe_servings_per_month_recreational}`
    ).join('; ')

    return `- ${s.name} (${s.latitude.toFixed(2)},${s.longitude.toFixed(2)}): water_pfas=${s.predicted_water_pfas_ng_l}ng/L, risk=${s.risk_level}, monthly=[${(s.monthly_pfas_ng_l || []).join(',')}] | Species: ${speciesList}`
  })

  // Global stats
  const allPfas = allData.segments.map(s => s.predicted_water_pfas_ng_l)
  const globalMean = (allPfas.reduce((a, b) => a + b, 0) / allPfas.length).toFixed(1)
  const aboveEPA = allPfas.filter(v => v > 4).length

  let context = `Downstream PFAS Database: ${allData.segments.length} monitoring sites across US waterways.\n`
  context += `Global mean: ${globalMean} ng/L. ${aboveEPA} sites (${((aboveEPA/allPfas.length)*100).toFixed(0)}%) exceed EPA 4 ng/L MCL.\n`
  context += `EPA thresholds: ≤4 ng/L = safe, 4-10 = moderate, 10+ = high, 70+ = critical.\n`
  context += `Species modeled: Largemouth Bass, Striped Bass, Channel Catfish, Bluegill, Common Carp, Brown Trout, White Perch, Flathead Catfish.\n`
  context += `6 PFAS congeners tracked: PFOS, PFOA, PFNA, PFHxS, PFDA, GenX.\n\n`

  if (location) {
    context += `Location resolved: "${location.name}" (${relevantSegments.length} sites in range).\n`
  }
  if (species) {
    context += `Species resolved: "${species}".\n`
  }

  context += `\nRelevant monitoring data:\n${segSummaries.join('\n')}`

  return context
}

const SYSTEM_PROMPT = `You are Downstream AI, an expert assistant for PFAS contamination data in US waterways. You help users understand water contamination levels, fish safety, and health risks.

Key facts:
- EPA MCL (Maximum Contaminant Level) for PFOA/PFOS is 4 ng/L (parts per trillion)
- Most US waterways exceed this threshold
- Fish bioaccumulate PFAS through the food chain; tissue concentrations can be much higher than water
- Hazard quotient >1 means consumption exceeds safe reference dose
- "safe" = generally okay for recreational consumption, "limited" = reduce servings, "unsafe" = avoid
- Monthly values show seasonal variation (snowmelt dilution in spring, low-flow concentration in summer)

Guidelines:
- Be concise but informative (2-4 paragraphs max)
- Always cite specific numbers from the data provided
- If the data shows a species is unsafe, clearly warn the user
- If asked about an area with no data, say so honestly
- Use markdown bold (**text**) for emphasis on key numbers and safety statuses
- Don't use bullet points; write in natural flowing prose
- Be direct about health implications — don't hedge excessively`

// ══════════════════════════════════════════════════════════════════
// Main answer function — calls OpenAI API
// ══════════════════════════════════════════════════════════════════
export async function answerQuery(query, allData) {
  if (!OPENAI_API_KEY) {
    return 'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.'
  }

  const dataContext = buildDataContext(query, allData)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Here is the relevant PFAS monitoring data:\n\n${dataContext}\n\nUser question: ${query}` },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `API error ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'No response generated.'
  } catch (err) {
    console.error('OpenAI API error:', err)
    return `Sorry, I couldn't process that request: ${err.message}`
  }
}
