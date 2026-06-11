import { useEffect, useState } from 'react';
import { getSupabase, logAudit, type Profile, type Company, type UserCompany, type SystemKey } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';

/**
 * Modal pra gerenciar as empresas vinculadas a um usuário (multi-empresa).
 * Permite: adicionar empresa, remover empresa, marcar primária, escolher
 * sistemas (NR1, Premiações, Gestor) liberados no vínculo.
 */
interface Props {
  profile: Profile;
  onClose: () => void;
}

interface Row {
  uc: UserCompany;
  company: Company | null;
}

export function UserCompaniesModal({ profile, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const [{ data: ucs }, { data: cs }] = await Promise.all([
      sb.from('user_companies').select('*').eq('profile_id', profile.id).order('created_at'),
      sb.from('companies').select('*').eq('status', 'ativa').order('legal_name'),
    ]);
    const companies = (cs || []) as Company[];
    setAllCompanies(companies);
    setRows((ucs || []).map((uc) => ({
      uc: uc as UserCompany,
      company: companies.find((c) => c.id === (uc as UserCompany).company_id) || null,
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile.id]);

  async function addCompany() {
    if (!selectedCompanyId) return;
    if (rows.some((r) => r.uc.company_id === selectedCompanyId)) {
      toast('Empresa já vinculada', 'warn');
      return;
    }
    setSaving(true);
    const sb = getSupabase();
    const company = allCompanies.find((c) => c.id === selectedCompanyId);
    // herda system_access da empresa (ou nr1 padrão)
    const access = (company?.system_access?.length ? company.system_access : ['nr1']) as SystemKey[];
    const isPrimary = rows.length === 0; // primeira vinculação vira primária
    const { error } = await sb.from('user_companies').insert({
      profile_id: profile.id,
      company_id: selectedCompanyId,
      system_access: access,
      is_primary: isPrimary,
    } as never);
    setSaving(false);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({
      action: 'user_company_link',
      resource_type: 'profile',
      resource_id: profile.id,
      meta: { company_id: selectedCompanyId, email: profile.email },
    });
    toast('Empresa vinculada', 'ok');
    setSelectedCompanyId('');
    load();
  }

  async function removeRow(r: Row) {
    const ok = await confirm({
      title: `Remover acesso a ${r.company?.trade_name || r.company?.legal_name || 'empresa'}?`,
      description: 'O usuário perde acesso a essa empresa. Não apaga dados — só desfaz o vínculo.',
      confirmLabel: 'Sim, desvincular',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('user_companies').delete().eq('id', r.uc.id);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'user_company_unlink', resource_type: 'profile', resource_id: profile.id, meta: { company_id: r.uc.company_id } });
    toast('Vínculo removido', 'ok');
    load();
  }

  async function setPrimary(r: Row) {
    const sb = getSupabase();
    // tira primary de todos
    await sb.from('user_companies').update({ is_primary: false } as never).eq('profile_id', profile.id);
    // marca o escolhido
    const { error } = await sb.from('user_companies').update({ is_primary: true } as never).eq('id', r.uc.id);
    if (error) { toast(error.message, 'danger'); return; }
    toast('Empresa primária atualizada', 'ok');
    load();
  }

  async function toggleSystem(r: Row, sys: SystemKey) {
    const current = r.uc.system_access || [];
    const next = current.includes(sys) ? current.filter((s) => s !== sys) : [...current, sys];
    if (next.length === 0) { toast('Precisa de pelo menos 1 sistema', 'warn'); return; }
    const sb = getSupabase();
    const { error } = await sb.from('user_companies').update({ system_access: next } as never).eq('id', r.uc.id);
    if (error) { toast(error.message, 'danger'); return; }
    load();
  }

  const availableCompanies = allCompanies.filter((c) => !rows.some((r) => r.uc.company_id === c.id));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-4xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-7">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-display text-2xl">Empresas vinculadas</h3>
              <p className="text-xs text-ink-500 mt-1">{profile.full_name} · {profile.email}</p>
            </div>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900">✕</button>
          </div>

          {/* Adicionar nova empresa */}
          <div className="bg-surface-muted rounded-2xl p-4 mb-5">
            <label className="label">Vincular a uma nova empresa</label>
            <div className="flex gap-2">
              <select className="input flex-1" value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}>
                <option value="">— selecione uma empresa —</option>
                {availableCompanies.map((c) => (
                  <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                ))}
              </select>
              <button onClick={addCompany} disabled={!selectedCompanyId || saving} className="btn btn-primary disabled:opacity-50">
                {saving ? <Spinner size={14} /> : '+ Vincular'}
              </button>
            </div>
            {availableCompanies.length === 0 && rows.length > 0 && (
              <p className="text-[11px] text-ink-500 mt-2">Todas as empresas ativas já estão vinculadas a esse usuário.</p>
            )}
          </div>

          {/* Lista de vínculos atuais */}
          {loading ? (
            <div className="py-10 grid place-items-center"><Spinner size={24} className="text-accent-500" /></div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-500">
              Esse usuário ainda não está vinculado a nenhuma empresa.
              <br />
              <span className="text-[11px]">Use o seletor acima pra adicionar.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => {
                const access = r.uc.system_access || [];
                return (
                  <div key={r.uc.id} className={`border rounded-2xl p-4 ${r.uc.is_primary ? 'border-accent-500 bg-accent-50/40' : 'border-black/5'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold flex items-center gap-2">
                          {r.company?.trade_name || r.company?.legal_name || '— empresa removida —'}
                          {r.uc.is_primary && <span className="pill pill-accent text-[10px]">PRIMÁRIA</span>}
                        </div>
                        <div className="text-[11px] text-ink-500 font-mono mt-0.5">CNPJ {r.company?.cnpj || '—'}</div>

                        {/* Sistemas liberados nesse vínculo */}
                        <div className="flex gap-2 mt-3">
                          <SystemToggle label="NR1" active={access.includes('nr1')} onClick={() => toggleSystem(r, 'nr1')} />
                          <SystemToggle label="Premiações" active={access.includes('premiacoes')} onClick={() => toggleSystem(r, 'premiacoes')} />
                          <SystemToggle label="Gestor" active={access.includes('gestor')} onClick={() => toggleSystem(r, 'gestor')} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 items-end whitespace-nowrap">
                        {!r.uc.is_primary && (
                          <button onClick={() => setPrimary(r)} className="text-[11px] font-bold text-accent-600 hover:text-accent-700">
                            ★ Tornar primária
                          </button>
                        )}
                        <button onClick={() => removeRow(r)} className="text-[11px] font-bold text-danger hover:text-danger/80">
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-black/5 text-[11px] text-ink-500 leading-relaxed">
            <strong>Como funciona:</strong> a empresa <strong>primária</strong> é a que aparece logo após o login.
            O usuário pode trocar de empresa no seletor do header dentro do NR1 ou Premiações.
            Os <strong>sistemas</strong> definem o que ele enxerga em cada vínculo (ex.: pode operar NR1 numa empresa e Premiações em outra).
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={onClose} className="btn btn-primary">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-bold rounded-full px-3 py-1 transition border ${
        active
          ? 'bg-ink-900 text-white border-ink-900'
          : 'bg-white text-ink-500 border-ink-300/30 hover:border-ink-900/30'
      }`}
    >
      {active ? '✓ ' : ''}{label}
    </button>
  );
}
