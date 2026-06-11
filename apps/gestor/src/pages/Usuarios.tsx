import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase, logAudit, type Profile, type UserRole, type Company } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';
import { UserCompaniesModal } from './UserCompaniesModal';

export function Usuarios() {
  const [list, setList] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyCounts, setCompanyCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [editing, setEditing] = useState<Profile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [managingCompanies, setManagingCompanies] = useState<Profile | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const [profilesRes, compRes, ucRes] = await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('companies').select('*').order('legal_name'),
      sb.from('user_companies').select('profile_id'),
    ]);
    setList(profilesRes.data || []);
    setCompanies(compRes.data || []);
    // contagem de empresas por profile
    const counts = new Map<string, number>();
    (ucRes.data || []).forEach((r: any) => {
      counts.set(r.profile_id, (counts.get(r.profile_id) || 0) + 1);
    });
    setCompanyCounts(counts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = list.filter((u) => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) &&
        !u.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleToggleActive(u: Profile) {
    const ok = await confirm({
      title: u.is_active ? `Desativar ${u.full_name}?` : `Reativar ${u.full_name}?`,
      description: u.is_active
        ? 'O usuário não conseguirá mais fazer login até ser reativado. Sessões abertas serão derrubadas.'
        : 'O usuário voltará a conseguir fazer login.',
      confirmLabel: u.is_active ? 'Desativar' : 'Reativar',
      variant: u.is_active ? 'danger' : 'default',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({
      action: u.is_active ? 'user_deactivate' : 'user_activate',
      resource_type: 'profile',
      resource_id: u.id,
      meta: { email: u.email },
    });
    toast(u.is_active ? 'Usuário desativado' : 'Usuário reativado', 'ok');
    load();
  }

  async function handleResetPassword(u: Profile) {
    const ok = await confirm({
      title: `Enviar reset de senha para ${u.email}?`,
      description: 'Um e-mail com link mágico será enviado. O link expira em 1 hora.',
      confirmLabel: 'Enviar',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.auth.resetPasswordForEmail(u.email);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'password_reset_sent', resource_type: 'profile', resource_id: u.id, meta: { email: u.email } });
    toast('E-mail de reset enviado', 'ok');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Usuários</h1>
          <p className="text-sm text-ink-700 mt-1">{list.length} cadastrados · {list.filter((u) => u.is_active).length} ativos</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">
          + Convidar usuário
        </button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            placeholder="Buscar por nome ou e-mail..."
            className="input max-w-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input max-w-xs" value={filterRole} onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}>
            <option value="all">Todos os perfis</option>
            <option value="gestor">Gestor</option>
            <option value="profissional">Profissional</option>
            <option value="proprietario">Proprietário</option>
            <option value="colaborador">Colaborador</option>
          </select>
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-500">Nenhum usuário encontrado.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th className="text-center">Empresas</th>
                <th>Status</th>
                <th>Último acesso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const empresasVinc = companyCounts.get(u.id) || 0;
                return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full grid place-items-center text-white font-extrabold text-xs bg-gradient-to-br ${roleGradient(u.role)}`}>
                        {initials(u.full_name)}
                      </div>
                      <div className="font-bold">{u.full_name}</div>
                    </div>
                  </td>
                  <td className="text-xs">{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td className="text-center">
                    <button
                      onClick={() => setManagingCompanies(u)}
                      className={`pill cursor-pointer ${empresasVinc === 0 ? 'pill-warn' : empresasVinc === 1 ? 'pill-gray' : 'pill-accent'}`}
                      title={empresasVinc === 0 ? 'Sem empresa vinculada · clique pra adicionar' : empresasVinc === 1 ? '1 empresa · clique pra editar' : `${empresasVinc} empresas · clique pra gerenciar`}
                    >
                      {empresasVinc === 0 ? '⚠ Sem empresa' : `${empresasVinc} ${empresasVinc === 1 ? 'empresa' : 'empresas'}`}
                    </button>
                  </td>
                  <td>{u.is_active ? <span className="pill pill-ok">Ativo</span> : <span className="pill pill-gray">Inativo</span>}</td>
                  <td className="text-xs text-ink-500">{u.last_login_at ? formatDate(u.last_login_at) : 'nunca'}</td>
                  <td>
                    <div className="flex gap-2 justify-end items-center">
                      <button onClick={() => { setEditing(u); setShowForm(true); }} className="text-xs font-bold text-accent-600 hover:text-accent-700">Editar</button>
                      <button onClick={() => handleResetPassword(u)} className="text-xs font-bold text-ink-700 hover:text-ink-900">Reset senha</button>
                      <button onClick={() => handleToggleActive(u)} className={`text-xs font-bold ${u.is_active ? 'text-danger hover:text-danger/80' : 'text-ok hover:text-ok/80'}`}>
                        {u.is_active ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <UserForm
          initial={editing}
          companies={companies}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {managingCompanies && (
        <UserCompaniesModal
          profile={managingCompanies}
          onClose={() => { setManagingCompanies(null); load(); }}
        />
      )}
    </div>
  );
}

function UserForm({ initial, companies, onClose, onSaved }: {
  initial: Profile | null;
  companies: Company[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    email: initial?.email || '',
    full_name: initial?.full_name || '',
    role: (initial?.role || 'proprietario') as UserRole,
    cpf: initial?.cpf || '',
    phone: initial?.phone || '',
    company_id: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const sb = getSupabase();

    if (isEdit) {
      // Edit existing profile (não pode mudar email aqui — só via Supabase Auth)
      const { error } = await sb.from('profiles').update({
        full_name: form.full_name,
        role: form.role,
        cpf: form.cpf.replace(/\D/g, '') || null,
        phone: form.phone || null,
      }).eq('id', initial!.id);
      if (error) { toast(error.message, 'danger'); setSaving(false); return; }
      await logAudit({ action: 'user_update', resource_type: 'profile', resource_id: initial!.id, meta: { email: initial!.email } });
      toast('Usuário atualizado', 'ok');
      onSaved();
      return;
    }

    // CRIAR novo usuário via RPC admin_invite_user (security definer no Postgres)
    // Vantagem: mantém o gestor logado, valida no backend, cria tudo numa transação
    if (!form.password || form.password.length < 8) {
      toast('Senha deve ter no mínimo 8 caracteres', 'warn');
      setSaving(false);
      return;
    }

    const { error: rpcError } = await sb.rpc('admin_invite_user', {
      p_email: form.email,
      p_password: form.password,
      p_full_name: form.full_name,
      p_role: form.role,
      p_cpf: form.cpf.replace(/\D/g, '') || null,
      p_phone: form.phone || null,
      p_company_id: form.company_id || null,
    });

    if (rpcError) {
      // Erros comuns: email já cadastrado, senha curta, não-gestor tentando criar
      toast(rpcError.message || 'Erro ao criar usuário', 'danger');
      setSaving(false);
      return;
    }

    toast('Usuário criado com sucesso', 'ok');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-4xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl">{isEdit ? 'Editar usuário' : 'Convidar usuário'}</h3>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nome completo *</label>
                <input required className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Perfil *</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  <option value="gestor">Gestor (acesso master)</option>
                  <option value="profissional">Profissional (faz laudos)</option>
                  <option value="proprietario">Proprietário (cliente)</option>
                  <option value="colaborador">Colaborador</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">E-mail {!isEdit && '*'}</label>
              <input type="email" required={!isEdit} disabled={isEdit} className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {isEdit && <p className="text-[11px] text-ink-500 mt-1">E-mail não pode ser alterado por aqui (faça pelo Supabase Auth)</p>}
            </div>
            {!isEdit && (
              <>
                <div>
                  <label className="label">Senha temporária * (8+ caracteres)</label>
                  <input type="text" required minLength={8} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Innova@2026" />
                  <p className="text-[11px] text-ink-500 mt-1">O usuário poderá trocar no primeiro login.</p>
                </div>
                <div>
                  <label className="label">Vincular a empresa (opcional)</label>
                  <select className="input" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                    <option value="">— sem vínculo —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">CPF</label>
                <input className="input" maxLength={14} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                {saving ? <Spinner size={16} /> : (isEdit ? 'Salvar alterações' : 'Criar usuário')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const cfg: Record<UserRole, { label: string; cls: string }> = {
    gestor: { label: 'Gestor', cls: 'pill-accent' },
    profissional: { label: 'Profissional', cls: 'pill-warn' },
    proprietario: { label: 'Proprietário', cls: 'pill-ok' },
    colaborador: { label: 'Colaborador', cls: 'pill-gray' },
  };
  return <span className={`pill ${cfg[role].cls}`}>{cfg[role].label}</span>;
}

function roleGradient(role: UserRole) {
  return {
    gestor: 'from-accent-300 to-accent-600',
    profissional: 'from-warn to-danger',
    proprietario: 'from-ok to-emerald-700',
    colaborador: 'from-ink-300 to-ink-500',
  }[role];
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
