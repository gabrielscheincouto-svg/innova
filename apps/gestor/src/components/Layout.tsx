import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, signOut } from '@innova/auth';
import { LogoMark } from '@innova/ui';

export function Layout() {
  const profile = useAuth((s) => s.profile);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { to: '/empresas', label: 'Empresas', icon: <BuildingIcon /> },
    { to: '/usuarios', label: 'Usuários', icon: <UsersIcon /> },
    { to: '/auditoria', label: 'Auditoria', icon: <ShieldIcon /> },
  ];

  return (
    <div className="flex h-screen">
      {/* SIDEBAR */}
      <aside className="w-20 bg-white py-7 flex flex-col items-center gap-2 rounded-tr-[44px] rounded-br-[44px] flex-shrink-0">
        <Link to="/" className="mb-3" title="Innova /Gestor">
          <LogoMark size={44} className="drop-shadow" />
        </Link>
        {navItems.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-item ${active ? 'active' : ''}`}
              title={item.label}
            >
              {item.icon}
            </Link>
          );
        })}
        <div className="flex-1" />
        <Link to="/configuracoes" className={`nav-item ${location.pathname === '/configuracoes' ? 'active' : ''}`} title="Configurações">
          <CogIcon />
        </Link>
        <button onClick={() => { signOut(); navigate('/login'); }} className="nav-item" title="Sair">
          <LogoutIcon />
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 bg-surface rounded-tl-[44px] rounded-bl-[44px] overflow-y-auto">
        {/* TOPBAR */}
        <div className="px-10 pt-7 pb-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="pill pill-accent">INNOVA /Gestor</span>
            <span className="text-xs text-ink-500">painel master</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold leading-tight">{profile?.full_name}</div>
              <div className="text-[10px] text-ink-500">{profile?.email}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-300 to-accent-600 grid place-items-center text-white font-extrabold text-xs ring-2 ring-white">
              {initials(profile?.full_name)}
            </div>
          </div>
        </div>

        <div className="px-10 py-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function initials(name?: string | null) {
  if (!name) return 'GC';
  return name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

// ============ icons ============
function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
