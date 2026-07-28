// The listing workspace (UI §4.5): a routeable side drawer on
// /aste/:area/lotto/:id. Modal-dialog semantics per FRONTEND.md §7 ("the
// workspace panel ... are modal dialogs with focus trap and Esc close") —
// built on PrimeReact's Drawer (correct shape: an edge-sliding panel, a real
// focus trap, unconditional Escape-close, all "for free") with its default
// `role="complementary"` overridden to the spec-mandated `role="dialog"` +
// an explicit `aria-labelledby` (Drawer's own hook, unlike Dialog's, doesn't
// wire one up itself) — verified this override actually takes effect by
// tracing the real compiled `mergeProps` merge order, not assumed.
// `useNavigate({from: '/aste/$area/lotto/$id'})` is deliberately UNPREFIXED
// while `useParams`/`useSearch` are prefixed — the same TanStack Router
// `from:` quirk documented since Phase 4.
import { useId } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { TabsRoot, TabsList, TabsTab, TabsPanels, TabsPanel } from 'primereact/tabs';
import {
  DrawerRoot,
  DrawerPortal,
  DrawerBackdrop,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerContent,
} from 'primereact/drawer';
import type { AreaSlug } from '@pvp/shared';
import type { PanelTab } from '../dashboard/urlState.js';
import { useListingDetail } from './hooks.js';
import { DettagliTab } from './DettagliTab.js';
import { ActivityTimeline } from './ActivityTimeline.js';
import { formatText } from '../dashboard/DataTable/formatting.js';
import './workspace.css';

export function WorkspacePanel() {
  const { t } = useTranslation('workspace');
  const { area, id } = useParams({ from: '/protected-layout/aste/$area/lotto/$id' });
  const search = useSearch({ from: '/protected-layout/aste/$area/lotto/$id' });
  const navigate = useNavigate({ from: '/aste/$area/lotto/$id' });
  const titleId = useId();

  const { data: detail, isLoading, isError } = useListingDetail(id);

  function handleClose() {
    void navigate({
      to: '/aste/$area',
      params: { area },
      search: (prev) => {
        const { pannello: _drop, ...rest } = prev;
        return rest;
      },
    });
  }

  const title = detail
    ? `${formatText(detail.tipo_bene)} — ${formatText(detail.tribunale)}`
    : t('title');

  return (
    <DrawerRoot
      open
      position="right"
      trapped
      blockScroll
      onOpenChange={(e: { value: boolean | undefined }) => {
        if (!e.value) handleClose();
      }}
    >
      <DrawerPortal>
        <DrawerBackdrop className="workspace-drawer-backdrop" />
        <DrawerPopup role="dialog" aria-labelledby={titleId} className="workspace-drawer-popup">
          <DrawerHeader className="workspace-drawer-header">
            <DrawerTitle id={titleId} className="workspace-drawer-title">
              {title}
            </DrawerTitle>
            <DrawerClose className="workspace-drawer-close" aria-label={t('close')}>
              {'✕'}
            </DrawerClose>
          </DrawerHeader>
          <DrawerContent className="workspace-drawer-content">
            {isLoading ? <p className="workspace-status">{t('loading')}</p> : null}
            {isError ? <p className="workspace-status">{t('loadError')}</p> : null}
            {detail ? (
              <TabsRoot
                value={search.pannello}
                onValueChange={(e: { value: string | number | undefined }) =>
                  void navigate({ search: (prev) => ({ ...prev, pannello: e.value as PanelTab }) })
                }
                lazy
              >
                <TabsList className="workspace-tabs">
                  <TabsTab value="dettagli" className="workspace-tab">
                    {t('tabs.dettagli')}
                  </TabsTab>
                  <TabsTab value="storico" className="workspace-tab">
                    {t('tabs.storico')}
                  </TabsTab>
                  <TabsTab value="chat" className="workspace-tab">
                    {t('tabs.chat')}
                  </TabsTab>
                </TabsList>
                <TabsPanels>
                  <TabsPanel value="dettagli">
                    <DettagliTab detail={detail} area={area as AreaSlug} search={search} />
                  </TabsPanel>
                  <TabsPanel value="storico">
                    <ActivityTimeline listingId={id} />
                  </TabsPanel>
                  <TabsPanel value="chat">
                    <p className="workspace-status">{t('chatPlaceholder')}</p>
                  </TabsPanel>
                </TabsPanels>
              </TabsRoot>
            ) : null}
          </DrawerContent>
        </DrawerPopup>
      </DrawerPortal>
    </DrawerRoot>
  );
}
