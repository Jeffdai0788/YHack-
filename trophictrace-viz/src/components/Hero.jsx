import { useRef } from 'react'

const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=1920&q=80&fit=crop'

export default function Hero({ scrollProgress }) {
  // Image stays fixed; text scrolls up and fades; then image fades to reveal map
  const textOpacity = 1 - Math.min(scrollProgress / 0.4, 1)
  const textTranslateY = scrollProgress * -120
  const imageOpacity = scrollProgress < 0.5 ? 1 : 1 - (scrollProgress - 0.5) / 0.5

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 0,
        pointerEvents: scrollProgress >= 0.95 ? 'none' : 'auto',
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: imageOpacity,
          transition: 'opacity 0.1s ease-out',
        }}
      >
        <img
          src={HERO_IMAGE_URL}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        {/* Dark gradient overlay for text readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(25,25,25,0.3) 0%, rgba(25,25,25,0.6) 50%, rgba(25,25,25,0.9) 100%)',
          }}
        />
      </div>

      {/* Title content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 clamp(2rem, 5vw, 6rem)',
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: '1.25rem',
            maxWidth: '720px',
          }}
        >
          TrophicTrace
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
            fontWeight: 400,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            maxWidth: '580px',
          }}
        >
          Predicting PFAS contamination across aquatic food webs
          using physics-informed neural networks.
        </p>

        {/* Scroll indicator */}
        <div
          style={{
            marginTop: '3rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-tertiary)',
            fontSize: '0.8125rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
          }}
        >
          <span>Scroll to explore</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
