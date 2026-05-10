import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase, logAudit } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';

interface Ata {
  id: string;
  program_id: string;
  company_id: string;
  period: string;
  total_amount: number;
  beneficiaries_count: number;
  kpi_trigger: string | null;
  status: string;
  created_at: string;
  premiacao_programs?: { name: string };
  companies?: { trade_name: string | null; legal_name: string };
}

interface Program { id: string; name: string; company_id: string }

export function Atas() {
  const [list, setList] = useState<Ata[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const [aRes, pRes] = await Promise.all([
      sb.from('premiacao_atas').select('*, premiacao_programs(name), companies(trade_name, legal_name)').order('created_at', { ascending: false }),
      sb.from('premiacao_programs').select('id, name, company_id').eq('status', 'ativo'),
    ]);
    setList((aRes.data as Ata[]) || []);
    setPrograms((pRes.data as Program[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    const sb = getSupabase();
    const { error } = await sb.from('premiacao_atas').update({ status }).eq('id', id);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'ata_status_change', resource_type: 'premiacao_ata', resource_id: id, meta: { status } });
    toast('Status atualizado', 'ok');
    load();
  }

  const fmt = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Atas de premiação</h1>
          <p className="text-sm text-ink-700 mt-1">{list.length} atas registradas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Nova ata</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-500">Nenhuma ata registrada.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Período</th><th>Programa</th><th>Beneficiados</th><th>Total</th><th>Gatilho</th><th>Status</th></tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="font-bold">{a.period}</td>
                  <td className="text-xs">{a.premiacao_programs?.name || '—'}</td>
                  <td className="text-xs">{a.beneficiaries_count}</td>
                  <td className="font-extrabold">{fmt(Number(a.total_amount))}</td>
                  <td className="text-xs max-w-xs truncate">{a.kpi_trigger || '—'}</td>
                  <td>
                    <select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)} className="text-xs px-2 py-1 rounded-full bg-surface-muted font-bold cursor-pointer">
                      <option value="pendente">Pendente</option>
                      <option value="aprovada">Aprovada</option>
                      <option value="paga">Paga</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <AtaForm programs={programs} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); toast('Ata registrada', 'ok'); }} />}
    </div>
  );
}

function AtaForm({ programs, onClose, onSaved }: { programs: Program[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    program_id: programs[0]?.id || '',
    period: '2026.Q2',
    total_amount: '',
    beneficiaries_count: '',
    kpi_trigger: '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.program_id) { toast('Crie um programa antes de registrar atas', 'warn'); return; }
    setSaving(true);
    const sb = getSupabase();
    const program = programs.find((p) => p.id === form.program_id);
    const { error, data } = await sb.from('premiacao_atas').insert({
      program_id: form.program_id,
      company_id: program?.company_id || '',
      period: form.period,
      total_amount: Number(form.total_amount),
      beneficiaries_count: Number(form.beneficiaries_count),
      kpi_trigger: form.kpi_trigger || null,
      status: 'pendente',
    }).select().single();
    setSaving(false);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'ata_create', resource_type: 'premiacao_ata', resource_id: data?.id, meta: { period: form.period, total: form.total_amount } });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-4xl shadow-2xl max-w-2xl w-full">
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl">Nova ata</h3>
            <button onClick={onClose} className="text-ink-500">✕</button>
          </div>
          {programs.length === 0 ? (
            <p className="text-sm text-ink-500 py-8 text-center">Você precisa criar um <strong>programa</strong> antes de registrar atas. Vá em "Programas".</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Programa *</label>
                <select required className="input" value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })}>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Período *</label>
                  <input required className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2026.Q2" />
                </div>
                <div>
                  <label className="label">Beneficiados *</label>
                  <input required type="number" className="input" value={form.beneficiaries_count} onChange={(e) => setForm({ ...form, beneficiaries_count: e.target.value })} />
                </div>
                <div>
                  <label className="label">Total (R$) *</label>
                  <input required type="number" step="0.01" className="input" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">KPI gatilho</label>
                <textarea rows={2} className="input" value={form.kpi_trigger} onChange={(e) => setForm({ ...form, kpi_trigger: e.target.value })} placeholder="SLA de entrega ≥ 95% · NPS médio ≥ 8 · zero acidentes..." />
                <p className="text-[11px] text-ink-500 mt-1">Métrica objetiva e mensurável que justifica a premiação (defesa jurídica)</p>
              </div>

              {form.total_amount && (
                <div className="bg-ok/10 border border-ok/20 rounded-2xl p-4 text-sm">
                  <div className="font-bold text-ok">Economia estimada em encargos</div>
                  <div className="text-2xl font-extrabold text-ok mt-1">R$ {Math.round(Number(form.total_amount) * 0.72).toLocaleString('pt-BR')}</div>
                  <div className="text-xs text-ink-700 mt-1">~72% (INSS + FGTS + 13º + férias)</div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                  {saving ? <Spinner size={16} /> : 'Registrar ata'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
