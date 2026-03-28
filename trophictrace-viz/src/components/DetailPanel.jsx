import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const STATUS_COLORS = {
  safe: '#2EB872',
  limited: '#E0A030',
  unsafe: '#DC4444',
}

const FEATURE_LABELS = {
  nearest_pfas_facility_km: 'Proximity to PFAS facility',
  upstream_npdes_pfas_count: 'Upstream PFAS dischargers',
  low_flow_7q10_m3s: 'Low-flow conditions',
  pct_urban: 'Urban land use',
  dissolved_organic_carbon_mgl: 'Dissolved organic carbon',
  mean_annual_flow_m3s: 'River flow rate',
}

const FEATURE_TYPES = {
  nearest_pfas_facility_km: 'source',
  upstream_npdes_pfas_count: 'source',
  low_flow_7q10_m3s: 'hydrologic',
  pct_urban: 'environmental',
  dissolved_organic_carbon_mgl: 'environmental',
  mean_annual_flow_m3s: 'hydrologic',
}

const FACTOR_COLORS = {
  source: '#E8845A',
  ecological: '#5B8FD4',
  environmental: '#3DA89A',
  biological: '#9A6DD4',
  hydrologic: '#7A7A7A',
}

export default function DetailPanel({ species, segment, onClose }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.style.transform = 'translateX(100%)'
      requestAnimationFrame(() => {
        panelRef.current.style.transform = 'translateX(0)'
      })
    }
  }, [])

  const statusColor = STATUS_COLORS[species.safety_status_recreational]
  const tissueConc = species.tissue_total_pfas_ng_g
  // Use a reasonable EPA screening value for total PFAS in tissue
  const epaLimit = 6
  const multiplier = (tissueConc / epaLimit).toFixed(1)
  const isOver = tissueConc > epaLimit

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
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '0.125rem' }}>
            {species.scientific_name}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
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
            {tissueConc}
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 400 }}>
              ng/g
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
            EPA screening level: {epaLimit} ng/g
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
              background: isOver ? 'rgba(220, 68, 68, 0.12)' : 'rgba(46, 184, 114, 0.12)',
              marginBottom: '0.5rem',
            }}
          >
            {multiplier}x {isOver ? 'over' : 'under'} limit
          </div>

          {species.confidence_interval && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: '0.375rem' }}>
              95% CI: [{species.confidence_interval[0]}, {species.confidence_interval[1]}] ng/g
            </div>
          )}

          <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {species.safety_status_recreational === 'safe'
              ? 'Safe for regular consumption'
              : `Maximum ${species.safe_servings_per_month_recreational} serving${species.safe_servings_per_month_recreational > 1 ? 's' : ''} per month (recreational)`}
          </div>
        </div>

        {/* Section B: Contributing Factors (from XGBoost feature importance) */}
        {segment?.top_contributing_features && (
          <Section title="Why is this location contaminated?">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {segment.top_contributing_features.map((feat) => {
                const label = FEATURE_LABELS[feat.feature] || feat.feature
                const type = FEATURE_TYPES[feat.feature] || 'environmental'
                const pct = Math.round(feat.importance * 100)
                return (
                  <div key={feat.feature}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '2px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: '2px',
                          background: FACTOR_COLORS[type],
                          transition: 'width 400ms ease-out',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Section C: Accumulation Timeline */}
        {species.accumulation_curve && (
          <Section title="Accumulation over time">
            <AccumulationChart data={species.accumulation_curve} epaLimit={epaLimit} statusColor={statusColor} />
          </Section>
        )}

        {/* Section D: Contamination Pathway */}
        {species.pathway && (
          <Section title="Contamination pathway">
            <Pathway pathway={species.pathway} />
          </Section>
        )}

        {/* Section E: Who Is At Risk? */}
        <Section title="Who is at risk?">
          <ExposureDisparity species={species} demographics={segment?.demographics} />
        </Section>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1rem' }} />
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
      <line x1={padding.left} y1={epaY} x2={width - padding.right} y2={epaY} stroke="var(--text-tertiary)" strokeWidth={1} strokeDasharray="4 3" />
      <text x={padding.left - 4} y={epaY - 4} fill="var(--text-tertiary)" fontSize={9} fontFamily="var(--font-mono)" textAnchor="end">
        EPA {epaLimit}
      </text>
      <path d={linePath} fill="none" stroke={statusColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={scaleX(data.months[data.months.length - 1])} cy={scaleY(data.concentration_ng_g[data.concentration_ng_g.length - 1])} r={3} fill={statusColor} />
      {[0, 12, 24, 36].filter((m) => m <= maxMonths).map((m) => (
        <text key={m} x={scaleX(m)} y={height - 4} fill="var(--text-tertiary)" fontSize={9} fontFamily="var(--font-mono)" textAnchor="middle">
          {m === 0 ? '0' : `${m}mo`}
        </text>
      ))}
    </svg>
  )
}

function Pathway({ pathway }) {
  const steps = [
    {
      label: pathway.source_facility?.split(' ').slice(0, 2).join(' ') || 'Source',
      value: `${pathway.discharge_ng_l} ng/L`,
      annotation: null,
      color: 'var(--text-tertiary)',
    },
    {
      label: 'River Water',
      value: `${pathway.water_concentration_ng_l} ng/L`,
      annotation: `÷${pathway.dilution_factor} dilution`,
      color: STATUS_COLORS.limited,
    },
    {
      label: 'Fish Tissue',
      value: `${pathway.tissue_concentration_ng_g} ng/g`,
      annotation: `×${pathway.bcf_applied} BCF`,
      color: STATUS_COLORS.unsafe,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {steps.map((step) => (
        <div key={step.label}>
          {step.annotation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0 0.25rem 1.25rem' }}>
              <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {step.annotation}
              </span>
            </div>
          )}
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>{step.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 500, color: step.color }}>{step.value}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ExposureDisparity({ species, demographics }) {
  const recHQ = species.hazard_quotient_recreational
  const subHQ = species.hazard_quotient_subsistence
  const maxHQ = Math.max(recHQ, subHQ, 1.5)
  const thresholdPct = (1.0 / maxHQ) * 100

  const barColor = (hq) => (hq >= 1.0 ? STATUS_COLORS.unsafe : hq >= 0.5 ? STATUS_COLORS.limited : STATUS_COLORS.safe)

  return (
    <div>
      {/* Recreational */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Recreational angler</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
            HQ {recHQ.toFixed(1)}
          </span>
        </div>
        <div style={{ position: 'relative', height: '8px', borderRadius: '4px', background: 'var(--bg-secondary)' }}>
          <div
            style={{
              width: `${Math.min((recHQ / maxHQ) * 100, 100)}%`,
              height: '100%',
              borderRadius: '4px',
              background: barColor(recHQ),
              transition: 'width 400ms ease-out',
            }}
          />
          {/* EPA threshold line */}
          <div
            style={{
              position: 'absolute',
              left: `${thresholdPct}%`,
              top: '-4px',
              bottom: '-4px',
              width: '1px',
              borderLeft: '1.5px dashed var(--text-tertiary)',
            }}
          />
        </div>
      </div>

      {/* Subsistence */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Subsistence fisher</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
            HQ {subHQ.toFixed(1)}
          </span>
        </div>
        <div style={{ position: 'relative', height: '8px', borderRadius: '4px', background: 'var(--bg-secondary)' }}>
          <div
            style={{
              width: `${Math.min((subHQ / maxHQ) * 100, 100)}%`,
              height: '100%',
              borderRadius: '4px',
              background: barColor(subHQ),
              transition: 'width 400ms ease-out',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${thresholdPct}%`,
              top: '-4px',
              bottom: '-4px',
              width: '1px',
              borderLeft: '1.5px dashed var(--text-tertiary)',
            }}
          />
        </div>
      </div>

      {/* Threshold label */}
      <div
        style={{
          fontSize: '0.625rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-tertiary)',
          textAlign: 'center',
          marginBottom: '1rem',
        }}
      >
        Dashed line = EPA Safety Threshold (HQ 1.0)
      </div>

      {/* Demographic callout */}
      {demographics && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Subsistence fishers in {demographics.nearest_tract_name} (median income ${demographics.median_income.toLocaleString()}) face{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--accent)' }}>
            {demographics.exposure_multiplier_vs_recreational}x
          </span>{' '}
          the exposure of recreational anglers. An estimated {demographics.subsistence_fishing_estimated_pct}% of households rely on locally caught fish.
        </div>
      )}
    </div>
  )
}
