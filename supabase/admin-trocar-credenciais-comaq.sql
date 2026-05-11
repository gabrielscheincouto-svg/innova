-- ============================================================
-- Admin · Trocar credenciais do usuário COMAQ
-- ============================================================
-- Email atual:  comaq@comaq.com.br
-- Email novo:   comaq@cecopel.com.br
-- Senha nova:   comaq123
--
-- IMPORTANTE: rode no SQL Editor do Supabase como dono do projeto.
-- O extension pgcrypto precisa estar habilitado (já vem por default).
-- ============================================================

-- 1. Confirma que o usuário existe e mostra o id (pra ter certeza antes)
select id, email, last_sign_in_at, email_confirmed_at
  from auth.users
 where email = 'comaq@comaq.com.br';

-- 2. Atualiza email + senha + zera flags necessários
update auth.users
   set email             = 'comaq@cecopel.com.br',
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       encrypted_password = crypt('comaq123', gen_salt('bf')),
       updated_at         = now()
 where email = 'comaq@comaq.com.br';

-- 3. Atualiza tabela auth.identities (provider 'email' guarda email lá também)
update auth.identities
   set identity_data = jsonb_set(identity_data, '{email}', '"comaq@cecopel.com.br"'),
       updated_at    = now()
 where identity_data->>'email' = 'comaq@comaq.com.br';

-- 4. Sincroniza tabela public.profiles
update public.profiles
   set email      = 'comaq@cecopel.com.br',
       updated_at = now()
 where email = 'comaq@comaq.com.br';

-- 5. Confirma o resultado
select id, email, email_confirmed_at, updated_at
  from auth.users
 where email = 'comaq@cecopel.com.br';

-- ============================================================
-- DONE
-- O usuário agora loga com:
--   email: comaq@cecopel.com.br
--   senha: comaq123
-- ============================================================
