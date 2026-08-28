// Company letterhead data, ported verbatim from the standalone
// carta-intestata-generator. Only the logo paths changed: the assets now live
// under /carta/ so they cannot collide with the dashboard's own public files.
//
// The letter bodies below are legal text with {{PLACEHOLDER}} substitution.
// They are DATA, not code — reviewed and signed off by the business, so they
// are kept byte-for-byte rather than reflowed or "tidied".

export interface Firmatario {
  nome: string;
  carica: string;
  genere: 'M' | 'F';
  email?: string;
}

/** Fields vary by entry: a template placeholder carries almost none, a full
 *  company carries all of them. Optional here rather than split into separate
 *  types, because the form treats them uniformly and a missing value simply
 *  renders empty. */
export interface Azienda {
  id: string;
  nome?: string;
  nomeHeader?: string;
  sottotitolo?: string;
  /** `null` for companies whose header is set in type rather than a bitmap. */
  logo?: string | null;
  logoWidth?: number;
  logoHeight?: number;
  via?: string;
  cap?: string;
  citta?: string;
  pec?: string;
  email?: string;
  footerText?: string;
  cf?: string;
  /** Overrides the city printed next to the date, where it differs from the
   *  registered office. */
  cittaData?: string;
  firmatario?: Firmatario;
  headerColor?: string;
  headerSize?: number;
  /** Frigo Sud only: a two-column header reproducing the original document,
   *  with the registry details in the header and no footer at all. */
  headerSpeciale?: {
    sottotitolo?: string;
    /** Rows of [left column, right column]. */
    righe: string[][];
  };
}

export const AZIENDE: Azienda[] = [
  {
    id: 'dpz-spa',
    nome: 'Duepuntozero S.p.A.',
    nomeHeader: 'DUEPUNTOZERO S.P.A.',
    logo: '/carta/logo-dpz-spa.png',
    logoWidth: 809,
    logoHeight: 405,
    via: 'Corso Monforte, 15',
    cap: '20122',
    citta: 'Milano',
    pec: 'duepuntozerospa@legalmail.it',
    email: 'duepuntozero@duepuntozero.net',
    footerText:
      'DUEPUNTOZERO S.P.A. | Corso Monforte 15, 20122 Milano | capitale sociale 120.000 euro i.v. | codice fiscale, partita IVA e iscrizione al Registro delle Imprese di Milano Monza Brianza Lodi n. 09209650960 | PEC duepuntozerospa@legalmail.it | e-mail duepuntozero@duepuntozero.net | web www.duepuntozero.net',
    cf: '09209650960',
  },
  {
    id: 'dpz-npl',
    nome: 'Duepuntozero NPL S.p.A.',
    nomeHeader: 'DUEPUNTOZERO NPL S.P.A.',
    logo: '/carta/logo-dpz-npl.png',
    logoWidth: 839,
    logoHeight: 151,
    via: 'Corso Monforte, 15',
    cap: '20122',
    citta: 'Milano',
    pec: 'duepuntozeronpl@legalmail.it',
    email: 'duepuntozero@duepuntozero.net',
    footerText:
      'DUEPUNTOZERO NPL S.P.A. con socio unico | Corso Monforte 15, 20122 Milano | capitale sociale 500.000 euro i.v. | codice fiscale, partita IVA e iscrizione al Registro delle Imprese di Milano Monza Brianza Lodi n. 09244530961 | Società di recupero crediti autorizzata ex art. 115 T.U.L.P.S. | PEC duepuntozeronpl@legalmail.it | e-mail duepuntozero@duepuntozero.net | web www.dpzcrediti.it',
    cf: '09244530961',
    firmatario: {
      nome: 'Silvia Caviglia',
      carica: 'Consigliere Delegato',
      genere: 'F',
      email: 'silvia@duepuntozero.net',
    },
  },
  {
    id: 'dpz-re',
    nome: 'Duepuntozero Real Estate S.r.l.',
    nomeHeader: 'DUEPUNTOZERO RE S.R.L.',
    logo: '/carta/logo-dpz-re.png',
    logoWidth: 438,
    logoHeight: 104,
    via: 'Corso Monforte, 15',
    cap: '20122',
    citta: 'Milano',
    pec: 'dpzre@legalmail.it',
    email: 'dpzre@duepuntozero.net',
    footerText:
      'Duepuntozero Real Estate s.r.l. | Corso Monforte 15, 20122 Milano | codice fiscale, partita IVA e iscrizione CCIAA Milano, Monza, Brianza, Lodi 12065360963 | capitale sociale 10.000 euro i.v. | PEC dpzre@legalmail.it | E-mail dpzre@duepuntozero.net',
    cf: '12065360963',
    firmatario: { nome: 'Nicolò Maria Ravizza', carica: 'legale rappresentante', genere: 'M' },
  },
  {
    id: 'dpz-special-situations',
    nome: 'Duepuntozero Special Situations S.r.l.',
    nomeHeader: 'DUEPUNTOZERO SPECIAL SITUATIONS S.R.L.',
    logo: '/carta/logo-dpz-special-situations.png',
    logoWidth: 809,
    logoHeight: 405,
    via: 'Corso Monforte, 15',
    cap: '20122',
    citta: 'Milano',
    pec: 'dpzspecialsituations@legalmail.it',
    email: 'duepuntozero@duepuntozero.net',
    footerText:
      'DUEPUNTOZERO SPECIAL SITUATIONS S.R.L. | Corso Monforte 15, 20122 Milano | capitale sociale 10.000 euro i.v. | codice fiscale, partita IVA e iscrizione al Registro delle Imprese di Milano Monza Brianza Lodi n. 14453930969 | PEC dpzspecialsituations@legalmail.it | e-mail duepuntozero@duepuntozero.net',
    cf: '14453930969',
  },
  {
    id: 'le-compte',
    nome: 'Le Compte S.r.l.',
    nomeHeader: 'LE COMPTE S.R.L.',
    logo: '/carta/logo-le-compte.png',
    logoWidth: 696,
    logoHeight: 350,
    via: 'Corso Monforte, 15',
    cap: '20122',
    citta: 'Milano',
    pec: '',
    email: '',
    footerText:
      'Le Compte S.r.l. | C.so Monforte 15, 20122 Milano | codice fiscale e partita IVA 14310310967',
    cf: '14310310967',
  },
  {
    id: 'oceania',
    nome: 'Oceania S.r.l.',
    nomeHeader: 'OCEANIA S.R.L.',
    logo: null,
    headerColor: '#155f9b',
    headerSize: 20,
    via: 'Corso Monforte, 15',
    cap: '20122',
    citta: 'Milano',
    pec: 'oceania_srl@legalmail.it',
    email: '',
    footerText:
      'OCEANIA s.r.l. | Corso Monforte 15, 20122 Milano | codice fiscale, partita IVA e numero iscrizione Registro Imprese Milano, Monza, Brianza, Lodi 13144190967 | capitale sociale 10.000 euro i.v. | PEC oceania_srl@legalmail.it',
    cf: '13144190967',
  },
  {
    id: 'autoleitmotiv',
    nome: 'AutoLeitMotiv S.r.l.',
    nomeHeader: 'AUTOLEITMOTIV S.R.L.',
    logo: null,
    headerSize: 17,
    via: 'Corso Monforte, 15',
    cap: '20122',
    citta: 'Milano',
    pec: 'autoleitmotiv@legalmail.it',
    email: '',
    footerText:
      'AutoLeitMotiv S.r.l. | Corso Monforte 15, 20122 Milano | codice fiscale, partita IVA e iscrizione al Registro delle Imprese di Milano Monza Brianza Lodi n. 14083040965 | capitale sociale 10.000 euro i.v. | PEC autoleitmotiv@legalmail.it',
    cf: '14083040965',
    firmatario: { nome: 'Silvia Caviglia', carica: 'Amministratore Unico', genere: 'F' },
  },
  {
    id: 'frigo-sud',
    nome: 'Frigo Sud S.r.l.',
    nomeHeader: 'FRIGO SUD S.R.L.',
    logo: null,
    // Intestazione speciale a due colonne (riprodotta fedelmente dal documento
    // originale "Aggiornamento canone copia.docx"): nessun footer, i dati
    // anagrafici/registro imprese sono tutti nell'header sopra una riga grigia.
    headerSpeciale: {
      sottotitolo: 'con socio unico',
      righe: [
        ['c.s.10.320 euro i.v.', 'Corso Monforte 15'],
        ['c.f., p. Iva, CCIAA 01112020803', '20122 Milano'],
        ['REA MI-2772102', 'PEC frigosud@pec.it'],
      ],
    },
    via: 'Corso Monforte, 15',
    cap: '20122',
    citta: 'Milano',
    pec: 'frigosud@pec.it',
    email: '',
    footerText: '',
    cf: '01112020803',
  },
  {
    id: 'rec-italy',
    nome: 'Rec Italy S.r.l.',
    nomeHeader: 'REC ITALY S.R.L.',
    logo: null,
    headerColor: '#2ea3e8',
    headerSize: 20,
    via: 'Via Gustavo Fara, 39',
    cap: '20124',
    citta: 'Milano',
    pec: 'recitaly@legalmail.it',
    email: '',
    footerText:
      'Rec Italy S.R.L. con socio unico | Via Gustavo Fara 39, 20124 Milano | Codice fiscale, partita IVA e iscrizione al Registro delle Imprese di Milano Monza Brianza Lodi n. 09793340960 | PEC recitaly@legalmail.it',
    cf: '09793340960',
  },
  {
    // Azienda lettone (SIA = S.r.l.): intestazione testuale blu, footer con i dati
    // di registro lettoni. La sua proposta di norma è "in favore del mittente"
    // (finanziamento a sé stessa) e spesso senza la riga "Erogazione".
    id: 'sia-lavita',
    nome: 'SIA LaVita Real Estate',
    nomeHeader: 'SIA LAVITA REAL ESTATE',
    logo: null,
    headerColor: '#1F3864',
    headerSize: 14,
    via: 'Ērgļu iela 8',
    cap: 'LV-2163',
    citta: 'Kalngale, Ādažu novads, Latvija',
    cittaData: 'Milano',
    pec: '',
    email: '',
    footerText:
      'SIA LaVita Real Estate | Registracijas numurs: 40203666178 | Erglu iela 8, Kalngale, Carnikavas pagasts | Adazu novads, LV-2163, Latvija',
    cf: '',
  },
  {
    // Foglio vuoto: nessun logo, nessuna informazione in calce — utile per
    // bozze o aziende non ancora presenti nell'elenco. Esclusa dal menu
    // "Compila da azienda" del destinatario (vedi App.jsx).
    id: 'template-vuoto',
    nome: 'Template Vuoto',
    nomeHeader: '',
    logo: null,
    via: '',
    cap: '',
    citta: '',
    pec: '',
    email: '',
    footerText: '',
    cf: '',
  },
];

// Firmatari più frequenti nelle dichiarazioni (rinuncia a crediti, ecc.)
export const FIRMATARI_FREQUENTI = [
  { nome: 'Silvia Caviglia', carica: 'Amministratore Unico', genere: 'F' },
  { nome: 'Santo Logoteta', carica: 'legale rappresentante', genere: 'M' },
  { nome: 'Nicolò Maria Ravizza', carica: 'legale rappresentante', genere: 'M' },
];

// Qualifiche selezionabili per il firmatario nella dichiarazione sostitutiva (rinuncia a crediti)
export const QUALIFICHE_RINUNCIA = ['legale rappresentante', 'Amministratore Unico'];

// Veicoli di cartolarizzazione (Cessionari) nell'interesse dei quali Duepuntozero NPL
// formula le offerte di acquisto crediti — dati da Centri_di_costo.xlsx.
export const CESSIONARI_POSSIBILI = [
  {
    id: 'lario-spv',
    nome: 'Lario SPV',
    via: 'Via San Prospero 4',
    cap: '20121',
    citta: 'Milano',
    provincia: 'MI',
    cf: '14359050961',
  },
  {
    id: 'gandalf-spv',
    nome: 'Gandalf SPV',
    via: 'Via San Prospero 4',
    cap: '20121',
    citta: 'Milano',
    provincia: 'MI',
    cf: '13695070964',
  },
  {
    id: 'spv-project-2106',
    nome: 'SPV Project 2106',
    via: 'Corso Vittorio Emanuele II 24/28',
    cap: '20122',
    citta: 'Milano',
    provincia: 'MI',
    cf: '12123130960',
  },
  {
    id: 'spv-project-155',
    nome: 'SPV Project 155',
    via: 'Corso Vittorio Emanuele II 24/28',
    cap: '20122',
    citta: 'Milano',
    provincia: 'MI',
    cf: '08806390962',
  },
  {
    id: 'loto-spv',
    nome: 'Loto SPV',
    via: 'Via Satuto 10',
    cap: '20121',
    citta: 'Milano',
    provincia: 'MI',
    cf: '10911010964',
  },
  {
    id: 'primula-spv',
    nome: 'Primula SPV',
    via: 'Via Guido Reni 2/2',
    cap: '40125',
    citta: 'Bologna',
    provincia: 'BO',
    cf: '03720831209',
  },
  {
    id: 'mb-finance',
    nome: 'MB Finance Srl',
    via: 'Corso Re Umberto 8',
    cap: '10121',
    citta: 'Torino',
    provincia: 'TO',
    cf: '10126420016',
  },
];

// Master servicer selezionabili nelle offerte di acquisto crediti.
export const MASTER_SERVICER_POSSIBILI = [
  'Cerved Master Services S.p.A.',
  'Centotrenta Servicing S.p.A.',
  'Zenith Service S.p.A.',
  'Securitisation Services S.p.A.',
  'Phinance Partners S.p.A.',
  'doNext S.p.A.',
  'Prelios Credit Servicing S.p.A.',
  'Master Gardant S.p.A.',
  'Intrum Italy S.p.A.',
  'Banca Finanziaria Internazionale S.p.A.',
  'Banca CF+ S.p.A.',
  'Cherry Bank S.p.A.',
  'Banca Ifis S.p.A.',
];

// Persone che possono firmare l'offerta di acquisto crediti (una o due) e ruoli selezionabili.
export const PERSONE_FIRMA_ACQUISTO = [
  'Nicolò Maria Ravizza',
  'Santo Logoteta',
  'Silvia Caviglia',
  'Alessandra Casacasti',
];
export const RUOLI_FIRMA_ACQUISTO = [
  'Consigliere Delegato',
  'Amministratore Unico',
  'Legale Rappresentante',
];

export const TIPI_DOCUMENTO = [
  { id: 'proposta', label: 'Proposta di Finanziamento' },
  { id: 'accettazione', label: 'Accettazione Proposta' },
  { id: 'rinuncia', label: 'Rinuncia a Crediti' },
  { id: 'lettera', label: 'Lettera' },
  { id: 'acquisto', label: 'Acquisto Crediti Pecuniari' },
];

export const TESTI_DEFAULT = {
  proposta: {
    apertura: 'Egregi Signori,',
    // {{MITTENTE}} = azienda mittente, {{DESTINATARIO}} = azienda destinataria,
    // {{BENEFICIARIO}} = chi riceve il finanziamento (di norma il destinatario; in
    // Template Vuoto diventa il mittente, per le lettere di richiesta finanziamento).
    corpo: `con riferimento alle intese verbali intercorse, siamo con la presente a richiedere la disponibilità a effettuare, in favore di {{BENEFICIARIO}} un finanziamento per l'importo in linea capitale di Euro {{IMPORTO}} ({{IMPORTO_LETTERE}}).

Il finanziamento proposto sarà regolato dalle seguenti condizioni:

Durata:\til finanziamento avrà durata fino al {{SCADENZA}} e si intenderà tacitamente rinnovato per periodi di 12 mesi; salvo che entro il 30 novembre del relativo anno non pervenga una comunicazione di mancato rinnovo da una delle parti;

Interessi:\til finanziamento sarà infruttifero;

{{EROGAZIONE}}Rimborso:\tsi potrà procedere a rimborsi anticipati, anche parziali, in qualsiasi momento, anche senza preavviso, senza alcun onere.

Se d'accordo con quanto sopra, Vogliate restituirci copia della presente sottoscritta per accettazione e conferma.`,
    chiusura: 'Distinti saluti.',
  },
  accettazione: {
    apertura: 'Egregi Signori,',
    corpo: `abbiamo ricevuto la Vostra proposta di finanziamento infruttifero, che trascriviamo qui di seguito in segno di piena ed incondizionata accettazione.`,
    chiusura: 'In segno di piena ed incondizionata accettazione.',
  },
  rinuncia: {
    apertura: 'Egregi Signori,',
    corpo: `Nella mia qualità di socio della società in indirizzo {{DESTINATARIO}}, C.F. {{DESTINATARIO_CF}}, premesso di essere titolare di un credito derivante da finanziamento infruttifero ammontante a complessivi Euro {{IMPORTO_CREDITO}} ({{IMPORTO_CREDITO_LETTERE}}) ("Credito"), preso atto della situazione patrimoniale della Società al {{DATA_SITUAZIONE}}.`,
    chiusura: 'In fede,',
  },
  lettera: {
    apertura: 'Egregi Signori,',
    corpo: ``,
    chiusura: 'Distinti saluti.',
  },
  acquisto: {
    apertura: 'Egregi Signori,',
    corpo: `con la presente, {{MITTENTE}} ("Proponente") intende formalizzare la propria offerta vincolante e irrevocabile di acquisto pro-soluto delle ragioni di credito infra individuate ai termini e condizioni di seguito indicati.

La presente offerta è presentata dalla Scrivente nell'interesse di {{CESSIONARIO}} (il "Cessionario"), veicolo di cartolarizzazione costituito ai sensi della l. 130/1999, con sede legale in {{CESSIONARIO_SEDE}}, codice fiscale {{CESSIONARIO_CF}}, al fine di porre in essere un'operazione di cartolarizzazione di crediti ai sensi della l. 130/1999, nell'ambito della quale {{MASTER_SERVICER}} assumerà il ruolo di "master servicer".

In ogni caso, {{MITTENTE}} conferma di agire per proprio conto e non in qualità di broker o agente per conto di terzi né nell'ambito di un'intesa, consorzio o joint venture di qualsiasi natura.

La presente offerta è formulata per l'acquisto di tutte le ragioni di credito di titolarità del Vostro Spettabile Istituto ("Cedente") vantante nei confronti di {{DEBITORE}}{{NDG}}, per un importo complessivo non inferiore ad Euro {{IMPORTO_CREDITI}} ({{IMPORTO_CREDITI_LETTERE}}) (i "Crediti").

Ai fini della presente offerta, i Crediti verranno ceduti unitamente a tutte le "ragioni di credito" ad essi relative, inclusi gli interessi maturati e maturandi, i privilegi, le garanzie reali e/o personali, le cause di prelazione e gli accessori che, ove esistenti, assistono i Crediti, nonché ogni e qualsiasi diritto, ragione e pretesa (anche di danni), azione ed eccezione sostanziali e processuali, inerenti o comunque accessori ai Crediti e al relativo esercizio.

Con la presente, {{MITTENTE}}, nell'interesse di {{CESSIONARIO}}, formalizza la propria offerta vincolante di acquisto pro-soluto dei Crediti, ad un corrispettivo complessivo pari ad Euro {{CORRISPETTIVO}} ({{CORRISPETTIVO_LETTERE}}).{{EARNOUT_CLAUSE}}

La presente offerta vincolante viene formulata sull'assunto che:

- i Crediti e tutte le relative ragioni di credito siano nella piena ed esclusiva titolarità della Cedente, la quale ne può validamente disporre, e vengono ceduti senza limitazioni, unitamente ai relativi interessi, accessori e garanzie di ogni genere;

- i Crediti e tutte le relative ragioni di credito sono valide ed esistenti ai sensi dell'art. 1266 c.c. e non contestati;

{{ASSUNTO_EXTRA_BULLET}}- ogni pagamento che la Cedente dovesse ricevere, a qualunque titolo, successivamente alla data della presente offerta, ovvero che sia, a qualunque titolo, già dovuto ma non ancora corrisposto alla data della presente offerta, dovrà intendersi di titolarità del Cessionario;

- ogni costo, spesa, imposta ed onere, ivi inclusi i costi e/o onorari legali, notarili, di custodia, consulenziali e/o pubblicitari, relativi ad attività di recupero dei Crediti svolte fino alla data di sottoscrizione del contratto di cessione, rimangono di esclusiva competenza e titolarità della Cedente, indipendentemente dalla relativa data contabile o di fatturazione;

- i Crediti e tutte le relative ragioni di credito siano debitamente provate e descritte in adeguata documentazione che la Cedente s'impegna a consegnare al Cessionario al momento della sottoscrizione del contratto di cessione, affinché il Cessionario possa azionare giudizialmente i Crediti.

La presente offerta è disciplinata dalla legge italiana. Qualsiasi controversia derivante da, o comunque connessa all'esecuzione, efficacia, validità e/o all'interpretazione della presente offerta sarà devoluta alla esclusiva competenza del Tribunale di Milano.

Per tutto il tempo di validità della presente offerta, la Cedente si impegna a non compiere atti dispositivi, né avviare strategie di recupero che prevedano transazioni, stralci, piani di rientro e/o in generale accordi stragiudiziali che possano incidere sul valore o sulle tempistiche di recupero dei Crediti, ovvero che siano potenzialmente pregiudizievoli dell'esercizio dei diritti ad essi sottesi.

Con l'accettazione della presente offerta, la Proponente e la Cedente si impegnano a mantenere riservati e confidenziali i termini e i contenuti della presente offerta e, in generale, le condizioni e termini della cessione oggetto della presente offerta.

La presente offerta vincolante resterà valida sino alle ore 18:00 del giorno {{SCADENZA_OFFERTA}}, decorse le quali essa si intenderà priva di qualsivoglia effetto; in caso di accettazione della presente offerta entro tale termine, la Cedente si impegna a concordare in buona fede e a concludere con il Cessionario il contratto di cessione in forma e in sostanza soddisfacente per il Cessionario, che contenga previsioni standard per operazioni di natura e tipologia analoga, entro i successivi 30 (trenta) giorni.

La presente offerta vincolante supera e sostituisce ogni altra precedente offerta e/o proposta e/o intesa trasmessa alla Cedente avente il medesimo oggetto.

Qualsiasi comunicazione relativa alla presente offerta vincolante potrà essere indirizzata a {{MITTENTE}} (PEC: {{MITTENTE_PEC}}) nonché al referente {{REFERENTE}} al seguente indirizzo di posta elettronica {{REFERENTE_EMAIL}}.`,
    chiusura:
      'In attesa di Vostro gentile riscontro e rimanendo a disposizione per ogni chiarimento, porgiamo i nostri più cordiali saluti.',
  },
};
