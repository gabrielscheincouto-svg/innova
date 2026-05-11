import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSupabase, calcPercentPremio, METODOLOGIA_PADRAO, type PremiosColaborador, type PremiosCriterio, type PremiosAvaliacao, type PremiosFolha, type PremiosFolhaStatus, type Company, type MetodologiaPremio } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';
import { usePremios, formatCompetencia, shiftCompetencia } from '../lib/store';
import { printFolhaRelatorio } from '../lib/printFolha';

interface FolhaRow {
  colaborador: PremiosColaborador;
  media: number;
  premio: number;
  premioMax: number;
  folhaId: string | null;
  status: PremiosFolhaStatus;
  locked: boolean;
}

// teto do prêmio = salário × (premio_max_percent / 100)
function calcPremioMax(c: PremiosColaborador): number {
  const sal = Number(c.salario_base) || 0;
  const pct = Number((c as any).premio_max_percent ?? 100);
  if (sal <= 0) return 0;
  return Number((sal * (pct / 100)).toFixed(2));
}

// Prêmio sugerido usando a metodologia (colab override > empresa > padrão)
function calcPremioSugerido(media: number, premioMax: number, met: MetodologiaPremio | null): number {
  if (premioMax <= 0) return 0;
  const pct = calcPercentPremio(media, met);
  return Number((premioMax * (pct / 100)).toFixed(2));
}

export function Folha() {
  const { currentCompanyId, currentCompetencia, setCompetencia } = usePremios();
  const [rows, setRows] = useState<FolhaRow[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { if (currentCompanyId) load(); else setLoading(false); }, [currentCompanyId, currentCompetencia]);

  async function load() {
    if (!currentCompanyId) return;
    setLoading(true);
    const sb = getSupabase();
    const [{ data: cs }, { data: cr }, { data: av }, { data: fl }, { data: cp }] = await Promise.all([
      sb.from('premios_colaboradores').select('*').eq('company_id', currentCompanyId).eq('is_active', true).eq('elegivel_premio', true).order('full_name'),
      sb.from('premios_criterios').select('*').eq('company_id', currentCompanyId).eq('is_active', true),
      sb.from('premios_avaliacoes').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
      sb.from('premios_folha').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
      sb.from('companies').select('*').eq('id', currentCompanyId).maybeSingle(),
    ]);
    const colabs = (cs || []) as PremiosColaborador[];
    const crits = (cr || []) as PremiosCriterio[];
    const avals = (av || []) as PremiosAvaliacao[];
    const folhas = (fl || []) as PremiosFolha[];
    const co = (cp || null) as Company | null;
    setCompany(co);

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
        locked: !!(existing as any)?.is_locked,
      };
    });
    setRows(computed);
    setLoading(false);
  }

  // Metodologia do colaborador (override) > metodologia da empresa > padrão
  function metodologiaDe(c: PremiosColaborador): MetodologiaPremio {
    return (c as any).metodologia_premio || company?.metodologia_premio || METODOLOGIA_PADRAO;
  }

  function gerarFolha() {
    setRows((prev) => prev.map((r) => ({
      ...r,
      premio: calcPremioSugerido(r.media, r.premioMax, metodologiaDe(r.colaborador)),
    })));
  }

  // Bug-fix: NÃO mandar id quando é insert (Postgres trata null como violação NOT NULL).
  // Upsert por (colaborador_id, competencia) via onConflict.
  async function salvarFolha() {
    if (!currentCompanyId) return;
    if (folhaFechada) {
      toast('Mês está fechado. Reabra antes de editar.', 'warn');
      return;
    }
    const acimaTeto = rows.filter((r) => r.premioMax > 0 && r.premio > r.premioMax);
    if (acimaTeto.length > 0) {
      const ok = await confirm({
        title: `${acimaTeto.length} colaborador(es) acima do teto`,
        description: `${acimaTeto.slice(0, 3).map((r) => r.colaborador.full_name).join(', ')}${acimaTeto.length > 3 ? '…' : ''}. Valor acima do teto (salário × %max). Pode descaracterizar a natureza indenizatória em fiscalização. Salvar mesmo assim?`,
        confirmLabel: 'Sim, salvar acima do teto',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setSaving(true);
    const sb = getSupabase();
    // Payload sem 'id' — o conflict resolve por (colaborador_id, competencia)
    const payload = rows.map((r) => ({
      company_id: currentCompanyId,
      competencia: currentCompetencia,
      colaborador_id: r.colaborador.id,
      final_score: r.media || null,
      premio_value: r.premio,
      status: r.status,
    }));
    const { error } = await sb.from('premios_folha').upsert(payload as never, {
      onConflict: 'colaborador_id,competencia',
      ignoreDuplicates: false,
    });
    if (error) toast(`Erro: ${error.message}`, 'danger');
    else toast(`Folha salva (${rows.length} linhas)`, 'ok');
    setSaving(false);
    load();
  }

  // FECHAR / REABRIR MÊS · is_locked = true bloqueia edição
  async function fecharMes() {
    if (!currentCompanyId) return;
    const ok = await confirm({
      title: `Fechar competência ${formatCompetencia(currentCompetencia)}?`,
      description: `Bloqueia edição dos prêmios desse mês. Pra ajustar de novo, é só reabrir. Recomenda-se fechar depois que a folha foi enviada pra contabilidade.`,
      confirmLabel: 'Sim, fechar mês',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_folha').update({ is_locked: true } as never)
      .eq('company_id', currentCompanyId).eq('competencia', currentCompetencia);
    if (error) toast(error.message, 'danger');
    else { toast('Mês fechado', 'ok'); load(); }
  }

  async function reabrirMes() {
    if (!currentCompanyId) return;
    const ok = await confirm({
      title: 'Reabrir competência?',
      description: 'Libera edição dos prêmios desse mês de novo. Use com cuidado se a folha já foi enviada pra contabilidade.',
      confirmLabel: 'Sim, reabrir',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_folha').update({ is_locked: false } as never)
      .eq('company_id', currentCompanyId).eq('competencia', currentCompetencia);
    if (error) toast(error.message, 'danger');
    else { toast('Mês reaberto', 'ok'); load(); }
  }

  function gerarPDF() {
    if (!company) { toast('Carregue a empresa primeiro', 'warn'); return; }
    printFolhaRelatorio({
      company,
      competencia: currentCompetencia,
      rows: rows.map((r) => ({
        nome: r.colaborador.full_name,
        cpf: r.colaborador.cpf,
        matricula: r.colaborador.matricula,
        cargo: r.colaborador.cargo,
        setor: r.colaborador.setor,
        data_admissao: r.colaborador.data_admissao,
        data_nascimento: (r.colaborador as any).data_nascimento || null,
        salario_base: Number(r.colaborador.salario_base) || 0,
        premio_max_percent: Number((r.colaborador as any).premio_max_percent ?? 100),
        media: r.media,
        premio: r.premio,
        status: r.status,
      })),
    });
  }

  const total = rows.reduce((acc, r) => acc + r.premio, 0);
  const folhaFechada = rows.length > 0 && rows.every((r) => r.locked);

  if (!currentCompanyId) {
    return (
      <div className="card py-16 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-accent-50 grid place-items-center mx-auto mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="2"><path d="M3 21h18M3 7v14M21 7v14M3 7l9-4 9 4M9 21V11M15 21V11M5 11h14M7 14h2M11 14h2M15 14h2"/></svg>
        </div>
        <h2 className="font-display text-2xl text-ink-900 mb-2">Selecione uma empresa</h2>
        <p className="text-sm text-ink-700 max-w-md mx-auto mb-6">Antes de operar, escolha em qual empresa você vai trabalhar.</p>
        <Link to="/configuracoes" className="btn btn-primary inline-flex">Escolher empresa →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Folha de prêmios</h1>
          <p className="text-sm text-ink-700 mt-1 capitalize">
            Competência: <strong>{formatCompetencia(currentCompetencia)}</strong>
            {folhaFechada && <span className="ml-2 pill pill-ok">🔒 Mês fechado</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-black/5 p-1">
          <button onClick={() => setCompetencia(shiftCompetencia(currentCompetencia, -1))} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-surface-muted">‹</button>
          <span className="px-3 text-sm font-semibold capitalize">{formatCompetencia(currentCompetencia)}</span>
          <button onClick={() => setCompetencia(shiftCompetencia(currentCompetencia, 1))} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-surface-muted">›</button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={gerarFolha} disabled={folhaFechada} className="btn btn-primary disabled:opacity-40">↻ Calcular prêmios automaticamente</button>
          <div className="flex-1" />
          <button onClick={gerarPDF} className="btn btn-ghost" title="Gerar PDF da folha pra enviar à contabilidade">📄 Relatório PDF</button>
          <button onClick={salvarFolha} disabled={saving || folhaFechada} className="btn btn-ghost disabled:opacity-40">{saving ? <Spinner size={16}/> : '💾 Salvar'}</button>
          {folhaFechada ? (
            <button onClick={reabrirMes} className="btn btn-ghost text-warn">🔓 Reabrir mês</button>
          ) : (
            <button onClick={fecharMes} className="btn btn-ghost">🔒 Fechar mês</button>
          )}
        </div>
        <p className="text-xs text-ink-500 mt-3 leading-relaxed">
          Teto = salário × <em>% prêmio máximo</em> (configurado em Colaboradores).
          Metodologia padrão: nota 5 → 100% do teto · 4 → 80% · 3 → 60% · &lt;3 → 0.
          Pode ser personalizada por colaborador ou por empresa (em <Link to="/configuracoes" className="text-accent-600 font-bold underline">Configurações</Link>).
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
                <th>Colaborador</th><th>Setor</th><th>Score</th><th>Teto</th><th>Prêmio</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const excede = r.premioMax > 0 && r.premio > r.premioMax;
                return (
                <tr key={r.colaborador.id}>
                  <td className="font-bold">
                    {r.colaborador.full_name}
                    {(() => {
                      const pct = Number((r.colaborador as any).premio_max_percent ?? 100);
                      if (pct === 100) return null;
                      return <span className={`ml-2 pill pill-gray text-[10px]`}>até {pct}%</span>;
                    })()}
                    {(r.colaborador as any).metodologia_premio && <span className="ml-1 pill pill-accent text-[10px]" title="Metodologia personalizada">⚙</span>}
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
                      <span title={`Salário ${Number(r.colaborador.salario_base).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} × ${Number((r.colaborador as any).premio_max_percent ?? 100)}%`}>
                        {r.premioMax.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    ) : <span className="text-warn font-bold">sem teto</span>}
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <input
                        className={`input w-32 text-right font-bold ${excede ? 'border-danger text-danger' : ''} ${folhaFechada ? 'opacity-60' : ''}`}
                        type="number" step="0.01" min="0" max={r.premioMax > 0 ? r.premioMax : undefined}
                        value={r.premio}
                        disabled={folhaFechada}
                        onChange={(e) => setRows((prev) => prev.map((x) => x.colaborador.id === r.colaborador.id ? { ...x, premio: Number(e.target.value) } : x))}
                      />
                      {excede && <span className="text-[10px] text-danger font-bold mt-0.5">Acima do teto!</span>}
                    </div>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              );})}
              <tr className="bg-surface-muted font-bold">
                <td colSpan={4} className="text-right">Total da folha</td>
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
