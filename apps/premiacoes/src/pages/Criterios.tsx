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

  if (!currentCompanyId) {
    return <div className="card p-10 text-center"><p className="text-sm text-ink-500">Selecione uma empresa em Configurações.</p></div>;
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
        <div className="card py-12 text-center">
          <p className="text-sm text-ink-500 mb-4">Nenhum critério cadastrado.</p>
          <p className="text-xs text-ink-500">Sugestões comuns: Pontualidade · Produtividade · Conduta · Compromisso · Iniciativa</p>
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
