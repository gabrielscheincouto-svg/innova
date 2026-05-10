import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase, logAudit, type Company } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';

interface Program {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  legal_basis: string | null;
  status: string;
  created_at: string;
  companies?: { trade_name: string | null; legal_name: string };
}

export function Programas() {
  const [list, setList] = useState<Program[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const [pRes, cRes] = await Promise.all([
      sb.from('premiacao_programs').select('*, companies(trade_name, legal_name)').order('created_at', { ascending: false }),
      sb.from('companies').select('*').order('legal_name'),
    ]);
    setList((pRes.data as Program[]) || []);
    setCompanies((cRes.data as Company[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Programas de premiação</h1>
          <p className="text-sm text-ink-700 mt-1">{list.length} programas cadastrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Novo programa</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-ink-500 mb-4">Nenhum programa cadastrado.</p>
            <p className="text-xs text-ink-500 max-w-md mx-auto">
              Crie o primeiro programa de premiação enquadrado no Art. 457 §2 CLT.
              Cada programa precisa ter regulamento, KPIs objetivos e governança.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Programa</th><th>Empresa</th><th>Base legal</th><th>Status</th><th>Criado</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="font-bold">{p.name}</div>
                    {p.description && <div className="text-[11px] text-ink-500 max-w-md truncate">{p.description}</div>}
                  </td>
                  <td className="text-xs">{p.companies?.trade_name || p.companies?.legal_name || '—'}</td>
                  <td className="text-xs">{p.legal_basis || 'Art. 457 §2 CLT'}</td>
                  <td><span className={`pill ${p.status === 'ativo' ? 'pill-ok' : 'pill-gray'}`}>{p.status}</span></td>
                  <td className="text-xs">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <ProgramaForm companies={companies} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); toast('Programa criado', 'ok'); }} />}
    </div>
  );
}

function ProgramaForm({ companies, onClose, onSaved }: { companies: Company[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    company_id: companies[0]?.id || '',
    name: '',
    description: '',
    legal_basis: 'Art. 457 §2 CLT',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const sb = getSupabase();
    const { error, data } = await sb.from('premiacao_programs').insert({ ...form, status: 'ativo' }).select().single();
    setSaving(false);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'program_create', resource_type: 'premiacao_program', resource_id: data?.id, meta: { name: form.name } });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-4xl shadow-2xl max-w-2xl w-full">
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl">Novo programa</h3>
            <button onClick={onClose} className="text-ink-500">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Empresa *</label>
              <select required className="input" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nome do programa *</label>
              <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Programa de Reconhecimento por Performance" />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Critérios gerais, periodicidade, escopo..." />
            </div>
            <div>
              <label className="label">Base legal</label>
              <input className="input" value={form.legal_basis} onChange={(e) => setForm({ ...form, legal_basis: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                {saving ? <Spinner size={16} /> : 'Criar programa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
