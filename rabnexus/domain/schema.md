# RABNEXUS Phase 0 Domain Contract

## Tenancy

- organizations
- users
- memberships
- roles
- permissions

## Project

- projects
- project_settings
- project_members
- cost_scenarios

## Construction knowledge

- locations
- units
- unit_conversions
- material_categories
- materials
- material_specs
- material_brands
- work_categories
- work_items
- work_formulas
- work_coefficients

## Pricing

- suppliers
- supplier_locations
- supplier_products
- price_sources
- prices
- price_history
- price_indices
- labor_rates
- equipment_rates

## Estimating

- boqs
- boq_items
- takeoffs
- takeoff_items
- calculation_snapshots

## Documents / AI

- documents
- drawings
- images
- ai_extractions
- ai_predictions
- ai_verifications

## Commercial

- quotes
- procurements
- purchase_orders
- subscriptions
- plans
- usage
- payments
- affiliate_products
- affiliate_clicks

## Governance

- audit_logs

## Required invariants

1. `calculation_snapshots` records engine, formula, coefficient, price, unit, tax, currency, and timestamp versions.
2. Price records are immutable observations; corrections create a new observation rather than silently rewriting history.
3. Every tenant-owned entity has an organization boundary.
4. Every locked takeoff quantity has verification metadata.
5. Every financial value has an explicit currency and precision policy.
6. Every material price has unit, location, source, effective/captured timestamp, and verification/confidence metadata.
7. RAB revisions are append-only at the snapshot level so prior outputs remain reproducible.
8. No schema migration is required or executed in Phase 0.
