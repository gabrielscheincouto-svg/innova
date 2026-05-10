-- ============================================================
-- Innova Capital · Schema completo
-- ============================================================
-- Como rodar:
--   1. Crie um projeto novo em https://app.supabase.com
--   2. Vá em SQL Editor (menu lateral)
--   3. Cole este arquivo inteiro · clique em RUN
--   4. Depois rode `seed.sql` para criar o usuário gestor inicial
-- ============================================================

-- ========== EXTENSIONS ==========
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ========== ENUM TYPES ==========
create type user_role as enum ('gestor', 'profissional', 'proprietario', 'colaborador');
create type company_status as enum ('ativa', 'suspensa', 'encerrada');
create type system_key as enum ('nr1', 'premiacoes', 'gestor');

-- ========== TABLE: profiles ==========
-- Estende auth.users do Supabase com campos do nosso domínio
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role user_role not null default 'colaborador',
  cpf text unique,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  constraint cpf_format check (cpf is null or cpf ~ '^\d{11}$')
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_active on public.profiles(is_active);

-- ========== TABLE: companies ==========
create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  cnpj text unique not null,
  legal_name text not null,
  trade_name text,
  cnae text,
  sector text,
  size_category text,
  address text,
  city text,
  state text,
  zip text,
  status company_status not null default 'ativa',
  -- pricing
  plan_tier text default 'completa' check (plan_tier in ('basica', 'completa', 'farmacia')),
  monthly_value numeric(10,2),
  setup_fee numeric(10,2) default 1000,
  contract_start date,
  -- relations
  parent_company_id uuid references public.companies(id), -- grupo econômico
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cnpj_format check (cnpj ~ '^\d{14}$')
);

create index idx_companies_status on public.companies(status);
create index idx_companies_parent on public.companies(parent_company_id);

-- ========== TABLE: user_companies ==========
-- Vínculo many-to-many: 1 usuário pode acessar várias empresas, 1 empresa tem vários usuários
create table public.user_companies (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  -- qual sistema esse vínculo permite acesso
  system_access system_key[] not null default array['nr1']::system_key[],
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (profile_id, company_id)
);

create index idx_user_companies_profile on public.user_companies(profile_id);
create index idx_user_companies_company on public.user_companies(company_id);

-- ========== TABLE: audit_logs ==========
-- Trilha imutável de ações sensíveis (para LGPD + auditoria)
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles(id),
  actor_email text,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  meta jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_actor on public.audit_logs(actor_id);
create index idx_audit_created on public.audit_logs(created_at desc);
create index idx_audit_resource on public.audit_logs(resource_type, resource_id);

-- ========== TABLE: assessments (NR1 — placeholder próxima fase) ==========
create table public.assessments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cycle text not null, -- '2026.Q2'
  type text not null check (type in ('inicial', 'padrao', 'pulse')),
  status text not null default 'iniciando' check (status in ('iniciando', 'coleta', 'analise', 'devolutiva', 'concluida', 'arquivada')),
  token text unique not null default substr(md5(random()::text), 0, 16),
  expires_at timestamptz not null default (now() + interval '14 days'),
  target_response_rate numeric default 0.7,
  total_invited int default 0,
  total_responses int default 0,
  created_by uuid references public.profiles(id),
  signed_by uuid references public.profiles(id),
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_assessments_company on public.assessments(company_id);
create index idx_assessments_token on public.assessments(token);
create index idx_assessments_status on public.assessments(status);

-- ========== TABLE: copsoq_responses (NR1) ==========
-- Respostas anônimas — SEM vínculo com profile_id (anonimato em 3 camadas)
create table public.copsoq_responses (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  -- hash de validação (CPF foi usado pra entrar mas é descartado)
  validation_hash text not null,
  responses jsonb not null, -- { "q1": 4, "q2": 2, ... }
  setor text, -- bucket de agregação (atendimento, logística, etc)
  submitted_at timestamptz not null default now()
);

create index idx_copsoq_assessment on public.copsoq_responses(assessment_id);

-- ========== TABLE: ipar_items (NR1) ==========
create table public.ipar_items (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assessment_id uuid references public.assessments(id),
  setor text not null,
  atividade text not null,
  perigo text not null,
  dano text,
  exposicao text,
  probabilidade int check (probabilidade between 1 and 5),
  severidade int check (severidade between 1 and 5),
  -- nivel_risco e classificacao são CALCULADOS no app
  controles_existentes text,
  controles_recomendados text,
  responsavel text,
  prazo text,
  nr_aplicavel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ipar_company on public.ipar_items(company_id);

-- ========== TABLE: action_plan (NR1) ==========
create table public.action_plan (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  ipar_id uuid references public.ipar_items(id),
  risco text not null,
  medida text not null,
  tipo text check (tipo in ('preventiva', 'corretiva', 'emergencial', 'melhoria')),
  prioridade text check (prioridade in ('alta', 'media', 'baixa')),
  responsavel text,
  prazo date,
  status text default 'planejada' check (status in ('planejada', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  evidencias text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_action_company on public.action_plan(company_id);
create index idx_action_status on public.action_plan(status);

-- ========== TABLE: hazard_communications (NR1) ==========
create table public.hazard_communications (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  protocolo text unique not null default 'CP-' || extract(year from now()) || '-' || lpad(floor(random()*10000)::text, 4, '0'),
  setor text,
  reporter_name text, -- pode ser 'Anônimo'
  description text not null,
  hazard_type text,
  classification text check (classification in ('trivial', 'baixo', 'medio', 'alto', 'critico')),
  status text default 'aberta' check (status in ('aberta', 'em_analise', 'em_andamento', 'encerrada', 'cancelada')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index idx_hazcom_company on public.hazard_communications(company_id);
create index idx_hazcom_status on public.hazard_communications(status);

-- ========== TABLE: premiacao_programs (Premiações — placeholder) ==========
create table public.premiacao_programs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  legal_basis text default 'Art. 457 §2 CLT',
  status text default 'ativo' check (status in ('rascunho', 'ativo', 'pausado', 'encerrado')),
  created_at timestamptz not null default now()
);

-- ========== TABLE: premiacao_atas (Premiações) ==========
create table public.premiacao_atas (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.premiacao_programs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  period text not null, -- 'Q1 2026'
  total_amount numeric(12,2) not null,
  beneficiaries_count int not null,
  kpi_trigger text,
  evidence_doc text,
  status text default 'pendente' check (status in ('pendente', 'aprovada', 'paga', 'cancelada')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_atas_company on public.premiacao_atas(company_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.user_companies enable row level security;
alter table public.audit_logs enable row level security;
alter table public.assessments enable row level security;
alter table public.copsoq_responses enable row level security;
alter table public.ipar_items enable row level security;
alter table public.action_plan enable row level security;
alter table public.hazard_communications enable row level security;
alter table public.premiacao_programs enable row level security;
alter table public.premiacao_atas enable row level security;

-- ========== HELPER: get current user role ==========
create or replace function public.current_user_role()
returns user_role
language sql security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ========== HELPER: is gestor ==========
create or replace function public.is_gestor()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'gestor' and is_active = true
  )
$$;

-- ========== HELPER: user has access to company ==========
create or replace function public.has_company_access(target_company_id uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_companies
    where profile_id = auth.uid() and company_id = target_company_id
  ) or public.is_gestor()
$$;

-- ============================================================
-- POLICIES · profiles
-- ============================================================
-- Usuário lê o próprio perfil
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

-- Gestor lê todos os perfis
create policy "profiles_select_gestor" on public.profiles
  for select using (public.is_gestor());

-- Profissional lê perfis das empresas que atende
create policy "profiles_select_profissional" on public.profiles
  for select using (
    current_user_role() = 'profissional' and
    exists (
      select 1 from public.user_companies uc1
      join public.user_companies uc2 on uc1.company_id = uc2.company_id
      where uc1.profile_id = auth.uid() and uc2.profile_id = profiles.id
    )
  );

-- Usuário atualiza próprio perfil (campos limitados — não pode mudar role!)
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- Gestor atualiza qualquer perfil
create policy "profiles_update_gestor" on public.profiles
  for update using (public.is_gestor()) with check (public.is_gestor());

-- Gestor cria perfis
create policy "profiles_insert_gestor" on public.profiles
  for insert with check (public.is_gestor());

-- ============================================================
-- POLICIES · companies
-- ============================================================
create policy "companies_select_gestor" on public.companies
  for select using (public.is_gestor());

create policy "companies_select_user" on public.companies
  for select using (
    exists (
      select 1 from public.user_companies
      where company_id = companies.id and profile_id = auth.uid()
    )
  );

create policy "companies_insert_gestor" on public.companies
  for insert with check (public.is_gestor());

create policy "companies_update_gestor" on public.companies
  for update using (public.is_gestor()) with check (public.is_gestor());

create policy "companies_delete_gestor" on public.companies
  for delete using (public.is_gestor());

-- ============================================================
-- POLICIES · user_companies
-- ============================================================
create policy "uc_select_own" on public.user_companies
  for select using (profile_id = auth.uid() or public.is_gestor());

create policy "uc_manage_gestor" on public.user_companies
  for all using (public.is_gestor()) with check (public.is_gestor());

-- ============================================================
-- POLICIES · audit_logs (somente leitura · gestor)
-- ============================================================
create policy "audit_select_gestor" on public.audit_logs
  for select using (public.is_gestor());

create policy "audit_insert_authenticated" on public.audit_logs
  for insert with check (auth.uid() is not null);

-- ============================================================
-- POLICIES · assessments / IPAR / action_plan / hazard / premiacao
-- ============================================================
-- Padrão: usuário acessa se has_company_access · gestor acessa tudo

create policy "assessments_select" on public.assessments
  for select using (public.has_company_access(company_id));
create policy "assessments_manage" on public.assessments
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

-- copsoq_responses: ninguém edita após enviar (imutável)
create policy "copsoq_select" on public.copsoq_responses
  for select using (
    exists (select 1 from public.assessments a
            where a.id = assessment_id and public.has_company_access(a.company_id))
  );
create policy "copsoq_insert_anyone" on public.copsoq_responses
  for insert with check (true); -- token-based, validado no app

create policy "ipar_select" on public.ipar_items
  for select using (public.has_company_access(company_id));
create policy "ipar_manage" on public.ipar_items
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "action_select" on public.action_plan
  for select using (public.has_company_access(company_id));
create policy "action_manage" on public.action_plan
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "hazard_select" on public.hazard_communications
  for select using (public.has_company_access(company_id));
create policy "hazard_insert_anyone" on public.hazard_communications
  for insert with check (true); -- pode vir do canal anônimo
create policy "hazard_update" on public.hazard_communications
  for update using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premprog_select" on public.premiacao_programs
  for select using (public.has_company_access(company_id));
create policy "premprog_manage" on public.premiacao_programs
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premata_select" on public.premiacao_atas
  for select using (public.has_company_access(company_id));
create policy "premata_manage" on public.premiacao_atas
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

-- ============================================================
-- TRIGGERS
-- ============================================================
-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_companies_updated before update on public.companies
  for each row execute function public.set_updated_at();
create trigger trg_ipar_updated before update on public.ipar_items
  for each row execute function public.set_updated_at();
create trigger trg_action_updated before update on public.action_plan
  for each row execute function public.set_updated_at();

-- ============================================================
-- RPC: increment_assessment_responses
-- ============================================================
-- Incrementa contador de respostas de uma avaliação. Usado pela
-- área do colaborador após gravar resposta COPSOQ.
create or replace function public.increment_assessment_responses(aid uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.assessments
  set total_responses = coalesce(total_responses, 0) + 1
  where id = aid;
end;
$$;

-- Permite chamada sem autenticação (área do colaborador é pública via token)
grant execute on function public.increment_assessment_responses(uuid) to anon, authenticated;

-- ============================================================
-- FIM · execute seed.sql em seguida para criar gestor inicial
-- ============================================================
