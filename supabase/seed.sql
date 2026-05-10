-- ============================================================
-- Innova Capital · Seed inicial
-- ============================================================
-- IMPORTANTE: para criar o usuário gestor, faça assim:
--
-- 1. Vá em Authentication → Users → "Add user" → "Create new user"
-- 2. Email: gestor@innova.com.br
-- 3. Password: Innova@2026  (ou outra · troque depois no login)
-- 4. Marque "Auto Confirm Email"
-- 5. Anote o UUID gerado (clique no usuário, copie o ID)
-- 6. Cole esse UUID na variável abaixo e rode este script
-- ============================================================

-- ⬇ COLE O UUID DO USUÁRIO gestor@innova.com.br AQUI
-- (depois de criar pelo painel Authentication)
do $$
declare
  gestor_uuid uuid := '00000000-0000-0000-0000-000000000000'; -- ⬅ TROQUE AQUI
begin
  if gestor_uuid = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Edite o seed.sql e cole o UUID real do gestor antes de rodar.';
  end if;

  -- Cria o profile com role gestor
  insert into public.profiles (id, email, full_name, role, is_active, created_at)
  values (gestor_uuid, 'gestor@innova.com.br', 'Gestor Innova', 'gestor', true, now())
  on conflict (id) do update set
    role = 'gestor',
    is_active = true,
    full_name = excluded.full_name;

  -- Audit log inicial
  insert into public.audit_logs (actor_id, actor_email, action, resource_type, meta)
  values (gestor_uuid, 'gestor@innova.com.br', 'system_init', 'system', '{"event": "seed_executed"}'::jsonb);

  raise notice 'Gestor seed completo. Login: gestor@innova.com.br';
end $$;

-- ============================================================
-- Empresas demo (opcional — descomente se quiser dados de teste)
-- ============================================================
/*
insert into public.companies (cnpj, legal_name, trade_name, sector, plan_tier, monthly_value, status)
values
  ('00000000000112', 'Acme Logística Ltda', 'Acme', 'Logística', 'completa', 7100, 'ativa'),
  ('00000000000158', 'Telemarketing Atende+ Ltda', 'Atende+', 'Telemarketing', 'completa', 7100, 'ativa'),
  ('00000000000234', 'Hospital Vila Nova S.A.', 'Vila Nova', 'Saúde', 'completa', 11000, 'ativa'),
  ('00000000000091', 'Logística Entrega Já Ltda', 'Entrega Já', 'Logística', 'basica', 4300, 'ativa'),
  ('00000000000022', 'Indústria MaqPro Ltda', 'MaqPro', 'Indústria', 'basica', 9000, 'ativa');
*/
