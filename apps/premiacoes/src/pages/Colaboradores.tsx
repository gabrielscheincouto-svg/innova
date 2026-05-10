import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase, logAudit, type PremiosColaborador } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';
import { usePremios } from '../lib/store';

export function Colaboradores() {
  const { currentCompanyId } = usePremios();
  const [list, setList] = useState<PremiosColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PremiosColaborador | null>(null);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { if (currentCompanyId) load(); else setLoading(false); }, [currentCompanyId]);

  async function load() {
    if (!currentCompanyId) return;
    setLoading(true);
    const sb = getSupabase();
    const { data, error } = await sb
      .from('premios_colaboradores')
      .select('*')
      .eq('company_id', currentCompanyId)
      .order('full_name', { ascending: true });
    if (error) toast(error.message, 'danger');
    setList(data || []);
    setLoading(false);
  }

  const filtered = list.filter((c) =>
    !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search.replace(/\D/g, ''))
  );

  async function handleToggleActive(c: PremiosColaborador) {
    const sb = getSupabase();
    const { error } = await sb.from('premios_colaboradores').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) toast(error.message, 'danger');
    else { toast(c.is_active ? 'Inativado' : 'Reativado', 'ok'); load(); }
  }

  async function handleDelete(c: PremiosColaborador) {
    const ok = await confirm({
      title: `Excluir ${c.full_name}?`,
      description: 'Remove o colaborador e todas as avaliações vinculadas. Não pode ser desfeito.',
      confirmLabel: 'Sim, excluir',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_colaboradores').delete().eq('id', c.id);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'premios_colaborador_delete', resource_type: 'premios_colaborador', resource_id: c.id });
    toast('Colaborador excluído', 'ok');
    load();
  }

  if (!currentCompanyId) {
    return <div className="card p-10 text-center"><p className="text-sm text-ink-500">Selecione uma empresa em Configurações.</p></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Colaboradores</h1>
          <p className="text-sm text-ink-700 mt-1">{list.length} cadastrados · {list.filter((c) => c.is_active).length} ativos</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">+ Novo colaborador</button>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <input placeholder="Buscar por nome ou CPF..." className="input max-w-md" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-500">
            {list.length === 0 ? 'Nenhum colaborador. Crie o primeiro.' : 'Nenhum resultado.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th><th>CPF</th><th>Matrícula</th><th>Cargo</th><th>Setor</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-accent-100 text-accent-700 grid place-items-center font-extrabold text-xs">
                        {c.full_name.split(' ').slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')}
                      </div>
                      <div className="font-bold">{c.full_name}</div>
                    </div>
                  </td>
                  <td className="text-xs">{formatCPF(c.cpf)}</td>
                  <td className="text-xs">{c.matricula || '—'}</td>
                  <td className="text-xs">{c.cargo || '—'}</td>
                  <td className="text-xs">{c.setor || '—'}</td>
                  <td>
                    <button onClick={() => handleToggleActive(c)} className={`pill ${c.is_active ? 'pill-ok' : 'pill-gray'} cursor-pointer`}>
                      {c.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
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
        <ColaboradorForm
          companyId={currentCompanyId}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function ColaboradorForm({
  companyId, initial, onClose, onSaved,
}: { companyId: string; initial: PremiosColaborador | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    full_name: initial?.full_name || '',
    cpf: initial?.cpf || '',
    matricula: initial?.matricula || '',
    cargo: initial?.cargo || '',
    setor: initial?.setor || '',
    data_admissao: initial?.data_admissao || '',
    salario_base: initial?.salario_base?.toString() || '',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) { toast('CPF deve ter 11 dígitos', 'warn'); setSaving(false); return; }
    const payload = {
      ...form,
      cpf,
      data_admissao: form.data_admissao || null,
      salario_base: form.salario_base ? Number(form.salario_base) : null,
      matricula: form.matricula || null,
      cargo: form.cargo || null,
      setor: form.setor || null,
      notes: form.notes || null,
      company_id: companyId,
    };
    const sb = getSupabase();
    let error;
    if (isEdit) ({ error } = await sb.from('premios_colaboradores').update(payload).eq('id', initial!.id));
    else ({ error } = await sb.from('premios_colaboradores').insert(payload as never));
    if (error) { toast(error.message, 'danger'); setSaving(false); return; }
    toast(isEdit ? 'Colaborador atualizado' : 'Colaborador criado', 'ok');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-4xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl">{isEdit ? 'Editar colaborador' : 'Novo colaborador'}</h3>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome completo *</label>
              <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">CPF *</label>
                <input className="input" required value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="label">Matrícula</label>
                <input className="input" value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cargo</label>
                <input className="input" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Operador" />
              </div>
              <div>
                <label className="label">Setor</label>
                <input className="input" value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="Logística" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data admissão</label>
                <input className="input" type="date" value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} />
              </div>
              <div>
                <label className="label">Salário base (R$)</label>
                <input className="input" type="number" step="0.01" value={form.salario_base} onChange={(e) => setForm({ ...form, salario_base: e.target.value })} placeholder="2500.00" />
              </div>
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                {saving ? <Spinner size={16} /> : (isEdit ? 'Salvar' : 'Criar colaborador')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatCPF(c: string) {
  const v = c.replace(/\D/g, '').padStart(11, '0');
  return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9,11)}`;
}
