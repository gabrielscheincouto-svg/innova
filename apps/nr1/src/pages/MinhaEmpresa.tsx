import { useEffect, useState } from 'react';
import { getSupabase, type Company } from '@innova/supabase';
import { Spinner, EmptyState } from '@innova/ui';

export function MinhaEmpresa() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      // RLS retorna só as empresas que o usuário tem vínculo
      const { data } = await sb.from('companies').select('*').limit(1).maybeSingle();
      setCompany((data as Company) || null);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={32} className="text-accent-500" /></div>;

  if (!company) {
    return (
      <div className="card">
        <EmptyState
          title="Nenhuma empresa vinculada"
          description="Fale com o gestor da Innova pra solicitar vínculo a uma empresa."
        />
      </div>
    );
  }

  const fmt = (v: number | null) => v ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—';

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="font-display text-4xl">Minha empresa</h1>
        <p className="text-sm text-ink-700 mt-1">Dados cadastrais e plano contratado</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-accent-100 text-accent-700 grid place-items-center font-extrabold text-xl">
            {(company.trade_name || company.legal_name).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-2xl">{company.trade_name || company.legal_name}</h2>
            <p className="text-sm text-ink-700">{company.legal_name}</p>
            <span className={`pill ${company.status === 'ativa' ? 'pill-ok' : 'pill-warn'} mt-1.5 inline-flex`}>{company.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="CNPJ" value={formatCNPJ(company.cnpj)} />
          <Field label="Setor" value={company.sector} />
          <Field label="CNAE" value={company.cnae} />
          <Field label="Cidade" value={company.city ? `${company.city}/${company.state || '—'}` : null} />
          <Field label="Plano contratado" value={planLabel(company.plan_tier)} />
          <Field label="Mensalidade" value={fmt(company.monthly_value)} />
        </div>
      </div>

      <div className="card bg-accent-50 border border-accent-100">
        <h3 className="font-extrabold text-base">Precisa atualizar dados?</h3>
        <p className="text-sm text-ink-700 mt-1">
          Mudanças cadastrais (CNPJ, razão social, endereço, plano) são feitas pela <strong>equipe Innova</strong>.
          Entre em contato pelo chat com seu gestor de conta.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-ink-500 mb-1">{label}</div>
      <div className="font-bold">{value || '—'}</div>
    </div>
  );
}

function formatCNPJ(c: string) {
  const v = (c || '').replace(/\D/g, '').padStart(14, '0');
  return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12,14)}`;
}

function planLabel(tier: string) {
  return ({
    basica: 'Gestão Básica',
    completa: 'Gestão Completa (com Controle de Disciplina mensal)',
    farmacia: 'Pacote Farmácia',
  } as Record<string, string>)[tier] || tier;
}
