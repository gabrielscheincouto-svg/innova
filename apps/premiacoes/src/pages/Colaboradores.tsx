import { Link } from 'react-router-dom';
import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { getSupabase, logAudit, type PremiosColaborador } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';
import { usePremios } from '../lib/store';

interface ParsedRow {
  full_name: string;
  cpf: string | null;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  data_admissao: string | null;
  salario_base: number | null;
  data_nascimento?: string | null;
  _source?: string;
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
// Modal · importar planilha(s) · multi-formato
// Formatos suportados:
//   · Domínio flat (header + linhas)
//   · Relatório de Empregados (cargo agrupado · Código/Nome)
//   · XLSX, XLS, CSV
// ============================================================
function ImportModal({
  companyId, onClose, onImported,
}: { companyId: string; onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const toast = useToast();

  const FIELD_MAP: Record<string, string[]> = {
    full_name: ['nome', 'nome completo', 'colaborador', 'funcionario', 'funcionário', 'empregado'],
    cpf: ['cpf', 'documento'],
    matricula: ['matricula', 'matrícula', 'registro', 'codigo', 'código'],
    cargo: ['cargo', 'funcao', 'função', 'ocupacao', 'ocupação', 'cbo'],
    setor: ['setor', 'departamento', 'centro de custo', 'cc', 'depto'],
    data_admissao: ['admissao', 'admissão', 'data admissao', 'data de admissao', 'data de admissão', 'dt admissao'],
    data_nascimento: ['data nasc', 'data nascimento', 'nascimento', 'dt nasc'],
    salario_base: ['salario', 'salário', 'salario base', 'salário base', 'sal base', 'vencimento'],
  };

  function normalizeHeader(h: string): string {
    return String(h || '').toLowerCase().trim().replace(/[._-]/g, ' ').replace(/\s+/g, ' ');
  }

  function findColumn(headers: string[], aliases: string[]): number {
    const normalized = headers.map(normalizeHeader);
    for (const a of aliases) {
      const idx = normalized.findIndex((h) => h === a || h.startsWith(a));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  function parseDate(v: unknown): string | null {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v).trim();
    if (!s) return null;
    const m1 = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m1) {
      let [, d, m, y] = m1;
      if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
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

  // Tenta encontrar a linha do cabeçalho ("Código" + "Nome" em qualquer linha das primeiras 10)
  function findHeaderRow(data: unknown[][]): { headerIdx: number; cols: Record<string, number> } | null {
    for (let i = 0; i < Math.min(data.length, 15); i++) {
      const row = (data[i] as unknown[]).map((c) => String(c || ''));
      const cols = {
        full_name: findColumn(row, FIELD_MAP.full_name),
        cpf: findColumn(row, FIELD_MAP.cpf),
        matricula: findColumn(row, FIELD_MAP.matricula),
        cargo: findColumn(row, FIELD_MAP.cargo),
        setor: findColumn(row, FIELD_MAP.setor),
        data_admissao: findColumn(row, FIELD_MAP.data_admissao),
        data_nascimento: findColumn(row, FIELD_MAP.data_nascimento),
        salario_base: findColumn(row, FIELD_MAP.salario_base),
      };
      // Cabeçalho válido: tem pelo menos Nome + (Matrícula OU CPF)
      if (cols.full_name >= 0 && (cols.matricula >= 0 || cols.cpf >= 0)) {
        return { headerIdx: i, cols };
      }
    }
    return null;
  }

  function parseFile(fileName: string, data: unknown[][]): ParsedRow[] {
    const header = findHeaderRow(data);
    if (!header) {
      return [{
        full_name: '',
        cpf: null,
        matricula: null, cargo: null, setor: null,
        data_admissao: null, salario_base: null,
        _source: fileName,
        _error: 'Cabeçalho não encontrado (precisa de Nome + Matrícula/Código ou CPF)',
      }];
    }
    const { headerIdx, cols } = header;
    const result: ParsedRow[] = [];
    // Cargo intercalado · formato "Relatório de Empregados"
    let currentCargo: string | null = null;
    // Setor às vezes vem como "X - DESCRICAO" — extraímos só o nome
    const cleanLabel = (s: string) => s.replace(/^\d+\s*[-–]\s*/, '').trim();

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i] as unknown[];
      if (!row || !row.some((c) => c != null && c !== '')) continue;

      // Linha com "Cargo:" — atualiza o cargo atual
      const cargoLabelIdx = row.findIndex((c) => /cargo\s*:/i.test(String(c || '')));
      if (cargoLabelIdx >= 0) {
        // O valor do cargo geralmente vem em outra célula da mesma linha, no formato "1 - BALCONISTA"
        const cargoValue = row.find((c) => /^\s*\d+\s*[-–]\s*\w/.test(String(c || '')));
        if (cargoValue) currentCargo = cleanLabel(String(cargoValue));
        continue;
      }

      // Skip linhas de totalização
      if (row.some((c) => /total de empregad|total geral|subtotal/i.test(String(c || '')))) continue;

      // Tenta ler como linha de dados
      const nome = String(row[cols.full_name] || '').trim();
      if (!nome || nome.toLowerCase() === 'nome') continue;

      const cpfRaw = cols.cpf >= 0 ? String(row[cols.cpf] || '').replace(/\D/g, '') : '';
      const cpf = cpfRaw.length === 11 ? cpfRaw : null;
      const matriculaRaw = cols.matricula >= 0 ? String(row[cols.matricula] || '').trim() : '';
      const matricula = matriculaRaw && matriculaRaw !== 'nan' ? matriculaRaw : null;

      // Valida: precisa de pelo menos matrícula OU cpf
      let _error: string | undefined;
      if (!matricula && !cpf) {
        // Se nem matrícula nem CPF, pode ser linha de cabeçalho residual
        if (!/[a-záéíóúâêôãõç]/i.test(nome)) continue;
        _error = 'Sem matrícula nem CPF';
      }

      const cargoFromRow = cols.cargo >= 0 ? String(row[cols.cargo] || '').trim() : '';

      result.push({
        full_name: nome,
        cpf,
        matricula,
        cargo: cargoFromRow || currentCargo,
        setor: cols.setor >= 0 ? (String(row[cols.setor] || '').trim() || null) : null,
        data_admissao: cols.data_admissao >= 0 ? parseDate(row[cols.data_admissao]) : null,
        data_nascimento: cols.data_nascimento >= 0 ? parseDate(row[cols.data_nascimento]) : null,
        salario_base: cols.salario_base >= 0 ? parseSalario(row[cols.salario_base]) : null,
        _source: fileName,
        _error,
      });
    }
    return result;
  }

  // Tenta ler como HTML (alguns ERPs brasileiros exportam HTML com .xls)
  function tryParseHTML(text: string): unknown[][] | null {
    if (!/<table|<tr|<td/i.test(text)) return null;
    try {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const tables = doc.querySelectorAll('table');
      if (!tables.length) return null;
      // Pega a maior tabela
      let bigTable = tables[0];
      for (const t of tables) if (t.querySelectorAll('tr').length > bigTable.querySelectorAll('tr').length) bigTable = t;
      const rows: unknown[][] = [];
      bigTable.querySelectorAll('tr').forEach((tr) => {
        const cells: unknown[] = [];
        tr.querySelectorAll('td,th').forEach((td) => cells.push((td.textContent || '').trim()));
        rows.push(cells);
      });
      return rows;
    } catch { return null; }
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setParsing(true);
    setFileNames(files.map((f) => f.name));

    const allRows: ParsedRow[] = [];
    for (const file of files) {
      try {
        const buf = await file.arrayBuffer();
        let data: unknown[][] = [];

        // Tentativa 1 · SheetJS
        try {
          const wb = XLSX.read(buf, { type: 'array', cellDates: true, cellNF: false, raw: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          if (ws) data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
        } catch { /* segue pra tentativa 2 */ }

        // Tentativa 2 · HTML (alguns ERPs salvam HTML com nome .xls)
        if (data.length === 0) {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
          const altText = new TextDecoder('windows-1252', { fatal: false }).decode(buf);
          const html = tryParseHTML(text) || tryParseHTML(altText);
          if (html) data = html;
        }

        // Não conseguiu ler de nenhuma forma
        if (data.length === 0) {
          allRows.push({
            full_name: '', cpf: null, matricula: null, cargo: null, setor: null,
            data_admissao: null, salario_base: null,
            _source: file.name,
            _error: 'Formato XLS muito antigo. Abra no Excel/Numbers, escolha Salvar Como → .xlsx, e tente de novo.',
          });
          continue;
        }

        const parsed = parseFile(file.name, data);
        allRows.push(...parsed);
      } catch (err) {
        allRows.push({
          full_name: '', cpf: null, matricula: null, cargo: null, setor: null,
          data_admissao: null, salario_base: null,
          _source: file.name,
          _error: 'Erro lendo arquivo: ' + (err instanceof Error ? err.message : 'desconhecido'),
        });
      }
    }
    setRows(allRows);
    if (allRows.filter((r) => !r._error).length === 0) {
      toast('Nenhuma linha válida encontrada. Verifique o formato dos arquivos.', 'warn');
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
    // Determina onConflict apropriado: se tem matrícula usa, senão usa CPF
    const withMatricula = validRows.filter((r) => r.matricula);
    const withoutMatricula = validRows.filter((r) => !r.matricula);
    const errors: string[] = [];

    if (withMatricula.length > 0) {
      const payload = withMatricula.map((r) => ({
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
      const { error } = await sb.from('premios_colaboradores').upsert(payload as never, { onConflict: 'company_id,matricula' });
      if (error) errors.push(error.message);
    }
    if (withoutMatricula.length > 0) {
      const payload = withoutMatricula.map((r) => ({
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
      const { error } = await sb.from('premios_colaboradores').insert(payload as never);
      if (error) errors.push(error.message);
    }

    if (errors.length) {
      toast(errors.join(' · '), 'danger');
      setImporting(false);
      return;
    }
    await logAudit({
      action: 'premios_colaboradores_import',
      resource_type: 'premios_colaboradores',
      meta: { count: validRows.length, files: fileNames },
    });
    toast(`${validRows.length} colaboradores importados de ${fileNames.length} planilha(s)`, 'ok');
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
              <p className="text-xs text-ink-500 mt-1">Aceita várias planilhas de uma vez · .xlsx · .xls · .csv</p>
            </div>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900">✕</button>
          </div>

          {rows.length === 0 ? (
            <div className="space-y-4">
              <div className="bg-surface-muted rounded-2xl p-5 text-sm">
                <div className="text-[10px] uppercase tracking-wider font-bold text-ink-500 mb-2">Formatos reconhecidos automaticamente</div>
                <div className="space-y-2 text-ink-700">
                  <div><strong>Domínio · tabela plana</strong> com cabeçalho na primeira linha (Nome, CPF, Cargo, Setor…)</div>
                  <div><strong>Relatório de Empregados</strong> com Cargo intercalado e colunas Código + Nome (sem CPF — fica pra preencher depois)</div>
                </div>
                <div className="text-[11px] text-ink-500 mt-3 pt-3 border-t border-black/5">
                  Pelo menos <strong>Matrícula/Código</strong> ou <strong>CPF</strong> é necessário pra identificar cada colaborador.
                </div>
              </div>

              <label className="block border-2 border-dashed border-accent-300 rounded-3xl p-10 text-center cursor-pointer hover:bg-accent-50 transition">
                <input type="file" accept=".xlsx,.xls,.csv" multiple className="hidden" onChange={handleFiles} />
                {parsing ? (
                  <div className="flex items-center justify-center gap-3"><Spinner size={20} className="text-accent-500" /> Lendo planilha(s)…</div>
                ) : (
                  <>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="1.5" className="mx-auto mb-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <div className="font-bold text-ink-900">Selecionar planilha(s)</div>
                    <div className="text-xs text-ink-500 mt-1">Segure ⌘/Ctrl pra escolher várias · .xlsx · .xls · .csv</div>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-bold flex items-center gap-2 flex-wrap">
                    {fileNames.map((n) => <span key={n} className="pill pill-gray text-[10px]">{n}</span>)}
                  </div>
                  <div className="text-xs text-ink-500 mt-1.5">
                    {rows.length} linha(s) lidas · {validCount} válida(s){errorCount > 0 && <span className="text-danger font-semibold"> · {errorCount} com erro</span>}
                  </div>
                </div>
                <button onClick={() => { setRows([]); setFileNames([]); }} className="text-xs font-bold text-accent-600 hover:text-accent-700">Trocar arquivos</button>
              </div>

              <div className="border border-black/10 rounded-2xl overflow-x-auto max-h-[55vh]">
                <table className="data-table">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th>Status</th><th>Origem</th><th>Nome</th><th>Matr.</th><th>CPF</th><th>Cargo</th><th>Admissão</th><th>Salário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r, i) => (
                      <tr key={i} className={r._error ? 'bg-danger/5' : ''}>
                        <td>{r._error ? <span className="text-danger text-[10px] font-bold">⚠ {r._error}</span> : <span className="text-ok text-[10px] font-bold">✓ ok</span>}</td>
                        <td className="text-[10px] text-ink-500">{r._source || '—'}</td>
                        <td className="text-xs font-semibold">{r.full_name || '—'}</td>
                        <td className="text-xs">{r.matricula || '—'}</td>
                        <td className="text-xs">{r.cpf || <span className="text-ink-300">—</span>}</td>
                        <td className="text-xs">{r.cargo || '—'}</td>
                        <td className="text-xs">{r.data_admissao || '—'}</td>
                        <td className="text-xs">{r.salario_base ? `R$ ${r.salario_base.toLocaleString('pt-BR')}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 100 && <div className="text-center text-xs text-ink-500 py-3 border-t">+{rows.length - 100} linha(s) não mostradas · serão importadas</div>}
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
