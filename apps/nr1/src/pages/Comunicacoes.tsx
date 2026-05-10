import { useEffect, useState } from 'react';
import { getSupabase, logAudit, type HazardCommunication } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';

interface Row extends HazardCommunication { companies?: { trade_name: string | null; legal_name: string } }

export function Comunicacoes() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const { data } = await getSupabase().from('hazard_communications')
      .select('*, companies(trade_name, legal_name)').order('created_at', { ascending: false });
    setList((data as Row[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: HazardCommunication['status']) {
    const { error } = await getSupabase().from('hazard_communications').update({ status, ...(status === 'encerrada' ? { closed_at: new Date().toISOString() } : {}) }).eq('id', id);
    if (error) { toast(error.message, 'danger'); return; }
    await logAudit({ action: 'hazard_status_change', resource_type: 'hazard_communication', resource_id: id, meta: { status } });
    toast('Status atualizado', 'ok');
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Comunicações de Perigo</h1>
        <p className="text-sm text-ink-700 mt-1">{list.filter(l => l.status !== 'encerrada').length} abertas · {list.filter(l => l.status === 'encerrada').length} encerradas</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-500">Nenhuma comunicação recebida ainda.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Protocolo</th><th>Empresa</th><th>Setor</th><th>Comunicante</th><th>Descrição</th><th>Tipo</th><th>Status</th></tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs font-bold">{c.protocolo}</td>
                  <td className="text-xs">{c.companies?.trade_name || c.companies?.legal_name || '—'}</td>
                  <td className="text-xs">{c.setor || '—'}</td>
                  <td className="text-xs">{c.reporter_name || 'Anônimo'}</td>
                  <td className="text-xs max-w-xs truncate">{c.description}</td>
                  <td>{c.hazard_type && <span className="pill pill-accent">{c.hazard_type}</span>}</td>
                  <td>
                    <select className="text-xs px-2 py-1 rounded-full bg-surface-muted font-bold cursor-pointer" value={c.status} onChange={(e) => updateStatus(c.id, e.target.value as HazardCommunication['status'])}>
                      <option value="aberta">Aberta</option>
                      <option value="em_analise">Em análise</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="encerrada">Encerrada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
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
