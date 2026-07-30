# Execution Plan — Overview and Session Protocol

> This folder is the **Execution Plan** for building the `pvp-dashboard` project: a phase-based workflow in which a code agent executes **one phase per session**, and **every session starts with zero prior context**. The sibling folder [`../specifications/`](../specifications/) contains the **Specifications** — the authoritative description of what is being built — and [`../FUNCTIONAL_SPECIFICATIONS_UI.md`](../FUNCTIONAL_SPECIFICATIONS_UI.md) is the behavioural source of truth for the interface. This document defines the rules of the workflow; read it at the start of every session.

## 1. What is being built (one paragraph)

`pvp-dashboard` is the web application with which a small investment team reviews Italian judicial auctions: an Italian-language, auth-gated dashboard that classifies every upcoming auction into risk clusters, shows official OMI price context, and lets the team rate listings, discuss them in per-listing chats with attachments, and work through daily assigned calendars. It is one of two independent projects sharing a Cloud Firestore database: a separate, already-running **scraper project** keeps the data current; this project reads it (and writes only its own collections plus one settings document) through a TypeScript monorepo — a React + Radix UI SPA (`apps/web`) and a Fastify API (`apps/server`) that mediates every database access. Full context: [`../specifications/SPECIFICATIONS.md`](../specifications/SPECIFICATIONS.md).

## 2. The two documentation sections

| Section | Folder | Role |
|---|---|---|
| **Specifications** | `../specifications/` (+ `../FUNCTIONAL_SPECIFICATIONS_UI.md`) | *What* to build: behaviour, architecture, decisions, data contract, domain rules, API surface, configuration, testing requirements. Authoritative and stable. |
| **Execution Plan** | this folder | *How* to build it: thirteen self-contained phase documents, this overview, the repository structure, and the handoff records produced as work proceeds. |

## 3. Execution model

- **One phase per session.** A session executes exactly one phase document, start to finish. Do not start the next phase in the same session, even if time remains.
- **Zero prior context.** The executing agent must assume it knows nothing beyond: this overview, its phase document, the Specifications it lists as required reading, and the filled handoffs in [`handoffs/`](handoffs/). Phase documents are written to be sufficient under that assumption; if something needed is missing, that is a defect to record in the handoff, not a license to guess.
- **Phases run in order** (0 → 10). A phase may be re-run in a later session if its previous session ended `partial` or `blocked`; it resumes using its own earlier handoff.
- **Where sessions run:** Phase 0 creates the new `pvp-dashboard` repository and copies this documentation into it (`docs/`). Every subsequent session runs **inside the new repository**, and all handoffs are written there.

## 4. Session protocol (follow in order)

1. **Read this overview** in full.
2. **Read your phase document** in full, including its Constraints section.
3. **Read every file in `handoffs/`**, newest last — they are the memory of the project. Pay particular attention to the previous phase's *Carry-over* section and to any open blockers.
4. **Verify the entry criteria** of your phase. If any is unmet and you cannot satisfy it within the phase's own scope, stop: write a handoff with outcome `blocked`, stating exactly what is missing and what would unblock it.
5. **Execute the numbered tasks** in order. Consult the required Specifications as you go; keep the codebase consistent with them at every step.
6. **Run the phase's Verification** and make it pass. Report results honestly — a failing check is recorded as such, never glossed over.
7. **Write the handoff**: copy [`handoffs/HANDOFF_TEMPLATE.md`](handoffs/HANDOFF_TEMPLATE.md) to `handoffs/HANDOFF_PHASE_<N>.md` (if the file already exists from an earlier partial run, append a new dated entry) and fill in all four sections. Commit all work.

## 5. Compliance rule (binding)

The **Specifications are authoritative**. If a task appears to conflict with them, or an implementation choice would require changing a contract (data model, API shapes, domain rules, configuration surface):

- **Do not improvise the change.** [`../specifications/DATA_MODEL.md`](../specifications/DATA_MODEL.md) **Part A** in particular is the boundary contract with the scraper project — a separate, running system. It must not drift, and **no code path that writes a Part A collection** (other than `settings/extraction_categories`) may ever exist in this codebase.
- Record the conflict precisely in the handoff under *Blockers & unresolved issues*, with the options you see, and — if the phase can still reach its verification gate without resolving it — continue; otherwise end the session `blocked`.
- Freedom **within** the Specifications (naming of internals, file-local structure, test organization) is yours; note non-obvious choices in the handoff's *Notes*.
- **All user-facing copy is Italian and externalized** (`FRONTEND.md` §6) — a hardcoded string is a spec violation in any phase, not a Phase 11 cleanup item.

## 6. Phase index

| Phase | Document | Delivers | Verification gate |
|---|---|---|---|
| 0 | [`PHASE_0_BOOTSTRAP.md`](PHASE_0_BOOTSTRAP.md) | New monorepo: tooling, both app skeletons, shared package, docs, i18n scaffold, design tokens | Install/lint/typecheck/test/build green; both dev servers boot; sample Italian string renders from the catalog |
| 1 | [`PHASE_1_DOMAIN_SHARED.md`](PHASE_1_DOMAIN_SHARED.md) | `packages/shared`: all schemas, all domain rules, fixture dataset | Full offline unit suite green (`TESTING.md` §2), incl. every edge case |
| 2 | [`PHASE_2_REPOSITORY_CACHE.md`](PHASE_2_REPOSITORY_CACHE.md) | Firestore repositories (Part A read-only), emulator seed, snapshot cache | Emulator suite green incl. cache invalidation; seeded snapshot served |
| 3 | [`PHASE_3_AUTH_ACCOUNTS.md`](PHASE_3_AUTH_ACCOUNTS.md) | Sessions, bootstrap admin, account lifecycle, login screen, app shell | Auth e2e green: bootstrap → create → forced change → guards → lifecycle protections |
| 4 | [`PHASE_4_DASHBOARD_READ.md`](PHASE_4_DASHBOARD_READ.md) | Landing, area views, clusters, virtualized tables, toolbar, URL state | Responsive at thousands of seeded rows; deep links restore exact views |
| 5 | [`PHASE_5_DRILLDOWN_OMI_ARCHIVE.md`](PHASE_5_DRILLDOWN_OMI_ARCHIVE.md) | Geographic drill-down, OMI panel, blocco behaviours, Archivio, categories admin | Emulator e2e over every drill-down/blocco/archive rule; categories round-trip |
| 6 | [`PHASE_6_WORKSPACE_RATINGS.md`](PHASE_6_WORKSPACE_RATINGS.md) | Listing workspace, shared ratings, activity history | Two concurrent sessions converge on ratings; timeline reflects actions |
| 7 | [`PHASE_7_CHAT_ATTACHMENTS.md`](PHASE_7_CHAT_ATTACHMENTS.md) | Chat threads, rich text, attachments, unread counters, *Le mie chat* | Two-user e2e: message + attachment round-trip; unread totals correct everywhere |
| 8 | [`PHASE_8_CALENDAR.md`](PHASE_8_CALENDAR.md) | Month/day views, transactional auto-assignment, admin assignment | Concurrency test: simultaneous first-opens never double-assign; admin flows e2e |
| 9 | [`PHASE_9_UI_MIGRATION.md`](PHASE_9_UI_MIGRATION.md) | Replace PrimeReact (commercial license) with open-source Radix UI primitives, behaviour-preserving | All gates green; e2e unchanged; no PrimeReact remains; before/after visual parity |
| 10 | [`PHASE_10_DESIGN_SYSTEM.md`](PHASE_10_DESIGN_SYSTEM.md) | Modern-enterprise design system (blue/white) + full dark mode, driven by Hallmark | Hallmark gates pass; light+dark visual pass; gates green |
| 13 | [`PHASE_13_UX_REDESIGN.md`](PHASE_13_UX_REDESIGN.md) | Full UX/UI redesign to the owner's Claude Design reference: navy/Hanken system, combobox selectors, tab/filter/table/chat pattern changes | Gates green; e2e updated + green; URL contract unchanged; light+dark visual pass |
| 11 | [`PHASE_11_HARDENING.md`](PHASE_11_HARDENING.md) | A11y, responsiveness, i18n completeness, performance/payload budgets, easter eggs, Hallmark audit | Axe clean (both themes); budgets met; full Playwright regression green |
| 12 | [`PHASE_12_DEPLOYMENT.md`](PHASE_12_DEPLOYMENT.md) | Production on Hosting + Cloud Run, deny-all rules, runbook, drill | Live round-trip of every write path; rules verified; runbook drill passed |

> **Ordering note (Phase 13).** Phase 13 was added after Phase 10 had completed but before Phases 11–12 had run, and it executes **in that position**: 0 → 10, then 13, then 11 → 12. It keeps the number 13 (rather than renumbering 11/12) so existing handoff cross-references stay valid; hardening (11) must verify the redesigned interface, not the pre-redesign one.

The target file layout, and which phase creates each part, is in [`REPOSITORY_STRUCTURE.md`](REPOSITORY_STRUCTURE.md).

## 7. Human (operator) tasks interleaved with the phases

**Manual-intervention protocol (binding, every phase).** Some steps cannot or must not be completed by the code agent alone — an interactive installer, a credential, a console action, a supervised deploy. Whenever the agent detects that a task requires manual action from the developer, it must **pause the automated workflow at that exact point** and hand the developer a short, self-sufficient instruction block: what is needed and why (one line), the exact commands to run or clicks to make (copy-pasteable, in order), and how the agent will verify the result. It then waits for the developer's confirmation, **verifies the outcome itself** before continuing, and records the intervention in the handoff. If the developer is unavailable, the session ends `partial`/`blocked` per the protocol — the agent never simulates, skips, or works around a manual step silently.

Phases 0–11 need **no Google/Firebase account access**: everything runs against the Firestore and Storage emulators. The operator is needed for:

- **Phase 0:** installing the **Hallmark design skill** — it must be installed with `npx skills add nutlope/hallmark` (an interactive installer run by the developer; never by copying the skill folder into the repository), and possibly completing the **PrimeReact AI CLI plugin** setup if its automatic installation fails (the phase document carries the instructions for both). *(The PrimeReact AI CLI plugin ceases to be relevant once Phase 9 removes PrimeReact.)*

- **Optional, Phase 4:** a **read-only** service-account key for the shared production database, if the optional live read smoke is wanted (real counts, real data shapes). The phase passes without it.
- **Possibly, Phase 10:** ensuring the **Hallmark design skill** is actually invocable in-session (`Skill({skill:'hallmark'})`) — it failed to register in an earlier session ("Unknown skill: hallmark", `HANDOFF_PHASE_4.md`); if it does not resolve, the skill must be re-registered before the design-system phase can run its `redesign` pass.
- **Required, before Phase 12:** the one-time onboarding of [`../specifications/DEPLOYMENT.md`](../specifications/DEPLOYMENT.md) §2 — Blaze upgrade + budget alerts, enabling Cloud Run/Storage, creating the runtime and deploy service accounts, placing the two secrets in Secret Manager. Phase 12's entry criteria list these; run that session when the operator is present to supervise the first production deploy and receive the bootstrap admin credential.

## 8. Ground rules for every session

- Never delete or rewrite a filled handoff; append to it.
- Never commit secrets (`.env`, service-account JSON, session secrets); the `.gitignore` from Phase 0 enforces this — keep it effective.
- Default test runs stay offline; integration suites require the emulators and refuse to run without them; **nothing in Phases 0–11 touches the production database** except Phase 4's optional, explicitly read-only smoke (see [`../specifications/TESTING.md`](../specifications/TESTING.md) §1).
- Commit at least once per completed task group with clear messages; the repository history is part of the audit trail.
- The **Hallmark** design skill (installed at `.agents/skills/hallmark/` in Phase 0 via `npx skills add nutlope/hallmark`) is part of the workflow: consult it whenever a phase builds or changes user-facing surfaces, per [`../specifications/FRONTEND.md`](../specifications/FRONTEND.md) §5.
- When a step needs the developer's hands, follow the **manual-intervention protocol** of §7: pause, instruct plainly, wait, verify, record.
