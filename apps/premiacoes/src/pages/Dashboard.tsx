import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '@innova/supabase';
import { Spinner } from '@innova/ui';
import { useAuth } from '@innova/auth';

interface Stats {
  programs: number;
  atas: number;
  totalPaid: number;
  beneficiaries: number;
}

export function Dashboard() {
  const profile = useAuth((s) => s.profile);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentAtas, setRecentAtas] = useState<Array<{ id: string; period: string; total_amount: number; beneficiaries_count: number; status: string }>>([]);

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const [progRes, atasRes] = await Promise.all([
        sb.from('premiacao_programs').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
        sb.from('premiacao_atas').select('id, period, total_amount, beneficiaries_count, status').order('created_at', { ascending: false }).limit(20),
      ]);
      const atas = atasRes.data || [];
      const totalPaid = atas.filter((a: { status: string }) => a.status === 'paga' || a.status === 'aprovada').reduce((s: number, a: { total_amount: number }) => s + Number(a.total_amount || 0), 0);
      const beneficiaries = atas.reduce((s: number, a: { beneficiaries_count: number }) => s + (a.beneficiaries_count || 0), 0);
      setStats({
        programs: progRes.count || 0,
        atas: atas.length,
        totalPaid,
        beneficiaries,
      });
      setRecentAtas(atas.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={32} className="text-accent-500" /></div>;

  const fmt = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Olá, {profile?.full_name?.split(' ')[0] || 'Gestor'}!</h1>
          <p className="text-sm text-ink-700 mt-1">Visão do programa de premiação · Art. 457 §2 CLT</p>
        </div>
        <div className="flex gap-2">
          <Link to="/calculadora" className="btn btn-ghost">Calculadora</Link>
          <Link to="/atas" className="btn btn-primary">+ Nova ata</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Programas ativos" value={stats!.programs.toString()} />
        <Kpi label="Atas registradas" value={stats!.atas.toString()} />
        <Kpi label="Pago em prêmios" value={fmt(stats!.totalPaid)} accent="ok" />
        <Kpi label="Beneficiados" value={stats!.beneficiaries.toString()} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-extrabold text-base">Atas recentes</h3>
            <Link to="/atas" className="text-xs font-bold text-accent-600">Ver todas →</Link>
          </div>
          {recentAtas.length === 0 ? (
            <p className="text-sm text-ink-500 py-6 text-center">Nenhuma ata registrada. Crie a primeira.</p>
          ) : (
            <div className="space-y-3">
              {recentAtas.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-muted">
                  <div className="w-10 h-10 rounded-xl bg-warn/10 grid place-items-center text-warn font-extrabold">★</div>
                  <div className="flex-1">
                    <div className="font-bold">{a.period}</div>
                    <div className="text-xs text-ink-500">{a.beneficiaries_count} beneficiados · {fmt(a.total_amount)}</div>
                  </div>
                  <span className={`pill ${a.status === 'paga' ? 'pill-ok' : a.status === 'aprovada' ? 'pill-accent' : 'pill-warn'}`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card bg-gradient-to-br from-accent-500 to-accent-700 text-white">
          <h4 className="font-extrabold text-base">Economia estimada</h4>
          <p className="text-xs text-white/70 mt-1">Encargos evitados (~72%)</p>
          <div className="font-display text-5xl mt-4 leading-none">{fmt(stats!.totalPaid * 0.72)}</div>
          <p className="text-xs text-white/70 mt-2">INSS + FGTS + 13º + férias proporcionais</p>
          <Link to="/calculadora" className="mt-5 inline-flex bg-warn text-ink-900 rounded-2xl px-4 py-2 text-xs font-extrabold hover:bg-warn/90">Abrir calculadora →</Link>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: 'ok' | 'warn' | 'danger' }) {
  const cls = accent === 'ok' ? 'text-ok' : accent === 'danger' ? 'text-danger' : '';
  return (
    <div className="card">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-ink-500">{label}</div>
      <div className={`text-3xl font-extrabold mt-2 ${cls}`}>{value}</div>
    </div>
  );
}
