// The procedura-concorsuale debtor facts (DOMAIN_RULES.md §12): the
// workspace's Dettagli tab shows this panel when a listing matches a
// procedure in the new Part A collection (DATA_MODEL.md §17). Structurally
// parallel to OmiFacts.tsx: the caller owns the wrapping element, the title,
// and the "no match at all" branch (this component only renders the two
// "matched" states — with and without debtor detail yet).
import { useTranslation } from 'react-i18next';
import { formatText } from './DataTable/formatting.js';

export interface ProceduraConcorsualeFactsData {
  nome: string;
  tipo_code: string | null;
  tipo_procedura: string | null;
  professionista: string | null;
  giudice_delegato: string | null;
  debitore: {
    codice_fiscale: string | null;
    partita_iva: string | null;
    ragione_sociale: string | null;
    citta: string | null;
    indirizzo: string | null;
  } | null;
  link: string;
  available: boolean;
}

export function ProceduraConcorsualeFacts({ data }: { data: ProceduraConcorsualeFactsData }) {
  const { t } = useTranslation('dashboard');
  return (
    <>
      <p className="procedura-panel-nome">{data.nome}</p>
      <p className="procedura-panel-facts">
        {t('proceduraConcorsuale.tipoProcedura', { value: formatText(data.tipo_procedura) })}
        {' · '}
        {t('proceduraConcorsuale.professionista', { value: formatText(data.professionista) })}
      </p>
      <p className="procedura-panel-facts">
        {t('proceduraConcorsuale.giudiceDelegato', { value: formatText(data.giudice_delegato) })}
      </p>
      {data.available && data.debitore ? (
        <dl className="procedura-panel-debitore">
          <div>
            <dt>{t('proceduraConcorsuale.ragioneSociale')}</dt>
            <dd>{formatText(data.debitore.ragione_sociale)}</dd>
          </div>
          <div>
            <dt>{t('proceduraConcorsuale.codiceFiscale')}</dt>
            <dd>{formatText(data.debitore.codice_fiscale)}</dd>
          </div>
          <div>
            <dt>{t('proceduraConcorsuale.indirizzo')}</dt>
            <dd>{formatText(data.debitore.indirizzo)}</dd>
          </div>
          <div>
            <dt>{t('proceduraConcorsuale.citta')}</dt>
            <dd>{formatText(data.debitore.citta)}</dd>
          </div>
        </dl>
      ) : (
        <p className="procedura-panel-unavailable">
          {t('proceduraConcorsuale.debitoreNonDisponibile')}
        </p>
      )}
      <a
        href={data.link}
        target="_blank"
        rel="noopener noreferrer"
        className="procedura-panel-link"
      >
        {t('proceduraConcorsuale.vaiAllaProcedura')}
      </a>
    </>
  );
}
