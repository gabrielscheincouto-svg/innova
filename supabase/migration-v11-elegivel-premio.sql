-- ============================================================
-- Innova · Migration v11 · flag de elegibilidade ao prêmio
-- ============================================================
-- Nem todo colaborador da empresa participa do programa 457 §2.
-- Esse flag controla quem entra na Avaliação, Folha e Contratos.
--
-- Default: true (todo colaborador novo é elegível por padrão).
-- ============================================================

alter table public.premios_colaboradores
  add column if not exists elegivel_premio boolean not null default true;

comment on column public.premios_colaboradores.elegivel_premio is
  'Se true, colaborador participa do programa de premiação (entra em Avaliação, Folha, Contratos). Se false, fica só no cadastro pra fins de RH.';

create index if not exists idx_premios_colab_elegivel
  on public.premios_colaboradores(company_id, elegivel_premio)
  where elegivel_premio = true;

-- ============================================================
-- DONE
-- ============================================================