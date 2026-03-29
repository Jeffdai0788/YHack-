# Downstream — PFAS Bioaccumulation Intelligence

> Predicting forever-chemical accumulation in fish tissue and generating personalized consumption advisories for the communities that depend on local fish most.

---

## The Problem

PFAS ("forever chemicals") don't stay in water — they accumulate in fish tissue at concentrations **100–1,000× higher** than water measurements alone would suggest. State fish consumption advisories are outdated and calibrated for recreational anglers, not subsistence fishers who consume fish at **6.5× the EPA general-population rate**.

A subsistence fisher eating the same fish from the same river as a recreational angler can be at **2–3× the EPA safe dose threshold** — with no warning.

Downstream bridges that gap: factory discharge permits → water PFAS → fish tissue concentration → personalized human health risk, in a single interactive pipeline.

---

## Pipeline Overview

```
[EPA/USGS Data] → [Water Screening] → [Tissue Bioaccumulation] → [Hazard Quotient] → [Interactive Map]
```

| Stage | Model | What It Does | Performance |
|-------|-------|--------------|-------------|
| 1 | Gradient Boosting Regressor | Predicts water PFAS (ng/L) from facility proximity, land use, flow | R² 0.14, 80.6% within 3× |
| 2 | Physics-Informed Neural Network | Models tissue bioaccumulation using Gobas (1993) ODE + species traits | R² 0.94, 96.7% within 2× |
| 3 | EPA Hazard Quotient | Translates tissue concentration → human risk at recreational & subsistence rates | Deterministic |

---

## Features

- **National coverage** — 3,274 river segments across the US with precomputed PFAS predictions
- **Species-aware** — 8 fish species with real trophic levels, lipid content, and body mass from FishBase and GBIF occurrence data
- **Subsistence vs. recreational** — dual exposure modeling at 22 g/day (recreational) and 142.4 g/day (subsistence)
- **Uncertainty quantification** — 95% confidence intervals via MC Dropout (50 forward passes)
- **Seasonal variation** — monthly slider shows how PFAS levels shift across the year
- **Facility alerts** — upstream NPDES permit holders flagged per segment (Chemours, 3M, military AFFF sites)
- **AI chat** — ask plain-English questions about any river or species, answered via Claude API
- **Environmental justice overlays** — subsistence fishing community zones highlighted on the map

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React + Vite Frontend                      │
│  MapView · DetailPanel · ActionPanel · FishSearch · Chat     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (precomputed JSON) + Claude API
┌──────────────────────▼──────────────────────────────────────┐
│                   FastAPI Backend                            │
│                                                              │
│  Stage 1: GradientBoostingRegressor  (scikit-learn)          │
│  Stage 2: Physics-Informed Neural Net (PyTorch + Gobas ODE)  │
│  Stage 3: EPA Reference Dose Hazard Quotient                 │
│                                                              │
│  Data: 54,246 EPA WQP measurements · NHDPlus v2.1 network   │
│        35 geocoded PFAS facilities · GBIF species ranges     │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

**Frontend**
- React 19 · Vite 8
- Mapbox GL 3 (color-coded contamination layers, heatmap, glow effects)
- Lucide React (icons)
- Claude API (AI chat interface)

**Backend**
- Python · FastAPI · Uvicorn
- scikit-learn GradientBoostingRegressor
- PyTorch (Physics-Informed Neural Network)
- Pandas · NumPy · SciPy · joblib

**Data Sources**
| Source | What It Provides |
|--------|-----------------|
| EPA Water Quality Portal | 54,246 PFAS lab measurements (2003–2025) |
| EPA TRI / ECHO | 35 geocoded PFAS-handling facilities |
| USGS NWIS | Stream flow gauge readings |
| NHDPlus v2.1 | Stream order, reach length, COMID IDs |
| GBIF | Fish species occurrence by watershed |
| FishBase | Trophic level, lipid %, body mass per species |
| NLCD 2019 | Urban/agricultural land use via StreamCat |
| Census ACS 2022 | Population density for EJ overlays |

---

## How the ML Works

### Stage 1 — Water PFAS Screening

A `GradientBoostingRegressor` trained on 2,131 real EPA measurements predicts surface water PFAS concentration (ng/L) from 12 features: latitude/longitude, proximity to PFAS-handling facilities, stream flow, stream order, urban/agricultural land use fraction, and month of year.

**Honest limitation**: Point-source discharges dominate real PFAS contamination and are poorly captured by spatial features alone. R² is low (0.14), but 80.6% of predictions land within a factor of 3 — sufficient for screening-level triage of ~90,000 NHDPlus segments.

### Stage 2 — Fish Tissue Bioaccumulation (PINN)

A Physics-Informed Neural Network enforces the Gobas (1993) bioaccumulation ODE as a hard constraint during training:

```
dC_fish/dt = k_uptake × C_water - (k_elim + k_growth) × C_fish
```

Physics constraints enforced via autograd:
- Tissue concentration monotonically increases with trophic level, lipid fraction, and exposure time
- DOC partitioning: only freely dissolved PFAS fraction is bioavailable
- Geometric-mean calibration anchored to published BAF values (Kelly et al. 2024)

Trained on 50,000 synthetic ODE solutions (real fish tissue data is too scarce and confounded for direct training). MC Dropout over 50 forward passes produces calibrated 95% confidence intervals per prediction.

### Stage 3 — Hazard Quotient

```
HQ = (tissue_ng_g × consumption_g_day × EPA_absorption) / (reference_dose × body_weight_kg)
```

| HQ | Risk Level |
|----|-----------|
| < 1 | Safe |
| 1–3 | Caution (limited meals advised) |
| > 3 | Unsafe |

Computed separately for recreational (22 g/day) and subsistence (142.4 g/day) consumption rates.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A Mapbox public token
- A Claude API key (optional — for AI chat)

### Run the Frontend

```bash
git clone https://github.com/<your-handle>/trophictrace.git
cd trophictrace/trophictrace-viz
npm install
npm run dev
```

Open `http://localhost:5173`.

### Run the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

### Environment Variables

Create `trophictrace-viz/.env`:
```env
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_CLAUDE_API_KEY=your_claude_key   # Optional — enables AI chat
```

---

## Project Structure

```
trophictrace/
├── trophictrace-viz/              # React frontend
│   └── src/
│       ├── App.jsx                # Scroll orchestrator + state
│       ├── components/
│       │   ├── MapView.jsx        # Mapbox GL contamination map
│       │   ├── Hero.jsx           # Animated water/sun landing section
│       │   ├── FloatingIsland.jsx # Hover tooltip (species + PFAS)
│       │   ├── DetailPanel.jsx    # Species deep-dive + confidence intervals
│       │   ├── ActionPanel.jsx    # Segment overview + facility alerts
│       │   ├── FishSearch.jsx     # Species filter autocomplete
│       │   └── AIChatPrompt.jsx   # Claude-powered chat interface
│       ├── data/
│       │   ├── nationalResults.json   # 3,274 segments with predictions (21 MB)
│       │   └── riverGeometry.json     # GeoJSON river geometries (1.2 MB)
│       └── utils/
│           └── chatEngine.js      # Local query + API routing logic
│
├── backend/
│   ├── server.py                  # FastAPI — serves precomputed results
│   ├── inference.py               # Stages 1→2→3 pipeline
│   ├── pinn_bioaccumulation.py    # PINN class + Gobas ODE physics constraints
│   ├── train_xgboost.py           # GBR training + hyperparameters
│   ├── generate_data.py           # Species profiles + hazard quotient logic
│   ├── build_training_data.py     # EPA/USGS → training CSV
│   ├── sync_to_frontend.py        # Backend JSON → frontend schema transform
│   ├── pinn_best.pt               # Trained PINN weights (208 KB)
│   ├── gbr_model.joblib           # Trained GBR model (4.4 MB)
│   └── national_results.json      # Full precomputed output (23.9 MB)
│
└── trophictrace_spec_v3.md        # Full technical specification
```

---

## Risk Color Scale

| Color | Water PFAS (ng/L) | Tissue Risk |
|-------|------------------|-------------|
| Green | ≤ 20 | Safe for all anglers |
| Yellow | 20–60 | Caution for subsistence fishers |
| Orange | 60–150 | Unsafe for subsistence fishers |
| Red | 150–250 | Unsafe for all anglers |
| Dark Red | 250+ | Critical — avoid consumption |

---

## Environmental Justice Context

Standard fish advisories are set at 22 g/day (recreational angler baseline). Subsistence fishers — disproportionately Indigenous communities, low-income households, and recent immigrants — consume fish at 6.5× that rate. TrophicTrace explicitly models both populations and surfaces the gap. In Cape Fear River, NC, a subsistence fisher eating largemouth bass reaches an HQ of ~3.2 while a recreational angler at the same location reads HQ ~0.5.

---

## Built At

**YHacks 2026** — 16-hour sprint, 4-person team. TrophicTrace was built to give subsistence fishing communities the same quality of risk information that regulatory agencies have — but faster, more specific, and in a form they can actually use.

---

## License

MIT
