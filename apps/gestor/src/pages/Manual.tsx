/**
 * Manual do Gestor (admin master Innova)
 */
export function Manual() {
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-accent-600 mb-2">Manual de uso</div>
        <h1 className="font-display text-4xl leading-tight">Como administrar o Innova Capital</h1>
        <p className="text-sm text-ink-700 mt-2">Guia do gestor master: cadastra empresas-cliente, libera sistemas, gerencia usuários e audita o ecossistema.</p>
      </header>

      <Section number="1" title="Cadastre empresas-cliente">
        <p>Vá em <strong>Empresas → + Nova empresa</strong>. Cadastre <em>CNPJ, razão social, nome fantasia, CNAE, setor, porte, plano (básica/completa/farmácia) e valor mensal</em>. O CNPJ é único e bloqueia duplicata.</p>
        <Tip>O campo <strong>system_access</strong> define quais sistemas a empresa contratou: NR1, Premiações ou ambos. Sem isso o usuário daquela empresa não enxerga o sistema.</Tip>
      </Section>

      <Section number="2" title="Libere os sistemas por empresa">
        <p>No detalhe da empresa, marque os checkboxes <strong>NR1</strong> e/ou <strong>Premiações</strong>. Empresa só liberada pro NR1 não verá o app de Premiações no menu de login — e vice-versa.</p>
      </Section>

      <Section number="3" title="Crie usuários e atribua perfis">
        <p>Em <strong>Usuários → + Novo usuário</strong> defina <em>email, nome completo, perfil e empresa vinculada</em>. Os perfis disponíveis são:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Gestor</strong> — acesso total ao sistema Gestor (esse aqui). Só pra você e seu time interno.</li>
          <li><strong>Profissional</strong> — engenheiro/técnico de SST que opera o NR1 (cadastra clientes, faz avaliações, monta IPAR e gera laudos).</li>
          <li><strong>Proprietário</strong> — dono da empresa-cliente. Acesso read-only no NR1 (vê laudos, indicadores, comunicações da própria empresa).</li>
          <li><strong>Colaborador</strong> — não tem login; acessa o NR1 pelo link público <code>/c/:token</code>.</li>
        </ul>
        <Tip>Usuário em Premiações usa o mesmo profile mas opera o app /premios. O system_access da empresa controla o que ele vê.</Tip>
      </Section>

      <Section number="4" title="Audite tudo que acontece">
        <p>Em <strong>Auditoria</strong> tem o log completo: quem fez o quê, quando, em qual recurso, com IP e user-agent. Toda exclusão de avaliação, geração de laudo, criação de contrato 457 e mudança de IPAR fica registrada.</p>
        <p>É essa trilha que defende a operação em fiscalização do MTE e na due diligence trabalhista.</p>
      </Section>

      <Section number="5" title="Acompanhe receita e indicadores">
        <p>No <strong>Dashboard</strong> você vê: total de empresas ativas, MRR (receita mensal recorrente), churn, distribuição por plano e por sistema contratado.</p>
      </Section>

      <Section number="6" title="Cuidados de segurança">
        <ul className="list-disc pl-5 space-y-1">
          <li>Nunca compartilhe sua conta gestor — ela tem acesso transversal a todas as empresas.</li>
          <li>Suspenda empresa imediatamente em caso de inadimplência (Empresas → status: suspensa). O acesso é cortado mas o histórico fica preservado.</li>
          <li>Use <strong>Configurações → Política de senhas</strong> pra forçar troca periódica nos usuários sensíveis.</li>
        </ul>
      </Section>

      <div className="card bg-accent-50 border border-accent-100">
        <div className="text-xs uppercase tracking-wider font-extrabold text-accent-700 mb-1">Suporte</div>
        <p className="text-sm">Para escalonar problemas de RLS, deploy ou banco: tudo está no <code>/supabase</code> do repositório. As migrations são versionadas (v1 a v7) — rodar na ordem.</p>
      </div>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-accent-500 text-white grid place-items-center font-extrabold flex-shrink-0">{number}</div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl leading-tight mb-2">{title}</h2>
          <div className="text-sm text-ink-700 space-y-2 leading-relaxed">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-warn/10 border-l-4 border-warn rounded-r-xl px-4 py-3 text-xs text-ink-900 mt-2">
      <strong className="text-warn">💡 </strong>{children}
    </div>
  );
}
