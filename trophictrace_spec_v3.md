# TrophicTrace — PFAS Bioaccumulation Prediction & Fish Safety Advisory System

## YHacks 2026 Spring — Hackathon Project Specification (16 Hours, 4 People)

---

## Abstract

PFAS ("forever chemicals") contaminate waterways across America, but the real danger is invisible: factories discharge PFAS into rivers, and those chemicals don't stay in the water. They get absorbed by algae, eaten by invertebrates, eaten by small fish, eaten by large fish — and at each trophic step, the concentration multiplies. By the time a human eats a bass from that river, the PFAS level in the fish tissue can be hundreds of times higher than what's measured in the water itself. The water tests "safe." The fish are dangerous.

A 2023 EWG study found that eating **a single serving of freshwater fish** delivers PFAS exposure equivalent to drinking contaminated water for an entire month (Barbo et al., *Environmental Research*, 2023). The median PFAS concentration in freshwater fish fillets across the US is 9,500 ng/kg — and in the Great Lakes, 11,800 ng/kg. The EPA's 2024 drinking water PFAS regulation explicitly aims to "prevent thousands of deaths," yet **fish consumption advisories remain state-level, years out of date, and blind to the populations most at risk.**

Those populations are subsistence fishers — disproportionately low-income, Black, and Indigenous communities who rely on locally caught fish as a primary protein source. The EPA's default general-population fish consumption rate is 22 g/day. The EPA's own subsistence fisher rate is 142.4 g/day — **6.5× higher**. When a state agency sets a "safe" advisory based on the general population assumption, it systematically undercounts the actual exposure of the people eating the most fish. A recreational angler eating bass once a month might be fine. A subsistence fisher eating that same bass three times a week is at 2–3× the EPA safety threshold. That disparity is the core finding, and it emerges directly from the math.

**TrophicTrace** is a three-stage computational pipeline that connects factory discharge permits to predicted fish tissue contamination to personalized human exposure risk:

1. **Stage 1 — Contamination Screening (XGBoost):** Takes publicly available tabular data — NPDES discharge permits, river flow rates, land use, upstream industrial activity — and predicts which waterway segments likely have elevated PFAS, even where no fish have been sampled. This is a standard, well-proven ML approach for tabular environmental data.
2. **Stage 2 — Bioaccumulation Chemistry (Deterministic Model):** For flagged segments, runs published mechanistic equations (Gobas 1993; Kelly, Sun, McDougall, Sunderland & Gobas 2024) that estimate how much PFAS accumulates in fish tissue, species by species. Water concentration goes in, predicted tissue concentration comes out. No ML — just chemistry with published parameters.
3. **Stage 3 — Human Exposure & Advisory (Hazard Quotient):** Converts tissue predictions into human exposure at different consumption rates. Computes a hazard quotient (HQ): is this person's PFAS dose above or below the EPA reference dose? Outputs a personalized fish consumption advisory.

The visualization is an interactive map of the entire United States where a judge can click any watershed and instantly see the predicted risk, the likely source factories, which fish species are safe and which aren't, and — critically — that a recreational angler might be fine while a subsistence fisher in the same location is at 2–3× the safe limit.

The **ASUS supercomputer** enables running this pipeline across all ~90,000 NHDPlus stream segments and ~2,600 HUC-8 watersheds in the continental US fast enough for real-time interactive queries during the demo. For production deployment, tribal nations and state agencies need on-premises compute because their pre-enforcement environmental data is legally sensitive and cannot leave sovereign infrastructure.

**Key statistics for judges (all sourced):**

- 1 freshwater fish serving = 1 month of PFAS-contaminated water exposure (Barbo et al., *Environmental Research*, 2023 / EWG)
- Median PFAS in US freshwater fish fillets: 9,500 ng/kg; Great Lakes: 11,800 ng/kg (Barbo et al., 2023)
- EPA subsistence fisher consumption rate: 142.4 g/day vs. general population 22 g/day — a **6.5× exposure gap** (EPA *Estimated Fish Consumption Rates*, 2014)
- EPA 2024 PFAS drinking water rule: MCLs of 4 ppt for PFOA and PFOS individually (EPA NPDWR, April 2024)
- EPA reference dose: PFOA = 3×10⁻⁸ mg/kg/day; PFOS = 1×10⁻⁷ mg/kg/day (EPA, 2024)
- Published bioaccumulation models reproduce observed fish tissue concentrations within a factor of 2 for >80% of species with 8+ perfluorinated carbons (Sun et al., *Environmental Science: Processes & Impacts*, 2022)
- Kelly et al. 2024 validated aquatic/terrestrial food web bioaccumulation models show good agreement between predicted and observed BCF/BAF values across multiple PFAS congeners (*Environmental Science & Technology*, 58(40), 17828–17837)
- Fish (Teleostei) whole-body BAFs: log BAF for PFOS = 3.49 (n=67), PFOA = 2.12 (n=42) (Burkhard, *Environmental Toxicology and Chemistry*, 2021)
- $47–75 billion/year US healthcare costs attributable to PFAS exposure (NRDC)
- State fish advisories take 2–4+ years to update after contamination events — people eat contaminated fish in the interim

---

## The Market: Who Needs This and Why It Doesn't Exist Yet

**The gap:** No tool currently connects factory discharge permits → water concentration → fish tissue prediction → personalized consumption advisory in a single pipeline. Each step is handled by different agencies using different data systems, and the connections between them are made manually — if they're made at all.

**State environmental agencies** (50 state programs, ~$2B+ collective annual budgets for water quality): Currently conduct fish tissue sampling manually at $500–2,000 per sample. A single watershed survey costs $50K–200K and produces a snapshot that's immediately aging. Most watersheds have never been sampled. TrophicTrace provides computational screening to prioritize where to spend limited sampling budgets — targeting the 5% of watersheds most likely to have dangerous fish, rather than sampling randomly.

**Environmental litigation firms** (PFAS lawsuits exceeded $30B in claims by 2024): Attorneys building PFAS cases need source attribution — which factory's discharge is responsible for which downstream contamination. TrophicTrace's pipeline traces contamination from specific NPDES permits through dilution and bioaccumulation to tissue levels, providing the causal chain that litigation requires.

**Tribal environmental offices** (574 federally recognized tribes, many with active environmental programs): Tribal nations manage fisheries that are central to cultural practice and food sovereignty. Their environmental monitoring data often falls under tribal data sovereignty requirements — it cannot be uploaded to cloud servers or shared with federal databases without consent. TrophicTrace running on-premises via the ASUS hardware directly addresses this requirement.

**Federal agencies** (EPA, ATSDR, USGS): The EPA's 2024 PFAS Strategic Roadmap specifically calls for tools to "better understand unique impacts on subsistence fishers." ATSDR's 2024 guidance on PFAS in fish explicitly identifies the need for predictive screening tools. TrophicTrace is that tool.

---

## Technical Architecture: Three Stages in Detail

---

### Stage 1: PFAS Contamination Screening Model (XGBoost)

#### What it does

Takes tabular environmental features for a waterway segment and outputs a predicted water-column PFAS concentration (ng/L). This is a **screening tool** — it identifies which segments likely have elevated PFAS so that Stage 2 can run bioaccumulation calculations on them.

#### Why XGBoost

XGBoost is the dominant algorithm for tabular environmental prediction tasks. Recent published work validates this exact approach:

- Paulson et al. (2024, *Science*) used XGBoost (250 trees, interaction depth 3, learning rate 0.0505) to predict PFAS occurrence in US groundwater with strong predictive performance across principal aquifers.
- A California groundwater study achieved AUROC of 73–100% for individual PFAS congeners using XGBoost with SMOTE oversampling on 25,000 observations across 4,200 wells.
- FOCUS (2025, *arXiv*) demonstrated geospatial deep learning for surface water PFAS, but the tabular feature approach with random forest / XGBoost achieved comparable results with far simpler infrastructure.

XGBoost is the right choice for a hackathon because: (a) it's proven for this exact problem domain, (b) it trains in minutes not hours, (c) feature importance is built in, giving us automatic source attribution, and (d) it handles mixed feature types and missing data natively.

#### Feature engineering (29 features per segment)

Every feature below comes from a publicly available, downloadable federal dataset. No proprietary data.

**Discharge features (8 features):**

| Feature | Description | Source |
|---------|-------------|--------|
| `upstream_npdes_count` | Number of NPDES-permitted facilities within 50 km upstream | EPA ECHO NPDES downloads |
| `upstream_npdes_pfas_count` | Number of upstream facilities in PFAS-handling SIC/NAICS codes | EPA ECHO PFAS Analytic Tools |
| `nearest_pfas_facility_km` | Distance to nearest known PFAS-handling facility | EPA ECHO + NHDPlus network distance |
| `upstream_discharge_volume_m3` | Total permitted discharge volume from upstream facilities | EPA ECHO DMR data |
| `pfas_industry_density` | Count of PFAS-sector facilities per km² in HUC-8 | EPA ECHO + WBD |
| `afff_site_nearby` | Binary: DOD AFFF site within 20 km | DOD PFAS release data |
| `wwtp_upstream` | Binary: municipal WWTP within 30 km upstream | EPA ECHO |
| `landfill_upstream` | Binary: active landfill within 20 km upstream | EPA ECHO / RCRA |

**Hydrologic features (7 features):**

| Feature | Description | Source |
|---------|-------------|--------|
| `mean_annual_flow_m3s` | Mean annual flow at segment | NHDPlus V2 EROM table |
| `low_flow_7q10_m3s` | 7-day 10-year low flow (worst-case dilution) | NHDPlus V2 / USGS streamstats |
| `stream_order` | Strahler stream order | NHDPlus V2 |
| `watershed_area_km2` | Total upstream drainage area | NHDPlus V2 catchment attributes |
| `baseflow_index` | Fraction of streamflow from groundwater | NHDPlus V2 |
| `mean_velocity_ms` | Mean flow velocity | NHDPlus V2 EROM table |
| `huc8_code` | HUC-8 watershed identifier (categorical) | WBD |

**Land use features (7 features):**

| Feature | Description | Source |
|---------|-------------|--------|
| `pct_urban` | % urban land use in upstream catchment | NLCD 2021 |
| `pct_agriculture` | % agricultural land use | NLCD 2021 |
| `pct_forest` | % forested land use | NLCD 2021 |
| `pct_impervious` | % impervious surface | NLCD 2021 |
| `population_density` | People per km² in upstream catchment | Census ACS 2022 |
| `airport_within_10km` | Binary: airport (AFFF risk) within 10 km | FAA airports database |
| `fire_training_site` | Binary: fire training facility within 15 km | DOD/state PFAS lists |

**Water chemistry features (5 features):**

| Feature | Description | Source |
|---------|-------------|--------|
| `ph` | Water pH | WQP (Water Quality Portal) |
| `temperature_c` | Water temperature | WQP |
| `dissolved_organic_carbon_mgl` | DOC concentration | WQP |
| `total_organic_carbon_mgl` | TOC concentration | WQP |
| `conductivity_us_cm` | Specific conductance | WQP |

**Geographic features (2 features):**

| Feature | Description | Source |
|---------|-------------|--------|
| `latitude` | Segment centroid latitude | NHDPlus V2 |
| `longitude` | Segment centroid longitude | NHDPlus V2 |

#### Training data: where the labels come from

The labels (measured PFAS water concentrations) come from three public datasets:

1. **EPA UCMR 5 (Unregulated Contaminant Monitoring Rule 5):** The largest US drinking water PFAS dataset. Contains PFAS measurements from ~10,000 public water systems sampled 2023–2025. Each sample includes location and measured concentrations for 29 PFAS analytes. Download: https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule
2. **USGS PFAS water monitoring data:** Surface water PFAS measurements from USGS monitoring stations. Available via the Water Quality Portal (https://www.waterqualitydata.us/) with characteristic name filter "Perfluoro*".
3. **State-level PFAS monitoring:** States including NC, MI, MN, NJ, and MA have published fish tissue and water PFAS datasets. NC DEQ published extensive Cape Fear River PFAS data. MI EGLE publishes statewide PFAS data.

We join these measured concentrations to the corresponding NHDPlus segments (by lat/lng snap-to-network using the NLDI API), then compute the 29 features above for each segment.

**Expected training set size:** 3,000–8,000 labeled segments (water samples with known PFAS concentrations joined to NHDPlus features). This is well within the range where XGBoost excels.

#### Model specification

```python
import xgboost as xgb

model = xgb.XGBRegressor(
    n_estimators=250,        # 250 trees (matches Paulson et al. 2024)
    max_depth=3,             # interaction depth 3 (matches Paulson et al.)
    learning_rate=0.05,      # learning rate ~0.05 (matches Paulson et al.)
    min_child_weight=5,      # regularization
    subsample=0.8,           # row sampling
    colsample_bytree=0.8,    # column sampling
    gamma=0.1,               # loss reduction threshold
    reg_alpha=0.1,           # L1 regularization
    reg_lambda=1.0,          # L2 regularization
    objective='reg:squarederror',
    tree_method='gpu_hist',  # GPU acceleration on ASUS
    device='cuda'
)
```

**Training time:** <2 minutes on ASUS GPU for 5,000 samples × 29 features × 250 trees. <10 minutes on CPU as fallback.

**Output:** For every NHDPlus segment in the US (~90,000 segments), a predicted total PFAS water concentration in ng/L, plus XGBoost feature importance scores identifying the top contributing factors.

**Validation:** 5-fold cross-validation. Report RMSE, MAE, R², and segment-level accuracy (% predictions within a factor of 3 of measured values).

---

### Stage 2: Bioaccumulation Chemistry Model (Deterministic)

#### What it does

Takes a predicted water PFAS concentration from Stage 1 and estimates the PFAS concentration in fish tissue (ng/g wet weight) for each species present in that waterway. This is **not machine learning** — it is a system of published chemical equations with published parameters.

#### The scientific basis

The model implements the aquatic food web bioaccumulation framework developed by Gobas (1993) and refined for PFAS by Sun et al. (2022) and Kelly, Sun, McDougall, Sunderland & Gobas (2024). Key validation result: **the model reproduces observed whole-body fish tissue concentrations within a factor of 2 for >80% of fish species** for the most bioaccumulative PFAS (those with 8+ perfluorinated carbons) (Sun et al., *Env. Sci.: Processes & Impacts*, 2022).

#### Step 2a: Water concentration partitioning

The total PFAS in water partitions between dissolved phase and particulate (DOC-bound) phase:

```
C_dissolved = C_water / (1 + K_DOC × [DOC])
```

Where:
- `C_water` = total water PFAS concentration (ng/L) from Stage 1
- `K_DOC` = dissolved organic carbon partition coefficient (L/kg). Published values: PFOS = 1,100 L/kg; PFOA = 400 L/kg; GenX = 200 L/kg (Higgins & Luthy, 2006)
- `[DOC]` = dissolved organic carbon concentration (kg/L), from Water Quality Portal data

Only the dissolved fraction is bioavailable for uptake by organisms.

#### Step 2b: Bioconcentration — water to organism (BCF)

For each organism at the base of the food web (algae, invertebrates, forage fish):

```
C_tissue = C_dissolved × BCF_species
```

The bioconcentration factor (BCF) depends on the PFAS congener and the organism. Published BCF values from EPA's ECOTOX database (Burkhard 2021) and compiled field studies:

| PFAS Congener | Fish BCF Range (L/kg) | Log BAF Fish (mean ± SD) | Source |
|---------------|----------------------|--------------------------|--------|
| PFOS | 1,000 – 10,000 | 3.49 ± 0.91 (n=67) | Burkhard 2021 |
| PFOA | 10 – 500 | 2.12 ± 0.80 (n=42) | Burkhard 2021 |
| PFNA | 200 – 3,000 | 3.08 ± 0.75 | Burkhard 2021 |
| PFHxS | 50 – 1,000 | 2.50 ± 0.90 | Burkhard 2021 |
| PFDA | 500 – 5,000 | 3.30 ± 0.85 | Burkhard 2021 |
| HFPO-DA (GenX) | 5 – 100 | 1.60 ± 0.70 | EPA 2024 |

Within a species, BCF scales with protein and lipid content. Following Kelly et al. (2024), the species-specific BCF is estimated as:

```
BCF_species = D_albumin × f_albumin + D_membrane × f_membrane + D_protein × f_protein
```

Where:
- `D_albumin`, `D_membrane`, `D_protein` = albumin-water, membrane-water, and structural protein-water distribution coefficients (congener-specific, published in Kelly et al. 2024)
- `f_albumin`, `f_membrane`, `f_protein` = mass fractions of albumin, membrane lipids, and structural proteins in the organism (species-specific, from FishBase and published literature)

**For the hackathon, we use the simpler approach:** look up the published median BCF for each congener-species combination from Burkhard (2021), and scale by the species' lipid content relative to a reference species:

```
BCF_species_i = BCF_reference × (lipid_pct_i / lipid_pct_reference)
```

This is a standard approximation used in regulatory screening assessments.

#### Step 2c: Biomagnification — prey to predator (BMF)

At each trophic step, PFAS concentrations increase by a biomagnification factor (BMF):

```
C_predator = Σ (diet_fraction_j × C_prey_j × BMF_j→predator)
```

Where:
- `diet_fraction_j` = fraction of predator's diet composed of prey species j (from FishBase diet data)
- `C_prey_j` = tissue concentration in prey species j
- `BMF_j→predator` = biomagnification factor for this predator-prey pair

Published BMF values for PFOS in freshwater fish food webs range from 2–15 depending on trophic level difference (Kelly et al. 2024). The trophic magnification factor (TMF) provides a per-trophic-level multiplier:

```
log(C_tissue) = a + TMF × trophic_level
```

Published TMF values: PFOS TMF = 3.0–5.0; PFOA TMF = 1.0–2.0; PFNA TMF = 2.5–4.0 (Sun et al. 2022; Kelly et al. 2024).

For the hackathon implementation, we use the TMF approach:

```python
def predict_tissue_concentration(C_water_dissolved, species_trophic_level,
                                  species_lipid_pct, congener):
    """
    Predict fish tissue PFAS concentration using BCF + TMF approach.

    Parameters:
        C_water_dissolved: dissolved PFAS in water (ng/L)
        species_trophic_level: trophic level from FishBase (2.0 - 4.5)
        species_lipid_pct: lipid content (%) from FishBase
        congener: PFAS congener name (e.g., 'PFOS', 'PFOA')

    Returns:
        C_tissue: predicted tissue concentration (ng/g wet weight)
    """
    # Published BCF values (median, L/kg) from Burkhard 2021
    BCF_BASE = {
        'PFOS': 3100,   # 10^3.49
        'PFOA': 132,    # 10^2.12
        'PFNA': 1200,   # 10^3.08
        'PFHxS': 316,   # 10^2.50
        'PFDA': 2000,   # 10^3.30
        'GenX': 40,     # 10^1.60
    }

    # Published TMF values per trophic level
    TMF = {
        'PFOS': 3.5,
        'PFOA': 1.5,
        'PFNA': 3.0,
        'PFHxS': 2.0,
        'PFDA': 3.2,
        'GenX': 1.2,
    }

    REFERENCE_LIPID_PCT = 4.0  # reference lipid content
    REFERENCE_TROPHIC = 3.0    # reference trophic level for BCF values

    # Lipid-adjusted BCF
    bcf = BCF_BASE[congener] * (species_lipid_pct / REFERENCE_LIPID_PCT)

    # Base tissue concentration from water
    C_base = C_water_dissolved * bcf / 1000  # convert ng/L × L/kg to ng/g

    # Trophic magnification: scale by TMF for trophic levels above reference
    trophic_diff = species_trophic_level - REFERENCE_TROPHIC
    C_tissue = C_base * (TMF[congener] ** trophic_diff)

    return C_tissue
```

#### Species data: exactly 8 common US freshwater species

| Common Name | Scientific Name | Trophic Level | Lipid % | Body Mass (g) | Diet Summary | Source |
|-------------|----------------|---------------|---------|---------------|--------------|--------|
| Largemouth Bass | *Micropterus salmoides* | 4.2 | 5.8 | 1,500 | Bluegill, shad, crayfish | FishBase |
| Channel Catfish | *Ictalurus punctatus* | 3.8 | 4.2 | 2,000 | Invertebrates, small fish, detritus | FishBase |
| Bluegill | *Lepomis macrochirus* | 3.1 | 3.5 | 200 | Insects, zooplankton | FishBase |
| Striped Bass | *Morone saxatilis* | 4.5 | 6.1 | 5,000 | Shad, herring, small fish | FishBase |
| Flathead Catfish | *Pylodictis olivaris* | 4.0 | 4.8 | 3,000 | Fish, crayfish | FishBase |
| White Perch | *Morone americana* | 3.5 | 3.8 | 400 | Invertebrates, small fish | FishBase |
| Common Carp | *Cyprinus carpio* | 2.9 | 5.2 | 3,000 | Detritus, invertebrates, plants | FishBase |
| Brown Trout | *Salmo trutta* | 4.0 | 5.5 | 1,200 | Insects, small fish, crayfish | FishBase |

These 8 species cover >80% of freshwater recreational and subsistence catch across the continental US. All trophic levels and lipid data are published on FishBase (https://www.fishbase.org).

---

### Stage 3: Human Exposure & Hazard Quotient

#### What it does

Converts fish tissue PFAS concentrations into human exposure doses at different consumption rates, computes a hazard quotient against EPA reference doses, and generates a personalized fish consumption advisory.

#### The exposure calculation

```
Dose (ng/kg/day) = (C_tissue × IR × EF) / BW
```

Where:
- `C_tissue` = fish tissue PFAS concentration (ng/g) from Stage 2
- `IR` = ingestion rate (g/day)
- `EF` = exposure fraction (unitless, = 1 for daily consumption)
- `BW` = body weight (kg), default 70 kg (EPA standard)

**Ingestion rates from EPA (***Estimated Fish Consumption Rates***, 2014):**

| Population | Ingestion Rate | Meals/Week Equivalent | Source |
|------------|---------------|----------------------|--------|
| General US population | 22 g/day | ~0.7 meals/week | EPA 2014 |
| Recreational angler | 17 g/day (50th pctile) | ~0.5 meals/week | EPA 2014 |
| High-end recreational | 50 g/day (90th pctile) | ~1.5 meals/week | EPA 2014 |
| Subsistence fisher | 142.4 g/day | ~4.4 meals/week | EPA 2014 |
| Tribal subsistence (high-end) | 389 g/day | ~12 meals/week | Columbia River tribes |

(One "meal" = 227 g, per EPA default serving size for a 70 kg adult.)

#### The hazard quotient

```
HQ = Dose / RfD
```

Where:
- `Dose` = calculated daily PFAS dose (mg/kg/day)
- `RfD` = EPA reference dose (mg/kg/day)

**EPA reference doses (2024):**

| PFAS | RfD (mg/kg/day) | Source |
|------|-----------------|--------|
| PFOA | 3.0 × 10⁻⁸ | EPA 2024 final |
| PFOS | 1.0 × 10⁻⁷ | EPA 2024 final |
| HFPO-DA (GenX) | 3.0 × 10⁻⁶ | EPA 2024 HA |
| PFHxS | 2.0 × 10⁻⁵ | EPA 2024 HI NPDWR |
| PFNA | 3.0 × 10⁻⁶ | EPA 2024 HI NPDWR |

For PFAS mixtures, we compute the **Hazard Index (HI)** — the sum of individual HQs:

```
HI = Σ HQ_i = Σ (Dose_i / RfD_i)
```

**Interpretation:**
- HI < 1.0: Exposure below EPA safety threshold. Fish consumption at this rate is considered safe.
- HI = 1.0–2.0: Exposure at or slightly above threshold. Advisory: reduce consumption frequency.
- HI > 2.0: Exposure significantly exceeds threshold. Advisory: do not eat, or limit to specific servings/month.

#### The advisory output

For each species at each location, for each consumption profile:

```python
def compute_advisory(C_tissue_by_congener, ingestion_rate_g_day, body_weight_kg=70):
    """
    Compute hazard index and safe servings/month.

    Parameters:
        C_tissue_by_congener: dict of {congener: concentration_ng_g}
        ingestion_rate_g_day: consumption rate in g/day
        body_weight_kg: body weight (default 70 kg)

    Returns:
        hazard_index: float
        safe_servings_per_month: int
        safety_status: 'safe' | 'limited' | 'unsafe'
    """
    RFD = {  # mg/kg/day
        'PFOS': 1.0e-7,
        'PFOA': 3.0e-8,
        'GenX': 3.0e-6,
        'PFHxS': 2.0e-5,
        'PFNA': 3.0e-6,
        'PFDA': 3.0e-6,  # conservative estimate
    }

    SERVING_G = 227  # EPA default serving size, grams

    hazard_index = 0
    for congener, C_ng_g in C_tissue_by_congener.items():
        if congener in RFD:
            dose_mg_kg_day = (C_ng_g * 1e-6 * ingestion_rate_g_day) / body_weight_kg
            hazard_index += dose_mg_kg_day / RFD[congener]

    # Safe servings: find max servings/month where HI <= 1.0
    # HI scales linearly with ingestion rate
    if hazard_index > 0:
        safe_daily_g = ingestion_rate_g_day / hazard_index  # g/day that gives HI=1
        safe_servings_per_month = max(0, int((safe_daily_g * 30) / SERVING_G))
    else:
        safe_servings_per_month = 30  # unlimited

    if hazard_index < 0.5:
        safety_status = 'safe'
    elif hazard_index < 1.5:
        safety_status = 'limited'
    else:
        safety_status = 'unsafe'

    return hazard_index, safe_servings_per_month, safety_status
```

#### The core finding that emerges from the math

For a segment with predicted PFOS water concentration of 50 ng/L and a largemouth bass (trophic level 4.2, lipid 5.8%):

1. Dissolved PFOS ≈ 47.6 ng/L (assuming DOC = 5 mg/L)
2. BCF (lipid-adjusted) = 3,100 × (5.8/4.0) = 4,495 L/kg
3. Base tissue = 47.6 × 4,495 / 1,000 = 214 ng/g
4. Trophic magnification: 214 × 3.5^(4.2 - 3.0) = 214 × 5.1 = **1,091 ng/g** in bass tissue

For a **recreational angler** eating 17 g/day:
- Dose = (1,091 × 10⁻⁶ × 17) / 70 = 2.65 × 10⁻⁴ mg/kg/day
- HQ_PFOS = 2.65 × 10⁻⁴ / 1.0 × 10⁻⁷ = **2,650** ← even recreational anglers are at extreme risk here

For a **subsistence fisher** eating 142.4 g/day:
- Dose = (1,091 × 10⁻⁶ × 142.4) / 70 = 2.22 × 10⁻³ mg/kg/day
- HQ_PFOS = 2.22 × 10⁻³ / 1.0 × 10⁻⁷ = **22,200** ← catastrophic exposure

The disparity ratio: 22,200 / 2,650 = **8.4× higher risk for subsistence fishers** — directly proportional to the consumption rate ratio (142.4 / 17 ≈ 8.4).

This isn't a model artifact. It's arithmetic. And it shows that even "moderate" PFAS water levels can produce extremely dangerous fish tissue levels through bioaccumulation. The water tests "safe." The fish are not.

---

## Data Sources: Exact URLs, APIs, and Download Instructions

Every dataset is federal, public, and free. No API keys required except Mapbox (free tier).

### 1. EPA ECHO — Industrial Discharge Permits

**What:** NPDES permit data for every facility that discharges to US waterways. Includes facility name, location, SIC/NAICS codes, permitted discharge volumes, and DMR (Discharge Monitoring Report) data.

**URL:** https://echo.epa.gov/tools/data-downloads

**Specific downloads:**
- NPDES facility data: `ECHO_EXPORTER.csv` (all facilities with permits)
- PFAS-specific: https://echo.epa.gov/trends/pfas-tools → "PFAS Analytic Tools" download includes facilities in PFAS-handling industry sectors
- DMR discharge data: https://echo.epa.gov/tools/data-downloads/icis-npdes-discharge-points-download-summary

**API:** REST API at https://echo.epa.gov/tools/web-services — query by lat/lng bounding box, SIC code, or state.

**Hackathon download plan:** Pre-download the ECHO_EXPORTER national file (~500MB CSV). Filter to PFAS-handling SIC codes (listed in EPA's PFAS Handling Industry Sectors XLSX). This gives ~15,000 facilities with locations and discharge data.

### 2. NHDPlus V2 — River Network and Hydrology

**What:** The complete US river/stream network with flow volumes, velocities, stream order, catchment boundaries, and upstream/downstream connectivity. This is the spatial backbone.

**URL:** https://www.epa.gov/waterdata/get-nhdplus-national-hydrography-dataset-plus-data

**Specific data:**
- NHDPlus V2 flowlines with Value Added Attributes (VAAs): flow rate, velocity, stream order, catchment area
- EROM (Enhanced Runoff Method) table: mean annual flow and velocity for every flowline
- Catchment attributes: upstream drainage area, land use summaries
- Network connectivity: upstream/downstream COMID linkages for tracing contamination flow

**API:** NLDI (Network-Linked Data Index) at https://waterdata.usgs.gov/blog/nldi-intro/ — RESTful API for network navigation. Given a point, snap to nearest flowline and navigate upstream/downstream.

**Hackathon download plan:** Pre-download NHDPlus V2 national seamless geodatabase (~8GB). Extract the flowline shapefile and VAA table. For the demo, we can also use the NLDI API for real-time queries.

### 3. Water Quality Portal — Measured PFAS Concentrations (Training Labels)

**What:** Aggregated water quality monitoring data from USGS, EPA, and state agencies. This is where the measured PFAS concentrations come from — our training labels.

**URL:** https://www.waterqualitydata.us/

**Query:** Characteristic name contains "Perfluoro" or "PFAS" → returns all PFAS water measurements with location, date, concentration, and lab method.

**API:** REST API supports bulk download by state, HUC, date range, and characteristic name.

**Hackathon download plan:** Query all PFAS results nationally. Expected: 5,000–15,000 sample records. Join to NHDPlus by snapping sample coordinates to nearest flowline COMID.

### 4. UCMR 5 — Drinking Water PFAS Data

**What:** EPA's Unregulated Contaminant Monitoring Rule, 5th cycle. PFAS measurements from ~10,000 public water systems, 2023–2025. The largest systematic PFAS dataset in the US.

**URL:** https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule

**Hackathon download plan:** Download the UCMR 5 occurrence data CSV. Join to NHDPlus by water system location coordinates. Use as additional training labels for XGBoost.

### 5. NLCD 2021 — Land Use / Land Cover

**What:** 30-meter resolution land use classification for the entire US. Provides upstream land use features (% urban, % agriculture, % impervious).

**URL:** https://www.mrlc.gov/data

**Hackathon download plan:** Pre-compute land use percentages per NHDPlus catchment using the NHDPlus catchment zonal statistics (available pre-computed in NHDPlus V2 NLCD attributes table — no GIS processing needed).

### 6. Census ACS — Demographics for EJ Overlay

**What:** American Community Survey demographic data at the census tract level. Provides median household income, racial composition, and population density.

**URL:** https://data.census.gov/ (or use `tidycensus` API)

**Hackathon download plan:** Download tract-level ACS data for median income and race for all tracts adjacent to NHDPlus flowlines. Flag tracts with median income < $35,000 and/or high minority population as potential subsistence fishing communities.

### 7. FishBase — Species Data

**What:** Comprehensive database of fish biology. Provides trophic levels, lipid content, diet composition, body mass, and geographic range for every freshwater species.

**URL:** https://www.fishbase.org + R package `rfishbase` or Python scraping

**Hackathon download plan:** Pre-extract trophic level, lipid %, body mass, and diet data for the 8 target species. This is a 30-minute manual data entry task from FishBase web pages.

### 8. Mapbox — Base Map Tiles

**What:** Dark-themed vector map tiles for the visualization.

**URL:** https://www.mapbox.com/ — free tier allows 50,000 map loads/month (more than enough for hackathon + demo)

**API key:** Sign up for free account, get token. Set as environment variable.

---

## The Visualization: What the Judges See

The visualization is a full-screen interactive map of the United States. It tells a story in three clicks: (1) see the national risk landscape, (2) zoom into any watershed and see species-level contamination, (3) see the environmental justice disparity between recreational and subsistence fishers.

---

### Screen 1: National Overview Map (Full Screen)

**Base map:** Mapbox dark theme (`mapbox://styles/mapbox/dark-v11`). The dark background makes data layers pop. Initial view: continental US (lat 39.8, lng -98.6, zoom 4).

**HUC-8 watershed choropleth:** ~2,600 HUC-8 polygons, each colored by the maximum predicted fish tissue PFAS concentration in that watershed:

- **Blue-green (#22d3ee, 15% opacity):** All species predicted safe (<5 ng/g). Most of the map is this color.
- **Amber (#f59e0b, 30% opacity):** Some species limited (5–50 ng/g). Visible hotspots around industrial corridors.
- **Red (#ef4444, 45% opacity):** Some species unsafe (>50 ng/g). Concentrated around known PFAS sources — Cape Fear NC, Great Lakes, Delaware River, etc.

**Facility markers:** Small pulsing dots at every known PFAS-handling facility from EPA ECHO. White dots with CSS pulse animation (concentric rings expanding and fading). On hover, show facility name and PFAS industry sector.

**EJ overlay toggle:** Toggle in the header bar. When activated, overlays census tracts with median income < $35,000 in purple tint (rgba(139, 92, 246, 0.15)). The visual correlation between red contamination zones and purple EJ zones IS the story.

**Click interaction:** Clicking any HUC-8 polygon zooms to that watershed and loads the segment-level detail view.

---

### Screen 2: Watershed Detail View (Zoomed In)

After clicking a HUC-8, the map zooms to show individual NHDPlus stream segments within that watershed.

**River network layer:** GeoJSON LineString features for each stream segment, styled by predicted contamination:

- **Color:** Continuous gradient by predicted water PFAS concentration. Blue-green (#22d3ee) → amber (#f59e0b) → red (#ef4444). Mapbox `interpolate` expression on `water_pfas_ng_l` property.
- **Width:** 2px (clean headwaters) → 6px (contaminated segments). Scaled by contamination level.
- **Glow effect:** Each line drawn twice — once as the colored line, once as a wider (3×), more transparent version underneath with `line-blur: 4`, creating a neon glow on the dark map.

**Hover tooltip (appears on river segment hover):**

```
┌─────────────────────────────────────────────┐
│                                             │
│  📍 Cape Fear River — Fayetteville Reach    │
│  Predicted Water PFAS: 120 ng/L             │
│                                             │
│  ─────────────────────────────────────      │
│                                             │
│  🔴 Largemouth Bass    48.3 ng/g            │
│     ⚠ Max 1 serving/month                  │
│                                             │
│  🔴 Striped Bass       38.9 ng/g            │
│     ⚠ Max 1 serving/month                  │
│                                             │
│  🟡 Channel Catfish    14.7 ng/g            │
│     ⚠ Max 3 servings/month                 │
│                                             │
│  🟢 Bluegill            3.1 ng/g            │
│     ✓ Safe for regular consumption          │
│                                             │
│  ─────────────────────────────────────      │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ ⚠ EJ ALERT: Subsistence fishers     │   │
│  │ face 8.4× the exposure of           │   │
│  │ recreational anglers at this site    │   │
│  └──────────────────────────────────────┘   │
│                                             │
│                         [See Full Report →] │
└─────────────────────────────────────────────┘
```

**Tooltip design specs:**
- Dark glassmorphism card: rgba(15, 15, 25, 0.92), backdrop-filter: blur(12px), 1px border rgba(255,255,255,0.08), border-radius: 12px
- Species sorted worst-first (highest tissue concentration at top)
- Safety dots: 8px CSS circles — red (#ef4444) for >20 ng/g, amber (#eab308) for 5–20 ng/g, green (#22c55e) for <5 ng/g
- EJ alert box: only appears when segment overlaps low-income census tract. Purple tint background (rgba(139, 92, 246, 0.15)) with left border accent (3px solid #8b5cf6)
- Fixed width 360px, fade-in 150ms CSS transition

---

### Screen 3: Species Detail Panel (Click "See Full Report")

Clicking opens a slide-in panel from the right (420px wide, full viewport height):

**Section A — Verdict:**
- Species name: 22px bold white
- Big tissue concentration: 48px bold font, colored by safety status
- EPA reference comparison: "2.4× over EPA threshold" in red badge
- Safe servings recommendation

**Section B — "Why Is This Fish Contaminated?" (Feature Attribution):**
- Horizontal bar chart of XGBoost feature importance for this prediction
- 5 bars sorted by contribution %, color-coded by category:
  - Source factors (discharge facilities): orange (#f97316)
  - Ecological factors (trophic level): blue (#3b82f6)
  - Environmental factors (temperature, pH): teal (#14b8a6)
  - Biological factors (lipid content): purple (#a855f7)
  - Hydrologic factors (flow, dilution): gray (#6b7280)

**Section C — "Contamination Pathway" (Vertical Flow Diagram):**
A simple SVG showing 4 connected nodes:
1. **[Factory Name]** → discharge concentration (ppt)
2. **[River Water]** → predicted water concentration (ng/L) — annotated with "÷X dilution"
3. **[Fish Tissue]** → predicted tissue concentration (ng/g) — annotated with "×Y bioaccumulation"
4. **[Human Dose]** → dose at given consumption rate (ng/kg/day)

Lines get thicker at each step. Node colors grade from green → amber → red. This is a custom SVG with 4 `<rect>` and 3 `<path>` elements — not a charting library.

**Section D — "Who Is At Risk?" (The Core Disparity):**
Two horizontal bars showing hazard quotient:
1. **Recreational angler** (17 g/day): bar extends to show HQ (e.g., 0.8 — green, within safe zone)
2. **Subsistence fisher** (142.4 g/day): bar extends past the EPA limit line (e.g., 6.7 — red, far into danger)

A vertical dashed line marks HQ = 1.0, labeled "EPA Safety Threshold."

The subsistence bar visually overshooting the line is the **punchline** of the entire project. It makes the environmental justice disparity impossible to miss.

Below the bars: "Subsistence fishers face **8.4× the exposure** of recreational anglers. In this community (median income $31,200), an estimated 18.5% of households rely on locally caught fish as a primary protein source."

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| XGBoost model | Python 3.10+, xgboost, scikit-learn, pandas, numpy | Industry standard for tabular ML, GPU support, built-in feature importance |
| Bioaccumulation model | Python, numpy | Pure arithmetic — published equations, no libraries needed beyond numpy |
| Data pipeline | Python, requests, geopandas, shapely | Download, join, and process federal datasets |
| Visualization | React (Vite), Mapbox GL JS (react-map-gl), D3.js, Tailwind CSS | Best-in-class web mapping, smooth interactions, dark theme support |
| Backend API | FastAPI (Python) | Serves precomputed results + handles real-time segment queries during demo |
| ASUS compute | CUDA, xgboost gpu_hist, batch inference | GPU-accelerated training and national-scale inference |

---

## ASUS Hardware Integration

The ASUS supercomputer serves three specific purposes, each demonstrated live:

### 1. National-Scale XGBoost Training + Inference (Compute-Critical)

**Training:** 5,000–8,000 labeled segments × 29 features × 250 trees. On ASUS GPU with `tree_method='gpu_hist'`: **<2 minutes**. On laptop CPU: 10–15 minutes. The GPU acceleration means we can iterate on features and hyperparameters during the hackathon.

**Inference:** Run the trained model on all ~90,000 NHDPlus segments to produce a national contamination prediction map. On ASUS GPU: **<30 seconds** for inference + Stage 2 bioaccumulation calculations for 8 species × 6 congeners × 90,000 segments = 4.3 million tissue predictions. On laptop CPU: 15–30 minutes.

**Demo impact:** A judge picks any county in America → the system returns results instantly because everything is precomputed on the ASUS. Without the ASUS, we'd need to batch-process overnight and could only demo pre-selected locations.

### 2. On-Premises Data Sovereignty

State environmental agencies handle pre-enforcement PFAS data that is legally privileged. Tribal nations have data sovereignty requirements under federal Indian law — environmental data collected on tribal lands cannot be uploaded to cloud servers without tribal consent.

The ASUS hardware demonstrates that the entire TrophicTrace pipeline — data ingestion, model training, inference, visualization — runs on a single on-premises machine. Demo line: **"This model was trained and run entirely on this ASUS [GPU model]. No data left this machine. That's not a limitation — it's a feature for every tribal nation and state agency that needs to keep their environmental data sovereign."**

### 3. Real-Time Interactive Query During Demo

When a judge asks "What about the river near my hometown?" the system can compute a fresh prediction in real time because the ASUS GPU handles the full pipeline (XGBoost inference + bioaccumulation math + exposure calculation) in <1 second per watershed. On a laptop CPU, this would take 5–10 seconds — enough lag to kill demo momentum.

---

## Work Breakdown: 4 Tracks, 16 Hours

All 4 team members are writing code for 14+ hours. Slides are assembled from screenshots in the final 90 minutes.

---

### TRACK A: XGBoost Model + ASUS Pipeline

**Owner:** Strongest ML/Python person
**Tools:** Python 3.10+, xgboost, scikit-learn, pandas, numpy, geopandas

#### A1: Feature Engineering Pipeline (Hours 0–5)

Build `feature_engineering.py`:

1. Load pre-downloaded EPA ECHO facility CSV. Filter to PFAS-handling SIC codes.
2. Load NHDPlus flowline shapefile + VAA table.
3. For each NHDPlus segment, compute all 29 features:
   - Snap ECHO facilities to nearest upstream segments using NHDPlus network topology
   - Count upstream PFAS facilities, compute distances
   - Extract flow rate, velocity, stream order from VAA table
   - Extract land use percentages from NHDPlus NLCD attributes
   - Join Water Quality Portal chemistry data (pH, temp, DOC) by nearest segment
4. Output: `features_national.parquet` — 90,000 rows × 29 columns

**Deliverable:** `feature_engineering.py`, `features_national.parquet`

#### A2: Training Label Assembly (Hours 3–6, overlaps with A1)

Build `labels.py`:

1. Download PFAS measurements from Water Quality Portal API (characteristic name contains "Perfluoro")
2. Download UCMR 5 occurrence data CSV
3. Snap all sample locations to nearest NHDPlus COMID
4. Aggregate: for each COMID with measurements, compute max total PFAS concentration
5. Join to features table
6. Output: `training_data.parquet` — ~5,000 rows with features + labels

**Deliverable:** `labels.py`, `training_data.parquet`

#### A3: XGBoost Training on ASUS (Hours 6–9)

Build `train_xgboost.py`:

1. Load `training_data.parquet`
2. 5-fold cross-validation with hyperparameter tuning
3. Train final model on full dataset
4. Extract feature importance (gain-based and SHAP if time permits)
5. Save model checkpoint + training metrics + feature importance plot

ASUS execution:
- SSH into ASUS, set up conda environment
- `python train_xgboost.py --device cuda --n_estimators 250`
- Record training time, hardware specs

**Deliverable:** `model.json` (XGBoost checkpoint), `training_metrics.json`, `feature_importance.png`

#### A4: National Inference + Bioaccumulation (Hours 9–13)

Build `inference.py`:

1. Load trained model + `features_national.parquet`
2. Predict water PFAS concentration for all 90,000 segments
3. Run Stage 2 bioaccumulation model for 8 species × 6 congeners per segment
4. Run Stage 3 exposure calculation for recreational + subsistence profiles
5. Compute safety status and safe servings/month for each species at each segment
6. Output: `national_results.json` matching the visualization data schema

**Deliverable:** `inference.py`, `national_results.json`

---

### TRACK B: Interactive Map Visualization

**Owner:** Strongest React/frontend person
**Tools:** React (Vite), Mapbox GL JS / react-map-gl, D3.js, Tailwind CSS

#### B1: Project Setup + Dark Map + National Choropleth (Hours 0–4)

1. `npm create vite@latest trophictrace-viz -- --template react`
2. `npm install mapbox-gl react-map-gl d3 tailwindcss @tailwindcss/vite`
3. Render dark Mapbox map centered on continental US
4. Load pre-prepared HUC-8 boundary GeoJSON (available from USGS WBD download)
5. Style HUC-8 polygons as choropleth by contamination level (from mock data initially)
6. Add facility markers with pulse animation
7. Add title bar: "TrophicTrace — PFAS Fish Contamination Risk Map" + EJ overlay toggle

**Deliverable:** React app with national choropleth map + facility markers

#### B2: Watershed Zoom + River Segments + Heatmap (Hours 4–8)

1. Implement click-to-zoom on HUC-8 polygons
2. On zoom, load NHDPlus flowline GeoJSON for that watershed
3. Style river segments: color by predicted PFAS, width by contamination, glow effect
4. Add heatmap layer around segments (radial gradient by max tissue concentration)
5. Smooth zoom transition animation

**Deliverable:** Zoomable map with river segment rendering

#### B3: Hover Tooltips (Hours 8–12)

1. Mapbox `mousemove` listener on river segments
2. Render tooltip component with species list, safety dots, advisory text
3. Conditional EJ alert box when hovering near low-income census tracts
4. 150ms fade transition, viewport-aware positioning
5. "See Full Report" click handler → sets React state for detail panel

**Deliverable:** Fully working hover tooltips

#### B4: Polish + Real Data Integration (Hours 13–16)

1. Swap mock data for `national_results.json` from Track A
2. Fix any rendering issues with real data ranges
3. Implement EJ overlay toggle (census tract polygons)
4. Add map legend (bottom-left)
5. Final CSS polish, transitions, responsive behavior
6. Test full interaction flow end-to-end

**Deliverable:** Polished, data-connected visualization

---

### TRACK C: Detail Panel + Interpretability Views

**Owner:** Second frontend person
**Tools:** React, D3.js (minimal), Tailwind CSS, custom SVG

#### C1: Panel Scaffold + Verdict Section (Hours 0–3)

Build `<DetailPanel>` as standalone component:
- 420px slide-in panel, dark background, close button
- Big tissue concentration number (48px, color-coded)
- EPA threshold comparison badge
- Safe servings recommendation

#### C2: Feature Attribution Bar Chart (Hours 3–6)

- "Why Is This Fish Contaminated?" section
- 5 horizontal bars sorted by importance, color-coded by factor type
- Pure CSS implementation (flexbox width percentages)

#### C3: Contamination Pathway SVG (Hours 6–9)

- Vertical flow diagram: Factory → River Water → Fish Tissue → Human Dose
- Custom SVG: 4 `<rect>` nodes + 3 `<path>` connections
- Annotations for dilution factor and bioaccumulation factor
- Line width increases at each step

#### C4: Exposure Disparity Chart (Hours 9–12)

- "Who Is At Risk?" section
- Two horizontal bars: recreational vs. subsistence HQ
- Vertical dashed line at HQ = 1.0 (EPA threshold)
- Community-specific demographic callout text

#### C5: Integration with Track B (Hours 12–15)

- Merge into Track B's React app
- Wire "See Full Report" click → panel state
- Add dark scrim overlay when panel is open
- Test full flow: hover → tooltip → click → panel → close

---

### TRACK D: Data Pipeline + Integration + Demo Prep

**Owner:** Full-stack / data person
**Tools:** Python, requests, geopandas, GeoJSON, Flask/FastAPI

#### D1: Download + Preprocess Federal Datasets (Hours 0–4)

This is the foundation — everything else depends on this data.

1. Download EPA ECHO NPDES facility data → filter to PFAS-handling sectors → `facilities.csv`
2. Download NHDPlus V2 national flowlines + VAA table → `flowlines.shp`, `vaa.csv`
3. Download HUC-8 boundary GeoJSON from USGS WBD → `huc8_boundaries.geojson`
4. Download Water Quality Portal PFAS data → `wqp_pfas.csv`
5. Download Census ACS tract-level income + race data → `demographics.csv`
6. Pre-extract FishBase data for 8 target species → `species.json`

**Deliverable:** All raw data files, download scripts

#### D2: Mock Data + GeoJSON for Track B (Hours 3–6)

Build `generate_mock_data.py`:
1. Create realistic `mock_results.json` following the exact visualization data schema
2. Populate 3 sample watersheds (Cape Fear NC, Huron MI, Delaware NJ) with mock segment data
3. Include mock species predictions, facility attributions, and demographic data
4. Generate simplified HUC-8 GeoJSON for the 3 sample watersheds

Hand off to Track B by hour 5 so they can build against real data shapes.

**Deliverable:** `mock_results.json`, sample GeoJSON files

#### D3: Backend API (Hours 6–10)

Build FastAPI server:
1. `GET /api/national` → returns HUC-8 level summary (choropleth data)
2. `GET /api/watershed/{huc8}` → returns segment-level data for one watershed
3. `GET /api/segment/{comid}` → returns species detail for one segment
4. Serves precomputed results from `national_results.json`
5. Static file serving for the React build

#### D4: Integration + Demo (Hours 10–16)

1. When Track A delivers `national_results.json`, validate all fields
2. Help Track B swap mock data for real data
3. Help Track C integrate detail panel
4. Test full end-to-end pipeline
5. Build 5–7 slides from screenshots (hours 14–15)
6. Architecture diagram in Excalidraw (30 min)
7. Record backup demo video (hour 15)
8. Demo rehearsal (hour 15.5)

---

## Delivery Schedule

| Hour | Track A (ML) | Track B (Map) | Track C (Panel) | Track D (Data/Integration) |
|------|-------------|---------------|-----------------|---------------------------|
| 0–3 | A1: Feature engineering | B1: Project setup + dark map | C1: Panel scaffold + verdict | D1: Download federal datasets |
| 3–6 | A1/A2: Finish features + labels | B1/B2: National choropleth + zoom | C2: Feature attribution chart | D1/D2: Finish downloads + mock data → B |
| 6–9 | A3: XGBoost training on ASUS | B2: River segments + heatmap | C3: Pathway SVG | D3: Backend API |
| 9–12 | A4: National inference + bioaccum | B3: Hover tooltips | C4: Exposure disparity chart | D3: Finish API + start integration |
| 12–14 | A4: Deliver `national_results.json` | B3/B4: Polish tooltips + data swap | C5: Integrate panel into Track B | D4: Validate + help integrate |
| 14–16 | Help debug + iterate | B4: Final visual polish | C5: Fix integration issues | D4: Slides, backup video, rehearsal |

---

## Risk Mitigations

| Risk | Probability | Mitigation |
|------|------------|-----------|
| Not enough labeled PFAS water data for XGBoost | Low | UCMR 5 alone has ~10,000 water systems. Combined with WQP, we'll have 3,000–8,000+ labeled segments. If still insufficient, augment with state-published datasets (NC, MI, MN). |
| XGBoost overfits on sparse data | Medium | Built-in: L1/L2 regularization, subsample=0.8, max_depth=3. Cross-validate rigorously. Worst case: model is a useful screening tool even with moderate accuracy. |
| NHDPlus download/processing takes too long | Medium | Pre-download before hackathon starts. National seamless geodatabase is ~8GB. Have a USB drive backup. |
| ASUS setup / CUDA issues | Medium | Test ASUS environment day before. Fallback: CPU training (<15 min for XGBoost). CPU inference for national scale: <5 min. Demo still works. |
| Mapbox token issues or API limits | Low | Free tier = 50K loads/month. Fallback: Leaflet + OpenStreetMap tiles (no token, slightly less pretty). |
| Bioaccumulation model produces unrealistic values | Low | Equations are published and well-validated. Sanity check: predicted tissue concentrations should be 100–10,000× water concentrations for PFOS, 10–500× for PFOA. Flag and clamp outliers. |
| Data format mismatch between Track A and Track B at integration | Medium | JSON schema defined below is the contract. Track D validates before handoff. Mock data uses same schema from hour 4. |
| Demo crashes during judging | Low | Backup video recorded by hour 15. Static screenshot fallback slides. |
| Judges ask about a location we don't have data for | Low | National-scale inference means we have predictions for every NHDPlus segment. If a specific segment has low-confidence prediction, the UI shows a confidence indicator. |

---

## Data Contract: JSON Schema

Track A produces this. Track B/C consume it. Track D validates it.

```json
{
  "metadata": {
    "model_version": "trophictrace-xgb-v1",
    "training_samples": 5000,
    "cv_r_squared": 0.74,
    "inference_device": "ASUS [GPU model]",
    "inference_timestamp": "2026-03-29T14:00:00Z",
    "total_segments_scored": 90000,
    "species_modeled": 8,
    "congeners_modeled": 6
  },
  "huc8_summary": [
    {
      "huc8": "03030004",
      "name": "Cape Fear River",
      "state": "NC",
      "max_tissue_ng_g": 48.3,
      "max_water_pfas_ng_l": 120.5,
      "risk_level": "high",
      "n_unsafe_species": 3,
      "n_pfas_facilities": 5,
      "centroid_lat": 35.05,
      "centroid_lng": -78.88
    }
  ],
  "segments": [
    {
      "comid": 8893864,
      "huc8": "03030004",
      "name": "Cape Fear River — Fayetteville Reach",
      "lat": 35.0527,
      "lng": -78.8784,
      "predicted_water_pfas_ng_l": 120.5,
      "prediction_confidence": 0.82,
      "flow_rate_m3s": 45.2,
      "top_contributing_features": [
        {"feature": "nearest_pfas_facility_km", "importance": 0.31},
        {"feature": "upstream_npdes_pfas_count", "importance": 0.22},
        {"feature": "low_flow_7q10_m3s", "importance": 0.14},
        {"feature": "pct_urban", "importance": 0.09},
        {"feature": "dissolved_organic_carbon_mgl", "importance": 0.08}
      ],
      "species": [
        {
          "common_name": "Largemouth Bass",
          "scientific_name": "Micropterus salmoides",
          "trophic_level": 4.2,
          "lipid_content_pct": 5.8,
          "tissue_pfos_ng_g": 42.1,
          "tissue_pfoa_ng_g": 3.8,
          "tissue_total_pfas_ng_g": 48.3,
          "hazard_quotient_recreational": 0.8,
          "hazard_quotient_subsistence": 6.7,
          "safe_servings_per_month_recreational": 4,
          "safe_servings_per_month_subsistence": 0,
          "safety_status_recreational": "limited",
          "safety_status_subsistence": "unsafe",
          "pathway": {
            "source_facility": "Chemours Fayetteville Works",
            "discharge_ng_l": 450,
            "dilution_factor": 3.7,
            "water_concentration_ng_l": 120.5,
            "bcf_applied": 4495,
            "tmf_applied": 5.1,
            "tissue_concentration_ng_g": 48.3
          }
        }
      ],
      "demographics": {
        "nearest_tract_name": "Fayetteville Southeast",
        "median_income": 31200,
        "subsistence_fishing_estimated_pct": 18.5,
        "exposure_multiplier_vs_recreational": 8.4
      }
    }
  ],
  "facilities": [
    {
      "facility_id": "NCR000059",
      "name": "Chemours Fayetteville Works",
      "lat": 34.9884,
      "lng": -78.8375,
      "sic_code": "2869",
      "npdes_permit": "NC0089915",
      "pfas_sector": true,
      "estimated_pfas_discharge_ng_l": 450
    }
  ],
  "geojson_segments": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "comid": 8893864,
          "water_pfas_ng_l": 120.5,
          "max_tissue_ng_g": 48.3,
          "risk_level": "high"
        },
        "geometry": {
          "type": "LineString",
          "coordinates": [[-78.90, 35.06], [-78.88, 35.05], [-78.85, 35.04]]
        }
      }
    ]
  },
  "geojson_huc8": {
    "type": "FeatureCollection",
    "features": []
  }
}
```

---

## Responding to Judge Questions

**"How do you know your water predictions are accurate?"**
We validate with 5-fold cross-validation on 5,000+ real PFAS measurements from EPA UCMR 5 and the Water Quality Portal. We report R², RMSE, and the % of predictions within a factor of 3. Published work using the same approach (XGBoost on environmental features) achieved AUROC 73–100% for PFAS prediction in groundwater (Paulson et al., *Science*, 2024).

**"How do you know the bioaccumulation model works?"**
We use published equations from Gobas (1993) and Kelly et al. (2024). Sun et al. (2022) validated that this model framework reproduces observed fish tissue concentrations within a factor of 2 for >80% of species for long-chain PFAS. We use published BCF/BAF values from Burkhard (2021), the largest compilation of PFAS bioaccumulation data (67 measurements for PFOS alone). These are not our numbers — they're the scientific consensus.

**"Why not just test the fish directly?"**
Fish tissue sampling costs $500–2,000 per sample. A single watershed survey costs $50K–200K. The US has ~2,600 HUC-8 watersheds — most have never been sampled for PFAS in fish. TrophicTrace is a screening tool that identifies the highest-risk watersheds so agencies can target their limited sampling budgets. It doesn't replace testing — it tells you where to test first.

**"Why do subsistence fishers face higher risk?"**
It's pure math. The EPA's general-population fish consumption rate is 22 g/day. The subsistence fisher rate is 142.4 g/day — 6.5× higher. The hazard quotient scales linearly with consumption rate. At the same tissue concentration, a person eating 6.5× more fish gets 6.5× the PFAS dose. When a state sets an advisory assuming recreational consumption, it systematically undercounts the risk to the communities eating the most fish.

**"Why do you need the ASUS hardware?"**
Three reasons: (1) Running XGBoost inference + bioaccumulation calculations for 90,000 segments × 8 species × 6 congeners = 4.3 million predictions takes <30 seconds on GPU vs. 15–30 minutes on CPU — fast enough for real-time demo interaction. (2) Tribal nations need on-premises compute for data sovereignty. (3) State agencies handling pre-enforcement PFAS data need secure local processing. The ASUS proves the full pipeline runs without any cloud dependency.

**"Who would actually use this?"**
State fish advisory programs (50 states), environmental litigation firms ($30B+ in active PFAS cases), tribal environmental offices (574 federally recognized tribes), EPA regional offices, and ATSDR public health assessments. The EPA's 2024 PFAS Strategic Roadmap and ATSDR's 2024 fish guidance both identify computational screening tools as a critical need that doesn't currently exist.

---

## References

1. Barbo, N., et al. "Locally caught freshwater fish across the United States are likely a significant source of exposure to PFOS and other perfluorinated compounds." *Environmental Research*, 2023, 220, 115165. (EWG study: 1 fish serving = 1 month PFAS water exposure)
2. Sun, J.M., et al. "A food web bioaccumulation model for the accumulation of per- and polyfluoroalkyl substances (PFAS) in fish: how important is renal elimination?" *Environmental Science: Processes & Impacts*, 2022, 24, 1152–1164. (Model accuracy: within factor of 2 for >80% of species)
3. Kelly, B.C., Sun, J.M., McDougall, M.R.R., Sunderland, E.M. & Gobas, F.A.P.C. "Development and Evaluation of Aquatic and Terrestrial Food Web Bioaccumulation Models for Per- and Polyfluoroalkyl Substances." *Environmental Science & Technology*, 2024, 58(40), 17828–17837.
4. Burkhard, L.P. "Evaluation of Published Bioconcentration Factor (BCF) and Bioaccumulation Factor (BAF) Data for Per- and Polyfluoroalkyl Substances Across Aquatic Species." *Environmental Toxicology and Chemistry*, 2021, 40(6), 1530–1543.
5. Paulson, K.D., et al. "Predictions of groundwater PFAS occurrence at drinking water supply depths in the United States." *Science*, 2024.
6. Gobas, F.A.P.C. "A model for predicting the bioaccumulation of hydrophobic organic chemicals in aquatic food-webs: application to Lake Ontario." *Ecological Modelling*, 1993, 69, 1–17.
7. EPA. "Estimated Fish Consumption Rates for the U.S. Population and Selected Subpopulations." 2014.
8. EPA. "Per- and Polyfluoroalkyl Substances (PFAS) National Primary Drinking Water Regulation." Federal Register, April 2024.
9. Systemiq. "Invisible Ingredients: The Hidden Toxic Chemicals in Our Food System." 2025.
10. ATSDR. "Guidance for Assessment of Per- and Polyfluoroalkyl Substances (PFAS) in Fish." 2024.
