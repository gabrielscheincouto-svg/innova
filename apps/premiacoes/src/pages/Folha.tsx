import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSupabase, type PremiosColaborador, type PremiosCriterio, type PremiosAvaliacao, type PremiosFolha, type PremiosFolhaStatus } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';
import { usePremios, formatCompetencia, shiftCompetencia } from '../lib/store';

interface FolhaRow {
  colaborador: PremiosColaborador;
  media: number;
  premio: number;
  premioMax: number;
  folhaId: string | null;
  status: PremiosFolhaStatus;
}

// teto do prêmio (natureza indenizatória) = salário_base * (1 + adicional/100)
function calcPremioMax(c: PremiosColaborador): number {
  const sal = Number(c.salario_base) || 0;
  const adic = Number((c as any).adicional_percent) || 0;
  if (sal <= 0) return 0;
  return Number((sal * (1 + adic / 100)).toFixed(2));
}

export function Folha() {
  const { currentCompanyId, currentCompetencia, setCompetencia } = usePremios();
  const [rows, setRows] = useState<FolhaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [premioBase, setPremioBase] = useState('500');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { if (currentCompanyId) load(); else setLoading(false); }, [currentCompanyId, currentCompetencia]);

  async function load() {
    if (!currentCompanyId) return;
    setLoading(true);
    const sb = getSupabase();
    const [{ data: cs }, { data: cr }, { data: av }, { data: fl }] = await Promise.all([
      sb.from('premios_colaboradores').select('*').eq('company_id', currentCompanyId).eq('is_active', true).order('full_name'),
      sb.from('premios_criterios').select('*').eq('company_id', currentCompanyId).eq('is_active', true),
      sb.from('premios_avaliacoes').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
      sb.from('premios_folha').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
    ]);
    const colabs = (cs || []) as PremiosColaborador[];
    const crits = (cr || []) as PremiosCriterio[];
    const avals = (av || []) as PremiosAvaliacao[];
    const folhas = (fl || []) as PremiosFolha[];
    const computed: FolhaRow[] = colabs.map((c) => {
      let sum = 0, w = 0;
      for (const cri of crits) {
        const a = avals.find((x) => x.colaborador_id === c.id && x.criterio_id === cri.id);
        if (a) { sum += a.score * cri.weight; w += cri.weight; }
      }
      const media = w > 0 ? sum / w : 0;
      const existing = folhas.find((f) => f.colaborador_id === c.id);
      return {
        colaborador: c,
        media,
        premio: existing ? Number(existing.premio_value) : 0,
        premioMax: calcPremioMax(c),
        folhaId: existing?.id || null,
        status: existing?.status || 'pendente',
      };
    });
    setRows(computed);
    setLoading(false);
  }

  // calcula prêmio sugerido (linear sobre o premioBase), depois aplica cap
  // do teto = salario_base × (1 + adicional/100). Sem teto cadastrado, mantém valor sugerido.
  function gerarFolha() {
    const base = Number(premioBase) || 0;
    setRows((prev) => prev.map((r) => {
      let sugerido = r.media >= 3 ? Number((base * (r.media / 5)).toFixed(2)) : 0;
      // se tem teto (salário base cadastrado), respeita
      if (r.premioMax > 0 && sugerido > r.premioMax) sugerido = r.premioMax;
      return { ...r, premio: sugerido };
    }));
  }

  async function salvarFolha() {
    if (!currentCompanyId) return;
    // valida tetos antes de salvar
    const acimaTeto = rows.filter((r) => r.premioMax > 0 && r.premio > r.premioMax);
    if (acimaTeto.length > 0) {
      const ok = await confirm({
        title: `${acimaTeto.length} colaborador(es) acima do teto`,
        description: `${acimaTeto.slice(0, 3).map((r) => r.colaborador.full_name).join(', ')}${acimaTeto.length > 3 ? '…' : ''}. Valor acima do salário+adicional pode descaracterizar a natureza indenizatória do prêmio em fiscalização. Salvar mesmo assim?`,
        confirmLabel: 'Sim, salvar acima do teto',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setSaving(true);
    const sb = getSupabase();
    const payload = rows.map((r) => ({
      id: r.folhaId || undefined,
      company_id: currentCompanyId,
      competencia: currentCompetencia,
      colaborador_id: r.colaborador.id,
      final_score: r.media || null,
      premio_value: r.premio,
      status: r.status,
    }));
    const { error } = await sb.from('premios_folha').upsert(payload as never, { onConflict: 'colaborador_id,competencia' });
    if (error) toast(error.message, 'danger');
    else toast(`Folha salva (${rows.length} linhas)`, 'ok');
    setSaving(false);
    load();
  }

  async function aprovarTudo() {
    const ok = await confirm({
      title: 'Aprovar a folha inteira?',
      description: `${rows.length} colaboradores ficarão como aprovados nessa competência.`,
      confirmLabel: 'Sim, aprovar',
    });
    if (!ok || !currentCompanyId) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_folha').update({
      status: 'aprovada',
      approved_at: new Date().toISOString(),
    }).eq('company_id', currentCompanyId).eq('competencia', currentCompetencia);
    if (error) toast(error.message, 'danger');
    else { toast('Folha aprovada', 'ok'); load(); }
  }

  async function marcarPaga() {
    const ok = await confirm({
      title: 'Marcar tudo como pago?',
      description: 'Confirma o pagamento dos prêmios dessa competência. Não envia dinheiro — só registra a data.',
      confirmLabel: 'Sim, marcar como pago',
    });
    if (!ok || !currentCompanyId) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_folha').update({
      status: 'paga',
      paid_at: new Date().toISOString(),
    }).eq('company_id', currentCompanyId).eq('competencia', currentCompetencia).eq('status', 'aprovada');
    if (error) toast(error.message, 'danger');
    else { toast('Folha paga', 'ok'); load(); }
  }

  const total = rows.reduce((acc, r) => acc + r.premio, 0);
  const totalAprovadas = rows.filter((r) => r.status === 'aprovada' || r.status === 'paga').length;

  if (!currentCompanyId) {
    return (
      <div className="card py-16 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-accent-50 grid place-items-center mx-auto mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="2"><path d="M3 21h18M3 7v14M21 7v14M3 7l9-4 9 4M9 21V11M15 21V11M5 11h14M7 14h2M11 14h2M15 14h2"/></svg>
        </div>
        <h2 className="font-display text-2xl text-ink-900 mb-2">Selecione uma empresa</h2>
        <p className="text-sm text-ink-700 max-w-md mx-auto mb-6">Antes de operar, escolha em qual empresa você vai trabalhar. Toda a operação (colaboradores, avaliações, folha) é dessa empresa.</p>
        <Link to="/configuracoes" className="btn btn-primary inline-flex">Escolher empresa →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Folha de prêmios</h1>
          <p className="text-sm text-ink-700 mt-1 capitalize">Competência: <strong>{formatCompetencia(currentCompetencia)}</strong></p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-black/5 p-1">
          <button onClick={() => setCompetencia(shiftCompetencia(currentCompetencia, -1))} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-surface-muted">‹</button>
          <span className="px-3 text-sm font-semibold capitalize">{formatCompetencia(currentCompetencia)}</span>
          <button onClick={() => setCompetencia(shiftCompetencia(currentCompetencia, 1))} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-surface-muted">›</button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Prêmio base (nota máxima)</label>
            <input className="input w-40" type="number" step="50" value={premioBase} onChange={(e) => setPremioBase(e.target.value)} />
          </div>
          <button onClick={gerarFolha} className="btn btn-ghost">↻ Calcular sugestões</button>
          <div className="flex-1" />
          <button onClick={salvarFolha} disabled={saving} className="btn btn-primary">{saving ? <Spinner size={16}/> : 'Salvar folha'}</button>
          <button onClick={aprovarTudo} className="btn btn-ghost">✓ Aprovar tudo</button>
          <button onClick={marcarPaga} className="btn btn-ghost">💰 Marcar pago</button>
        </div>
        <p className="text-xs text-ink-500 mt-3">
          Sugestão = prêmio base × (média / 5). Quem ficou abaixo de 3 zera.
          O <strong>teto</strong> de cada colaborador é <em>salário × (1 + adicional)</em> — prêmio acima disso pode ser descaracterizado como remuneração.
        </p>
      </div>

      {loading ? (
        <div className="card py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
      ) : rows.length === 0 ? (
        <div className="card py-12 text-center text-sm text-ink-500">Sem colaboradores ativos.</div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Colaborador</th><th>Setor</th><th>Score</th><th>Teto (sal+adic)</th><th>Prêmio</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const excede = r.premioMax > 0 && r.premio > r.premioMax;
                return (
                <tr key={r.colaborador.id}>
                  <td className="font-bold">
                    {r.colaborador.full_name}
                    {Number((r.colaborador as any).adicional_percent) > 0 && (
                      <span className="ml-2 pill pill-accent text-[10px]">+{Number((r.colaborador as any).adicional_percent)}%</span>
                    )}
                  </td>
                  <td className="text-xs">{r.colaborador.setor || '—'}</td>
                  <td>
                    {r.media > 0 ? (
                      <span className={`pill font-bold ${
                        r.media >= 4.5 ? 'bg-ok/15 text-ok' :
                        r.media >= 3.5 ? 'bg-accent-100 text-accent-700' :
                        r.media >= 2.5 ? 'bg-warn/15 text-warn' :
                        'bg-danger/15 text-danger'
                      }`}>{r.media.toFixed(2)}</span>
                    ) : <span className="text-ink-300 text-xs">sem avaliação</span>}
                  </td>
                  <td className="text-xs">
                    {r.premioMax > 0 ? (
                      <span title={`Salário ${Number(r.colaborador.salario_base).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} + ${Number((r.colaborador as any).adicional_percent)||0}%`}>
                        {r.premioMax.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    ) : <span className="text-warn font-bold" title="Sem salário cadastrado — sem teto definido">sem teto</span>}
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <input
                        className={`input w-32 text-right font-bold ${excede ? 'border-danger text-danger' : ''}`}
                        type="number" step="0.01" min="0" max={r.premioMax > 0 ? r.premioMax : undefined}
                        value={r.premio}
                        onChange={(e) => setRows((prev) => prev.map((x) => x.colaborador.id === r.colaborador.id ? { ...x, premio: Number(e.target.value) } : x))}
                      />
                      {excede && <span className="text-[10px] text-danger font-bold mt-0.5">Acima do teto!</span>}
                    </div>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              );})}
              <tr className="bg-surface-muted font-bold">
                <td colSpan={4} className="text-right">Total · {totalAprovadas} aprovadas</td>
                <td className="font-extrabold">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PremiosFolhaStatus }) {
  const cfg: Record<PremiosFolhaStatus, { label: string; cls: string }> = {
    pendente: { label: 'Pendente', cls: 'pill-gray' },
    aprovada: { label: 'Aprovada', cls: 'pill-accent' },
    paga: { label: 'Paga', cls: 'pill-ok' },
    cancelada: { label: 'Cancelada', cls: 'pill-danger' },
  };
  return <span className={`pill ${cfg[status].cls}`}>{cfg[status].label}</span>;
}
