-- ============================================================
-- Innova Capital · Migration v2
-- ============================================================
-- Adiciona:
--   1. companies.system_access (quais sistemas a empresa contratou)
--   2. Tabelas COMAQ (Premiações estendido):
--      - premios_colaboradores (funcionários elegíveis)
--      - premios_criterios (critérios de avaliação P×S)
--      - premios_avaliacoes (notas mensais)
--      - premios_folha (folha de prêmio mensal consolidada)
--      - premios_contratos (contratos de adesão dos colaboradores)
--
-- Como rodar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cole este arquivo inteiro → Run
-- ============================================================

-- ========== 1. companies.system_access ==========
-- Quais sistemas essa empresa contratou. Default: nr1 + premiacoes.
alter table public.companies
  add column if not exists system_access system_key[] not null default array['nr1','premiacoes']::system_key[];

-- Helper · checa se a empresa tem acesso a um sistema específico
create or replace function public.company_has_system(p_company_id uuid, p_system system_key)
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.companies
    where id = p_company_id and p_system = any(system_access) and status = 'ativa'
  )
$$;

-- ========== 2. premios_colaboradores ==========
-- Funcionários elegíveis ao programa de premiação
create table if not exists public.premios_colaboradores (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  cpf text not null,
  matricula text,
  cargo text,
  setor text,
  data_admissao date,
  salario_base numeric(10,2),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, cpf),
  constraint cpf_format_premios check (cpf ~ '^\d{11}$')
);

create index if not exists idx_premios_colab_company on public.premios_colaboradores(company_id);
create index if not exists idx_premios_colab_active on public.premios_colaboradores(is_active);

-- ========== 3. premios_criterios ==========
-- Critérios de avaliação (ex: Pontualidade, Produtividade, Conduta...)
create table if not exists public.premios_criterios (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  weight numeric(5,2) not null default 1.0 check (weight > 0),
  -- escala 1-5 com descritores customizáveis
  scale_labels jsonb default '{"1":"Insuficiente","2":"Abaixo","3":"Regular","4":"Bom","5":"Excelente"}'::jsonb,
  display_order int default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_premios_crit_company on public.premios_criterios(company_id);

-- ========== 4. premios_avaliacoes ==========
-- Avaliação mensal de um colaborador num critério
-- (1 linha por colaborador × critério × competência)
create table if not exists public.premios_avaliacoes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  colaborador_id uuid not null references public.premios_colaboradores(id) on delete cascade,
  criterio_id uuid not null references public.premios_criterios(id) on delete cascade,
  competencia date not null, -- primeiro dia do mês: 2026-01-01
  score int not null check (score between 1 and 5),
  comments text,
  evaluated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (colaborador_id, criterio_id, competencia)
);

create index if not exists idx_premios_aval_company on public.premios_avaliacoes(company_id);
create index if not exists idx_premios_aval_colab on public.premios_avaliacoes(colaborador_id);
create index if not exists idx_premios_aval_competencia on public.premios_avaliacoes(competencia);

-- ========== 5. premios_folha ==========
-- Folha de prêmio mensal consolidada (gerada a partir das avaliações)
create table if not exists public.premios_folha (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  competencia date not null, -- 2026-01-01
  colaborador_id uuid not null references public.premios_colaboradores(id) on delete cascade,
  -- score consolidado (média ponderada dos critérios)
  final_score numeric(4,2),
  -- valor do prêmio nessa competência
  premio_value numeric(10,2) not null default 0,
  -- ajustes RH: faltas, absenteísmo, ocorrências (descontos)
  ajustes jsonb default '[]'::jsonb,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'paga', 'cancelada')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (colaborador_id, competencia)
);

create index if not exists idx_premios_folha_company on public.premios_folha(company_id);
create index if not exists idx_premios_folha_competencia on public.premios_folha(competencia);
create index if not exists idx_premios_folha_status on public.premios_folha(status);

-- ========== 6. premios_contratos ==========
-- Contratos de adesão dos colaboradores ao programa
create table if not exists public.premios_contratos (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  colaborador_id uuid not null references public.premios_colaboradores(id) on delete cascade,
  program_id uuid references public.premiacao_programs(id),
  contract_date date not null default current_date,
  signed boolean not null default false,
  signed_at timestamptz,
  pdf_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_premios_contratos_company on public.premios_contratos(company_id);
create index if not exists idx_premios_contratos_colab on public.premios_contratos(colaborador_id);

-- ============================================================
-- RLS · habilita
-- ============================================================
alter table public.premios_colaboradores enable row level security;
alter table public.premios_criterios enable row level security;
alter table public.premios_avaliacoes enable row level security;
alter table public.premios_folha enable row level security;
alter table public.premios_contratos enable row level security;

-- ============================================================
-- POLICIES · genéricas (gestor + has_company_access)
-- ============================================================
create policy "premios_colab_read" on public.premios_colaboradores
  for select using (public.has_company_access(company_id));
create policy "premios_colab_write" on public.premios_colaboradores
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premios_crit_read" on public.premios_criterios
  for select using (public.has_company_access(company_id));
create policy "premios_crit_write" on public.premios_criterios
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premios_aval_read" on public.premios_avaliacoes
  for select using (public.has_company_access(company_id));
create policy "premios_aval_write" on public.premios_avaliacoes
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premios_folha_read" on public.premios_folha
  for select using (public.has_company_access(company_id));
create policy "premios_folha_write" on public.premios_folha
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premios_contratos_read" on public.premios_contratos
  for select using (public.has_company_access(company_id));
create policy "premios_contratos_write" on public.premios_contratos
  for all using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

-- ============================================================
-- TRIGGER · updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists tr_premios_colab_upd on public.premios_colaboradores;
create trigger tr_premios_colab_upd before update on public.premios_colaboradores
  for each row execute function public.set_updated_at();

drop trigger if exists tr_premios_crit_upd on public.premios_criterios;
create trigger tr_premios_crit_upd before update on public.premios_criterios
  for each row execute function public.set_updated_at();

drop trigger if exists tr_premios_aval_upd on public.premios_avaliacoes;
create trigger tr_premios_aval_upd before update on public.premios_avaliacoes
  for each row execute function public.set_updated_at();

drop trigger if exists tr_premios_folha_upd on public.premios_folha;
create trigger tr_premios_folha_upd before update on public.premios_folha
  for each row execute function public.set_updated_at();

-- ============================================================
-- DONE · valida com:
-- select column_name from information_schema.columns where table_name='companies' and column_name='system_access';
-- select tablename from pg_tables where tablename like 'premios_%';
-- ============================================================
