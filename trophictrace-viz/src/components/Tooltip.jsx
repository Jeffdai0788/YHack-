const STATUS_COLORS = {
  safe: '#2EB872',
  limited: '#E0A030',
  unsafe: '#DC4444',
}

export default function Tooltip({ segment, position, onSpeciesClick }) {
  if (!segment) return null

  // Sort species worst-first
  const sorted = [...segment.species].sort(
    (a, b) => b.tissue_total_pfas_ng_g - a.tissue_total_pfas_ng_g
  )

  const tooltipWidth = 340
  const x =
    position.x + tooltipWidth + 40 > window.innerWidth
      ? position.x - tooltipWidth - 20
      : position.x + 20
  const y = Math.min(position.y + 10, window.innerHeight - 400)

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: tooltipWidth,
        background: 'rgba(25, 25, 25, 0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem 1.125rem',
        zIndex: 20,
        pointerEvents: 'auto',
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {/* Location header */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: '0.25rem',
        }}
      >
        {segment.name}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          color: 'var(--text-tertiary)',
          marginBottom: '0.125rem',
        }}
      >
        Predicted Water PFAS: {segment.predicted_water_pfas_ng_l} ng/L
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          color: 'var(--text-tertiary)',
          marginBottom: '0.875rem',
        }}
      >
        Confidence: {Math.round(segment.prediction_confidence * 100)}%
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '0.75rem' }} />

      {/* Species list */}
      {sorted.map((species) => (
        <div key={species.common_name} style={{ marginBottom: '0.625rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: STATUS_COLORS[species.safety_status_recreational],
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {species.common_name}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                color: 'var(--text-primary)',
              }}
            >
              {species.tissue_total_pfas_ng_g} ng/g
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.125rem',
              paddingLeft: '1.0rem',
            }}
          >
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
              {species.safety_status_recreational === 'safe'
                ? 'Safe for regular consumption'
                : `Max ${species.safe_servings_per_month_recreational} serving${species.safe_servings_per_month_recreational > 1 ? 's' : ''}/month`}
            </span>
            <button
              onClick={() => onSpeciesClick(species, segment.name)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.6875rem',
                cursor: 'pointer',
                padding: '2px 0',
                fontFamily: 'var(--font-body)',
              }}
            >
              Details
            </button>
          </div>
        </div>
      ))}

      {/* Demographics callout */}
      {segment.demographics && (
        <>
          <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0 0.625rem' }} />
          <div
            style={{
              fontSize: '0.6875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            Subsistence fishers face{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              {segment.demographics.exposure_multiplier_vs_recreational}x
            </span>{' '}
            the exposure of recreational anglers at this site.
            <span style={{ color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem' }}>
              {segment.demographics.nearest_tract_name} — median income ${segment.demographics.median_income.toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
