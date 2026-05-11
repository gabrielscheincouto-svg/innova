-- ============================================================
-- Innova · Migration v10 · metodologia configurável + fechar mês
-- ============================================================

-- 1. Metodologia configurável de cálculo de prêmio
-- Default (NULL = usa hardcoded: 3→60, 4→80, 5→100, <3→0)
-- Formato:
--   {
--     "min_score": 3,         -- abaixo disso, prêmio = 0
--     "scale": [              -- "se média >= min_media, paga percent% do teto"
--       { "min_media": 5, "percent": 100 },
--       { "min_media": 4, "percent": 80  },
--       { "min_media": 3, "percent": 60  }
--     ]
--   }

alter table public.companies
  add column if not exists metodologia_premio jsonb;

comment on column public.companies.metodologia_premio is
  'Configuração da escala de prêmios da empresa. NULL = usa default (3→60%, 4→80%, 5→100%, <3→0). Estrutura: { min_score, scale: [{min_media, percent}] }';

alter table public.premios_colaboradores
  add column if not exists metodologia_premio jsonb;

comment on column public.premios_colaboradores.metodologia_premio is
  'Override individual da metodologia. NULL = herda da empresa.';

-- 2. Coluna no premios_folha pra marcar "fechado" sem mexer no status existente
-- (deixa o operacional pendente/aprovada/paga e separa o "lock" do mês)
alter table public.premios_folha
  add column if not exists is_locked boolean not null default false;

create index if not exists idx_premios_folha_locked
  on public.premios_folha(company_id, competencia, is_locked);

comment on column public.premios_folha.is_locked is
  'Mês fechado para ajustes (linha bloqueada). True = não permite update do premio_value.';

-- ============================================================
-- DONE
-- ============================================================