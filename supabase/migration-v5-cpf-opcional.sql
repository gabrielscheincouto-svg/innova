-- ============================================================
-- Innova · Migration v5 · CPF opcional no premios_colaboradores
-- ============================================================
-- Permite importar planilhas que não trazem CPF (ex: "Relatório de
-- Empregados" do sistema legado, que tem só Código/Matrícula + Nome).
--
-- Mudanças:
--   1. premios_colaboradores.cpf vira nullable
--   2. Drop unique (company_id, cpf) — vira unique (company_id, matricula)
--      OU (company_id, full_name) se não tem matrícula
--   3. Check constraint só valida formato quando CPF é fornecido
-- ============================================================

-- 1. Permite CPF nulo
alter table public.premios_colaboradores
  alter column cpf drop not null;

-- 2. Re-cria check constraint pra ser leniente com nulos
alter table public.premios_colaboradores
  drop constraint if exists cpf_format_premios;
alter table public.premios_colaboradores
  add constraint cpf_format_premios check (cpf is null or cpf ~ '^\d{11}$');

-- 3. Troca o unique constraint
alter table public.premios_colaboradores
  drop constraint if exists premios_colaboradores_company_id_cpf_key;

-- Novo unique: por matrícula dentro da empresa (quando matricula existe)
create unique index if not exists premios_colab_company_matricula_uniq
  on public.premios_colaboradores (company_id, matricula)
  where matricula is not null;

-- Fallback unique: por nome dentro da empresa (caso sem matrícula nem CPF)
create unique index if not exists premios_colab_company_name_uniq
  on public.premios_colaboradores (company_id, full_name)
  where matricula is null and cpf is null;

-- Mantém unique por CPF quando fornecido
create unique index if not exists premios_colab_company_cpf_uniq
  on public.premios_colaboradores (company_id, cpf)
  where cpf is not null;
