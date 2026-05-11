/**
 * Manual do Avaliador (Profissional/Proprietário NR-1)
 * Acessível em /manual dentro do app NR1.
 */
export function Manual() {
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-accent-600 mb-2">Manual de uso</div>
        <h1 className="font-display text-4xl leading-tight">Como usar o Innova NR-1</h1>
        <p className="text-sm text-ink-700 mt-2">Guia prático pro avaliador de SST: do cadastro do cliente até a entrega do laudo PGR.</p>
      </header>

      <Section number="1" title="Cadastre o cliente (empresa)">
        <p>Vá em <strong>Clientes → + Novo cliente</strong> e cadastre a empresa contratante. Os campos importantes são <em>CNPJ, Razão Social, CNAE e Setor</em> — eles entram automaticamente no laudo PGR e nos cálculos de risco IPAR.</p>
        <Tip>Dica: peça o cartão CNPJ atualizado pro cliente. CNAE errado distorce a matriz IPAR.</Tip>
      </Section>

      <Section number="2" title="Cadastre os colaboradores da empresa">
        <p>Em <strong>Colaboradores</strong> selecione a empresa-cliente e adicione os funcionários. <strong>Nome, CPF e data de nascimento são obrigatórios</strong> — porque o link público pede CPF + nascimento pra validar que quem está respondendo é colaborador autorizado.</p>
        <p>Você pode adicionar um por um, ou pedir pra empresa exportar do sistema dela (Domínio/Senior/SAP) e mandar a planilha. O parser entende formato "Relatório de Empregados" e Domínio.</p>
        <Tip>Sem colaborador cadastrado, o link <code>/c/:token</code> rejeita o acesso — proteção contra respostas externas.</Tip>
      </Section>

      <Section number="3" title="Crie a avaliação (ciclo de coleta)">
        <p>Em <strong>Avaliações → + Nova avaliação</strong> selecione o cliente, o ciclo (ex.: "2026-1º semestre") e a data limite. O sistema gera um <strong>token único</strong> e a URL <code>/c/:token</code>.</p>
        <p>Copie o link com o botão <strong>Copiar link</strong> e envie para o RH da empresa distribuir pros colaboradores (e-mail, WhatsApp interno, mural). O colaborador responde no celular ou desktop sem precisar criar conta.</p>
      </Section>

      <Section number="4" title="Acompanhe a coleta em tempo real">
        <p>Na listagem de <strong>Avaliações</strong> aparece <code>respostas / convidados</code>. Acompanhe se está chegando na meta de 70% — abaixo disso o resultado fica enviesado. Se a coleta empacar, mande lembrete pro RH.</p>
        <p>Cada colaborador também pode <strong>comunicar perigo</strong> pelo mesmo link (rota alternativa após validar identidade). Essas comunicações entram em <strong>Comunicações</strong> com data, descrição e localização opcional.</p>
      </Section>

      <Section number="5" title="Construa a matriz IPAR">
        <p>Em <strong>IPAR</strong> liste os perigos identificados na empresa. Cada perigo recebe <strong>P (Probabilidade 1-5) × S (Severidade 1-5)</strong> = grau de risco (1-25). O sistema classifica automático em Aceitável, Tolerável, Moderado, Substancial ou Intolerável.</p>
        <Tip>Use os achados das comunicações de perigo + observações da visita de campo. Não invente. O auditor vai pedir evidência.</Tip>
      </Section>

      <Section number="6" title="Monte o Plano de Ação">
        <p>Em <strong>Plano de Ação</strong> cada perigo classificado vira uma ação corretiva: <em>o quê, quem, quando, prazo, status</em>. É a coluna vertebral da NR-1 — sem plano, o laudo cai.</p>
      </Section>

      <Section number="7" title="Gere o laudo PGR (PDF)">
        <p>Em <strong>Relatórios → Gerar PGR</strong>. O PDF sai com: identificação da empresa, metodologia, matriz IPAR completa, plano de ação, resultados COPSOQ agregados (regra dos 5), comunicações de perigo e termo de assinatura.</p>
        <p>Esse PDF é o entregável formal pro cliente — ele apresenta em fiscalização do MTE.</p>
      </Section>

      <Section number="8" title="Excluir avaliações antigas">
        <p>Em <strong>Avaliações</strong> cada linha tem botão <strong>Excluir</strong> (vermelho). Apaga a avaliação e <em>todas</em> as respostas COPSOQ + comunicações de perigo vinculadas em cascade. Use com cuidado — não tem desfazer.</p>
      </Section>

      <div className="card bg-accent-50 border border-accent-100">
        <div className="text-xs uppercase tracking-wider font-extrabold text-accent-700 mb-1">Em caso de dúvida</div>
        <p className="text-sm">Tudo registrado em <strong>trilha de auditoria</strong> (Configurações → Auditoria). Cada exclusão, geração de laudo e alteração de IPAR fica gravada com data, usuário e diff. Use isso pra defesa em fiscalização.</p>
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
