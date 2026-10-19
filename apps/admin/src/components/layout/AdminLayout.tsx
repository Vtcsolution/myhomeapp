import { brand } from '@myhome/shared';
import {
  Bell,
  Briefcase,
  CalendarCheck,
  ChevronDown,
  CircleUserRound,
  Gauge,
  Languages,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  MapPinned,
  Menu,
  Moon,
  Monitor,
  Search,
  Settings,
  Star,
  Sun,
  Tag,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
  Building2,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAdminProfile, useDashboard } from '@/data/queries';
import type { TKey } from '@/i18n';
import { buildAlerts } from '@/lib/alerts';
import { useLocale } from '@/providers/LocaleProvider';
import { useSession } from '@/providers/SessionProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { readPreferences } from '@/services/preferences';
import { ConfirmDialog, IconButton } from '../ui';

interface NavItem {
  to: string;
  label: TKey;
  icon: LucideIcon;
  end?: boolean;
  count?: 'pending' | 'tickets';
}

const NAV: { label: TKey; items: NavItem[] }[] = [
  { label: 'nav.overview', items: [{ to: '/', label: 'nav.dashboard', icon: Gauge, end: true }] },
  {
    label: 'nav.operations',
    items: [
      { to: '/bookings', label: 'nav.bookings', icon: CalendarCheck, count: 'pending' },
      { to: '/customers', label: 'nav.customers', icon: Users },
      { to: '/technicians', label: 'nav.technicians', icon: Wrench },
      { to: '/vendors', label: 'nav.vendors', icon: Building2 },
    ],
  },
  {
    label: 'nav.catalogue',
    items: [
      { to: '/categories', label: 'nav.categories', icon: LayoutGrid },
      { to: '/services', label: 'nav.services', icon: Briefcase },
      { to: '/zones', label: 'nav.zones', icon: MapPinned },
    ],
  },
  {
    label: 'nav.growth',
    items: [
      { to: '/coupons', label: 'nav.coupons', icon: Tag },
      { to: '/reviews', label: 'nav.reviews', icon: Star },
    ],
  },
  { label: 'nav.finance', items: [{ to: '/payouts', label: 'nav.payouts', icon: Wallet }] },
  {
    label: 'nav.support',
    items: [{ to: '/tickets', label: 'nav.tickets', icon: LifeBuoy, count: 'tickets' }],
  },
  { label: 'nav.system', items: [{ to: '/settings', label: 'nav.settings', icon: Settings }] },
];

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

export function AdminLayout() {
  const { t, locale, setLocale, brandName } = useLocale();
  const { preference, setPreference } = useTheme();
  const { signOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboard = useDashboard();
  const profile = useAdminProfile();
  const [navOpen, setNavOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [query, setQuery] = useState('');
  const alertsRef = useOutsideClose(alertsOpen, () => setAlertsOpen(false));
  const menuRef = useOutsideClose(menuOpen, () => setMenuOpen(false));

  // Close the drawer after navigating (small screens).
  const [navPath, setNavPath] = useState(location.pathname);
  if (navPath !== location.pathname) {
    setNavPath(location.pathname);
    setNavOpen(false);
  }

  const alerts = dashboard.data ? buildAlerts(dashboard.data, readPreferences().alerts) : [];
  const alertTotal = alerts.reduce((s, a) => s + a.count, 0);
  const counts = {
    pending: dashboard.data?.byStatus.pending ?? 0,
    tickets: dashboard.data?.alerts.openTickets ?? 0,
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/bookings?q=${encodeURIComponent(q)}` : '/bookings');
  };

  const ThemeIcon = preference === 'dark' ? Moon : preference === 'light' ? Sun : Monitor;
  const nextTheme = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';

  return (
    <div className="shell" data-nav-open={navOpen}>
      <aside className="sidebar" aria-label={t('nav.main')}>
        <Link to="/" className="sidebar__brand">
          <span className="monogram" aria-hidden>
            {brand.monogram}
          </span>
          <span>
            <span className="sidebar__brand-name">{brandName}</span>
            <br />
            <span className="sidebar__brand-sub">{t('nav.console')}</span>
          </span>
        </Link>
        <nav className="stack" style={{ gap: 18 }} aria-label={t('nav.main')}>
          {NAV.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group__label">{t(group.label)}</div>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                  <item.icon size={17} aria-hidden />
                  <span>{t(item.label)}</span>
                  {item.count && counts[item.count] ? (
                    <span className="nav-link__count">{counts[item.count]}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar__footer">{t('nav.footer')}</div>
      </aside>
      {navOpen ? <div className="nav-scrim" onClick={() => setNavOpen(false)} aria-hidden /> : null}

      <div className="main">
        <header className="topbar">
          <span className="menu-button">
            <IconButton icon={Menu} label={t('nav.openMenu')} onClick={() => setNavOpen(true)} />
          </span>
          <form className="topbar__search input-icon" role="search" onSubmit={search}>
            <Search size={16} aria-hidden />
            <input
              className="input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('topbar.search')}
              aria-label={t('topbar.search')}
            />
          </form>
          <div className="topbar__actions">
            <div ref={alertsRef} style={{ position: 'relative' }}>
              <IconButton
                icon={Bell}
                label={t('topbar.alerts')}
                badge={alertTotal}
                aria-expanded={alertsOpen}
                onClick={() => setAlertsOpen((o) => !o)}
              />
              {alertsOpen ? (
                <div className="popover" role="dialog" aria-label={t('topbar.alerts')}>
                  <div className="overline" style={{ padding: '8px 10px' }}>
                    {t('topbar.alerts')}
                  </div>
                  {alerts.length === 0 ? (
                    <p className="muted" style={{ padding: '4px 10px 10px', margin: 0 }}>
                      {t('topbar.noAlerts')}
                    </p>
                  ) : (
                    alerts.map((a) => (
                      <Link
                        key={a.key}
                        to={a.href}
                        className="popover__item"
                        onClick={() => setAlertsOpen(false)}
                      >
                        <span className={`badge badge--${a.tone}`}>{a.count}</span>
                        <span>{t(`alerts.${a.key}`, { count: a.count })}</span>
                      </Link>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <IconButton
              icon={Languages}
              label={`${t('topbar.language')}: ${locale === 'en' ? t('common.arabic') : t('common.english')}`}
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            />
            <IconButton
              icon={ThemeIcon}
              label={`${t('topbar.theme')}: ${t(`topbar.${preference}`)}`}
              onClick={() => setPreference(nextTheme)}
            />
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn--ghost"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={t('topbar.account')}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <CircleUserRound size={18} aria-hidden />
                <span className="hide-sm truncate" style={{ maxWidth: 140 }}>
                  {profile.data?.fullName ?? ''}
                </span>
                <ChevronDown size={14} aria-hidden />
              </button>
              {menuOpen ? (
                <div className="popover" role="menu" style={{ width: 260 }}>
                  {profile.data ? (
                    <div style={{ padding: '8px 10px 10px' }}>
                      <div className="strong">{profile.data.fullName}</div>
                      <div className="small muted ltr">{profile.data.email}</div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="popover__item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/settings');
                    }}
                  >
                    <Settings size={16} aria-hidden />
                    {t('nav.settings')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="popover__item danger-text"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmSignOut(true);
                    }}
                  >
                    <LogOut size={16} aria-hidden />
                    {t('topbar.signOut')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main id="main">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title={t('topbar.signOutTitle')}
        body={t('topbar.signOutBody')}
        confirmLabel={t('topbar.signOut')}
        destructive
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setConfirmSignOut(false);
          void signOut().then(() => navigate('/login', { replace: true }));
        }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  crumbs = [],
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  crumbs?: { label: string; to?: string }[];
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  const { t, brandName } = useLocale();
  useEffect(() => {
    document.title = `${title} · ${brandName} ${t('nav.console')}`;
  }, [title, brandName, t]);
  return (
    <div className="page-header">
      <div className="page-header__titles">
        {crumbs.length ? (
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} className="row" style={{ gap: 6 }}>
                {i > 0 ? <span aria-hidden>/</span> : null}
                {c.to ? (
                  <Link to={c.to}>{c.label}</Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="row row--wrap">
          <h1 className="h1 display">{title}</h1>
          {badge}
        </div>
        {subtitle ? (
          <p className="secondary" style={{ margin: 0 }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}
