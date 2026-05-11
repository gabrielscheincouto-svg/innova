/**
 * Manual do Cliente Premiações (dono/RH da empresa).
 */
export function Manual() {
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-accent-600 mb-2">Manual de uso</div>
        <h1 className="font-display text-4xl leading-tight">Como usar o Innova Premiações</h1>
        <p className="text-sm text-ink-700 mt-2">Programa de premiação por desempenho conforme Art. 457 §2 CLT. Pago como prêmio formalizado, economiza encargos legalmente.</p>
      </header>

      <Section number="1" title="Selecione a empresa que vai operar">
        <p>Em <strong>Configurações → Empresa atual</strong> escolha qual das suas empresas você vai trabalhar agora. Toda operação (colaboradores, avaliações, folha, contratos) é dessa empresa selecionada.</p>
        <Tip>Se você só tem uma empresa cadastrada o sistema seleciona automaticamente no login.</Tip>
      </Section>

      <Section number="2" title="Cadastre os colaboradores">
        <p>Vá em <strong>Colaboradores → + Adicionar</strong> ou clique em <strong>Importar planilha</strong>. O parser entende formato Domínio (.xlsx) e "Relatório de Empregados" (com cargos agrupados). Multi-arquivo OK.</p>
        <p>Campos essenciais: <em>Nome, CPF (opcional), Matrícula, Cargo, Setor, Data Admissão, Salário base</em>.</p>
        <Tip>Pode importar lista parcial primeiro só pra testar — depois reimportar com a planilha completa.</Tip>
      </Section>

      <Section number="3" title="Configure os critérios de avaliação">
        <p>Em <strong>Critérios</strong> você define o que vai ser avaliado: ex. <em>Pontualidade (peso 1.5), Produtividade (peso 2.0), Conduta (peso 1.5), Compromisso (peso 1.0), Iniciativa (peso 1.0)</em>. Pode renomear, ajustar pesos ou adicionar/remover critérios.</p>
        <p>Quanto maior o peso, mais o critério impacta na média ponderada do colaborador.</p>
      </Section>

      <Section number="4" title="Faça a avaliação mensal">
        <p>Em <strong>Avaliação mensal</strong> você vê uma tabela com colaboradores nas linhas e critérios nas colunas. Para cada cruzamento, clique na nota <strong>1 (vermelho) a 5 (verde)</strong>. As cores ajudam a bater o olho rápido.</p>
        <p>A média ponderada aparece na última coluna em tempo real. <strong>Não precisa preencher tudo de uma vez</strong> — salva automático a cada clique.</p>
        <Tip>Use as setas no topo pra trocar de competência (mês). Cada competência é um conjunto independente.</Tip>
      </Section>

      <Section number="5" title="Gere a folha de prêmios">
        <p>Em <strong>Folha de prêmios</strong> selecione a competência. O sistema calcula automático o valor do prêmio de cada colaborador conforme sua média ponderada e a fórmula definida.</p>
        <p>Status do fluxo: <em>Pendente → Aprovada → Paga</em>. Use os botões pra avançar. A rubrica "Prêmio Art. 457 §2" é o que sai na folha do colaborador.</p>
      </Section>

      <Section number="6" title="Contratos de adesão (obrigatório!)">
        <p>Em <strong>Contratos</strong> cada colaborador precisa de um contrato de adesão ao programa. Use o botão <strong>+ Gerar X contratos pendentes</strong> pra criar todos de uma vez.</p>
        <p>Clique em <strong>Imprimir</strong> em cada linha pra abrir o contrato pronto (papel A4, 7 cláusulas Art. 457 §2 CLT, área de assinatura). Imprima 2 vias, colha as assinaturas e arquive.</p>
        <p>Quando o colaborador assinar, clique <strong>✓ Marcar assinado</strong>. Se precisar voltar, use <strong>↺ Desmarcar</strong>.</p>
        <Tip>Sem contrato assinado, o pagamento como prêmio pode ser questionado em fiscalização e os encargos voltam com correção monetária. O contrato é a defesa.</Tip>
      </Section>

      <Section number="7" title="Calculadora de economia">
        <p>A <strong>Calculadora 457</strong> mostra quanto sua empresa economiza pagando como prêmio versus salário tradicional. Considera INSS patronal (20%), FGTS (8%), férias proporcionais e 13º. Use como ferramenta de negociação interna.</p>
      </Section>

      <div className="card bg-accent-50 border border-accent-100">
        <div className="text-xs uppercase tracking-wider font-extrabold text-accent-700 mb-1">Para defender em fiscalização</div>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>Contrato de adesão assinado por todos</li>
          <li>Critérios objetivos e mensuráveis (sem subjetividade)</li>
          <li>Avaliação mensal documentada com data e responsável</li>
          <li>Folha com rubrica específica "Prêmio Art. 457 §2"</li>
          <li>Não habitualidade — pode ter mês sem pagamento</li>
        </ul>
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
