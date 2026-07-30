// Tabs primitive over `@radix-ui/react-tabs`, replacing `primereact/tabs`
// (Execution Plan Phase 9). Verified against the installed
// @radix-ui/react-tabs@1.1.21 source (not assumed): Tabs.Content always
// renders its own wrapper div (role="tabpanel", `hidden` when inactive) for
// every tab — but only renders its *children* for the active tab
// (`{present && children}` internally). That's what the dashboard's
// virtualized-table performance story (Phase 4) actually depends on: the
// expensive DataTable/ClusterSection subtree only mounts for the active
// tab, even though a cheap hidden wrapper persists for every tab — the same
// practical effect as PrimeReact's `lazy` mode, confirmed via a real DOM
// check (only the active tab's rows are ever in the tree).
// `TabsPanels` has no Radix equivalent and is intentionally dropped; callers
// render `TabsPanel` directly inside `TabsRoot`. `onValueChange` takes a
// plain string (Radix's native signature), not PrimeReact's `{value}` event
// shape.
// Phase 13: tabs.css defines the single shared underline-tab voice
// (`.ui-tabs-list` / `.ui-tab`) consumed by every tab strip in the app.
import * as RadixTabs from '@radix-ui/react-tabs';
import './tabs.css';

export const TabsRoot = RadixTabs.Root;
export const TabsList = RadixTabs.List;

export function TabsTab(props: RadixTabs.TabsTriggerProps) {
  return <RadixTabs.Trigger {...props} />;
}

export function TabsPanel(props: RadixTabs.TabsContentProps) {
  return <RadixTabs.Content {...props} />;
}
