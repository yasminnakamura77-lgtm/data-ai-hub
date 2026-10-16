import { useState } from 'react';

import { SourceDetail } from './source-detail';
import { SourceList } from './source-list';

const sourceIdFromUrl = () => new URLSearchParams(window.location.search).get('source');

/**
 * No router in this kit (see CLAUDE.md) — this page just tracks which
 * source, if any, is selected and swaps views. Same trick App.tsx uses for
 * the top-level pages, plus a `?source=` query param so a specific source
 * has a shareable/refreshable URL (every object should get a link).
 */
export function Catalogue() {
  const [selectedId, setSelectedId] = useState<string | null>(sourceIdFromUrl);

  const select = (id: string | null) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('source', id);
    else url.searchParams.delete('source');
    window.history.replaceState(null, '', url);
  };

  if (selectedId) {
    return <SourceDetail sourceId={selectedId} onBack={() => select(null)} />;
  }
  return <SourceList onSelect={select} />;
}
