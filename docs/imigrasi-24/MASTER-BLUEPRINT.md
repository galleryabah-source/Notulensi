# IMIGRASI 24 — Master Blueprint

**Status:** BRAINSTORMING BASELINE — Pedoman arsitektur awal
**Version:** 0.1.0
**Date:** 2026-08-27

## 1. Vision

IMIGRASI 24 adalah platform layanan percakapan keimigrasian 24/7 berbasis WhatsApp. WhatsApp menjadi kanal masuk; core platform tetap channel-agnostic agar dapat diperluas ke web chat, mobile, voice, kiosk, atau kanal pemerintah lain.

## 2. Core Architectural Principle

**AI-Optional by Architecture.** Layanan tidak boleh memiliki ketergantungan tunggal pada provider/model AI.

Primary flow:

`WhatsApp → Message Gateway → Intent Engine → Cache/Answer Database → Policy Engine → Response Engine`

AI flow untuk kasus yang membutuhkan kemampuan generatif/semantic:

`Unknown/Complex Intent → AI Router → Provider A/B/Local AI → Validation → Response`

AI adalah akselerator, bukan single point of failure.

## 3. AI Independence

Sistem harus tetap operasional untuk pertanyaan yang sudah diketahui ketika:

- provider AI outage;
- API key/kuota/budget tidak tersedia;
- koneksi ke provider terputus;
- provider diganti;
- model berubah;
- fitur AI dimatikan sementara.

Target operating modes:

### MODE A — ZERO AI
Database + search + rules + templates.

### MODE B — HYBRID
Mayoritas pertanyaan dijawab oleh Answer Database/Rules; AI hanya untuk pertanyaan kompleks/ambigu.

### MODE C — FULL AI
AI digunakan lebih luas ketika biaya dan governance mengizinkan.

## 4. Official Answer Database

Answer Database adalah aset inti platform dan harus dapat melayani tanpa LLM generatif.

Setiap jawaban minimal memiliki:

- answer_id
- intent
- question_variants
- answer_id
- answer_en
- service
- source
- legal_basis
- effective_from
- effective_until
- version
- status
- approved_by
- approved_at
- last_reviewed

Lifecycle:

`Source Document → AI-assisted Draft → Human Review → Approval → Publish → Versioning → Archive`

AI boleh membantu menyusun draft, tetapi pengetahuan/aturan publik harus melalui governance dan approval yang ditetapkan.

## 5. Knowledge Architecture

Pisahkan:

- official knowledge base;
- answer database;
- policy/rules engine;
- office/service directory;
- legal references;
- conversation context;
- analytics.

Jangan menaruh seluruh pengetahuan ke prompt model.

## 6. Response Resilience

Response pipeline:

`Message → Intent → Cache → Answer DB → Policy → AI Router (bila perlu) → Safety Validation → Human Handoff (bila perlu) → WhatsApp`

Fallback order:

1. static/high-confidence answer;
2. rule/policy response;
3. approved retrieval result;
4. AI provider router;
5. local/on-prem AI jika tersedia;
6. safe fallback + human handoff.

Tidak boleh menghasilkan HTTP/service failure hanya karena AI provider gagal.

## 7. Core Modules

- WhatsApp Gateway
- Conversation Engine
- Intent Engine
- Answer Database
- Knowledge Management
- Policy Engine
- AI Orchestrator/Router
- Response Safety Gate
- Human Handoff
- Complaint/Ticketing
- Passport Service Integration
- WNA Service Integration
- Office Directory
- Notification
- Analytics & Intelligence
- Audit Trail
- RBAC/Admin
- Security & Privacy
- Observability

## 8. Initial Intent Domains

### Paspor
PASSPORT_NEW, PASSPORT_REPLACEMENT, PASSPORT_EXPIRED, PASSPORT_LOST, PASSPORT_DAMAGED, PASSPORT_DATA_CHANGE, PASSPORT_CHILD, PASSPORT_STATUS, PASSPORT_REQUIREMENTS, PASSPORT_COST, PASSPORT_OFFICE, PASSPORT_APPOINTMENT.

### WNA
VISA_INFORMATION, VISA_REQUIREMENT, VISA_EXTENSION, VISA_STATUS, STAY_PERMIT, ITAS, ITAP, REENTRY_PERMIT, SPONSOR, CHANGE_OF_STATUS, OVERSTAY, FOREIGNER_REPORT.

### Service/Complaint
OFFICE_LOCATION, OFFICE_HOURS, SERVICE_REQUIREMENT, SERVICE_COST, SERVICE_DURATION, APPOINTMENT, QUEUE, SERVICE_STATUS, COMPLAINT, FRAUD_REPORT, EMERGENCY_REPORT, HUMAN_AGENT, UNKNOWN.

## 9. Security Principles

- webhook signature validation;
- TLS and encryption at rest;
- RBAC and least privilege;
- secret management;
- rate limiting and anti-abuse;
- PII classification and minimization;
- retention policy;
- immutable/auditable event trail;
- backup and disaster recovery;
- no shared administrator credentials.

## 10. Auditability

Untuk keputusan/jawaban penting, simpan keterlacakan terhadap:

- message/conversation ID;
- intent;
- knowledge source/version;
- policy version;
- AI model/provider bila digunakan;
- response version;
- confidence/evaluation;
- timestamp;
- operator/approval context bila relevan.

## 11. Five-Year Evolution

### Phase 0 — Governance & Discovery
Service mapping, regulation mapping, security/data governance, architecture, SOP.

### Phase 1 — MVP
WhatsApp + FAQ + paspor + WNA basic + knowledge base + admin + human handoff + audit.

### Phase 2 — Intelligent Service
RAG/hybrid retrieval, context, complaint/ticketing, office intelligence, voice/document classification.

### Phase 3 — Transactional Service
Passport status, appointment, ticket tracking, notification, service status, official API integrations.

### Year 2
Knowledge graph, advanced analytics, multilingual expansion, WNA assistant, cross-office intelligence.

### Year 3
National conversational platform; multiple channels on one core.

### Year 4
AI-assisted operations for staff: summarization, routing, anomaly detection, draft responses, analytics.

### Year 5
Immigration Digital Service Intelligence: trend detection, service-demand intelligence, impact analysis, continuous knowledge governance.

## 12. Technology Direction

Initial recommended stack:

- Next.js + TypeScript
- Node.js services/workers
- PostgreSQL
- Drizzle ORM where appropriate
- Redis + queue
- hybrid lexical/vector search
- provider-independent AI abstraction
- object storage
- OpenTelemetry/central observability
- CI/CD

Technology choices remain replaceable behind stable interfaces.

## 13. Non-Negotiables

- AI cannot be the sole source of truth.
- AI must not be allowed to invent tariffs, legal requirements, or official decisions.
- AI provider outage must degrade gracefully, not disable known-answer services.
- Approved knowledge must be versioned.
- Individual adjudicative/legal decisions remain with authorized officers.
- Official integrations should use authorized APIs/interfaces; scraping is not a foundation strategy.
- Architecture must support provider replacement without rebuilding the platform core.

## 14. Brainstorming Status

This document is the **current baseline**, not a frozen final specification. New ideas, security findings, operational constraints, legal requirements, and validated product decisions should be incorporated through versioned updates.
