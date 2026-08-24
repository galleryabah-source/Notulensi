# RABNEXUS — Construction Cost Intelligence OS

RABNEXUS is a deterministic construction estimating platform designed to evolve from RAB/BOQ calculation into material price intelligence, quantity takeoff, procurement, AI assistance, SaaS, and enterprise APIs.

## Phase 0 status

This branch establishes the non-destructive foundation. The existing application and legacy files remain untouched.

### Source-of-truth rules

- Financial calculations are deterministic; AI is never the final numeric source of truth.
- Money uses decimal semantics; no binary floating-point financial arithmetic.
- Formula, coefficient, unit, price, and calculation-engine versions are explicit.
- Historical RABs remain reproducible through immutable calculation snapshots.
- AI-extracted quantities require verification before becoming locked quantities.
- Regional prices carry location, source, unit, timestamp, and confidence metadata.
- No destructive database migration is introduced during Phase 0.

## Planned modules

1. Calculation Engine
2. Unit Conversion Engine
3. Material Master
4. Work Item and Coefficient Library
5. Regional Price Intelligence
6. RAB / BOQ
7. Quantity Takeoff
8. Scenario and Sensitivity Analysis
9. Project / Budget / Actual
10. Supplier and Procurement
11. AI Construction Copilot / RAG
12. SaaS / Billing / Usage
13. Affiliate / Marketplace
14. SEO calculators and construction knowledge base
15. Enterprise API / 5D BIM

## Phase gates

Phase 0 must establish contracts and deterministic calculation tests before UI, AI, pricing ingestion, or migrations are activated.

GO requires passing calculation golden tests, type checks, security checks, tenant-isolation checks, and end-to-end regression evidence. A code path that is merely implemented is not treated as runtime evidence.
