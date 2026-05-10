import { Link } from 'react-router-dom';
import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { getSupabase, logAudit, type PremiosColaborador } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';
import { usePremios } from '../lib/store';

interface ParsedRow {
  full_name: string;
  cpf: string;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  data_admissao: string | null;
  salario_base: number | null;
  _error?: string;
}

export function Colaboradores() {
  const { currentCompanyId } = usePremios();
  const [list, setList] = useState<PremiosColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PremiosColaborador | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
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
          <h1 className="font-display text-4xl">Colaboradores</h1>
          <p className="text-sm text-ink-700 mt-1">{list.length} cadastrados · {list.filter((c) => c.is_active).length} ativos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn btn-ghost">↑ Importar planilha</button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">+ Novo colaborador</button>
        </div>
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

      {showImport && (
        <ImportModal
          companyId={currentCompanyId}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); load(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// Modal · importar planilha (Domínio · XLSX · CSV)
// ============================================================
function ImportModal({
  companyId, onClose, onImported,
}: { companyId: string; onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const toast = useToast();

  // Mapeamento flexível de nomes de coluna (case-insensitive)
  // Aceita os nomes típicos do Domínio + variações comuns
  const FIELD_MAP: Record<string, string[]> = {
    full_name: ['nome', 'nome completo', 'colaborador', 'funcionario', 'funcionário'],
    cpf: ['cpf', 'documento'],
    matricula: ['matricula', 'matrícula', 'registro', 'codigo', 'código'],
    cargo: ['cargo', 'funcao', 'função', 'ocupacao', 'ocupação', 'cbo'],
    setor: ['setor', 'departamento', 'centro de custo', 'cc', 'depto'],
    data_admissao: ['admissao', 'admissão', 'data admissao', 'data de admissao', 'data de admissão', 'dt admissao', 'admissao em'],
    salario_base: ['salario', 'salário', 'salario base', 'salário base', 'sal base', 'vencimento'],
  };

  function normalizeHeader(h: string): string {
    return String(h || '').toLowerCase().trim().replace(/[._-]/g, ' ').replace(/\s+/g, ' ');
  }

  function findColumn(headers: string[], aliases: string[]): number {
    const normalized = headers.map(normalizeHeader);
    for (const a of aliases) {
      const idx = normalized.indexOf(a);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function parseDate(v: unknown): string | null {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v).trim();
    if (!s) return null;
    // dd/mm/yyyy
    const m1 = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m1) {
      let [, d, m, y] = m1;
      if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Excel serial date
    const num = Number(s);
    if (!isNaN(num) && num > 25569 && num < 80000) {
      const d = new Date((num - 25569) * 86400 * 1000);
      return d.toISOString().slice(0, 10);
    }
    return null;
  }

  function parseSalario(v: unknown): number | null {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[R$\s.]/g, '').replace(',', '.');
    const n = Number(s);
    return isNaN(n) ? null : n;
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (data.length < 2) {
        toast('Planilha vazia ou sem cabeçalho', 'warn');
        setParsing(false);
        return;
      }
      const headers = (data[0] as unknown[]).map((h) => String(h));
      const colIdx = {
        full_name: findColumn(headers, FIELD_MAP.full_name),
        cpf: findColumn(headers, FIELD_MAP.cpf),
        matricula: findColumn(headers, FIELD_MAP.matricula),
        cargo: findColumn(headers, FIELD_MAP.cargo),
        setor: findColumn(headers, FIELD_MAP.setor),
        data_admissao: findColumn(headers, FIELD_MAP.data_admissao),
        salario_base: findColumn(headers, FIELD_MAP.salario_base),
      };

      if (colIdx.full_name < 0 || colIdx.cpf < 0) {
        toast('Não encontrei as colunas obrigatórias: Nome e CPF', 'danger');
        setParsing(false);
        return;
      }

      const parsed: ParsedRow[] = data.slice(1)
        .filter((r) => (r as unknown[]).some((c) => c != null && c !== ''))
        .map((r) => {
          const row = r as unknown[];
          const cpf = String(row[colIdx.cpf] || '').replace(/\D/g, '');
          const full_name = String(row[colIdx.full_name] || '').trim();
          let _error: string | undefined;
          if (!full_name) _error = 'Nome vazio';
          else if (cpf.length !== 11) _error = 'CPF inválido (precisa 11 dígitos)';
          return {
            full_name,
            cpf,
            matricula: colIdx.matricula >= 0 ? (String(row[colIdx.matricula] || '').trim() || null) : null,
            cargo: colIdx.cargo >= 0 ? (String(row[colIdx.cargo] || '').trim() || null) : null,
            setor: colIdx.setor >= 0 ? (String(row[colIdx.setor] || '').trim() || null) : null,
            data_admissao: colIdx.data_admissao >= 0 ? parseDate(row[colIdx.data_admissao]) : null,
            salario_base: colIdx.salario_base >= 0 ? parseSalario(row[colIdx.salario_base]) : null,
            _error,
          };
        });
      setRows(parsed);
    } catch (err) {
      toast('Erro ao ler planilha: ' + (err instanceof Error ? err.message : 'desconhecido'), 'danger');
    }
    setParsing(false);
  }

  async function handleImport() {
    const validRows = rows.filter((r) => !r._error);
    if (validRows.length === 0) {
      toast('Nenhuma linha válida pra importar', 'warn');
      return;
    }
    setImporting(true);
    const sb = getSupabase();
    const payload = validRows.map((r) => ({
      company_id: companyId,
      full_name: r.full_name,
      cpf: r.cpf,
      matricula: r.matricula,
      cargo: r.cargo,
      setor: r.setor,
      data_admissao: r.data_admissao,
      salario_base: r.salario_base,
      is_active: true,
    }));
    const { error } = await sb.from('premios_colaboradores').upsert(payload as never, { onConflict: 'company_id,cpf' });
    if (error) {
      toast(error.message, 'danger');
      setImporting(false);
      return;
    }
    await logAudit({ action: 'premios_colaboradores_import', resource_type: 'premios_colaboradores', meta: { count: validRows.length, file: fileName } });
    toast(`${validRows.length} colaboradores importados`, 'ok');
    onImported();
  }

  const validCount = rows.filter((r) => !r._error).length;
  const errorCount = rows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-4xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-2xl">Importar colaboradores</h3>
              <p className="text-xs text-ink-500 mt-1">Aceita planilhas do Domínio · .xlsx · .xls · .csv</p>
            </div>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900">✕</button>
          </div>

          {rows.length === 0 ? (
            <div className="space-y-4">
              <div className="bg-surface-muted rounded-2xl p-5 text-sm">
                <div className="text-[10px] uppercase tracking-wider font-bold text-ink-500 mb-2">Colunas reconhecidas (case-insensitive)</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-ink-700">
                  <div><strong>Nome</strong> · obrigatório</div>
                  <div><strong>CPF</strong> · obrigatório · 11 dígitos</div>
                  <div>Matrícula · opcional</div>
                  <div>Cargo · opcional</div>
                  <div>Setor / Centro de Custo · opcional</div>
                  <div>Admissão (dd/mm/aaaa) · opcional</div>
                  <div>Salário base · opcional</div>
                </div>
              </div>

              <label className="block border-2 border-dashed border-accent-300 rounded-3xl p-10 text-center cursor-pointer hover:bg-accent-50 transition">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
                {parsing ? (
                  <div className="flex items-center justify-center gap-3"><Spinner size={20} className="text-accent-500" /> Lendo planilha…</div>
                ) : (
                  <>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="1.5" className="mx-auto mb-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <div className="font-bold text-ink-900">Clique pra selecionar a planilha</div>
                    <div className="text-xs text-ink-500 mt-1">.xlsx · .xls · .csv até 5MB</div>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-bold">{fileName}</div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    {rows.length} linha(s) lidas · {validCount} válida(s) · {errorCount > 0 && <span className="text-danger font-semibold">{errorCount} com erro</span>}
                  </div>
                </div>
                <button onClick={() => { setRows([]); setFileName(''); }} className="text-xs font-bold text-accent-600 hover:text-accent-700">Trocar arquivo</button>
              </div>

              <div className="border border-black/10 rounded-2xl overflow-x-auto max-h-[50vh]">
                <table className="data-table">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th>Status</th><th>Nome</th><th>CPF</th><th>Matr.</th><th>Cargo</th><th>Setor</th><th>Admissão</th><th>Salário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className={r._error ? 'bg-danger/5' : ''}>
                        <td>{r._error ? <span className="text-danger text-[10px] font-bold">⚠ {r._error}</span> : <span className="text-ok text-[10px] font-bold">✓ ok</span>}</td>
                        <td className="text-xs font-semibold">{r.full_name || '—'}</td>
                        <td className="text-xs">{r.cpf || '—'}</td>
                        <td className="text-xs">{r.matricula || '—'}</td>
                        <td className="text-xs">{r.cargo || '—'}</td>
                        <td className="text-xs">{r.setor || '—'}</td>
                        <td className="text-xs">{r.data_admissao || '—'}</td>
                        <td className="text-xs">{r.salario_base ? `R$ ${r.salario_base.toLocaleString('pt-BR')}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && <div className="text-center text-xs text-ink-500 py-3 border-t">+{rows.length - 50} linha(s) não mostradas no preview · serão importadas</div>}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
                <button onClick={handleImport} disabled={importing || validCount === 0} className="btn btn-primary disabled:opacity-50">
                  {importing ? <Spinner size={16} /> : `Importar ${validCount} colaborador(es)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
