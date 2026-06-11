/**
 * Seletor de empresa atual — usado no header dos apps NR1 e Premiações
 * quando o usuário tem mais de 1 empresa vinculada.
 *
 * Estado da empresa atual fica em localStorage (chave 'innova-current-company-{system}').
 * O componente é puramente visual + dispara onChange — quem persiste é o caller.
 */
import { useEffect, useState } from 'react';
import { getSupabase, type Company, type SystemKey } from '@innova/supabase';
import { useAuth } from '@innova/auth';

interface Props {
  /** Sistema atual — filtra só empresas com esse system_access vinculado */
  system: SystemKey;
  /** Empresa atualmente selecionada */
  currentCompanyId: string | null;
  /** Chamado quando o usuário troca de empresa */
  onChange: (companyId: string, company: Company) => void;
}

export function CompanySwitcher({ system, currentCompanyId, onChange }: Props) {
  const profile = useAuth((s) => s.profile);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      setLoading(true);
      const sb = getSupabase();
      // Gestores enxergam todas; outros só as vinculadas via user_companies
      const isGestor = profile.role === 'gestor';
      if (isGestor) {
        const { data } = await sb.from('companies')
          .select('*')
          .contains('system_access', [system])
          .eq('status', 'ativa')
          .order('legal_name');
        setCompanies((data || []) as Company[]);
      } else {
        const { data } = await sb.from('user_companies')
          .select('company_id, system_access, is_primary, companies(*)')
          .eq('profile_id', profile.id)
          .contains('system_access', [system])
          .order('is_primary', { ascending: false });
        const list = (data || [])
          .map((row: any) => row.companies as Company)
          .filter((c) => c && c.status === 'ativa');
        setCompanies(list);
        // Auto-seleciona primária se ainda não tem selecionada
        if (!currentCompanyId && list.length > 0) {
          const primary = (data || []).find((r: any) => r.is_primary);
          const target = (primary?.companies || list[0]) as Company;
          onChange(target.id, target);
        }
      }
      setLoading(false);
    })();
  }, [profile?.id, system]); // eslint-disable-line

  // fecha o popover ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = () => setOpen(false);
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  if (loading) return null;
  if (companies.length === 0) return null;

  // Se só tem 1 empresa, mostra como label estática (sem dropdown)
  if (companies.length === 1) {
    const c = companies[0];
    return (
      <div className="hidden md:flex items-center gap-2 bg-white border border-black/5 rounded-full px-3 py-1.5">
        <BuildingIcon />
        <span className="font-bold text-xs text-ink-900 truncate max-w-[200px]">{c.trade_name || c.legal_name}</span>
      </div>
    );
  }

  const current = companies.find((c) => c.id === currentCompanyId) || companies[0];

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex items-center gap-2 bg-white border border-black/5 hover:border-accent-300 rounded-full pl-3 pr-2 py-1.5 transition group"
        title="Trocar de empresa"
      >
        <BuildingIcon />
        <span className="font-bold text-xs text-ink-900 truncate max-w-[180px]">{current.trade_name || current.legal_name}</span>
        <span className="text-[10px] bg-accent-100 text-accent-700 font-extrabold rounded-full px-1.5 py-0.5 ml-1">{companies.length}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ink-500 group-hover:text-accent-600 transition">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-black/5 z-50 p-2 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-ink-500 px-3 py-2">Trocar empresa</div>
          {companies.map((c) => {
            const isCurrent = c.id === current.id;
            return (
              <button
                key={c.id}
                onClick={() => { onChange(c.id, c); setOpen(false); }}
                className={`w-full text-left rounded-xl px-3 py-2 transition flex items-start gap-2 ${
                  isCurrent ? 'bg-accent-50' : 'hover:bg-surface-muted'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${isCurrent ? 'bg-accent-500 text-white' : 'bg-surface-muted text-ink-700'}`}>
                  <BuildingIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{c.trade_name || c.legal_name}</div>
                  <div className="text-[10px] text-ink-500 font-mono truncate">CNPJ {c.cnpj || '—'}</div>
                </div>
                {isCurrent && <span className="text-accent-600 text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
    </svg>
  );
}
