// Every field of the letterhead form, grouped as the original was.
//
// Sections appear only when the document type uses them: a free-form letter
// is never shown the acquisto-crediti fields, which is most of the form.
import { useTranslation } from 'react-i18next';
import { Section } from './Section.js';
import { CorpoEditor } from './CorpoEditor.js';
import { Campo, Scelte } from './Campo.js';
import { Field } from '../../../components/Field.js';
import {
  CESSIONARI_POSSIBILI,
  FIRMATARI_FREQUENTI,
  QUALIFICHE_RINUNCIA,
  type Azienda,
} from '../data/aziende.js';
import { importoInLettere } from '../utils/numeroInLettere.js';
import {
  missingAccettazione,
  missingAcquisto,
  missingDestinatario,
  missingLettera,
  missingMittente,
  missingRinuncia,
  missingTesto,
} from '../utils/validazione.js';
import type { AssuntoExtra, CartaFormData, TipoLettera } from '../types.js';

export interface CartaFormProps {
  azienda: Azienda;
  tipo: TipoLettera;
  formData: CartaFormData;
  set: <K extends keyof CartaFormData>(campo: K, valore: CartaFormData[K]) => void;
}

const ASSUNTO_EXTRA: { id: AssuntoExtra; chiave: string }[] = [
  { id: '', chiave: 'scelte.assuntoNessuno' },
  { id: 'concordato', chiave: 'scelte.assuntoConcordato' },
  { id: 'ipotecario', chiave: 'scelte.assuntoIpotecario' },
  { id: 'libero', chiave: 'scelte.assuntoLibero' },
];

export function CartaForm({ azienda, tipo, formData, set }: CartaFormProps) {
  const { t } = useTranslation('carta');
  const f = formData;
  /** The amount spelled out, shown under the figure so a typo is visible. */
  const inLettere = (v: string) => (v ? importoInLettere(v) : '');

  return (
    <>
      {azienda.id === 'template-vuoto' ? (
        <Section title={t('sezioni.mittente')} missing={missingMittente(azienda, f)}>
          <Campo
            id="c-mittente"
            label={t('fields.mittenteNome')}
            value={f.mittenteNome}
            onChange={(v) => set('mittenteNome', v)}
          />
        </Section>
      ) : null}

      <Section title={t('sezioni.destinatario')} missing={missingDestinatario(f)}>
        <Campo
          id="c-dest-nome"
          label={t('fields.destinatarioNome')}
          value={f.destinatarioNome}
          onChange={(v) => set('destinatarioNome', v)}
        />
        <Campo
          id="c-dest-via"
          label={t('fields.destinatarioVia')}
          value={f.destinatarioVia}
          onChange={(v) => set('destinatarioVia', v)}
        />
        <div className="carta-row">
          <Campo
            id="c-dest-cap"
            label={t('fields.destinatarioCap')}
            value={f.destinatarioCap}
            onChange={(v) => set('destinatarioCap', v)}
          />
          <Campo
            id="c-dest-citta"
            label={t('fields.destinatarioCitta')}
            value={f.destinatarioCitta}
            onChange={(v) => set('destinatarioCitta', v)}
          />
        </div>
        <Campo
          id="c-dest-pec"
          label={t('fields.destinatarioPec')}
          value={f.destinatarioPec}
          onChange={(v) => set('destinatarioPec', v)}
        />
        {tipo === 'acquisto' ? (
          <Campo
            id="c-dest-ref"
            label={t('fields.destinatarioReferente')}
            value={f.destinatarioReferente}
            onChange={(v) => set('destinatarioReferente', v)}
          />
        ) : null}
      </Section>

      <Section title={t('sezioni.lettera')} missing={missingLettera(tipo, f)}>
        <Campo
          id="c-data"
          label={t('fields.data')}
          type="date"
          value={f.data}
          onChange={(v) => set('data', v)}
        />
        <Campo
          id="c-oggetto"
          label={t('fields.oggetto')}
          value={f.oggetto}
          onChange={(v) => set('oggetto', v)}
        />
        {tipo === 'proposta' ? (
          <>
            <Campo
              id="c-importo"
              label={t('fields.importo')}
              value={f.importo}
              onChange={(v) => set('importo', v)}
              hint={inLettere(f.importo)}
            />
            <Campo
              id="c-scadenza"
              label={t('fields.scadenza')}
              value={f.scadenza}
              onChange={(v) => set('scadenza', v)}
              placeholder="31 dicembre 2026"
            />
            <Campo
              id="c-tasso"
              label={t('fields.tasso')}
              value={f.tasso}
              onChange={(v) => set('tasso', v)}
            />
            <Field label={t('fields.conErogazione')} htmlFor="c-erogazione">
              <input
                id="c-erogazione"
                type="checkbox"
                checked={f.conErogazione}
                onChange={(e) => set('conErogazione', e.target.checked)}
              />
            </Field>
          </>
        ) : null}
      </Section>

      {tipo === 'rinuncia' ? (
        <Section title={t('sezioni.rinuncia')} missing={missingRinuncia(f)}>
          <Campo
            id="c-cf"
            label={t('fields.destinatarioCF')}
            value={f.destinatarioCF}
            onChange={(v) => set('destinatarioCF', v)}
          />
          <Campo
            id="c-credito"
            label={t('fields.importoCredito')}
            value={f.importoCredito}
            onChange={(v) => set('importoCredito', v)}
            hint={inLettere(f.importoCredito)}
          />
          <Campo
            id="c-rinunciato"
            label={t('fields.importoRinunciato')}
            value={f.importoRinunciato}
            onChange={(v) => set('importoRinunciato', v)}
            hint={inLettere(f.importoRinunciato)}
          />
          <Campo
            id="c-data-sit"
            label={t('fields.dataSituazione')}
            type="date"
            value={f.dataSituazione}
            onChange={(v) => set('dataSituazione', v)}
          />
          <Campo
            id="c-fiscale"
            label={t('fields.valoreFiscale')}
            value={f.valoreFiscale}
            onChange={(v) => set('valoreFiscale', v)}
          />
          <Campo
            id="c-legale"
            label={t('fields.legaleNome')}
            value={f.legaleNome}
            onChange={(v) => set('legaleNome', v)}
          />
          <Scelte
            id="c-legale-carica"
            label={t('fields.firmatarioCarica')}
            value={f.legaleCarica}
            onChange={(v) => set('legaleCarica', v)}
          >
            {QUALIFICHE_RINUNCIA.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </Scelte>
          <Scelte
            id="c-legale-genere"
            label={t('fields.legaleGenere')}
            value={f.legaleGenere}
            onChange={(v) => set('legaleGenere', v === 'F' ? 'F' : 'M')}
          >
            {/* Drives "Il sottoscritto" / "La sottoscritta" in the body. */}
            <option value="M">{t('scelte.maschile')}</option>
            <option value="F">{t('scelte.femminile')}</option>
          </Scelte>
        </Section>
      ) : null}

      {tipo === 'acquisto' ? (
        <Section title={t('sezioni.acquisto')} missing={missingAcquisto(f)}>
          <Scelte
            id="c-cessionario"
            label={t('fields.cessionario')}
            value={f.cessionarioId}
            onChange={(v) => set('cessionarioId', v)}
          >
            <option value="">{t('scelte.nessuno')}</option>
            {CESSIONARI_POSSIBILI.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Scelte>
          <Campo
            id="c-servicer"
            label={t('fields.masterServicer')}
            value={f.masterServicer}
            onChange={(v) => set('masterServicer', v)}
          />
          <Campo
            id="c-debitore"
            label={t('fields.debitore')}
            value={f.debitore}
            onChange={(v) => set('debitore', v)}
          />
          <Campo id="c-ndg" label={t('fields.ndg')} value={f.ndg} onChange={(v) => set('ndg', v)} />
          <Campo
            id="c-crediti"
            label={t('fields.importoCrediti')}
            value={f.importoCrediti}
            onChange={(v) => set('importoCrediti', v)}
            hint={inLettere(f.importoCrediti)}
          />
          <Scelte
            id="c-corrisp-tipo"
            label={t('fields.corrispettivoTipo')}
            value={f.corrispettivoTipo}
            onChange={(v) => set('corrispettivoTipo', v === 'earnout' ? 'earnout' : 'fisso')}
          >
            <option value="fisso">{t('scelte.fisso')}</option>
            <option value="earnout">{t('scelte.earnout')}</option>
          </Scelte>
          <Campo
            id="c-corrisp"
            label={t('fields.corrispettivo')}
            value={f.corrispettivo}
            onChange={(v) => set('corrispettivo', v)}
            hint={inLettere(f.corrispettivo)}
          />
          {f.corrispettivoTipo === 'earnout' ? (
            <>
              <Campo
                id="c-eo-soglia"
                label={t('fields.earnoutSoglia')}
                value={f.earnoutSoglia}
                onChange={(v) => set('earnoutSoglia', v)}
                hint={inLettere(f.earnoutSoglia)}
              />
              <Campo
                id="c-eo-scadenza"
                label={t('fields.earnoutScadenza')}
                type="date"
                value={f.earnoutScadenza}
                onChange={(v) => set('earnoutScadenza', v)}
              />
              <Campo
                id="c-eo-importo"
                label={t('fields.earnoutImporto')}
                value={f.earnoutImporto}
                onChange={(v) => set('earnoutImporto', v)}
                hint={inLettere(f.earnoutImporto)}
              />
            </>
          ) : null}
          <Campo
            id="c-validita"
            label={t('fields.scadenzaOfferta')}
            type="date"
            value={f.scadenzaOfferta}
            onChange={(v) => set('scadenzaOfferta', v)}
          />
          <Scelte
            id="c-assunto"
            label={t('fields.assuntoExtra')}
            value={f.assuntoExtraTipo}
            onChange={(v) => set('assuntoExtraTipo', v as AssuntoExtra)}
          >
            {ASSUNTO_EXTRA.map((a) => (
              <option key={a.id} value={a.id}>
                {t(a.chiave)}
              </option>
            ))}
          </Scelte>
          {f.assuntoExtraTipo === 'concordato' ? (
            <>
              <Campo
                id="c-conc-trib"
                label={t('fields.concordatoTribunale')}
                value={f.concordatoTribunale}
                onChange={(v) => set('concordatoTribunale', v)}
              />
              <Campo
                id="c-conc-num"
                label={t('fields.concordatoNumero')}
                value={f.concordatoNumero}
                onChange={(v) => set('concordatoNumero', v)}
              />
              <Campo
                id="c-conc-imp"
                label={t('fields.concordatoImporto')}
                value={f.concordatoImporto}
                onChange={(v) => set('concordatoImporto', v)}
                hint={inLettere(f.concordatoImporto)}
              />
            </>
          ) : null}
          {f.assuntoExtraTipo === 'ipotecario' ? (
            <Campo
              id="c-ipo-grado"
              label={t('fields.ipotecarioGrado')}
              value={f.ipotecarioGrado}
              onChange={(v) => set('ipotecarioGrado', v)}
            />
          ) : null}
          {f.assuntoExtraTipo === 'libero' ? (
            <Field label={t('fields.assuntoLibero')} htmlFor="c-assunto-libero">
              <textarea
                id="c-assunto-libero"
                className="carta-textarea"
                rows={3}
                value={f.assuntoExtraLibero}
                onChange={(e) => set('assuntoExtraLibero', e.target.value)}
              />
            </Field>
          ) : null}
        </Section>
      ) : null}

      {tipo === 'accettazione' ? (
        <Section title={t('sezioni.accettazione')} missing={missingAccettazione(f)}>
          <Field label={t('fields.propostaOriginale')} htmlFor="c-proposta-orig">
            <textarea
              id="c-proposta-orig"
              className="carta-textarea"
              rows={8}
              value={f.testoPropostaOriginale}
              onChange={(e) => set('testoPropostaOriginale', e.target.value)}
            />
          </Field>
        </Section>
      ) : null}

      <Section
        title={t('sezioni.testo')}
        missing={missingTesto(tipo, f)}
        collapsible
        defaultOpen={false}
      >
        <Campo
          id="c-apertura"
          label={t('fields.apertura')}
          value={f.apertura}
          onChange={(v) => set('apertura', v)}
        />
        <Field label={t('fields.corpo')}>
          <CorpoEditor value={f.testo} onChange={(html) => set('testo', html)} />
        </Field>
        <Campo
          id="c-chiusura"
          label={t('fields.chiusura')}
          value={f.chiusura}
          onChange={(v) => set('chiusura', v)}
        />
      </Section>

      <Section title={t('sezioni.firma')}>
        <Field label={t('fields.firmaSenza')} htmlFor="c-firma-senza">
          <input
            id="c-firma-senza"
            type="checkbox"
            checked={f.firmaSenza}
            onChange={(e) => set('firmaSenza', e.target.checked)}
          />
        </Field>
        {!f.firmaSenza ? (
          <>
            <Campo
              id="c-firma-int"
              label={t('fields.firmaIntestazione')}
              value={f.firmaIntestazione}
              onChange={(v) => set('firmaIntestazione', v)}
              placeholder={azienda.nome ?? ''}
            />
            <Scelte
              id="c-num-firmatari"
              label={t('fields.numFirmatari')}
              value={String(f.numFirmatari)}
              onChange={(v) => set('numFirmatari', v === '2' ? 2 : 1)}
            >
              <option value="1">{t('scelte.uno')}</option>
              <option value="2">{t('scelte.due')}</option>
            </Scelte>
            <Scelte
              id="c-firm1-rapido"
              label={t('fields.firmatarioFrequente')}
              value=""
              onChange={(v) => {
                const scelto = FIRMATARI_FREQUENTI.find((x) => x.nome === v);
                if (scelto) {
                  set('firmatario1Nome', scelto.nome);
                  set('firmatario1Carica', scelto.carica);
                }
              }}
            >
              <option value="">{t('scelte.nessuno')}</option>
              {FIRMATARI_FREQUENTI.map((x) => (
                <option key={x.nome} value={x.nome}>
                  {x.nome}
                </option>
              ))}
            </Scelte>
            <Campo
              id="c-firm1-nome"
              label={t('fields.firmatarioNome')}
              value={f.firmatario1Nome}
              onChange={(v) => set('firmatario1Nome', v)}
            />
            <Campo
              id="c-firm1-carica"
              label={t('fields.firmatarioCarica')}
              value={f.firmatario1Carica}
              onChange={(v) => set('firmatario1Carica', v)}
            />
            {f.numFirmatari === 2 ? (
              <>
                <Campo
                  id="c-firm2-nome"
                  label={t('fields.firmatario2Nome')}
                  value={f.firmatario2Nome}
                  onChange={(v) => set('firmatario2Nome', v)}
                />
                <Campo
                  id="c-firm2-carica"
                  label={t('fields.firmatario2Carica')}
                  value={f.firmatario2Carica}
                  onChange={(v) => set('firmatario2Carica', v)}
                />
              </>
            ) : null}
          </>
        ) : null}
      </Section>
    </>
  );
}
