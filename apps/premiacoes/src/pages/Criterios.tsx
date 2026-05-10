import { Link } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase, type PremiosCriterio } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';
import { usePremios } from '../lib/store';

export function Criterios() {
  const { currentCompanyId } = usePremios();
  const [list, setList] = useState<PremiosCriterio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PremiosCriterio | null>(null);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { if (currentCompanyId) load(); else setLoading(false); }, [currentCompanyId]);

  async function load() {
    if (!currentCompanyId) return;
    setLoading(true);
    const sb = getSupabase();
    const { data, error } = await sb
      .from('premios_criterios')
      .select('*')
      .eq('company_id', currentCompanyId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) toast(error.message, 'danger');
    setList(data || []);
    setLoading(false);
  }

  async function handleDelete(c: PremiosCriterio) {
    const ok = await confirm({
      title: `Excluir critério "${c.name}"?`,
      description: 'Todas as avaliações lançadas com esse critério também serão removidas.',
      confirmLabel: 'Sim, excluir',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_criterios').delete().eq('id', c.id);
    if (error) toast(error.message, 'danger');
    else { toast('Critério excluído', 'ok'); load(); }
  }

  async function seedDefaults() {
    if (!currentCompanyId) return;
    const sb = getSupabase();
    const defaults = [
      { name: 'Pontualidade', description: 'Cumprimento de horário de entrada, saída e intervalos. Considera faltas e atrasos no mês.', weight: 1.5 },
      { name: 'Produtividade', description: 'Cumprimento de metas, qualidade de entrega e ritmo de trabalho dentro do esperado pra função.', weight: 2.0 },
      { name: 'Conduta', description: 'Postura profissional, respeito com colegas e clientes, alinhamento com valores da empresa.', weight: 1.5 },
      { name: 'Compromisso', description: 'Engajamento com o trabalho, iniciativa pra resolver problemas, cuidado com prazos e responsabilidades.', weight: 1.0 },
      { name: 'Iniciativa', description: 'Proatividade pra propor melhorias, ajudar colegas e ir além das atribuições básicas do cargo.', weight: 1.0 },
    ];
    const payload = defaults.map((d, i) => ({
      ...d,
      company_id: currentCompanyId,
      display_order: i,
      scale_labels: { '1': 'Insuficiente', '2': 'Abaixo do esperado', '3': 'Regular', '4': 'Bom', '5': 'Excelente' },
      is_active: true,
    }));
    const { error } = await sb.from('premios_criterios').insert(payload as never);
    if (error) toast(error.message, 'danger');
    else { toast(`${defaults.length} critérios padrão carregados`, 'ok'); load(); }
  }

  if (!currentCompanyId) {
    return (
      <div className="card py-16 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-accent-50 grid place-items-center mx-auto mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="2"><path d="M3 21h18M3 7v14M21 7v14M3 7l9-4 9 4M9 21V11M15 21V11M5 11h14M7 14h2M11 14h2M15 14h2"/></svg>
        </div>
        <h2 className="font-display text-2xl text-ink-900 mb-2">Selecione uma empresa</h2>
        <p className="text-sm text-ink-700 max-w-md mx-auto mb-6">Antes de operar, escolha em qual empresa você vai trabalhar. Toda a operação (colaboradores, avaliações, folha) é dessa empresa.</p>
        <Link to="/configuracoes" className="btn btn-primary inline-flex">Escolher empresa →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Critérios de avaliação</h1>
          <p className="text-sm text-ink-700 mt-1">Defina como os colaboradores são pontuados. Escala 1-5 com peso configurável.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">+ Novo critério</button>
      </div>

      {loading ? (
        <div className="card py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
      ) : list.length === 0 ? (
        <div className="card py-16 text-center max-w-2xl mx-auto">
          <h3 className="font-display text-2xl text-ink-900 mb-2">Comece com os padrões</h3>
          <p className="text-sm text-ink-700 max-w-md mx-auto mb-6">5 critérios típicos pra programa de premiação (Pontualidade · Produtividade · Conduta · Compromisso · Iniciativa) — você ajusta pesos e descrições depois.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={seedDefaults} className="btn btn-primary">↻ Carregar critérios padrão (5)</button>
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-ghost">+ Criar do zero</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">{c.name}</h3>
                  {c.description && <p className="text-xs text-ink-500 mt-1">{c.description}</p>}
                </div>
                <span className="pill pill-accent text-[10px]">Peso {Number(c.weight).toFixed(1)}</span>
              </div>
              <div className="border-t border-black/5 pt-3 mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500 mb-2">Escala</div>
                <div className="space-y-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className={`w-6 h-6 rounded-md grid place-items-center font-bold text-[11px] ${
                        n === 5 ? 'bg-ok/15 text-ok' :
                        n === 4 ? 'bg-accent-100 text-accent-700' :
                        n === 3 ? 'bg-warn/15 text-warn' :
                        'bg-danger/15 text-danger'
                      }`}>{n}</span>
                      <span className="text-ink-700">{c.scale_labels?.[String(n)] || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="text-xs font-bold text-accent-600 hover:text-accent-700">Editar</button>
                <button onClick={() => handleDelete(c)} className="text-xs font-bold text-danger hover:text-danger/80 ml-auto">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CriterioForm
          companyId={currentCompanyId}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
          totalExisting={list.length}
        />
      )}
    </div>
  );
}

const DEFAULT_LABELS = { '1': 'Insuficiente', '2': 'Abaixo', '3': 'Regular', '4': 'Bom', '5': 'Excelente' };

function CriterioForm({
  companyId, initial, onClose, onSaved, totalExisting,
}: { companyId: string; initial: PremiosCriterio | null; onClose: () => void; onSaved: () => void; totalExisting: number }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    weight: initial?.weight?.toString() || '1.0',
    scale_labels: (initial?.scale_labels || DEFAULT_LABELS) as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      weight: Number(form.weight),
      company_id: companyId,
      display_order: isEdit ? initial!.display_order : totalExisting,
      description: form.description || null,
    };
    const sb = getSupabase();
    let error;
    if (isEdit) ({ error } = await sb.from('premios_criterios').update(payload).eq('id', initial!.id));
    else ({ error } = await sb.from('premios_criterios').insert(payload as never));
    if (error) { toast(error.message, 'danger'); setSaving(false); return; }
    toast(isEdit ? 'Critério atualizado' : 'Critério criado', 'ok');
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-4xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-2xl">{isEdit ? 'Editar critério' : 'Novo critério'}</h3>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">Nome *</label>
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pontualidade" />
              </div>
              <div>
                <label className="label">Peso *</label>
                <input className="input" type="number" step="0.1" min="0.1" required value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Como esse critério é avaliado? Que evidências usar?" />
            </div>
            <div>
              <label className="label">Descritores da escala</label>
              <p className="text-xs text-ink-500 mb-3">Texto explicativo de cada nota. Aparece pra quem tá avaliando.</p>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-md grid place-items-center font-bold text-sm shrink-0 ${
                      n === 5 ? 'bg-ok/15 text-ok' :
                      n === 4 ? 'bg-accent-100 text-accent-700' :
                      n === 3 ? 'bg-warn/15 text-warn' :
                      'bg-danger/15 text-danger'
                    }`}>{n}</span>
                    <input
                      className="input"
                      value={form.scale_labels[String(n)] || ''}
                      onChange={(e) => setForm({ ...form, scale_labels: { ...form.scale_labels, [String(n)]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                {saving ? <Spinner size={16} /> : (isEdit ? 'Salvar' : 'Criar critério')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
