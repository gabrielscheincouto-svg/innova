import { useEffect, useState } from 'react';
import { getSupabase, type PremiosColaborador, type PremiosContrato } from '@innova/supabase';
import { Spinner, useToast } from '@innova/ui';
import { usePremios } from '../lib/store';

interface Row {
  colaborador: PremiosColaborador;
  contrato: PremiosContrato | null;
}

export function Contratos() {
  const { currentCompanyId } = usePremios();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => { if (currentCompanyId) load(); else setLoading(false); }, [currentCompanyId]);

  async function load() {
    if (!currentCompanyId) return;
    setLoading(true);
    const sb = getSupabase();
    const [{ data: cs }, { data: ct }] = await Promise.all([
      sb.from('premios_colaboradores').select('*').eq('company_id', currentCompanyId).eq('is_active', true).order('full_name'),
      sb.from('premios_contratos').select('*').eq('company_id', currentCompanyId),
    ]);
    const colabs = (cs || []) as PremiosColaborador[];
    const contratos = (ct || []) as PremiosContrato[];
    setRows(colabs.map((c) => ({
      colaborador: c,
      contrato: contratos.find((x) => x.colaborador_id === c.id) || null,
    })));
    setLoading(false);
  }

  async function criarContrato(colabId: string) {
    if (!currentCompanyId) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_contratos').insert({
      company_id: currentCompanyId,
      colaborador_id: colabId,
      contract_date: new Date().toISOString().slice(0, 10),
    } as never);
    if (error) toast(error.message, 'danger');
    else { toast('Contrato criado', 'ok'); load(); }
  }

  async function marcarAssinado(contratoId: string) {
    const sb = getSupabase();
    const { error } = await sb.from('premios_contratos').update({
      signed: true,
      signed_at: new Date().toISOString(),
    }).eq('id', contratoId);
    if (error) toast(error.message, 'danger');
    else { toast('Contrato marcado como assinado', 'ok'); load(); }
  }

  if (!currentCompanyId) return <div className="card p-10 text-center"><p className="text-sm text-ink-500">Selecione uma empresa.</p></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Contratos de adesão</h1>
        <p className="text-sm text-ink-700 mt-1">Cada colaborador adere ao programa de premiação 457 §2 CLT por contrato.</p>
      </div>

      {loading ? (
        <div className="card py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
      ) : rows.length === 0 ? (
        <div className="card py-12 text-center text-sm text-ink-500">Sem colaboradores ativos.</div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th>Colaborador</th><th>CPF</th><th>Contrato</th><th>Assinado em</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.colaborador.id}>
                  <td className="font-bold">{r.colaborador.full_name}</td>
                  <td className="text-xs">{formatCPF(r.colaborador.cpf)}</td>
                  <td>
                    {r.contrato ? (
                      <span className={`pill ${r.contrato.signed ? 'pill-ok' : 'pill-warn'}`}>
                        {r.contrato.signed ? 'Assinado' : 'Pendente'}
                      </span>
                    ) : (
                      <span className="pill pill-gray">Sem contrato</span>
                    )}
                  </td>
                  <td className="text-xs">
                    {r.contrato?.signed_at ? new Date(r.contrato.signed_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td>
                    {!r.contrato ? (
                      <button onClick={() => criarContrato(r.colaborador.id)} className="text-xs font-bold text-accent-600 hover:text-accent-700">+ Criar</button>
                    ) : !r.contrato.signed ? (
                      <button onClick={() => marcarAssinado(r.contrato!.id)} className="text-xs font-bold text-ok hover:text-ok/80">✓ Marcar assinado</button>
                    ) : (
                      <span className="text-xs text-ink-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCPF(c: string) {
  const v = c.replace(/\D/g, '').padStart(11, '0');
  return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9,11)}`;
}
