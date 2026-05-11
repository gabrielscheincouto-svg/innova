-- ============================================================
-- Innova · Migration v12 · filial no colaborador
-- ============================================================
-- COMAQ e outras empresas com múltiplas filiais precisam separar
-- filial (loja/unidade) de setor (departamento interno).
-- ============================================================

alter table public.premios_colaboradores
  add column if not exists filial text;

comment on column public.premios_colaboradores.filial is
  'Filial / unidade / loja / centro de custo geográfico do colaborador.';

create index if not exists idx_premios_colab_filial
  on public.premios_colaboradores(company_id, filial);

-- ============================================================
-- DONE
-- ============================================================