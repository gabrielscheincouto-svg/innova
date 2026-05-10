import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, signOut } from '@innova/auth';
import { LogoMark } from '@innova/ui';

export function Layout() {
  const profile = useAuth((s) => s.profile);
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { to: '/programas', label: 'Programas', icon: <StarIcon /> },
    { to: '/atas', label: 'Atas', icon: <FileIcon /> },
    { to: '/calculadora', label: 'Calculadora', icon: <CalcIcon /> },
  ];

  return (
    <div className="flex h-screen">
      <aside className="w-20 bg-white py-7 flex flex-col items-center gap-2 rounded-tr-[44px] rounded-br-[44px] flex-shrink-0">
        <Link to="/" className="mb-3"><LogoMark size={44} className="drop-shadow" /></Link>
        {items.map((it) => {
          const active = it.to === '/' ? location.pathname === '/' : location.pathname.startsWith(it.to);
          return (
            <Link key={it.to} to={it.to} className={`nav-item ${active ? 'active' : ''}`} title={it.label}>
              {it.icon}
            </Link>
          );
        })}
        <div className="flex-1" />
        <Link to="/configuracoes" className={`nav-item ${location.pathname === '/configuracoes' ? 'active' : ''}`} title="Configurações"><CogIcon /></Link>
        <button onClick={() => { signOut(); navigate('/login'); }} className="nav-item" title="Sair"><LogoutIcon /></button>
      </aside>

      <main className="flex-1 bg-surface rounded-tl-[44px] rounded-bl-[44px] overflow-y-auto">
        <div className="px-10 pt-7 pb-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="pill pill-accent">INNOVA /Premiações</span>
            <span className="text-xs text-ink-500">Art. 457 §2 CLT</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold leading-tight">{profile?.full_name}</div>
              <div className="text-[10px] text-ink-500">{profile?.email}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-300 to-accent-600 grid place-items-center text-white font-extrabold text-xs ring-2 ring-white">
              {(profile?.full_name || '?').split(' ').slice(0,2).map((s) => s[0]?.toUpperCase()).join('')}
            </div>
          </div>
        </div>
        <div className="px-10 py-6 animate-fade-in"><Outlet /></div>
      </main>
    </div>
  );
}

function DashboardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>; }
function StarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>; }
function FileIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>; }
function CalcIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="8.01" y2="10" /><line x1="12" y1="10" x2="12.01" y2="10" /><line x1="16" y1="10" x2="16.01" y2="10" /></svg>; }
function CogIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /></svg>; }
function LogoutIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>; }
