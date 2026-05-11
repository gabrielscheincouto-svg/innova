import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSupabase, type PremiosColaborador, type PremiosContrato, type Company } from '@innova/supabase';
import { Spinner, useToast, useConfirm } from '@innova/ui';
import { usePremios } from '../lib/store';
import { printContratoAdesao } from '../lib/printContrato';

interface Row {
  colaborador: PremiosColaborador;
  contrato: PremiosContrato | null;
}

export function Contratos() {
  const { currentCompanyId } = usePremios();
  const [rows, setRows] = useState<Row[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulking, setBulking] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { if (currentCompanyId) load(); else setLoading(false); }, [currentCompanyId]);

  async function load() {
    if (!currentCompanyId) return;
    setLoading(true);
    const sb = getSupabase();
    const [{ data: cs, error: csErr }, { data: ct, error: ctErr }, { data: cp }] = await Promise.all([
      sb.from('premios_colaboradores').select('*').eq('company_id', currentCompanyId).eq('is_active', true).eq('elegivel_premio', true).order('full_name'),
      sb.from('premios_contratos').select('*').eq('company_id', currentCompanyId),
      sb.from('companies').select('*').eq('id', currentCompanyId).maybeSingle(),
    ]);
    if (csErr) toast(`Erro colaboradores: ${csErr.message}`, 'danger');
    if (ctErr) toast(`Erro contratos: ${ctErr.message}`, 'danger');
    setCompany((cp || null) as Company | null);
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
    if (error) toast(`Erro: ${error.message}`, 'danger');
    else { toast('Contrato criado', 'ok'); load(); }
  }

  async function gerarTodosContratos() {
    if (!currentCompanyId) return;
    const semContrato = rows.filter((r) => !r.contrato);
    if (semContrato.length === 0) { toast('Todos já têm contrato', 'warn'); return; }
    setBulking(true);
    const sb = getSupabase();
    const payload = semContrato.map((r) => ({
      company_id: currentCompanyId,
      colaborador_id: r.colaborador.id,
      contract_date: new Date().toISOString().slice(0, 10),
    }));
    const { error } = await sb.from('premios_contratos').insert(payload as never);
    setBulking(false);
    if (error) toast(`Erro: ${error.message}`, 'danger');
    else { toast(`${semContrato.length} contratos criados`, 'ok'); load(); }
  }

  async function marcarAssinado(contratoId: string) {
    const sb = getSupabase();
    const { error } = await sb.from('premios_contratos').update({
      signed: true,
      signed_at: new Date().toISOString(),
    } as never).eq('id', contratoId);
    if (error) toast(error.message, 'danger');
    else { toast('Contrato marcado como assinado', 'ok'); load(); }
  }

  async function desmarcarAssinado(contratoId: string) {
    const ok = await confirm({
      title: 'Desmarcar assinatura?',
      description: 'O contrato voltará para o status "Pendente". A data de assinatura será apagada.',
      confirmLabel: 'Sim, desmarcar',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_contratos').update({
      signed: false,
      signed_at: null,
    } as never).eq('id', contratoId);
    if (error) toast(error.message, 'danger');
    else { toast('Voltou para pendente', 'ok'); load(); }
  }

  async function excluirContrato(contratoId: string) {
    const ok = await confirm({
      title: 'Excluir contrato?',
      description: 'O contrato será removido. O colaborador volta para o estado "Sem contrato". Não pode ser desfeito.',
      confirmLabel: 'Sim, excluir',
      variant: 'danger',
    });
    if (!ok) return;
    const sb = getSupabase();
    const { error } = await sb.from('premios_contratos').delete().eq('id', contratoId);
    if (error) toast(error.message, 'danger');
    else { toast('Contrato excluído', 'ok'); load(); }
  }

  function imprimir(r: Row) {
    printContratoAdesao(r.colaborador, r.contrato, company);
  }

  if (!currentCompanyId) return (
      <div className="card py-16 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-accent-50 grid place-items-center mx-auto mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="2"><path d="M3 21h18M3 7v14M21 7v14M3 7l9-4 9 4M9 21V11M15 21V11M5 11h14M7 14h2M11 14h2M15 14h2"/></svg>
        </div>
        <h2 className="font-display text-2xl text-ink-900 mb-2">Selecione uma empresa</h2>
        <p className="text-sm text-ink-700 max-w-md mx-auto mb-6">Antes de operar, escolha em qual empresa você vai trabalhar. Toda a operação (colaboradores, avaliações, folha) é dessa empresa.</p>
        <Link to="/configuracoes" className="btn btn-primary inline-flex">Escolher empresa →</Link>
      </div>
    );

  const semContratoCount = rows.filter((r) => !r.contrato).length;
  const total = rows.length;
  const comContrato = total - semContratoCount;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Contratos de adesão</h1>
          <p className="text-sm text-ink-700 mt-1">Cada colaborador adere ao programa de premiação 457 §2 CLT por contrato.</p>
          {total > 0 && (
            <p className="text-xs text-ink-500 mt-2">
              <strong className="text-ok">{comContrato}</strong> com contrato · <strong className="text-warn">{semContratoCount}</strong> pendentes · {total} ativos
            </p>
          )}
        </div>
        {semContratoCount > 0 && (
          <button
            onClick={gerarTodosContratos}
            disabled={bulking}
            className="btn btn-primary inline-flex disabled:opacity-50"
          >
            {bulking ? (<><Spinner size={14} className="text-white" /> Gerando...</>) : (`+ Gerar ${semContratoCount} contratos pendentes`)}
          </button>
        )}
      </div>

      {loading ? (
        <div className="card py-20 grid place-items-center"><Spinner size={28} className="text-accent-500" /></div>
      ) : rows.length === 0 ? (
        <div className="card py-12 text-center text-sm text-ink-500">Sem colaboradores ativos.</div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr><th>Colaborador</th><th>CPF</th><th>Situação</th><th>Assinado em</th><th className="text-right">Ações</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.colaborador.id}>
                  <td className="font-bold">
                    {r.colaborador.full_name}
                    <div className="text-[10px] text-ink-500 font-normal">{r.colaborador.cargo || '—'}</div>
                  </td>
                  <td className="text-xs">{formatCPF(r.colaborador.cpf)}</td>
                  <td>
                    {r.contrato ? (
                      <span className={`pill ${r.contrato.signed ? 'pill-ok' : 'pill-warn'}`}>
                        {r.contrato.signed ? '✓ Assinado' : '⏳ Pendente'}
                      </span>
                    ) : (
                      <span className="pill pill-gray">Sem contrato</span>
                    )}
                  </td>
                  <td className="text-xs">
                    {r.contrato?.signed_at ? new Date(r.contrato.signed_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td>
                    <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                      {!r.contrato ? (
                        <button onClick={() => criarContrato(r.colaborador.id)} className="text-xs font-bold text-accent-600 hover:text-accent-700">+ Criar</button>
                      ) : (
                        <>
                          <button
                            onClick={() => imprimir(r)}
                            className="text-xs font-bold text-ink-900 hover:text-accent-700 inline-flex items-center gap-1"
                            title="Abrir contrato em nova aba para imprimir ou salvar PDF"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            Imprimir
                          </button>
                          {!r.contrato.signed ? (
                            <button onClick={() => marcarAssinado(r.contrato!.id)} className="text-xs font-bold text-ok hover:text-ok/80">✓ Marcar assinado</button>
                          ) : (
                            <button onClick={() => desmarcarAssinado(r.contrato!.id)} className="text-xs font-bold text-warn hover:text-warn/80">↺ Desmarcar</button>
                          )}
                          <button onClick={() => excluirContrato(r.contrato!.id)} className="text-xs font-bold text-danger/80 hover:text-danger" title="Excluir contrato">✕</button>
                        </>
                      )}
                    </div>
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

function formatCPF(c: string | null | undefined) {
  if (!c) return '—';
  const v = c.replace(/\D/g, '').padStart(11, '0');
  return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9,11)}`;
}
