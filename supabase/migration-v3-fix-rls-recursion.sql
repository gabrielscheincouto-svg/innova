-- ============================================================
-- Innova · Migration v3 · conserta recursão infinita em RLS
-- ============================================================
-- Erro: "infinite recursion detected in policy for relation 'profiles'"
--
-- Causa: as policies do profiles chamam funções (is_gestor,
-- current_user_role) que consultam o próprio profiles, disparando
-- a policy de novo em loop.
--
-- Fix: as funções viram security definer com owner postgres,
-- bypassando RLS internamente. As policies ficam simples e diretas.
--
-- Como rodar:
--   Supabase Dashboard → SQL Editor → New query → cole e Run
-- ============================================================

-- 1. Drop policies problemáticas
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_gestor" on public.profiles;
drop policy if exists "profiles_select_profissional" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_gestor" on public.profiles;
drop policy if exists "profiles_insert_gestor" on public.profiles;
drop policy if exists "profiles_delete_gestor" on public.profiles;
drop policy if exists "profiles_read_self" on public.profiles;
drop policy if exists "profiles_read_gestor" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;

-- Drop policies de outras tabelas que dependem das funções (precisamos recriar tudo)
drop policy if exists "user_companies_select_own" on public.user_companies;
drop policy if exists "user_companies_select_gestor" on public.user_companies;
drop policy if exists "user_companies_select_self" on public.user_companies;
drop policy if exists "user_companies_insert_gestor" on public.user_companies;
drop policy if exists "user_companies_update_gestor" on public.user_companies;
drop policy if exists "user_companies_delete_gestor" on public.user_companies;
drop policy if exists "user_companies_write_gestor" on public.user_companies;

drop policy if exists "companies_select_gestor" on public.companies;
drop policy if exists "companies_select_user" on public.companies;
drop policy if exists "companies_insert_gestor" on public.companies;
drop policy if exists "companies_update_gestor" on public.companies;
drop policy if exists "companies_delete_gestor" on public.companies;
drop policy if exists "companies_read_all_authenticated" on public.companies;
drop policy if exists "companies_write_gestor" on public.companies;

-- 2. Drop as functions antigas (return type pode ter mudado)
-- CASCADE pra remover dependências em outras policies tipo premios_*
drop function if exists public.is_gestor() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.has_company_access(uuid) cascade;

-- 3. Re-cria as helper functions com bypass real de RLS
-- security definer + owner postgres = bypassa RLS quando lê profiles internamente

create or replace function public.is_gestor()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_role text;
begin
  select role::text into v_role
  from public.profiles
  where id = auth.uid() and is_active = true
  limit 1;
  return coalesce(v_role = 'gestor', false);
end;
$$;
alter function public.is_gestor() owner to postgres;

create or replace function public.current_user_role()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_role text;
begin
  select role::text into v_role
  from public.profiles
  where id = auth.uid()
  limit 1;
  return v_role;
end;
$$;
alter function public.current_user_role() owner to postgres;

create or replace function public.has_company_access(target_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_has boolean;
begin
  if public.is_gestor() then
    return true;
  end if;
  select exists (
    select 1 from public.user_companies
    where profile_id = auth.uid() and company_id = target_company_id
  ) into v_has;
  return coalesce(v_has, false);
end;
$$;
alter function public.has_company_access(uuid) owner to postgres;

-- 3. Re-cria as policies do profiles · sem recursão
-- (cada policy é uma comparação direta ou chama função que bypassa RLS)

-- Leitura: próprio perfil sempre, gestor lê todos
create policy "profiles_read_self" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_read_gestor" on public.profiles
  for select to authenticated
  using (public.is_gestor());

-- Atualização: próprio perfil (sem mexer no role) ou gestor (pode tudo)
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_gestor" on public.profiles
  for update to authenticated
  using (public.is_gestor())
  with check (public.is_gestor());

-- Insert: só gestor cria perfis
create policy "profiles_insert_gestor" on public.profiles
  for insert to authenticated
  with check (public.is_gestor());

-- Delete: só gestor (e mesmo assim recomendamos só desativar via is_active=false)
create policy "profiles_delete_gestor" on public.profiles
  for delete to authenticated
  using (public.is_gestor());

-- ============================================================
-- 4. Re-cria policies do user_companies (estavam OK mas garantia)
-- ============================================================
drop policy if exists "user_companies_select_own" on public.user_companies;
drop policy if exists "user_companies_select_gestor" on public.user_companies;
drop policy if exists "user_companies_insert_gestor" on public.user_companies;
drop policy if exists "user_companies_update_gestor" on public.user_companies;
drop policy if exists "user_companies_delete_gestor" on public.user_companies;

create policy "user_companies_select_self" on public.user_companies
  for select to authenticated
  using (profile_id = auth.uid());

create policy "user_companies_select_gestor" on public.user_companies
  for select to authenticated
  using (public.is_gestor());

create policy "user_companies_write_gestor" on public.user_companies
  for all to authenticated
  using (public.is_gestor())
  with check (public.is_gestor());

-- ============================================================
-- 5. Garante que companies usa só is_gestor (sem recursão)
-- ============================================================
drop policy if exists "companies_select_gestor" on public.companies;
drop policy if exists "companies_select_user" on public.companies;
drop policy if exists "companies_insert_gestor" on public.companies;
drop policy if exists "companies_update_gestor" on public.companies;
drop policy if exists "companies_delete_gestor" on public.companies;

create policy "companies_read_all_authenticated" on public.companies
  for select to authenticated
  using (
    public.is_gestor()
    or exists (
      select 1 from public.user_companies
      where profile_id = auth.uid() and company_id = companies.id
    )
  );

create policy "companies_write_gestor" on public.companies
  for all to authenticated
  using (public.is_gestor())
  with check (public.is_gestor());

-- ============================================================
-- 6. Re-cria policies dos premios_* (foram dropadas pelo CASCADE)
-- ============================================================
-- elas usavam has_company_access(company_id) que foi dropada

create policy "premios_colab_read" on public.premios_colaboradores
  for select to authenticated using (public.has_company_access(company_id));
create policy "premios_colab_write" on public.premios_colaboradores
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premios_crit_read" on public.premios_criterios
  for select to authenticated using (public.has_company_access(company_id));
create policy "premios_crit_write" on public.premios_criterios
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premios_aval_read" on public.premios_avaliacoes
  for select to authenticated using (public.has_company_access(company_id));
create policy "premios_aval_write" on public.premios_avaliacoes
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premios_folha_read" on public.premios_folha
  for select to authenticated using (public.has_company_access(company_id));
create policy "premios_folha_write" on public.premios_folha
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

create policy "premios_contratos_read" on public.premios_contratos
  for select to authenticated using (public.has_company_access(company_id));
create policy "premios_contratos_write" on public.premios_contratos
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

-- ============================================================
-- 7. Re-cria policies que tambem usavam has_company_access (NR1, etc)
-- ============================================================
drop policy if exists "assessments_select" on public.assessments;
drop policy if exists "assessments_write" on public.assessments;
create policy "assessments_select" on public.assessments
  for select to authenticated using (public.has_company_access(company_id));
create policy "assessments_write" on public.assessments
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

drop policy if exists "ipar_select" on public.ipar_items;
drop policy if exists "ipar_write" on public.ipar_items;
create policy "ipar_select" on public.ipar_items
  for select to authenticated using (public.has_company_access(company_id));
create policy "ipar_write" on public.ipar_items
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

drop policy if exists "action_plan_select" on public.action_plan;
drop policy if exists "action_plan_write" on public.action_plan;
create policy "action_plan_select" on public.action_plan
  for select to authenticated using (public.has_company_access(company_id));
create policy "action_plan_write" on public.action_plan
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

drop policy if exists "hazcom_select" on public.hazard_communications;
drop policy if exists "hazcom_write" on public.hazard_communications;
create policy "hazcom_select" on public.hazard_communications
  for select to authenticated using (public.has_company_access(company_id));
create policy "hazcom_write" on public.hazard_communications
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

drop policy if exists "premiacao_programs_select" on public.premiacao_programs;
drop policy if exists "premiacao_programs_write" on public.premiacao_programs;
create policy "premiacao_programs_select" on public.premiacao_programs
  for select to authenticated using (public.has_company_access(company_id));
create policy "premiacao_programs_write" on public.premiacao_programs
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

drop policy if exists "premiacao_atas_select" on public.premiacao_atas;
drop policy if exists "premiacao_atas_write" on public.premiacao_atas;
create policy "premiacao_atas_select" on public.premiacao_atas
  for select to authenticated using (public.has_company_access(company_id));
create policy "premiacao_atas_write" on public.premiacao_atas
  for all to authenticated
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

-- audit_logs: só leitura via gestor, escrita via service role (bypass RLS)
drop policy if exists "audit_logs_select_gestor" on public.audit_logs;
create policy "audit_logs_select_gestor" on public.audit_logs
  for select to authenticated using (public.is_gestor());

-- ============================================================
-- DONE
-- ============================================================
-- Pra validar, tente:
--   select * from public.profiles limit 5;  -- deve retornar sem erro
--   update public.profiles set is_active = false where id = '...';
-- ============================================================
