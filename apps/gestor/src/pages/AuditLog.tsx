import { useEffect, useState } from 'react';
import { getSupabase, type AuditLog as AuditLogRow } from '@innova/supabase';
import { Spinner } from '@innova/ui';

export function AuditLog() {
  const [list, setList] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const { data } = await sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
      setList(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = list.filter((l) =>
    !filter ||
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.actor_email?.toLowerCase().includes(filter.toLowerCase()) ||
    l.resource_type.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Auditoria</h1>
        <p className="text-sm text-ink-700 mt-1">{list.length} eventos registrados (últimos 500)</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <input
            placeholder="Filtrar por ação, e-mail ou tipo..."
            className="input max-w-md"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span className="text-xs text-ink-500">{filtered.length} resultados</span>
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-500">Nenhum evento encontrado.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>Ação</th>
                <th>Recurso</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="text-xs text-ink-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                  <td className="text-xs">{l.actor_email || '—'}</td>
                  <td><span className="pill pill-accent">{l.action}</span></td>
                  <td className="text-xs">{l.resource_type}</td>
                  <td className="text-xs text-ink-500 max-w-md truncate">
                    {l.meta ? JSON.stringify(l.meta) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
