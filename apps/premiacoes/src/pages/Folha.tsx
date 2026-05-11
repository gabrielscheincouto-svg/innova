import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSupabase, calcPercentPremio, logAudit, METODOLOGIA_PADRAO, type PremiosColaborador, type PremiosCriterio, type PremiosAvaliacao, type PremiosFolha, type PremiosFolhaStatus, type Company, type MetodologiaPremio } from '@innova/supabase';
import { useAuth } from '@innova/auth';
import { Spinner, useToast, useConfirm } from '@innova/ui';
import { usePremios, formatCompetencia, shiftCompetencia } from '../lib/store';
import { printFolhaRelatorio } from '../lib/printFolha';
import { computeSnapshotHash, formatHashShort, formatHashGroups, type SnapshotData } from '../lib/fechamento';

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
  const [fechamento, setFechamento] = useState<{ hash: string; closed_at: string; closed_by_email: string; reopened_at: string | null } | null>(null);
  const [verifyingHash, setVerifyingHash] = useState(false);
  const profile = useAuth((s) => s.profile);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { if (currentCompanyId) load(); else setLoading(false); }, [currentCompanyId, currentCompetencia]);

  async function load() {
    if (!currentCompanyId) return;
    setLoading(true);
    const sb = getSupabase();
    const [{ data: cs }, { data: cr }, { data: av }, { data: fl }, { data: cp }, { data: fec }] = await Promise.all([
      sb.from('premios_colaboradores').select('*').eq('company_id', currentCompanyId).eq('is_active', true).eq('elegivel_premio', true).order('full_name'),
      sb.from('premios_criterios').select('*').eq('company_id', currentCompanyId).eq('is_active', true),
      sb.from('premios_avaliacoes').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
      sb.from('premios_folha').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
      sb.from('companies').select('*').eq('id', currentCompanyId).maybeSingle(),
      sb.from('v_premios_fechamento_atual').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia).maybeSingle(),
    ]);
    setFechamento(fec ? {
      hash: (fec as any).hash,
      closed_at: (fec as any).closed_at,
      closed_by_email: (fec as any).closed_by_email,
      reopened_at: (fec as any).reopened_at,
    } : null);
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

  // ===== FECHAMENTO IMUTÁVEL COM HASH FORENSE =====
  // Monta snapshot canônico de tudo que importa pra defesa judicial
  async function buildSnapshot(): Promise<SnapshotData | null> {
    if (!currentCompanyId || !company) return null;
    const sb = getSupabase();
    const [{ data: cs }, { data: cr }, { data: av }, { data: fl }] = await Promise.all([
      sb.from('premios_colaboradores').select('*').eq('company_id', currentCompanyId).eq('is_active', true).eq('elegivel_premio', true).order('full_name'),
      sb.from('premios_criterios').select('*').eq('company_id', currentCompanyId).eq('is_active', true).order('display_order'),
      sb.from('premios_avaliacoes').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia).order('colaborador_id').order('criterio_id'),
      sb.from('premios_folha').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia).order('colaborador_id'),
    ]);
    const colabs = (cs || []) as any[];
    const folhaRows = (fl || []) as any[];
    return {
      versao: '1',
      company: {
        id: company.id, cnpj: company.cnpj,
        legal_name: company.legal_name, trade_name: company.trade_name,
      },
      competencia: currentCompetencia,
      emitido_em: new Date().toISOString(),
      emitido_por: profile?.email || 'desconhecido',
      metodologia_empresa: (company as any).metodologia_premio || null,
      criterios: (cr || []).map((c: any) => ({ id: c.id, name: c.name, weight: Number(c.weight) })),
      colaboradores: colabs.map((c) => ({
        id: c.id, full_name: c.full_name, cpf: c.cpf, matricula: c.matricula,
        cargo: c.cargo, setor: c.setor, filial: c.filial,
        data_admissao: c.data_admissao, salario_base: Number(c.salario_base) || null,
        premio_max_percent: Number(c.premio_max_percent ?? 100),
        metodologia_premio: c.metodologia_premio || null,
        elegivel_premio: c.elegivel_premio !== false,
      })),
      avaliacoes: (av || []).map((a: any) => ({
        colaborador_id: a.colaborador_id, criterio_id: a.criterio_id, score: a.score,
      })),
      folha: folhaRows.map((f) => ({
        colaborador_id: f.colaborador_id,
        final_score: f.final_score != null ? Number(f.final_score) : null,
        premio_value: Number(f.premio_value),
        status: f.status,
      })),
      totais: {
        qtd_colaboradores: colabs.length,
        qtd_avaliacoes: (av || []).length,
        total_folha: folhaRows.reduce((s, f) => s + Number(f.premio_value), 0),
        total_salarios: colabs.reduce((s, c) => s + (Number(c.salario_base) || 0), 0),
      },
    };
  }

  async function fecharMes() {
    if (!currentCompanyId || !company) return;
    const ok = await confirm({
      title: `Fechar competência ${formatCompetencia(currentCompetencia)}?`,
      description: `Vai gerar um HASH forense (SHA-256) imutável de toda a folha desse mês. Esse hash será o mesmo na Avaliação, na Folha e no PDF da contabilidade — serve como prova de integridade em fiscalização ou processo judicial. A operação é registrada com data, hora, IP e seu email.`,
      confirmLabel: 'Sim, lacrar mês',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const snapshot = await buildSnapshot();
      if (!snapshot) throw new Error('Falha ao montar snapshot');
      const hash = await computeSnapshotHash(snapshot);
      const sb = getSupabase();
      const { error: fecErr } = await sb.from('premios_fechamentos').insert({
        company_id: currentCompanyId,
        competencia: currentCompetencia,
        hash,
        snapshot: snapshot as any,
        closed_by: profile?.id,
        closed_by_email: profile?.email || 'desconhecido',
        closed_by_user_agent: navigator.userAgent,
      } as never);
      if (fecErr) throw fecErr;
      const { error: lockErr } = await sb.from('premios_folha').update({ is_locked: true } as never)
        .eq('company_id', currentCompanyId).eq('competencia', currentCompetencia);
      if (lockErr) throw lockErr;
      await logAudit({ action: 'premios_fechamento', resource_type: 'premios_folha', resource_id: currentCompanyId, meta: { competencia: currentCompetencia, hash } });
      toast(`Mês lacrado · hash ${formatHashShort(hash)}`, 'ok');
      load();
    } catch (e: any) {
      toast(`Erro: ${e.message || e}`, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function reabrirMes() {
    if (!currentCompanyId || !fechamento) return;
    const motivo = window.prompt('Motivo da reabertura (será registrado permanentemente no histórico forense):');
    if (motivo == null || motivo.trim().length < 5) {
      toast('Reabertura cancelada · motivo obrigatório (mínimo 5 caracteres)', 'warn');
      return;
    }
    const ok = await confirm({
      title: 'Reabrir competência?',
      description: `O lacre (hash ${formatHashShort(fechamento.hash)}) será marcado como quebrado, com o motivo registrado. O snapshot original e o hash continuam preservados para auditoria.`,
      confirmLabel: 'Sim, reabrir',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    // Update direto no fechamento mais recente
    const { data: latest } = await sb.from('premios_fechamentos').select('id')
      .eq('company_id', currentCompanyId).eq('competencia', currentCompetencia)
      .order('closed_at', { ascending: false }).limit(1).maybeSingle();
    if (latest) {
      await sb.from('premios_fechamentos').update({
        reopened_at: new Date().toISOString(),
        reopened_by: profile?.id,
        reopened_by_email: profile?.email || 'desconhecido',
        motivo_reabertura: motivo.trim(),
      } as never).eq('id', (latest as any).id);
    }
    const { error } = await sb.from('premios_folha').update({ is_locked: false } as never)
      .eq('company_id', currentCompanyId).eq('competencia', currentCompetencia);
    if (error) toast(error.message, 'danger');
    else {
      await logAudit({ action: 'premios_reabertura', resource_type: 'premios_folha', resource_id: currentCompanyId, meta: { competencia: currentCompetencia, motivo: motivo.trim() } });
      toast('Mês reaberto · histórico preservado', 'ok');
      load();
    }
  }

  async function verificarIntegridade() {
    if (!fechamento || !currentCompanyId) return;
    setVerifyingHash(true);
    try {
      // Recomputa snapshot atual e compara hash
      const sb = getSupabase();
      const { data: fec } = await sb.from('premios_fechamentos').select('snapshot, hash')
        .eq('company_id', currentCompanyId).eq('competencia', currentCompetencia)
        .order('closed_at', { ascending: false }).limit(1).maybeSingle();
      if (!fec) { toast('Fechamento não encontrado', 'danger'); return; }
      const recomputado = await computeSnapshotHash((fec as any).snapshot as SnapshotData);
      if (recomputado === (fec as any).hash) {
        toast('✓ Integridade preservada · hash bate com snapshot original', 'ok');
      } else {
        toast(`⚠ ADULTERAÇÃO DETECTADA · hash atual ≠ original`, 'danger');
      }
    } catch (e: any) {
      toast(`Erro na verificação: ${e.message || e}`, 'danger');
    } finally {
      setVerifyingHash(false);
    }
  }

  async function limparCompetencia() {
    if (!currentCompanyId) return;
    if (folhaFechada) { toast('Mês está lacrado. Reabra antes de limpar.', 'warn'); return; }
    const ok = await confirm({
      title: `Limpar TUDO da competência ${formatCompetencia(currentCompetencia)}?`,
      description: 'Apaga TODAS as avaliações + folha desse mês. Não mexe em colaboradores, critérios nem fechamentos anteriores. Não pode ser desfeito.',
      confirmLabel: 'Sim, limpar tudo',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      sb.from('premios_avaliacoes').delete().eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
      sb.from('premios_folha').delete().eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
    ]);
    if (e1 || e2) { toast((e1 || e2)!.message, 'danger'); return; }
    await logAudit({ action: 'premios_limpar_competencia', resource_type: 'premios_folha', resource_id: currentCompanyId, meta: { competencia: currentCompetencia } });
    toast('Competência limpa · avaliações e folha removidas', 'ok');
    load();
  }

  function gerarPDF() {
    if (!company) { toast('Carregue a empresa primeiro', 'warn'); return; }
    printFolhaRelatorio({
      company,
      competencia: currentCompetencia,
      fechamento: fechamento ? { hash: fechamento.hash, closed_at: fechamento.closed_at, closed_by_email: fechamento.closed_by_email } : null,
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
            {folhaFechada && <span className="ml-2 pill pill-ok">🔒 Lacrado</span>}
          </p>
          {fechamento && (
            <div className="mt-2 inline-flex items-center gap-2 bg-ink-900 text-white rounded-2xl px-3 py-1.5 text-[11px] font-mono">
              <span className="text-warn">⛓</span>
              <span className="opacity-70">hash:</span>
              <span className="font-bold tracking-wider" title={fechamento.hash}>{formatHashShort(fechamento.hash)}</span>
              <button onClick={verificarIntegridade} disabled={verifyingHash} className="ml-1 text-warn hover:text-white transition" title="Recalcula o hash do snapshot e compara com o original (detecta adulteração)">
                {verifyingHash ? '...' : 'verificar'}
              </button>
            </div>
          )}
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
          {!folhaFechada && (
            <button onClick={limparCompetencia} className="btn btn-ghost text-danger/80 hover:text-danger" title="Apaga avaliações e folha desse mês (mantém colaboradores)">🗑 Limpar</button>
          )}
          {folhaFechada ? (
            <button onClick={reabrirMes} className="btn btn-ghost text-warn">🔓 Reabrir</button>
          ) : (
            <button onClick={fecharMes} disabled={saving} className="btn btn-primary disabled:opacity-40">🔒 Lacrar mês (gerar hash)</button>
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
