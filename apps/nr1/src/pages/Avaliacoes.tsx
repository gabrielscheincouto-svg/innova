import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase, type Assessment } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';

interface AssessmentWithCompany extends Assessment {
  companies?: { trade_name: string | null; legal_name: string };
}

export function Avaliacoes() {
  const [list, setList] = useState<AssessmentWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const { data } = await sb.from('assessments')
        .select('*, companies(trade_name, legal_name)')
        .order('created_at', { ascending: false });
      setList((data as AssessmentWithCompany[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const linkBase = window.location.origin;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Avaliações</h1>
          <p className="text-sm text-ink-700 mt-1">Em curso · histórico · agendadas</p>
        </div>
        <Link to="/avaliacoes/nova" className="btn btn-primary">+ Nova avaliação</Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-500">Nenhuma avaliação criada ainda.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Cliente</th><th>Ciclo</th><th>Status</th><th>Respostas</th><th>Token</th><th></th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="font-bold">{a.companies?.trade_name || a.companies?.legal_name || '—'}</td>
                  <td>{a.cycle}</td>
                  <td><span className="pill pill-accent">{a.status}</span></td>
                  <td className="text-xs">{a.total_responses}/{a.total_invited}</td>
                  <td className="text-xs font-mono">{a.token}</td>
                  <td>
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${linkBase}/c/${a.token}`); toast('Link copiado', 'ok'); }}
                      className="text-xs font-bold text-accent-600 hover:text-accent-700"
                    >
                      Copiar link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
