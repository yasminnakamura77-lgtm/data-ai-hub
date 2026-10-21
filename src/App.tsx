import { useState } from 'react';

import { ThemeToggle } from '@pilgrims/ui';

import type { Area } from './mock';
import { ApplicationDetail } from './screens/ApplicationDetail';
import { AssetDetail } from './screens/AssetDetail';
import { Landing } from './screens/Landing';
import { Lineage } from './screens/Lineage';
import { MetricDetail } from './screens/MetricDetail';
import { MetricForm } from './screens/MetricForm';
import { RequestSource } from './screens/RequestSource';
import { Browse, type BrowseKind } from './screens/Browse';
import { HubAssistant } from './HubAssistant';
import { FavoritesMenu } from './favorites/FavoritesMenu';
import { GovernanceSection } from './GovernanceSection';
import { Dashboard } from './governance/pages/dashboard';
import { Explore } from './governance/pages/explore';

export type View =
  | { name: 'landing' }
  | { name: 'governance' }
  | { name: 'dashboard' }
  | { name: 'explore' }
  | { name: 'browse'; kind: BrowseKind }
  | { name: 'asset'; id: string }
  | { name: 'app'; id: string }
  | { name: 'metric'; id: string }
  | { name: 'lineage'; id: string }
  | { name: 'request-source' }
  | { name: 'metric-new' }
  | { name: 'metric-edit'; id: string };

export type Navigate = (v: View) => void;

const NAV: { label: string; go: View }[] = [
  { label: 'Home', go: { name: 'landing' } },
  { label: 'Metrics', go: { name: 'browse', kind: 'metrics' } },
  { label: 'Data', go: { name: 'browse', kind: 'sources' } },
  { label: 'Applications', go: { name: 'browse', kind: 'apps' } },
  { label: 'Glossary', go: { name: 'browse', kind: 'terms' } },
  { label: 'Governance', go: { name: 'governance' } },
  { label: 'Dashboard', go: { name: 'dashboard' } },
  { label: 'Explore data', go: { name: 'explore' } },
];

// Deep-linkable URLs (e.g. ?v=metric:prod-egg-cost, ?v=browse:sources) —
// the design requires every object to have a shareable URL a Tower can link to.
function viewFromUrl(): View {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('v');
  // Old `?source=...` links used to open the catalogue on Home; they now open the Governance tab.
  if (!v && params.has('source')) return { name: 'governance' };
  if (v?.startsWith('browse:')) return { name: 'browse', kind: v.slice('browse:'.length) as BrowseKind };
  if (v?.startsWith('asset:')) return { name: 'asset', id: v.slice('asset:'.length) };
  if (v?.startsWith('app:')) return { name: 'app', id: v.slice('app:'.length) };
  if (v?.startsWith('metric:')) return { name: 'metric', id: v.slice('metric:'.length) };
  if (v?.startsWith('lineage:')) return { name: 'lineage', id: v.slice('lineage:'.length) };
  if (v?.startsWith('metric-edit:')) return { name: 'metric-edit', id: v.slice('metric-edit:'.length) };
  if (v === 'request-source') return { name: 'request-source' };
  if (v === 'governance') return { name: 'governance' };
  if (v === 'dashboard') return { name: 'dashboard' };
  if (v === 'explore') return { name: 'explore' };
  if (v === 'metric-new') return { name: 'metric-new' };
  return { name: 'landing' };
}

function viewToUrl(v: View): string {
  if (v.name === 'landing') return window.location.pathname;
  if (v.name === 'browse') return `?v=browse:${v.kind}`;
  if (v.name === 'request-source') return '?v=request-source';
  if (v.name === 'dashboard' || v.name === 'explore' || v.name === 'governance') return `?v=${v.name}`;
  if (v.name === 'metric-new') return '?v=metric-new';
  return `?v=${v.name}:${'id' in v ? v.id : ''}`;
}

export function App() {
  const [view, setView] = useState<View>(viewFromUrl);
  const [area, setArea] = useState<Area | 'All'>('All');
  const [govKey, setGovKey] = useState(0);

  const navigate: Navigate = (v) => {
    setView(v);
    window.history.replaceState(null, '', viewToUrl(v));
    window.scrollTo({ top: 0 });
  };

  // Used by Favorites: open Governance with a specific source already selected.
  const openGovernanceSource = (sourceId: string) => {
    setGovKey((k) => k + 1); // remount so the section reads ?source= again
    setView({ name: 'governance' });
    window.history.replaceState(null, '', `?v=governance&source=${encodeURIComponent(sourceId)}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <div data-application="data-ai-hub" className="min-h-svh bg-background text-foreground">
      {/* Brand chrome: the product identity stays on its own row, regardless of zoom. */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-brand-navy text-white">
        <div className="mx-auto flex min-h-11 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <button
            onClick={() => navigate({ name: 'landing' })}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-md bg-white/15">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="7.5" cy="12" r="2.1" fill="#fff" />
                <circle cx="16.5" cy="7.5" r="1.8" fill="#fff" opacity="0.85" />
                <circle cx="16.5" cy="16.5" r="1.8" fill="#fff" opacity="0.85" />
                <path
                  d="M9.2 11.2 14.9 8.3 M9.2 12.8 14.9 15.7"
                  stroke="#fff"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </svg>
            </span>
            Pilgrim&apos;s <span className="font-normal text-white/70">Data &amp; AI Hub</span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-white/70 sm:inline">local · admin (dev auth)</span>
            <ThemeToggle />
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex h-11 max-w-6xl items-center px-4 sm:px-6">
            {/* Spacer the same width as the favorites icon keeps the tabs visually centered on wide screens. */}
            <span aria-hidden="true" className="hidden size-9 shrink-0 md:block" />
            <nav
              aria-label="Main navigation"
              className="flex h-11 min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto md:justify-center"
            >
              {NAV.map((item) => {
                const isActive =
                  view.name === item.go.name &&
                  (item.go.name !== 'browse' || (item.go as { kind: string }).kind === (view as { kind?: string }).kind);
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.go)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors ${
                      isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <FavoritesMenu navigate={navigate} openGovernanceSource={openGovernanceSource} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {view.name === 'landing' && <Landing area={area} setArea={setArea} navigate={navigate} />}
        {view.name === 'governance' && <GovernanceSection key={govKey} />}
        {view.name === 'dashboard' && <Dashboard />}
        {view.name === 'explore' && <Explore />}
        {view.name === 'browse' && <Browse kind={view.kind} navigate={navigate} />}
        {view.name === 'asset' && <AssetDetail id={view.id} navigate={navigate} />}
        {view.name === 'app' && <ApplicationDetail id={view.id} navigate={navigate} />}
        {view.name === 'metric' && <MetricDetail id={view.id} navigate={navigate} />}
        {view.name === 'lineage' && <Lineage id={view.id} navigate={navigate} />}
        {view.name === 'request-source' && <RequestSource navigate={navigate} />}
        {view.name === 'metric-new' && <MetricForm mode="create" navigate={navigate} />}
        {view.name === 'metric-edit' && <MetricForm mode="edit" metricId={view.id} navigate={navigate} />}
      </main>
      <HubAssistant />
    </div>
  );
}
