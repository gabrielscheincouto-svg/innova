import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase, logAudit, type Assessment } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';

interface AssessmentWithCompany extends Assessment {
  companies?: { trade_name: string | null; legal_name: string };
}

export function Avaliacoes() {
  const [list, setList] = useState<AssessmentWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const confirm = useConfirm();

  async function load() {
    const sb = getSupabase();
    const { data } = await sb.from('assessments')
      .select('*, companies(trade_name, legal_name)')
      .order('created_at', { ascending: false });
    setList((data as AssessmentWithCompany[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(a: AssessmentWithCompany) {
    const empresa = a.companies?.trade_name || a.companies?.legal_name || 'sem nome';
    const ok = await confirm({
      title: `Excluir avaliação?`,
      description: `Cliente: ${empresa} · ciclo ${a.cycle}. Apaga TODAS as ${a.total_responses} respostas COPSOQ e comunicações de perigo vinculadas. Não pode ser desfeito.`,
      confirmLabel: 'Sim, excluir tudo',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('assessments').delete().eq('id', a.id);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'assessment_delete', resource_type: 'assessment', resource_id: a.id, meta: { cycle: a.cycle, company: empresa } });
    toast('Avaliação excluída', 'ok');
    load();
  }

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
            <thead><tr><th>Cliente</th><th>Ciclo</th><th>Status</th><th>Respostas</th><th>Token</th><th className="text-right">Ações</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="font-bold">{a.companies?.trade_name || a.companies?.legal_name || '—'}</td>
                  <td>{a.cycle}</td>
                  <td><span className="pill pill-accent">{a.status}</span></td>
                  <td className="text-xs">{a.total_responses}/{a.total_invited}</td>
                  <td className="text-xs font-mono">{a.token}</td>
                  <td>
                    <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${linkBase}/c/${a.token}`); toast('Link copiado', 'ok'); }}
                        className="text-xs font-bold text-accent-600 hover:text-accent-700"
                      >
                        Copiar link
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="text-xs font-bold text-danger/80 hover:text-danger"
                        title="Excluir avaliação e todas as respostas"
                      >
                        Excluir
                      </button>
                    </div>
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
