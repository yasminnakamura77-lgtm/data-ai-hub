import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Bot, Check, ChevronDown, ChevronRight, Database, Folder, Gauge, LayoutDashboard, Plus, Search, ShieldCheck, Star, Trash2, X } from 'lucide-react';

import { fetchDataSources, fetchMetrics } from '../api';
import type { Navigate, View } from '../App';
import { applications, dataAssets, LIFECYCLE_LABEL, metrics } from '../mock';
import {
  addFavorite,
  addFolder,
  describeExpiry,
  type ExpiryChoice,
  type FavState,
  type FavType,
  type Favorite,
  findFavorite,
  loadState,
  purge,
  removeFavorite,
  removeFavorites,
  removeFolder,
  saveState,
  STORAGE_KEY,
} from './store';

// ── what can be favorited ────────────────────────────────────────────────────

interface Candidate {
  type: FavType;
  refId: string;
  label: string;
  sublabel?: string;
}

const TYPE_META: Record<FavType, { label: string; hint: string; icon: ReactNode }> = {
  metric: { label: 'Metrics', hint: 'KPIs you check often', icon: <Gauge className="size-4" /> },
  asset: { label: 'Data', hint: 'Sources and dbt models', icon: <Database className="size-4" /> },
  app: { label: 'Applications', hint: 'Control towers, platforms', icon: <Bot className="size-4" /> },
  governance: { label: 'Governance', hint: 'Governed data sources', icon: <ShieldCheck className="size-4" /> },
  page: { label: 'Pages', hint: 'Shortcuts to Hub screens', icon: <LayoutDashboard className="size-4" /> },
};
const TYPE_ORDER: FavType[] = ['metric', 'asset', 'app', 'governance', 'page'];

const PAGES: { key: string; label: string; view: View }[] = [
  { key: 'landing', label: 'Home', view: { name: 'landing' } },
  { key: 'browse:metrics', label: 'All metrics', view: { name: 'browse', kind: 'metrics' } },
  { key: 'browse:sources', label: 'All data sources', view: { name: 'browse', kind: 'sources' } },
  { key: 'browse:apps', label: 'All applications', view: { name: 'browse', kind: 'apps' } },
  { key: 'browse:terms', label: 'Glossary', view: { name: 'browse', kind: 'terms' } },
  { key: 'governance', label: 'Governance', view: { name: 'governance' } },
  { key: 'dashboard', label: 'Dashboard', view: { name: 'dashboard' } },
  { key: 'explore', label: 'Explore data', view: { name: 'explore' } },
  { key: 'request-source', label: 'Request a data source', view: { name: 'request-source' } },
  { key: 'metric-new', label: 'Create a metric', view: { name: 'metric-new' } },
];

const pageCandidates: Candidate[] = PAGES.map((p) => ({ type: 'page', refId: p.key, label: p.label }));
const appCandidates: Candidate[] = applications.map((a) => ({
  type: 'app',
  refId: a.id,
  label: a.name,
  sublabel: `${a.kind} · ${a.stage}`,
}));

type Remote = { status: 'loading' | 'ready' | 'offline'; items: Candidate[] };

async function loadRemote(type: FavType): Promise<Candidate[]> {
  if (type === 'metric') {
    const real = await fetchMetrics();
    return real.map((m) => ({ type, refId: m.id, label: m.name, sublabel: `${m.area} · ${LIFECYCLE_LABEL[m.lifecycle]}` }));
  }
  if (type === 'asset') {
    const real = await fetchDataSources();
    return real.map((s) => ({ type, refId: s.id, label: s.name, sublabel: `${s.area} · ${s.layerLabel}` }));
  }
  if (type === 'governance') {
    const r = await fetch('/api/catalogue/sources');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const body = (await r.json()) as { sources?: { id: string; code: string; domain?: string; system?: string }[] };
    return (body.sources ?? []).map((s) => ({
      type,
      refId: s.id,
      label: s.code,
      sublabel: [s.domain, s.system].filter(Boolean).join(' · '),
    }));
  }
  return [];
}

const localCandidates = (type: FavType): Candidate[] => {
  if (type === 'metric') {
    return metrics.map((m) => ({ type, refId: m.id, label: m.name, sublabel: `${m.area} · ${LIFECYCLE_LABEL[m.lifecycle]}` }));
  }
  if (type === 'asset') {
    return dataAssets.map((a) => ({ type, refId: a.id, label: a.name, sublabel: `${a.area} · ${a.layerLabel}` }));
  }
  if (type === 'app') return appCandidates;
  if (type === 'page') return pageCandidates;
  return [];
};

// ── state hook ───────────────────────────────────────────────────────────────

function useFavoritesState() {
  const [state, setState] = useState<FavState>(() => purge(loadState(), Date.now()));
  const first = useRef(true);

  // Save on every change (skip the very first render: nothing changed yet).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    saveState(state);
  }, [state]);

  // Remove expired favorites while the app stays open, and sync other tabs.
  useEffect(() => {
    const tick = () => setState((s) => purge(s, Date.now()));
    const timer = window.setInterval(tick, 30_000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(purge(loadState(), Date.now()));
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return [state, setState] as const;
}

// ── UI ───────────────────────────────────────────────────────────────────────

type Step = 'list' | 'type' | 'pick' | 'options';
type Mode = ExpiryChoice['mode'];

// Fixed red (the theme has no reliable "destructive" background color).
const RED = '#dc2626';
const COLLAPSED_KEY = 'pilgrims-hub:favorites:collapsed:v1';
const loadCollapsed = (): string[] => {
  try {
    const v = JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
const inputCls =
  'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-navy';
const ghostBtn =
  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export function FavoritesMenu({
  navigate,
  openGovernanceSource,
}: {
  navigate: Navigate;
  openGovernanceSource: (sourceId: string) => void;
}) {
  const [state, setState] = useFavoritesState();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('list');
  const [type, setType] = useState<FavType>('metric');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [mode, setMode] = useState<Mode>('forever');
  const [days, setDays] = useState('7');
  const [date, setDate] = useState('');
  const [folderSel, setFolderSel] = useState(''); // '' = no project, '__new' = create one
  const [newFolder, setNewFolder] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [remote, setRemote] = useState<Partial<Record<FavType, Remote>>>({});
  const [pos, setPos] = useState({ top: 0, right: 8 });
  const [newProjectOnList, setNewProjectOnList] = useState(false);
  const [listProjectName, setListProjectName] = useState('');
  const [confirmFolderId, setConfirmFolderId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>(loadCollapsed); // project ids ('none' = No project)
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmItemId, setConfirmItemId] = useState<string | null>(null);

  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const now = Date.now();

  const reset = useCallback(() => {
    setStep('list');
    setQuery('');
    setPicked(null);
    setMode('forever');
    setDays('7');
    setDate('');
    setFolderSel('');
    setNewFolder('');
    setError('');
    setNewProjectOnList(false);
    setListProjectName('');
    setConfirmFolderId(null);
    setConfirmItemId(null);
    setSelectMode(false);
    setSelected([]);
    setConfirmBulk(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }, []);

  const toggle = () => {
    if (open) return close();
    place();
    setState((s) => purge(s, Date.now()));
    setOpen(true);
  };

  // close on outside click / Esc; keep the panel glued to the icon on resize
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
    };
  }, [open, close, place]);

  useEffect(() => {
    if (!confirmItemId) return;
    const t = window.setTimeout(() => setConfirmItemId(null), 4000);
    return () => window.clearTimeout(t);
  }, [confirmItemId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // load the live lists (API) when a type is opened; the local samples show instantly
  useEffect(() => {
    if (step !== 'pick' || (type !== 'metric' && type !== 'asset' && type !== 'governance')) return;
    if (remote[type]?.status === 'ready') return;
    let alive = true;
    setRemote((r) => ({ ...r, [type]: { status: 'loading', items: [] } }));
    loadRemote(type)
      .then((items) => alive && setRemote((r) => ({ ...r, [type]: { status: 'ready', items } })))
      .catch(() => alive && setRemote((r) => ({ ...r, [type]: { status: 'offline', items: [] } })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, type]);

  const candidates = useMemo(() => {
    const all = [...(remote[type]?.items ?? []), ...localCandidates(type)];
    const seen = new Set<string>();
    const unique = all.filter((c) => (seen.has(c.refId) ? false : (seen.add(c.refId), true)));
    const q = query.trim().toLowerCase();
    return q ? unique.filter((c) => `${c.label} ${c.sublabel ?? ''}`.toLowerCase().includes(q)) : unique;
  }, [remote, type, query]);

  // ── actions ──
  const openFavorite = (f: Favorite) => {
    close();
    if (f.type === 'governance') return openGovernanceSource(f.refId);
    if (f.type === 'page') {
      const p = PAGES.find((x) => x.key === f.refId);
      if (p) navigate(p.view);
      return;
    }
    navigate({ name: f.type === 'metric' ? 'metric' : f.type === 'asset' ? 'asset' : 'app', id: f.refId });
  };

  const save = () => {
    if (!picked) return;
    let folderId: string | null = folderSel && folderSel !== '__new' ? folderSel : null;
    let next = state;
    if (folderSel === '__new') {
      const created = addFolder(next, newFolder);
      if (!created) return setError('Give the new project a name.');
      next = created.state;
      folderId = created.folder.id;
    }
    const choice: ExpiryChoice =
      mode === 'days' ? { mode, days: Number(days) } : mode === 'date' ? { mode, date } : { mode };
    const res = addFavorite(next, { ...picked, folderId }, choice, Date.now());
    if (!res.ok) return setError(res.error);
    setState(res.state);
    reset();
    setToast('Added to favorites');
  };

  const toggleCollapsed = (key: string) =>
    setCollapsed((c) => {
      const next = c.includes(key) ? c.filter((k) => k !== key) : [...c, key];
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const validSelected = selected.filter((id) => state.items.some((f) => f.id === id));
  const toggleSel = (id: string) => {
    setConfirmBulk(false);
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  };
  const setGroupSel = (ids: string[], on: boolean) => {
    setConfirmBulk(false);
    setSelected((sel) => (on ? [...new Set([...sel, ...ids])] : sel.filter((x) => !ids.includes(x))));
  };
  const exitSelect = () => {
    setSelectMode(false);
    setSelected([]);
    setConfirmBulk(false);
  };

  const createProjectFromList = () => {
    const created = addFolder(state, listProjectName);
    if (!created) return;
    setState(created.state);
    setNewProjectOnList(false);
    setListProjectName('');
  };

  // ── render pieces ──
  const todayISO = new Date(now - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const count = state.items.length;

  const row = (f: Favorite) => (
    <li key={f.id} className="group flex items-center gap-1 rounded-md hover:bg-muted">
      {selectMode && (
        <input
          type="checkbox"
          checked={selected.includes(f.id)}
          onChange={() => toggleSel(f.id)}
          aria-label={`Select ${f.label}`}
          style={{ accentColor: '#0f2744' }}
          className="ml-2 size-4 shrink-0 cursor-pointer"
        />
      )}
      <button
        onClick={() => (selectMode ? toggleSel(f.id) : openFavorite(f))}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left"
        title={selectMode ? `Select ${f.label}` : `Open ${f.label}`}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">{TYPE_META[f.type].icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{f.label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {TYPE_META[f.type].label}
            {f.sublabel ? ` · ${f.sublabel}` : ''} · {describeExpiry(f, now)}
          </span>
        </span>
      </button>
      {selectMode ? null : confirmItemId === f.id ? (
        <span className="mr-1 flex shrink-0 items-center gap-1">
          <button
            onClick={() => {
              setState((s) => removeFavorite(s, f.id));
              setConfirmItemId(null);
            }}
            aria-label={`Confirm removing ${f.label}`}
            title="Yes, remove"
            style={{ background: RED }}
            className="grid size-8 place-items-center rounded-md text-white hover:opacity-90"
          >
            <Check className="size-4" />
          </button>
          <button
            onClick={() => setConfirmItemId(null)}
            aria-label="Keep favorite"
            title="Keep"
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </span>
      ) : (
        <button
          onClick={() => setConfirmItemId(f.id)}
          aria-label={`Remove ${f.label} from favorites`}
          title="Remove"
          className="mr-1 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-[#dc2626] focus-visible:text-[#dc2626] dark:hover:bg-white/10"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );

  const listView = () => {
    const groups: { id: string | null; name: string; items: Favorite[] }[] = [
      ...state.folders.map((fo) => ({ id: fo.id, name: fo.name, items: state.items.filter((i) => i.folderId === fo.id) })),
      { id: null, name: 'No project', items: state.items.filter((i) => i.folderId === null) },
    ];
    const showHeaders = state.folders.length > 0;
    return (
      <>
        {count === 0 && state.folders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Star className="mx-auto mb-2 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">No favorites yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add the things you open all the time and get back to them in one click.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-2 py-2">
            {count > 0 && (
              <div className="-mb-1 flex items-center justify-between gap-2 px-1">
                {selectMode ? (
                  <>
                    <button
                      onClick={() => {
                        setConfirmBulk(false);
                        setSelected(validSelected.length === count ? [] : state.items.map((f) => f.id));
                      }}
                      className={ghostBtn}
                    >
                      {validSelected.length === count ? 'Clear selection' : 'Select all'}
                    </button>
                    <span className="text-xs text-muted-foreground">{validSelected.length} selected</span>
                    <button onClick={exitSelect} className={ghostBtn}>
                      Done
                    </button>
                  </>
                ) : (
                  <button onClick={() => setSelectMode(true)} className={`${ghostBtn} ml-auto`} title="Select several favorites to delete">
                    <Check className="size-3.5" /> Select
                  </button>
                )}
              </div>
            )}
            {groups.map((g) => {
              if (!g.items.length && g.id === null) return null;
              return (
                <section key={g.id ?? 'none'}>
                  {showHeaders && (
                    <div className="mb-1 flex items-center gap-1 px-1">
                      {selectMode && g.items.length > 0 && (
                        <input
                          type="checkbox"
                          checked={g.items.every((i) => selected.includes(i.id))}
                          onChange={(e) => setGroupSel(g.items.map((i) => i.id), e.target.checked)}
                          aria-label={`Select all in ${g.name}`}
                          style={{ accentColor: '#0f2744' }}
                          className="ml-1 size-4 shrink-0 cursor-pointer"
                        />
                      )}
                      <h3 className="min-w-0 flex-1">
                        <button
                          onClick={() => toggleCollapsed(g.id ?? 'none')}
                          aria-expanded={!collapsed.includes(g.id ?? 'none')}
                          title={collapsed.includes(g.id ?? 'none') ? 'Expand' : 'Collapse'}
                          className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-1 py-1 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {collapsed.includes(g.id ?? 'none') ? <ChevronRight className="size-3.5 shrink-0" /> : <ChevronDown className="size-3.5 shrink-0" />}
                          <Folder className="size-3.5 shrink-0" />
                          <span className="min-w-0 truncate text-xs font-semibold tracking-wide uppercase">{g.name}</span>
                          <span className="shrink-0 text-xs font-normal">({g.items.length})</span>
                        </button>
                      </h3>
                      {g.id && !selectMode && confirmFolderId !== g.id && (
                        <button
                          onClick={() => setConfirmFolderId(g.id)}
                          className={ghostBtn}
                          title="Delete this project"
                          aria-label={`Delete project ${g.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  {g.id && !selectMode && confirmFolderId === g.id && (
                    <div role="alertdialog" aria-label={`Confirm deleting project ${g.name}`} style={{ borderColor: RED, background: 'rgba(220,38,38,0.08)' }}
                      className="mx-2 mb-1.5 rounded-md border p-2.5">
                      <p className="text-xs">
                        {g.items.length > 0 ? (
                          <>
                            Delete project <strong>{g.name}</strong> and its {g.items.length} {g.items.length === 1 ? 'favorite' : 'favorites'}? This can’t be undone.
                          </>
                        ) : (
                          <>
                            Delete the empty project <strong>{g.name}</strong>?
                          </>
                        )}
                      </p>
                      <div className="mt-2 flex justify-end gap-2">
                        <button onClick={() => setConfirmFolderId(null)} className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setState((s) => removeFolder(s, g.id!));
                            setConfirmFolderId(null);
                          }}
                          style={{ background: RED }}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                        >
                          Delete project
                        </button>
                      </div>
                    </div>
                  )}
                  {showHeaders && collapsed.includes(g.id ?? 'none') ? null : g.items.length ? (
                    <ul className="flex flex-col">{g.items.map(row)}</ul>
                  ) : (
                    <p className="px-2 pb-1 text-xs text-muted-foreground">Empty — pick this project when adding a favorite.</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
        {selectMode ? (
          <div className="flex flex-col gap-2 border-t border-border p-3">
            {confirmBulk && validSelected.length > 0 ? (
              <div role="alertdialog" aria-label="Confirm deleting selected favorites" style={{ borderColor: RED, background: 'rgba(220,38,38,0.08)' }} className="rounded-md border p-2.5">
                <p className="text-xs">
                  Delete {validSelected.length} {validSelected.length === 1 ? 'favorite' : 'favorites'}? This can’t be undone.
                </p>
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => setConfirmBulk(false)} className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setState((st) => removeFavorites(st, validSelected));
                      exitSelect();
                      setToast('Favorites deleted');
                    }}
                    style={{ background: RED }}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                  >
                    Delete {validSelected.length}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmBulk(true)}
                disabled={validSelected.length === 0}
                style={validSelected.length ? { background: RED } : undefined}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-muted px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:text-muted-foreground"
              >
                <Trash2 className="size-4" /> Delete selected{validSelected.length ? ` (${validSelected.length})` : ''}
              </button>
            )}
          </div>
        ) : (
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <button
            onClick={() => setStep('type')}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-brand-navy px-3 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="size-4" /> Add favorite
          </button>
          {newProjectOnList ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={listProjectName}
                onChange={(e) => setListProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProjectFromList()}
                placeholder="Project name"
                maxLength={40}
                className={inputCls}
              />
              <button onClick={createProjectFromList} className="h-9 shrink-0 rounded-md border border-border px-3 text-sm hover:bg-muted">
                Create
              </button>
            </div>
          ) : (
            <button onClick={() => setNewProjectOnList(true)} className={`${ghostBtn} self-center`}>
              <Folder className="size-3.5" /> New project
            </button>
          )}
        </div>
        )}
      </>
    );
  };

  const typeView = () => (
    <div className="p-3">
      <p className="mb-2 text-sm font-medium">What do you want to favorite?</p>
      <div className="grid grid-cols-1 gap-1.5">
        {TYPE_ORDER.map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              setQuery('');
              setStep('pick');
            }}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-muted"
          >
            <span className="grid size-8 place-items-center rounded-md bg-muted text-foreground">{TYPE_META[t].icon}</span>
            <span>
              <span className="block text-sm font-medium">{TYPE_META[t].label}</span>
              <span className="block text-xs text-muted-foreground">{TYPE_META[t].hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const pickView = () => {
    const r = remote[type];
    return (
      <div className="p-3">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${TYPE_META[type].label.toLowerCase()}…`}
            className={`${inputCls} pl-8`}
          />
        </div>
        <ul className="flex max-h-64 flex-col overflow-y-auto">
          {candidates.map((c) => {
            const fav = findFavorite(state, c.type, c.refId);
            return (
              <li key={c.refId}>
                <button
                  onClick={() => {
                    setPicked(c);
                    setError('');
                    setStep('options');
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{c.label}</span>
                    {c.sublabel && <span className="block truncate text-xs text-muted-foreground">{c.sublabel}</span>}
                  </span>
                  <Star className={`size-4 shrink-0 ${fav ? 'fill-current text-warning' : 'text-muted-foreground/50'}`} aria-label={fav ? 'Already a favorite' : undefined} />
                </button>
              </li>
            );
          })}
          {candidates.length === 0 && r?.status !== 'loading' && <li className="px-2 py-4 text-center text-xs text-muted-foreground">Nothing found.</li>}
        </ul>
        {r?.status === 'loading' && <p className="px-2 pt-2 text-xs text-muted-foreground">Loading more…</p>}
        {r?.status === 'offline' && <p className="px-2 pt-2 text-xs text-muted-foreground">Live list unavailable (API offline) — showing sample items only.</p>}
      </div>
    );
  };

  const optionsView = () => {
    if (!picked) return null;
    const exists = !!findFavorite(state, picked.type, picked.refId);
    const modes: [Mode, string][] = [
      ['forever', 'Forever'],
      ['days', 'Days'],
      ['date', 'Until date'],
    ];
    return (
      <div className="flex flex-col gap-4 p-3">
        <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/50 px-3 py-2">
          <span className="grid size-8 place-items-center rounded-md bg-muted">{TYPE_META[picked.type].icon}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{picked.label}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {TYPE_META[picked.type].label}
              {picked.sublabel ? ` · ${picked.sublabel}` : ''}
            </span>
          </span>
        </div>
        {exists && <p className="-mt-2 text-xs text-muted-foreground">Already a favorite — saving will update it.</p>}

        <div>
          <label htmlFor="fav-project" className="mb-1.5 block text-sm font-medium">
            Save in project
          </label>
          <select id="fav-project" value={folderSel} onChange={(e) => setFolderSel(e.target.value)} className={inputCls}>
            <option value="">No project</option>
            {state.folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            <option value="__new">+ New project…</option>
          </select>
          {folderSel === '__new' && (
            <input
              autoFocus
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="Project name"
              maxLength={40}
              className={`${inputCls} mt-2`}
            />
          )}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">Keep it for</p>
          <div role="radiogroup" aria-label="How long to keep" className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
            {modes.map(([m, label]) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  setMode(m);
                  setError('');
                }}
                className={`rounded px-1 py-1.5 text-xs font-medium transition-colors ${mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2">
            {mode === 'forever' && <p className="text-xs text-muted-foreground">Stays until you remove it.</p>}
            {mode === 'days' && (
              <div className="flex flex-wrap items-center gap-2">
                <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} className={`${inputCls} w-20`} aria-label="Number of days" />
                <span className="text-xs text-muted-foreground">days from today</span>
                {[1, 7, 30].map((d) => (
                  <button key={d} onClick={() => setDays(String(d))} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                    {d}
                  </button>
                ))}
              </div>
            )}
            {mode === 'date' && (
              <div className="flex items-center gap-2">
                <input type="date" min={todayISO} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} aria-label="Keep until" />
              </div>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: RED }} className="text-xs">
            {error}
          </p>
        )}
        <button onClick={save} className="inline-flex h-9 items-center justify-center rounded-md bg-brand-navy px-3 text-sm font-medium text-white hover:opacity-90">
          {exists ? 'Update favorite' : 'Save favorite'}
        </button>
      </div>
    );
  };

  const title = step === 'list' ? 'Favorites' : step === 'type' ? 'Add favorite' : step === 'pick' ? TYPE_META[type].label : 'Options';
  const back = () => setStep(step === 'options' ? 'pick' : step === 'pick' ? 'type' : 'list');

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Favorites"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Favorites"
        className={`relative grid size-9 shrink-0 place-items-center rounded-md transition-colors ${open ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
      >
        <Star className={`size-[18px] ${count > 0 ? 'fill-current' : ''}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Favorites"
            style={{ top: pos.top, right: pos.right, width: 'min(380px, calc(100vw - 16px))', maxHeight: 'calc(100dvh - 96px)' }}
            className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl"
          >
            <div className="flex items-center gap-1 border-b border-border px-2 py-2">
              {step !== 'list' ? (
                <button onClick={back} aria-label="Back" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                  <ArrowLeft className="size-4" />
                </button>
              ) : (
                <Star className="mx-2 size-4 text-warning" />
              )}
              <h2 className="flex-1 text-sm font-semibold">{title}</h2>
              <button onClick={close} aria-label="Close" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto">
              {step === 'list' && listView()}
              {step === 'type' && typeView()}
              {step === 'pick' && pickView()}
              {step === 'options' && optionsView()}
            </div>
            {toast && (
              <div role="status" className="border-t border-border bg-muted px-3 py-1.5 text-center text-xs text-foreground">
                {toast}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
