import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import riverGeo from '../data/riverGeometry.json'
import { ENV_CENTERS } from '../data/envCenters'

mapboxgl.accessToken = 'pk.eyJ1IjoiamQxMjM0NTYiLCJhIjoiY21uYXR1dzdwMG43dTJwcHI0d2ltdXRzbCJ9.3tN6tOw4eqy-YGeGdU1Uhg'

const SAFE_COLOR = '#2EB872'
const LIMITED_COLOR = '#E0A030'
const MODERATE_COLOR = '#E8845A'
const UNSAFE_COLOR = '#DC4444'

// Slight blue tint for water bodies
const WATER_TINT = '#4A90D9'

// All visualization layer IDs for filtering
const VIZ_LAYERS = [
  'health-circles-glow',
  'health-circles-core',
  'water-heatmap',
  'river-contamination',
  'river-glow',
  'river-hit-area',
]

export default function MapView({ data, onSegmentHover, onSegmentClick, onCursorMove, onMapReady, speciesFilter }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (map.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !map.current) { observer.disconnect(); initMap() }
      },
      { threshold: 0.1 }
    )
    observer.observe(mapContainer.current)
    return () => { observer.disconnect(); if (map.current) map.current.remove() }
  }, [])

  // Species filter — filter river segments to only show where that species lives
  useEffect(() => {
    if (!map.current || !loaded) return

    if (!speciesFilter) {
      VIZ_LAYERS.forEach((id) => {
        if (map.current.getLayer(id)) map.current.setFilter(id, null)
      })
      return
    }

    // Find which hotspots contain this species
    const matchingHotspots = new Set()
    data.segments.forEach((seg) => {
      if (seg.species.some((sp) => sp.common_name === speciesFilter)) {
        const hotspot = getHotspotForSegment(seg)
        if (hotspot) matchingHotspots.add(hotspot)
      }
    })

    const filter = matchingHotspots.size > 0
      ? ['in', ['get', 'hotspot_id'], ['literal', [...matchingHotspots]]]
      : ['==', ['get', 'hotspot_id'], '__none__']

    VIZ_LAYERS.forEach((id) => {
      if (map.current.getLayer(id)) map.current.setFilter(id, filter)
    })
  }, [speciesFilter, loaded, data])

  function getHotspotForSegment(seg) {
    const hotspots = [
      { id: 'cape_fear',          lat: 35.05, lng: -78.88 },
      { id: 'lake_michigan',      lat: 42.80, lng: -87.20 },
      { id: 'ohio_river',         lat: 39.26, lng: -81.55 },
      { id: 'delaware_river',     lat: 40.15, lng: -74.82 },
      { id: 'huron_river',        lat: 42.28, lng: -83.74 },
      { id: 'merrimack_river',    lat: 42.84, lng: -71.30 },
      { id: 'tennessee_river',    lat: 34.58, lng: -86.96 },
      { id: 'mississippi_river',  lat: 38.63, lng: -90.19 },
      { id: 'missouri_river',     lat: 44.37, lng: -100.35 },
      { id: 'potomac_river',      lat: 38.88, lng: -77.04 },
      { id: 'connecticut_river',  lat: 41.36, lng: -72.34 },
      { id: 'savannah_river',     lat: 32.08, lng: -81.09 },
      { id: 'red_river',          lat: 46.87, lng: -96.79 },
      { id: 'james_river_va',     lat: 37.53, lng: -77.43 },
      { id: 'susquehanna_river',  lat: 40.26, lng: -76.88 },
      { id: 'passaic_river',      lat: 40.88, lng: -74.14 },
      { id: 'chattahoochee',      lat: 33.9,  lng: -84.44 },
      { id: 'cuyahoga_river',     lat: 41.5,  lng: -81.7 },
      { id: 'charles_river',      lat: 42.36, lng: -71.07 },
      { id: 'lake_erie',          lat: 41.65, lng: -83.54 },
      { id: 'flint_river',        lat: 43.01, lng: -83.69 },
      { id: 'fox_river',          lat: 44.5,  lng: -88.0 },
      { id: 'dakotas',            lat: 45.5,  lng: -99.0 },
    ]
    let minDist = Infinity
    let nearest = null
    for (const h of hotspots) {
      const d = Math.hypot(seg.latitude - h.lat, seg.longitude - h.lng)
      if (d < minDist) { minDist = d; nearest = h.id }
    }
    return minDist < 3.0 ? nearest : null
  }

  /* ------------------------------------------------------------------ */
  /*  Find the first style layer above the built-in "water" layer so    */
  /*  our viz layers sit just above water but beneath land structures,   */
  /*  roads, buildings and labels — natural land masking for free.       */
  /* ------------------------------------------------------------------ */
  function getFirstLayerAboveWater(m) {
    const layers = m.getStyle().layers
    let found = false
    for (const layer of layers) {
      if (layer.id === 'water') { found = true; continue }
      if (found) return layer.id
    }
    // Fallback: insert below the first symbol (label) layer so labels
    // and roads still render on top of our visualisation.
    for (const layer of layers) {
      if (layer.type === 'symbol') return layer.id
    }
    return undefined  // append on top as last resort
  }

  function initMap() {
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-83, 38],
      zoom: 4.2,
      minZoom: 3,
      maxZoom: 14,
      attributionControl: false,
    })

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')

    map.current.on('load', () => {
      map.current.resize()
      restyleWaterLayer()
      addRiverLayers()
      addFacilityMarkers()
      addEnvCenterMarkers()
      setLoaded(true)
      if (onMapReady) onMapReady(map.current)
    })
  }

  // --- Translucent blue tint on water bodies ---

  function restyleWaterLayer() {
    const m = map.current

    m.setPaintProperty('water', 'fill-color', WATER_TINT)
    m.setPaintProperty('water', 'fill-opacity', 0.18)

    const style = m.getStyle()
    if (style && style.layers) {
      style.layers.forEach((layer) => {
        if (layer.id.includes('waterway') && layer.type === 'line') {
          m.setPaintProperty(layer.id, 'line-color', WATER_TINT)
          m.setPaintProperty(layer.id, 'line-opacity', 0.25)
        }
      })
    }
  }

  // --- River contamination layers (zoom-dependent) ---

  function addRiverLayers() {
    const m = map.current

    // ── 1. Filter riverGeo to only features whose centroid is over water ──
    // queryRenderedFeatures only works for on-screen tiles, so features
    // that are off-screen at load (e.g. Alaska, Hawaii) are kept by default.
    // We sample the centroid plus every-other vertex for a robust check.
    const bounds = m.getBounds()
    const filteredFeatures = riverGeo.features.filter((feat) => {
      const coords = feat.geometry.type === 'Polygon'
        ? feat.geometry.coordinates[0]
        : feat.geometry.coordinates
      const n = coords.length

      // Centroid
      const cx = coords.reduce((s, c) => s + c[0], 0) / n
      const cy = coords.reduce((s, c) => s + c[1], 0) / n

      // If centroid is off-screen, keep the feature (can't query tiles)
      if (!bounds.contains([cx, cy])) return true

      // Sample centroid + every other vertex (robust for 13-pt polygons)
      const samples = [[cx, cy]]
      for (let i = 0; i < n; i += 2) samples.push(coords[i])

      let waterHits = 0
      for (const [lng, lat] of samples) {
        const pt = m.project([lng, lat])
        if (m.queryRenderedFeatures(pt, { layers: ['water'] }).length > 0) waterHits++
      }
      // Majority of sampled points must be on water
      return waterHits >= Math.ceil(samples.length * 0.4)
    })

    console.log(`Water filter: ${filteredFeatures.length}/${riverGeo.features.length} features on water`)

    const filteredGeo = { type: 'FeatureCollection', features: filteredFeatures }

    // ── 2. GeoJSON sources ──
    m.addSource('contaminated-rivers', {
      type: 'geojson',
      data: filteredGeo,
      tolerance: 0.375,
    })

    // Point centroids for circle + heatmap layers
    const waterPoints = {
      type: 'FeatureCollection',
      features: filteredFeatures.map((feat) => {
        const coords = feat.geometry.type === 'Polygon'
          ? feat.geometry.coordinates[0]
          : feat.geometry.coordinates
        const n = coords.length
        const cx = coords.reduce((s, c) => s + c[0], 0) / n
        const cy = coords.reduce((s, c) => s + c[1], 0) / n
        return {
          type: 'Feature',
          properties: feat.properties,
          geometry: { type: 'Point', coordinates: [cx, cy] },
        }
      }),
    }
    m.addSource('water-points', { type: 'geojson', data: waterPoints })

    // ── 3. Shared color expression — new thresholds: ≤4 safe, 4–10 mod, 10+ high, 70+ critical ──
    const ZONE_COLOR = [
      'interpolate', ['linear'], ['get', 'water_pfas_ng_l'],
      0,   SAFE_COLOR,
      4,   SAFE_COLOR,
      7,   LIMITED_COLOR,
      10,  MODERATE_COLOR,
      40,  UNSAFE_COLOR,
      70,  '#B91C1C',       // critical — deep red
    ]

    // ── 4. Layer insertion point — right above built-in water layer ──
    // Everything the base style draws after water (land-structure,
    // buildings, roads, labels) will render ON TOP of our layers,
    // naturally masking any slight bleed onto land.
    const insertBefore = getFirstLayerAboveWater(m)

    // ══════════════════════════════════════════════════════════════════
    //  LAYER A — ZOOMED-OUT CIRCLES: large soft regional indicators
    //  Big, visible blobs so map doesn't look black/empty from afar.
    //  Visible zoom 3 → 7, smoothly cross-fading into the heatmap.
    // ══════════════════════════════════════════════════════════════════
    m.addLayer({
      id: 'health-circles-glow',
      type: 'circle',
      source: 'water-points',
      paint: {
        'circle-radius': [
          'interpolate', ['exponential', 1.8], ['zoom'],
          3,   28,
          4.5, 40,
          5.5, 55,
          7,   70,
        ],
        'circle-color': ZONE_COLOR,
        'circle-opacity': [
          'interpolate', ['linear'], ['zoom'],
          3,   0.35,
          4.5, 0.40,
          5.5, 0.30,
          6.5, 0.15,
          7.5, 0,
        ],
        'circle-blur': 0.8,
        'circle-stroke-width': 0,
      },
    }, insertBefore)

    // ══════════════════════════════════════════════════════════════════
    //  LAYER B — ZOOMED-OUT CIRCLES: bright core dot
    //  Same cross-fade window. Gives each region a visible center.
    // ══════════════════════════════════════════════════════════════════
    m.addLayer({
      id: 'health-circles-core',
      type: 'circle',
      source: 'water-points',
      paint: {
        'circle-radius': [
          'interpolate', ['exponential', 1.8], ['zoom'],
          3,   6,
          4.5, 10,
          5.5, 14,
          7,   18,
        ],
        'circle-color': ZONE_COLOR,
        'circle-opacity': [
          'interpolate', ['linear'], ['zoom'],
          3,   0.6,
          4.5, 0.55,
          5.5, 0.40,
          6.5, 0.15,
          7.5, 0,
        ],
        'circle-blur': 0.25,
        'circle-stroke-width': 0,
      },
    }, insertBefore)

    // ══════════════════════════════════════════════════════════════════
    //  LAYER C — HEATMAP: continuous density surface
    //
    //  Monochromatic warm ramp: transparent → soft teal → warm amber.
    //  Red only appears at extreme hotspots — making it rare/special.
    //  Weight recalibrated to new PFAS scale (most data 1–8 ng/L).
    //  No green→red gradient that creates misleading color rings.
    // ══════════════════════════════════════════════════════════════════
    m.addLayer({
      id: 'water-heatmap',
      type: 'heatmap',
      source: 'water-points',
      paint: {
        // Weight calibrated so typical 3–6 ng/L = low heat, only 10+ drives medium, 50+ drives high
        'heatmap-weight': [
          'interpolate', ['linear'], ['get', 'water_pfas_ng_l'],
          0,   0.02,
          2,   0.06,
          4,   0.12,
          8,   0.25,
          15,  0.50,
          40,  0.80,
          80,  1.0,
        ],
        'heatmap-radius': [
          'interpolate', ['exponential', 1.6], ['zoom'],
          4,   16,
          6,   35,
          7,   50,
          8,   65,
          10,  85,
          12, 100,
        ],
        'heatmap-intensity': [
          'interpolate', ['linear'], ['zoom'],
          4,  0.4,
          6,  0.7,
          8,  0.9,
          10, 1.0,
          12, 0.85,
        ],
        // Monochromatic ramp: invisible → soft teal → warm amber → orange → red (only at peak)
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0,    'rgba(0,0,0,0)',
          0.04, 'rgba(0,0,0,0)',
          0.10, 'rgba(46,160,130,0.18)',     // very soft teal (low background)
          0.22, 'rgba(56,170,120,0.32)',     // gentle green-teal
          0.35, 'rgba(180,170,60,0.42)',     // warm gold
          0.48, 'rgba(210,155,50,0.52)',     // amber
          0.60, 'rgba(224,140,60,0.60)',     // warm orange
          0.72, 'rgba(210,100,55,0.68)',     // deeper orange
          0.84, 'rgba(195,60,50,0.76)',      // approaching red — rare
          0.94, 'rgba(175,35,35,0.84)',      // red — only extreme hotspots
          1.0,  'rgba(150,20,20,0.88)',      // deep red — Cape Fear / Parkersburg only
        ],
        'heatmap-opacity': [
          'interpolate', ['linear'], ['zoom'],
          4,   0,
          5.5, 0.50,
          7,   0.72,
          9,   0.78,
          11,  0.60,
          13,  0.40,
          14,  0.25,
        ],
      },
    }, insertBefore)

    // ══════════════════════════════════════════════════════════════════
    //  LAYER D — FILLED CONTAMINATION POLYGONS
    //  Visible zoom 9+ — adds crisp edges over the heatmap base
    // ══════════════════════════════════════════════════════════════════
    m.addLayer({
      id: 'river-contamination',
      type: 'fill',
      source: 'contaminated-rivers',
      paint: {
        'fill-color': ZONE_COLOR,
        'fill-opacity': [
          'interpolate', ['linear'], ['zoom'],
          9,  0,
          11, 0.45,
          13, 0.60,
        ],
      },
    }, insertBefore)

    // ══════════════════════════════════════════════════════════════════
    //  LAYER E — SUBTLE POLYGON OUTLINE
    //  Visible zoom 10+
    // ══════════════════════════════════════════════════════════════════
    m.addLayer({
      id: 'river-glow',
      type: 'line',
      source: 'contaminated-rivers',
      paint: {
        'line-color': ZONE_COLOR,
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          10, 0.3,
          12, 0.6,
          14, 0.8,
        ],
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          10, 0,
          12, 0.30,
          14, 0.40,
        ],
      },
    }, insertBefore)

    // ══════════════════════════════════════════════════════════════════
    //  LAYER F — INVISIBLE HIT AREA (on top of everything for events)
    // ══════════════════════════════════════════════════════════════════
    m.addLayer({
      id: 'river-hit-area',
      type: 'fill',
      source: 'contaminated-rivers',
      paint: {
        'fill-color': 'transparent',
        'fill-opacity': 0,
      },
    })

    // ── Mouse / click interaction ──────────────────────────────────
    // Use map-level events so interaction works at every zoom level
    // (layer-specific events would miss circles at low zoom because
    //  the hit-area polygons are tiny on screen)

    m.on('mousemove', (e) => {
      const point = e.lngLat
      let nearest = null
      let minDist = Infinity
      for (const seg of data.segments) {
        const d = Math.hypot(seg.latitude - point.lat, seg.longitude - point.lng)
        if (d < minDist) { minDist = d; nearest = seg }
      }
      // Zoom-adaptive proximity threshold
      const zoom = m.getZoom()
      const maxDist = zoom < 5 ? 3.0 : zoom < 7 ? 1.5 : zoom < 9 ? 0.8 : 0.5
      if (nearest && minDist < maxDist) {
        m.getCanvas().style.cursor = 'pointer'
        onSegmentHover(nearest, e)
        onCursorMove({ x: e.point.x, y: e.point.y })
      } else {
        m.getCanvas().style.cursor = ''
        onSegmentHover(null)
      }
    })

    m.on('click', (e) => {
      const point = e.lngLat
      let nearest = null
      let minDist = Infinity
      for (const seg of data.segments) {
        const d = Math.hypot(seg.latitude - point.lat, seg.longitude - point.lng)
        if (d < minDist) { minDist = d; nearest = seg }
      }
      const zoom = m.getZoom()
      const maxDist = zoom < 5 ? 3.0 : zoom < 7 ? 1.5 : zoom < 9 ? 0.8 : 0.5
      if (nearest && minDist < maxDist && onSegmentClick) {
        onSegmentClick(nearest)
      }
    })
  }

  function addEnvCenterMarkers() {
    const TYPE_COLOR = { epa_regional: '#06B6D4', state_pfas: '#3B82F6', national_hotline: '#8B5CF6' }
    ENV_CENTERS.forEach((center) => {
      const color = TYPE_COLOR[center.type] ?? '#888'
      const el = document.createElement('div')
      el.title = center.name
      el.innerHTML = `<div style="
        width: 10px; height: 10px;
        background: ${color};
        border: 1.5px solid rgba(255,255,255,0.5);
        transform: rotate(45deg);
        box-shadow: 0 0 8px ${color}88;
        cursor: default;
      "></div>`
      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false })
        .setHTML(`<div style="font-family: var(--font-body); font-size: 12px; color: var(--text-primary); padding: 4px 0;">
          <div style="font-weight: 500; margin-bottom: 2px;">${center.name}</div>
          <div style="color: ${color}; font-size: 10px; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em;">${center.type.replace('_', ' ')}</div>
          <div style="color: var(--text-tertiary); font-size: 10px;">${center.phone}</div>
        </div>`)
      new mapboxgl.Marker(el).setLngLat([center.lng, center.lat]).setPopup(popup).addTo(map.current)
    })
  }

  function addFacilityMarkers() {
    data.facilities.forEach((facility) => {
      const el = document.createElement('div')
      el.innerHTML = `<div style="
        width: 10px; height: 10px; background: var(--accent);
        border-radius: 50%; border: 1.5px solid var(--text-primary);
        box-shadow: 0 0 12px rgba(212, 145, 110, 0.4);
      "></div>`

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false })
        .setHTML(`<div style="font-family: var(--font-body); font-size: 12px; color: var(--text-primary); padding: 4px 0;">
          <div style="font-weight: 500; margin-bottom: 2px;">${facility.name}</div>
          <div style="color: var(--text-tertiary); font-size: 10px;">${facility.pfas_sector ? 'PFAS sector' : 'Non-PFAS sector'}</div>
        </div>`)

      new mapboxgl.Marker(el).setLngLat([facility.lng, facility.lat]).setPopup(popup).addTo(map.current)
    })
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)' }}>
      {/* Title bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(25,25,25,0.8) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 500, color: 'var(--text-primary)' }}>TrophicTrace</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>National PFAS Risk Map</span>
        </div>
      </div>

      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Legend — gradient bar */}
      <div style={{
        position: 'absolute', bottom: '2rem', left: '1.5rem', zIndex: 10,
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '0.875rem 1.125rem', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
      }}>
        <div style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.625rem', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Water PFAS Contamination (ng/L)
        </div>
        <div style={{
          height: '8px', borderRadius: '4px', marginBottom: '0.4rem',
          background: `linear-gradient(to right, ${SAFE_COLOR}, ${SAFE_COLOR} 15%, ${LIMITED_COLOR} 35%, ${MODERATE_COLOR} 55%, ${UNSAFE_COLOR} 80%, #B91C1C)`,
          opacity: 0.88,
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.6rem', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
          <span>0</span><span>4</span><span>7</span><span>10</span><span>40</span><span>70+</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>
          <span>Safe</span><span></span><span>Moderate</span><span>High</span><span></span><span>Critical</span>
        </div>
        {/* Water tint indicator */}
        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: '28px', height: '8px', borderRadius: '2px', flexShrink: 0, background: WATER_TINT, opacity: 0.4, border: '1px solid var(--border)' }} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.625rem' }}>Unsampled water</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: '28px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '8px', height: '8px', background: '#3B82F6', border: '1px solid rgba(255,255,255,0.5)', transform: 'rotate(45deg)', boxShadow: '0 0 6px rgba(59,130,246,0.5)' }} />
            </div>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.625rem' }}>Environmental resource center</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: '28px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%', border: '1px solid var(--text-primary)', boxShadow: '0 0 8px rgba(212,145,110,0.4)' }} />
            </div>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.625rem' }}>PFAS-related facility</span>
          </div>
        </div>
      </div>
    </div>
  )
}
