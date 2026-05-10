-- ============================================================
-- Innova · Migration v4 · RPC admin_invite_user
-- ============================================================
-- Problema: o Gestor chamava sb.auth.signUp() pra criar usuários,
-- mas isso DESLOGA o gestor e loga como o usuário recém-criado.
-- Aí o INSERT no profiles falhava com erro de segurança porque o
-- novo usuário não é gestor.
--
-- Fix: RPC function security definer que faz tudo no backend:
--   - Verifica que quem chama é gestor
--   - Cria user em auth.users + auth.identities
--   - Cria profile com role correto
--   - Vincula empresa se passado company_id
-- O gestor permanece logado o tempo todo.
--
-- Como rodar:
--   Supabase Dashboard → SQL Editor → New query → cole tudo → Run
-- ============================================================

drop function if exists public.admin_invite_user(text, text, text, user_role, text, text, uuid);

create or replace function public.admin_invite_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role user_role,
  p_cpf text default null,
  p_phone text default null,
  p_company_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_user_id uuid;
  v_caller_role text;
  v_existing_id uuid;
begin
  -- 1. Verifica que o caller é gestor
  select role::text into v_caller_role
  from public.profiles
  where id = auth.uid() and is_active = true;

  if v_caller_role is null or v_caller_role <> 'gestor' then
    raise exception 'Apenas usuários com perfil gestor podem convidar usuários' using errcode = '42501';
  end if;

  -- 2. Valida que email não existe
  select id into v_existing_id from auth.users where email = p_email limit 1;
  if v_existing_id is not null then
    raise exception 'E-mail já cadastrado' using errcode = '23505';
  end if;

  -- 3. Valida senha
  if length(p_password) < 8 then
    raise exception 'Senha deve ter no mínimo 8 caracteres' using errcode = '22023';
  end if;

  -- 4. Cria user em auth.users
  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at, last_sign_in_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),   -- email_confirmed_at: já confirmado (gestor está criando)
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('full_name', p_full_name)::jsonb,
    false,
    now(),
    now(),
    null
  );

  -- 5. Cria identity (Supabase exige pra email auth funcionar)
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    json_build_object('sub', v_user_id::text, 'email', p_email)::jsonb,
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- 6. Cria profile
  insert into public.profiles (id, email, full_name, role, cpf, phone, is_active)
  values (
    v_user_id,
    p_email,
    p_full_name,
    p_role,
    nullif(p_cpf, ''),
    nullif(p_phone, ''),
    true
  );

  -- 7. Vincula empresa se passado
  if p_company_id is not null then
    insert into public.user_companies (profile_id, company_id, is_primary, system_access)
    values (
      v_user_id,
      p_company_id,
      true,
      array['nr1', 'premiacoes']::system_key[]
    );
  end if;

  -- 8. Audit log
  insert into public.audit_logs (actor_id, actor_email, action, resource_type, resource_id, meta)
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    'user_create',
    'profile',
    v_user_id,
    json_build_object('email', p_email, 'role', p_role)::jsonb
  );

  return json_build_object(
    'user_id', v_user_id,
    'email', p_email,
    'role', p_role
  );
end;
$$;

alter function public.admin_invite_user(text, text, text, user_role, text, text, uuid) owner to postgres;

-- Permite que usuários autenticados executem (a função em si valida que é gestor)
grant execute on function public.admin_invite_user(text, text, text, user_role, text, text, uuid) to authenticated;

-- ============================================================
-- DONE
-- ============================================================
-- Teste no SQL Editor (vai dar erro porque você não tá autenticado pelo dashboard):
-- select public.admin_invite_user('teste@x.com', '12345678', 'Teste', 'proprietario', null, null, null);
-- ============================================================
