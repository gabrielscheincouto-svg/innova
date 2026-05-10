import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@innova/auth';
import { getSupabase, type PremiosFolha } from '@innova/supabase';
import { Spinner } from '@innova/ui';
import { usePremios, formatCompetencia } from '../lib/store';

export function Dashboard() {
  const profile = useAuth((s) => s.profile);
  const { currentCompanyId, currentCompetencia } = usePremios();
  const [stats, setStats] = useState({
    totalColaboradores: 0,
    avaliacoesNoMes: 0,
    valorFolhaMes: 0,
    folhasAprovadas: 0,
    folhasPagas: 0,
    mediaScore: 0,
    topColaboradores: [] as Array<{ nome: string; score: number; valor: number }>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCompanyId) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompanyId, currentCompetencia]);

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    try {
      const { count: countColabs } = await sb
        .from('premios_colaboradores')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId!)
        .eq('is_active', true);

      const { count: countAvals } = await sb
        .from('premios_avaliacoes')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId!)
        .eq('competencia', currentCompetencia);

      const { data: folha } = await sb
        .from('premios_folha')
        .select('*, colaborador:premios_colaboradores(full_name)')
        .eq('company_id', currentCompanyId!)
        .eq('competencia', currentCompetencia);
      const folhaItems = (folha || []) as Array<PremiosFolha & { colaborador: { full_name: string } }>;
      const valorFolhaMes = folhaItems.reduce((acc, f) => acc + Number(f.premio_value || 0), 0);
      const folhasAprovadas = folhaItems.filter((f) => f.status === 'aprovada' || f.status === 'paga').length;
      const folhasPagas = folhaItems.filter((f) => f.status === 'paga').length;
      const scores = folhaItems.map((f) => Number(f.final_score || 0)).filter((s) => s > 0);
      const mediaScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const topColaboradores = folhaItems
        .filter((f) => f.final_score && f.premio_value)
        .sort((a, b) => Number(b.final_score) - Number(a.final_score))
        .slice(0, 5)
        .map((f) => ({
          nome: f.colaborador?.full_name || '—',
          score: Number(f.final_score),
          valor: Number(f.premio_value),
        }));

      setStats({
        totalColaboradores: countColabs ?? 0,
        avaliacoesNoMes: countAvals ?? 0,
        valorFolhaMes,
        folhasAprovadas,
        folhasPagas,
        mediaScore,
        topColaboradores,
      });
    } catch (e) {
      console.warn('Dashboard load error', e);
    }
    setLoading(false);
  }

  if (loading) return <div className="py-20 grid place-items-center"><Spinner size={32} className="text-accent-500" /></div>;

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
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-5 bg-white rounded-4xl p-8 shadow-soft relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-accent-50 opacity-70"></div>
          <div className="absolute bottom-2 right-6 w-6 h-6 rounded-full bg-warn/20"></div>
          <div className="relative">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Olá, {profile?.full_name?.split(' ')[0]}!</h1>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight mt-1">Como vai o programa<br />de prêmios hoje?</h2>
            <p className="text-sm text-ink-500 mt-4 max-w-sm leading-relaxed">
              Avaliações de <strong className="capitalize text-ink-900">{formatCompetencia(currentCompetencia)}</strong>, folha consolidada e calculadora 457 §2 num lugar só.
            </p>
          </div>
        </div>

        <Link to="/avaliacao" className="col-span-6 lg:col-span-3 bg-white rounded-4xl p-5 shadow-soft hover:-translate-y-0.5 hover:shadow-md transition group block">
          <svg viewBox="0 0 80 80" className="w-20 h-20 mb-2">
            <rect x="14" y="10" width="46" height="58" rx="6" fill="#EFEFFE" stroke="#6364E0" strokeWidth="2" />
            <rect x="22" y="6" width="30" height="10" rx="3" fill="#FFFFFF" stroke="#6364E0" strokeWidth="2" />
            <line x1="22" y1="28" x2="52" y2="28" stroke="#A5A4F8" strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="36" x2="46" y2="36" stroke="#A5A4F8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="50" cy="52" r="10" fill="#FFFFFF" stroke="#6364E0" strokeWidth="2" />
            <path d="M45 52 L49 56 L55 49" stroke="#6364E0" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="68" cy="20" r="4" fill="#F59E0B" />
          </svg>
          <div className="font-bold text-sm mt-1">Lançar avaliação</div>
          <div className="text-xs text-ink-500 mt-1">Notas dos critérios do mês</div>
        </Link>

        <Link to="/folha" className="col-span-6 lg:col-span-2 bg-white rounded-4xl p-5 shadow-soft hover:-translate-y-0.5 hover:shadow-md transition block">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-2">Folha do mês</div>
          <div className="text-3xl font-extrabold tracking-tight">{stats.valorFolhaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</div>
          <div className="text-xs text-ink-500 mt-1">{stats.folhasAprovadas} aprovadas · {stats.folhasPagas} pagas</div>
        </Link>

        <Link to="/colaboradores" className="col-span-6 lg:col-span-2 bg-white rounded-4xl p-5 shadow-soft hover:-translate-y-0.5 hover:shadow-md transition block">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-2">Colaboradores</div>
          <div className="text-3xl font-extrabold tracking-tight">{stats.totalColaboradores}</div>
          <div className="text-xs text-ink-500 mt-1">ativos no programa</div>
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-5 card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-500">Performance do mês</div>
              <div className="text-2xl font-extrabold mt-1">{stats.mediaScore.toFixed(1)} <span className="text-base text-ink-500 font-bold">/ 5</span></div>
            </div>
            <RingScore score={stats.mediaScore} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Avaliações" value={stats.avaliacoesNoMes} />
            <Stat label="Aprovadas" value={stats.folhasAprovadas} />
            <Stat label="Pagas" value={stats.folhasPagas} />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold">Top 5 colaboradores · {formatCompetencia(currentCompetencia)}</h3>
            <Link to="/folha" className="text-xs font-bold text-accent-600 hover:text-accent-700">Ver folha →</Link>
          </div>
          {stats.topColaboradores.length === 0 ? (
            <p className="text-sm text-ink-500 text-center py-8">Sem avaliações no mês ainda. <Link to="/avaliacao" className="text-accent-600 font-bold">Lançar agora →</Link></p>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Colaborador</th><th>Score</th><th>Prêmio</th></tr>
              </thead>
              <tbody>
                {stats.topColaboradores.map((c, i) => (
                  <tr key={i}>
                    <td className="font-bold text-ink-500">#{i + 1}</td>
                    <td className="font-semibold">{c.nome}</td>
                    <td><ScoreBadge score={c.score} /></td>
                    <td className="font-bold">{c.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function RingScore({ score }: { score: number }) {
  const pct = Math.min(100, (score / 5) * 100);
  const r = 36;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#6364E0" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-extrabold text-lg">{Math.round(pct)}%</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-surface-muted rounded-2xl p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-xl font-extrabold mt-1">{value}</div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const rounded = Math.round(score);
  const cls =
    rounded >= 5 ? 'bg-ok/15 text-ok' :
    rounded >= 4 ? 'bg-accent-100 text-accent-700' :
    rounded >= 3 ? 'bg-warn/15 text-warn' :
    'bg-danger/15 text-danger';
  return <span className={`pill ${cls} font-bold`}>{score.toFixed(1)}</span>;
}
