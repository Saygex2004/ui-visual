# FAQ — Stack Frontend e superficie API

> Risposte a tre domande sull'`ui-execution-plan`: **come viene usato React**, **quale framework** (Next.js?), e **se esistono API potenzialmente raggiungibili da altre applicazioni**. Le fonti sono i documenti del piano; i riferimenti puntano ai file originali.

## 1. Come viene usato React?

React è usato come **SPA (Single Page Application) pura**, non come applicazione con rendering lato server. È l'app `apps/web` del monorepo `pvp-dashboard`, che l'API Fastify (`apps/server`) alimenta come unico client di prima parte.

Lo stack attorno a React è (vedi [`specifications/FRONTEND.md`](specifications/FRONTEND.md) e [`execution-plan/REPOSITORY_STRUCTURE.md`](execution-plan/REPOSITORY_STRUCTURE.md)):

| Ambito | Tecnologia | Note |
|---|---|---|
| Build / dev server | **Vite** | `index.html` + `vite.config.ts`; nessun bundler/framework meta |
| Componenti UI | **Radix UI** (primitive open-source) | tabella custom (`<table>` + `@tanstack/react-virtual`) per le migliaia di righe; primitive Radix stilizzate a mano sui token (FRONTEND §4–§5) |
| Routing | **TanStack Router** | route tipizzate, search params validati con Zod da `packages/shared` (FRONTEND §2) |
| Data layer | **TanStack Query** | polling per-key con le cadenze dell'API contract (FRONTEND §3) |
| Validazione tipi | **Zod** (da `packages/shared`) | gli stessi schemi validati dal server sono importati dal client |
| i18n | **react-i18next** | locale unico iniziale `it`; nessuna stringa hardcoded (FRONTEND §6) |
| Design system | **Hallmark** → `theme/tokens.css` (chiaro + scuro) | token come unica fonte, no hex/font literal; stile modern-enterprise blu/bianco + dark mode (FRONTEND §5) |

Punti chiave dell'uso di React:
- **Organizzazione per feature** (`features/auth`, `dashboard`, `workspace`, `ratings`, `chat`, `calendar`, `archive`, `admin`) più `app/` (router, provider, auth guard, shell), `i18n/`, `theme/`, `lib/`. Il riuso cross-feature passa solo da `ratings/` e `lib/`, non da import profondi tra feature.
- **La logica di dominio non viene reimplementata nel frontend**: la classificazione arriva pre-calcolata nello snapshot; eventuali regole client sono importate da `packages/shared`.
- **Lo stato è nell'URL**: tutto ciò che la spec chiama "linkabile/ripristinabile" vive nei search params (deep-link al workspace, cluster, filtri, tab). Il resto è stato locale/di Query.

## 2. Quale framework? Next.js?

**No, non viene usato Next.js** — né alcun framework con SSR/SSG.

- L'architettura è **React SPA con Vite**, servita come **asset statici da Firebase Hosting (CDN)**. Non c'è rendering lato server dell'HTML: `Browser → Firebase Hosting (SPA statica)`, con rewrite `/** → /index.html` (vedi [`specifications/DEPLOYMENT.md`](specifications/DEPLOYMENT.md) §1).
- Il "backend" **non è** una funzionalità del framework frontend: è un servizio separato, l'**API Fastify** `apps/server`, che gira su **Cloud Run** e a cui l'Hosting inoltra `/api/**` tramite rewrite. Descritto in [`execution-plan/00_OVERVIEW.md`](execution-plan/00_OVERVIEW.md) §1 come «una SPA React + Radix UI (`apps/web`) e un'API Fastify (`apps/server`)».

Quindi il modello è **due deploy distinti** (SPA statica + API container), non un'app Next.js full-stack unica.

## 3. Ci saranno API raggiungibili da altre applicazioni?

**Tecnicamente esistono API REST, ma sono progettate esplicitamente per NON essere una superficie pubblica raggiungibile da altre applicazioni.** L'intento è servire un unico client di prima parte (la SPA), non esporre un'API di integrazione.

L'API è documentata per intero in [`specifications/API_CONTRACT.md`](specifications/API_CONTRACT.md): base path `/api`, JSON, con aree `/auth`, `/areas`, `/listings`, `/ratings`, `/chats`, `/attachments`, `/calendar`, `/admin`, più `/healthz` e `/readyz`.

Perché **non** è pensata come API pubblica/inter-app:

- **Stesso origine, niente CORS.** In produzione la SPA e l'API vivono sullo stesso dominio: Firebase Hosting fa da rewrite `/api/**` → Cloud Run, così i cookie sono first-party e **non esiste alcuna superficie CORS** (DEPLOYMENT §1). Un'altra web app da un origine diverso verrebbe bloccata dal browser.
- **Autenticazione a cookie di sessione httpOnly** su ogni route tranne `POST /api/auth/login` e `/healthz`/`/readyz`. Niente API key, niente token bearer, nessun meccanismo pensato per client server-to-server (API_CONTRACT §1–2).
- **Nessun versionamento in v1**, con motivazione esplicita: *"one first-party client, deployed with the server; breaking changes are coordinated deploys"* (API_CONTRACT §1). È il segnale progettuale che non si prevedono consumatori esterni.
- **Regole di sicurezza deny-all** su Firestore e Storage: solo l'Admin SDK del server può accedere ai dati; nessun client (incluse eventuali altre app) può leggere il database direttamente (DEPLOYMENT §3).
- **Ruoli** applicati lato server: le route `/admin` e alcune azioni sono admin-only (`403` altrimenti), e finché `must_change_password` è attivo quasi tutte le route rispondono `403`.

### Sfumature / eccezioni

- **URL di download firmati e a breve scadenza** per gli allegati: `GET /attachments/:id/url` restituisce un URL temporaneo verso Storage (API_CONTRACT §6). È l'unico caso in cui una risorsa è raggiungibile fuori dal cookie di sessione, ma solo per il tempo di validità e dopo il controllo dei permessi sul thread.
- **Endpoint di salute** `/healthz` e `/readyz` sono senza autenticazione per le probe di Cloud Run (API_CONTRACT §9, DEPLOYMENT §5) — non espongono dati.
- **Integrazione futura con lo scraper (v1.1)**: l'unico "canale inter-applicazione" previsto non è via HTTP ma tramite un documento Firestore condiviso (`refresh_requests/{scope}`) che il progetto scraper leggerebbe in polling (DEPLOYMENT §6). Resta fuori dalla v1 e non introduce un'API pubblica.

**Conclusione:** l'API è un backend-for-frontend privato, same-origin e a sessione, non un'API di integrazione. Renderla consumabile da altre applicazioni richiederebbe scelte oggi assenti e sconsigliate dalla spec (CORS, autenticazione machine-to-machine, versionamento, contratto di stabilità) — una decisione da prendere deliberatamente, non un effetto collaterale dell'architettura attuale.

## 4. Siamo sicuri che NON usare un framework React sia la scelta migliore?

**Sì, per questo progetto è la scelta giusta.** Un framework come Next.js serve soprattutto per tre cose che qui **non servono**:

1. **SEO e rendering lato server (SSR):** utile per siti pubblici che devono comparire su Google. Qui l'app è **protetta da login per un team interno** — nessun motore di ricerca la vede, quindi l'SSR non porta nulla.
2. **Caricamento veloce per utenti anonimi:** riguarda pagine pubbliche/marketing. Qui non esistono.
3. **Struttura e convenzioni per team grandi:** già coperte dallo stack scelto.

Perché la SPA "semplice" (React + Vite) è la scelta migliore qui:

- L'app è per natura un **client "pesante"**: scarica i dati e fa **filtri, ordinamento e ricerca nel browser**, con tabelle da migliaia di righe. È lo scenario ideale per una SPA.
- Il backend è **già un servizio separato** (Fastify) con una **cache in memoria** che richiede `max-instances = 1`. Il server di Next.js sarebbe **ridondante e in conflitto** con questo design.
- La **sicurezza dei tipi end-to-end** è già ottenuta senza framework, grazie agli schemi Zod condivisi, a TanStack Router e TanStack Query.
- **Meno complessità:** una SPA statica su CDN + un container API è più semplice da costruire, capire e distribuire.

**Quando cambierei idea:** se in futuro servisse una parte **pubblica** del sito (pagine indicizzabili, landing di marketing). In quel caso, la scelta naturale **non sarebbe Next.js ma TanStack Start**, perché riuserebbe il router già adottato con il minimo attrito.

## 5. Cosa si intende con "budget" delle prestazioni?

La parola "budget" nei documenti ha **due significati diversi**, da non confondere:

- **Budget prestazionale (tecnico):** è un **limite massimo su una metrica tecnica** (es. peso del codice JavaScript, dimensione dei dati scaricati) verificato **in automatico dai test**. Se qualcuno lo supera, la build lo segnala. Esempio concreto nel piano: uno snapshot da 10.000 annunci deve stare **≤ ~3 MB compressi**, e questa dimensione è **controllata dai test** ([`API_CONTRACT.md`](specifications/API_CONTRACT.md) §3). È il "budget" a cui mi riferivo parlando del costo della SPA: siccome una SPA scarica molto codice all'inizio, ci si dà un tetto e lo si misura.
- **Budget economico (soldi):** è tutt'altra cosa — l'avviso di spesa su Google Cloud (vedi domanda 6).

## 6. Quanto costa questa applicazione (in denaro)?

**Pochissimo: il piano stima ≈ €0–2 al mese**, con un **tetto di allerta a €10/mese** e avvisi automatici al 50/90/100% via email ([`DEPLOYMENT.md`](specifications/DEPLOYMENT.md) §2). Il costo è trattato come un **vincolo di progetto**, non come una conseguenza.

Le voci di spesa:

| Voce | Cosa costa | Perché è quasi nullo |
|---|---|---|
| **Cloud Run** (l'API) | tempo di calcolo del server | con `min-instances = 0` il server **si spegne quando nessuno lo usa** → costo ~zero (in cambio di qualche secondo di attesa al primo accesso) |
| **Firestore** (database) | ogni **lettura** di un documento | è il rischio principale, ma neutralizzato dal design (vedi sotto) |
| **Storage** | i file allegati | pochi file, team di ≤10 persone |
| **Hosting** (l'app statica) | banda di rete | serviti da CDN, praticamente nel piano gratuito |

**Il trucco che tiene bassi i costi Firestore:** invece di far leggere il database a ogni utente, il **server legge tutti i dati una sola volta** (quando lo scraper li aggiorna, poche volte al giorno) e li tiene **in memoria**. Tutti gli utenti leggono da questa copia → **zero letture Firestore per ogni azione dell'utente** ([`SPECIFICATIONS.md`](specifications/SPECIFICATIONS.md) §8). L'unica "bolletta" di lettura è un controllo periodico ogni 60 secondi (~4.300 letture al giorno, una cifra minuscola).

**La leva che controlli tu:** l'impostazione `min-instances` di Cloud Run — `0` = costo quasi nullo ma con brevi attese all'avvio; `1` = sempre pronto ma **~pochi €/mese**. Il piano consiglia di partire da `0`.

**Rete di sicurezza:** oltre agli avvisi di spesa, vale il principio *"un picco di costo è il segnale di un bug, non di crescita"* — se la spesa sale, si cerca l'errore ([`DEPLOYMENT.md`](specifications/DEPLOYMENT.md) §5).

## 7. Quando si apre una tabella, si scaricano tutte le righe o c'è la paginazione?

**Si scaricano tutte le righe in una volta sola: non c'è paginazione.** Il browser scarica l'**intero elenco dell'area** una volta (lo "snapshot") e poi mostra le righe con lo **scorrimento virtualizzato** (disegna solo le righe visibili, così anche migliaia di righe restano fluide) — [`FRONTEND.md`](specifications/FRONTEND.md) §4.

Vantaggio: **filtri, ordinamento e ricerca sono istantanei**, perché avvengono nel browser sui dati già scaricati, senza chiamare il server ([`FRONTEND.md`](specifications/FRONTEND.md) §3). Per non pesare troppo, le descrizioni lunghe vengono **accorciate a un estratto**; il testo completo si scarica solo aprendo il singolo annuncio.

## 8. È prevista una ricerca delle procedure?

**Sì, su più livelli.** Nella barra strumenti di ogni tabella ([`FUNCTIONAL_SPECIFICATIONS_UI.md`](FUNCTIONAL_SPECIFICATIONS_UI.md) §4.2):

- **Ricerca libera** ("Ricerca libera…") che **trova il testo ovunque nella riga**.
- **Filtro "Tipo di procedura"**, filtro **"Tribunale"**, più filtri per tipo di bene e occupazione.
- **Isolamento per "Blocco":** un blocco raggruppa i lotti della **stessa procedura** (stesso tipo, tribunale, numero e anno); cliccando il badge vedi solo le righe di quella procedura.

Inoltre, nella parte **admin** c'è una ricerca più strutturata: la schermata di assegnazione per ID cerca **per ID, tribunale, comune, regione o descrizione** ([`FUNCTIONAL_SPECIFICATIONS_UI.md`](FUNCTIONAL_SPECIFICATIONS_UI.md) §8.3.3). Anche l'**Archivio** ha la sua ricerca libera dedicata.

## 9. Non sarebbe più conveniente la paginazione con filtri invece di caricare tutto?

**È il ragionamento corretto per la maggior parte dei siti, ma qui si capovolge.** In generale la paginazione conviene; in questo progetto conviene caricare tutto, per due motivi specifici.

**Motivo 1 — come si paga Firestore.** Firestore fa **pagare ogni documento letto**, non ogni ricerca.

- **Modello attuale:** il server legge i dati **una volta** e li tiene in memoria; tutti gli utenti leggono da lì → **zero letture Firestore** quando navigano. La spesa è fissa e minuscola, **anche con tanti utenti**.
- **Paginazione contro il database:** ogni pagina, ogni filtro, ogni ordinamento = **nuova lettura a pagamento**. Con più persone che filtrano tutto il giorno, i costi **si moltiplicano** — esattamente ciò che il piano vuole evitare (SPECIFICATIONS §7.41). Costerebbe **di più**.

**Motivo 2 — i filtri sono su dati "calcolati".** I cluster di rischio, i "blocchi" e le fasce di prezzo **non sono salvati nel database**: li **calcola il server**. La ricerca libera "trova ovunque nel testo" **Firestore non sa nemmeno farla** (servirebbe un motore di ricerca esterno, con costi extra). Quindi paginare contro il database **non è nemmeno fattibile** senza aggiungere infrastruttura — e il progetto non può neppure modificare quei dati, perché appartengono al progetto scraper (sola lettura).

**Sulle prestazioni:** la paginazione fa risparmiare **solo** sul primo caricamento, ma poi **ogni azione diventa una chiamata al server** (con attese, aggravate dal fatto che l'API può "dormire" per risparmiare). Il modello attuale invece paga **un solo download (~3 MB compressi)** e poi rende **tutto istantaneo**.

**Quando la paginazione vincerebbe davvero:** con dataset enormi (centinaia di migliaia / milioni di righe), oppure con un'app **pubblica e con tantissimi utenti**. Qui però sono **≤10 utenti** e **5–15 mila righe per area**: è il caso da manuale in cui "scarica una volta, lavora in locale" è la scelta migliore.

**Se un giorno il primo caricamento pesasse troppo,** la soluzione giusta **non** sarebbe passare alla paginazione contro il database, ma caricare **un cluster alla volta** o spezzare meglio il codice — mantenendo comunque i filtri istantanei e le zero letture Firestore.

---

### Riferimenti
- [`specifications/FRONTEND.md`](specifications/FRONTEND.md) — architettura SPA, routing, data layer, design system, i18n
- [`specifications/API_CONTRACT.md`](specifications/API_CONTRACT.md) — superficie REST completa, autenticazione, versionamento
- [`specifications/DEPLOYMENT.md`](specifications/DEPLOYMENT.md) — topologia Hosting + Cloud Run, same-origin, regole deny-all
- [`execution-plan/00_OVERVIEW.md`](execution-plan/00_OVERVIEW.md) — «SPA React + Radix UI + API Fastify»
- [`execution-plan/REPOSITORY_STRUCTURE.md`](execution-plan/REPOSITORY_STRUCTURE.md) — layout `apps/web` (Vite) e `apps/server` (Fastify)
