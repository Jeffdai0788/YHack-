import { useState, useEffect } from 'react'
import Hero from './components/Hero'
import MapView from './components/MapView'
import Tooltip from './components/Tooltip'
import DetailPanel from './components/DetailPanel'
import mockData from './data/mockData.json'

export default function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [hoveredSegment, setHoveredSegment] = useState(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [selectedSpecies, setSelectedSpecies] = useState(null)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowH = window.innerHeight
      const progress = Math.min(scrollY / windowH, 1)
      setScrollProgress(progress)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSegmentHover = (segment, e) => {
    setHoveredSegment(segment)
    if (e) setCursorPos({ x: e.point.x, y: e.point.y })
  }

  const handleSpeciesClick = (species, segmentName) => {
    setSelectedSpecies({ ...species, segmentName })
    setHoveredSegment(null)
  }

  const mapVisible = scrollProgress >= 0.95

  return (
    <div>
      {/* Hero image + text: fixed behind everything, fades out on scroll */}
      <Hero scrollProgress={scrollProgress} />

      {/* Scroll spacer — scroll through this to fade the hero */}
      <div style={{ height: '100vh', position: 'relative', zIndex: 1 }} />

      {/* Map section — sits right after the spacer, sticky full viewport */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 2,
          background: 'var(--bg-primary)',
        }}
      >
        <MapView
          data={mockData}
          onSegmentHover={handleSegmentHover}
          onCursorMove={setCursorPos}
        />

        {hoveredSegment && !selectedSpecies && (
          <Tooltip
            segment={hoveredSegment}
            position={cursorPos}
            onSpeciesClick={handleSpeciesClick}
          />
        )}

        {selectedSpecies && (
          <DetailPanel
            species={selectedSpecies}
            onClose={() => setSelectedSpecies(null)}
          />
        )}
      </div>
    </div>
  )
}
