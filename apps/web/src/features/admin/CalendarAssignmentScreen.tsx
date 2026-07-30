// Admin calendar assignment (UI §8.3) — three tasks (random / removal /
// by-id) as tabs on the `tab` search param, mirroring the workspace's own
// TabsRoot-driven-by-URL pattern (WorkspacePanel.tsx).
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { TabsRoot, TabsList, TabsTab, TabsPanel } from '../../components/Tabs.js';
import type { AdminCalendarTab } from './adminCalendarUrlState.js';
import { RandomAssignTab } from './RandomAssignTab.js';
import { RemoveAssignTab } from './RemoveAssignTab.js';
import { ByIdAssignTab } from './ByIdAssignTab.js';
import './admin.css';

export function CalendarAssignmentScreen() {
  const { t } = useTranslation('admin');
  const search = useSearch({ from: '/protected-layout/admin/calendario' });
  const navigate = useNavigate({ from: '/admin/calendario' });

  return (
    <div className="admin-screen">
      <h1>{t('calendarAssignment.title')}</h1>
      <TabsRoot
        value={search.tab}
        onValueChange={(value) => void navigate({ search: { tab: value as AdminCalendarTab } })}
      >
        <TabsList className="admin-calendar-tabs">
          <TabsTab value="casuale" className="admin-calendar-tab">
            {t('calendarAssignment.tabs.random')}
          </TabsTab>
          <TabsTab value="rimozione" className="admin-calendar-tab">
            {t('calendarAssignment.tabs.removal')}
          </TabsTab>
          <TabsTab value="per-id" className="admin-calendar-tab">
            {t('calendarAssignment.tabs.byId')}
          </TabsTab>
        </TabsList>
        <TabsPanel value="casuale">
          <RandomAssignTab />
        </TabsPanel>
        <TabsPanel value="rimozione">
          <RemoveAssignTab />
        </TabsPanel>
        <TabsPanel value="per-id">
          <ByIdAssignTab />
        </TabsPanel>
      </TabsRoot>
    </div>
  );
}
