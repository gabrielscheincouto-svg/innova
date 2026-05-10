import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, signOut } from '@innova/auth';
import { LogoMark } from '@innova/ui';
import { getSupabase } from '@innova/supabase';
import { usePremios } from '../lib/store';

export function Layout() {
  const profile = useAuth((s) => s.profile);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCompanyId, setCompany } = usePremios();

  // Auto-seleciona empresa se o usuário só tem 1 vinculada (caso comum B2B)
  useEffect(() => {
    if (currentCompanyId || !profile?.id) return;
    (async () => {
      const sb = getSupabase();
      const { data } = await sb
        .from('companies')
        .select('id')
        .contains('system_access', ['premiacoes'])
        .limit(2);
      if (data && data.length === 1) {
        setCompany(data[0].id);
      }
    })();
  }, [profile?.id, currentCompanyId, setCompany]);

  const items = [
    { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { to: '/colaboradores', label: 'Colaboradores', icon: <PeopleIcon /> },
    { to: '/criterios', label: 'Critérios', icon: <CheckListIcon /> },
    { to: '/avaliacao', label: 'Avaliação mensal', icon: <ClipboardIcon /> },
    { to: '/folha', label: 'Folha de prêmios', icon: <PayIcon /> },
    { to: '/contratos', label: 'Contratos', icon: <FileSignIcon /> },
    { to: '/calculadora', label: 'Calculadora 457', icon: <CalcIcon /> },
  ];

  const competencia = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="flex h-screen">
      <aside className="w-20 bg-white py-7 flex flex-col items-center gap-1 rounded-tr-[44px] rounded-br-[44px] flex-shrink-0">
        <Link to="/" className="mb-4"><LogoMark size={44} className="drop-shadow" /></Link>
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
            <span className="bg-accent-50 text-accent-700 rounded-2xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 capitalize">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Ciclo {competencia}
            </span>
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

function DashboardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>; }
function PeopleIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="7" r="3"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>; }
function CheckListIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.83 0 5.36 1.31 7 3.36"/></svg>; }
function ClipboardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function PayIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h2"/></svg>; }
function FileSignIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/><path d="M9 14h6M9 18h6M9 10h2"/></svg>; }
function CalcIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/></svg>; }
function CogIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function LogoutIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
