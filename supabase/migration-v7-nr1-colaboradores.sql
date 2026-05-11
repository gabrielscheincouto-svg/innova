-- ============================================================
-- Innova · Migration v7 · colaboradores compartilhados (NR1 + Premiações)
-- ============================================================
-- Objetivo:
--   1. Adicionar coluna data_nascimento à tabela premios_colaboradores
--      (era parsed mas não persistia)
--   2. Criar função SECURITY DEFINER para validar colaborador via
--      CPF + data de nascimento na área pública do NR1 (rota /c/:token)
--      sem expor a tabela inteira via RLS.
--   3. Permitir exclusão de avaliações pelo profissional/gestor
--      (já existe via DELETE RLS, só garante consistência cascade)
-- ============================================================

-- 1. Adiciona coluna data_nascimento se ainda não existe
alter table public.premios_colaboradores
  add column if not exists data_nascimento date;

create index if not exists idx_premios_colab_dob
  on public.premios_colaboradores(data_nascimento);

-- 2. Função pública: valida CPF + DOB pra uma empresa e retorna o id
-- do colaborador (anônimo p/ NR1 área pública).
create or replace function public.validate_colaborador_public(
  p_company_id uuid,
  p_cpf text,
  p_dob date
)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.premios_colaboradores
  where company_id = p_company_id
    and cpf = regexp_replace(p_cpf, '\D', '', 'g')
    and data_nascimento = p_dob
    and is_active = true
  limit 1
$$;

-- Permitir invocação anônima (a função em si só retorna uuid se bate)
grant execute on function public.validate_colaborador_public(uuid, text, date) to anon, authenticated;

-- 3. Garantir cascade na exclusão de avaliações
-- (assessments deletes copsoq_responses e hazard_communications)
-- já existe via foreign key on delete cascade. Confirma:
do $$
begin
  -- Não faz nada estrutural, só comentário em coluna pra ficar registrado
  comment on table public.assessments is 'Avaliações NR-1. DELETE em cascade apaga copsoq_responses + hazard_communications relacionadas.';
exception when others then null;
end $$;

-- ============================================================
-- DONE
-- ============================================================