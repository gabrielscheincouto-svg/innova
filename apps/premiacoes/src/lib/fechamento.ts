/**
 * Sistema de fechamento imutável com hash forense (SHA-256).
 *
 * O snapshot canônico inclui TUDO que importa pra defesa judicial:
 *   - identificação da empresa
 *   - competência
 *   - cada colaborador (nome, CPF, matrícula, cargo, setor, filial, salário,
 *     premio_max_percent, metodologia override, elegibilidade)
 *   - cada critério (nome, peso, escala)
 *   - cada avaliação (nota dada)
 *   - cada linha da folha (média, prêmio, status)
 *   - metodologia da empresa
 *   - timestamp + usuário
 *
 * Hash = SHA-256 hex do JSON canônico (chaves ordenadas).
 * Qualquer mudança = hash diferente → adulteração detectada.
 */

export interface SnapshotData {
  versao: string;
  company: { id: string; cnpj: string; legal_name: string; trade_name: string | null };
  competencia: string;
  emitido_em: string;
  emitido_por: string;
  metodologia_empresa: unknown;
  criterios: Array<{ id: string; name: string; weight: number }>;
  colaboradores: Array<{
    id: string;
    full_name: string;
    cpf: string | null;
    matricula: string | null;
    cargo: string | null;
    setor: string | null;
    filial: string | null;
    data_admissao: string | null;
    salario_base: number | null;
    premio_max_percent: number;
    metodologia_premio: unknown;
    elegivel_premio: boolean;
  }>;
  avaliacoes: Array<{ colaborador_id: string; criterio_id: string; score: number }>;
  folha: Array<{
    colaborador_id: string;
    final_score: number | null;
    premio_value: number;
    status: string;
  }>;
  totais: {
    qtd_colaboradores: number;
    qtd_avaliacoes: number;
    total_folha: number;
    total_salarios: number;
  };
}

/**
 * Ordena chaves do objeto recursivamente pra gerar JSON canônico.
 * Mesma entrada → mesma string → mesmo hash, sempre.
 */
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) sorted[k] = canonicalize(obj[k]);
  return sorted;
}

/**
 * SHA-256 do snapshot canônico → hex (64 chars).
 * Usa Web Crypto API · disponível em todos os browsers modernos.
 */
export async function computeSnapshotHash(snapshot: SnapshotData): Promise<string> {
  const canonical = JSON.stringify(canonicalize(snapshot));
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Formata hash em blocos de 8 chars (visualmente mais legível).
 * Ex: 'a1b2c3d4 e5f6g7h8 ...'
 */
export function formatHashShort(hash: string): string {
  return hash.slice(0, 16) + '…' + hash.slice(-8);
}
export function formatHashGroups(hash: string): string {
  return hash.match(/.{1,8}/g)?.join(' ') || hash;
}
