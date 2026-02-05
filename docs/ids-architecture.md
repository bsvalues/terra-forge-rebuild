### Architecture Specification: The Intelligent Data Suite (IDS) Nervous System

#### 1\. Executive Architectural Vision: The Sovereign Valuation Organism

The Intelligent Data Suite (IDS) represents a fundamental paradigm shift from fragmented ETL (Extract, Transform, Load) routines toward a centralized, event-driven "nervous system" architecture. Historically, county data management has been undermined by "silent data loss"—the systemic attrition of data integrity occurring when disparate legacy exports are forcibly mapped into rigid analytics schemas. This technical failure generates profound sociological friction; it forces county assessors, who are domain experts in valuation and law, to act as ad-hoc data engineers, leading to a collapse in system trust and defensibility.The IDS serves as the centralized core of the TerraFusion OS, formalizing the architectural mission:  **"Never ask counties to be data engineers."**  By establishing a sovereign data hub, we move beyond mere data ingestion to the creation of a "Sovereign Valuation Organism." This design prioritizes "court-ready" defensibility, ensuring that every data point—from the foundational  **Washington State 2025 Current Parcels**  baseline to the most recent sales record—is versioned, auditable, and traceable. This structural centralization mitigates user anxiety by providing a singular, immutable source of truth that remains resilient against the volatility of county vendor exports.

#### 2\. Core Data Product Taxonomy & Canonical Schema

To ensure systemic determinism, the IDS operates on a taxonomy of standardized "Data Products" rather than raw datasets. These products act as the formal contract between the IDS and downstream modules, guaranteeing that the geometry in the  **Quantum Cockpit**  and the training sets in the  **Calibration Studio**  are perfectly synchronized.

##### Primary Data Products

Data Product,Required Canonical Fields,Validation Requirements,Downstream Consumers  
PARCEL\_FABRIC,"parcel\_uid (UUID), county\_fips, geom\_wkt, source\_version",Geometry topology check; WA Geospatial Open Data Portal (2025) baseline alignment,"Quantum Cockpit, GIS Overlays"  
COUNTY\_ROLL,"parcel\_uid, county\_parcel\_id\_norm, total\_value, situs\_address","Value range sanity; normalization of APN/PARID (strip punctuation, pad, uppercase)","Calibration Studio, Appeals Module"  
SALES\_STREAM,"parcel\_uid, sale\_price, sale\_date, is\_arms\_length",Sale price \> 0; arms-length filtering; validity code mapping (IAAO-grade),"Ratio Studies, Comps Engine"  
BUILDINGS,"parcel\_uid, year\_built, sqft, beds, baths","Characteristic range checks (e.g., Year \> 1800); null-percentage thresholds","Calibration Studio, Comps Engine"

##### The "Parcel Spine" Logic: UID vs. Raw APN

The cornerstone of this taxonomy is the  **Parcel Spine** , which differentiates between the county\_parcel\_id\_raw (the volatile identifier provided by the vendor), the county\_parcel\_id\_norm (the canonical join key), and the parcel\_uid. The parcel\_uid is an immutable, TerraFusion-generated UUID. By anchoring all property attributes to this stable internal key, the system prevents silent data loss during parcel re-plating or vendor system migrations. This enables "time travel"—the ability to perform versioned auditing across disparate roll years while maintaining a defensible lineage for every property.

#### 3\. The Unified Ingestion Pipeline: Ingest-to-Publish Logic

The IDS pipeline is a repeatable, multi-layered engine designed to transform messy administrative records into pristine, production-ready Data Products.

1. **Acquisition:**  Supports ArcGIS Feature Services, SFTP, HTTPS, and Manual Drop.  
2. **Fingerprinting:**  Utilizes CountyExportFingerprint to recognize vendor-specific schemas from Tyler iasWorld, Schneider, and Catalis.  
3. **Smart Mapping:**  AI-powered field mapping with 0-100% confidence scoring based on historical county mapping memory.  
4. **Validation & Triage:**  Execution of quality rules and anomaly detection (e.g., identifying "sale chasing" patterns or broken situs formats).  
5. **Normalization & Joining:**  The "Parcel Spine" matching logic joins county records to the Washington State 2025 baseline, assessing join confidence (High/Med/Low).  
6. **Versioning & Publishing:**  Employs "Delta by Hashing" to detect row-level changes. This method supports the dual realities of county administration: the need for immutable "Certified Snapshots" and the requirement for incremental, transactional updates.

#### 4\. Internal Event Bus & Downstream Routing

An event-driven architecture is critical to preventing "module drift." The IDS Internal Event Bus ensures that the entire OS reacts to a "single source of truth" update in real-time.| DataEventType | Subscriber Actions | Impacted Module || \------ | \------ | \------ || product.published (Fabric) | Rebuild spatial cache; refresh MVT attribute tiles | **Quantum Cockpit** || product.published (Sales) | Update comp pools; refresh ratio study datasets | **Comps / Ratio Engine** || product.published (Roll) | Update feature store; refresh training datasets | **Calibration Studio** || join.quality.changed | Flag anomalies; update mismatch telemetry | **IDS Command Center** || audit.updated | Generate revision index; finalize audit packet | **Appeals Module** |  
The strategic visibility of routing logs in the UI is a deliberate sociological choice. By visualizing the "ripple effect" of an update—showing exactly which models and maps were refreshed—the system replaces user uncertainty with architectural transparency.

#### 5\. Sovereign Security & Defensibility: The "Court-Ready" Layer

In government administration, security is a prerequisite for sovereignty. The IDS architecture is designed as a defensive posture against restrictive county IT crackdowns on external AI through three distinct operational modes.

##### AI Operational Modes

* **Sovereign Cloud:**  Utilizes  **Azure Government**  (OpenAI on GCC High) for counties aligned with Microsoft 365/Copilot governance.  
* **Local Inference (On-Prem):**  AI mapping and validation run entirely within the county’s infrastructure; no parcel-level data leaves the boundary.  
* **Hybrid:**  Sensitive parcel rows remain local, while only non-sensitive metadata and aggregates are transmitted for processing.

##### Lineage & Audit: The Defensibility Primitive

For a valuation to be "court-ready," the IngestRun must be a forensic record. Mandatory fields include:

* source\_fingerprint: A SHA256 hash of the original vendor file.  
* transform\_version: The specific version of mapping rules applied.  
* change\_memo: User-provided or AI-generated justification for the update.  
* row\_counts\_by\_stage: Metrics tracking data from raw to published state.**Rollback as Psychological Safety:**  The system provides one-click reversibility. This capability transforms the IDS from a perceived risk into a trusted utility, allowing assessors to explore data updates with the safety net of immediate restoration to a known-good state.

#### 6\. The IDS Command Center: Human-Centric Orchestration

The IDS Command Center distills architectural complexity into a deterministic, "three-click" user experience. It is designed to turn technical failures into user-led solutions.

* **Inventory & Freshness Dashboard:**  Tracks SLAs and provides "Stale Reasons" (e.g., "ArcGIS endpoint unreachable").  
* **Join Quality Dashboard:**  Visualizes match rates between the county roll and the WA Parcel Fabric. It explicitly surfaces the  **Top 20 Mismatch Patterns**  (e.g., "APN contains unexpected suffixes like \-A") and offers AI-remediation steps.  
* **The 3-Field Approval UX:**  The system’s primary adoption mechanism. AI handles background mapping, requiring the user to confirm only three critical fields:  **Parcel ID, Total Value, and Situs Address.**  
* **Data Health Grades:**  The system generates a weighted "Health Grade" (A-F) for every county based on data freshness, join quality (match %), and validation success (e.g., arms-length sale ratio accuracy).**Final Summary:**  The IDS architecture serves as the vital precursor for TerraFusion OS adoption. By establishing a robust, sovereign foundation of data through the Washington State 2025 baseline and providing a "court-ready" audit trail, the IDS creates immediate value with minimal friction. It ensures the data ecosystem is not only technically superior but also socially trusted and legally defensible.

