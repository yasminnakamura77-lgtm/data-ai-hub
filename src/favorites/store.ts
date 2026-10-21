// Favorites — pure logic (no React, no DOM). Everything lives in the browser's
// localStorage, so it works with the existing app without any backend change.

export type FavType = 'metric' | 'asset' | 'app' | 'governance' | 'page';

export interface Favorite {
  id: string;
  type: FavType;
  refId: string; // id of the thing (metric id, asset id, page key...)
  label: string;
  sublabel?: string;
  folderId: string | null; // "project" (folder); null = no project
  createdAt: number;
  expiresAt: number | null; // null = no date limit
  usesLeft: number | null; // null = no usage limit
}

export interface Folder {
  id: string;
  name: string;
}

export interface FavState {
  items: Favorite[];
  folders: Folder[];
}

/** How long a favorite should stay. */
export type ExpiryChoice =
  | { mode: 'forever' }
  | { mode: 'days'; days: number }
  | { mode: 'date'; date: string }; // YYYY-MM-DD (kept until the end of that day)

export const STORAGE_KEY = 'pilgrims-hub:favorites:v1';
const DAY = 86_400_000;
const TYPES: FavType[] = ['metric', 'asset', 'app', 'governance', 'page'];

export const emptyState = (): FavState => ({ items: [], folders: [] });

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ── storage ──────────────────────────────────────────────────────────────────

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // storage blocked (private mode, policy...)
  }
}

/** Defensive: never trust what is in storage. */
export function sanitize(raw: unknown): FavState {
  const out = emptyState();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as { items?: unknown; folders?: unknown };
  if (Array.isArray(r.folders)) {
    for (const f of r.folders) {
      if (f && typeof f.id === 'string' && typeof f.name === 'string' && f.name.trim()) {
        out.folders.push({ id: f.id, name: f.name });
      }
    }
  }
  if (Array.isArray(r.items)) {
    for (const i of r.items) {
      if (
        i &&
        typeof i.id === 'string' &&
        typeof i.refId === 'string' &&
        typeof i.label === 'string' &&
        TYPES.includes(i.type)
      ) {
        const folderOk = typeof i.folderId === 'string' && out.folders.some((f) => f.id === i.folderId);
        out.items.push({
          id: i.id,
          type: i.type,
          refId: i.refId,
          label: i.label,
          sublabel: typeof i.sublabel === 'string' ? i.sublabel : undefined,
          folderId: folderOk ? i.folderId : null,
          createdAt: typeof i.createdAt === 'number' ? i.createdAt : Date.now(),
          expiresAt: typeof i.expiresAt === 'number' ? i.expiresAt : null,
          usesLeft: typeof i.usesLeft === 'number' ? i.usesLeft : null,
        });
      }
    }
  }
  return out;
}

export function loadState(storage: StorageLike | null = defaultStorage()): FavState {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return text ? sanitize(JSON.parse(text)) : emptyState();
  } catch {
    return emptyState();
  }
}

export function saveState(state: FavState, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / blocked: the UI keeps working for this session */
  }
}

// ── expiry ───────────────────────────────────────────────────────────────────

export const isExpired = (f: Favorite, now: number) =>
  (f.expiresAt !== null && f.expiresAt <= now) || (f.usesLeft !== null && f.usesLeft <= 0);

/** Drops expired favorites. Returns the SAME object when nothing changed. */
export function purge(state: FavState, now: number): FavState {
  const items = state.items.filter((f) => !isExpired(f, now));
  return items.length === state.items.length ? state : { ...state, items };
}

export type ExpiryResult = { ok: true; expiresAt: number | null; usesLeft: number | null } | { ok: false; error: string };

export function resolveExpiry(choice: ExpiryChoice, now: number): ExpiryResult {
  switch (choice.mode) {
    case 'forever':
      return { ok: true, expiresAt: null, usesLeft: null };
    case 'days': {
      const d = Math.floor(choice.days);
      if (!Number.isFinite(d) || d < 1 || d > 3650) return { ok: false, error: 'Enter a number of days between 1 and 3650.' };
      return { ok: true, expiresAt: now + d * DAY, usesLeft: null };
    }
    case 'date': {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(choice.date);
      if (!m) return { ok: false, error: 'Pick a date.' };
      const end = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999).getTime();
      if (!Number.isFinite(end) || end <= now) return { ok: false, error: 'Pick a date in the future.' };
      return { ok: true, expiresAt: end, usesLeft: null };
    }
  }
}

/** Short, human text for the list ("Forever", "3 uses left", "until Oct 27"). */
export function describeExpiry(f: Favorite, now: number): string {
  if (f.usesLeft !== null) return f.usesLeft === 1 ? '1 use left' : `${f.usesLeft} uses left`;
  if (f.expiresAt !== null) {
    if (f.expiresAt - now <= DAY) return 'expires today';
    return `until ${new Date(f.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  return 'forever';
}

// ── operations (all return a NEW state) ──────────────────────────────────────

export interface NewFavorite {
  type: FavType;
  refId: string;
  label: string;
  sublabel?: string;
  folderId: string | null;
}

export const findFavorite = (state: FavState, type: FavType, refId: string) =>
  state.items.find((f) => f.type === type && f.refId === refId);

/** Adds a favorite. If the same thing is already a favorite, it is updated instead of duplicated. */
export function addFavorite(
  state: FavState,
  input: NewFavorite,
  choice: ExpiryChoice,
  now: number,
): { ok: true; state: FavState } | { ok: false; error: string } {
  const exp = resolveExpiry(choice, now);
  if (!exp.ok) return exp;
  const folderId = input.folderId && state.folders.some((f) => f.id === input.folderId) ? input.folderId : null;
  const existing = findFavorite(state, input.type, input.refId);
  const fav: Favorite = {
    id: existing?.id ?? newId(),
    type: input.type,
    refId: input.refId,
    label: input.label,
    sublabel: input.sublabel,
    folderId,
    createdAt: existing?.createdAt ?? now,
    expiresAt: exp.expiresAt,
    usesLeft: exp.usesLeft,
  };
  const items = existing ? state.items.map((f) => (f.id === existing.id ? fav : f)) : [...state.items, fav];
  return { ok: true, state: { ...state, items } };
}

export const removeFavorite = (state: FavState, id: string): FavState => ({
  ...state,
  items: state.items.filter((f) => f.id !== id),
});

export function addFolder(state: FavState, name: string): { state: FavState; folder: Folder } | null {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!clean) return null;
  const same = state.folders.find((f) => f.name.toLowerCase() === clean.toLowerCase());
  if (same) return { state, folder: same }; // reuse instead of creating a twin
  const folder = { id: newId(), name: clean };
  return { state: { ...state, folders: [...state.folders, folder] }, folder };
}

/** Deleting a project also deletes every favorite saved inside it. */
export const removeFolder = (state: FavState, id: string): FavState => ({
  folders: state.folders.filter((f) => f.id !== id),
  items: state.items.filter((f) => f.folderId !== id),
});

export const removeFavorites = (state: FavState, ids: string[]): FavState => {
  const drop = new Set(ids);
  return { ...state, items: state.items.filter((f) => !drop.has(f.id)) };
};
