import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSupabase, type Company, type Assessment } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';

export function ClienteDetail() {
  const { id } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    async function load() {
      if (!id) return;
      const sb = getSupabase();
      const [cRes, aRes] = await Promise.all([
        sb.from('companies').select('*').eq('id', id).single(),
        sb.from('assessments').select('*').eq('company_id', id).order('created_at', { ascending: false }),
      ]);
      setCompany((cRes.data as Company) || null);
      setAssessments((aRes.data as Assessment[]) || []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={32} className="text-accent-500" /></div>;
  if (!company) return <div className="card"><p>Cliente não encontrado</p></div>;

  const linkBase = window.location.origin;

  return (
    <div className="space-y-5">
      <Link to="/clientes" className="text-xs text-ink-500 font-semibold">← Clientes</Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-100 text-accent-700 grid place-items-center font-extrabold text-lg">
            {(company.trade_name || company.legal_name).slice(0,2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-3xl">{company.trade_name || company.legal_name}</h1>
            <p className="text-sm text-ink-700">CNPJ {company.cnpj} · {company.sector || 'sem setor'}</p>
          </div>
        </div>
        <Link to="/avaliacoes/nova" state={{ company_id: company.id }} className="btn btn-primary">+ Nova avaliação</Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <h3 className="font-extrabold text-base mb-4">Avaliações</h3>
          {assessments.length === 0 ? (
            <p className="text-sm text-ink-500 py-6 text-center">Nenhuma avaliação ainda. Clique em "Nova avaliação" para começar.</p>
          ) : (
            <table className="data-table">
              <thead><tr><th>Ciclo</th><th>Tipo</th><th>Status</th><th>Resp.</th><th>Token</th></tr></thead>
              <tbody>
                {assessments.map((a) => (
                  <tr key={a.id}>
                    <td className="font-bold">{a.cycle}</td>
                    <td className="text-xs">{a.type}</td>
                    <td><span className="pill pill-accent">{a.status}</span></td>
                    <td className="text-xs">{a.total_responses}/{a.total_invited}</td>
                    <td>
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${linkBase}/c/${a.token}`); toast('Link copiado', 'ok'); }}
                        className="text-xs font-bold text-accent-600 hover:text-accent-700"
                      >
                        Copiar link →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 className="font-extrabold text-base mb-4">Atalhos</h3>
          <div className="space-y-2">
            <Link to="/ipar" className="block p-3 rounded-2xl bg-surface-muted hover:bg-accent-50 text-sm font-bold">IPAR · Inventário de Riscos →</Link>
            <Link to="/plano-acao" className="block p-3 rounded-2xl bg-surface-muted hover:bg-accent-50 text-sm font-bold">Plano de Ação →</Link>
            <Link to="/comunicacoes" className="block p-3 rounded-2xl bg-surface-muted hover:bg-accent-50 text-sm font-bold">Comunicações →</Link>
            <Link to="/relatorios" className="block p-3 rounded-2xl bg-surface-muted hover:bg-accent-50 text-sm font-bold">Relatórios + Laudo →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
