// ============================================================
// PDF Builder · Laudo PGR Innova /NR1
// Layout: Capa · Sumário Executivo · IPAR · Plano de Ação · Assinaturas
// ============================================================

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

// ===== Design tokens (mesmos da identidade Innova) =====
const C = {
  ink: rgb(0.06, 0.06, 0.10),         // #0F0F19
  ink700: rgb(0.25, 0.25, 0.31),      // #3F3F50
  ink500: rgb(0.44, 0.44, 0.54),      // #71718A
  ink300: rgb(0.69, 0.69, 0.75),      // #B0B0C0
  accent: rgb(0.39, 0.39, 0.88),      // #6364E0
  accent700: rgb(0.25, 0.25, 0.66),   // #3F40A8
  accent50: rgb(0.94, 0.94, 1.00),    // #EFEFFE
  warn: rgb(0.96, 0.62, 0.04),        // #F59E0B
  danger: rgb(0.94, 0.27, 0.27),      // #EF4444
  ok: rgb(0.06, 0.73, 0.51),          // #10B981
  gray100: rgb(0.96, 0.96, 0.96),     // #F4F4F4
  gray50: rgb(0.98, 0.98, 0.98),      // #FAFAFC
  white: rgb(1, 1, 1),
};

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height
const MARGIN = 50;

// ============================================================
// Tipos de dados
// ============================================================
export interface LaudoData {
  company: {
    id: string;
    legal_name: string;
    trade_name: string | null;
    cnpj: string;
    cnae?: string | null;
    sector?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  };
  assessment: {
    id: string;
    cycle: string;
    type: string;
    status: string;
    total_invited: number;
    total_responses: number;
    signed_at: string | null;
  };
  ipar: Array<{
    setor: string;
    atividade: string;
    perigo: string;
    dano: string | null;
    probabilidade: number | null;
    severidade: number | null;
    nr_aplicavel: string | null;
    controles_recomendados: string | null;
  }>;
  actions: Array<{
    risco: string;
    medida: string;
    tipo: string | null;
    prioridade: string | null;
    responsavel: string | null;
    prazo: string | null;
    status: string;
  }>;
  signedBy: {
    full_name: string;
    email: string;
    role: string;
  } | null;
  generatedAt: string;
  documentHash: string;
}

// ============================================================
// Helpers de desenho
// ============================================================
class PageBuilder {
  page: PDFPage;
  y: number;
  font: PDFFont;
  fontBold: PDFFont;
  fontItalic: PDFFont;
  pageNum: number;
  totalPages: number;

  constructor(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont }, pageNum: number, totalPages: number) {
    this.page = page;
    this.y = PAGE_H - MARGIN;
    this.font = fonts.regular;
    this.fontBold = fonts.bold;
    this.fontItalic = fonts.italic;
    this.pageNum = pageNum;
    this.totalPages = totalPages;
  }

  text(str: string, opts: {
    x?: number; y?: number; size?: number; color?: ReturnType<typeof rgb>;
    bold?: boolean; italic?: boolean;
  } = {}) {
    const x = opts.x ?? MARGIN;
    const y = opts.y ?? this.y;
    const size = opts.size ?? 11;
    const color = opts.color ?? C.ink;
    const font = opts.bold ? this.fontBold : opts.italic ? this.fontItalic : this.font;
    this.page.drawText(str, { x, y, size, color, font });
  }

  rect(x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
    this.page.drawRectangle({ x, y, width: w, height: h, color });
  }

  line(x1: number, y1: number, x2: number, y2: number, color: ReturnType<typeof rgb>, thickness = 0.5) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
  }

  drawFooter() {
    const footerY = 30;
    this.line(MARGIN, footerY + 12, PAGE_W - MARGIN, footerY + 12, C.gray100, 0.5);
    this.text('INNOVA · Conformidade NR-1', { x: MARGIN, y: footerY, size: 8, color: C.ink500 });
    const pageText = `Página ${this.pageNum} de ${this.totalPages}`;
    const pw = this.font.widthOfTextAtSize(pageText, 8);
    this.text(pageText, { x: PAGE_W - MARGIN - pw, y: footerY, size: 8, color: C.ink500 });
  }

  drawHeader(label: string) {
    const headerY = PAGE_H - 25;
    this.text(label.toUpperCase(), { x: MARGIN, y: headerY, size: 8, color: C.ink500, bold: true });
    this.line(MARGIN, headerY - 5, PAGE_W - MARGIN, headerY - 5, C.gray100, 0.5);
  }
}

// ============================================================
// Cabeçalho/logo Innova (path SVG simplificado em PDF)
// ============================================================
function drawLogo(page: PDFPage, x: number, y: number, size = 24) {
  const s = size / 44;
  // Hexágono com gradiente roxo (aproximado por cor sólida em PDF)
  const path = `M ${x + 22*s} ${y - 2*s} L ${x + 40*s} ${y - 12*s} L ${x + 40*s} ${y - 32*s} L ${x + 22*s} ${y - 42*s} L ${x + 4*s} ${y - 32*s} L ${x + 4*s} ${y - 12*s} Z`;
  page.drawSvgPath(path, { color: C.accent });
  // 3 barras ascendentes brancas
  page.drawRectangle({ x: x + 13*s, y: y - 31*s, width: 3*s, height: 9*s, color: C.white });
  page.drawRectangle({ x: x + 20.5*s, y: y - 31*s, width: 3*s, height: 13*s, color: C.white });
  page.drawRectangle({ x: x + 28*s, y: y - 31*s, width: 3*s, height: 17*s, color: C.white });
  // Ponto dourado
  page.drawCircle({ x: x + 34*s, y: y - 13*s, size: 2.5*s, color: C.warn });
}

// ============================================================
// PÁGINA 1 · CAPA
// ============================================================
function drawCover(pb: PageBuilder, data: LaudoData) {
  pb.drawHeader('Laudo · PGR · NR-1');

  // Logo + marca no topo
  drawLogo(pb.page, MARGIN, PAGE_H - 80, 32);
  pb.text('INNOVA · NR1', { x: MARGIN + 50, y: PAGE_H - 105, size: 11, bold: true });
  pb.text('Plataforma de conformidade SST', { x: MARGIN + 50, y: PAGE_H - 120, size: 8, color: C.ink500 });

  // Etiqueta
  pb.text('PROGRAMA DE GERENCIAMENTO DE RISCOS', { x: MARGIN, y: PAGE_H - 200, size: 9, color: C.accent, bold: true });

  // Título principal
  pb.text('PGR · NR-1', { x: MARGIN, y: PAGE_H - 240, size: 36, bold: true, color: C.ink });

  // Subtítulo · empresa
  pb.text(data.company.trade_name || data.company.legal_name, {
    x: MARGIN, y: PAGE_H - 280, size: 22, color: C.ink700, italic: true,
  });

  // Linha separadora
  pb.line(MARGIN, PAGE_H - 310, PAGE_W - MARGIN, PAGE_H - 310, C.accent, 1.5);

  // Bloco de dados cadastrais (2 colunas)
  const startY = PAGE_H - 360;
  const col1 = MARGIN;
  const col2 = MARGIN + 250;
  const rows: Array<[string, string]> = [
    ['CNPJ', formatCNPJ(data.company.cnpj)],
    ['Razão social', data.company.legal_name],
    ['CNAE / Setor', `${data.company.cnae || '—'} · ${data.company.sector || '—'}`],
    ['Endereço', `${data.company.address || '—'} · ${data.company.city || '—'}/${data.company.state || '—'}`],
    ['Ciclo', data.assessment.cycle],
    ['Tipo de avaliação', humanizeAssessmentType(data.assessment.type)],
    ['Respondentes', `${data.assessment.total_responses} de ${data.assessment.total_invited} (${pct(data.assessment.total_responses, data.assessment.total_invited)})`],
    ['Documento gerado em', formatDate(data.generatedAt)],
  ];
  rows.forEach((row, i) => {
    const y = startY - i * 32;
    pb.text(row[0].toUpperCase(), { x: col1, y: y + 12, size: 7, color: C.ink500, bold: true });
    pb.text(row[1], { x: col1, y, size: 11, bold: true });
    pb.line(col1, y - 8, col2 - 20, y - 8, C.gray100, 0.5);
  });

  // Bloco RT (responsável técnico)
  const rtY = 200;
  pb.line(MARGIN, rtY + 60, PAGE_W - MARGIN, rtY + 60, C.gray100, 1);
  pb.text('RESPONSÁVEL TÉCNICO', { x: MARGIN, y: rtY + 40, size: 8, color: C.ink500, bold: true });

  if (data.signedBy) {
    pb.text(data.signedBy.full_name, { x: MARGIN, y: rtY + 18, size: 13, bold: true });
    pb.text(humanizeRole(data.signedBy.role), { x: MARGIN, y: rtY + 4, size: 10, color: C.ink700 });
    pb.text(data.signedBy.email, { x: MARGIN, y: rtY - 8, size: 9, color: C.ink500 });

    // Selo de assinatura digital
    pb.rect(MARGIN, rtY - 38, 280, 22, C.ok);
    pb.text('✓ Assinatura digital · ICP-Brasil · ' + (data.assessment.signed_at ? formatDate(data.assessment.signed_at) : '—'), {
      x: MARGIN + 8, y: rtY - 32, size: 9, color: C.white, bold: true,
    });
  } else {
    pb.text('Aguardando assinatura', { x: MARGIN, y: rtY + 18, size: 13, italic: true, color: C.ink500 });
  }

  pb.drawFooter();
}

// ============================================================
// PÁGINA 2 · SUMÁRIO EXECUTIVO
// ============================================================
function drawSummary(pb: PageBuilder, data: LaudoData) {
  pb.drawHeader('Laudo · PGR · NR-1');

  pb.text('SEÇÃO 1', { x: MARGIN, y: PAGE_H - 70, size: 9, color: C.accent, bold: true });
  pb.text('Sumário executivo', { x: MARGIN, y: PAGE_H - 100, size: 22, bold: true });

  const lines = wrapText(
    `O presente Programa de Gerenciamento de Riscos (PGR) foi elaborado em atendimento à Norma Regulamentadora nº 1 (NR-1), atualizada pela Portaria MTE nº 1.419/2024, que incluiu fatores de risco psicossociais no Gerenciamento de Riscos Ocupacionais (GRO).`,
    pb.font, 10, PAGE_W - 2 * MARGIN
  );
  let y = PAGE_H - 140;
  lines.forEach((l) => { pb.text(l, { x: MARGIN, y, size: 10, color: C.ink700 }); y -= 14; });

  // Indicadores principais (tabela)
  y -= 20;
  pb.text('INDICADORES PRINCIPAIS', { x: MARGIN, y, size: 9, color: C.accent, bold: true });
  y -= 25;

  const total = data.ipar.length;
  const niveis = data.ipar.map((i) => (i.probabilidade || 0) * (i.severidade || 0));
  const criticos = niveis.filter((n) => n >= 20).length;
  const altos = niveis.filter((n) => n >= 15 && n < 20).length;
  const medios = niveis.filter((n) => n >= 8 && n < 15).length;
  const baixos = niveis.filter((n) => n < 8).length;
  const acoesAbertas = data.actions.filter((a) => a.status !== 'concluida').length;
  const acoesConcl = data.actions.filter((a) => a.status === 'concluida').length;

  const tableRows: Array<[string, string]> = [
    ['Total de colaboradores avaliados', `${data.assessment.total_responses} de ${data.assessment.total_invited} (${pct(data.assessment.total_responses, data.assessment.total_invited)})`],
    ['Perigos identificados (IPAR)', total.toString()],
    ['Riscos críticos (NR ≥ 20)', criticos.toString()],
    ['Riscos altos (NR 15-19)', altos.toString()],
    ['Riscos médios (NR 8-14)', medios.toString()],
    ['Riscos baixos / triviais', baixos.toString()],
    ['Ações no plano (total)', data.actions.length.toString()],
    ['Ações em aberto / concluídas', `${acoesAbertas} / ${acoesConcl}`],
  ];

  tableRows.forEach((row, i) => {
    const rowY = y - i * 22;
    if (i % 2 === 1) pb.rect(MARGIN, rowY - 6, PAGE_W - 2 * MARGIN, 22, C.gray50);
    pb.text(row[0], { x: MARGIN + 10, y: rowY, size: 10, color: C.ink700 });
    const valW = pb.fontBold.widthOfTextAtSize(row[1], 10);
    pb.text(row[1], { x: PAGE_W - MARGIN - 10 - valW, y: rowY, size: 10, bold: true });
  });

  y -= tableRows.length * 22 + 30;

  // Recomendações prioritárias
  pb.text('RECOMENDAÇÕES PRIORITÁRIAS', { x: MARGIN, y, size: 9, color: C.accent, bold: true });
  y -= 22;

  const topRisks = data.ipar
    .map((i, idx) => ({ ...i, idx, nr: (i.probabilidade || 0) * (i.severidade || 0) }))
    .sort((a, b) => b.nr - a.nr)
    .slice(0, 5);

  topRisks.forEach((r, i) => {
    pb.text(`${i + 1}.`, { x: MARGIN, y, size: 10, bold: true, color: C.accent });
    const text = `${r.perigo} · ${r.setor} · NR=${r.nr} (${classify(r.nr)})`;
    pb.text(text, { x: MARGIN + 18, y, size: 10 });
    y -= 18;
  });

  pb.drawFooter();
}

// ============================================================
// PÁGINA 3 · IPAR (tabela)
// ============================================================
function drawIPAR(pb: PageBuilder, data: LaudoData) {
  pb.drawHeader('Laudo · PGR · NR-1');

  pb.text('SEÇÃO 2', { x: MARGIN, y: PAGE_H - 70, size: 9, color: C.accent, bold: true });
  pb.text('Inventário de Riscos · IPAR', { x: MARGIN, y: PAGE_H - 100, size: 22, bold: true });

  const intro = wrapText(
    'Identificação de Perigos e Avaliação de Riscos consolidada a partir do diagnóstico, das comunicações de perigo recebidas e da inspeção técnica do responsável.',
    pb.font, 9, PAGE_W - 2 * MARGIN
  );
  let y = PAGE_H - 130;
  intro.forEach((l) => { pb.text(l, { x: MARGIN, y, size: 9, color: C.ink700 }); y -= 12; });

  y -= 15;

  // Header da tabela
  const cols = [
    { x: MARGIN, w: 80, label: 'Setor' },
    { x: MARGIN + 80, w: 200, label: 'Perigo' },
    { x: MARGIN + 280, w: 25, label: 'P' },
    { x: MARGIN + 305, w: 25, label: 'S' },
    { x: MARGIN + 330, w: 30, label: 'NR' },
    { x: MARGIN + 360, w: 60, label: 'Classif.' },
    { x: MARGIN + 420, w: 75, label: 'NR aplicável' },
  ];

  pb.rect(MARGIN, y - 12, PAGE_W - 2 * MARGIN, 18, C.ink);
  cols.forEach((c) => pb.text(c.label, { x: c.x + 4, y: y - 6, size: 8, color: C.white, bold: true }));
  y -= 25;

  data.ipar.slice(0, 15).forEach((item, i) => {
    if (i % 2 === 1) pb.rect(MARGIN, y - 8, PAGE_W - 2 * MARGIN, 22, C.gray50);
    const nr = (item.probabilidade || 0) * (item.severidade || 0);
    const cls = classify(nr);
    const clsColor = nr >= 20 ? C.danger : nr >= 15 ? C.warn : nr >= 8 ? C.warn : nr >= 4 ? C.ok : C.ink300;

    pb.text(truncate(item.setor, 14), { x: cols[0].x + 4, y, size: 8 });
    pb.text(truncate(item.perigo, 36), { x: cols[1].x + 4, y, size: 8, bold: true });
    if (item.dano) pb.text(truncate(item.dano, 36), { x: cols[1].x + 4, y: y - 9, size: 7, color: C.ink500 });
    pb.text(String(item.probabilidade ?? '—'), { x: cols[2].x + 8, y, size: 9, bold: true });
    pb.text(String(item.severidade ?? '—'), { x: cols[3].x + 8, y, size: 9, bold: true });
    pb.text(String(nr || '—'), { x: cols[4].x + 8, y, size: 9, bold: true });
    pb.text(cls, { x: cols[5].x + 4, y, size: 8, color: clsColor, bold: true });
    pb.text(truncate(item.nr_aplicavel || '—', 14), { x: cols[6].x + 4, y, size: 8 });

    y -= 22;
    if (y < 100) return;
  });

  if (data.ipar.length > 15) {
    pb.text(`... e mais ${data.ipar.length - 15} itens · ver íntegra na plataforma`, {
      x: MARGIN, y: y - 5, size: 8, italic: true, color: C.ink500,
    });
  }

  pb.drawFooter();
}

// ============================================================
// PÁGINA 4 · PLANO DE AÇÃO
// ============================================================
function drawActionPlan(pb: PageBuilder, data: LaudoData) {
  pb.drawHeader('Laudo · PGR · NR-1');

  pb.text('SEÇÃO 3', { x: MARGIN, y: PAGE_H - 70, size: 9, color: C.accent, bold: true });
  pb.text('Plano de Ação', { x: MARGIN, y: PAGE_H - 100, size: 22, bold: true });

  const intro = wrapText(
    'O Plano de Ação articula medidas de prevenção, controle e monitoramento para cada risco identificado. Cada ação tem responsável, prazo e indicadores de eficácia.',
    pb.font, 9, PAGE_W - 2 * MARGIN
  );
  let y = PAGE_H - 130;
  intro.forEach((l) => { pb.text(l, { x: MARGIN, y, size: 9, color: C.ink700 }); y -= 12; });

  y -= 15;

  const cols = [
    { x: MARGIN, w: 130, label: 'Risco' },
    { x: MARGIN + 130, w: 180, label: 'Medida' },
    { x: MARGIN + 310, w: 60, label: 'Tipo' },
    { x: MARGIN + 370, w: 50, label: 'Prior.' },
    { x: MARGIN + 420, w: 75, label: 'Status' },
  ];

  pb.rect(MARGIN, y - 12, PAGE_W - 2 * MARGIN, 18, C.ink);
  cols.forEach((c) => pb.text(c.label, { x: c.x + 4, y: y - 6, size: 8, color: C.white, bold: true }));
  y -= 25;

  data.actions.slice(0, 12).forEach((item, i) => {
    if (i % 2 === 1) pb.rect(MARGIN, y - 8, PAGE_W - 2 * MARGIN, 22, C.gray50);
    const prio = item.prioridade || '—';
    const prioColor = prio === 'alta' ? C.danger : prio === 'media' ? C.warn : C.ok;

    pb.text(truncate(item.risco, 22), { x: cols[0].x + 4, y, size: 8, bold: true });
    pb.text(truncate(item.medida, 32), { x: cols[1].x + 4, y, size: 8 });
    pb.text(truncate(item.tipo || '—', 10), { x: cols[2].x + 4, y, size: 8 });
    pb.text(prio, { x: cols[3].x + 4, y, size: 8, color: prioColor, bold: true });
    pb.text(humanizeStatus(item.status), { x: cols[4].x + 4, y, size: 8 });

    if (item.responsavel || item.prazo) {
      pb.text(`${item.responsavel || ''} ${item.prazo ? '· ' + item.prazo : ''}`, {
        x: cols[0].x + 4, y: y - 9, size: 7, color: C.ink500,
      });
    }
    y -= 22;
    if (y < 100) return;
  });

  pb.drawFooter();
}

// ============================================================
// PÁGINA · TERMO DE APROVAÇÃO (assinatura ÚNICA do representante legal)
// Reduz fricção: empresa assina uma vez, cobre o laudo todo,
// não exige assinatura individual de cada funcionário.
// ============================================================
function drawSignatures(pb: PageBuilder, data: LaudoData) {
  pb.drawHeader('Laudo · PGR · NR-1');

  pb.text('SEÇÃO FINAL', { x: MARGIN, y: PAGE_H - 70, size: 9, color: C.accent, bold: true });
  pb.text('Termo de aprovação · assinatura única', { x: MARGIN, y: PAGE_H - 100, size: 22, bold: true });

  const intro = wrapText(
    `A empresa abaixo qualificada, por meio de seu representante legal, declara que o presente Programa de Gerenciamento de Riscos (PGR) foi elaborado conforme NR-1 (Portaria MTE 1.419/2024), revisado pelo Responsável Técnico e arquivado eletronicamente em conformidade com a LGPD. A assinatura digital deste termo pelo representante legal cobre integralmente o conteúdo do laudo, dispensando assinatura individual dos colaboradores.`,
    pb.font, 10, PAGE_W - 2 * MARGIN
  );
  let y = PAGE_H - 140;
  intro.forEach((l) => { pb.text(l, { x: MARGIN, y, size: 10, color: C.ink700 }); y -= 14; });

  y -= 30;

  // === Bloco da empresa contratante ===
  pb.text('EMPRESA CONTRATANTE', { x: MARGIN, y, size: 8, color: C.accent, bold: true });
  y -= 16;
  pb.rect(MARGIN, y - 90, PAGE_W - 2 * MARGIN, 100, C.gray50);
  pb.text(data.company.trade_name || data.company.legal_name, { x: MARGIN + 12, y: y - 10, size: 14, bold: true });
  pb.text('Razão social: ' + data.company.legal_name, { x: MARGIN + 12, y: y - 28, size: 9, color: C.ink700 });
  pb.text('CNPJ: ' + formatCNPJ(data.company.cnpj), { x: MARGIN + 12, y: y - 42, size: 9, color: C.ink700 });
  if (data.company.cnae) pb.text('CNAE: ' + data.company.cnae, { x: MARGIN + 12, y: y - 56, size: 9, color: C.ink700 });
  if (data.company.address || data.company.city) {
    const endereco = [data.company.address, data.company.city, data.company.state].filter(Boolean).join(', ');
    pb.text('Endereço: ' + endereco, { x: MARGIN + 12, y: y - 70, size: 9, color: C.ink700 });
  }

  y -= 110;

  // === Bloco do RT (referência, já assinou eletronicamente) ===
  if (data.signedBy) {
    pb.text('ELABORADO POR · RESPONSÁVEL TÉCNICO', { x: MARGIN, y, size: 8, color: C.ink500, bold: true });
    y -= 14;
    pb.text(data.signedBy.full_name, { x: MARGIN, y, size: 11, bold: true });
    pb.text(humanizeRole(data.signedBy.role), { x: MARGIN, y: y - 13, size: 9, color: C.ink700 });
    pb.text('Aprovado eletronicamente no sistema · timestamp registrado em audit log', { x: MARGIN, y: y - 26, size: 8, color: C.ink500, italic: true });
    y -= 50;
  }

  // === Área de assinatura digital do representante legal ===
  pb.text('ASSINATURA DO REPRESENTANTE LEGAL DA EMPRESA', { x: MARGIN, y, size: 8, color: C.accent, bold: true });
  y -= 14;

  // Caixa visual de assinatura (placeholder pra carimbo digital do gov.br)
  pb.rect(MARGIN, y - 100, PAGE_W - 2 * MARGIN, 110, C.white);
  pb.line(MARGIN, y - 100, PAGE_W - MARGIN, y - 100, C.ink300, 0.8);
  pb.line(MARGIN, y + 10, PAGE_W - MARGIN, y + 10, C.ink300, 0.8);
  pb.line(MARGIN, y - 100, MARGIN, y + 10, C.ink300, 0.8);
  pb.line(PAGE_W - MARGIN, y - 100, PAGE_W - MARGIN, y + 10, C.ink300, 0.8);

  pb.text('[ Espaço reservado para a assinatura digital gov.br / ICP-Brasil ]', { x: MARGIN + 12, y: y - 14, size: 9, color: C.ink300, italic: true });
  pb.text('Nome do(a) representante legal: ____________________________________', { x: MARGIN + 12, y: y - 40, size: 9, color: C.ink700 });
  pb.text('CPF: ___.___.___-__         Cargo: ________________________________', { x: MARGIN + 12, y: y - 58, size: 9, color: C.ink700 });
  pb.text('Local e data: ________________________________________________________', { x: MARGIN + 12, y: y - 76, size: 9, color: C.ink700 });

  y -= 130;

  // Hash forense compacto no rodapé (apenas o hash; instruções na próxima página)
  pb.line(MARGIN, y, PAGE_W - MARGIN, y, C.accent, 0.5);
  y -= 14;
  pb.text(`SHA-256 deste laudo: ${data.documentHash}`, { x: MARGIN, y, size: 7, color: C.ink500 });
  y -= 10;
  pb.text(`Gerado em: ${data.generatedAt} · assessment_id=${data.assessment.id}`, { x: MARGIN, y, size: 7, color: C.ink500 });

  pb.drawFooter();
}

// ============================================================
// PÁGINA · INSTRUÇÕES DE ASSINATURA gov.br
// ============================================================
function drawSigningInstructions(pb: PageBuilder, data: LaudoData) {
  pb.drawHeader('Laudo · PGR · NR-1');

  pb.text('INSTRUÇÕES', { x: MARGIN, y: PAGE_H - 70, size: 9, color: C.accent, bold: true });
  pb.text('Como assinar este laudo via gov.br', { x: MARGIN, y: PAGE_H - 100, size: 22, bold: true });

  const intro = wrapText(
    'O representante legal da empresa deve assinar digitalmente este PDF usando o Assinador gov.br (gratuito, validade jurídica equiparada à assinatura manuscrita pela Lei 14.063/2020 e MP 2.200-2/2001). Basta uma assinatura — não é necessário assinar página a página nem coletar assinatura de cada colaborador.',
    pb.font, 10, PAGE_W - 2 * MARGIN
  );
  let y = PAGE_H - 140;
  intro.forEach((l) => { pb.text(l, { x: MARGIN, y, size: 10, color: C.ink700 }); y -= 14; });

  y -= 20;

  // Box destaque com URL principal
  pb.rect(MARGIN, y - 80, PAGE_W - 2 * MARGIN, 90, C.accent50);
  pb.text('▸ ASSINADOR gov.br', { x: MARGIN + 12, y: y - 14, size: 10, color: C.accent700, bold: true });
  pb.text('https://assinador.iti.gov.br', { x: MARGIN + 12, y: y - 32, size: 14, color: C.accent700, bold: true });
  pb.text('Acesso com conta gov.br nível PRATA ou OURO · gratuito · validade jurídica plena', { x: MARGIN + 12, y: y - 50, size: 8, color: C.ink700 });
  pb.text('Sua conta gov.br pode ser elevada de bronze pra prata em prefeituras, INSS ou pelo app', { x: MARGIN + 12, y: y - 64, size: 8, color: C.ink500 });

  y -= 110;

  // Passo a passo
  pb.text('PASSO A PASSO', { x: MARGIN, y, size: 8, color: C.accent, bold: true });
  y -= 18;

  const steps = [
    '1. Baixe este PDF no seu computador.',
    '2. Acesse https://assinador.iti.gov.br e faça login com sua conta gov.br do representante legal.',
    '3. Clique em "Escolher arquivo" e selecione este PDF.',
    '4. Posicione o carimbo de assinatura na "Área de assinatura digital" desta seção (página anterior).',
    '5. Clique em "Assinar" — o gov.br vai pedir confirmação no app (autenticação de 2 fatores).',
    '6. Baixe o PDF assinado e arquive uma cópia. Pode também devolver pro Innova pra que fique anexado ao registro.',
  ];
  steps.forEach((s) => {
    const lines = wrapText(s, pb.font, 10, PAGE_W - 2 * MARGIN - 20);
    lines.forEach((l, i) => {
      pb.text(l, { x: MARGIN + (i === 0 ? 0 : 18), y, size: 10, color: C.ink });
      y -= 14;
    });
    y -= 4;
  });

  y -= 10;

  // Alternativas
  pb.text('ALTERNATIVAS ACEITAS', { x: MARGIN, y, size: 8, color: C.ink500, bold: true });
  y -= 14;
  const alts = [
    '• Certificado ICP-Brasil A1 ou A3 (e-CPF do representante legal) — via Adobe Acrobat ou software do certificador.',
    '• Assinatura por carimbo gov.br via Conecta gov.br (https://conecta.gov.br) para empresas.',
    '• Em última instância, impressão física + assinatura manuscrita + arquivamento em pasta — perde a validade digital, mas atende fiscalização presencial.',
  ];
  alts.forEach((a) => {
    const lines = wrapText(a, pb.font, 9, PAGE_W - 2 * MARGIN - 12);
    lines.forEach((l, i) => {
      pb.text(l, { x: MARGIN + (i === 0 ? 0 : 12), y, size: 9, color: C.ink700 });
      y -= 12;
    });
    y -= 2;
  });

  y -= 14;

  // Hash + verificação
  pb.line(MARGIN, y, PAGE_W - MARGIN, y, C.accent, 0.5);
  y -= 16;
  pb.text('PROVA DE INTEGRIDADE', { x: MARGIN, y, size: 8, color: C.accent, bold: true });
  y -= 14;
  pb.rect(MARGIN, y - 70, PAGE_W - 2 * MARGIN, 80, C.gray50);
  pb.text(`Hash SHA-256: ${data.documentHash}`, { x: MARGIN + 8, y: y - 10, size: 8, color: C.ink700 });
  pb.text(`Timestamp: ${data.generatedAt}`, { x: MARGIN + 8, y: y - 24, size: 8, color: C.ink700 });
  pb.text(`Documento: assessment_id=${data.assessment.id}`, { x: MARGIN + 8, y: y - 38, size: 8, color: C.ink700 });
  pb.text(`Empresa: CNPJ ${formatCNPJ(data.company.cnpj)}`, { x: MARGIN + 8, y: y - 52, size: 8, color: C.ink700 });
  pb.text('Storage WORM · AES-256 · retenção 20 anos · imutável · auditável', { x: MARGIN + 8, y: y - 66, size: 8, color: C.ink500, italic: true });

  pb.drawFooter();
}

// ============================================================
// MAIN · monta o PDF inteiro
// ============================================================
export async function buildLaudoPDF(data: LaudoData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fonts = { regular, bold, italic };

  const totalPages = 6; // +1 pela página de instruções de assinatura

  const page1 = doc.addPage([PAGE_W, PAGE_H]);
  drawCover(new PageBuilder(page1, fonts, 1, totalPages), data);

  const page2 = doc.addPage([PAGE_W, PAGE_H]);
  drawSummary(new PageBuilder(page2, fonts, 2, totalPages), data);

  const page3 = doc.addPage([PAGE_W, PAGE_H]);
  drawIPAR(new PageBuilder(page3, fonts, 3, totalPages), data);

  const page4 = doc.addPage([PAGE_W, PAGE_H]);
  drawActionPlan(new PageBuilder(page4, fonts, 4, totalPages), data);

  const page5 = doc.addPage([PAGE_W, PAGE_H]);
  drawSignatures(new PageBuilder(page5, fonts, 5, totalPages), data);

  // Página final · instruções pro representante legal assinar via gov.br
  const page6 = doc.addPage([PAGE_W, PAGE_H]);
  drawSigningInstructions(new PageBuilder(page6, fonts, 6, totalPages), data);

  // Metadados PDF pra compatibilidade com assinatura PAdES (assinador.iti.gov.br)
  doc.setTitle(`Laudo PGR · NR-1 · ${data.company.trade_name || data.company.legal_name} · ${data.assessment.cycle}`);
  doc.setAuthor('Innova · Conformidade NR-1');
  doc.setSubject(`Programa de Gerenciamento de Riscos · ${data.company.legal_name} · CNPJ ${data.company.cnpj}`);
  doc.setProducer('Innova /NR1 Edge Function · pdf-lib');
  doc.setCreator('Innova /NR1');
  doc.setKeywords([
    'NR-1', 'PGR', 'SST', 'eSocial', 'S-2240',
    `cnpj:${data.company.cnpj}`,
    `assessment:${data.assessment.id}`,
    `hash:${data.documentHash}`,
    'assinatura-gov.br-PAdES',
  ]);
  // Datas precisas pra trilha forense
  const now = new Date();
  doc.setCreationDate(now);
  doc.setModificationDate(now);

  return await doc.save();
}

// ============================================================
// Helpers
// ============================================================
function formatCNPJ(c: string) {
  const v = (c || '').replace(/\D/g, '').padStart(14, '0');
  return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12,14)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function pct(num: number, total: number) {
  if (!total) return '0%';
  return Math.round((num / total) * 100) + '%';
}

function classify(nr: number): string {
  if (nr >= 20) return 'Crítico';
  if (nr >= 15) return 'Alto';
  if (nr >= 8) return 'Médio';
  if (nr >= 4) return 'Baixo';
  return 'Trivial';
}

function humanizeAssessmentType(t: string): string {
  return ({ inicial: 'Diagnóstico inicial completo', padrao: 'Diagnóstico padrão', pulse: 'Pulse semestral' } as Record<string, string>)[t] || t;
}

function humanizeRole(r: string): string {
  return ({ profissional: 'Profissional SST', gestor: 'Gestor', proprietario: 'Proprietário', colaborador: 'Colaborador' } as Record<string, string>)[r] || r;
}

function humanizeStatus(s: string): string {
  return ({ planejada: 'Planejada', em_andamento: 'Em andamento', concluida: 'Concluída', atrasada: 'Atrasada', cancelada: 'Cancelada' } as Record<string, string>)[s] || s;
}

function truncate(s: string, max: number): string {
  if (!s) return '—';
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let curr = '';
  for (const w of words) {
    const trial = curr ? `${curr} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) > maxWidth) {
      if (curr) lines.push(curr);
      curr = w;
    } else {
      curr = trial;
    }
  }
  if (curr) lines.push(curr);
  return lines;
}
