import { useEffect, useState } from 'react';
import { getSupabase, type Assessment, type Company } from '@innova/supabase';
import { Spinner, EmptyState } from '@innova/ui';

interface AssessmentWithCompany extends Assessment {
  companies?: Pick<Company, 'trade_name' | 'legal_name' | 'cnpj'>;
}

export function MeusLaudos() {
  const [list, setList] = useState<AssessmentWithCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      // RLS já filtra para o proprietário ver só sua empresa
      const { data } = await sb.from('assessments')
        .select('*, companies(trade_name, legal_name, cnpj)')
        .in('status', ['concluida', 'arquivada', 'devolutiva'])
        .order('signed_at', { ascending: false });
      setList((data as AssessmentWithCompany[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={32} className="text-accent-500" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Meus laudos</h1>
        <p className="text-sm text-ink-700 mt-1">Laudos PGR · IPAR · planos de ação publicados pela equipe técnica</p>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
            title="Nenhum laudo publicado ainda"
            description="Quando o time técnico publicar laudos da sua empresa, eles aparecem aqui pra download."
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {list.map((a) => (
            <div key={a.id} className="card hover:-translate-y-0.5 hover:shadow-md transition cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 grid place-items-center text-white">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <span className={`pill ${a.status === 'concluida' ? 'pill-ok' : 'pill-accent'}`}>
                  {a.status === 'concluida' ? 'Concluído' : a.status === 'arquivada' ? 'Arquivado' : 'Em devolutiva'}
                </span>
              </div>
              <h3 className="font-display text-2xl">Laudo PGR · {a.cycle}</h3>
              <p className="text-sm text-ink-700 mt-1">{a.companies?.trade_name || a.companies?.legal_name}</p>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-black/5 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-ink-500">Respondentes</div>
                  <div className="font-bold mt-0.5">{a.total_responses} / {a.total_invited}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-ink-500">Assinatura</div>
                  <div className="font-bold mt-0.5">{a.signed_at ? new Date(a.signed_at).toLocaleDateString('pt-BR') : '—'}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button className="btn btn-primary flex-1 justify-center text-xs">📄 Baixar PDF</button>
                <button className="btn btn-ghost text-xs">Ver detalhes</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card bg-accent-50 border border-accent-100">
        <div className="flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div className="text-xs text-ink-700">
            <strong className="text-accent-700 block mb-1">O que está disponível aqui</strong>
            Laudos PGR completos publicados pela equipe técnica · IPAR consolidado · Plano de Ação aprovado · Comprovantes de transmissão do S-2240. Você visualiza e baixa, mas não edita — toda mudança é registrada na trilha de auditoria.
          </div>
        </div>
      </div>
    </div>
  );
}
