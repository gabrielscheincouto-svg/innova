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

export interface Company {
  id: string;
  cnpj: string;
  legal_name: string;
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
