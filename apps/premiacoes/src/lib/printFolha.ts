import type { Company } from '@innova/supabase';

export interface PrintFolhaInput {
  company: Company;
  competencia: string; // 'YYYY-MM-01'
  rows: Array<{
    nome: string;
    cpf: string | null;
    matricula: string | null;
    cargo: string | null;
    setor: string | null;
    data_admissao: string | null;
    data_nascimento: string | null;
    salario_base: number;
    premio_max_percent: number;
    media: number;
    premio: number;
    status: string;
  }>;
}

/**
 * Gera relatório imprimível (PDF via browser) da folha de prêmios
 * pra enviar à contabilidade.
 */
export function printFolhaRelatorio(input: PrintFolhaInput) {
  const { company, competencia, rows } = input;
  const empresa = company.trade_name || company.legal_name;
  const cnpj = fmtCNPJ(company.cnpj || '');
  const competenciaLabel = new Date(competencia + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  const dataEmissao = new Date().toLocaleString('pt-BR');

  const total = rows.reduce((acc, r) => acc + r.premio, 0);
  const pagantes = rows.filter((r) => r.premio > 0).length;
  const totalSalarios = rows.reduce((acc, r) => acc + r.salario_base, 0);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // === Aniversariantes do mês da competência ===
  const mesCompetencia = Number(competencia.slice(5, 7));
  const aniversariantes = rows
    .filter((r) => r.data_nascimento && Number(r.data_nascimento.slice(5, 7)) === mesCompetencia)
    .map((r) => ({
      nome: r.nome,
      dia: Number(r.data_nascimento!.slice(8, 10)),
      cargo: r.cargo,
    }))
    .sort((a, b) => a.dia - b.dia);

  // === Aniversário de empresa (tempo de casa) ===
  const aniversarianteEmpresa = rows
    .filter((r) => r.data_admissao && Number(r.data_admissao.slice(5, 7)) === mesCompetencia)
    .map((r) => {
      const ano = Number(r.data_admissao!.slice(0, 4));
      const compAno = Number(competencia.slice(0, 4));
      return {
        nome: r.nome,
        dia: Number(r.data_admissao!.slice(8, 10)),
        anos: compAno - ano,
        cargo: r.cargo,
      };
    })
    .filter((x) => x.anos > 0)
    .sort((a, b) => a.dia - b.dia);

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Folha de prêmios · ${esc(empresa)} · ${competenciaLabel}</title>
<style>
  @page { size: A4 landscape; margin: 14mm 12mm; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 9.5pt; line-height: 1.4; color: #0F0F19;
    background: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 1200px; margin: 0 auto; padding: 20px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F0F19; padding-bottom: 10px; margin-bottom: 14px; }
  .head .brand .name { font-size: 14pt; font-weight: 900; letter-spacing: -0.01em; color: #0F0F19; }
  .head .brand .sub { font-size: 8.5pt; color: #71718A; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; }
  .head .meta { text-align: right; font-size: 8.5pt; color: #3F3F50; }
  h1 { font-size: 16pt; margin: 0 0 4px; font-weight: 900; letter-spacing: -0.01em; }
  .badge { display: inline-block; padding: 3px 10px; background: #0F0F19; color: #fff; border-radius: 999px; font-size: 9pt; font-weight: 700; letter-spacing: 0.08em; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .summary .box { border: 1px solid #E5E5EC; border-radius: 8px; padding: 10px 14px; }
  .summary .box .label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; color: #71718A; font-weight: 700; }
  .summary .box .value { font-size: 14pt; font-weight: 900; margin-top: 3px; letter-spacing: -0.01em; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  thead { background: #0F0F19; color: #fff; }
  th { padding: 8px 8px; text-align: left; font-weight: 700; font-size: 8pt; letter-spacing: 0.04em; text-transform: uppercase; }
  td { padding: 7px 8px; border-bottom: 1px solid #E5E5EC; }
  tr:nth-child(even) td { background: #FAFAFC; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.center { text-align: center; }
  td.bold { font-weight: 700; }
  tfoot td { border-top: 2px solid #0F0F19; border-bottom: 0; padding: 10px 8px; font-weight: 900; background: #F4F4F8 !important; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .pill.aprovada { background: #E0E0FD; color: #3F40A8; }
  .pill.paga { background: #D1FAE5; color: #047857; }
  .pill.pendente { background: #F3F4F6; color: #6B7280; }
  .pill.cancelada { background: #FEE2E2; color: #B91C1C; }
  .foot { margin-top: 20px; padding-top: 10px; border-top: 1px solid #E5E5EC; font-size: 8pt; color: #71718A; }
  .actions { background: #F4F4F8; padding: 12px; border-radius: 8px; margin-bottom: 18px; text-align: center; }
  .actions button { background: #0F0F19; color: #fff; border: 0; padding: 9px 20px; border-radius: 999px; font-weight: 700; font-size: 10pt; cursor: pointer; margin: 0 4px; font-family: inherit; }
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
    <button onclick="window.print()">📄 Imprimir / Salvar PDF</button>
    <button class="ghost" onclick="window.close()">Fechar</button>
  </div>

  <div class="head">
    <div class="brand">
      <div class="name">${esc(empresa)}</div>
      <div class="sub">CNPJ ${cnpj}</div>
    </div>
    <div class="meta">
      <span class="badge">FOLHA DE PRÊMIOS</span><br/>
      ${esc(competenciaLabel)}<br/>
      Emitido: ${dataEmissao}
    </div>
  </div>

  <h1>Relatório de prêmios — competência ${esc(competenciaLabel)}</h1>
  <p style="color:#3F3F50; font-size:9pt; margin: 4px 0 0;">Programa de premiação por desempenho · Art. 457 §2 CLT · natureza indenizatória</p>

  <div class="summary">
    <div class="box">
      <div class="label">Total da folha</div>
      <div class="value">${fmt(total)}</div>
    </div>
    <div class="box">
      <div class="label">Colaboradores na folha</div>
      <div class="value">${rows.length}</div>
    </div>
    <div class="box">
      <div class="label">Recebendo prêmio</div>
      <div class="value">${pagantes}</div>
    </div>
    <div class="box">
      <div class="label">% sobre folha de salários</div>
      <div class="value">${totalSalarios > 0 ? ((total / totalSalarios) * 100).toFixed(1) + '%' : '—'}</div>
    </div>
  </div>

  ${aniversariantes.length > 0 || aniversarianteEmpresa.length > 0 ? `
  <div style="display:grid; grid-template-columns: ${aniversariantes.length > 0 && aniversarianteEmpresa.length > 0 ? '1fr 1fr' : '1fr'}; gap: 14px; margin: 14px 0 18px;">
    ${aniversariantes.length > 0 ? `
      <div style="background: linear-gradient(135deg,#FFF7E6 0%,#FFFAEC 100%); border: 1px solid #FFC600; border-radius: 10px; padding: 14px 18px;">
        <div style="font-size:8.5pt; text-transform:uppercase; letter-spacing:0.12em; color:#A86F00; font-weight:800;">🎂 Aniversariantes do mês</div>
        <div style="margin-top:8px; font-size:10pt; line-height:1.6;">
          ${aniversariantes.map((a) => `<div><strong style="display:inline-block; width:22px;">${String(a.dia).padStart(2, '0')}</strong> ${esc(a.nome)}${a.cargo ? ` <span style="color:#71718A; font-size:9pt;">· ${esc(a.cargo)}</span>` : ''}</div>`).join('')}
        </div>
      </div>` : ''}
    ${aniversarianteEmpresa.length > 0 ? `
      <div style="background: linear-gradient(135deg,#EEF2FF 0%,#F5F3FF 100%); border: 1px solid #6364E0; border-radius: 10px; padding: 14px 18px;">
        <div style="font-size:8.5pt; text-transform:uppercase; letter-spacing:0.12em; color:#3F40A8; font-weight:800;">🏢 Aniversário de empresa (tempo de casa)</div>
        <div style="margin-top:8px; font-size:10pt; line-height:1.6;">
          ${aniversarianteEmpresa.map((a) => `<div><strong style="display:inline-block; width:22px;">${String(a.dia).padStart(2, '0')}</strong> ${esc(a.nome)} <span style="color:#3F40A8; font-weight:700;">· ${a.anos} ano${a.anos > 1 ? 's' : ''}</span>${a.cargo ? ` <span style="color:#71718A; font-size:9pt;">· ${esc(a.cargo)}</span>` : ''}</div>`).join('')}
        </div>
      </div>` : ''}
  </div>` : ''}

  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th>Colaborador</th>
        <th>CPF</th>
        <th>Matrícula</th>
        <th>Cargo</th>
        <th>Setor</th>
        <th class="num">Salário base</th>
        <th class="num">% máx</th>
        <th class="num">Teto</th>
        <th class="num">Média</th>
        <th class="num">Prêmio</th>
        <th class="center">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r, i) => {
        const teto = r.salario_base * (r.premio_max_percent / 100);
        return `
        <tr>
          <td>${i + 1}</td>
          <td class="bold">${esc(r.nome)}</td>
          <td>${fmtCPF(r.cpf)}</td>
          <td>${esc(r.matricula || '—')}</td>
          <td>${esc(r.cargo || '—')}</td>
          <td>${esc(r.setor || '—')}</td>
          <td class="num">${r.salario_base > 0 ? fmt(r.salario_base) : '—'}</td>
          <td class="num">${r.premio_max_percent}%</td>
          <td class="num">${teto > 0 ? fmt(teto) : '—'}</td>
          <td class="num">${r.media > 0 ? r.media.toFixed(2) : '—'}</td>
          <td class="num bold">${fmt(r.premio)}</td>
          <td class="center"><span class="pill ${r.status}">${esc(r.status)}</span></td>
        </tr>`;
      }).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6"></td>
        <td class="num">${fmt(totalSalarios)}</td>
        <td colspan="3"></td>
        <td class="num">${fmt(total)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="foot">
    <p><strong>Para a contabilidade:</strong> os valores acima devem ser lançados em folha sob rubrica específica "Prêmio Art. 457 §2 CLT" (rubrica não-tributável). Não incide INSS, FGTS, férias, 13º nem repouso semanal sobre esses valores, observada a natureza indenizatória do programa.</p>
    <p style="margin-top:6px;">Documento gerado automaticamente pelo sistema <strong>Innova Premiações</strong> · trilha de auditoria preservada.</p>
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Permita pop-ups para abrir o relatório.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function esc(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtCPF(c: string | null | undefined): string {
  if (!c) return '—';
  const v = c.replace(/\D/g, '').padStart(11, '0');
  return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9,11)}`;
}

function fmtCNPJ(c: string): string {
  const v = c.replace(/\D/g, '').padStart(14, '0');
  return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12,14)}`;
}
