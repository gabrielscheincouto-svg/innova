-- ============================================================
-- Innova Capital · Sample data para testar os 3 apps
-- ============================================================
-- Rode DEPOIS do schema.sql + seed.sql.
-- Cria empresas demo, vincula o gestor, cria 1 avaliação ativa
-- com IPAR + Plano de Ação + Comunicação + Programa 457.
-- ============================================================

do $$
declare
  gestor_id uuid;
  acme_id uuid := uuid_generate_v4();
  atende_id uuid := uuid_generate_v4();
  vila_id uuid := uuid_generate_v4();
  prog_id uuid := uuid_generate_v4();
  assess_id uuid := uuid_generate_v4();
  ipar1_id uuid := uuid_generate_v4();
  ipar2_id uuid := uuid_generate_v4();
begin
  -- Pega o gestor existente
  select id into gestor_id from public.profiles where role = 'gestor' limit 1;

  if gestor_id is null then
    raise exception 'Crie o gestor primeiro (rode seed.sql)';
  end if;

  -- ========== Empresas demo ==========
  insert into public.companies (id, cnpj, legal_name, trade_name, sector, plan_tier, monthly_value, status, created_by) values
    (acme_id, '00000000000112', 'Acme Logística Ltda', 'Acme', 'Logística', 'completa', 7100, 'ativa', gestor_id),
    (atende_id, '00000000000158', 'Telemarketing Atende+ Ltda', 'Atende+', 'Telemarketing', 'completa', 7100, 'ativa', gestor_id),
    (vila_id, '00000000000234', 'Hospital Vila Nova S.A.', 'Vila Nova', 'Saúde', 'completa', 11000, 'ativa', gestor_id)
  on conflict (cnpj) do nothing;

  -- ========== Vincula gestor às empresas (acesso a tudo) ==========
  insert into public.user_companies (profile_id, company_id, system_access, is_primary) values
    (gestor_id, acme_id, array['nr1','premiacoes','gestor']::system_key[], true),
    (gestor_id, atende_id, array['nr1','premiacoes','gestor']::system_key[], false),
    (gestor_id, vila_id, array['nr1','premiacoes','gestor']::system_key[], false)
  on conflict do nothing;

  -- ========== Avaliação NR-1 ativa para Acme ==========
  insert into public.assessments (id, company_id, cycle, type, status, total_invited, total_responses, created_by)
  values (assess_id, acme_id, '2026.Q2', 'padrao', 'coleta', 142, 98, gestor_id);

  -- ========== IPAR · 5 perigos para Acme ==========
  insert into public.ipar_items (id, company_id, assessment_id, setor, atividade, perigo, dano, probabilidade, severidade, controles_existentes, controles_recomendados, responsavel, prazo, nr_aplicavel) values
    (ipar1_id, acme_id, assess_id, 'Atendimento', 'Atendimento ao cliente', 'Pressão por metas', 'Burnout, ansiedade', 5, 4, 'Pausas reguladas', 'Programa de saúde mental + revisão de metas', 'RH / SST', '30 dias', 'NR-1 / NR-17'),
    (ipar2_id, acme_id, assess_id, 'Atendimento', 'Atendimento emocional', 'Carga emocional do cliente', 'Estresse acumulado', 5, 3, 'Treinamento de empatia', 'Apoio psicológico via convênio', 'RH', '15 dias', 'NR-1 / NR-17'),
    (uuid_generate_v4(), acme_id, assess_id, 'Logística', 'Movimentação de carga', 'Levantamento manual', 'LER/DORT', 4, 3, 'EPI', 'AET + revisão de processo', 'Eng. SST', '20 dias', 'NR-17 / NR-11'),
    (uuid_generate_v4(), acme_id, assess_id, 'Operacional', 'Operação de equipamentos', 'Ruído > 85 dB(A)', 'Fadiga auditiva', 3, 3, 'Protetores auriculares', 'Painéis acústicos + audiometria', 'Eng. SST', '30 dias', 'NR-15 / NR-9'),
    (uuid_generate_v4(), acme_id, assess_id, 'Geral', 'Trabalho em escritório', 'Iluminação inadequada', 'Fadiga visual', 2, 2, 'Iluminação atual', 'Revisão e troca de luminárias', 'Manutenção', '90 dias', 'NR-17');

  -- ========== Plano de Ação (vinculado aos IPARs críticos/altos) ==========
  insert into public.action_plan (company_id, ipar_id, risco, medida, tipo, prioridade, responsavel, prazo, status) values
    (acme_id, ipar1_id, 'Pressão por metas', 'Revisão de metas + programa de saúde mental', 'preventiva', 'alta', 'RH', '2026-05-30', 'em_andamento'),
    (acme_id, ipar2_id, 'Carga emocional', 'Apoio psicológico via convênio empresarial', 'preventiva', 'alta', 'RH', '2026-05-15', 'planejada'),
    (acme_id, null, 'Sobrecarga administrativo', 'Redistribuição de equipe', 'preventiva', 'media', 'Gestão', '2026-05-05', 'em_andamento');

  -- ========== Comunicações de perigo ==========
  insert into public.hazard_communications (company_id, setor, reporter_name, description, hazard_type, classification, status) values
    (acme_id, 'Logística', 'João S.', 'Piso molhado sem sinalização perto da rampa de carregamento', 'Físico', 'medio', 'em_analise'),
    (atende_id, 'Atendimento', 'Maria L.', 'Sobrecarga de trabalho na equipe noturna · não há revezamento', 'Psicossocial', 'alto', 'em_analise'),
    (vila_id, 'Enfermagem', 'Anônimo', 'Falta de EPI específico para procedimento de risco biológico', 'Biológico', 'alto', 'em_andamento');

  -- ========== Programa de Premiação 457 ==========
  insert into public.premiacao_programs (id, company_id, name, description, legal_basis, status) values
    (prog_id, acme_id, 'Programa de Performance Logística', 'Premiação trimestral por atingimento de SLA de entrega ≥ 95% e zero acidentes', 'Art. 457 §2 CLT', 'ativo');

  -- ========== Atas de premiação ==========
  insert into public.premiacao_atas (program_id, company_id, period, total_amount, beneficiaries_count, kpi_trigger, status, approved_by, approved_at) values
    (prog_id, acme_id, 'Q1 2026', 18200, 14, 'SLA entrega 96.4% (meta ≥95%) · 0 acidentes', 'paga', gestor_id, now() - interval '15 days'),
    (prog_id, acme_id, 'Q4 2025', 15500, 12, 'SLA entrega 95.8% · 0 acidentes', 'paga', gestor_id, now() - interval '90 days');

  -- ========== Audit log ==========
  insert into public.audit_logs (actor_id, actor_email, action, resource_type, meta) values
    (gestor_id, 'gestor@innova.com.br', 'sample_data_seeded', 'system',
     jsonb_build_object('companies', 3, 'iparItems', 5, 'actions', 3, 'atas', 2));

  raise notice 'Sample data criado · 3 empresas · 5 IPAR · 3 ações · 1 programa · 2 atas';
end $$;
