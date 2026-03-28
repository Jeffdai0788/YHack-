import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const STATUS_COLORS = {
  safe: '#2EB872',
  limited: '#E0A030',
  unsafe: '#DC4444',
}

const FACTOR_COLORS = {
  source: '#E8845A',
  ecological: '#5B8FD4',
  environmental: '#3DA89A',
  biological: '#9A6DD4',
  hydrologic: '#7A7A7A',
}

export default function DetailPanel({ species, onClose }) {
  const panelRef = useRef(null)

  useEffect(() => {
    // Slide-in animation
    if (panelRef.current) {
      panelRef.current.style.transform = 'translateX(100%)'
      requestAnimationFrame(() => {
        panelRef.current.style.transform = 'translateX(0)'
      })
    }
  }, [])

  const statusColor = STATUS_COLORS[species.safety_status]
  const epaLimit = species.pathway?.epa_reference_dose_ng_g || 20
  const multiplier = (species.tissue_concentration_ng_g / epaLimit).toFixed(1)
  const isOver = species.tissue_concentration_ng_g > epaLimit

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 25,
          cursor: 'pointer',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '420px',
          height: '100%',
          background: 'var(--bg-primary)',
          borderLeft: '1px solid var(--border)',
          zIndex: 30,
          overflowY: 'auto',
          transition: 'transform 300ms ease-out',
          padding: '2rem',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        {/* Section A: Header & Verdict */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.375rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: '0.25rem',
            }}
          >
            {species.common_name}
          </h2>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-tertiary)',
              fontStyle: 'italic',
              marginBottom: '0.125rem',
            }}
          >
            {species.scientific_name}
          </p>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
            }}
          >
            {species.segmentName}
          </p>

          {/* Big number */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '3rem',
              fontWeight: 500,
              color: statusColor,
              lineHeight: 1.1,
              marginBottom: '0.375rem',
            }}
          >
            {species.tissue_concentration_ng_g}
            <span
              style={{
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                marginLeft: '0.5rem',
                fontWeight: 400,
              }}
            >
              ng/g
            </span>
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
              marginBottom: '0.75rem',
            }}
          >
            EPA reference: {epaLimit} ng/g
          </div>

          {/* Multiplier badge */}
          <div
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.625rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              color: isOver ? STATUS_COLORS.unsafe : STATUS_COLORS.safe,
              background: isOver
                ? 'rgba(220, 68, 68, 0.12)'
                : 'rgba(46, 184, 114, 0.12)',
              marginBottom: '0.5rem',
            }}
          >
            {multiplier}x {isOver ? 'over' : 'under'} limit
          </div>

          {/* Confidence interval */}
          {species.confidence_interval && (
            <div
              style={{
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
                marginTop: '0.375rem',
              }}
            >
              95% CI: [{species.confidence_interval[0]}, {species.confidence_interval[1]}] ng/g
            </div>
          )}

          <div
            style={{
              marginTop: '0.75rem',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            {species.safety_status === 'safe'
              ? 'Safe for regular consumption'
              : `Maximum ${species.safe_servings_per_month} serving${species.safe_servings_per_month > 1 ? 's' : ''} per month`}
          </div>
        </div>

        {/* Section B: Contributing Factors */}
        <Section title="Why is this fish contaminated?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {species.contributing_factors?.map((factor) => (
              <div key={factor.factor}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem',
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {factor.factor}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {factor.contribution_pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: 'var(--bg-secondary)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${factor.contribution_pct}%`,
                      height: '100%',
                      borderRadius: '2px',
                      background: FACTOR_COLORS[factor.type] || 'var(--text-tertiary)',
                      transition: 'width 400ms ease-out',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Section C: Accumulation Timeline */}
        {species.accumulation_curve && (
          <Section title="Accumulation over time">
            <AccumulationChart
              data={species.accumulation_curve}
              epaLimit={epaLimit}
              statusColor={statusColor}
            />
          </Section>
        )}

        {/* Section D: Contamination Pathway */}
        {species.pathway && (
          <Section title="Contamination pathway">
            <Pathway pathway={species.pathway} />
          </Section>
        )}
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div
        style={{
          height: '1px',
          background: 'var(--border)',
          marginBottom: '1rem',
        }}
      />
      <h3
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.6875rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-tertiary)',
          marginBottom: '1rem',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function AccumulationChart({ data, epaLimit, statusColor }) {
  const width = 356
  const height = 140
  const padding = { top: 10, right: 10, bottom: 24, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxMonths = Math.max(...data.months)
  const maxConc = Math.max(...data.concentration_ng_g, epaLimit * 1.2)

  const scaleX = (v) => padding.left + (v / maxMonths) * chartW
  const scaleY = (v) => padding.top + chartH - (v / maxConc) * chartH

  const points = data.months.map((m, i) => `${scaleX(m)},${scaleY(data.concentration_ng_g[i])}`)
  const linePath = `M${points.join(' L')}`

  const epaY = scaleY(epaLimit)

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* EPA limit line */}
      <line
        x1={padding.left}
        y1={epaY}
        x2={width - padding.right}
        y2={epaY}
        stroke="var(--text-tertiary)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text
        x={padding.left - 4}
        y={epaY - 4}
        fill="var(--text-tertiary)"
        fontSize={9}
        fontFamily="var(--font-mono)"
        textAnchor="end"
      >
        EPA {epaLimit}
      </text>

      {/* Accumulation line */}
      <path
        d={linePath}
        fill="none"
        stroke={statusColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      <circle
        cx={scaleX(data.months[data.months.length - 1])}
        cy={scaleY(data.concentration_ng_g[data.concentration_ng_g.length - 1])}
        r={3}
        fill={statusColor}
      />

      {/* X-axis labels */}
      {[0, 12, 24, 36].filter((m) => m <= maxMonths).map((m) => (
        <text
          key={m}
          x={scaleX(m)}
          y={height - 4}
          fill="var(--text-tertiary)"
          fontSize={9}
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          {m === 0 ? '0' : `${m}mo`}
        </text>
      ))}
    </svg>
  )
}

function Pathway({ pathway }) {
  const steps = [
    {
      label: pathway.source_name?.split(' ').slice(0, 2).join(' ') || 'Source',
      value: `${pathway.discharge_ppt} ppt`,
      annotation: null,
      color: 'var(--text-tertiary)',
    },
    {
      label: 'River Water',
      value: `${pathway.water_concentration_ppt} ppt`,
      annotation: `÷${pathway.dilution_factor} dilution`,
      color: STATUS_COLORS.limited,
    },
    {
      label: 'Fish Tissue',
      value: `${pathway.tissue_concentration_ng_g} ng/g`,
      annotation: `×${pathway.bcf_applied} BCF`,
      color: pathway.tissue_concentration_ng_g > pathway.epa_reference_dose_ng_g
        ? STATUS_COLORS.unsafe
        : STATUS_COLORS.safe,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {steps.map((step, i) => (
        <div key={step.label}>
          {/* Annotation on connecting line */}
          {step.annotation && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0 0.25rem 1.25rem',
              }}
            >
              <div
                style={{
                  width: '1px',
                  height: '16px',
                  background: 'var(--border)',
                }}
              />
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {step.annotation}
              </span>
            </div>
          )}

          {/* Node */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              borderLeft: `3px solid ${step.color}`,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.125rem',
                }}
              >
                {step.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: step.color,
                }}
              >
                {step.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
