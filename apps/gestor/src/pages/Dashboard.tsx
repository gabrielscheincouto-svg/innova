import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '@innova/supabase';
import { Spinner } from '@innova/ui';
import { useAuth } from '@innova/auth';

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  recentLogs: number;
}

export function Dashboard() {
  const profile = useAuth((s) => s.profile);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Array<{ id: string; action: string; actor_email: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const [companiesRes, usersRes, logsRes, recentLogsRes] = await Promise.all([
        sb.from('companies').select('id, status'),
        sb.from('profiles').select('id, is_active'),
        sb.from('audit_logs').select('id').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        sb.from('audit_logs').select('id, action, actor_email, created_at').order('created_at', { ascending: false }).limit(8),
      ]);

      const companies = companiesRes.data || [];
      const users = usersRes.data || [];

      setStats({
        totalCompanies: companies.length,
        activeCompanies: companies.filter((c) => c.status === 'ativa').length,
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.is_active).length,
        pendingInvites: 0,
        recentLogs: logsRes.data?.length || 0,
      });
      setRecent(recentLogsRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="grid place-items-center py-20"><Spinner size={32} className="text-accent-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Olá, {profile?.full_name?.split(' ')[0] || 'Gestor'}!</h1>
          <p className="text-sm text-ink-700 mt-1">Visão geral do ecossistema Innova</p>
        </div>
        <div className="flex gap-2">
          <Link to="/empresas" className="btn btn-ghost">+ Nova empresa</Link>
          <Link to="/usuarios" className="btn btn-primary">+ Novo usuário</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Empresas ativas" value={stats?.activeCompanies ?? 0} sub={`${stats?.totalCompanies ?? 0} no total`} />
        <KpiCard label="Usuários ativos" value={stats?.activeUsers ?? 0} sub={`${stats?.totalUsers ?? 0} no total`} />
        <KpiCard label="Eventos (24h)" value={stats?.recentLogs ?? 0} sub="auditoria recente" />
        <KpiCard label="Sistemas" value="3" sub="NR1 · Premiações · Gestor" />
      </div>

      {/* Atividade recente + atalhos */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-extrabold text-base">Atividade recente</h3>
            <Link to="/auditoria" className="text-xs font-bold text-accent-600">Ver tudo →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-500 py-6 text-center">Nenhum evento ainda. Crie a primeira empresa para começar.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-black/5 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-accent-50 grid place-items-center text-accent-600 text-sm font-extrabold">
                    {r.action[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{r.action}</div>
                    <div className="text-xs text-ink-500 truncate">{r.actor_email || 'sistema'}</div>
                  </div>
                  <div className="text-xs text-ink-500 whitespace-nowrap">{formatRelative(r.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-accent-500 to-accent-700 text-white">
            <h4 className="font-extrabold text-base">Atalhos rápidos</h4>
            <p className="text-xs text-white/70 mt-1">Operações mais frequentes</p>
            <div className="space-y-2 mt-4">
              <Link to="/empresas" className="flex items-center justify-between bg-white/10 hover:bg-white/15 rounded-xl px-3 py-2 text-sm font-semibold">
                Cadastrar empresa <span>→</span>
              </Link>
              <Link to="/usuarios" className="flex items-center justify-between bg-white/10 hover:bg-white/15 rounded-xl px-3 py-2 text-sm font-semibold">
                Convidar usuário <span>→</span>
              </Link>
              <Link to="/auditoria" className="flex items-center justify-between bg-white/10 hover:bg-white/15 rounded-xl px-3 py-2 text-sm font-semibold">
                Ver logs de acesso <span>→</span>
              </Link>
            </div>
          </div>

          <div className="card">
            <h4 className="font-extrabold text-base">Status dos sistemas</h4>
            <div className="space-y-2 mt-3">
              <SystemRow name="Gestor" status="ok" />
              <SystemRow name="NR1" status="planned" />
              <SystemRow name="Premiações" status="planned" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-ink-500">{label}</div>
      <div className="text-3xl font-extrabold mt-2">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-1">{sub}</div>}
    </div>
  );
}

function SystemRow({ name, status }: { name: string; status: 'ok' | 'planned' | 'down' }) {
  const cfg = {
    ok: { label: 'Operacional', className: 'pill-ok' },
    planned: { label: 'Planejado', className: 'pill-gray' },
    down: { label: 'Fora do ar', className: 'pill-danger' },
  }[status];
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className="font-bold">Innova /{name}</span>
      <span className={`pill ${cfg.className}`}>{cfg.label}</span>
    </div>
  );
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return date.toLocaleDateString('pt-BR');
}
