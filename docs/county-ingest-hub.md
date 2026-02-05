### TerraFusion Intelligent Data Suite: County Ingest Hub Architecture

#### Executive Summary

The TerraFusion Intelligent Data Suite (IDS) represents a strategic shift from a linear data ingestion tool to a unified "nervous system" for the TerraFusion OS. Designed specifically for the high-stakes environment of government technology (GovTech), the IDS addresses the critical friction points of data sovereignty, auditability, and technical complexity. By leveraging the Washington State parcel baseline and providing a "three-click" onboarding experience, the IDS serves as the essential precursor for the full TerraFusion ecosystem. The architecture prioritizes "court-ready" defensibility, ensuring that every data transformation is logged, reversible, and compliant with International Association of Assessing Officers (IAAO) standards.

#### Current State Analysis and Corrective Redesign

The legacy ingestion pipeline followed a rigid 5-step wizard (Upload → Validate → Map → Preview → Publish). Analysis by GovTech systems architects identified a critical logical failure: validation was occurring before mapping, meaning the system attempted to verify data before understanding its context.

##### Critical UX and Logical Enhancements

* **Logical Reordering:**  The flow has been corrected to  **Upload → Map → Validate → Preview → Publish** . Mapping must occur first so the system knows which fields to validate.  
* **Smart Auto-Mapping:**  Implementation of a dictionary with over 40 common county data aliases (e.g., PARID, APN, SITUS\_ADDR) to automate field identification.  
* **Progressive Disclosure:**  UI elements now collapse optional fields by default, focusing user attention on required inputs and reducing cognitive load.  
* **Visual Data Lineage:**  New components provide real-time visibility into how data flows from raw files into the system’s core modules.

#### The Five Pillars of the Intelligent Data Suite (IDS)

The IDS is structured as a "Data Command Center" to provide assessors with total visibility into their data's health and lifecycle.| Pillar | Function || \------ | \------ || **Inventory** | Tracks existing data products, source origins, freshness, and coverage. || **Ingest** | Handles the acquisition of data via three distinct paths (Quick Start, File Drop, Connected Feed). || **Quality** | Monitors join match rates, executes validation rules, and identifies anomalies. || **Versions** | Manages roll snapshots, revisions, and "time travel" capabilities for appeals. || **Routing** | Directs validated data to downstream modules (Cockpit Map, Comps, Ratio Studies). |

#### Washington State Data Foundation

The precursor project utilizes the Washington statewide parcel dataset (September 2025\) as the "join spine" for all subsequent county-specific enrichment.

##### Technical Foundation

* **Database:**  PostgreSQL with PostGIS for spatial indexing and county-by-county tenant separation.  
* **Normalization Strategy:**  To prevent "silent data loss," the system utilizes a three-tier identification strategy:  
* parcel\_uid: Stable internal UUID.  
* county\_parcel\_id\_raw: Original identifier provided by the county.  
* county\_parcel\_id\_norm: Canonical version (stripped punctuation, left-padded).  
* **County Tiers:**  Support for all 39 Washington counties, categorized by tier (Rural, Suburban, Urban, Metro).

##### Data Product Routing Table

The IDS acts as a hub, emitting "truth updates" to specific OS modules when a data product is published.| Data Product | Downstream Consumer | Impact || \------ | \------ | \------ || **Parcel Fabric** | Quantum Cockpit Map | Rebuilds tiles and updates GIS overlays. || **County Roll** | Comps Engine / Appeals | Refreshes stratification fields and indexes new versions. || **Sales Stream** | Ratio Study Engine | Updates sales eligibility and calibration datasets. |

#### Onboarding and User Experience

The IDS philosophy is to "never ask counties to become data engineers." This is achieved through three onboarding paths designed for varying levels of IT involvement.

1. **Public Quick Start (2 mins):**  Loads the Washington statewide baseline. Instantly unlocks the "Cockpit Map" capability.  
2. **File Drop (15–30 mins):**  Supports CSV/DBF/GDB uploads. Uses AI fingerprinting to recognize vendor-specific exports (e.g., Tyler iasWorld, Schneider).  
3. **Connected Feed (1–2 hours):**  Establishes nightly or weekly pulls from ArcGIS Feature Services, SFTP, or HTTPS endpoints.

##### The "Three-Click" Promise

To build trust, the AI-powered ingest system recognizes county exports and requires the user to confirm only three essential fields:

* **Parcel ID**  
* **Total Value**  
* **Situs Address**

#### Governance and Defensibility

For a system to be "court-ready," it must provide an absolute audit trail for every record.

* **Ingest Runs & Lineage:**  Every data pull captures the source\_fingerprint (SHA256 hash), transform\_version, and initiated\_by metadata.  
* **Join Quality Dashboard:**  Provides transparency on matched vs. unmatched records, including "top 20 mismatch patterns" (e.g., APN suffixes) to help assessors remediate data at the source.  
* **Rollback Capability:**  A critical psychological safety feature allowing one-click reversal of any ingestion that negatively impacts valuation models.  
* **Delta Detection:**  Uses hash\_row logic to detect exactly what changed between certified roll snapshots without reloading entire datasets.

#### Security and AI Implementation Modes

Recognizing government restrictions on "outside AI," TerraFusion supports three distinct AI operation modes to align with county IT policies and Microsoft-aligned toolsets (like Azure Government and Copilot).

* **Sovereign Cloud AI:**  Utilizes Azure Government OpenAI for counties permitting cloud-based processing.  
* **On-Prem / Hybrid:**  Metadata and aggregates are processed via AI, but sensitive parcel rows never leave the county boundary.  
* **Local Inference:**  Mapping and quality assurance runs strictly within the tenant boundary.

##### Governance Alignment

TerraFusion is designed to "align with the Microsoft governance model," supporting Entra ID authentication, Purview labeling, and Data Loss Prevention (DLP) boundaries, ensuring that AI features remain functional even in highly restricted environments.

#### Conclusion: The Sovereign Valuation Organism

The Intelligent Data Suite transforms raw county data into a "Sovereign Valuation Organism." By providing immediate capability unlocks—such as Ratio Studies, Comps Selection, and Model Calibration—the IDS proves its value within minutes of onboarding. The system’s focus on join quality, versioning, and explainable AI ensures it stands as a defensible, trusted infrastructure for the modern assessor’s office.  
