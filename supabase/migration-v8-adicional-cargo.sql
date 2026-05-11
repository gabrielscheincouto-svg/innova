-- ============================================================
-- Innova · Migration v8 · adicional de cargo no colaborador
-- ============================================================
-- Objetivo:
--   Colaboradores podem ter adicional sobre o salário base
--   (ex: 40% de cargo de confiança). O prêmio máximo do
--   programa 457 §2 fica capped em:
--      premio_max = salario_base × (1 + adicional_percent/100)
--
--   Sem isso, prêmio pago acima do salário base + adicional
--   pode ser caracterizado como remuneração disfarçada em
--   fiscalização (perde a natureza indenizatória).
-- ============================================================

-- Coluna nova · adicional em % (ex: 40 = 40%)
alter table public.premios_colaboradores
  add column if not exists adicional_percent numeric(5,2) not null default 0;

comment on column public.premios_colaboradores.adicional_percent is
  'Adicional sobre o salário base (em %), tipicamente cargo de confiança. Usado pra cap do prêmio 457 §2.';

-- Index opcional (filtros futuros tipo "quem tem cargo de confiança")
create index if not exists idx_premios_colab_adicional
  on public.premios_colaboradores(adicional_percent)
  where adicional_percent > 0;

-- ============================================================
-- DONE
-- ============================================================