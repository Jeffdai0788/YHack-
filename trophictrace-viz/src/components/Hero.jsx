export default function Hero({ scrollProgress }) {
  const textProgress = Math.min(scrollProgress / 0.5, 1)
  const textOpacity  = 1 - textProgress
  const textY        = textProgress * -80

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

      {/* ── 1. Water base image ─────────────────────────────────────────── */}
      <img
        src="https://images.unsplash.com/photo-1497290756760-23ac55edf36f?w=1920&q=80&fit=crop"
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* ── 1b. Sunset color wash — tints the water with golden hour light ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: [
          'linear-gradient(to bottom,',
          '  rgba(10,  2, 28,0.72)  0%,',
          '  rgba(60, 12, 70,0.55) 25%,',
          '  rgba(150, 40, 20,0.45) 52%,',
          '  rgba(220, 80, 18,0.38) 70%,',
          '  rgba(240,130, 30,0.30) 85%,',
          '  rgba( 12,  4, 24,0.60) 100%',
          ')',
        ].join(''),
        mixBlendMode: 'multiply',
      }} />

      {/* ── 2. Sun orb — soft radial glow, animates slowly ─────────────── */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '62%',
        width: '700px', height: '700px',
        animation: 'hero-sun-pulse 9s ease-in-out infinite',
        background: [
          'radial-gradient(circle,',
          '  rgba(255,215,100,0.95)  0%,',
          '  rgba(255,150, 40,0.70) 14%,',
          '  rgba(230, 70, 20,0.42) 32%,',
          '  rgba(140, 20, 50,0.18) 54%,',
          '  transparent             70%',
          ')',
        ].join(''),
        pointerEvents: 'none',
      }} />

      {/* ── 3. Wide horizon atmosphere — animated haze band ─────────────── */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '66%',
        width: '160%', height: '480px',
        transform: 'translate(-50%, -50%)',
        animation: 'hero-atmosphere 13s ease-in-out infinite',
        background: [
          'radial-gradient(ellipse 80% 55% at 50% 50%,',
          '  rgba(245,145, 50,0.30)  0%,',
          '  rgba(210, 65, 20,0.14) 50%,',
          '  transparent             72%',
          ')',
        ].join(''),
        pointerEvents: 'none',
      }} />

      {/* ── 4. Bottom fade — subtle darkening so text stays readable ───────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
        background: 'linear-gradient(to top, rgba(4,1,16,0.70) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── 5. Warm sun reflection on water ─────────────────────────────── */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: '0%',
        width: '65%', height: '200px',
        transform: 'translateX(-50%)',
        background: [
          'radial-gradient(ellipse 85% 50% at 50% 100%,',
          '  rgba(245,140,35,0.22) 0%,',
          '  rgba(200, 70,15,0.08) 55%,',
          '  transparent           72%',
          ')',
        ].join(''),
        pointerEvents: 'none',
      }} />

      {/* ── 6. Top dark fade ─────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '28%',
        background: 'linear-gradient(to bottom, rgba(2,0,8,0.75) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── 7. Edge vignette ─────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 110% 100% at 50% 50%, transparent 42%, rgba(2,0,8,0.60) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── 8. Text content ──────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        textAlign: 'center',
        padding: '0 clamp(2rem, 5vw, 6rem)',
        opacity: textOpacity,
        transform: `translateY(${textY}px)`,
      }}>

        {/* Eyebrow */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.625rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'rgba(250,190,90,0.65)',
          marginBottom: '1.5rem',
        }}>
          PFAS Bioaccumulation · National Risk Model
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3.25rem, 6.5vw, 6rem)',
          fontWeight: 400,
          lineHeight: 1.0,
          letterSpacing: '-0.03em',
          color: '#f4ede0',
          marginBottom: 0,
          textShadow: [
            '0 2px 40px rgba(240,130,40,0.45)',
            '0 0  90px rgba(240,100,20,0.20)',
          ].join(', '),
        }}>
          TrophicTrace
        </h1>

        {/* Divider */}
        <div style={{
          width: '56px', height: '1px',
          margin: '1.5rem auto',
          background: 'linear-gradient(to right, transparent, rgba(245,165,60,0.55), transparent)',
        }} />

        {/* Subtitle */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(0.9rem, 1.5vw, 1.0625rem)',
          fontWeight: 300,
          lineHeight: 1.70,
          color: 'rgba(225,208,185,0.72)',
          maxWidth: '500px',
          letterSpacing: '0.015em',
        }}>
          Predicting PFAS contamination across aquatic food webs
          using physics-informed neural networks.
        </p>

        {/* Scroll indicator */}
        <div style={{
          marginTop: '4rem',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.625rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(220,185,120,0.45)',
          }}>
            Scroll to explore
          </span>
          <div style={{
            width: '1px', height: '36px',
            background: 'linear-gradient(to bottom, rgba(245,165,60,0.6), transparent)',
            animation: 'hero-scroll-line 2.2s ease-in-out infinite',
          }} />
        </div>

      </div>
    </div>
  )
}
