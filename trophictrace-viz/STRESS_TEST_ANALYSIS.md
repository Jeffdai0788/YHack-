# MapView.jsx Stress Test & Analysis Report

**Date**: 2026-03-29
**Component**: `src/components/MapView.jsx`
**Scope**: Mapbox GL JS visualization for TrophicTrace PFAS Risk Map
**Data**: 2,746 river segments with 13-vertex polygons across ~4,023 degree² area

---

## Executive Summary

The visualization uses a sophisticated zoom-dependent layer system (circles → heatmap → polygons) with generally good design patterns. However, **4 issues were identified**:
- **1 CRITICAL**: getFirstLayerAboveWater() can return undefined
- **2 MEDIUM**: Gap analysis shows very sparse circle coverage at low zoom; water filter samples only 3 points per 13-vertex polygon
- **1 LOW**: Interaction threshold jumps at zoom boundaries

The implementation is **production-ready with reservations**. Recommend addressing the critical issue and testing the medium-severity edge cases.

---

## 1. GAP ANALYSIS

### Overview
The visualization employs a zoom-dependent strategy:
- **Zoom 3-8.5**: Circle-based representation (glow + core)
- **Zoom 5-14**: Heatmap overlay
- **Zoom 8+**: Polygon fill
- **Zoom 9+**: Polygon outlines

### Circle Coverage at Low Zoom (ZOOM 3-5)

**Data Distribution**:
- Total segments: 2,746
- Geographic area: ~4,023 degree²
- Average point spacing: ~1.21 degrees
- Pixels per degree at zoom 3: 2,048 px/deg
- **Screen spacing at zoom 3: ~2,479 pixels between point centers**

**Circle Radii vs Spacing**:
```
Zoom 3: Points 2,479px apart  vs Glow radius 22px  → Coverage ratio: 112.7x
Zoom 4: Points 4,958px apart  vs Glow radius 30px  → Coverage ratio: 167.3x
Zoom 5: Points 9,916px apart  vs Glow radius 37px  → Coverage ratio: 266.0x
Zoom 6: Points 19,832px apart vs Glow radius 45px  → Coverage ratio: 441.6x
```

**Finding**: Points are EXTREMELY sparse relative to circle radius at low zoom levels.

**Visual Impact**:
- At zoom 3-4, users see isolated dots, not continuous visualization
- Coverage ratio >100x means circles occupy <1% of screen space
- Heatmap (starts at zoom 5 with opacity 0) doesn't compensate until zoom 6+
- **This is likely intentional design** (avoiding visual clutter at low zoom)

**Severity**: **LOW** (Appears to be intentional design choice for readability)

---

### Transition Zone: Zoom 7-9

**Opacity Curves at Key Zoom Levels**:

| Zoom | Circle Glow | Circle Core | Heatmap | Polygons | Visual State |
|------|-------------|-------------|---------|----------|-------------|
| 7.0  | 0.08       | 0.12       | 0.45    | 0        | Faint circles + medium heatmap |
| 8.0  | 0.04       | 0.06       | 0.575   | 0.225    | Very faint circles + strong heatmap + emerging polygons |
| 9.0  | 0          | 0          | 0.70    | 0.225    | Heatmap dominant + visible polygons |

**Assessment**:
- ✅ **NO visible "dead zone"** where all layers fade simultaneously
- ✅ Smooth linear interpolation between keyframes
- ✅ Heatmap peaks at zoom 9 (0.70) as circles fully fade (0)
- ✅ Polygons begin emerging at zoom 8, creating smooth handoff by zoom 10
- ⚠️ Slight visual pop possible at zoom 9 when polygon outlines (river-glow) appear

**Severity**: **LOW** (Transitions are smooth and continuous)

---

### Circle Glow Opacity Anomaly at Zoom 5

**Curve**: Zoom 3→0.20, Zoom 5→0.24, Zoom 6.5→0.16

The glow opacity **peaks at zoom 5** (0.24) before declining to 6.5 (0.16). This creates a slight brightness increase followed by a sharp decline.

**Visual Effect**: Glow appears slightly brighter at zoom 5, then visibly fades afterward.

**Severity**: **LOW** (Subtle effect, likely intentional to maintain visibility during transition)

---

## 2. LAND BLEED ANALYSIS

### Layer Ordering in Mapbox dark-v11

The code inserts visualization layers using `getFirstLayerAboveWater()`, placing them after the water layer but before land structures.

**Layer order (relevant subset)**:
```
1. water (base map layer)
2. [INSERTION POINT — viz layers go here]
3. land-structure-line
4. land-line
5. land (solid color fill)
6. landuse/park
7. building
8. building-line
9. road
```

**Good**: Land structures (buildings, roads) render ON TOP of viz layers, naturally masking any bleed.

**However**: The insertion point requires `getFirstLayerAboveWater()` to return a valid layer ID.

---

### Water Filter Robustness

**Filter Strategy** (lines 162-186):
```javascript
const samples = [
  [cx, cy],              // Centroid
  coords[0],             // First vertex
  coords[Math.floor(n/2)] // Midpoint vertex
]
// Requires: at least 2 of 3 on water
```

**Problem**: With **13-vertex polygons**, the sampling is sparse.

**Example Scenario**:
- Polygon straddles a coastline
- Centroid: in water ✓
- coords[0]: in water ✓
- coords[6] (opposite side): on land ✗
- **Result**: Polygon PASSES filter (2/3 on water) despite having land vertices

**Polygon Geometry**:
- All polygons have exactly 13 vertices
- Vertex-to-vertex spacing: 0.0013-0.0015 degrees (roughly 145-165 meters)
- Sparse for complex coastlines

**Circle Blur Bleed**:
- Glow layer: blur=1.0, radius=22-64px at low zoom
- Blur extends ~1.5x beyond radius
- A 64px radius circle extends ~96px total with blur
- Points near land edge can have blur extending 90px onto land
- **Mitigated by**: Land layer rendering on top (see section 2.1)

**Severity**: **MEDIUM** (Polygons may have subtle vertex bleed onto land, but masked by land layer rendering on top. Verify visually at high zoom.)

---

### Critical Issue: getFirstLayerAboveWater() Return Value

**Code** (line 232):
```javascript
const insertBefore = getFirstLayerAboveWater(m)
// Later...
m.addLayer({ ... }, insertBefore)  // Called 6 times
```

**Function** (lines 102-110):
```javascript
function getFirstLayerAboveWater(m) {
  const layers = m.getStyle().layers
  let found = false
  for (const layer of layers) {
    if (layer.id === 'water') { found = true; continue }
    if (found) return layer.id
  }
  return undefined  // ← CAN BE UNDEFINED
}
```

**Risk**: If the water layer is not found or is the last layer:
- `insertBefore` becomes `undefined`
- Per Mapbox docs, `undefined` = "insert at end of layer list"
- Viz layers render **ON TOP OF** all other layers (including labels, roads, buildings)
- Blocks map interaction and obscures other content

**Likelihood**: Very low (Mapbox dark-v11 always has water layer), but possible in edge cases.

**Severity**: **CRITICAL** (Would break the map if it occurs)

**Recommendation**: Add safety check:
```javascript
const insertBefore = getFirstLayerAboveWater(m)
if (!insertBefore) console.warn('Warning: insertBefore is undefined, layers may render on top')
```

---

## 3. INTERACTION ISSUES

### Mousemove Event Performance

**Handler** (lines 416-435):
```javascript
m.on('mousemove', (e) => {
  const point = e.lngLat
  let nearest = null
  let minDist = Infinity
  for (const seg of data.segments) {  // 2,746 iterations
    const d = Math.hypot(seg.latitude - point.lat, seg.longitude - point.lng)
    if (d < minDist) { minDist = d; nearest = seg }
  }
  // ... check threshold and update hover state
})
```

**Calculation**:
- Runs on **every mousemove** event
- Iterates through **2,746 segments**
- Linear search (O(n)) for nearest neighbor
- Estimated overhead: ~0.3-0.5ms per event at 60 FPS

**Estimated Load**:
- At typical mouse speed: 100-200 mousemove events/sec
- Operations/sec: ~412,000 distance calculations
- Per-frame impact at 60 FPS: Acceptable but noticeable on low-end devices

**Assessment**:
- ✅ Functional and acceptable
- ⚠️ Could be optimized with spatial indexing (kdbush, rtree) for very large datasets
- ✅ Code is correct; click uses same logic (consistent)

**Severity**: **LOW** (Performance is acceptable; optimization is optional)

---

### Zoom-Adaptive Hover Threshold

**Implementation** (lines 425-426):
```javascript
const zoom = m.getZoom()
const maxDist = zoom < 5 ? 3.0 : zoom < 7 ? 1.5 : zoom < 9 ? 0.8 : 0.5
```

**Threshold Curve**:
```
Zoom 3-5:  3.0 degrees (~330 km at equator)
Zoom 5-7:  1.5 degrees (~165 km)
Zoom 7-9:  0.8 degrees (~88 km)
Zoom 9+:   0.5 degrees (~55 km)
```

**Behavior at Boundaries**:
- Zoom 4.99 → 5.00: threshold drops 50% (3.0 → 1.5)
- Zoom 6.99 → 7.00: threshold drops 47% (1.5 → 0.8)
- Zoom 8.99 → 9.00: threshold drops 38% (0.8 → 0.5)

**User Impact**:
- Hover target may suddenly appear/disappear when zooming across boundary
- Unusual but not broken

**Assessment**:
- ✅ Logic is correct and intentional (stricter at higher zoom)
- ✅ Same thresholds applied to both hover and click (consistent)
- ⚠️ Discrete steps instead of smooth curve may cause UX friction

**Severity**: **LOW** (Edge case, low frequency, intentional design)

---

### Hover/Click Accuracy

**Same proximity logic for both hover and click**: ✅ GOOD (Consistent behavior)

**Potential for wrong segment selection**:
- If multiple segments are within threshold, code selects **nearest only**
- Correct approach for this data

---

## 4. EDGE CASES

### Alaska/Hawaii Coverage

**Data Distribution**:
- Alaska vertices (lat ≥ 60): 26 vertices
- Hawaii vertices (lat ≤ 22, lng < -155): 39 vertices
- Continental US vertices: ~35,600 vertices

**Initial Map State**:
- Center: [-83, 38] (Kentucky)
- Zoom: 4.2
- Typical viewport: ~[-125, 25] to [-40, 50]
- Hawaii is **off-screen** at initial load
- Alaska is **partially visible** (edge of viewport)

**Water Filter Issue** (lines 180-183):
```javascript
const pt = m.project([lng, lat])
if (m.queryRenderedFeatures(pt, { layers: ['water'] }).length > 0) waterHits++
```

**Problem**: `queryRenderedFeatures()` only works for **rendered tiles**.

- Off-screen tiles are not rendered
- Hawaii polygons won't be found in queryRenderedFeatures
- Alaska polygons may be partially rendered but unreliable
- **Result**: Hawaii/Alaska features are INVISIBLE at initial load, even if they pass water check
- Becomes visible only after user pans to reveal tiles

**Severity**: **MEDIUM** (Data missing from initial state, but appears correctly after panning; no crash)

**Recommendation**: Pre-filter Alaska/Hawaii data at load time, or use a different water-checking strategy.

---

### getFirstLayerAboveWater() Returns Undefined

**See Section 2.3 (Critical Issue above)**

---

### Species Filter on Heatmap Layer

**Code** (lines 67-69):
```javascript
VIZ_LAYERS.forEach((id) => {
  if (map.current.getLayer(id)) map.current.setFilter(id, filter)
})
```

**VIZ_LAYERS includes**: 'water-heatmap' (type: 'heatmap')

**Question**: Does Mapbox support filters on heatmap layers?

**Answer**: ✅ YES — Heatmap layers support filters in Mapbox GL JS.

The filter is applied to the SOURCE features, not the heatmap visualization itself. This should work correctly.

**Severity**: **LOW** (Should work; verify in testing)

---

### Species Filter Edge Case: Empty Hotspots

**Code** (lines 54-65):
```javascript
const matchingHotspots = new Set()
data.segments.forEach((seg) => {
  if (seg.species.some((sp) => sp.common_name === speciesFilter)) {
    const hotspot = getHotspotForSegment(seg)
    if (hotspot) matchingHotspots.add(hotspot)  // Can return null
  }
})

const filter = matchingHotspots.size > 0
  ? ['in', ['get', 'hotspot_id'], ['literal', [...matchingHotspots]]]
  : ['==', ['get', 'hotspot_id'], '__none__']  // All layers invisible
```

**Issue**: If a species exists but all segments have `getHotspotForSegment() == null`:
- matchingHotspots remains empty
- Filter becomes: `['==', ['get', 'hotspot_id'], '__none__']`
- No features match (assuming no segment has hotspot_id = '__none__')
- **All layers become invisible**

**Is this a bug?** Questionable—could be intentional (no hotspot = no data to show). But it silently hides data.

**Severity**: **LOW** (Data integrity issue, not a code bug; depends on data quality)

---

## 5. VISUAL QUALITY

### Opacity Transition Smoothness

All transitions use `["interpolate", ["linear"], ["zoom"], ...]`, providing smooth linear blending.

**Key Findings**:

1. **Circle Glow**: Smooth except for minor peak at zoom 5 (0.24 vs 0.20/0.16)
   - Likely intentional to maintain visibility

2. **Circle Core**: Smooth fade with variable rates (acceptable)

3. **Heatmap**: Excellent curve—rises from zoom 5-9, then falls as polygons emerge
   - No sudden jumps

4. **Polygon Fill**: Smooth fade-in from zoom 8-12

5. **Polygon Outline (river-glow)**: Smooth fade-in from zoom 9-13

### Critical Transition Zone Assessment (Zoom 7-9)

| Metric | Status |
|--------|--------|
| Dead zones (all layers fade) | ✅ None |
| Visual continuity | ✅ Good |
| Coverage continuity | ✅ Good (circles → heatmap → polygons) |
| Opacity jumps | ✅ None (linear interpolation) |
| Potential visual artifacts | ⚠️ Minor pop at zoom 9 when outlines appear |

**Severity**: **LOW** (Transitions are smooth and well-designed)

---

## Summary of Issues by Severity

### CRITICAL (1 issue)
1. **getFirstLayerAboveWater() can return undefined** (line 232)
   - Risk: Viz layers render on top of everything, breaking interaction
   - Likelihood: Very low (Mapbox dark-v11 always has water layer)
   - Fix: Add null check and fallback

### MEDIUM (2 issues)
2. **Alaska/Hawaii data missing at initial load** (lines 180-183)
   - Risk: Data is invisible until user pans
   - Likelihood: High (off-screen tiles aren't rendered)
   - Fix: Pre-filter or use alternative water-check strategy

3. **Water filter samples only 3 points per 13-vertex polygon** (lines 162-186)
   - Risk: Polygon vertices may extend onto land
   - Likelihood: Medium (depends on polygon geometry near coast)
   - Mitigation: Land layer renders on top, masks the bleed
   - Fix: Sample more vertices or add island detection

### LOW (3 issues)
4. **Sparse circle coverage at low zoom** (zoom 3-5)
   - Points 100-400x apart vs circle radius
   - Assessment: Likely intentional design choice
   - Fix: Optional (reduce initial zoom or increase circle radius)

5. **Hover threshold jumps at zoom boundaries** (lines 425-426)
   - 50% threshold drop at zoom 5, 47% at zoom 7
   - Assessment: Edge case with low user impact
   - Fix: Use smooth curve instead of steps (optional)

6. **Species filter edge case** (lines 54-65)
   - If species exists but all segments lack hotspot assignment
   - Risk: Data silently hidden
   - Fix: Add data validation or warning

---

## Recommendations

### Immediate (Before Production)
1. **Fix critical issue**: Add null check in getFirstLayerAboveWater()
   ```javascript
   const insertBefore = getFirstLayerAboveWater(m)
   if (!insertBefore) {
     console.error('Warning: insertBefore is undefined; using default layer order')
     // Or implement fallback logic
   }
   ```

2. **Test heatmap filter** support with actual species filtering

### Short-term (Suggested)
3. **Handle Alaska/Hawaii data**: Pre-filter off-screen data or implement tile-based loading
4. **Enhance water filter**: Sample more vertices (e.g., every 2nd or 3rd vertex)
5. **Visual testing**: Confirm at high zoom (12-14) that polygon bleed is acceptable

### Optional (Nice-to-have)
6. **Optimize hover detection**: Add spatial indexing (kdbush) if interaction becomes slow at 5000+ segments
7. **Smooth threshold curve**: Replace step function with linear interpolation across zoom range
8. **Data validation**: Log warnings if species filter results in no visible data

---

## Files Analyzed

- **MapView.jsx** (541 lines): Main visualization component
- **riverGeometry.json**: 2,746 river segment polygons with 13 vertices each
- **data/envCenters.js**: Environmental center markers (not directly analyzed)

## Test Coverage Recommendations

- [ ] Zoom 4.99 → 5.00 hover behavior (threshold jump)
- [ ] Alaska/Hawaii features visibility after panning
- [ ] Species filter with matching species
- [ ] Species filter with no matching species
- [ ] High zoom (12-14) polygon bleed onto land
- [ ] Mousemove performance on low-end devices
- [ ] `setFilter()` on heatmap layer
- [ ] Map style change (different base style)

---

**End of Report**
