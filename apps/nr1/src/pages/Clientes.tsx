import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase, type Company } from '@innova/supabase';
import { Spinner, EmptyState } from '@innova/ui';

export function Clientes() {
  const [list, setList] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const { data } = await sb.from('companies').select('*').order('legal_name');
      setList((data as Company[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = list.filter((c) =>
    !search || c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.trade_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Clientes</h1>
        <p className="text-sm text-ink-700 mt-1">Empresas que você atende · {list.length} ativas</p>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <input placeholder="Buscar empresa..." className="input max-w-md" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /></svg>}
            title={list.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum resultado'}
            description={list.length === 0 ? 'Peça ao Gestor para vincular você a empresas.' : 'Ajuste a busca'}
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Empresa</th><th>Setor</th><th>Status</th><th>Plano</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-accent-100 text-accent-700 grid place-items-center font-extrabold text-xs">
                        {(c.trade_name || c.legal_name).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold">{c.trade_name || c.legal_name}</div>
                        <div className="text-[11px] text-ink-500">CNPJ {formatCNPJ(c.cnpj)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs">{c.sector || '—'}</td>
                  <td><span className={`pill ${c.status === 'ativa' ? 'pill-ok' : 'pill-gray'}`}>{c.status}</span></td>
                  <td><span className="pill pill-accent">{c.plan_tier}</span></td>
                  <td><Link to={`/clientes/${c.id}`} className="text-xs font-bold text-accent-600">Abrir →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatCNPJ(c: string) {
  const v = (c || '').replace(/\D/g, '').padStart(14, '0');
  return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12,14)}`;
}
