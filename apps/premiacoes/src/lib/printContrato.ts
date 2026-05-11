import type { PremiosColaborador, PremiosContrato, Company } from '@innova/supabase';

/**
 * Gera HTML imprimível do contrato de adesão Art. 457 §2 CLT.
 * Abre em nova aba e dispara window.print(); o usuário decide
 * entre imprimir ou salvar como PDF.
 */
export function printContratoAdesao(
  colab: PremiosColaborador,
  contrato: PremiosContrato | null,
  company: Company | null
) {
  const empresa = company?.trade_name || company?.legal_name || 'EMPRESA CONTRATANTE';
  const cnpj = formatCNPJ(company?.cnpj || '');
  const endereco = [company?.address, company?.city, company?.state, company?.zip].filter(Boolean).join(', ') || '—';

  const dataContrato = contrato?.contract_date
    ? new Date(contrato.contract_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ----- prêmio máximo individual desse colaborador -----
  const salarioBase = Number(colab.salario_base) || 0;
  const premioMaxPct = Number((colab as any).premio_max_percent ?? 100);
  const premioMaxValor = salarioBase * (premioMaxPct / 100);
  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Contrato de Adesão · ${escape(colab.full_name)}</title>
<style>
  @page { size: A4; margin: 22mm 20mm; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 11pt; line-height: 1.55; color: #0F0F19;
    background: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 760px; margin: 0 auto; padding: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F0F19; padding-bottom: 14px; margin-bottom: 22px; }
  .head .brand { font-family: 'Helvetica Neue', Arial, sans-serif; }
  .head .brand .name { font-size: 18pt; font-weight: 900; letter-spacing: -0.02em; color: #0F0F19; }
  .head .brand .sub { font-size: 9pt; color: #71718A; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; }
  .head .meta { text-align: right; font-size: 9pt; color: #71718A; }
  h1 { font-size: 16pt; text-align: center; margin: 8px 0 6px; letter-spacing: -0.01em; }
  h2.subtitle { font-size: 10pt; text-align: center; font-weight: normal; font-style: italic; color: #3F3F50; margin: 0 0 26px; }
  h3 { font-size: 11pt; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #0F0F19; }
  p { margin: 0 0 10px; text-align: justify; }
  .parties { background: #FAFAFC; border-radius: 6px; padding: 14px 18px; margin-bottom: 18px; font-size: 10pt; }
  .parties dl { margin: 0; }
  .parties dt { font-weight: 700; color: #3F3F50; margin-top: 8px; }
  .parties dt:first-child { margin-top: 0; }
  .parties dd { margin: 2px 0 0; }
  ol.clauses { padding-left: 22px; margin: 8px 0 16px; }
  ol.clauses > li { margin-bottom: 8px; }
  ol.clauses ol { list-style: lower-alpha; padding-left: 22px; margin: 6px 0; }
  ol.clauses ol > li { margin-bottom: 4px; }
  .sign-area { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
  .sign-line { border-top: 1px solid #0F0F19; padding-top: 6px; text-align: center; font-size: 9pt; }
  .sign-line .who { font-weight: 700; margin-bottom: 2px; }
  .foot { margin-top: 40px; padding-top: 10px; border-top: 1px solid #E5E5EC; font-size: 8pt; color: #71718A; text-align: center; }
  .stamp { display: inline-block; padding: 2px 8px; border: 1.5px solid #10B981; color: #10B981; font-weight: 700; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 3px; }
  .stamp.pending { border-color: #F59E0B; color: #F59E0B; }
  .actions { background: #F4F4F8; padding: 16px; border-radius: 8px; margin-bottom: 28px; text-align: center; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .actions button { background: #0F0F19; color: #fff; border: 0; padding: 10px 22px; border-radius: 999px; font-weight: 700; font-size: 11pt; cursor: pointer; margin: 0 4px; }
  .actions button.ghost { background: transparent; color: #0F0F19; border: 1px solid #0F0F19; }
  @media print {
    .actions { display: none !important; }
    body { background: #fff; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="actions">
    <button onclick="window.print()">Imprimir / Salvar PDF</button>
    <button class="ghost" onclick="window.close()">Fechar</button>
  </div>

  <div class="head">
    <div class="brand">
      <div class="name">${escape(empresa)}</div>
      <div class="sub">CNPJ ${cnpj}</div>
    </div>
    <div class="meta">
      Programa de premiação<br/>
      ${dataContrato}<br/>
      ${contrato?.signed ? '<span class="stamp">Assinado</span>' : '<span class="stamp pending">Pendente</span>'}
    </div>
  </div>

  <h1>CONTRATO DE ADESÃO AO PROGRAMA DE PREMIAÇÃO</h1>
  <h2 class="subtitle">Art. 457, §2º da CLT — natureza indenizatória, não integra a remuneração</h2>

  <div class="parties">
    <dl>
      <dt>EMPRESA (CONTRATANTE)</dt>
      <dd><strong>${escape(empresa)}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob nº <strong>${cnpj}</strong>, com sede em ${escape(endereco)}, doravante denominada <strong>EMPRESA</strong>.</dd>

      <dt>COLABORADOR(A) (ADERENTE)</dt>
      <dd><strong>${escape(colab.full_name)}</strong>${colab.cpf ? ', CPF nº <strong>' + formatCPF(colab.cpf) + '</strong>' : ''}${colab.matricula ? ', matrícula <strong>' + escape(colab.matricula) + '</strong>' : ''}${colab.cargo ? ', no exercício do cargo de <strong>' + escape(colab.cargo) + '</strong>' : ''}${colab.setor ? ', lotado(a) no setor de <strong>' + escape(colab.setor) + '</strong>' : ''}${colab.data_admissao ? ', admitido(a) em <strong>' + formatDate(colab.data_admissao) + '</strong>' : ''}, doravante denominado(a) <strong>COLABORADOR</strong>.</dd>
    </dl>
  </div>

  <p>As partes acima qualificadas têm entre si, justo e contratado, o presente <strong>Contrato de Adesão ao Programa de Premiação por Desempenho</strong>, instituído pela EMPRESA com fundamento no <strong>artigo 457, §2º, da Consolidação das Leis do Trabalho</strong> (redação da Lei nº 13.467/2017), o qual reger-se-á pelas cláusulas e condições a seguir.</p>

  <h3>Cláusula 1 — Objeto</h3>
  <p>O presente instrumento tem por objeto formalizar a adesão do COLABORADOR ao Programa de Premiação por Desempenho da EMPRESA, mediante o cumprimento de critérios objetivos, mensuráveis e previamente estabelecidos, sem habitualidade ou ajuste prévio quanto ao quantum, característica essencial para preservação da <strong>natureza indenizatória</strong> do prêmio (Art. 457, §2º, CLT).</p>

  <h3>Cláusula 2 — Natureza jurídica</h3>
  <ol class="clauses">
    <li>Os valores eventualmente pagos a título de prêmio em decorrência do presente Programa <strong>não integram a remuneração</strong> do COLABORADOR para nenhum efeito legal.</li>
    <li>Não incidem sobre os prêmios: contribuição previdenciária (INSS patronal e do empregado), FGTS, férias proporcionais, 13º salário, repouso semanal remunerado, nem se computam para fins de aviso prévio ou indenização rescisória, nos termos do §2º do art. 457 da CLT.</li>
    <li>O pagamento de prêmio em uma competência <strong>não gera direito adquirido</strong> ao recebimento em competências subsequentes, dependendo sempre da avaliação objetiva mensal e do desempenho liberado.</li>
  </ol>

  <h3>Cláusula 3 — Metodologia de avaliação</h3>
  <ol class="clauses">
    <li>A EMPRESA avalia mensalmente o desempenho do COLABORADOR conforme <strong>critérios objetivos publicados no regulamento interno do Programa</strong> e disponíveis no sistema <em>Innova Premiações</em>, com pesos definidos para cada critério.</li>
    <li>Cada critério é pontuado em escala de <strong>1 (insuficiente) a 5 (excelente)</strong>, calculando-se média ponderada pelo peso de cada critério.</li>
    <li>O direito ao prêmio na competência depende da média ponderada mínima de <strong>3,0 (três)</strong>; abaixo desse patamar não há pagamento de prêmio na competência.</li>
    <li>A avaliação é registrada pelo gestor imediato e arquivada eletronicamente, com trilha de auditoria de no mínimo 5 (cinco) anos, para fins de defesa em eventual fiscalização.</li>
  </ol>

  <h3>Cláusula 3.1 — Prêmio máximo individual</h3>
  <p>Fica acordado que o <strong>prêmio máximo</strong> que o COLABORADOR poderá receber em uma competência corresponde a <strong>${premioMaxPct.toFixed(0)}%</strong> (${pctExtenso(premioMaxPct)}) do seu salário base${salarioBase > 0 ? ', equivalente nesta data a <strong>' + fmtBRL(premioMaxValor) + '</strong>' : ''}. Esse percentual constitui o <em>teto individual</em> do Programa para esse COLABORADOR.</p>
  <p>O valor efetivo do prêmio na competência é calculado de forma proporcional à média ponderada obtida, conforme a seguinte escala:</p>
  <table style="width:100%; border-collapse:collapse; margin: 6px 0 10px; font-size: 10pt;">
    <thead>
      <tr style="background:#F4F4F8;">
        <th style="padding:6px 10px; text-align:left; border:1px solid #D4D4DC;">Média ponderada</th>
        <th style="padding:6px 10px; text-align:left; border:1px solid #D4D4DC;">% do teto</th>
        ${salarioBase > 0 ? '<th style="padding:6px 10px; text-align:right; border:1px solid #D4D4DC;">Valor estimado</th>' : ''}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:6px 10px; border:1px solid #D4D4DC;">5,0 (excelente)</td>
        <td style="padding:6px 10px; border:1px solid #D4D4DC;">100%</td>
        ${salarioBase > 0 ? `<td style="padding:6px 10px; border:1px solid #D4D4DC; text-align:right;">${fmtBRL(premioMaxValor)}</td>` : ''}
      </tr>
      <tr>
        <td style="padding:6px 10px; border:1px solid #D4D4DC;">4,0</td>
        <td style="padding:6px 10px; border:1px solid #D4D4DC;">80%</td>
        ${salarioBase > 0 ? `<td style="padding:6px 10px; border:1px solid #D4D4DC; text-align:right;">${fmtBRL(premioMaxValor * 0.8)}</td>` : ''}
      </tr>
      <tr>
        <td style="padding:6px 10px; border:1px solid #D4D4DC;">3,0 (mínimo)</td>
        <td style="padding:6px 10px; border:1px solid #D4D4DC;">60%</td>
        ${salarioBase > 0 ? `<td style="padding:6px 10px; border:1px solid #D4D4DC; text-align:right;">${fmtBRL(premioMaxValor * 0.6)}</td>` : ''}
      </tr>
      <tr>
        <td style="padding:6px 10px; border:1px solid #D4D4DC;">&lt; 3,0</td>
        <td style="padding:6px 10px; border:1px solid #D4D4DC;">0%</td>
        ${salarioBase > 0 ? `<td style="padding:6px 10px; border:1px solid #D4D4DC; text-align:right;">—</td>` : ''}
      </tr>
    </tbody>
  </table>
  <p style="font-size:9pt; color:#3F3F50;">Cálculo: <em>prêmio = teto individual × (média ponderada ÷ 5)</em>, zerado quando a média for inferior a 3,0. O salário base, o percentual de teto individual e a escala podem ser revistos por aditivo a este contrato, mediante comunicação ao COLABORADOR.</p>

  <h3>Cláusula 4 — Pagamento</h3>
  <ol class="clauses">
    <li>O pagamento dos prêmios, quando devidos, será efetuado em rubrica específica da folha de pagamento (rubrica <em>"Prêmio Art. 457 §2"</em>), em data definida pela EMPRESA, em geral no mês subsequente ao da competência avaliada.</li>
    <li>O valor pago será individualizado e identificado, jamais embutido em rubrica de remuneração.</li>
    <li>O eventual cancelamento, suspensão ou alteração do Programa pela EMPRESA não gera direito a indenização ou continuidade do pagamento, observado o aviso prévio razoável aos colaboradores.</li>
  </ol>

  <h3>Cláusula 5 — Adesão voluntária</h3>
  <p>A adesão do COLABORADOR ao presente Programa é <strong>voluntária e gratuita</strong>, podendo este, a qualquer tempo, manifestar por escrito sua desistência, sem prejuízo do vínculo empregatício. A não adesão ou a desistência <strong>não enseja qualquer prejuízo</strong> nas atribuições, jornada, remuneração contratada ou avaliação funcional ordinária do COLABORADOR.</p>

  <h3>Cláusula 6 — Confidencialidade e LGPD</h3>
  <p>Os dados pessoais e de desempenho do COLABORADOR coletados em razão do Programa serão tratados exclusivamente para as finalidades aqui descritas, observada a Lei nº 13.709/2018 (LGPD), com acesso restrito ao próprio COLABORADOR, ao seu gestor imediato, ao departamento de RH e à área Fiscal/Contábil da EMPRESA, e mantidos pelo prazo legal de guarda de documentos trabalhistas.</p>

  <h3>Cláusula 7 — Foro</h3>
  <p>As partes elegem o foro da comarca da sede da EMPRESA para dirimir quaisquer controvérsias oriundas do presente Contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

  <p style="margin-top: 20px;">E, por estarem assim justas e contratadas, assinam o presente em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo identificadas, para que produza seus jurídicos e legais efeitos.</p>

  <p style="text-align: right; margin-top: 22px;">${escape(company?.city || '_____________________')}, ${dataContrato}.</p>

  <div class="sign-area">
    <div class="sign-line">
      <div class="who">${escape(colab.full_name)}</div>
      <div>COLABORADOR(A) — ADERENTE</div>
      ${colab.cpf ? `<div style="font-size:8pt;color:#71718A;margin-top:2px;">CPF ${formatCPF(colab.cpf)}</div>` : ''}
    </div>
    <div class="sign-line">
      <div class="who">${escape(empresa)}</div>
      <div>EMPRESA — REPRESENTANTE LEGAL</div>
      <div style="font-size:8pt;color:#71718A;margin-top:2px;">CNPJ ${cnpj}</div>
    </div>
  </div>

  <div class="sign-area" style="margin-top: 28px;">
    <div class="sign-line">
      <div class="who">_______________________________</div>
      <div>TESTEMUNHA 1 · CPF: ____________________</div>
    </div>
    <div class="sign-line">
      <div class="who">_______________________________</div>
      <div>TESTEMUNHA 2 · CPF: ____________________</div>
    </div>
  </div>

  <div class="foot">
    Documento gerado em ${new Date().toLocaleString('pt-BR')} via <strong>Innova Premiações</strong> · trilha de auditoria preservada.<br/>
    Base legal: Art. 457, §2º CLT (Lei 13.467/2017) · LGPD (Lei 13.709/2018)
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Permita pop-ups para imprimir o contrato.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escape(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCPF(c: string | null | undefined): string {
  if (!c) return '';
  const v = c.replace(/\D/g, '').padStart(11, '0');
  return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9,11)}`;
}

function formatCNPJ(c: string): string {
  const v = c.replace(/\D/g, '').padStart(14, '0');
  return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12,14)}`;
}

function formatDate(d: string): string {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR'); }
  catch { return d; }
}

// Por extenso simples — pra valores comuns no contrato (10, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100)
function pctExtenso(pct: number): string {
  const tab: Record<number, string> = {
    10: 'dez por cento', 15: 'quinze por cento', 20: 'vinte por cento', 25: 'vinte e cinco por cento',
    30: 'trinta por cento', 40: 'quarenta por cento', 50: 'cinquenta por cento', 60: 'sessenta por cento',
    70: 'setenta por cento', 75: 'setenta e cinco por cento', 80: 'oitenta por cento',
    90: 'noventa por cento', 100: 'cem por cento',
  };
  const r = Math.round(pct);
  return tab[r] || `${r}% (${r} por cento)`;
}
