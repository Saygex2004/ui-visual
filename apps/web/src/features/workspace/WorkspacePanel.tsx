// The listing workspace (UI §4.5): a routeable side drawer on
// /aste/:area/lotto/:id. Modal-dialog semantics per FRONTEND.md §7 ("the
// workspace panel ... are modal dialogs with focus trap and Esc close") —
// built on Radix's Dialog (Execution Plan Phase 9), styled as a right-side
// slide-in panel. Radix's Dialog.Content natively sets role="dialog" and
// auto-wires aria-labelledby to DialogTitle's id (aria-modal is added by
// the shared components/Dialog.tsx wrapper — not native to this Radix
// version, verified against its compiled source). No manual role/aria
// plumbing needed here, unlike the PrimeReact Drawer this replaces (an
// explicit override; see HANDOFF_PHASE_6.md for that precedent). Focus
// trap, Esc-close, outside-click-close, and scroll-lock are all native to
// Radix Dialog's default `modal` mode.
//
// Focus-return-on-close, found broken and fixed (Operazione BELLEZZA):
// Radix's `DialogContentModal` *always* overrides `onCloseAutoFocus` to
// call `event.preventDefault()` then `context.triggerRef.current?.focus()`
// — and `triggerRef` is only ever populated by a `<Dialog.Trigger>`, which
// this app never renders (the dialog opens via router navigation from a
// table row's "Scheda"/"Chat" link, not a same-tree trigger click). With no
// trigger ref, that default handler is a silent no-op, and — because it
// already called `preventDefault()` — FocusScope's own generic "restore to
// whatever was focused before" fallback never runs either. Net effect:
// focus silently dropped to `document.body` on every close, confirmed via
// a live focusin/focusout listener before this fix (see
// HANDOFF_PHASE_10.md's Operazione BELLEZZA addendum). Fixed by capturing
// the pre-mount `document.activeElement` in a lazy `useState` initializer
// (evaluated during the first render, before any effect — including
// FocusScope's own mount effect — can move focus into the dialog) and
// restoring it explicitly via our own `onCloseAutoFocus`, which
// `preventDefault()`s before Radix's default handler runs.
// `useNavigate({from: '/aste/$area/lotto/$id'})` is deliberately UNPREFIXED
// while `useParams`/`useSearch` are prefixed — the same TanStack Router
// `from:` quirk documented since Phase 4.
import { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { TabsRoot, TabsList, TabsTab, TabsPanel } from '../../components/Tabs.js';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '../../components/Dialog.js';
import { StatusDisplay } from '../../components/StatusDisplay.js';
import type { AreaSlug } from '@pvp/shared';
import type { PanelTab } from '../dashboard/urlState.js';
import { useListingDetail } from './hooks.js';
import { DettagliTab } from './DettagliTab.js';
import { ActivityTimeline } from './ActivityTimeline.js';
import { ThreadView } from '../chat/ThreadView.js';
import { formatText } from '../dashboard/DataTable/formatting.js';
import './workspace.css';

export function WorkspacePanel() {
  const { t } = useTranslation('workspace');
  const { area, id } = useParams({ from: '/protected-layout/aste/$area/lotto/$id' });
  const search = useSearch({ from: '/protected-layout/aste/$area/lotto/$id' });
  const navigate = useNavigate({ from: '/aste/$area/lotto/$id' });

  const { data: detail, isLoading, isError } = useListingDetail(id);

  // Captured once, synchronously, during this component's first render —
  // before any effect (Radix's FocusScope included) has had a chance to
  // move focus into the dialog. This is whatever the table row's own
  // onClick handler explicitly focused just before navigating here.
  const [opener] = useState<HTMLElement | null>(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

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
    <DialogRoot
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="workspace-drawer-backdrop" />
        <DialogContent
          className="workspace-drawer-popup"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener?.focus({ preventScroll: true });
          }}
        >
          <div className="workspace-drawer-header">
            <DialogTitle className="workspace-drawer-title">{title}</DialogTitle>
            <DialogClose className="workspace-drawer-close" aria-label={t('close')}>
              <X aria-hidden="true" size={18} />
            </DialogClose>
          </div>
          <div className="workspace-drawer-content">
            {isLoading ? <StatusDisplay variant="loading" message={t('loading')} /> : null}
            {isError ? <StatusDisplay variant="error" message={t('loadError')} /> : null}
            {detail ? (
              <TabsRoot
                value={search.pannello}
                onValueChange={(value) =>
                  void navigate({ search: (prev) => ({ ...prev, pannello: value as PanelTab }) })
                }
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
                <TabsPanel value="dettagli">
                  <DettagliTab detail={detail} area={area as AreaSlug} search={search} />
                </TabsPanel>
                <TabsPanel value="storico">
                  <ActivityTimeline listingId={id} />
                </TabsPanel>
                <TabsPanel value="chat">
                  <ThreadView listingId={id} />
                </TabsPanel>
              </TabsRoot>
            ) : null}
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
