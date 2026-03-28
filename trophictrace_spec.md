# TrophicTrace — Neural PFAS Bioaccumulation Prediction & Fish Safety Advisory System

## Abstract

PFAS ("forever chemicals") contaminate the drinking water of over 100 million Americans, but the far more dangerous and understudied threat is **food-web bioaccumulation**: PFAS discharged into waterways concentrate up the food chain by 1,000–10,000x, meaning water deemed "safe" produces dangerous tissue-level exposures in fish consumed by humans. A 2023 EWG study found that eating **a single serving of freshwater fish** delivers PFAS exposure equivalent to drinking contaminated water for an entire month. The EPA's 2024 drinking water regulation explicitly states that PFAS regulation will "prevent thousands of deaths," yet fish consumption advisories remain state-level, years out of date, and blind to the environmental justice communities (subsistence fishers — disproportionately low-income, Indigenous, and Black populations) who face 3–5x higher exposure than recreational anglers.

**TrophicTrace** is the first system to predict PFAS contamination levels across an entire aquatic food web using a **physics-informed heterogeneous graph neural network (GNN)** trained on real environmental, ecological, and chemical data. Rather than relying on sparse, expensive field sampling, TrophicTrace learns the relationship between industrial discharge, hydrologic transport, trophic transfer, and tissue-level bioaccumulation — then generalizes to predict contamination for unsampled species, locations, and scenarios. The system produces an **interactive geographic heatmap** showing predicted fish tissue contamination across a watershed, with species-specific consumption advisories and interpretable explanations of what's driving the contamination at each point.

The entire pipeline — training, inference, and advisory generation — runs on an **ASUS supercomputer**, which is critical for two reasons: (1) training the heterogeneous GNN with physics-informed constraints is computationally intensive, requiring GPU-accelerated constrained optimization over large multi-typed graphs, and (2) state environmental agencies and tribal nations handle legally privileged pre-enforcement data and have data sovereignty requirements that prohibit uploading to external cloud servers.

**The cost of inaction is staggering.** A 2025 Systemiq report found that toxic chemicals in food systems impose up to **$3 trillion annually** in preventable health costs, while remediation runs $0.9–65 million per kilogram of PFAS removed. Prediction and prevention is the only economically viable path. TrophicTrace gives every state agency and tribal environmental office the analytical capacity that currently requires a team of environmental toxicologists — accessible through a single interactive map.

---

## Product Overview: What TrophicTrace Is

TrophicTrace is a web application with three integrated components:

### Component 1: Physics-Informed Heterogeneous GNN (The AI Core)

**What it does:** Takes structured data about a watershed (industrial discharge points, river network topology, species trophic relationships, and water quality parameters) and predicts PFAS tissue concentrations for every fish species at every location in the watershed — even species and locations where no field sampling has been done.

**Why a GNN:** The data is inherently graph-structured. A watershed is a network: discharge facilities connect to river segments, river segments connect to each other via flow direction, species exist at locations and are connected by predator-prey relationships, and chemical concentrations propagate through all of these connections simultaneously. A GNN is the natural architecture for learning over this structure.

**Why physics-informed:** Pure data-driven learning would require massive labeled datasets that don't exist. Instead, we encode known environmental chemistry as inductive biases in the loss function:

- **Mass conservation:** PFAS mass must be conserved at river confluences (what flows in must flow out, minus sediment deposition)
- **Trophic monotonicity:** For bioaccumulative PFAS congeners, concentrations must increase at higher trophic levels (predators accumulate more than prey)
- **BCF bounds:** Bioconcentration factors are bounded by the chemical's octanol-water partition coefficient (a known physical property)

These constraints let the model generalize from sparse training data because the physics dramatically reduces the hypothesis space.

**Architecture specifics:**

- **Node types (4):** Facility nodes (discharge volume, congener profile), waterbody segment nodes (flow rate, pH, temperature, dissolved organic carbon), species-at-location nodes (trophic level, lipid content, body mass, metabolic rate), and population-group nodes (consumption rate vectors by species)
- **Edge types (5):** Facility→waterbody (discharge), waterbody→waterbody (downstream flow), waterbody→species (habitat/exposure), species→species (trophic/predation), species→population (consumption)
- **Message passing:** 3–4 layers of typed message passing where each edge type has its own learned message function (small MLP). Node embeddings are updated by aggregating incoming messages from all edge types.
- **Output:** Each species-at-location node outputs a predicted PFAS tissue concentration (regression target, continuous value in ng/g).
- **Loss:** MSE on observed tissue concentrations + weighted physics constraint penalties (mass balance violation, monotonicity violation, BCF bound violation). The physics terms are soft constraints added to the loss, not hard constraints — they regularize the model without requiring perfect physical compliance.

**Training data (synthetic for hackathon, designed to match real-world structure):**

We generate synthetic training data for 5–10 watershed graphs, each with:

- 3–8 discharge facilities with randomized congener profiles
- 20–50 river segments with realistic flow topology (directed acyclic graph from headwaters to outlet)
- 8–15 fish species placed at segments with trophic relationships
- Synthetic PFAS concentrations generated by running a forward simulation (discharge → dilution → bioconcentration → biomagnification) with added noise, so the GNN has realistic targets to learn against

The forward simulation that generates training labels uses published BCF/BMF ranges from EPA ECOTOX, so the synthetic data is grounded in real chemistry even though the watersheds themselves are generated.

**Why ASUS is required:** Training involves backpropagating through multi-layer message passing on graphs with O(10³–10⁴) nodes and O(10⁴) edges, with physics-informed loss terms that require computing constraint violations across the full graph at each step. The constrained optimization (projected gradient steps to enforce physical bounds) is computationally expensive and benefits directly from GPU acceleration. We train for 200–500 epochs across multiple synthetic watersheds. This is infeasible on a laptop in hackathon timeframes but fast on ASUS GPUs.

**Tools needed:**

- Python 3.10+
- PyTorch + PyTorch Geometric (heterogeneous graph support)
- NumPy, SciPy
- NetworkX (graph construction utilities)
- CUDA toolkit (for GPU training on ASUS)
- Matplotlib (training diagnostics)

---

### Component 2: Interactive Geographic Heatmap (The Visualization)

**What it does:** A full-screen, interactive 2D map of the target watershed showing:

1. **Base map** of the watershed with river network overlaid
2. **Heatmap layer** showing predicted fish tissue PFAS concentrations across the watershed, color-coded from green (safe) → yellow (caution) → red (do not consume). The heatmap is spatially interpolated from the GNN's per-segment predictions.
3. **Hover interaction:** Hovering over any point on the map shows a tooltip with:
   - Location name / river segment
   - List of fish species present at that location
   - For each species: predicted tissue concentration, safety status (safe / limited / unsafe), and recommended maximum monthly servings
4. **"More Details" panel:** Clicking "More Details" on any species opens an interpretability panel that shows the **top contributing factors** driving the contamination prediction at that point. This uses GNN attention weights / gradient-based feature attribution to identify which upstream discharge facilities, which trophic pathways, and which environmental factors (temperature, pH, flow rate) most influence the prediction.
5. **Environmental Justice overlay:** Toggle-able layer showing demographic data for nearby communities, highlighting subsistence fishing populations and their adjusted exposure levels.

**Design requirements:**

- Clean, modern, dark-themed map UI (think Mapbox/deck.gl aesthetic)
- Smooth hover transitions and tooltips
- Professional color ramp for heatmap (not garish — use a perceptually uniform colormap like viridis or a custom green→amber→red that's colorblind-accessible)
- The "More Details" interpretability panel should feel like an infographic: bar charts showing factor contributions, a mini Sankey showing the dominant pathway from discharge → fish, and the key numbers (discharge concentration, BCF, tissue concentration, reference dose)
- Mobile-responsive is NOT required (demo on laptop/monitor)

**Data contract with GNN team:** The visualization consumes a JSON file with this schema:

```json
{
  "watershed_name": "Cape Fear River, NC",
  "segments": [
    {
      "segment_id": "seg_001",
      "name": "Cape Fear River - Fayetteville",
      "lat": 35.0527,
      "lng": -78.8784,
      "water_pfas_concentration_ppt": 120.5,
      "species": [
        {
          "common_name": "Largemouth Bass",
          "tissue_concentration_ng_g": 48.3,
          "safe_servings_per_month": 1,
          "safety_status": "limited",
          "contributing_factors": [
            {"factor": "Chemours Fayetteville Works discharge", "contribution_pct": 62.1, "type": "source"},
            {"factor": "High trophic level (4.2)", "contribution_pct": 18.7, "type": "ecological"},
            {"factor": "Elevated water temperature (24°C)", "contribution_pct": 8.4, "type": "environmental"},
            {"factor": "High lipid content (5.8%)", "contribution_pct": 6.2, "type": "biological"},
            {"factor": "Low flow dilution factor", "contribution_pct": 4.6, "type": "hydrologic"}
          ],
          "pathway": {
            "discharge_ppt": 450,
            "water_concentration_ppt": 120.5,
            "bcf": 400,
            "tissue_concentration_ng_g": 48.3,
            "epa_reference_dose_ng_g": 20.0
          }
        }
      ]
    }
  ],
  "facilities": [
    {
      "facility_id": "fac_001",
      "name": "Chemours Fayetteville Works",
      "lat": 34.9884,
      "lng": -78.8375,
      "pfas_discharge_ppt": 450,
      "congener_profile": {"GenX": 0.65, "PFOA": 0.15, "PFOS": 0.12, "other": 0.08}
    }
  ],
  "demographics": [
    {
      "area_name": "Fayetteville Southeast",
      "lat": 35.03,
      "lng": -78.85,
      "subsistence_fisher_pct": 18.5,
      "median_income": 31200,
      "exposure_multiplier_vs_recreational": 3.2
    }
  ]
}
```

The visualization team builds against this schema from day one using hardcoded mock data. The GNN team's inference script outputs this exact JSON format. At integration time, we just swap the data file.

**Tools needed:**

- React (via Create React App or Vite)
- Mapbox GL JS or Leaflet + custom tile layers
- D3.js (for Sankey diagram in interpretability panel, heatmap interpolation)
- Tailwind CSS (styling)
- GeoJSON data for Cape Fear River watershed boundary and river network (downloadable from USGS NHDPlus)

---

### Component 3 (STRETCH GOAL): RAG-Based Fish Safety Chatbot

**What it does:** A conversational interface where users can ask natural-language questions like:

- "How much striped bass from Long Island Sound is safe to eat per week?"
- "What PFAS levels have been found in catfish in the Mississippi River?"
- "Is it safe for my 5-year-old to eat fish from Lake Michigan?"

The chatbot uses retrieval-augmented generation (RAG) over a corpus of state fish consumption advisories, EPA reference doses, and the GNN's predictions to give grounded, cited answers.

**This is a STRETCH GOAL.** Only build if the core GNN and visualization are working and integrated by hour 15. If time is short, a static "Ask about fish safety" page with 3–4 pre-canned example queries and pre-generated answers is sufficient for the demo.

**Tools needed:**

- K2V2 API (or any available LLM API)
- Simple vector store (FAISS or ChromaDB)
- A curated document corpus: 10–20 state fish advisories (PDFs, easily downloadable), EPA PFAS reference dose tables
- A simple React chat UI component

---

## Detailed Work Breakdown: 4 Parallel Tracks

The following four tracks can be executed **completely independently** for the first ~14 hours, then integrated in hours 15–19.

---

### TRACK A: GNN Model + ASUS Training Pipeline

**Owner:** 1 person (strongest ML engineer on the team)

**Deliverable:** A trained heterogeneous GNN that takes a watershed graph as input and outputs per-species-per-location PFAS tissue concentration predictions, plus a script that runs inference on the Cape Fear River demo graph and outputs the JSON consumed by the visualization.

**Hour-by-hour plan:**

**Hours 0–3: Synthetic data generation**

Build a Python script (`generate_data.py`) that creates synthetic watershed graphs:

1. Define the graph schema:
   - `FacilityNode`: attributes = [discharge_volume, congener_vector (dim=6 for 6 common PFAS), lat, lng]
   - `WaterbodyNode`: attributes = [flow_rate, pH, temperature, dissolved_organic_carbon, segment_length, lat, lng]
   - `SpeciesNode`: attributes = [trophic_level, lipid_content, body_mass, metabolic_rate, species_id_onehot]
   - `PopulationNode`: attributes = [consumption_rate_vector (per species), population_size, subsistence_flag]
   - Edge types: facility→waterbody, waterbody→waterbody, waterbody→species (habitat), species→species (predation), species→population (consumption)

2. Generate 8 synthetic watersheds:
   - Each has 3–8 facilities, 20–50 waterbody segments (random DAG topology), 8–15 species, 2–3 population groups
   - Use realistic parameter ranges from EPA data:
     - Discharge: 10–1000 ppt for different congeners
     - Flow rates: 0.1–100 m³/s
     - BCF ranges by species lipid content: 100–5000
     - BMF ranges by trophic level difference: 2–15
     - Temperatures: 5–30°C (affects BCF by ~1.5x)
   - Generate ground-truth tissue concentrations by running a **forward physical model**: propagate discharge through the river network (dilution by flow), apply BCFs at water→species edges, apply BMFs along trophic edges. Add 10–20% Gaussian noise.

3. Also generate one **Cape Fear River demo graph** with realistic topology matching the real watershed. Use real facility locations (Chemours Fayetteville Works), real species list (largemouth bass, channel catfish, bluegill, striped bass, blue crab, etc.), and published GenX concentration ranges. This graph is used for inference and the demo.

4. Save all graphs as PyTorch Geometric `HeteroData` objects.

**Hours 3–7: GNN architecture**

Build the model (`model.py`):

```python
# Pseudocode structure
class TrophicTraceGNN(torch.nn.Module):
    def __init__(self):
        # Per-node-type encoders (small MLPs, 2 layers each)
        self.facility_encoder = MLP(facility_feat_dim, hidden_dim)
        self.waterbody_encoder = MLP(waterbody_feat_dim, hidden_dim)
        self.species_encoder = MLP(species_feat_dim, hidden_dim)
        self.population_encoder = MLP(population_feat_dim, hidden_dim)

        # Heterogeneous message-passing layers (use PyG's HeteroConv)
        # Each edge type gets its own SAGEConv or GATConv
        self.conv1 = HeteroConv({
            ('facility', 'discharges_to', 'waterbody'): SAGEConv(...),
            ('waterbody', 'flows_to', 'waterbody'): SAGEConv(...),
            ('waterbody', 'habitat_of', 'species'): SAGEConv(...),
            ('species', 'eaten_by', 'species'): GATConv(...),  # attention here for interpretability
            ('species', 'consumed_by', 'population'): SAGEConv(...),
        })
        # 2-3 more conv layers
        self.conv2 = HeteroConv({...})
        self.conv3 = HeteroConv({...})

        # Prediction head: species node embedding → tissue concentration
        self.predictor = MLP(hidden_dim, 1)

    def forward(self, data):
        # Encode
        x_dict = {
            'facility': self.facility_encoder(data['facility'].x),
            'waterbody': self.waterbody_encoder(data['waterbody'].x),
            'species': self.species_encoder(data['species'].x),
            'population': self.population_encoder(data['population'].x),
        }
        # Message pass
        x_dict = self.conv1(x_dict, data.edge_index_dict)
        x_dict = {k: F.relu(v) for k, v in x_dict.items()}
        x_dict = self.conv2(x_dict, data.edge_index_dict)
        x_dict = {k: F.relu(v) for k, v in x_dict.items()}
        x_dict = self.conv3(x_dict, data.edge_index_dict)

        # Predict tissue concentration for species nodes
        predictions = self.predictor(x_dict['species']).squeeze()

        # Also return attention weights from GATConv for interpretability
        return predictions, attention_weights
```

Build the physics-informed loss (`loss.py`):

```python
def trophictrace_loss(predictions, targets, data, alpha=0.1, beta=0.1):
    # Primary: MSE on observed tissue concentrations
    mse = F.mse_loss(predictions[data.observed_mask], targets[data.observed_mask])

    # Physics penalty 1: Trophic monotonicity
    # For each predator-prey edge, predator concentration should >= prey concentration
    pred_prey_edges = data['species', 'eaten_by', 'species'].edge_index
    prey_conc = predictions[pred_prey_edges[0]]
    predator_conc = predictions[pred_prey_edges[1]]
    monotonicity_violation = F.relu(prey_conc - predator_conc).mean()

    # Physics penalty 2: BCF bounds
    # Tissue concentration / water concentration should be within [BCF_min, BCF_max]
    # (computed from species lipid content and congener properties)
    implied_bcf = predictions / (data['species'].water_concentration + 1e-8)
    bcf_violation = (F.relu(implied_bcf - data['species'].bcf_upper) +
                     F.relu(data['species'].bcf_lower - implied_bcf)).mean()

    return mse + alpha * monotonicity_violation + beta * bcf_violation
```

**Hours 7–10: Training on ASUS**

- SSH into ASUS, set up environment (conda/pip install PyTorch, PyG, CUDA)
- Transfer synthetic data
- Train for 300–500 epochs, batch over all 8 watershed graphs
- Monitor loss convergence (MSE + physics penalties should both decrease)
- Save best checkpoint
- Target: training completes in <30 minutes on ASUS GPU

**Hours 10–13: Inference + interpretability extraction**

Build `inference.py`:

1. Load trained model + Cape Fear demo graph
2. Run forward pass → get tissue concentration predictions for all species at all locations
3. Extract GATConv attention weights from species→species (trophic) edges to determine which trophic pathways dominate
4. Use gradient-based attribution: for each species-at-location prediction, compute gradient of prediction w.r.t. input features of upstream facility nodes to determine source contribution percentages
5. Compute safety thresholds: compare predicted tissue concentrations to EPA reference dose (20 ng/g for PFOS, 0.3 ng/g for GenX), compute safe servings/month based on standard body weight and serving size assumptions
6. Output the full JSON matching the visualization schema above

**Hours 13–14: Integration prep**

- Validate JSON output is correct and complete
- Test that inference runs on ASUS and outputs cleanly
- Write a one-command script: `python inference.py --checkpoint model.pt --graph cape_fear.pt --output demo_data.json`

**Key risk:** PyTorch Geometric's `HeteroConv` API. If it's buggy or unfamiliar, fall back to manually implementing message passing with vanilla PyTorch Linear layers over adjacency matrices. The math is the same, just more boilerplate.

---

### TRACK B: Interactive Visualization Frontend

**Owner:** 1 person (strongest frontend/design person)

**Deliverable:** A React web app with a full-screen interactive map showing the PFAS contamination heatmap, hover tooltips with species safety info, and a "More Details" interpretability panel.

**Hour-by-hour plan:**

**Hours 0–2: Project scaffolding + map setup**

- `npm create vite@latest trophictrace-viz -- --template react`
- Install deps: `npm install mapbox-gl react-map-gl d3 tailwindcss`
- Get Mapbox API token (free tier is fine for demo)
- Render base map centered on Cape Fear River watershed (lat: 35.05, lng: -78.88, zoom: 9)
- Add river network overlay using GeoJSON (download Cape Fear River segments from USGS NHDPlus, or trace manually as a simplified GeoJSON with 20–30 line segments)

**Hours 2–6: Heatmap layer + mock data**

- Create `mock_data.json` matching the schema above with 15–25 river segments, 5–8 species per segment, 2 facilities, 2 demographic zones
- Implement heatmap:
  - Option A (simpler): Place colored circles at each segment centroid, radius proportional to max tissue concentration, color from green→yellow→red
  - Option B (prettier): Use Mapbox's built-in heatmap layer or D3 Voronoi interpolation to create a continuous surface
  - Go with whatever looks best in ~3 hours of work
- Add facility markers (factory icon or distinct marker at discharge points)
- Add EJ overlay layer (toggle-able, shows demographic zones with opacity overlay)

**Hours 6–10: Hover tooltips + interaction**

- On hover over any segment/heatmap point:
  - Show tooltip with segment name
  - List species with traffic-light icons: 🟢 safe / 🟡 limited / 🔴 unsafe
  - Show recommended servings per month for each species
  - Show water PFAS concentration
- Tooltips should be well-designed: dark background, clean typography, clear hierarchy
- Add smooth transitions (fade in/out, slight delay to avoid flicker)

**Hours 10–14: "More Details" interpretability panel**

- Click "More Details" on any species in the tooltip → slide-in panel from the right (or modal)
- Panel contents:
  1. **Header:** Species name, location, predicted tissue concentration vs. EPA reference dose (big number display, red if over)
  2. **Contributing Factors bar chart:** Horizontal bar chart showing the top 5 factors and their contribution percentages (from `contributing_factors` in the JSON). Color-code by factor type (source=red, ecological=blue, environmental=teal, biological=purple, hydrologic=gray)
  3. **Pathway mini-Sankey:** A small, clean Sankey/flow diagram: Discharge → Water → Fish Tissue → Human Dose, with numbers at each stage. Use D3-sankey or a simple hand-drawn SVG.
  4. **Dose comparison:** A simple gauge or bar showing "Your estimated dose" vs. "EPA reference dose" — with callout if subsistence fisher exposure is Nx higher

**Hours 14–16: Polish + integration**

- Swap mock data for real GNN output JSON (should be a drop-in replacement)
- Add a header/title bar: "TrophicTrace — PFAS Fish Safety Map"
- Add a legend for the heatmap color scale
- Add a brief info panel / "About" section explaining what the viewer is seeing
- Final visual polish: shadows, transitions, responsive tooltips, loading states
- Screenshot/record demo flow for presentation

**Design inspiration to aim for:**

- Mapbox's own showcase demos (dark base map, vibrant data layers)
- ProPublica's environmental investigation interactives
- The "Toxic Waters" or "Sacrifice Zones" style of environmental data journalism

---

### TRACK C: Data Pipeline + Integration + Demo Narrative

**Owner:** 1 person

**Deliverable:** (1) The curated Cape Fear River dataset that the GNN trains/infers on, (2) the integration layer connecting GNN output → visualization, (3) the demo script and presentation materials, (4) the RAG chatbot if time permits.

**Hour-by-hour plan:**

**Hours 0–4: Cape Fear River data curation**

Research and compile the Cape Fear River demo dataset:

1. **Facilities:** Chemours Fayetteville Works (lat/lng, known GenX/PFOA/PFOS discharge levels from public EPA ECHO data and news coverage). Add 2–3 additional smaller facilities (WWTP, military base) for realism.
2. **River segments:** Map 20–30 segments of the Cape Fear River and key tributaries downstream of Chemours. Assign flow rates (from USGS gauges, or estimate). Record lat/lng for each segment centroid.
3. **Species:** List 8–12 common fish species caught in Cape Fear (from NC Wildlife Resources Commission creel surveys): largemouth bass, channel catfish, bluegill, striped bass, flathead catfish, blue crab, white perch, etc. Assign trophic levels, lipid content, and body mass from FishBase.
4. **Trophic structure:** Define who eats whom (food web adjacency) from published literature or FishBase diet data.
5. **Demographics:** Identify 3–4 census tracts near the river with demographic data (median income, racial composition, estimated subsistence fishing rates from EPA's subsistence consumption study).
6. **Published contamination data:** Find any published GenX/PFAS tissue concentration data from NC DEQ or academic studies for Cape Fear River fish — this validates our synthetic data and provides talking points.

Output: A structured dataset (CSV or JSON files) that Track A's data generation script uses to build the Cape Fear demo graph with realistic, defensible parameters.

**Hours 4–8: Supporting evidence compilation**

Compile the evidence base for the presentation:

- Key statistics for slides: EWG fish study findings, $3T annual cost figure, $60M/kg remediation cost, EPA reference doses, USGS bioaccumulation study results
- 2–3 compelling visual assets: map of known PFAS contamination sites, chart of bioaccumulation factors by trophic level, photo/map of Chemours facility
- Write the demo narrative script (what the presenter says while clicking through the visualization)
- Identify the "aha moment" for judges: the EJ finding that subsistence fishers are at 3.2x exposure only becomes visible when you model consumption patterns alongside chemistry — this is what TrophicTrace uniquely reveals

**Hours 8–12: Integration layer**

- Write a simple Flask/FastAPI server (or just a static file server) that:
  - Serves the visualization frontend
  - Serves the GNN output JSON
  - (If chatbot exists) proxies chatbot queries
- Write the integration script that takes GNN output → transforms/validates → writes the JSON the frontend expects
- Test end-to-end: GNN inference → JSON → visualization renders correctly
- Troubleshoot data format issues between Track A and Track B

**Hours 12–16: RAG chatbot (STRETCH) or presentation prep**

If core pipeline is working:

- Build simple RAG chatbot:
  - Corpus: 5–10 state fish advisories (NC, MN, MI — states with good public PFAS data), EPA reference dose tables, plus the GNN's predictions as a structured document
  - Embedding: Use any available embedding model to chunk and embed the corpus
  - Vector store: FAISS (simplest — `pip install faiss-cpu`)
  - Query: User question → retrieve top 5 relevant chunks → feed to K2V2 with system prompt: "You are a fish safety advisor. Answer based on the provided context. Always cite your sources. If the context doesn't contain enough information, say so."
  - UI: Simple chat bubble component embedded in the main app (bottom-right corner)

If time is short, skip the chatbot and focus on:
- Polishing the demo narrative
- Building 3–5 presentation slides
- Recording a backup demo video in case of technical issues

**Hours 16–19: Final integration + rehearsal**

- Merge all tracks
- Full end-to-end demo run
- Fix bugs
- Rehearse presentation (target: 5 minutes)

---

### TRACK D: Presentation, Pitch Deck, & Societal Impact Case

**Owner:** 1 person

**Deliverable:** (1) A compelling 5-minute pitch deck, (2) societal impact narrative with sourced statistics, (3) ASUS integration story, (4) backup materials.

**Hour-by-hour plan:**

**Hours 0–4: Research + impact narrative**

Write the societal impact case, sourced from the provided references:

1. **The scale of the problem:**
   - 100M+ Americans have PFAS-contaminated drinking water
   - Eating one freshwater fish = one month of PFAS-contaminated water exposure (EWG 2023)
   - PFAS bioaccumulate 600x+ in downstream biota vs. water (USGS 2025)
   - $3 trillion/year global cost of toxic chemicals in food systems (Systemiq 2025)
   - $47–75 billion/year US healthcare costs from PFAS (NRDC 2025)
   - Remediation costs $0.9–65M per kg of PFAS (Wisconsin DNR 2024) — prevention is the only viable path

2. **The advisory gap:**
   - Fish consumption advisories are state-level and years out of date (Minnesota example: 2026 update based on multi-year review cycles)
   - EPA's 2024 drinking water regulation prevents "thousands of deaths" — but food-web exposure is unregulated
   - Subsistence fishing communities (low-income, Indigenous, Black) face 3–5x higher exposure than recreational anglers (EPA 2024/2025 systematic review)
   - Tribal nations have data sovereignty concerns — need on-premises AI (2026 Indigenous Data Sovereignty Summit)

3. **What TrophicTrace changes:**
   - First AI system to predict food-web PFAS contamination end-to-end
   - Watershed-specific, species-specific, population-specific advisories
   - Makes environmental toxicology capacity accessible to every state agency and tribal office
   - On-premises via ASUS — respects data sovereignty and legal privilege

**Hours 4–8: Pitch deck (5–7 slides)**

Slide structure:

1. **Hook:** "Eating one freshwater fish = one month of PFAS-contaminated water. 100M Americans are affected. Advisories are years behind. We built the AI to fix this."
2. **Problem:** The bioaccumulation blind spot. Diagram showing 1000x concentration cascade. The advisory lag. The EJ disparity.
3. **Solution:** TrophicTrace overview. Physics-informed GNN → interactive heatmap → interpretable, species-specific, population-specific advisories.
4. **Technical depth:** Architecture diagram showing the heterogeneous graph structure, message passing, physics-informed loss. "We don't just prompt an LLM — we train a neural network that learns environmental chemistry."
5. **Demo:** Live walkthrough (or embedded screenshots/GIFs as backup)
6. **ASUS:** Why on-premises compute matters — data sovereignty, pre-enforcement data, tribal nations. Training the GNN requires GPU acceleration that ASUS provides.
7. **Impact:** The numbers. $3T problem. $47–75B US healthcare costs. TrophicTrace democratizes environmental toxicology.

**Hours 8–12: Slide design + architecture diagrams**

- Design clean, professional slides (Keynote, Google Slides, or Figma)
- Create a technical architecture diagram showing the full pipeline: Data Sources → Graph Construction → GNN Training (on ASUS) → Inference → Interactive Map → Advisories
- Create a simplified "how the GNN works" diagram for non-ML judges: show a small example graph with 3 node types, arrows showing message passing, and the output prediction
- Create the bioaccumulation cascade diagram: Water (1x) → Algae (10x) → Invertebrates (100x) → Small Fish (500x) → Predatory Fish (2000x) → Human Exposure

**Hours 12–16: Demo narrative + rehearsal materials**

- Write the exact script for the live demo walkthrough:
  - "Let me show you the Cape Fear River in North Carolina, where Chemours has been discharging GenX..."
  - "As I hover over this section of the river, you can see that largemouth bass here are predicted to have 48 ng/g of PFAS — that's 2.4x the EPA reference dose..."
  - "Clicking 'More Details,' our interpretable GNN shows that 62% of this contamination traces back to the Chemours discharge, amplified by the bass's high trophic level..."
  - "Now here's the finding that only emerges when you model consumption patterns: subsistence fishers in Fayetteville, predominantly low-income Black communities, face 3.2x the exposure of recreational anglers..."
- Record a backup demo video in case of WiFi/tech issues during presentation

**Hours 16–19: Final rehearsal + integration with other tracks**

- Do 2–3 full run-throughs of the presentation
- Time it (target: 4:30 to leave buffer)
- Coordinate with Track C on demo flow
- Prepare for Q&A: anticipate judge questions about data validity, model accuracy, deployment path

---

## Integration Timeline (Hours 14–19)

| Hour | Activity |
|------|----------|
| 14 | Track A delivers `demo_data.json` from GNN inference to Track B |
| 14–15 | Track B swaps mock data for real GNN output, fixes any schema mismatches |
| 15–16 | Track C runs end-to-end integration test: ASUS training → inference → JSON → visualization |
| 16–17 | All tracks: bug fixes, visual polish, edge cases |
| 17–18 | Full demo rehearsal with all components running |
| 18–19 | Final polish, backup recording, presentation prep |

---

## ASUS Integration Summary

The ASUS supercomputer is used for:

1. **GNN training (primary):** Training the physics-informed heterogeneous GNN on synthetic watershed data. This is GPU-intensive (constrained optimization with physics loss terms, backpropagation through 3–4 layers of heterogeneous message passing on graphs with thousands of nodes). Training runs 300–500 epochs and targets <30 min on ASUS GPU. This would take hours on a CPU laptop.

2. **GNN inference (secondary):** Running the trained model on the Cape Fear River demo graph to generate predictions. Inference is fast (~seconds) but runs on ASUS to demonstrate the complete on-premises pipeline.

3. **On-premises data sovereignty (narrative):** The entire pipeline runs on ASUS hardware — no data leaves the machine. This is critical for: (a) state environmental agencies handling pre-enforcement data that is legally privileged, (b) tribal nations with data sovereignty requirements per the Indigenous Data Sovereignty framework, (c) any organization processing sensitive environmental health data.

In the demo, we explicitly show: "This model was trained on ASUS [hardware specs]. No data left this machine. For a tribal environmental office investigating PFAS contamination on their lands, this means their data stays under their sovereign control."

---

## Key Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| GNN doesn't converge | Synthetic data is generated FROM the physics model, so the GNN should learn to recover the forward model. If it still fails: use the forward physical model directly for predictions and present the GNN as "in training" with the forward model as baseline. |
| ASUS setup takes too long | Have a local GPU fallback (if anyone has a gaming laptop). Or train on smaller graphs. Absolute worst case: train on CPU with fewer epochs and smaller graphs — the demo only needs plausible-looking predictions. |
| Visualization data format mismatch | Both teams build against the same JSON schema from hour 0. The schema is defined above. Track C validates the interface. |
| Cape Fear data is hard to find | We only need approximate numbers. Published news articles about Chemours GenX contamination have enough data points. Anything missing is filled with realistic synthetic values within published ranges. |
| RAG chatbot runs out of time | It's explicitly a stretch goal. The demo works without it. |
| Demo crashes during presentation | Track D records a backup demo video by hour 17. |

---

## Quick Reference: Who Builds What

| Track | Person | Primary Deliverable | Secondary |
|-------|--------|-------------------|-----------|
| A | ML Engineer | Trained GNN + inference JSON | ASUS setup |
| B | Frontend Dev | Interactive map visualization | Design polish |
| C | Full-stack / Integrator | Data pipeline + integration + (chatbot) | Demo coordination |
| D | Presenter / Researcher | Pitch deck + impact case + demo script | Architecture diagrams |
