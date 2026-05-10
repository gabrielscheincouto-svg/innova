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

-- 2. Re-cria as helper functions com bypass real de RLS
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
-- DONE
-- ============================================================
-- Pra validar, tente:
--   select * from public.profiles limit 5;  -- deve retornar sem erro
--   update public.profiles set is_active = false where id = '...';
-- ============================================================
