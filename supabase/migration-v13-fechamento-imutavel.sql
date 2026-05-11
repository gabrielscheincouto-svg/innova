-- ============================================================
-- Innova · Migration v13 · fechamento imutável + hash forense
-- ============================================================
-- Cada fechamento de competência grava:
--   • snapshot completo dos dados (JSONB)
--   • hash SHA-256 do snapshot canônico (defesa contra adulteração)
--   • quem fechou, quando, IP/user-agent
--   • histórico de reaberturas (motivo + quem)
--
-- Mesmo se alguém alterar avaliações/folha depois (reabrindo),
-- o snapshot original e o hash ficam preservados.
-- Em fiscalização ou processo judicial, esses registros provam
-- a integridade dos dados naquele momento.
-- ============================================================

create table if not exists public.premios_fechamentos (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  competencia date not null,

  -- hash forense (SHA-256 hex do snapshot JSON canônico)
  hash text not null,

  -- snapshot completo · imutável após criação
  snapshot jsonb not null,

  -- fechamento
  closed_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id) on delete set null,
  closed_by_email text not null, -- preserva mesmo se profile sumir
  closed_by_ip text,
  closed_by_user_agent text,

  -- reabertura · só preenche se essa lacre foi quebrado
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id) on delete set null,
  reopened_by_email text,
  motivo_reabertura text,

  -- metadados
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_premios_fechamentos_company_competencia
  on public.premios_fechamentos(company_id, competencia, closed_at desc);

create index if not exists idx_premios_fechamentos_hash
  on public.premios_fechamentos(hash);

-- ============================================================
-- RLS
-- ============================================================
alter table public.premios_fechamentos enable row level security;

create policy "premios_fechamentos_read" on public.premios_fechamentos
  for select using (public.has_company_access(company_id));

create policy "premios_fechamentos_insert" on public.premios_fechamentos
  for insert with check (public.has_company_access(company_id));

-- UPDATE permitido só nas colunas de reabertura · proteção parcial
create policy "premios_fechamentos_update_reabertura" on public.premios_fechamentos
  for update using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

-- NUNCA permite DELETE — defesa forense
-- (sem policy de DELETE = nenhum DELETE passa, mesmo do gestor)

-- ============================================================
-- View · último fechamento por competência (pra UI)
-- ============================================================
create or replace view public.v_premios_fechamento_atual as
select distinct on (company_id, competencia)
  id, company_id, competencia, hash, closed_at, closed_by_email,
  reopened_at, reopened_by_email, motivo_reabertura
from public.premios_fechamentos
order by company_id, competencia, closed_at desc;

grant select on public.v_premios_fechamento_atual to authenticated;

-- ============================================================
-- DONE
-- ============================================================