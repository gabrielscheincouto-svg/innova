import { useEffect, useState } from 'react';
import { getSupabase, logAudit, type Company, type Assessment } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';

interface CompanyWithAssessments extends Company {
  assessments?: Assessment[];
}

interface SelectedRow {
  companyId: string;
  assessmentId: string;
}

/**
 * Página de geração de laudos PGR · Gestor master.
 * Pode gerar individualmente ou em lote (selecionando N empresas) e
 * empacotar todos os PDFs num ZIP único.
 */
export function Laudos() {
  const [companies, setCompanies] = useState<CompanyWithAssessments[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAssessmentByCompany, setSelectedAssessmentByCompany] = useState<Record<string, string>>({});
  const [checkedCompanies, setCheckedCompanies] = useState<Set<string>>(new Set());
  const [generatingOne, setGeneratingOne] = useState<string | null>(null);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      const { data } = await sb.from('companies')
        .select('*, assessments(id, cycle, type, status, signed_at, created_at)')
        .order('legal_name');
      const list = (data as CompanyWithAssessments[]) || [];
      // Ordena avaliações por created_at desc dentro de cada empresa, e define a primeira como padrão
      const defaults: Record<string, string> = {};
      list.forEach((c) => {
        const sorted = [...(c.assessments || [])].sort((a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        c.assessments = sorted;
        if (sorted.length > 0) defaults[c.id] = sorted[0].id;
      });
      setCompanies(list);
      setSelectedAssessmentByCompany(defaults);
      setLoading(false);
    })();
  }, []);

  const filtered = companies.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.trade_name || '').toLowerCase().includes(s) ||
           c.legal_name.toLowerCase().includes(s) ||
           (c.cnpj || '').replace(/\D/g, '').includes(search.replace(/\D/g, ''));
  });

  function toggleCheck(companyId: string) {
    setCheckedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }
  function toggleAll() {
    const eligibleIds = filtered.filter((c) => selectedAssessmentByCompany[c.id]).map((c) => c.id);
    if (eligibleIds.every((id) => checkedCompanies.has(id))) {
      setCheckedCompanies(new Set());
    } else {
      setCheckedCompanies(new Set(eligibleIds));
    }
  }

  async function fetchLaudoPDF(assessmentId: string): Promise<Blob> {
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
      body: JSON.stringify({ assessment_id: assessmentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Falha ${res.status}` }));
      throw new Error(err.error || `Falha ${res.status}`);
    }
    return await res.blob();
  }

  function pdfFileName(company: Company, cycle: string | null | undefined): string {
    const nome = (company.trade_name || company.legal_name).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
    return `Laudo-PGR_${nome}_${cycle || 'sem-ciclo'}.pdf`;
  }

  async function gerarUm(c: CompanyWithAssessments) {
    const aId = selectedAssessmentByCompany[c.id];
    if (!aId) { toast('Selecione uma avaliação primeiro', 'warn'); return; }
    setGeneratingOne(c.id);
    try {
      const blob = await fetchLaudoPDF(aId);
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = pdfFileName(c, c.assessments?.find((x) => x.id === aId)?.cycle);
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(downloadUrl);
      await logAudit({ action: 'laudo_downloaded_gestor', resource_type: 'assessment', resource_id: aId, meta: { company_id: c.id } });
      toast(`Laudo de ${c.trade_name || c.legal_name} baixado`, 'ok');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro', 'danger');
    } finally {
      setGeneratingOne(null);
    }
  }

  async function gerarLote() {
    const rows: SelectedRow[] = Array.from(checkedCompanies).map((cId) => ({
      companyId: cId,
      assessmentId: selectedAssessmentByCompany[cId],
    })).filter((r) => r.assessmentId);
    if (rows.length === 0) { toast('Selecione ao menos 1 empresa', 'warn'); return; }
    setGeneratingBatch(true);
    setBatchProgress({ done: 0, total: rows.length, current: '' });
    try {
      // Dinâmico: JSZip só carrega quando precisar
      const JSZipMod = await import('jszip');
      const JSZip = JSZipMod.default;
      const zip = new JSZip();
      const errors: string[] = [];
      let done = 0;
      for (const row of rows) {
        const c = companies.find((x) => x.id === row.companyId)!;
        const cycle = c.assessments?.find((a) => a.id === row.assessmentId)?.cycle;
        setBatchProgress({ done, total: rows.length, current: c.trade_name || c.legal_name });
        try {
          const blob = await fetchLaudoPDF(row.assessmentId);
          zip.file(pdfFileName(c, cycle), blob);
          await logAudit({ action: 'laudo_downloaded_gestor_lote', resource_type: 'assessment', resource_id: row.assessmentId, meta: { company_id: c.id } });
        } catch (e) {
          errors.push(`${c.trade_name || c.legal_name}: ${e instanceof Error ? e.message : 'erro'}`);
        }
        done += 1;
        setBatchProgress({ done, total: rows.length, current: c.trade_name || c.legal_name });
      }
      // Adiciona arquivo de erros se houver
      if (errors.length) {
        zip.file('_ERROS.txt', `Falhas durante a geração em lote:\n\n${errors.join('\n')}`);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const dt = new Date().toISOString().slice(0, 10);
      a.download = `Laudos-PGR_lote_${dt}_${rows.length}-empresas.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(downloadUrl);
      toast(errors.length
        ? `Lote concluído com ${errors.length} erro(s) · ZIP baixado`
        : `${rows.length} laudos empacotados · ZIP baixado`,
        errors.length ? 'warn' : 'ok');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro no lote', 'danger');
    } finally {
      setGeneratingBatch(false);
      setBatchProgress(null);
    }
  }

  const checkedCount = filtered.filter((c) => checkedCompanies.has(c.id) && selectedAssessmentByCompany[c.id]).length;
  const allCheckable = filtered.filter((c) => selectedAssessmentByCompany[c.id]).length;
  const semAvaliacao = filtered.filter((c) => !c.assessments?.length).length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Laudos PGR</h1>
          <p className="text-sm text-ink-700 mt-1">Geração individual ou em lote · multi-empresa · ZIP com N PDFs</p>
        </div>
        <button
          onClick={gerarLote}
          disabled={checkedCount === 0 || generatingBatch}
          className="btn btn-primary inline-flex disabled:opacity-40"
        >
          {generatingBatch
            ? <><Spinner size={14} className="text-white" /> Gerando lote...</>
            : <>📦 Gerar lote ({checkedCount})</>}
        </button>
      </div>

      {/* Progress bar do lote */}
      {batchProgress && (
        <div className="card bg-accent-50 border border-accent-100">
          <div className="flex items-center justify-between text-sm font-bold mb-2">
            <span>Gerando laudo: {batchProgress.current}</span>
            <span>{batchProgress.done}/{batchProgress.total}</span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-accent-500 transition-all" style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            className="input max-w-md flex-1"
            placeholder="Buscar por nome, fantasia ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {allCheckable > 0 && (
            <button onClick={toggleAll} className="btn btn-ghost text-xs">
              {checkedCount === allCheckable ? 'Desmarcar todas' : `Marcar ${allCheckable} elegíveis`}
            </button>
          )}
          {semAvaliacao > 0 && (
            <span className="text-[11px] text-warn font-bold">⚠ {semAvaliacao} sem avaliação</span>
          )}
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-500">Nenhuma empresa encontrada.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>Empresa</th>
                <th>CNPJ</th>
                <th>Avaliação a usar</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const list = c.assessments || [];
                const aId = selectedAssessmentByCompany[c.id] || '';
                const isGenerating = generatingOne === c.id;
                const hasAssessment = list.length > 0;
                return (
                  <tr key={c.id} className={!hasAssessment ? 'opacity-50' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checkedCompanies.has(c.id)}
                        onChange={() => toggleCheck(c.id)}
                        disabled={!hasAssessment}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td>
                      <div className="font-bold">{c.trade_name || c.legal_name}</div>
                      {c.trade_name && <div className="text-[11px] text-ink-500">{c.legal_name}</div>}
                    </td>
                    <td className="text-xs font-mono">{formatCNPJ(c.cnpj)}</td>
                    <td>
                      {hasAssessment ? (
                        <select
                          className="input text-xs py-1.5"
                          value={aId}
                          onChange={(e) => setSelectedAssessmentByCompany((p) => ({ ...p, [c.id]: e.target.value }))}
                        >
                          {list.map((a) => (
                            <option key={a.id} value={a.id}>{a.cycle} · {a.type} · {a.status}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-warn font-bold">Sem avaliação</span>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <button
                          onClick={() => gerarUm(c)}
                          disabled={!hasAssessment || isGenerating || generatingBatch}
                          className="text-xs font-bold text-accent-600 hover:text-accent-700 disabled:opacity-40 inline-flex items-center gap-1"
                        >
                          {isGenerating ? <><Spinner size={12} /> Gerando...</> : '📄 Gerar individual'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card bg-surface-muted">
        <h4 className="font-extrabold text-sm mb-2">💡 Como usar a geração em lote</h4>
        <ol className="text-xs text-ink-700 space-y-1 list-decimal pl-5">
          <li>Marque as empresas que você quer gerar laudo</li>
          <li>Pra cada empresa, escolha qual avaliação será usada (a mais recente vem pré-selecionada)</li>
          <li>Clica <strong>📦 Gerar lote</strong> no topo — o sistema gera 1 PDF por empresa e empacota tudo num ZIP</li>
          <li>Se alguma falhar, vai pra um arquivo <code>_ERROS.txt</code> no próprio ZIP</li>
          <li>Cada laudo gerado vira evento na trilha de auditoria com hash SHA-256</li>
        </ol>
      </div>
    </div>
  );
}

function formatCNPJ(c: string | null | undefined): string {
  if (!c) return '—';
  const v = c.replace(/\D/g, '').padStart(14, '0');
  return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12,14)}`;
}
