import { BarChart3, CircleCheckBig, Layers, Settings as SettingsIcon, Sparkles, UtensilsCrossed } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { Logo } from './Logo';

const NAV = [
  { to: '/', label: 'Today', icon: CircleCheckBig },
  { to: '/food', label: 'Food', icon: UtensilsCrossed },
  { to: '/stack', label: 'Stack', icon: Layers },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/coach', label: 'AI Coach', icon: Sparkles },
];

export function Layout() {
  const { syncError } = useApp();
  const loc = useLocation();
  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line/70 bg-surface/60 px-4 py-6 md:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1">
          {[...NAV, { to: '/settings', label: 'Settings', icon: SettingsIcon }].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 font-display text-[19px] font-bold tracking-wide transition ${
                  isActive ? 'bg-accent text-onaccent' : 'text-muted hover:bg-raised hover:text-ink'
                }`
              }
            >
              <n.icon size={20} strokeWidth={2.4} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto text-xs text-muted">Synced to your account.</p>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/50 bg-bg/85 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur md:hidden">
          <Logo />
          <NavLink to="/settings" className={({ isActive }) => `icon-btn ${isActive ? 'text-accent' : ''}`} aria-label="Settings">
            <SettingsIcon size={22} />
          </NavLink>
        </header>

        {syncError && (
          <div className="mx-4 mt-3 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-ink md:mx-8">
            Some changes didn’t reach the server. Check your connection; Loop reloads your data when it can.
          </div>
        )}

        <main key={loc.pathname} className="pb-nav mx-auto w-full max-w-5xl px-4 pt-5 md:px-8 md:pt-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11.5px] font-semibold transition ${isActive ? 'text-accent' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-accent/15' : ''}`}>
                    <n.icon size={21} strokeWidth={isActive ? 2.6 : 2.1} />
                  </span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
