import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '@innova/supabase';
import { Spinner } from '@innova/ui';
import { useAuth } from '@innova/auth';

interface Stats {
  totalCompanies: number;
  activeAssessments: number;
  iparItems: number;
  pendingActions: number;
  hazardsOpen: number;
  laudosPublicados: number;
}

export function Dashboard() {
  const profile = useAuth((s) => s.profile);
  const isProprietario = profile?.role === 'proprietario';
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      // RLS filtra automaticamente pelo vínculo do usuário
      const [companiesRes, assessRes, iparRes, actionsRes, hazardRes, laudosRes] = await Promise.all([
        sb.from('companies').select('id', { count: 'exact', head: true }),
        sb.from('assessments').select('id', { count: 'exact', head: true }).eq('status', 'coleta'),
        sb.from('ipar_items').select('id', { count: 'exact', head: true }),
        sb.from('action_plan').select('id', { count: 'exact', head: true }).neq('status', 'concluida'),
        sb.from('hazard_communications').select('id', { count: 'exact', head: true }).neq('status', 'encerrada'),
        sb.from('assessments').select('id', { count: 'exact', head: true }).in('status', ['concluida', 'arquivada']),
      ]);
      setStats({
        totalCompanies: companiesRes.count || 0,
        activeAssessments: assessRes.count || 0,
        iparItems: iparRes.count || 0,
        pendingActions: actionsRes.count || 0,
        hazardsOpen: hazardRes.count || 0,
        laudosPublicados: laudosRes.count || 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={32} className="text-accent-500" /></div>;

  // ============ DASHBOARD DO PROPRIETÁRIO (read-only) ============
  if (isProprietario) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl">Olá, {profile?.full_name?.split(' ')[0]}!</h1>
          <p className="text-sm text-ink-700 mt-1">Visão da sua empresa · NR-1 · Portaria 1.419/2024</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Laudos publicados" value={stats!.laudosPublicados} accent="ok" />
          <Kpi label="Avaliação ativa" value={stats!.activeAssessments} accent={stats!.activeAssessments > 0 ? 'warn' : undefined} />
          <Kpi label="Riscos no IPAR" value={stats!.iparItems} />
          <Kpi label="Comunicações abertas" value={stats!.hazardsOpen} accent={stats!.hazardsOpen > 0 ? 'warn' : 'ok'} />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card">
            <h3 className="font-extrabold text-base mb-4">Acompanhe sua conformidade</h3>
            <div className="space-y-3 text-sm">
              <ActionRow icon="📄" title="Ver laudos publicados" desc={`${stats!.laudosPublicados} laudos disponíveis pra download`} link="/meus-laudos" />
              <ActionRow icon="📊" title="Indicadores em tempo real" desc="Distribuição de risco, plano de ação, comunicações" link="/meus-indicadores" />
              <ActionRow icon="📨" title="Comunicações de perigo" desc={`${stats!.hazardsOpen} reportes pendentes de tratamento`} link="/comunicacoes" />
              <ActionRow icon="🏢" title="Dados da minha empresa" desc="CNPJ, plano contratado, mensalidade" link="/minha-empresa" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-accent-500 to-accent-700 text-white">
            <h4 className="font-extrabold text-base">Sua área é read-only</h4>
            <p className="text-xs text-white/70 mt-2">Você acessa relatórios e indicadores da sua empresa. Edições no PGR e plano de ação são feitas pela equipe técnica da Innova — você é informado quando há publicação nova.</p>
            <div className="mt-5 inline-flex items-center gap-2 bg-warn text-ink-900 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider">
              👁 Visualização cliente
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ DASHBOARD DO PROFISSIONAL (operacional) ============
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Olá, {profile?.full_name?.split(' ')[0] || 'Profissional'}!</h1>
          <p className="text-sm text-ink-700 mt-1">Visão geral · NR-1 · Portaria 1.419/2024</p>
        </div>
        <div className="flex gap-2">
          <Link to="/clientes" className="btn btn-ghost">Ver clientes</Link>
          <Link to="/avaliacoes/nova" className="btn btn-primary">+ Lançar avaliação</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Clientes" value={stats!.totalCompanies} />
        <Kpi label="Avaliações em curso" value={stats!.activeAssessments} accent="warn" />
        <Kpi label="Perigos no IPAR" value={stats!.iparItems} />
        <Kpi label="Ações abertas" value={stats!.pendingActions} accent="danger" />
        <Kpi label="Comunicações abertas" value={stats!.hazardsOpen} accent="warn" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <h3 className="font-extrabold text-base mb-4">Próximas ações</h3>
          <div className="space-y-3 text-sm">
            <ActionRow icon="📨" title="Lançar nova avaliação" desc="Gerar link único de COPSOQ II para um cliente" link="/avaliacoes/nova" />
            <ActionRow icon="📋" title="Atender comunicações abertas" desc={`${stats!.hazardsOpen} reportes aguardando triagem`} link="/comunicacoes" />
            <ActionRow icon="✅" title="Acompanhar plano de ação" desc={`${stats!.pendingActions} ações em andamento`} link="/plano-acao" />
            <ActionRow icon="📑" title="Gerar laudo PGR" desc="Consolidar IPAR + plano em PDF assinado" link="/relatorios" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-accent-500 to-accent-700 text-white">
          <h4 className="font-extrabold text-base">Matriz P × S</h4>
          <p className="text-xs text-white/70 mt-1">Classificação automática</p>
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {[[5,10,15,20,25],[4,8,12,16,20],[3,6,9,12,15],[2,4,6,8,10],[1,2,3,4,5]].flat().map((v, i) => {
              const bg = v >= 20 ? '#EF4444' : v >= 15 ? '#F97316' : v >= 8 ? '#F59E0B' : v >= 4 ? '#10B981' : '#B0B0C0';
              return <div key={i} className="aspect-[1.6] rounded-md grid place-items-center font-bold text-xs text-white" style={{ background: bg }}>{v}</div>;
            })}
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

function ActionRow({ icon, title, desc, link }: { icon: string; title: string; desc: string; link: string }) {
  return (
    <Link to={link} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-muted transition">
      <div className="w-10 h-10 rounded-xl bg-accent-50 grid place-items-center text-lg">{icon}</div>
      <div className="flex-1">
        <div className="font-bold">{title}</div>
        <div className="text-xs text-ink-500">{desc}</div>
      </div>
      <span className="text-accent-600 text-xs font-bold">→</span>
    </Link>
  );
}
