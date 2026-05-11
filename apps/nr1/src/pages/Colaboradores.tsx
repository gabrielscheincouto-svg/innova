import { useEffect, useState } from 'react';
import { getSupabase, logAudit, type PremiosColaborador, type Company } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';

/**
 * Cadastro de colaboradores das empresas-cliente NR1.
 * Necessário para validar CPF + data de nascimento no link /c/:token.
 * Reutiliza a tabela premios_colaboradores (= colaboradores da empresa).
 */
export function Colaboradores() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [list, setList] = useState<PremiosColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PremiosColaborador | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { loadCompanies(); }, []);
  useEffect(() => { if (companyId) load(); else { setList([]); setLoading(false); } }, [companyId]);

  async function loadCompanies() {
    const sb = getSupabase();
    const { data } = await sb.from('companies').select('*').order('legal_name');
    const cs = (data || []) as Company[];
    setCompanies(cs);
    if (cs.length > 0 && !companyId) setCompanyId(cs[0].id);
  }

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const { data, error } = await sb
      .from('premios_colaboradores')
      .select('*')
      .eq('company_id', companyId)
      .order('full_name');
    if (error) toast(error.message, 'danger');
    setList((data || []) as PremiosColaborador[]);
    setLoading(false);
  }

  async function handleDelete(c: PremiosColaborador) {
    const ok = await confirm({
      title: `Excluir ${c.full_name}?`,
      description: 'Remove o colaborador. Não pode ser desfeito.',
      confirmLabel: 'Sim, excluir',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_colaboradores').delete().eq('id', c.id);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'nr1_colab_delete', resource_type: 'premios_colaborador', resource_id: c.id });
    toast('Colaborador excluído', 'ok');
    load();
  }

  async function handleToggleActive(c: PremiosColaborador) {
    const sb = getSupabase();
    const { error } = await sb.from('premios_colaboradores').update({ is_active: !c.is_active } as never).eq('id', c.id);
    if (error) toast(error.message, 'danger');
    else { toast(c.is_active ? 'Inativado' : 'Reativado', 'ok'); load(); }
  }

  const filtered = list.filter((c) =>
    !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.cpf || '').includes(search.replace(/\D/g, ''))
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Colaboradores</h1>
          <p className="text-sm text-ink-700 mt-1">
            Base de funcionários da empresa-cliente. Usada na validação do link público (CPF + data de nascimento) antes do colaborador responder o COPSOQ.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          disabled={!companyId}
          className="btn btn-primary disabled:opacity-40"
        >
          + Adicionar colaborador
        </button>
      </div>

      <div className="card">
        <div className="grid lg:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="label">Cliente</label>
            <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">— selecione —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="label">Buscar por nome ou CPF</label>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome ou CPF…" />
          </div>
        </div>

        {!companyId ? (
          <p className="py-12 text-center text-sm text-ink-500">Selecione uma empresa para listar colaboradores.</p>
        ) : loading ? (
          <div className="py-16 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-500">
            {list.length === 0 ? 'Nenhum colaborador cadastrado para essa empresa ainda.' : 'Nenhum resultado para a busca.'}
          </p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Nome</th><th>CPF</th><th>Nascimento</th><th>Cargo</th><th>Setor</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={!c.is_active ? 'opacity-50' : ''}>
                  <td className="font-bold">{c.full_name}</td>
                  <td className="text-xs">{formatCPF(c.cpf)}</td>
                  <td className="text-xs">{(c as any).data_nascimento ? new Date((c as any).data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : <span className="text-warn font-bold">faltando</span>}</td>
                  <td className="text-xs">{c.cargo || '—'}</td>
                  <td className="text-xs">{c.setor || '—'}</td>
                  <td><span className={`pill ${c.is_active ? 'pill-ok' : 'pill-gray'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                      <button onClick={() => { setEditing(c); setShowForm(true); }} className="text-xs font-bold text-accent-600 hover:text-accent-700">Editar</button>
                      <button onClick={() => handleToggleActive(c)} className="text-xs font-bold text-ink-500 hover:text-ink-900">{c.is_active ? 'Inativar' : 'Reativar'}</button>
                      <button onClick={() => handleDelete(c)} className="text-xs font-bold text-danger/80 hover:text-danger">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && companyId && (
        <FormModal
          companyId={companyId}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function FormModal({ companyId, editing, onClose, onSaved }: {
  companyId: string;
  editing: PremiosColaborador | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: editing?.full_name || '',
    cpf: editing?.cpf || '',
    matricula: editing?.matricula || '',
    cargo: editing?.cargo || '',
    setor: editing?.setor || '',
    data_nascimento: (editing as any)?.data_nascimento || '',
    data_admissao: editing?.data_admissao || '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) { toast('CPF deve ter 11 dígitos', 'warn'); setSaving(false); return; }
    if (!form.full_name.trim()) { toast('Nome obrigatório', 'warn'); setSaving(false); return; }

    const sb = getSupabase();
    const payload: any = {
      company_id: companyId,
      full_name: form.full_name.trim().toUpperCase(),
      cpf,
      matricula: form.matricula || null,
      cargo: form.cargo || null,
      setor: form.setor || null,
      data_nascimento: form.data_nascimento || null,
      data_admissao: form.data_admissao || null,
    };

    const { error } = editing
      ? await sb.from('premios_colaboradores').update(payload).eq('id', editing.id)
      : await sb.from('premios_colaboradores').insert(payload);

    setSaving(false);
    if (error) { toast(error.message, 'danger'); return; }
    toast(editing ? 'Atualizado' : 'Cadastrado', 'ok');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-xl w-full p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl mb-1">{editing ? 'Editar colaborador' : 'Novo colaborador'}</h2>
        <p className="text-xs text-ink-500 mb-5">Data de nascimento é obrigatória para a validação do link público.</p>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Nome completo *</label>
            <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">CPF *</label>
              <input className="input" required maxLength={14} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="label">Data nascimento *</label>
              <input type="date" className="input" required value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Matrícula</label>
              <input className="input" value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
            </div>
            <div>
              <label className="label">Data admissão</label>
              <input type="date" className="input" value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cargo</label>
              <input className="input" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            </div>
            <div>
              <label className="label">Setor</label>
              <input className="input" value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="btn">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">{saving ? 'Salvando…' : (editing ? 'Atualizar' : 'Cadastrar')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatCPF(c: string | null | undefined) {
  if (!c) return '—';
  const v = c.replace(/\D/g, '').padStart(11, '0');
  return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9,11)}`;
}
