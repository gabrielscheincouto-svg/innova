# Innova Capital · Relatório de Deploy

> Data: 10/05/2026
> Status: **PRONTO PRA SUBIR — falta 1 comando**

---

## TL;DR — Acordou? Roda isso:

```bash
cd "/Users/gabrielcouto/Library/CloudStorage/OneDrive-Pessoal/sistema claude/Innova capital"
bash scripts/deploy-now.sh
```

Vai te pedir um GitHub Personal Access Token. Se não tiver, gera em:
**https://github.com/settings/tokens** (escopo `repo`, expiração 30 dias).

Depois do push, Netlify rebuilda sozinho em ~2-3 min e tudo fica no ar.

**Tudo o resto eu já configurei enquanto você dormia:**
- Env vars no Netlify ✅
- Build settings do Netlify atualizadas via API ✅ (cmd: `bash scripts/build-all.sh`, dir: `dist`, package_path: vazio)
- Build local validado (`dist/` gerado com sucesso, 3 apps consolidados) ✅
- Todos os arquivos modificados no projeto ✅

---

## O que tá pronto

### 1. Código local (3 apps + monorepo) ✅
Em `apps/gestor`, `apps/nr1`, `apps/premiacoes`:
- Cada um com `vite.config.ts` configurado com `base: '/{app}/'`
- Cada um com `<BrowserRouter basename="/{app}">` no `main.tsx`
- Build local testado e funcionando (`bash scripts/build-all.sh` → tudo em `dist/`)

### 2. Supabase ✅
- Schema aplicado (11 tabelas + RLS + funções)
- Sample data carregada (3 empresas, IPAR, plano, programa 457, atas)
- Edge Function `generate-laudo` (PDF do PGR) implementada mas **ainda não deployada** (precisa Supabase CLI)
- Usuário gestor criado: `gestor@innova.com.br` / `Innova@2026`

### 3. Netlify env vars ✅
Já adicionei no projeto `inovacapital`:
- `VITE_SUPABASE_URL` = `https://ifxvtivfqvzyurwfruuk.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `sb_publishable_LCL5SmNvd1oxTtxA2sbCwg_H-gsWaG_`

### 4. GitHub ✅ (mas com versão antiga)
Repo `gabrielscheincouto-svg/innova` existe com a 1ª versão do código (3 sites separados). O `deploy-now.sh` faz `git push --force` pra atualizar com a versão nova (1 site, subpaths).

---

## O que falta · 3 ações suas (5 minutos)

### Ação 1 · Push pro GitHub
```bash
cd "/Users/gabrielcouto/Library/CloudStorage/OneDrive-Pessoal/sistema claude/Innova capital"
bash scripts/deploy-now.sh
```

### Ação 2 · Atualizar build settings no Netlify (opcional · `netlify.toml` já faz isso)
Por garantia, em `app.netlify.com/projects/inovacapital/configuration/deploys`:
- **Package directory:** limpar (deixar vazio)
- **Build command:** `bash scripts/build-all.sh`
- **Publish directory:** `dist`

> Se você não fizer isso, o `netlify.toml` que vai junto com o push já tem essas configs e elas sobrescrevem o dashboard. Mas é mais limpo deixar o dashboard alinhado.

### Ação 3 · Deploy da Edge Function (opcional · só precisa quando for usar o laudo PDF)
```bash
brew install supabase/tap/supabase
supabase login
cd "/Users/gabrielcouto/Library/CloudStorage/OneDrive-Pessoal/sistema claude/Innova capital"
supabase link --project-ref ifxvtivfqvzyurwfruuk
supabase functions deploy generate-laudo
```

---

## Como vai ficar

Depois do `bash scripts/deploy-now.sh`, em ~3 minutos Netlify termina o build e você acessa:

| URL | O que é |
|-----|---------|
| `https://inovacapital.netlify.app/` | Landing com 3 cards |
| `https://inovacapital.netlify.app/gestor` | Painel master (admin) |
| `https://inovacapital.netlify.app/nr1` | Sistema NR-1 (3 perfis) |
| `https://inovacapital.netlify.app/premios` | Premiação 457 §2 |
| `https://inovacapital.netlify.app/c/<token>` | Atalho colaborador (redireciona pra /nr1/c/...) |

Login em qualquer um dos 3 sistemas:
- **Email:** gestor@innova.com.br
- **Senha:** Innova@2026

---

## O que testar quando o site tiver no ar

### Gestor (`/gestor`)
- Login funciona
- Dashboard mostra 3 empresas (Acme, Atende+, Vila Nova) e KPIs
- Página "Empresas" lista as 3 com seus dados
- Página "Auditoria" mostra log do login

### NR1 (`/nr1`)
- Login funciona
- Como `gestor`, você vê visão master: 1 avaliação em curso, 5 itens IPAR, 3 ações
- Página "IPAR" mostra 5 perigos com P×S classificado
- Página "Avaliações" tem 1 com link `/c/<token>` copiável
- Copiar o link, abrir em aba anônima, validar CPF + nascimento, responder COPSOQ
- Voltar pro `/nr1`, ver a resposta em "Comunicações"

### Premiações (`/premios`)
- Login funciona
- Dashboard mostra programa ativo + 2 atas pagas (Q4/2025 R$ 15.500, Q1/2026 R$ 18.200)
- Calculadora interativa mostra economia em encargos (~R$ 1.190 por ata)

---

## O que mudou nessa sessão

### Pivot principal: **3 sites Netlify → 1 site com subpaths**
- Você pediu: *"mas pode ser um site só"* e *"ficando /nr1 por exemplo cada um"*
- Refiz a estrutura: agora é UM build (`scripts/build-all.sh`) que gera `dist/gestor`, `dist/nr1`, `dist/premios` + uma `dist/index.html` de landing
- `netlify.toml` consolidado com SPA redirects por subpath
- Cada Vite app tem `base: '/{app}/'`
- Cada React Router tem `basename="/{app}"`
- Atalho `/c/*` redireciona pra `/nr1/c/*` (link curto pro colaborador)

### Bugs corrigidos durante a sessão
- TypeScript `tsc -b` conflitava com Vite dist → trocado pra `tsc --noEmit && vite build`
- Tipos do Supabase causavam erros `never` → simplifiquei pra `SupabaseClient` puro
- Schema do Supabase não aplicado → causava tela em branco no login → resolvido
- CPF mask edge case na área do colaborador → regex ajustado

### Bug residual (não-bloqueante)
- Build do package `@innova/supabase` gera um chunk vazio (warning do Vite "Generated an empty chunk: supabase"). Não impede o funcionamento, mas pode ser limpado depois removendo o `manualChunks.supabase` dos `vite.config.ts`.

---

## Arquivos importantes pra você ver

- `scripts/deploy-now.sh` — script único de deploy (rode esse!)
- `scripts/build-all.sh` — build dos 3 apps consolidado
- `netlify.toml` — config Netlify com subpath redirects
- `package.json` — agora tem `npm run build` que chama o build-all
- `apps/*/vite.config.ts` — com `base: '/<app>/'`
- `apps/*/src/main.tsx` — com `basename="/<app>"`
- `supabase/schema.sql` — schema completo
- `supabase/sample-data.sql` — dados de demo

---

## Resumo financeiro do projeto

Você começou com a ideia "vamos vender NR-1" e a gente entregou:

1. **Plano de negócio** (NR-1 + Art. 457 §2)
2. **Landing page** profissional estilo Cimed com branding Innova
3. **3 sistemas SaaS completos** com Supabase + RLS + auth + audit
4. **Edge Function** pra gerar laudo PGR em PDF
5. **Infra Netlify + GitHub + Supabase** integradas

Pronto pra começar a vender. Bom descanso 👋
