import { useEffect, useState } from 'react';
import { getSupabase, type IparItem, type ActionItem, type HazardCommunication } from '@innova/supabase';
import { Spinner } from '@innova/ui';

export function MeusIndicadores() {
  const [stats, setStats] = useState<{
    totalIpar: number;
    criticos: number;
    altos: number;
    medios: number;
    acoes: { planejada: number; em_andamento: number; concluida: number; atrasada: number };
    comunicacoes: { aberta: number; encerrada: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      // RLS já filtra para o proprietário ver só sua empresa
      const [iparRes, actionsRes, hazardRes] = await Promise.all([
        sb.from('ipar_items').select('probabilidade, severidade'),
        sb.from('action_plan').select('status'),
        sb.from('hazard_communications').select('status'),
      ]);

      const ipar = (iparRes.data as Pick<IparItem, 'probabilidade' | 'severidade'>[]) || [];
      const niveis = ipar.map((i) => (i.probabilidade || 0) * (i.severidade || 0));
      const criticos = niveis.filter((n) => n >= 20).length;
      const altos = niveis.filter((n) => n >= 15 && n < 20).length;
      const medios = niveis.filter((n) => n >= 8 && n < 15).length;

      const actions = (actionsRes.data as Pick<ActionItem, 'status'>[]) || [];
      const hazards = (hazardRes.data as Pick<HazardCommunication, 'status'>[]) || [];

      setStats({
        totalIpar: ipar.length,
        criticos, altos, medios,
        acoes: {
          planejada: actions.filter((a) => a.status === 'planejada').length,
          em_andamento: actions.filter((a) => a.status === 'em_andamento').length,
          concluida: actions.filter((a) => a.status === 'concluida').length,
          atrasada: actions.filter((a) => a.status === 'atrasada').length,
        },
        comunicacoes: {
          aberta: hazards.filter((h) => h.status !== 'encerrada' && h.status !== 'cancelada').length,
          encerrada: hazards.filter((h) => h.status === 'encerrada').length,
        },
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !stats) return <div className="grid place-items-center py-20"><Spinner size={32} className="text-accent-500" /></div>;

  const totalAcoes = stats.acoes.planejada + stats.acoes.em_andamento + stats.acoes.concluida + stats.acoes.atrasada;
  const pctConcluidas = totalAcoes ? Math.round((stats.acoes.concluida / totalAcoes) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Indicadores</h1>
        <p className="text-sm text-ink-700 mt-1">Visão consolidada da sua empresa · atualizado em tempo real</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Perigos no IPAR" value={stats.totalIpar} />
        <Kpi label="Críticos · Altos" value={stats.criticos + stats.altos} accent={stats.criticos + stats.altos > 0 ? 'danger' : 'ok'} />
        <Kpi label="Ações em andamento" value={stats.acoes.em_andamento} accent="warn" />
        <Kpi label="Comunicações abertas" value={stats.comunicacoes.aberta} accent={stats.comunicacoes.aberta > 0 ? 'warn' : 'ok'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-extrabold text-base mb-4">Distribuição de risco</h3>
          <div className="space-y-3">
            <RiskBar label="Crítico" count={stats.criticos} total={stats.totalIpar} color="bg-danger" />
            <RiskBar label="Alto" count={stats.altos} total={stats.totalIpar} color="bg-orange-500" />
            <RiskBar label="Médio" count={stats.medios} total={stats.totalIpar} color="bg-warn" />
            <RiskBar label="Baixo / Trivial" count={stats.totalIpar - stats.criticos - stats.altos - stats.medios} total={stats.totalIpar} color="bg-ok" />
          </div>
        </div>

        <div className="card">
          <h3 className="font-extrabold text-base mb-4">Plano de Ação</h3>
          <div className="text-center py-2">
            <div className="font-display text-6xl text-accent-600">{pctConcluidas}%</div>
            <div className="text-xs text-ink-500 mt-1">de ações concluídas</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-surface-muted rounded-xl p-2.5"><div className="text-ink-500">Planejadas</div><div className="font-extrabold text-base">{stats.acoes.planejada}</div></div>
            <div className="bg-accent-50 rounded-xl p-2.5"><div className="text-accent-700">Em andamento</div><div className="font-extrabold text-base">{stats.acoes.em_andamento}</div></div>
            <div className="bg-ok/10 rounded-xl p-2.5"><div className="text-ok">Concluídas</div><div className="font-extrabold text-base">{stats.acoes.concluida}</div></div>
            <div className="bg-danger/10 rounded-xl p-2.5"><div className="text-danger">Atrasadas</div><div className="font-extrabold text-base">{stats.acoes.atrasada}</div></div>
          </div>
        </div>
      </div>

      <div className="card bg-gradient-to-br from-accent-500 to-accent-700 text-white">
        <h3 className="font-extrabold">Indicadores oficiais NR-1</h3>
        <p className="text-sm text-white/80 mt-1">Métricas exigidas pela Portaria 1.419/2024</p>
        <div className="grid md:grid-cols-3 gap-3 mt-5 text-center">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-warn font-bold">% riscos controlados</div>
            <div className="text-2xl font-extrabold mt-1">{stats.totalIpar ? Math.round(((stats.totalIpar - stats.criticos - stats.altos) / stats.totalIpar) * 100) : 0}%</div>
            <div className="text-[10px] text-white/60">meta ≥ 95%</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-warn font-bold">% ações no prazo</div>
            <div className="text-2xl font-extrabold mt-1">{totalAcoes ? Math.round((stats.acoes.concluida / totalAcoes) * 100) : 0}%</div>
            <div className="text-[10px] text-white/60">meta ≥ 90%</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-warn font-bold">Comunicações</div>
            <div className="text-2xl font-extrabold mt-1">{stats.comunicacoes.aberta + stats.comunicacoes.encerrada}</div>
            <div className="text-[10px] text-white/60">{stats.comunicacoes.aberta} abertas</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: 'warn' | 'danger' | 'ok' }) {
  const cls = accent === 'danger' ? 'text-danger' : accent === 'warn' ? 'text-warn' : accent === 'ok' ? 'text-ok' : '';
  return (
    <div className="card">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-ink-500">{label}</div>
      <div className={`text-3xl font-extrabold mt-2 ${cls}`}>{value}</div>
    </div>
  );
}

function RiskBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-bold">{label}</span>
        <span className="text-ink-500">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
