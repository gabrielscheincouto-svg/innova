// ============================================================
// Tipos do schema Supabase
// Atualize manualmente quando o schema.sql mudar.
// (Em projeto maduro, gerar com `supabase gen types typescript`)
// ============================================================

export type UserRole = 'gestor' | 'profissional' | 'proprietario' | 'colaborador';
export type CompanyStatus = 'ativa' | 'suspensa' | 'encerrada';
export type SystemKey = 'nr1' | 'premiacoes' | 'gestor';
export type PlanTier = 'basica' | 'completa' | 'farmacia';

// ----- Row types (o que vem do select) -----
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  cpf: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface MetodologiaPremio {
  min_score: number; // abaixo disso, prêmio = 0
  scale: Array<{ min_media: number; percent: number }>; // ordenado decrescente; primeiro match ganha
}

export const METODOLOGIA_PADRAO: MetodologiaPremio = {
  min_score: 3,
  scale: [
    { min_media: 5, percent: 100 },
    { min_media: 4, percent: 80 },
    { min_media: 3, percent: 60 },
  ],
};

export function calcPercentPremio(media: number, m: MetodologiaPremio | null | undefined): number {
  const cfg = m || METODOLOGIA_PADRAO;
  if (media < cfg.min_score) return 0;
  // ordena decrescente por min_media e pega o primeiro que bate
  const sorted = [...cfg.scale].sort((a, b) => b.min_media - a.min_media);
  for (const r of sorted) if (media >= r.min_media) return r.percent;
  return 0;
}

export interface Company {
  id: string;
  cnpj: string;
  legal_name: string;
  metodologia_premio?: MetodologiaPremio | null; // metodologia padrão da empresa
  trade_name: string | null;
  cnae: string | null;
  sector: string | null;
  size_category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: CompanyStatus;
  plan_tier: PlanTier;
  monthly_value: number | null;
  setup_fee: number | null;
  contract_start: string | null;
  parent_company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // quais sistemas essa empresa contratou (nr1, premiacoes, ou ambos)
  system_access: SystemKey[];
}

export interface UserCompany {
  id: string;
  profile_id: string;
  company_id: string;
  system_access: SystemKey[];
  is_primary: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  meta: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Assessment {
  id: string;
  company_id: string;
  cycle: string;
  type: 'inicial' | 'padrao' | 'pulse';
  status: 'iniciando' | 'coleta' | 'analise' | 'devolutiva' | 'concluida' | 'arquivada';
  token: string;
  expires_at: string;
  target_response_rate: number;
  total_invited: number;
  total_responses: number;
  created_by: string | null;
  signed_by: string | null;
  signed_at: string | null;
  created_at: string;
}

export interface IparItem {
  id: string;
  company_id: string;
  assessment_id: string | null;
  setor: string;
  atividade: string;
  perigo: string;
  dano: string | null;
  exposicao: string | null;
  probabilidade: number | null;
  severidade: number | null;
  controles_existentes: string | null;
  controles_recomendados: string | null;
  responsavel: string | null;
  prazo: string | null;
  nr_aplicavel: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  company_id: string;
  ipar_id: string | null;
  risco: string;
  medida: string;
  tipo: 'preventiva' | 'corretiva' | 'emergencial' | 'melhoria' | null;
  prioridade: 'alta' | 'media' | 'baixa' | null;
  responsavel: string | null;
  prazo: string | null;
  status: 'planejada' | 'em_andamento' | 'concluida' | 'atrasada' | 'cancelada';
  evidencias: string | null;
  created_at: string;
  updated_at: string;
}

export interface HazardCommunication {
  id: string;
  company_id: string;
  protocolo: string;
  setor: string | null;
  reporter_name: string | null;
  description: string;
  hazard_type: string | null;
  classification: 'trivial' | 'baixo' | 'medio' | 'alto' | 'critico' | null;
  status: 'aberta' | 'em_analise' | 'em_andamento' | 'encerrada' | 'cancelada';
  created_at: string;
  closed_at: string | null;
}

// ============================================================
// COMAQ Premiações · novos tipos
// ============================================================

export interface PremiosColaborador {
  id: string;
  company_id: string;
  full_name: string;
  cpf: string;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  data_admissao: string | null;
  data_nascimento: string | null;
  salario_base: number | null;
  premio_max_percent: number; // % do salário que o colaborador pode receber como prêmio máximo (nota 5). Default 100.
  metodologia_premio: MetodologiaPremio | null; // override individual; null = herda da empresa
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PremiosCriterio {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  weight: number;
  scale_labels: Record<string, string> | null;
  display_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PremiosAvaliacao {
  id: string;
  company_id: string;
  colaborador_id: string;
  criterio_id: string;
  competencia: string; // YYYY-MM-01
  score: number; // 1-5
  comments: string | null;
  evaluated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PremiosFolhaStatus = 'pendente' | 'aprovada' | 'paga' | 'cancelada';

export interface PremiosFolha {
  id: string;
  company_id: string;
  competencia: string; // YYYY-MM-01
  colaborador_id: string;
  final_score: number | null;
  premio_value: number;
  ajustes: Array<{ tipo: string; valor: number; obs?: string }> | null;
  status: PremiosFolhaStatus;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PremiosContrato {
  id: string;
  company_id: string;
  colaborador_id: string;
  program_id: string | null;
  contract_date: string;
  signed: boolean;
  signed_at: string | null;
  pdf_url: string | null;
  created_at: string;
}

// ============================================================
// Database type for Supabase client (formato esperado pela v2)
// ============================================================
// Insert types: required = sem default no SQL · optional = com default
// Update types: tudo opcional

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          cpf?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string;
          role?: UserRole;
          cpf?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
        };
      };
      companies: {
        Row: Company;
        Insert: {
          id?: string;
          cnpj: string;
          legal_name: string;
          trade_name?: string | null;
          cnae?: string | null;
          sector?: string | null;
          size_category?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          status?: CompanyStatus;
          plan_tier?: PlanTier;
          monthly_value?: number | null;
          setup_fee?: number | null;
          contract_start?: string | null;
          parent_company_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          cnpj?: string;
          legal_name?: string;
          trade_name?: string | null;
          cnae?: string | null;
          sector?: string | null;
          size_category?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          status?: CompanyStatus;
          plan_tier?: PlanTier;
          monthly_value?: number | null;
          setup_fee?: number | null;
          contract_start?: string | null;
        };
      };
      user_companies: {
        Row: UserCompany;
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          system_access?: SystemKey[];
          is_primary?: boolean;
        };
        Update: {
          system_access?: SystemKey[];
          is_primary?: boolean;
        };
      };
      audit_logs: {
        Row: AuditLog;
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          meta?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: never;
      };
      assessments: {
        Row: Assessment;
        Insert: {
          id?: string;
          company_id: string;
          cycle: string;
          type: Assessment['type'];
          status?: Assessment['status'];
          token?: string;
          expires_at?: string;
          target_response_rate?: number;
          total_invited?: number;
          total_responses?: number;
          created_by?: string | null;
        };
        Update: Partial<Omit<Assessment, 'id' | 'created_at'>>;
      };
      ipar_items: {
        Row: IparItem;
        Insert: {
          id?: string;
          company_id: string;
          assessment_id?: string | null;
          setor: string;
          atividade: string;
          perigo: string;
          dano?: string | null;
          exposicao?: string | null;
          probabilidade?: number | null;
          severidade?: number | null;
          controles_existentes?: string | null;
          controles_recomendados?: string | null;
          responsavel?: string | null;
          prazo?: string | null;
          nr_aplicavel?: string | null;
        };
        Update: Partial<Omit<IparItem, 'id' | 'created_at'>>;
      };
      action_plan: {
        Row: ActionItem;
        Insert: {
          id?: string;
          company_id: string;
          ipar_id?: string | null;
          risco: string;
          medida: string;
          tipo?: ActionItem['tipo'];
          prioridade?: ActionItem['prioridade'];
          responsavel?: string | null;
          prazo?: string | null;
          status?: ActionItem['status'];
          evidencias?: string | null;
        };
        Update: Partial<Omit<ActionItem, 'id' | 'created_at'>>;
      };
      hazard_communications: {
        Row: HazardCommunication;
        Insert: {
          id?: string;
          company_id: string;
          protocolo?: string;
          setor?: string | null;
          reporter_name?: string | null;
          description: string;
          hazard_type?: string | null;
          classification?: HazardCommunication['classification'];
          status?: HazardCommunication['status'];
        };
        Update: Partial<Omit<HazardCommunication, 'id' | 'created_at'>>;
      };
    };
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      is_gestor: { Args: Record<string, never>; Returns: boolean };
      has_company_access: { Args: { target_company_id: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      company_status: CompanyStatus;
      system_key: SystemKey;
    };
  };
}
