# Notulensi Lite — Version B

## Decision
Notulensi Lite is a second interface in the same `galleryabah-source/Notulensi` repository. The Full application, Lite interface, backend, database, authentication, and single Admin application remain one product platform.

## Non-negotiable boundaries
- No AI endpoint is called by Lite.
- No OpenAI/Gemini/local-AI dependency is required by Lite.
- Existing Full behavior is not rewritten.
- Existing database schema is not changed in this phase.
- No migration, `db:push`, or destructive database operation is performed.
- Admin remains the existing `/admin-login.html` → `/admin-settings.html` flow.

## Interface map
- Full: existing Notulensi application.
- Lite: `/notulensi-lite.html`.
- Admin: existing `admin-login.html` and `admin-settings.html`.

## Lite scope
1. Dashboard summary.
2. Meeting recap: title, date, participants, agenda, conclusion.
3. Transcript: title and transcript body.
4. Search across locally available Lite records.
5. Admin link to the existing single administration application.

## Persistence boundary
The current production database audit shows only `app_storage`, `user_profiles`, and `audit_logs` in `public`; the previously documented `meetings` and `transcripts` entities are architectural definitions, not currently provisioned tables. Therefore this first implementation deliberately does not invent a schema or run a migration.

The current Lite client uses browser-local draft persistence only as a safe UI/prototype boundary. A production persistence adapter must be connected to the audited existing backend/database before Lite is advertised as a shared persistent meeting store.

## Target production architecture
```text
                    Existing Notulensi Core
             ┌──────────────┴──────────────┐
             │                             │
        Full Interface                Lite Interface
        AI-capable                    AI-independent
             │                             │
             └──────────────┬──────────────┘
                            │
                    Existing Backend
                            │
                    Existing Database
                            │
                     Single Admin
             admin-login.html → admin-settings.html
```

## Acceptance criteria for the next phase
- Lite never imports or calls AI modules.
- Lite reads/writes through a reviewed backend data contract.
- Data ownership and RLS are verified before persistent meeting data is enabled.
- Full application regression remains PASS.
- Admin remains one shared control plane.
