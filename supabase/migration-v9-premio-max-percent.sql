-- ============================================================
-- Innova · Migration v9 · % máximo de prêmio por colaborador
-- ============================================================
-- Refactor:
--   adicional_percent → premio_max_percent
--   default 0 → default 100 (case base: prêmio máximo = salário)
--
-- Semântica nova:
--   premio_max_percent = % do salário que o colaborador pode
--   ganhar como prêmio no melhor cenário (nota 5).
--   Ex: 100 = pode ganhar até 1× salário
--       50  = pode ganhar até 0.5× salário
--       40  = pode ganhar até 0.4× salário
--
--   Escala automática:
--     nota 5    → 100% do premio_max
--     nota 4    → 80%  do premio_max
--     nota 3    → 60%  do premio_max  (= score/5)
--     nota < 3  → 0
-- ============================================================

-- 1. Renomeia coluna (preserva valores existentes)
alter table public.premios_colaboradores
  rename column adicional_percent to premio_max_percent;

-- 2. Muda default para 100 (caso base · prêmio máximo = salário)
alter table public.premios_colaboradores
  alter column premio_max_percent set default 100;

-- 3. Migra valores: quem ainda estava em 0 (default antigo) vira 100
update public.premios_colaboradores
   set premio_max_percent = 100
 where premio_max_percent = 0;

-- 4. Atualiza comentário + index
comment on column public.premios_colaboradores.premio_max_percent is
  '% do salário base que o colaborador pode receber como prêmio máximo (nota 5). Default 100. Demonstrado no contrato 457 §2.';

drop index if exists public.idx_premios_colab_adicional;
create index if not exists idx_premios_colab_premio_max
  on public.premios_colaboradores(premio_max_percent);

-- ============================================================
-- DONE
-- ============================================================