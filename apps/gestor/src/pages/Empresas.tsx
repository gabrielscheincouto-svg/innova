import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase, logAudit, type Company, type CompanyStatus, type PlanTier } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';

export function Empresas() {
  const [list, setList] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Company | null>(null);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const { data, error } = await sb.from('companies').select('*').order('created_at', { ascending: false });
    if (error) toast(error.message, 'danger');
    setList(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = list.filter((c) =>
    !search || c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search.replace(/\D/g, ''))
  );

  async function handleDelete(c: Company) {
    const ok = await confirm({
      title: `Excluir ${c.trade_name || c.legal_name}?`,
      description: 'Essa ação remove a empresa, seus usuários vinculados e dados associados. Não pode ser desfeita.',
      confirmLabel: 'Sim, excluir',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('companies').delete().eq('id', c.id);
    if (error) {
      toast(error.message, 'danger');
      return;
    }
    await logAudit({ action: 'company_delete', resource_type: 'company', resource_id: c.id, meta: { cnpj: c.cnpj } });
    toast('Empresa excluída', 'ok');
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Empresas</h1>
          <p className="text-sm text-ink-700 mt-1">{list.length} cadastradas · {list.filter((c) => c.status === 'ativa').length} ativas</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">
          + Nova empresa
        </button>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <input
            placeholder="Buscar por nome ou CNPJ..."
            className="input max-w-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-500">
            {list.length === 0 ? 'Nenhuma empresa cadastrada. Crie a primeira.' : 'Nenhuma empresa encontrada com esse filtro.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>CNPJ</th>
                <th>Setor</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Mensal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-accent-100 text-accent-700 grid place-items-center font-extrabold text-xs">
                        {(c.trade_name || c.legal_name).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold">{c.trade_name || c.legal_name}</div>
                        {c.trade_name && <div className="text-[11px] text-ink-500">{c.legal_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="text-xs">{formatCNPJ(c.cnpj)}</td>
                  <td className="text-xs">{c.sector || '—'}</td>
                  <td><PlanBadge tier={c.plan_tier} /></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-xs font-semibold">{c.monthly_value ? `R$ ${Number(c.monthly_value).toLocaleString('pt-BR')}` : '—'}</td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditing(c); setShowForm(true); }} className="text-xs font-bold text-accent-600 hover:text-accent-700">Editar</button>
                      <button onClick={() => handleDelete(c)} className="text-xs font-bold text-danger hover:text-danger/80">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <CompanyForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// Form modal
// ============================================================
function CompanyForm({ initial, onClose, onSaved }: { initial: Company | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    cnpj: initial?.cnpj || '',
    legal_name: initial?.legal_name || '',
    trade_name: initial?.trade_name || '',
    sector: initial?.sector || '',
    city: initial?.city || '',
    state: initial?.state || '',
    plan_tier: (initial?.plan_tier || 'completa') as PlanTier,
    monthly_value: initial?.monthly_value?.toString() || '',
    status: (initial?.status || 'ativa') as CompanyStatus,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const sb = getSupabase();
    const cnpj = form.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      toast('CNPJ deve ter 14 dígitos', 'warn');
      setSaving(false);
      return;
    }
    const payload = {
      ...form,
      cnpj,
      monthly_value: form.monthly_value ? Number(form.monthly_value) : null,
    };
    let error;
    if (isEdit) {
      ({ error } = await sb.from('companies').update(payload).eq('id', initial!.id));
    } else {
      ({ error } = await sb.from('companies').insert(payload as never));
    }
    if (error) {
      toast(error.message, 'danger');
      setSaving(false);
      return;
    }
    await logAudit({
      action: isEdit ? 'company_update' : 'company_create',
      resource_type: 'company',
      resource_id: initial?.id,
      meta: { cnpj, legal_name: form.legal_name },
    });
    toast(isEdit ? 'Empresa atualizada' : 'Empresa criada', 'ok');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-4xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl">{isEdit ? 'Editar empresa' : 'Nova empresa'}</h3>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">CNPJ *</label>
                <input className="input" required value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CompanyStatus })}>
                  <option value="ativa">Ativa</option>
                  <option value="suspensa">Suspensa</option>
                  <option value="encerrada">Encerrada</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Razão social *</label>
              <input className="input" required value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Nome fantasia</label>
              <input className="input" value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Setor</label>
                <input className="input" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Logística" />
              </div>
              <div>
                <label className="label">Cidade</label>
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="label">UF</label>
                <input className="input" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Plano</label>
                <select className="input" value={form.plan_tier} onChange={(e) => setForm({ ...form, plan_tier: e.target.value as PlanTier })}>
                  <option value="basica">Básica</option>
                  <option value="completa">Completa (Recomendado)</option>
                  <option value="farmacia">Farmácia (especial)</option>
                </select>
              </div>
              <div>
                <label className="label">Mensalidade (R$)</label>
                <input className="input" type="number" step="0.01" value={form.monthly_value} onChange={(e) => setForm({ ...form, monthly_value: e.target.value })} placeholder="450.00" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                {saving ? <Spinner size={16} /> : (isEdit ? 'Salvar alterações' : 'Criar empresa')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PlanBadge({ tier }: { tier: PlanTier }) {
  const cfg: Record<PlanTier, { label: string; cls: string }> = {
    basica: { label: 'Básica', cls: 'pill-gray' },
    completa: { label: 'Completa', cls: 'pill-accent' },
    farmacia: { label: 'Farmácia', cls: 'pill-warn' },
  };
  return <span className={`pill ${cfg[tier].cls}`}>{cfg[tier].label}</span>;
}

function StatusBadge({ status }: { status: CompanyStatus }) {
  const cfg: Record<CompanyStatus, { label: string; cls: string }> = {
    ativa: { label: 'Ativa', cls: 'pill-ok' },
    suspensa: { label: 'Suspensa', cls: 'pill-warn' },
    encerrada: { label: 'Encerrada', cls: 'pill-danger' },
  };
  return <span className={`pill ${cfg[status].cls}`}>{cfg[status].label}</span>;
}

function formatCNPJ(c: string) {
  const v = c.replace(/\D/g, '').padStart(14, '0');
  return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12,14)}`;
}
