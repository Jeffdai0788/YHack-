import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import riverGeo from '../data/riverGeometry.json'

mapboxgl.accessToken = 'pk.eyJ1IjoiamQxMjM0NTYiLCJhIjoiY21uYXR1dzdwMG43dTJwcHI0d2ltdXRzbCJ9.3tN6tOw4eqy-YGeGdU1Uhg'

const SAFE_COLOR = '#2EB872'
const LIMITED_COLOR = '#E0A030'
const MODERATE_COLOR = '#E8845A'
const UNSAFE_COLOR = '#DC4444'

// Slight blue tint for water bodies
const WATER_TINT = '#4A90D9'

export default function MapView({ data, onSegmentHover, onCursorMove, onMapReady, speciesFilter }) {
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
      ;['river-contamination', 'river-glow', 'river-hit-area'].forEach((id) => {
        if (map.current.getLayer(id)) map.current.setFilter(id, null)
      })
      return
    }

    // Find which hotspots contain this species
    const matchingHotspots = new Set()
    data.segments.forEach((seg) => {
      if (seg.species.some((sp) => sp.common_name === speciesFilter)) {
        // Map segment location to nearest hotspot
        const hotspot = getHotspotForSegment(seg)
        if (hotspot) matchingHotspots.add(hotspot)
      }
    })

    const filter = matchingHotspots.size > 0
      ? ['in', ['get', 'hotspot_id'], ['literal', [...matchingHotspots]]]
      : ['==', ['get', 'hotspot_id'], '__none__']

    ;['river-contamination', 'river-glow', 'river-hit-area'].forEach((id) => {
      if (map.current.getLayer(id)) map.current.setFilter(id, filter)
    })
  }, [speciesFilter, loaded, data])

  function getHotspotForSegment(seg) {
    const hotspots = [
      { id: 'cape_fear',          lat: 35.05, lng: -78.88 },
      { id: 'lake_michigan',      lat: 42.36, lng: -87.82 },
      { id: 'ohio_river',         lat: 39.26, lng: -81.55 },
      { id: 'delaware_river',     lat: 40.15, lng: -74.82 },
      { id: 'huron_river',        lat: 42.28, lng: -83.74 },
      { id: 'merrimack_river',    lat: 42.84, lng: -71.30 },
      { id: 'tennessee_river',    lat: 34.58, lng: -86.96 },
      { id: 'cape_fear_atlantic', lat: 33.65, lng: -77.70 },
      { id: 'delaware_atlantic',  lat: 38.50, lng: -74.70 },
      { id: 'gulf_mexico',        lat: 28.80, lng: -89.20 },
      { id: 'lake_erie',          lat: 41.78, lng: -83.20 },
      { id: 'lake_ontario',       lat: 43.30, lng: -79.30 },
      { id: 'merrimack_atlantic', lat: 42.82, lng: -70.55 },
    ]
    let minDist = Infinity
    let nearest = null
    for (const h of hotspots) {
      const d = Math.hypot(seg.latitude - h.lat, seg.longitude - h.lng)
      if (d < minDist) { minDist = d; nearest = h.id }
    }
    return minDist < 1.0 ? nearest : null
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

  // --- River contamination layers ---

  function addRiverLayers() {
    const m = map.current

    m.addSource('contaminated-rivers', {
      type: 'geojson',
      data: riverGeo,
      tolerance: 0.375,
    })

    // Discrete color step — each zone is a pure flat color, no blending between zones
    const ZONE_COLOR = [
      'step', ['get', 'pfas_ng_l'],
      SAFE_COLOR,      // < 150  → green
      150, LIMITED_COLOR,   // 150–499 → amber
      500, MODERATE_COLOR,  // 500–899 → orange
      900, UNSAFE_COLOR,    // ≥ 900   → red
    ]

    // Glow underlay — narrow blur so color doesn't spill into adjacent zones
    m.addLayer({
      id: 'river-glow',
      type: 'line',
      source: 'contaminated-rivers',
      paint: {
        'line-color': ZONE_COLOR,
        'line-width': [
          'interpolate', ['exponential', 1.5], ['zoom'],
          4, ['step', ['get', 'pfas_ng_l'], 3, 150, 5, 500, 7, 900, 9],
          8, ['step', ['get', 'pfas_ng_l'], 6, 150, 10, 500, 14, 900, 18],
          12, ['step', ['get', 'pfas_ng_l'], 10, 150, 16, 500, 22, 900, 28],
        ],
        'line-blur': [
          'interpolate', ['linear'], ['zoom'],
          4, 1.5,
          8, 2.5,
          12, 4,
        ],
        'line-opacity': 0.18,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })

    // Main contamination line — solid discrete color per zone
    m.addLayer({
      id: 'river-contamination',
      type: 'line',
      source: 'contaminated-rivers',
      paint: {
        'line-color': ZONE_COLOR,
        'line-width': [
          'interpolate', ['exponential', 1.5], ['zoom'],
          4, ['step', ['get', 'pfas_ng_l'], 0.8, 150, 1.2, 500, 1.8, 900, 2.5],
          8, ['step', ['get', 'pfas_ng_l'], 2,   150, 3,   500, 5,   900, 7],
          12, ['step', ['get', 'pfas_ng_l'], 3,  150, 5,   500, 8,   900, 12],
          14, ['step', ['get', 'pfas_ng_l'], 4,  150, 7,   500, 11,  900, 18],
        ],
        'line-opacity': [
          'step', ['get', 'pfas_ng_l'],
          0.45,       // safe
          150, 0.60,  // limited
          500, 0.75,  // moderate
          900, 0.88,  // unsafe
        ],
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })

    // Invisible wide hit area for hover detection
    m.addLayer({
      id: 'river-hit-area',
      type: 'line',
      source: 'contaminated-rivers',
      paint: {
        'line-color': 'transparent',
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          4, 12,
          8, 20,
          12, 30,
        ],
        'line-opacity': 0,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })

    // Hover interaction
    m.on('mousemove', 'river-hit-area', (e) => {
      m.getCanvas().style.cursor = 'none'
      const props = e.features[0].properties
      const hotspotId = props.hotspot_id

      // Find the nearest data segment from nationalResults
      const point = e.lngLat
      let nearest = null
      let minDist = Infinity
      for (const seg of data.segments) {
        const d = Math.hypot(seg.latitude - point.lat, seg.longitude - point.lng)
        if (d < minDist) { minDist = d; nearest = seg }
      }

      if (nearest && minDist < 0.5) {
        onSegmentHover(nearest, e)
        onCursorMove({ x: e.point.x, y: e.point.y })
      }
    })

    m.on('mouseleave', 'river-hit-area', () => {
      m.getCanvas().style.cursor = ''
      onSegmentHover(null)
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
        {/* Discrete zone swatches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {[
            { color: SAFE_COLOR,     label: '< 150 ng/L',  zone: 'Safe' },
            { color: LIMITED_COLOR,  label: '150–499',     zone: 'Limited' },
            { color: MODERATE_COLOR, label: '500–899',     zone: 'Moderate' },
            { color: UNSAFE_COLOR,   label: '≥ 900',       zone: 'Unsafe' },
          ].map(({ color, label, zone }) => (
            <div key={zone} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '6px', borderRadius: '3px', background: color, opacity: 0.88, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>{zone}</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.625rem', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{label}</span>
            </div>
          ))}
        </div>
        {/* Water tint indicator */}
        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{ width: '28px', height: '8px', borderRadius: '2px', flexShrink: 0, background: WATER_TINT, opacity: 0.4, border: '1px solid var(--border)' }} />
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.625rem' }}>Unsampled water</span>
        </div>
      </div>
    </div>
  )
}
