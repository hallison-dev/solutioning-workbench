
# PIS Tool — Solutioning Builder

Small internal tool to map bank file spec rows to FISPAN constants and solution phases. This repository is intended to live inside your development workspace at `/Users/hakeemallison/Dev/Gemini-site/pis-tool`.

## Quick start

- Install Live Server in VS Code (recommended) or run a simple static server:

```bash
cd /Users/hakeemallison/Dev/Gemini-site/pis-tool
python3 -m http.server 8000
# then open http://localhost:8000/pis-tool.html
```

## Overview

The UI provides CSV ingestion, preview/staging, assignment to phase-specific workbenches, status badges (mapped / pending / gap), unassign, basic gaps detection, and local persistence (Save / Reset) for quick iteration. The app is intentionally a single-file static prototype (HTML + inline JS) as an MVP.

---

## Service decomposition (proposed)

Below is a recommended service split inspired by best-practices from "Fundamentals of Software Architecture". The objective is to keep high cohesion and minimize unnecessary coupling. For each proposed service I list the responsibility, cohesion type and short user stories.

### 1. Spec Ingestion Service
- Cohesion: Functional (high)
- Responsibility: Accept CSV upload, parse into sanitized row objects and validation errors.
- User stories:
	- As a solutions engineer I can upload a CSV and see parsed rows (row # + first column) in a preview.
	- As a user I can drag-and-drop a CSV file and receive validation feedback.

### 2. Spreadsheet UI Service
- Cohesion: Informational (UI-focused)
- Responsibility: Render preview, staging, assignment actions, inline edit flows, status badges and the lifecycle feed UI.
- User stories:
	- As a user I can preview uploaded rows and assign them to ERP/Plugin/Platform.
	- As a user I can click a status badge to edit status (mapped/pending/gap).
	- As a user I can unassign a mapped row back to staging.

### 3. Assignment & Workbench Service
- Cohesion: Functional (high)
- Responsibility: Manage phase-specific tables (add/edit/save/unassign) and row lifecycle operations.
- User stories:
	- As a solutions engineer I can assign a staging row into a phase table.
	- As a solutions engineer I can edit a mapping and save it back into the workbench.

### 4. Persistence Service
- Cohesion: Functional (coupled with Assignment & UI when enabled)
- Responsibility: Persist and restore user progress. MVP uses browser localStorage; production should migrate to authenticated server-side storage.
- User stories:
	- As a user I can click Save to persist my mapping progress locally.
	- As a user I can click Reset to clear saved progress in this browser.

### 5. Gaps Detection Service
- Cohesion: Functional (high)
- Responsibility: Analyze assigned rows and surface rows lacking mappings grouped by target.
- User stories:
	- As a solutions engineer I can view detected gaps grouped by target.
	- As a user I can refresh gaps after mapping changes and see updated results.

### 6. Feed / Visualizer Service
- Cohesion: Informational
- Responsibility: Present lifecycle feed items, highlight items for the current phase and surface technical context modals.
- User stories:
	- As a user I see feed items active only for the current phase.
	- As a user I can toggle technical context to show/hide feed modals.

### 7. Audit & Compliance Service (server-side)
- Cohesion: Transactional
- Responsibility: Record changes (who/what/when), enforce policies about PII and sensitive fields, provide audit logs for compliance.
- User stories:
	- As an admin I can review change history for mappings.
	- As an engineer I must not store raw account numbers in client storage.

### 8. Export Service
- Cohesion: Functional
- Responsibility: Produce export artifacts (CSV/PDF) for master spec and gaps reports.
- User stories:
	- As a user I can export the master spec or gaps report as CSV/PDF.

---

## Cohesion & coupling guidance
- Prefer high cohesion within services and minimize synchronous coupling between them.
- Keep UI services presentation-only: UI calls APIs exposed by Ingestion, Assignment and Persistence services.
- Merge services only when they are tightly coupled and always changed together to avoid distributed transactions.

Types of cohesion used in the split:
- Functional cohesion: Ingestion, Assignment, Persistence, Gaps detection.
- Informational cohesion: Feed & Visualization, Spreadsheet UI (presentation of related data).
- Transactional cohesion: Audit & Compliance (server-side concerns).

---

## Development workflow rule (new)
Before making changes I will:
1. State which service(s) the change touches.
2. Provide a 1–2 line justification for that boundary.
3. Request your confirmation to proceed.

Example: "I will change the Assignment & Persistence services to add server save; confirm?"

---

## Persistence notes (MVP vs production)
- MVP: localStorage (client-only). Good for non-sensitive UI state. Not acceptable for sensitive fintech data (PII, account numbers, secrets).
- Production (recommended): authenticated server-side state per-user (HTTPS API, encrypted at rest), minimal metadata storage, RBAC, audit logs and retention policies.

If you want a short scaffold I can add a minimal authenticated API (Node/Express) to accept/save state securely and wire the UI to it.

---

## Next steps & recommended priorities
1. Approve service boundaries (or suggest merges).
2. Move parsing and gaps logic into small, testable modules.
3. Scaffold server persistence (Option A) and add audit logging before storing any sensitive mapping data.

---

If you approve the split I'll follow the development workflow rule and confirm affected services before each change.
