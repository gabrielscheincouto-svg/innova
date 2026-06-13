import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, signOut } from '@innova/auth';
import { LogoMark, CompanySwitcher } from '@innova/ui';
import { useNr1 } from '../lib/store';
import type { ReactNode } from 'react';

export function Layout() {
  const profile = useAuth((s) => s.profile);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCompanyId, setCompany } = useNr1();

  const isProprietario = profile?.role === 'proprietario';

  // ========== Menu profissional (full) ==========
  const navProfissional: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { to: '/clientes', label: 'Clientes', icon: <BuildingIcon />, match: '/clientes' },
    { to: '/colaboradores', label: 'Colaboradores', icon: <PeopleIcon /> },
    { to: '/avaliacoes', label: 'Avaliações', icon: <CheckIcon />, match: '/avaliacoes' },
    { to: '/ipar', label: 'IPAR', icon: <AlertIcon /> },
    { to: '/plano-acao', label: 'Plano de Ação', icon: <TargetIcon /> },
    { to: '/comunicacoes', label: 'Comunicações', icon: <MessageIcon /> },
    { to: '/relatorios', label: 'Relatórios', icon: <FileIcon /> },
    { to: '/manual', label: 'Manual', icon: <BookIcon /> },
  ];

  // ========== Menu proprietário (read-only · simplificado) ==========
  const navProprietario: NavItem[] = [
    { to: '/', label: 'Painel', icon: <DashboardIcon /> },
    { to: '/meus-laudos', label: 'Meus laudos', icon: <FileIcon /> },
    { to: '/meus-indicadores', label: 'Indicadores', icon: <ChartIcon /> },
    { to: '/comunicacoes', label: 'Comunicações', icon: <MessageIcon /> },
    { to: '/minha-empresa', label: 'Minha empresa', icon: <BuildingIcon /> },
    { to: '/manual', label: 'Manual', icon: <BookIcon /> },
  ];

  const navItems = isProprietario ? navProprietario : navProfissional;

  return (
    <div className="flex h-screen">
      <aside className="w-20 bg-white py-7 flex flex-col items-center gap-2 rounded-tr-[44px] rounded-br-[44px] flex-shrink-0">
        <Link to="/" className="mb-3" title="Innova /NR1">
          <LogoMark size={44} className="drop-shadow" />
        </Link>
        {navItems.map((item) => {
          const active = item.match
            ? location.pathname.startsWith(item.match)
            : item.to === '/'
            ? location.pathname === '/'
            : location.pathname === item.to;
          return (
            <Link key={item.to} to={item.to} className={`nav-item ${active ? 'active' : ''}`} data-tooltip={item.label}>
              {item.icon}
            </Link>
          );
        })}
        <div className="flex-1" />
        <Link to="/configuracoes" className={`nav-item ${location.pathname === '/configuracoes' ? 'active' : ''}`} data-tooltip="Configurações">
          <CogIcon />
        </Link>
        <button onClick={() => { signOut(); navigate('/login'); }} className="nav-item" data-tooltip="Sair">
          <LogoutIcon />
        </button>
      </aside>

      <main className="flex-1 bg-surface rounded-tl-[44px] rounded-bl-[44px] overflow-y-auto">
        <div className="px-10 pt-7 pb-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="pill pill-accent">INNOVA /NR1</span>
            <span className="text-xs text-ink-500">
              {isProprietario ? '👁 área do cliente · só leitura' : '⚙ área profissional · operacional'}
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <CompanySwitcher
              system="nr1"
              currentCompanyId={currentCompanyId}
              onChange={(id) => setCompany(id)}
            />
            <div className="text-right">
              <div className="text-sm font-bold leading-tight">{profile?.full_name}</div>
              <div className="text-[10px] text-ink-500">{profile?.email} · {profile?.role}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-300 to-accent-600 grid place-items-center text-white font-extrabold text-xs ring-2 ring-white">
              {initials(profile?.full_name)}
            </div>
          </div>
        </div>
        <div className="px-10 py-6 animate-fade-in"><Outlet /></div>
      </main>
    </div>
  );
}

interface NavItem { to: string; label: string; icon: ReactNode; match?: string }

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

function DashboardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>; }
function BuildingIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /></svg>; }
function CheckIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>; }
function AlertIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>; }
function TargetIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>; }
function MessageIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>; }
function FileIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>; }
function ChartIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>; }
function CogIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /></svg>; }
function LogoutIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>; }
function PeopleIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function BookIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
