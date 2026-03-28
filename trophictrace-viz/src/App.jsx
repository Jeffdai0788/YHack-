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
  const [selectedSegment, setSelectedSegment] = useState(null)

  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / window.innerHeight, 1)
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
    setSelectedSegment(hoveredSegment)
    setHoveredSegment(null)
  }

  const imageOpacity = scrollProgress < 0.5 ? 1 : 1 - (scrollProgress - 0.5) / 0.5
  const mapOpacity = scrollProgress < 0.5 ? 0 : (scrollProgress - 0.5) / 0.5

  return (
    <div>
      <div style={{ height: '200vh' }} />

      <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
        {/* Map layer */}
        <div style={{ position: 'absolute', inset: 0, opacity: mapOpacity }}>
          <MapView
            data={mockData}
            onSegmentHover={handleSegmentHover}
            onCursorMove={setCursorPos}
          />
        </div>

        {/* Hero layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: imageOpacity,
            pointerEvents: scrollProgress >= 0.95 ? 'none' : 'auto',
          }}
        >
          <Hero scrollProgress={scrollProgress} />
        </div>

        {/* Tooltip + Detail panel */}
        {scrollProgress > 0.8 && (
          <>
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
                segment={selectedSegment}
                onClose={() => {
                  setSelectedSpecies(null)
                  setSelectedSegment(null)
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
