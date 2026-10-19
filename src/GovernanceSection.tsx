import { useEffect, useState } from 'react';

import { useJson } from './governance/lib/use-json';
import { SourceDetail } from './governance/pages/catalogue/source-detail';
import { SourceList } from './governance/pages/catalogue/source-list';
import type { SourceSummary } from './governance/pages/catalogue/types';

/** Both the catalogue and its governance record are embedded in the Hub.
 * Selection never navigates away from the Hub or opens a separate application.
 * Keep the original governance components, including all their dialogs/actions.
 */
export function GovernanceSection() {
  const { data } = useJson<{ sources: SourceSummary[] }>('/api/catalogue/sources');
  const [selectedId, setSelectedId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('source'),
  );
  const [dismissed, setDismissed] = useState(false);

  const select = (id: string | null) => {
    setSelectedId(id);
    setDismissed(id === null);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('source', id);
    else url.searchParams.delete('source');
    window.history.replaceState(null, '', url);
  };

  useEffect(() => {
    if (!selectedId && !dismissed && data?.sources.length) {
      select(data.sources[0].id);
    }
  }, [data, selectedId, dismissed]);

  return (
    <section aria-label="Data quality, trust and governance">
      <SourceList onSelect={select} />
      {selectedId && (
        <div key={selectedId} className="hub-fade-in">
          <SourceDetail sourceId={selectedId} onBack={() => select(null)} />
        </div>
      )}
    </section>
  );
}
