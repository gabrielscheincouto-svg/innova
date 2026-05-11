import { Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { getSupabase, calcPercentPremio, METODOLOGIA_PADRAO, type PremiosColaborador, type PremiosCriterio, type PremiosAvaliacao, type Company, type MetodologiaPremio } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';
import { usePremios, formatCompetencia, shiftCompetencia } from '../lib/store';

export function Avaliacao() {
  const { currentCompanyId, currentCompetencia, setCompetencia } = usePremios();
  const [colaboradores, setColaboradores] = useState<PremiosColaborador[]>([]);
  const [criterios, setCriterios] = useState<PremiosCriterio[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [mesFechado, setMesFechado] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const toast = useToast();

  useEffect(() => { if (currentCompanyId) load(); else setLoading(false); }, [currentCompanyId, currentCompetencia]);

  async function load() {
    if (!currentCompanyId) return;
    setLoading(true);
    const sb = getSupabase();
    const [{ data: cs }, { data: cr }, { data: av }, { data: fl }, { data: cp }] = await Promise.all([
      sb.from('premios_colaboradores').select('*').eq('company_id', currentCompanyId).eq('is_active', true).order('full_name'),
      sb.from('premios_criterios').select('*').eq('company_id', currentCompanyId).eq('is_active', true).order('display_order'),
      sb.from('premios_avaliacoes').select('*').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
      sb.from('premios_folha').select('is_locked').eq('company_id', currentCompanyId).eq('competencia', currentCompetencia),
      sb.from('companies').select('*').eq('id', currentCompanyId).maybeSingle(),
    ]);
    setCompany((cp || null) as Company | null);
    setColaboradores((cs || []) as PremiosColaborador[]);
    setCriterios((cr || []) as PremiosCriterio[]);
    const map = new Map<string, number>();
    ((av || []) as PremiosAvaliacao[]).forEach((a) => map.set(`${a.colaborador_id}_${a.criterio_id}`, a.score));
    setAvaliacoes(map);
    // Mês fechado se existir folha gerada E todas as linhas estiverem locked
    const folhaRows = (fl || []) as Array<{ is_locked: boolean }>;
    setMesFechado(folhaRows.length > 0 && folhaRows.every((r) => r.is_locked));
    setLoading(false);
  }

  async function setScore(colabId: string, critId: string, score: number) {
    if (mesFechado) {
      toast('Mês fechado. Reabra na Folha pra editar avaliações.', 'warn');
      return;
    }
    const key = `${colabId}_${critId}`;
    setSaving(key);
    const sb = getSupabase();
    const { error } = await sb.from('premios_avaliacoes').upsert({
      company_id: currentCompanyId!,
      colaborador_id: colabId,
      criterio_id: critId,
      competencia: currentCompetencia,
      score,
    } as never, { onConflict: 'colaborador_id,criterio_id,competencia' });
    if (error) toast(error.message, 'danger');
    else {
      setAvaliacoes((prev) => { const n = new Map(prev); n.set(key, score); return n; });
    }
    setSaving(null);
  }

  // estatísticas: média ponderada + prêmio calculado em tempo real
  const colabStats = useMemo(() => {
    return colaboradores.map((c) => {
      let sum = 0, w = 0, count = 0;
      for (const cr of criterios) {
        const s = avaliacoes.get(`${c.id}_${cr.id}`);
        if (s != null) {
          sum += s * cr.weight;
          w += cr.weight;
          count += 1;
        }
      }
      const media = w > 0 ? sum / w : 0;
      const completo = count === criterios.length;
      // Teto individual = salário × premio_max_percent/100
      const sal = Number(c.salario_base) || 0;
      const pctMax = Number((c as any).premio_max_percent ?? 100);
      const teto = sal > 0 ? sal * (pctMax / 100) : 0;
      // Metodologia · colaborador override > empresa > padrão Innova
      const met: MetodologiaPremio = (c as any).metodologia_premio || company?.metodologia_premio || METODOLOGIA_PADRAO;
      // Prêmio só é definitivo quando completo. Antes disso, mostra a tendência.
      const percent = calcPercentPremio(media, met);
      const premio = teto > 0 ? Number((teto * (percent / 100)).toFixed(2)) : 0;
      return { id: c.id, media, completo, total: criterios.length, count, teto, premio, percent };
    });
  }, [colaboradores, criterios, avaliacoes, company]);

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
          <h1 className="font-display text-4xl">Avaliação mensal</h1>
          <p className="text-sm text-ink-700 mt-1 capitalize">
            Competência: <strong>{formatCompetencia(currentCompetencia)}</strong>
            {mesFechado && <span className="ml-2 pill pill-ok">🔒 Mês fechado</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-black/5 p-1">
          <button onClick={() => setCompetencia(shiftCompetencia(currentCompetencia, -1))} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-surface-muted">‹</button>
          <span className="px-3 text-sm font-semibold capitalize">{formatCompetencia(currentCompetencia)}</span>
          <button onClick={() => setCompetencia(shiftCompetencia(currentCompetencia, 1))} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-surface-muted">›</button>
        </div>
      </div>

      {mesFechado && (
        <div className="card bg-ok/5 border border-ok/30 flex items-start gap-3 py-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" className="flex-shrink-0 mt-0.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="text-sm">
            <strong className="text-ok">Mês fechado.</strong> As notas dessa competência estão bloqueadas — espelhando o lock da folha de prêmios.
            Pra editar de novo, vá em <Link to="/folha" className="text-accent-600 font-bold underline">Folha de prêmios</Link> e clique em <strong>Reabrir mês</strong>.
          </div>
        </div>
      )}

      {loading ? (
        <div className="card py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
      ) : criterios.length === 0 || colaboradores.length === 0 ? (
        <div className="card py-12 text-center text-sm text-ink-500">
          {criterios.length === 0 ? 'Sem critérios cadastrados.' : 'Sem colaboradores ativos.'}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10">Colaborador</th>
                {criterios.map((c) => (
                  <th key={c.id} className="text-center min-w-[120px]">
                    <div className="font-bold text-ink-900">{c.name}</div>
                    <div className="text-[10px] text-ink-500 font-normal mt-0.5">peso {Number(c.weight).toFixed(1)}</div>
                  </th>
                ))}
                <th className="text-center min-w-[90px]">Média</th>
                <th className="text-right min-w-[130px]">Prêmio</th>
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((co, idx) => {
                const stat = colabStats[idx];
                return (
                  <tr key={co.id}>
                    <td className="sticky left-0 bg-white z-10">
                      <div className="font-bold text-sm">{co.full_name}</div>
                      <div className="text-[10px] text-ink-500">{co.cargo || '—'}</div>
                    </td>
                    {criterios.map((cr) => {
                      const key = `${co.id}_${cr.id}`;
                      const score = avaliacoes.get(key);
                      const isSaving = saving === key;
                      return (
                        <td key={cr.id} className="text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => {
                              const selected = score === n;
                              // paleta por nota (cor permanente, mesmo desselecionada)
                              const palette: Record<number, { sel: string; idle: string }> = {
                                1: { sel: 'bg-danger text-white shadow-md', idle: 'bg-danger/15 text-danger hover:bg-danger/30' },
                                2: { sel: 'bg-[#FB923C] text-white shadow-md', idle: 'bg-[#FB923C]/15 text-[#C2410C] hover:bg-[#FB923C]/30' },
                                3: { sel: 'bg-warn text-white shadow-md', idle: 'bg-warn/15 text-warn hover:bg-warn/30' },
                                4: { sel: 'bg-[#84CC16] text-white shadow-md', idle: 'bg-[#84CC16]/15 text-[#4D7C0F] hover:bg-[#84CC16]/30' },
                                5: { sel: 'bg-ok text-white shadow-md', idle: 'bg-ok/15 text-ok hover:bg-ok/30' },
                              };
                              const cls = palette[n];
                              return (
                                <button
                                  key={n}
                                  onClick={() => setScore(co.id, cr.id, n)}
                                  disabled={isSaving || mesFechado}
                                  className={`w-7 h-7 rounded-md font-extrabold text-[11px] transition ${
                                    selected ? `${cls.sel} scale-110` : cls.idle
                                  } ${mesFechado && !selected ? 'opacity-30 cursor-not-allowed' : ''} ${mesFechado && selected ? 'opacity-80' : ''}`}
                                  title={mesFechado ? 'Mês fechado — reabra na Folha pra editar' : (cr.scale_labels?.[String(n)] || `Nota ${n}`)}
                                >
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center">
                      {stat.media > 0 ? (
                        <div className={`pill font-bold ${
                          stat.media >= 4.5 ? 'bg-ok/15 text-ok' :
                          stat.media >= 3.5 ? 'bg-accent-100 text-accent-700' :
                          stat.media >= 2.5 ? 'bg-warn/15 text-warn' :
                          'bg-danger/15 text-danger'
                        }`}>{stat.media.toFixed(2)}</div>
                      ) : <span className="text-ink-300 text-xs">—</span>}
                      <div className="text-[10px] text-ink-500 mt-1">{stat.count}/{stat.total}</div>
                    </td>
                    <td className="text-right">
                      {stat.teto <= 0 ? (
                        <span className="text-warn text-[11px] font-bold" title="Sem salário cadastrado">sem teto</span>
                      ) : stat.count === 0 ? (
                        <span className="text-ink-300 text-xs">—</span>
                      ) : (
                        <div className="inline-flex flex-col items-end leading-tight">
                          <span className={`font-extrabold ${stat.completo ? 'text-ok' : 'text-ink-700'}`}>
                            {stat.premio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <span className="text-[10px] text-ink-500 mt-0.5">
                            {stat.completo ? `${stat.percent}% do teto` : 'parcial · termine a avaliação'}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(() => {
                const totalPremio = colabStats.reduce((acc, s) => acc + (s.premio || 0), 0);
                const completos = colabStats.filter((s) => s.completo).length;
                return (
                  <tr className="bg-surface-muted font-bold">
                    <td className="sticky left-0 bg-surface-muted z-10">Total estimado</td>
                    <td colSpan={criterios.length} className="text-right text-xs text-ink-500 font-normal">
                      {completos}/{colaboradores.length} avaliações completas
                    </td>
                    <td></td>
                    <td className="text-right font-extrabold">
                      {totalPremio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
