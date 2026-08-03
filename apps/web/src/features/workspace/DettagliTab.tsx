// The workspace's "Dettagli" tab (UI §4.5): every stored fact with N/D
// fallbacks, the full untruncated descrizione, the rating control, related
// blocco lots, and price context. The rating reads from the live poll
// (features/ratings), not a one-shot `detail.rating` — falling back to it
// only for the very first paint, before the poll has resolved even once.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { type AreaSlug, type ListingDetail, HIGH_VALUE_THRESHOLD_EUR } from '@pvp/shared';
import { RatingControl } from '../ratings/RatingControl.js';
import { HighValueDialog } from '../eggs/EasterEggs.js';
import { useRatingsMap } from '../ratings/hooks.js';
import {
  formatCurrency,
  formatDate,
  formatText,
  formatComuneProvincia,
  formatNumeroAnno,
  NOT_AVAILABLE,
} from '../dashboard/DataTable/formatting.js';
import { OmiFacts } from '../dashboard/OmiFacts.js';
import type { ListingSearch } from '../dashboard/urlState.js';
import { RelatedLots } from './RelatedLots.js';

export function DettagliTab({
  detail,
  area,
  search,
}: {
  detail: ListingDetail;
  area: AreaSlug;
  search: ListingSearch;
}) {
  const { t } = useTranslation('workspace');
  const ratings = useRatingsMap();
  const rating = ratings.get(detail.id) ?? detail.rating?.value ?? null;
  const [showHighValue, setShowHighValue] = useState(false);
  const isHighValue =
    detail.valore_richiesto != null && detail.valore_richiesto > HIGH_VALUE_THRESHOLD_EUR;

  return (
    <div className="workspace-dettagli">
      <div className="workspace-rating">
        <span className="ui-micro-label">{t('dashboard:rating.groupLabel')}</span>
        <RatingControl listingId={detail.id} value={rating} />
      </div>

      <dl className="workspace-facts">
        <div>
          <dt>{t('details.tipoBene')}</dt>
          <dd>{formatText(detail.tipo_bene)}</dd>
        </div>
        <div>
          <dt>{t('details.tipoProcedura')}</dt>
          <dd>{formatText(detail.tipo_procedura)}</dd>
        </div>
        <div>
          <dt>{t('details.numeroAnno')}</dt>
          <dd>{formatNumeroAnno(detail.numero, detail.anno)}</dd>
        </div>
        <div>
          <dt>{t('details.tribunale')}</dt>
          <dd>{formatText(detail.tribunale)}</dd>
        </div>
        <div>
          <dt>{t('details.comuneProvincia')}</dt>
          <dd>{formatComuneProvincia(detail.comune, detail.provincia)}</dd>
        </div>
        <div>
          <dt>{t('details.regione')}</dt>
          <dd>{formatText(detail.regione)}</dd>
        </div>
        <div>
          <dt>{t('details.valoreRichiesto')}</dt>
          <dd>{formatCurrency(detail.valore_richiesto)}</dd>
        </div>
        <div>
          <dt>{t('details.dataPubblicazione')}</dt>
          <dd>{formatDate(detail.data_pubblicazione)}</dd>
        </div>
        <div>
          <dt>{t('details.dataVendita')}</dt>
          <dd>{formatDate(detail.data_vendita)}</dd>
        </div>
        {detail.scope === 'immobili' ? (
          <div>
            <dt>{t('details.disponibilita')}</dt>
            <dd>{formatText(detail.disponibilita)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="workspace-description">
        <h3>{t('details.descrizioneTitle')}</h3>
        <p className="workspace-description-text">
          {detail.descrizione.length > 0 ? detail.descrizione : NOT_AVAILABLE}
        </p>
      </div>

      <a
        href={detail.link}
        target="_blank"
        rel="noopener noreferrer"
        className="workspace-annuncio-link"
        onClick={(event) => {
          if (isHighValue) {
            event.preventDefault();
            setShowHighValue(true);
          }
        }}
      >
        {t('details.goToListing')}
        <ExternalLink aria-hidden="true" size={15} />
      </a>

      {isHighValue ? (
        <HighValueDialog
          open={showHighValue}
          onOpenChange={setShowHighValue}
          title={t('common:egg.highValue.title')}
          gifSrc="/eggs/asta-5m.gif"
          gifAlt={t('common:egg.highValue.gifAlt')}
          proceedLabel={t('common:egg.highValue.proceed')}
          cancelLabel={t('common:egg.highValue.cancel')}
          onProceed={() => window.open(detail.link, '_blank', 'noopener,noreferrer')}
        />
      ) : null}

      {detail.blocco ? <RelatedLots blocco={detail.blocco} area={area} search={search} /> : null}

      {detail.omi ? (
        <div className="omi-panel" role="status">
          <h3 className="omi-panel-title">{t('dashboard:omi.title')}</h3>
          <OmiFacts data={detail.omi} />
        </div>
      ) : null}
    </div>
  );
}
