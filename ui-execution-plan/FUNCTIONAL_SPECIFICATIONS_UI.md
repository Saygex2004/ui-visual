# PVP Aste Immobiliari — UI Functional Specifications

> **Revision note (2026-07):** three approved enhancements were incorporated into this revision — **account lifecycle management** (§8.1), **rich-text chat messages and attachments** (§6.2), and the **per-listing activity history** (§4.5) — together with the **listing workspace** (detail panel, §4.5) as the central place for interacting with a single listing, and the deferral of the interactive re-fetch control (§10.2) to a later version. No other behaviour changed.

> This document specifies the **functional behaviour** of the PVP Aste Immobiliari application interface: how each screen is structured, how a user interacts with it, what happens on every click / selection / trigger, and the complete user flows required to accomplish each task.
>
> It is deliberately **implementation-agnostic** and **presentation-agnostic**. It does not prescribe any visual design (no colours, typography, spacing, iconography, or styling), nor any technology (no frameworks, storage engines, network protocols, routes, or endpoints). Where a behaviour depends on something being *visually distinguishable* (for example, that a rating marks its row, or that a status is shown at a glance), the requirement is stated as a behaviour — the specific visual treatment is left entirely to the redesign that follows.
>
> The document is **self-contained**: everything needed to understand or rebuild the interface's behaviour is here.

---

## 1. Introduction

### 1.1 What this application is

**Domain.** In Italy, courts sell off assets through insolvency and enforcement proceedings — real estate, company-share quotas, and assigned credits — and publish these auctions on a single national public portal, **PVP** (*Portale delle Vendite Pubbliche*, the public portal of judicial sales). PVP is the authoritative place where every upcoming judicial auction appears.

**Problem.** PVP is comprehensive but is built for looking at **one listing at a time**. It offers no way to survey the whole upcoming market at once, no way to group opportunities by investment risk, and no independent market-price context to judge whether a property's base price is attractive. An investor who wants a market-wide picture has to page through listings one by one and reason about each in isolation.

**What this application is.** It is a **decision-support dashboard for investors** that turns the raw stream of upcoming judicial auctions into an organized, filterable, and collaboratively reviewable view. In one place a small team can see the whole upcoming market, drill from a country-wide overview down to a single province and a single listing, and record shared judgements as they go.

Its functional pillars — each detailed later in this document — are:

- **Aggregation.** It continuously brings together every upcoming auction, across the relevant asset classes, into one place instead of one-at-a-time portal pages.
- **Risk classification and the two areas.** Each auction is automatically sorted into an investment-**risk cluster**. The interface opens on a choice between two **areas**: **real estate** (whose clusters group listings by geographic risk) and **credits & company shares** (routed by asset type). (§2–§3)
- **Official price context.** Real-estate listings are enriched with official market-price references from **OMI** (*Osservatorio del Mercato Immobiliare*, of the Agenzia delle Entrate), which publishes per-zone price ranges in €/m² — shown next to a selected province so the base price can be judged against the official market. (§3.3)
- **Collaborative review.** A small team reviews listings together: a shared quick verdict (a *rating*) on each listing, a per-listing discussion thread — with rich-text messages and attachments — for anything needing more than a verdict, and a per-listing **workspace** panel that gathers details, actions, history, and the chat in one place. (§4.5, §5–§6)
- **Work distribution.** Each team member receives a daily, deliberately varied set of listings to check, tracked on a personal calendar that records who was assigned what and how much was completed. (§7)
- **Controlled access.** The application is used only through named, authenticated accounts with **user** or **admin** roles; administrative actions are reserved to admins. (§2.1, §8)
- **Never lose an auction.** Once a listing has been seen, it stays retrievable even after it drops off the portal's active list, so nothing silently disappears. (§9)

The remainder of this document specifies the **behaviour of the interface** that delivers all of the above.

### 1.2 Purpose and scope

This document describes **only what the user sees, does, and gets back** from the application. It covers screen composition (which functional regions exist and how they relate), interaction (what each control does), state (what changes in response), and end-to-end flows.

It does **not** describe how auction data is scraped, classified, or stored, except where a UI control *triggers* such work and the user observes progress or a result (§10). It assumes a general-purpose web client and no other client dependency.

The primary language of all on-screen copy is **Italian**. Short control and screen labels are given in Italian because they identify the control; longer messages and confirmations are described by their meaning rather than transcribed.

### 1.3 UI glossary

| Term | Meaning in the interface |
|---|---|
| **Landing screen** | The opening *Scegli una vista* screen offering a choice between two areas. |
| **Area** | One of the two top-level views chosen on the landing screen: **Cluster Immobiliari** (real estate) or **Cluster Crediti** (credits & company shares). |
| **Area view** | The screen shown after picking an area: a header with update metadata and a refresh region, a cluster navigation bar, an **Archivio** entry, and the cluster sections. |
| **Cluster section** | A titled block (*Cluster N: «Name»*) containing region controls (or an explanatory subtitle) and a pair of tabs holding the data tables. |
| **Bucket tabs** | The **Procedure principali** / **Fallimenti** tab pair inside a cluster section; exactly one table is shown at a time. |
| **Drill-down** | The panel that appears under a cluster's region controls once a region is chosen: capital-city choices and province choices. |
| **Price panel** | The OMI €/m² reference shown when a province is selected. |
| **Valutazione cell** | The per-row cell holding the rating controls and the chat entry point. |
| **Listing workspace** | The detail panel (side drawer) opened from a row: full details, rating, activity history, chat, and attachments for one listing. |
| **Rating** | A shared verdict on a listing (good deal / to verify / to avoid) that also marks the row. |
| **Blocco** | A group of listings that are lots of one and the same court proceeding; surfaced as a lot-count badge. |
| **User menu** | The account menu: account name, Calendario, Le mie chat, Amministrazione (admins), and sign-out. |
| **Day view / Month view** | The calendar's two screens: a month grid, and a single day's assigned listings. |
| **Chat / chat thread** | A per-listing discussion. |

---

## 2. Global structure and navigation

### 2.1 Sign-in gate

Every screen and every operation requires a signed-in account.

- An unauthenticated visitor is taken to a **login screen** asking for a username and a password, with a submit action (*Entra*). After a successful sign-in, the user is returned to the screen they originally requested.
- A failed sign-in reports that the username or password is wrong and lets the user try again.
- A session **persists across application restarts**; a sign-out control (in the user menu, §2.5) ends the session and returns to the login screen.
- **First-run bootstrap.** When no accounts exist yet, the application provisions a single initial **administrator** account and announces its credential to the operator out-of-band (not shown in the UI). It exists only so the first real accounts can be created (§8.1).

### 2.2 Landing screen — *Scegli una vista*

The application opens on a centred chooser titled *Scegli una vista* offering two options:

| Area | Label | One-line description |
|---|---|---|
| Real estate | **Cluster Immobiliari** | Property auctions, organized by geographic risk cluster. |
| Credits & shares | **Cluster Crediti** | Auctions of company-share quotas and assigned credits from judicial proceedings. |

Selecting an option **enters that area** on its first cluster. Selecting is the only action; there is no further confirmation.

### 2.3 Area view structure

Entering an area reveals, in order:

- A **back control** (*← Torna alla scelta*) that returns to the landing screen and clears the current view state.
- An **area header**: the area's name, an **update-metadata row** (§10.1), and a **refresh region** (§10.2).
- A **cluster navigation bar**: one entry per cluster (each showing the cluster's **area-local number** and its name), followed by a separated **Archivio** entry. The active entry is highlighted; the bar scrolls sideways if it is too narrow to fit.
- The cluster **sections** and the **archive** section — only one of these is shown at a time, matching the active navigation entry.

### 2.4 Navigation model: local numbering, linkable state, no reloads

- Each area numbers its own clusters **locally, starting at 1**, independent of any internal identifier — so the credits area reads *Cluster 1: Crediti*, *Cluster 2: Partecipazioni*.
- The currently open cluster (or the archive) is captured in the application's **address state**, so a specific view can be **linked to** and is **restored on load**. Moving **back/forward** in the browser moves between previously viewed clusters; returning past the first view shows the landing screen again.
- Switching area, cluster, or tab **never reloads** the page: the visible section changes in place.

### 2.5 User menu

A menu at the top of every screen shows the signed-in **account name** and links to:

- **📅 Calendario** — the user's calendar (§7).
- **💬 Le mie chat** — the user's chat list (§6.3).
- **🛠 Amministrazione** — the administration panel (§8), shown to **admins only**.
- Sign-out (*Esci*).

The menu button carries a **total unread-chat count** across all of the user's threads, visible even while the menu is closed and present on **every** screen (so the signal is reliable even where no listings are shown). The same total appears next to the *Le mie chat* item. The menu closes when the user interacts outside it.

---

## 3. Cluster sections and geographic drill-down

### 3.1 Cluster section header and bucket tabs

Each cluster section shows a header (*Cluster N: «Name»*) and a subtitle describing the cluster's character. Real-estate clusters that map to regions then show a set of **region controls** (§3.2); region-less clusters (the non-geolocated real-estate catch-all, and both credits clusters) show an explanatory focus subtitle instead.

Below the header are two **bucket tabs**, each with a **count badge**; exactly one table is shown at a time:

- **Procedure principali** — ordinary proceedings. A subtitle states which proceeding types are excluded (ordinary real-estate enforcement in either its pre- or post-reform naming, civil litigation, and tax-collection enforcement) and notes that old-law bankruptcy lives on the *Fallimenti* tab.
- **Fallimenti** — old-law bankruptcy proceedings, kept distinct from the successor judicial-liquidation regime. This tab and its table are **set apart** so the old-law context is recognizable at a glance. A subtitle explains the distinction.

Selecting a bucket tab switches which table is visible within that cluster; the other cluster sections are unaffected.

### 3.2 Geographic drill-down (real-estate clusters)

- **Region selection.** A *Tutte le regioni* option plus one option per region present in the cluster. Selecting a region **filters every table in the cluster** to that region and opens the drill-down panel below.
- **Drill-down panel** (built from the region's actual listings):
  - **Capital municipality** — one option per regional capital present, each marked as a capital. Selecting one filters the cluster to that municipality.
  - **Provinces** — a *Tutte le provincie* option plus one option per province present. Selecting a province filters the cluster to that province **and** shows the price panel (§3.3).
  - Capital and province selections are **mutually exclusive**: choosing one clears the other.
- Geographic selection is a **cluster-wide filter**, combined by logical **AND** with each table's own filters (§4.2). Choosing *Tutte le regioni* clears the geographic filter and hides the drill-down.

### 3.3 Price panel (OMI)

When a province is selected, a reference panel shows the official OMI market price for that province:

- A **€/m² range** (minimum–maximum), the property **tipologia** and **stato**, and a caption naming the **OMI zone** used and the source and reference semester (Agenzia delle Entrate — Osservatorio Mercato Immobiliare).
- If no OMI data exists for that province (or it was stored with an error), the panel instead states plainly that OMI data is not available for that province.

---

## 4. Data tables

A listing keeps the **same row shape** wherever it appears; some columns are shown or hidden depending on the table kind (real estate vs credits/shares vs archive).

### 4.1 Columns

| Column | Behaviour / when shown |
|---|---|
| **Tipo di immobile** / **Tipo di bene** | Asset-type label; the wording adapts by kind (real estate vs credits/shares). |
| **Tipo di procedura** | Procedure type. |
| **Disponibilità** | Real-estate tables only — occupancy status shown as a distinct at-a-glance indicator per state (see §4.3) plus its label. |
| **Descrizione** | Credits/shares tables only — an excerpt of the lot description (truncated for display), because for these assets the real value is often stated only there. |
| **N° / Anno** | Proceeding number and year. |
| **Blocco** | A lot-count badge for grouped lots (§4.4). Sortable. |
| **Tribunale** | Court. |
| **Comune / Provincia** | Shown as *N/D* when absent. |
| **Valore richiesto** | Base auction price, formatted as currency; *N/D* when absent. Sortable. |
| **Data pubblicazione / Data vendita** | Publication and sale dates. Sortable (chronological). |
| **Annuncio** | A *Vai all'annuncio →* link opening the public listing in a new tab (see also Appendix B). |
| **Cluster** | Archive table only — each row's cluster of origin (the archive mixes clusters). |
| **Valutazione** | Rating controls plus the chat entry point (§5, §6), always reachable regardless of horizontal scrolling. |

Each table can be scrolled **horizontally within its own container** when it is wider than the viewport; the page body itself never scrolls horizontally. Header cells remain visible while the table body is scrolled vertically.

### 4.2 Toolbar: searching, filtering, sorting

**Per-table toolbar:**

- **Free-text search** (*Ricerca libera…*) — matches anywhere in the row.
- **Column filters** — separate choosers for asset type, procedure type, occupancy (real estate only), and court; each is populated with the distinct values actually present in that table and defaults to an "all" choice.
- **Value range** — two numeric bounds, *Valore da €* and *Valore a €*.
- **Reset filtri** — clears that table's search, column filters, value range, and any block isolation (§4.4).
- **Live count** — shows the number of listings, updating to a *visible / total* form as filters narrow the table.

**Sorting.** The **Blocco**, **Valore richiesto**, **Data pubblicazione**, and **Data vendita** headers are clickable; each toggles ascending/descending and shows the current direction. Value sorts numerically with missing values treated as lowest; dates sort chronologically; **Blocco** sorts by block identity so the lots of one proceeding become adjacent.

All filters — free text, column filters, value range, block isolation — **and** the cluster-wide geographic selection (§3.2) combine with logical **AND**.

### 4.3 Occupancy at a glance (real estate)

Occupancy is both a **column** and a **filter**. Each listing carries a single representative status — *Libero*, *Occupato*, *Occupato senza titolo*, *In corso di liberazione*, *Parzialmente occupato*, or *Non specificato* — shown as a distinct at-a-glance indicator so the table can be scanned quickly, alongside the textual label.

### 4.4 Blocco (grouped lots)

A **blocco** is the set of listings that are lots of one and the same proceeding (same procedure type, court, number, and year). A listing missing any of those four fields is **never grouped**, to avoid false merges. The lot count is computed across the **whole area**, because a proceeding's lots can fall in different regions and therefore in different cluster tables.

- A row belonging to a block of two or more shows a **lot-count badge**. Clicking it **isolates** that block's rows within the current table (the badge shows as active); clicking it again — or using *Reset filtri* — clears the isolation.
- When the block also continues in **other clusters**, an additional control sits beside the badge. Activating it **jumps to the other cluster**: it switches to the correct *Principali*/*Fallimenti* tab, isolates the block there, and brings it into view. If the block spans **more than one** other cluster, a small chooser lists those clusters by name; picking one performs the jump. Interacting outside the chooser dismisses it.

### 4.5 The listing workspace (detail panel)

Tables stay lean on purpose: a row shows only the columns of §4.1, and everything else about a listing lives in the **listing workspace** — a detail panel that opens beside the table (without leaving the current view) and is the central place for interacting with one listing.

**Opening and closing.** Every row exposes two actions, always reachable regardless of horizontal scrolling: one opens the **workspace**, and a **quick chat action** opens the workspace directly on its chat (§6). The open workspace is part of the application's address state, so a specific listing — and a specific part of its workspace — can be linked to and is restored on load. Dismissing the workspace returns to the unchanged table.

**Contents.** The workspace presents, for the selected listing:

- **Details** — every stored fact, including the **full, untruncated description** (tables show at most an excerpt), the key facts of §4.1, geography, dates, and the *Vai all'annuncio →* link (Appendix B applies).
- **Rating** — the same shared Valutazione controls as the row (§5); changes made here and in the row are the same rating.
- **Related lots** — when the listing belongs to a blocco (§4.4), the other lots of the same proceeding, each openable in the workspace in turn.
- **Price context** — for a real-estate listing whose province has OMI data, the same €/m² reference as §3.3, with the same residential-reference caption.
- **Activity history** — see below.
- **Chat** — the listing's discussion thread (§6), embedded as a workspace section.

**Activity history.** The workspace shows a chronological timeline (most recent first) of what happened to the listing inside the application: rating set / changed / cleared (by whom, when), chat thread opened and closed/reopened, attachments added, calendar assignments (who was assigned the listing and for which day), and archival transitions the application observed. Each entry names the actor and the moment; the timeline is read-only. Its purpose is that a teammate opening a listing can immediately see *who did what, when* without asking.

The workspace is available wherever listing rows appear — cluster tables, the archive, and the calendar day view.

---

## 5. Collaborative ratings

For every listing — in every cluster, in the archive, and in the calendar day view — the team shares a single **rating**, set from the row's **Valutazione** cell or from the listing workspace (§4.5); both operate on the same shared verdict.

- Three rating options, each of which also **marks the whole row** to match the verdict:
  - **Ottimo affare** — a good deal.
  - **Da verificare** — needs checking.
  - **Da evitare** — to avoid.
- Selecting the **currently active** rating again **clears** it, returning the listing to the unrated state. Exactly one rating (or none) is active at a time.

**Behaviour:**

- Each change is **saved immediately** to shared storage; clearing removes the stored verdict entirely (an unrated listing stores nothing).
- **Ratings are collective** — any team member's rating is everyone's. The view reconciles with the shared state on a **short recurring interval**, so others' ratings appear **without reloading**.
- A rated listing counts as **completed** for the calendar (§7) — regardless of who rated it — and is never assigned to anyone again.
- There is **no free-text comment** on a rating; written discussion lives in the listing's chat (§6). The Valutazione cell therefore also holds the **chat entry point** (§6.1), which stays reachable no matter how far the table is scrolled.

---

## 6. Per-listing chat

Every listing can have exactly **one discussion thread**, shared by the team — the mechanism for handing a colleague an interesting listing to check.

### 6.1 Entry point and unread indicators

- A **chat control** sits in the Valutazione cell of every row (cluster tables, archive, calendar day view), carrying that thread's **unread count** (a large count is shown capped, e.g. *9+*). Activating it opens the thread.
- Unread counts refresh on a short recurring interval. The **total** across all of the user's threads appears on the user-menu button and on the *Le mie chat* item, on **every** screen.

### 6.2 Chat thread screen

Reached by opening a listing's chat. **Opening a thread makes the opener a participant** and marks the thread read for them.

- **Header:** the thread title (asset type and court); for admins, a **close/reopen** control. Below it, the listing's key facts (procedure type, place, value, and a *Vai all'annuncio →* link) — or a placeholder noting the listing is no longer in the database but the thread remains readable, if the listing was later removed. Then the **participant list** and — unless the thread is closed — a control to **add a colleague** to the thread. Adding a colleague hands them the entire existing conversation as unread.
- **Messages:** a scrollable list of messages, each showing its **author** and **timestamp** above the message body; the current user's own messages are distinguished from others'. A message body is **rich text** limited to a small, fixed set of formats — bold, italic, bulleted and numbered lists, and links; nothing else survives (pasted content is reduced to that set by one rule applied identically at first display and on every sync). Web links pasted as plain text are made **clickable** by that same rule. New messages arrive **without reloading** on a short recurring interval; the view auto-scrolls only when the user is already near the bottom. An empty thread invites the user to write the first message.
- **Attachments:** a message may carry one or more **file attachments** (images and documents), subject to declared per-file size and type limits; an oversized or disallowed file is refused with a clear message before sending. Image attachments show an inline **preview**; every attachment offers a **download** action showing its name and size. Attachments in a closed thread remain downloadable. Attachment activity is recorded in the listing's activity history (§4.5).
- **Compose:** a rich-text input (length-limited, offering exactly the formats above), an attach action, and a send action. A message must contain text, at least one attachment, or both.
- **Closed state (admins).** Closing a thread shows a notice that it is closed and stays readable but accepts no new messages or participants; it also stops counting toward unread indicators. The compose and add-colleague controls are hidden. An admin can **reopen** it. Closing asks for confirmation first.

### 6.3 *Le mie chat* list screen

Reached from the user menu; lists every thread the user participates in, most-recent activity first.

- Each item shows the listing title, an **unread indicator** and a **closed** marker where applicable, a meta line (place and value, or a *removed from archive* note for a removed listing), a **preview** of the last message (author and a short snippet, or a note that there are no messages yet), and the participant list. Unread items are **emphasized**; items whose listing was removed are **de-emphasized and not openable**.
- When the user participates in no threads, the screen explains where to start a chat (the chat control on a listing row, in the dashboard, the archive, or the calendar).

---

## 7. Calendar of assigned procedures

Every account has a personal calendar that distributes listings to review, one set per day. Reached from the user menu.

### 7.1 Month view

- A month grid (weeks running Monday–Sunday) with **previous/next** navigation and **today** distinguished.
- Each day that has assignments shows a **completed / assigned** badge (e.g. *3/18*), distinguished by progress: none complete, some complete, all complete. A day carrying at least one assigned listing rated *Ottimo affare* or *Da verificare* is **flagged as actionable**.
- A **legend** explains that a day's listings are assigned automatically the first time it is opened (real estate only, today only), that the badge is completed/assigned, and that a rating marks completion permanently.
- Selecting a day opens its day view.

### 7.2 Day view

- A heading naming the date and a live **progress line** (*N di M completate*) that stays in sync with the shared ratings on a short recurring interval.
- A table of the day's listings: (admins only) the internal **ID**, then asset type, procedure type, **Blocco** badge, court, region/province/municipality, occupancy, base price, sale date, a *Vai all'annuncio* link, and the shared **Valutazione** cell (§5). When nothing is assigned for the day, the table says so.

### 7.3 Assignment semantics

- **Automatic, once per day.** The first time a user opens **today's** day view, the system assigns a target of **18** listings. Assignment then **freezes**: the calendar is a stable history and is never regenerated on reopening, even if the active pool has since changed.
- **Diversification.** An assigned set is spread across **different regions and different price bands** (below €100k / €100k–€400k / above €400k; unknown values fall in the middle band) rather than a run of near-identical listings.
- **Eligibility.** Automatic assignment draws only from **active real-estate listings** under the dashboard's exclusion rules; credits and company shares are never drawn automatically. A **completed** listing (rated by anyone) is never assigned again, to anyone, on any day.
- Manual admin assignment (random, by-id, and removal) is described in §8.3.

---

## 8. Administration (admins only)

Reached from the user menu. Non-admins cannot reach it and are refused. The internal listing **ID** is visible only on admin surfaces.

### 8.1 Accounts

- **Create account:** a form with a username, a password, and a **role** choice (**Utente** / **Amministratore**), and a create action. A duplicate username is refused with a clear message; success confirms the account was created.
- **Existing accounts:** a table of accounts showing username, role, state (active / disabled), and creation date, with per-account **lifecycle actions**:
  - **Change password** — an admin sets a new password for the account (entered twice; the change takes effect immediately, and the account's other active sessions end).
  - **Change role** — switch between *Utente* and *Amministratore*. An admin cannot remove their own admin role if they are the last active administrator; the attempt is refused with a clear message.
  - **Disable / re-enable** — a disabled account cannot sign in and its sessions end at once, but everything it produced (ratings, messages, assignments, history entries) remains attributed and untouched. Disabling is refused for the last active administrator. Accounts are never deleted.
  - Each lifecycle action asks for confirmation and reports its outcome. Lifecycle actions are the one administrative surface that touches other people's access, so each is also recorded (actor, action, moment) and visible to admins.
- **First sign-in password change.** An account created by an admin — including the first-run bootstrap administrator — is created with a starting password; on its **first successful sign-in** the application requires the user to set a new password before anything else.
- Two links lead onward: to **calendar assignment** (§8.3) and to the **extraction-category** selection (§8.2).

### 8.2 Extraction categories

A grouped set of checkboxes that chooses which **procedural categories** a real-estate refresh **keeps** in the data. The categories are presented under four groups (insolvency proceedings; voluntary liquidation & voluntary jurisdiction; enforcements; civil litigation). Saving confirms the choice will apply at the next real-estate refresh.

The panel states plainly that the choice **does not shorten a refresh run** (every refresh still fetches the full active set; the selection only decides what is stored afterwards), and that listings dropped by a narrowed selection are **archived, not deleted** (§9).

### 8.3 Calendar assignment (admins)

Three tasks on the assignment screen:

1. **Random assignment (real-estate auctions only).** Choose a **user**, a **day**, and a **quantity** (1–200, default 18), then assign. Same diversification and eligibility as the automatic daily assignment; repeated runs **add** without duplicating that day's existing assignments and never draw completed listings or credits/shares.
2. **Remove assigned procedures.** Pick a user and a day, list what was assigned, then select rows (including a select-all) and remove them. Removal **severs the calendar link only** — it never deletes the listing or any rating it carries.
3. **Assignment by ID (also credits & company shares).** A search (by id, court, municipality, region, or description) lists matching listings with a selectable checkbox, the **ID**, an area marker (real estate vs corporate), type, court, **Blocco** badge, place, value, and a **completed** state where already rated (shown disabled). Selecting rows and choosing a user and day assigns them — the **only** path by which credits/company shares can enter someone's calendar. Ids that don't exist or are already completed are skipped and reported.

---

## 9. Archive and same-session past-sale handling

### 9.1 Archivio

Each area has its own **Archivio** section holding two kinds of rows:

1. **Permanent archive** — listings marked archived because they disappeared from the source's active list (including listings dropped by a narrowed extraction-category selection, §8.2). These are delivered to the client and shown permanently, so a listing seen yesterday is still findable today; they are marked as genuinely withdrawn.
2. **Same-session moves** — still-active listings whose sale date has merely passed, moved in by §9.2 for the current session only.

The archive table has its own free-text search, value-range filter, reset, and sorting, plus a per-row **Cluster** column showing origin (the archive mixes clusters). Ratings work on archived rows exactly as elsewhere. When the archive is empty, it says so.

### 9.2 *Aggiorna alla data odierna*

A header control (also run automatically on load) scans all non-archive tables and **moves any row whose sale date is before today** (by the viewer's own clock) into the Archivio of its area, then re-evaluates the archive tables' counts and empty states. It reports how many sales were moved and the new archive total. This is a **cosmetic, same-session** reorganization, distinct from the permanent archive.

### 9.3 *Svuota archivio*

One guarded control per area:

- It removes only the **same-session, still-active-but-past** rows currently in that area's archive; it **never** touches genuinely-withdrawn rows (a protection enforced by the shared backend regardless of what the client requests).
- If nothing is eligible, it says there is nothing to clear (and notes that listings that vanished from the source always remain). Otherwise it asks for confirmation, stating how many still-active-but-past rows would be removed and that permanently-withdrawn listings stay, then performs the removal.

---

## 10. Data-refresh UI

### 10.1 Refresh metadata

Each area header shows an update-metadata row: **when** the area's data was last fetched from the source (or that it never has been), **how many** active listings were analyzed out of the total found, and — real estate only — **how many** were excluded by the exclusion rules. Before an area's first refresh, these degrade to sensible fallbacks.

### 10.2 Requesting a fresh re-fetch — **deferred (v1.1)**

> **Deferral note (2026-07, approved):** the data-acquisition system performs **scheduled runs only** and offers no way for an application to trigger one; building that hand-off requires a change on the acquisition side. The interactive re-fetch control below is therefore **not part of the first version**: in v1 the refresh region shows the §10.1 metadata and states when the next scheduled refresh is expected. The behaviour below is retained as the specification of the future control.

- Each area's refresh region holds a control that **requests a fresh re-fetch of that area's data** and a note that this may take on the order of ten minutes. Activating it starts the request and disables the control so it cannot be triggered twice.
- Progress is reported in an inline status line as it proceeds — enumerating the active listings, then fetching details with a running count, then completion (after which the view refreshes with the new data) — or an error message on failure. If the request cannot be reached, the interface says so and re-enables the control.

> This is the one place the interface touches data acquisition, and it does so only by **requesting** a re-fetch and reporting progress. The mechanics of acquiring the data are out of scope for this document.

---

## 11. Cross-cutting UX behaviour

- **Responsiveness.** The interface is usable across window sizes; headers, chip rows, and toolbars wrap as needed. Wide tables scroll **inside their own container**; the page body never scrolls horizontally. The calendar and administration screens are width-capped and centred.
- **Accessibility.** Every interactive element is **keyboard-operable** and shows a clear **focus indication**. Filters and inputs are labelled. The cluster navigation and bucket tabs, the user menu, and modal dialogs expose their roles and state to assistive technology (which control is a tab list, which tab is selected, that a menu can be expanded, that a dialog is modal). The interface honours a user's **reduced-motion** preference.
- **Performance at scale.** The dashboard routinely renders **thousands** of rows. Rating a row, filtering, sorting, and real-time sync must stay responsive at that scale — a single action must never degrade into a multi-second stall as the row count grows. (The requirement is the responsiveness, not any particular technique for achieving it.)

---

## Appendix A — Screen inventory

| Screen | Purpose | Access |
|---|---|---|
| Login / sign-out | Authenticate and end sessions (first sign-in forces a password change) | Public / any signed-in |
| Dashboard (landing + both areas) | Browse, filter, rate, drill down | Any signed-in |
| Listing workspace (panel) | Full details, rating, related lots, activity history, chat, attachments for one listing | Any signed-in |
| Calendar month view | Overview of assigned days | Any signed-in |
| Calendar day view | A day's assigned listings (auto-assigns on first open of today) | Any signed-in |
| *Le mie chat* list | The user's chat threads | Any signed-in |
| Chat thread | A per-listing discussion (opening joins as participant) | Any signed-in |
| Administration — accounts | Create/list accounts; links onward | Admin |
| Administration — extraction categories | Choose which procedural categories are stored | Admin |
| Administration — calendar assignment | Random / by-id / remove assignments | Admin |

---

## Appendix B — Easter eggs

These are deliberate, non-serious interaction behaviours, documented for completeness and kept out of the main specification. Only their behaviour is specified here; any specific media they present is a presentation detail left to the redesign.

- **High-value confirmation.** Opening the public listing (*Vai all'annuncio →*) of any auction whose base value exceeds **€ 5.000.000** intercepts the action and shows a themed confirmation dialog with a proceed choice (which opens the listing in a new tab) and a dismiss choice. Pressing escape or interacting outside the dialog dismisses it.
- **Roccaraso / L'Aquila.** Selecting the **province** drill-down choice for **L'Aquila** (the province, not the same-named capital) shows a themed dialog with a single dismiss action. The same dialog appears when opening the listing of any auction whose municipality is **Roccaraso** — and there the single action is the only way through: it both dismisses the dialog and opens the listing.
