# Domain Rules — the Read-Time Classification Contract

> Companion document to [`SPECIFICATIONS.md`](SPECIFICATIONS.md), expanding §5. Everything in this document is a **pure function of stored listing fields** (`DATA_MODEL.md` Part A §3.1): no rule reads anything else, no rule writes anything, and no classification is ever stored. The rules are implemented **once**, in `packages/shared/domain/`, as pure TypeScript functions with exhaustive unit tests (`TESTING.md` §2), and consumed by the server's snapshot builder. Changing a rule is a constant edit — effective on the next snapshot rebuild, with no migration and no re-scrape.

## 1. The two areas

Every listing belongs to exactly one **area**, decided by its stored `scope` field (never derived from asset codes):

| `scope` | Area | Clustered by |
|---|---|---|
| `immobili` | **Cluster Immobiliari** (real estate) | Geographic risk (§2) |
| `corporate` | **Cluster Crediti** (credits & company shares) | Asset type (§3) |

## 2. Real-estate clusters (by `regione`)

A real-estate listing is assigned to exactly one of five clusters by its `regione` value. Matching is exact against the region names as PVP labels them (the fixture set in `seed/` carries the canonical spellings).

| # | Name | Character | Regions |
|---|---|---|---|
| 1 | **Red Zone** — Core Tradizionale | High yield, high operational risk (organized-crime presence, very slow courts) | Campania, Sicilia, Calabria, Puglia |
| 2 | **Blue Chip Zone** — Cash Flow Generativi | High liquidity, fast absorption, silent economic infiltration | Lombardia, Lazio, Piemonte, Emilia-Romagna, Veneto, Toscana |
| 3 | **Green Zone** — Basso Rischio / Basso Rendimento | Low operational risk, defensible bureaucracy | Friuli-Venezia Giulia, Trentino-Alto Adige, Marche, Umbria, Abruzzo, Sardegna, Liguria |
| 4 | **Grey Zone** — Volumi Ridotti | Micro-markets, low liquidity, risk of capital lock-up | Molise, Basilicata, Valle d'Aosta |
| 5 | **Black Zone** — Non Geolocalizzati | Catch-all for listings PVP does not geolocate in its structured fields | (assigned by absence: `regione` is null **or** not one of the 20 recognized regions) |

The three geography fields are null together when PVP recorded only a free-text address (`DATA_MODEL.md` §3.1) — such listings land in the Black Zone by the absence rule. An unrecognized region spelling also lands in the Black Zone (defensive default), and the snapshot builder logs it: it means either a PVP labeling change or a constants gap.

## 3. Credits & company-shares clusters (by `cod_tipo_categ_lotto`)

Two clusters, numbered locally within their area (UI §2.4):

| Area-local # | Name | Routed by |
|---|---|---|
| 1 | **Crediti** — Cessione di Crediti | `cod_tipo_categ_lotto == "CREDITI"` |
| 2 | **Partecipazioni** — Quote Societarie | `cod_tipo_categ_lotto == "QUOTA_SOCIETARIA"` |

The scraper's corporate scope stores only these two categories, so the routing is total in practice; a corporate listing with any other (or null) code — possible if the scraper's scope definition ever widens — falls to **Crediti** as the defensive default, logged by the snapshot builder. For both clusters the real value is often stated only in `descrizione` (hence the tables' Descrizione excerpt column, UI §4.1) and `valore_richiesto` is legitimately `0` for many credits — **zero is a value, not a gap**, and must sort and filter as such.

## 4. The bucket split: Procedure principali vs Fallimenti

Within every cluster (both areas), listings split into exactly two buckets by `cod_tipo_rito`:

- **Fallimenti** — `cod_tipo_rito` ∈ { `FALL`, `NFAL` }: proceedings under the old bankruptcy law, kept visually distinct from the successor Liquidazione Giudiziale regime (UI §3.1).
- **Procedure principali** — everything else, including null/unknown rito codes.

## 5. Exclusion rules (real estate only)

Real-estate listings whose proceeding is an **ordinary real-estate enforcement** (pre- or post-Cartabia naming), **civil litigation**, **movable-goods enforcement**, or **tax-collection enforcement** are **excluded from every cluster and from automatic calendar assignment** (§8). They are not hidden data — they are counted, and the count is shown in the area header (§10). The rules never apply to the corporate scope.

**Rule:** a listing is excluded when `cod_tipo_rito` is in the exclusion set:

| Code | Label (Italian) | Excluded group |
|---|---|---|
| `EI80` | Esecuzione Immobiliare Post Legge 80 | Ordinary enforcement (pre-Cartabia) |
| `ESIM` | Esecuzione Immobiliari | Ordinary enforcement (pre-Cartabia) |
| `EICA` | Espropriazione Immobiliare (cartabia) | Ordinary enforcement (post-Cartabia) |
| `ESMO` | Esecuzioni Mobiliari Con Vendita | Movable enforcement |
| `EV80` | Esecuzioni Mobiliari Con Vendita Post Legge 80 | Movable enforcement |
| `EMCA` | Espropriazione Mobiliare (cartabia) | Movable enforcement |
| `ESECESATTIMM` | Esecuzioni Esattoriali Immobiliari | Tax-collection enforcement |
| `CONTCIV` | Contenzioso Civile | Civil litigation |

Null or unrecognized `cod_tipo_rito` is **never excluded** (the same fail-open posture as the scraper's category selection — an unknown code must never silently vanish from view). The set lives in one constants module in `packages/shared` beside the Appendix A catalog, deliberately easy to edit.

> **Verification note.** The stored `cod_tipo_registro` field partitions proceedings along the same lines and was the pilot's exclusion input; its concrete values are not documented here. The rito-code table above expresses the same intended partition through the documented catalog. During the first live-data phase (Execution Plan Phase 4's live smoke), compare the two signals on real data; if `cod_tipo_registro` distinguishes cases the rito set misses, record the observed values in this section and switch the implementation — the rule's *meaning* (the four excluded groups above) is the contract, the code set is its current encoding.

## 6. Blocco (grouped lots)

A **blocco** is the set of listings that are lots of one and the same court proceeding.

- **Grouping key:** the exact tuple (`tipo_procedura`, `tribunale`, `numero`, `anno`). A listing with **any** of the four fields null is **never grouped** — no partial-key matching, ever (false merges are worse than missed groups).
- **Counted area-wide:** the lot count spans the listing's whole area (a proceeding's lots can fall in different regions, hence different clusters), computed over **active** listings of the area. UI behaviours (badge, isolation, cross-cluster jump) are UI §4.4.
- The four key fields are load-bearing on the scraper side (`DATA_MODEL.md` §8) — the key definition here must never be "improved" unilaterally.

## 7. Price bands

Three bands over `valore_richiesto`, used by calendar diversification (§8) and available as a filter dimension:

| Band | Rule |
|---|---|
| **Bassa** | `valore_richiesto` < 100 000 |
| **Media** | 100 000 ≤ `valore_richiesto` ≤ 400 000, **or `valore_richiesto` is null** (unknown falls in the middle band) |
| **Alta** | `valore_richiesto` > 400 000 |

Note the asymmetry with sorting: for **sorting**, missing values are treated as lowest (UI §4.2); for **banding**, missing values fall in the middle. Both rules are deliberate and live side by side in the shared module.

## 8. Calendar diversification and eligibility

**Eligibility** (automatic assignment, UI §7.3): a listing is eligible when — `scope == "immobili"`, `archived_at == null`, not excluded (§5), never completed (no `assignment_index` entry with `completed_at` set — a rating by anyone completes a listing permanently), and never previously assigned to anyone (no `assignment_index` entry at all). Corporate listings are never eligible automatically; the admin by-id path is their only calendar entry (UI §8.3).

**Diversification** (target N, default 18): the assigned set must spread across regions and price bands rather than run near-identical. Algorithm (deterministic given the pool and a shuffle seed):

1. Partition the eligible pool by (cluster, price band) — 5 clusters × 3 bands = up to 15 cells, many possibly empty.
2. Shuffle within each cell.
3. Draw round-robin across non-empty cells (cells ordered by cluster then band) until N listings are drawn or the pool is exhausted.
4. If the pool is smaller than N, assign the whole pool — a short day is correct, never padded.

Admin **random assignment** uses the same engine with the admin's chosen N (1–200), **adding** to the day's existing set without duplicating and never drawing ineligible listings.

## 9. OMI display rules

`omi_prices` is keyed per *(provincia, comune)* and its reference is **always residential** (`DATA_MODEL.md` §4). Display rules:

- **Province selected** (UI §3.3): the panel shows the document of the **province's capital comune** (the drill-down already knows the capitals present); the caption names the comune and OMI zone actually used, the `tipologia`/`stato`, the source (Agenzia delle Entrate — OMI) and `semestre`.
- **Capital municipality selected:** the same panel semantics, for that comune's document.
- **Workspace price context** (UI §4.5): the listing's own `comune` document when present, else its province capital's, with the caption naming which comune the figure belongs to.
- **No data:** a document with `error` set, or no document — the panel states plainly that OMI data is not available (UI §3.3); do not distinguish the two cases to the user.
- **Always caveat the reference class:** the caption must state the figure is a *residential* (`tipologia`) reference — next to a non-residential listing it is context, not a comparable.

## 10. Refresh-metadata mapping (UI §10.1)

The one place header figures come from mixed sources — fixed here so no implementer re-derives it differently:

| Header figure (per area) | Source |
|---|---|
| "Last fetched" moment | `meta/{scope}.last_success_at` (`meta/omi.fetched_at` + `semestre` for the OMI caption) |
| "Analyzed" | `meta/{scope}.total_stored` |
| "Total found" | `meta/{scope}.total_active` |
| "Excluded by exclusion rules" (immobili only) | **Computed by the snapshot builder**: count of active immobili listings excluded per §5 — *not* a `meta` field, and distinct from the scraper's `excluded_by_selection` (which concerns the §7-Part-A category selection, not these read-time rules) |
| Never-fetched fallback | `meta` document absent → the UI's sensible-fallback state |

## 11. Same-session past-sale rule (UI §9.2)

A row moves to the session Archivio when `data_vendita < today` in the **viewer's** timezone (string comparison of `YYYY-MM-DD` against the client's local date — the dates are timezone-less by contract). A listing with `data_vendita == null` is **never** moved. This is client view state; nothing is written (`SPECIFICATIONS.md` §14).

## 12. Procedura concorsuale matching (`DATA_MODEL.md` §17)

A listing is joined to at most one `procedure_concorsuali` document, by the exact tuple `(tribunale key, numero, anno)` — never a fuzzy or partial match, same discipline as blocco grouping (§6).

**Tribunale-key normalization** — applied identically to `listings.tribunale` and to `procedure_concorsuali.tribunale.nome` (the source collection already ships the normalized form as `tribunale.chiave`, computed by the scraper the same way; this function exists here so the **listing's own** raw `tribunale` string can be normalized to the same key before lookup):

1. Unicode-normalize and strip accents/diacritics/apostrophes (`Forlì` / `Forli'` → `FORLI`).
2. Strip a leading `"Tribunale di"` or `"Tribunale (ordinario) di"` (with or without the parenthesized word) prefix.
3. Uppercase; collapse whitespace/punctuation runs to a single space; trim.
4. Apply the override table below (dataset spelling → the *portale creditori* source's own abbreviated spelling), since PVP occasionally spells out a historical court merger in full where the source collection abbreviates it:

| PVP-side normalized form | Overridden to |
|---|---|
| `NAPOLI NORD IN AVERSA` | `NAPOLI NORD` |
| `VICENZA EX BASSANO DEL GRAPPA` | `VICENZA EX BASSANO` |

**Match key construction:**

- Listing side: `tribunaleKey(listings.tribunale) + listings.numero + listings.anno`; `null` (never attempted) if any of the three source fields is `null`.
- Procedure side: keyed by `procedure_concorsuali.tribunale.chiave + rg.numero_base + rg.anno` (already-normalized fields — no re-normalization needed on this side, `rg.numero_base` not `rg.numero`, per `DATA_MODEL.md` §17.1).

**Two display states, both non-error** (`DATA_MODEL.md` §17.2):

- **No match** — render nothing extra; this is the default outcome for most listings, not a state to caption or explain.
- **Match found, `scheda_letta_il` still null** — show the matched procedure's `nome`/`tipo_code`/`tribunale` and state that debtor details aren't collected yet; never show a `debitore` section with all-null fields as if it were populated.
- **Match found, `scheda_letta_il` set** — show the full `debitore` facts (ragione sociale, codice fiscale, città, indirizzo) alongside `tipo_procedura`, `professionista`, `giudice_delegato`.

**Table indicator:** every listing row carries a boolean, computed the same way (a match exists in the lookup map, regardless of whether its detail has been read yet) — a small presence indicator, not a data preview; the workspace detail panel is where the actual facts render.

## Appendix A (informative) — Procedural-category catalog

The full rito-code catalog observed on real-estate listings, with the four-group presentation the admin panel renders as grouped checkboxes (UI §8.2). The **default selection** — in effect when `settings/extraction_categories` is absent — is the "base" insolvency set:

`ASP, COPR, CP, LCAM, LCA, LG, LIQUVOLGIU, NUCP, FALL, NFAL`

| Code | Label (Italian) | Group |
|---|---|---|
| ASP | Amministrazione Straordinaria Prodi Bis (cci) | Procedure concorsuali |
| CM | Concordato Minore (cci) | Procedure concorsuali |
| COPR | Concordato Preventivo | Procedure concorsuali |
| CP | Concordato Preventivo Omologato (cci) | Procedure concorsuali |
| CSCI | Concordato Semplificato (cci) | Procedure concorsuali |
| LCAM | Liquidazione Coatta Amministrativa | Procedure concorsuali |
| LCA | Liquidazione Coatta Amministrativa (cci) | Procedure concorsuali |
| LC | Liquidazione Controllata (cci) | Procedure concorsuali |
| LDPD | Liquidazione del Patrimonio del Debitore | Procedure concorsuali |
| LG | Liquidazione Giudiziale (cci) | Procedure concorsuali |
| NUCP | Nuovo Concordato Preventivo | Procedure concorsuali |
| PDCC | Piano del Consumatore | Procedure concorsuali |
| PRO | Piano di Ristrutturazione Omologato (cci) | Procedure concorsuali |
| RD | Ristrutturazione dei Debiti (cci) | Procedure concorsuali |
| FALL | Fallimentare | Procedure concorsuali |
| NFAL | Fallimentare (nuovo rito) | Procedure concorsuali |
| ADCC | Accordo di Composizione della Crisi | Procedure concorsuali |
| PU09 | Ricorso Concordato Minore | Procedure concorsuali |
| PU02 | Ricorso Fissazione Termine per Deposito Proposta o Accordi | Procedure concorsuali |
| PU10 | Ricorso Liquidazione Controllata | Procedure concorsuali |
| PU03 | Ricorso per Ammissione Concordato Preventivo | Procedure concorsuali |
| PU05 | Ricorso per la Dichiarazione Stato Insolvenza (lca) | Procedure concorsuali |
| PU01 | Ricorso per Liquidazione Giudiziale | Procedure concorsuali |
| PU11 | Ricorso per Omologazione Piano di Ristrutturazione | Procedure concorsuali |
| PU08 | Ricorso Ristrutturazione Debiti del Consumatore | Procedure concorsuali |
| LIQUVOLGIU | Liquidazione Volontaria - Giudiziale | Liquidazione volontaria e volontaria giurisdizione |
| VOLGIU | Volontaria Giurisdizione | Liquidazione volontaria e volontaria giurisdizione |
| EI80 | Esecuzione Immobiliare Post Legge 80 | Esecuzioni |
| ESIM | Esecuzione Immobiliari | Esecuzioni |
| EICA | Espropriazione Immobiliare (cartabia) | Esecuzioni |
| ESMO | Esecuzioni Mobiliari Con Vendita | Esecuzioni |
| EV80 | Esecuzioni Mobiliari Con Vendita Post Legge 80 | Esecuzioni |
| EMCA | Espropriazione Mobiliare (cartabia) | Esecuzioni |
| ESECESATTIMM | Esecuzioni Esattoriali Immobiliari | Esecuzioni |
| CONTCIV | Contenzioso Civile | Contenzioso civile |

A code missing from this table is handled fail-open by the scraper (always stored) and by this project (never excluded, shown in *Procedure principali*); the admin panel lists unknown observed codes in a fifth "unrecognized" group, checked and non-uncheckable, so the fail-open posture is visible rather than silent.
