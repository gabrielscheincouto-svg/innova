import { useEffect, useState } from 'react';
import { getSupabase, type Company, type Assessment, logAudit } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';

interface CompanyWithAssessments extends Company {
  assessments?: Assessment[];
}

export function Relatorios() {
  const [companies, setCompanies] = useState<CompanyWithAssessments[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const { data } = await sb.from('companies')
        .select('*, assessments(id, cycle, type, status, signed_at)')
        .order('legal_name');
      setCompanies((data as CompanyWithAssessments[]) || []);
      if (data && data.length) {
        setSelectedCompany(data[0].id);
        const firstAssessment = (data[0] as CompanyWithAssessments).assessments?.[0];
        if (firstAssessment) setSelectedAssessment(firstAssessment.id);
      }
      setLoading(false);
    }
    load();
  }, []);

  const company = companies.find((c) => c.id === selectedCompany);
  const assessmentList = company?.assessments || [];

  async function gerarLaudo() {
    if (!selectedAssessment) {
      toast('Selecione uma avaliação primeiro', 'warn');
      return;
    }
    setGenerating(true);
    try {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-laudo`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assessment_id: selectedAssessment }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Falha ${res.status}`);
      }

      const documentHash = res.headers.get('X-Document-Hash');
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Laudo-PGR-NR1_${(company?.trade_name || company?.legal_name || 'empresa').replace(/\s+/g, '_')}_${assessmentList.find((a) => a.id === selectedAssessment)?.cycle || 'cycle'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      await logAudit({
        action: 'laudo_downloaded',
        resource_type: 'assessment',
        resource_id: selectedAssessment,
        meta: { document_hash: documentHash },
      });

      toast('Laudo gerado · download iniciado', 'ok');
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Erro ao gerar laudo', 'danger');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={32} className="text-accent-500" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Relatórios</h1>
        <p className="text-sm text-ink-700 mt-1">Laudo PGR · IPAR · Plano de Ação · Comprovantes</p>
      </div>

      <div className="card">
        <h3 className="font-extrabold text-base mb-4">Selecione o cliente e a avaliação</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Empresa</label>
            <select className="input" value={selectedCompany} onChange={(e) => {
              setSelectedCompany(e.target.value);
              const c = companies.find((co) => co.id === e.target.value);
              setSelectedAssessment(c?.assessments?.[0]?.id || '');
            }}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Avaliação</label>
            <select className="input" value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)} disabled={assessmentList.length === 0}>
              {assessmentList.length === 0 ? (
                <option value="">— sem avaliações —</option>
              ) : (
                assessmentList.map((a) => (
                  <option key={a.id} value={a.id}>{a.cycle} · {a.type} · {a.status}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card bg-gradient-to-br from-accent-500 to-accent-700 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-warn">Documento principal · Edge Function</span>
            <span className="pill bg-ok text-white">● Pronto</span>
          </div>
          <h3 className="font-display text-3xl">Laudo PGR · NR-1</h3>
          <p className="text-sm text-white/85 mt-2">5 páginas · capa, sumário executivo, IPAR, plano de ação, assinaturas + trilha de auditoria SHA-256.</p>
          <div className="mt-4 text-[11px] text-white/70 space-y-1">
            <div>✓ Assinatura digital incluída (RT cadastrado)</div>
            <div>✓ Hash SHA-256 + timestamp na trilha de auditoria</div>
            <div>✓ Storage WORM (se bucket configurado)</div>
            <div>✓ Audit log automático</div>
          </div>
          <button
            onClick={gerarLaudo}
            disabled={!selectedAssessment || generating}
            className="mt-5 bg-warn text-ink-900 rounded-2xl px-5 py-3 font-extrabold text-sm w-full disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {generating ? <><Spinner size={16} /> Gerando PDF...</> : <>📄 Gerar e baixar laudo PDF</>}
          </button>
        </div>

        <div className="space-y-3">
          <DownloadCard title="Inventário de Riscos (IPAR)" desc="Tabela completa em XLSX (em breve)" disabled />
          <DownloadCard title="Plano de Ação" desc="Cronograma · responsáveis · evidências (em breve)" disabled />
          <DownloadCard title="Comprovantes S-2240" desc="XML + PDF dos eventos transmitidos (em breve)" disabled />
          <DownloadCard title="Trilha de auditoria" desc="Logs SHA-256 + timestamps · 20 anos (em breve)" disabled />
        </div>
      </div>

      <div className="card">
        <h4 className="font-extrabold text-sm mb-2">⚙ Configuração da Edge Function</h4>
        <div className="text-xs text-ink-700 space-y-2">
          <p>O laudo é gerado por uma <strong>Supabase Edge Function</strong> (Deno + pdf-lib) rodando na infra Supabase. Pra ativar:</p>
          <pre className="bg-surface-muted rounded-xl p-3 text-[11px] font-mono overflow-x-auto">
{`supabase login
supabase link --project-ref <seu-project-ref>
supabase functions deploy generate-laudo --no-verify-jwt`}
          </pre>
          <p>Documentação completa em <code>supabase/functions/README.md</code>.</p>
        </div>
      </div>
    </div>
  );
}

function DownloadCard({ title, desc, disabled }: { title: string; desc: string; disabled?: boolean }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-accent-50 grid place-items-center text-accent-600 flex-shrink-0">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-ink-500">{desc}</div>
      </div>
      <button disabled={disabled} className="btn btn-ghost text-xs disabled:opacity-50">Baixar</button>
    </div>
  );
}
