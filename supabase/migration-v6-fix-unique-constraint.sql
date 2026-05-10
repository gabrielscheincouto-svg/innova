-- ============================================================
-- Innova · Migration v6 · troca unique index parcial por constraint
-- ============================================================
-- Erro: "there is no unique or exclusion constraint matching the
-- ON CONFLICT specification" ao importar planilhas.
--
-- Causa: v5 criou unique INDEX parcial em (company_id, matricula)
-- WHERE matricula is not null. O ON CONFLICT do Postgres precisa
-- de UNIQUE CONSTRAINT (não índice parcial).
--
-- Fix: dropa o índice parcial e cria constraint normal. NULL é
-- tratado como distinto (default Postgres), então múltiplas linhas
-- com matricula=NULL ainda funcionam.
-- ============================================================

-- 1. Drop dos índices parciais do v5
drop index if exists public.premios_colab_company_matricula_uniq;
drop index if exists public.premios_colab_company_cpf_uniq;
drop index if exists public.premios_colab_company_name_uniq;

-- 2. Cria UNIQUE CONSTRAINTs (compatíveis com ON CONFLICT)
alter table public.premios_colaboradores
  drop constraint if exists premios_colab_company_matricula_key;
alter table public.premios_colaboradores
  add constraint premios_colab_company_matricula_key
  unique (company_id, matricula);

alter table public.premios_colaboradores
  drop constraint if exists premios_colab_company_cpf_key;
alter table public.premios_colaboradores
  add constraint premios_colab_company_cpf_key
  unique (company_id, cpf);

-- ============================================================
-- DONE
-- ============================================================
-- Como NULLs são distintos por default, pode existir várias linhas
-- com matricula=NULL ou cpf=NULL na mesma empresa. O ON CONFLICT
-- só dispara quando ambos são não-nulos e iguais.
-- ============================================================
