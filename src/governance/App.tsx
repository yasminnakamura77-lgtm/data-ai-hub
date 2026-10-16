import { useState } from 'react';

import { AppHeader, AppNav, AppNavLink } from '@/governance/ui';
import { Catalogue } from './pages/catalogue';
import { Dashboard } from './pages/dashboard';
import { Explore } from './pages/explore';

// Add a page: write it in src/pages/, then add a line here.
const PAGES = [
  { id: 'dashboard', label: 'Dashboard', render: () => <Dashboard /> },
  { id: 'explore', label: 'Explore data', render: () => <Explore /> },
  { id: 'catalogue', label: 'Catalogue', render: () => <Catalogue /> },
];

// A `?source=` link always means the Catalogue page, whatever tab was last open.
const initialPage = () =>
  new URLSearchParams(window.location.search).has('source') ? 'catalogue' : PAGES[0].id;

export function App() {
  const [page, setPage] = useState(initialPage);
  const current = PAGES.find((p) => p.id === page) ?? PAGES[0];

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader title="Control Tower Prototype" />
      <AppNav>
        {PAGES.map((p) => (
          <AppNavLink key={p.id} active={p.id === page} onClick={() => setPage(p.id)}>
            {p.label}
          </AppNavLink>
        ))}
      </AppNav>
      {current.render()}
    </div>
  );
}
