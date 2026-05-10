# Innova Capital · monorepo

Ecossistema de **3 sistemas SaaS** para gestão de pessoas no Brasil.

```
innova-capital/
├── apps/
│   ├── gestor/         🟢 Sistema Gestor (admin master · porta 5173)
│   ├── nr1/            🟢 Sistema NR1 (3 perfis · porta 5174)
│   └── premiacoes/     🟢 Sistema Premiações (Art. 457 §2 · porta 5175)
├── packages/
│   ├── ui/             Design system Innova (Tailwind + tokens)
│   ├── supabase/       Cliente Supabase + tipos
│   └── auth/           Hooks de autenticação compartilhados
└── supabase/           Schema SQL · RLS · seed · sample data
```

## 🚀 Setup completo (10 minutos)

### 1. Pré-requisitos
- Node.js >= 18 · npm >= 9
- Conta no [Supabase](https://app.supabase.com) (free tier serve)
- Editor (VS Code recomendado)

### 2. Clone e instale
```bash
cd "Innova capital"
npm install
```

### 3. Configure Supabase (5 min)

1. Crie um novo projeto em https://app.supabase.com (região São Paulo)
2. Vá em **SQL Editor → New query** → cole `supabase/schema.sql` → **Run** (cria tabelas + RLS + funções)
3. **Authentication → Users → Add user**:
   - Email: `gestor@innova.com.br`
   - Password: `Innova@2026`
   - ✅ Auto Confirm Email
4. Clique no usuário criado, copie o **UUID**
5. Abra `supabase/seed.sql`, **substitua** `00000000-0000-0000-0000-000000000000` pelo UUID copiado, cole no SQL Editor → **Run**
6. (Opcional · recomendado) Cole `supabase/sample-data.sql` → **Run** — cria 3 empresas demo, IPAR, plano de ação, programa 457 e atas
7. **Settings → API** → copie `URL` e `anon public` key

### 4. Configure variáveis de ambiente

Crie um `.env` em cada app com as keys:

```bash
# Gestor
cp apps/gestor/.env.example apps/gestor/.env

# NR1
cp apps/nr1/.env.example apps/nr1/.env

# Premiações
cp apps/premiacoes/.env.example apps/premiacoes/.env
```

Edite os 3 arquivos `.env` colando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` que você copiou da Supabase.

### 5. Rode!

```bash
# Em terminais separados:
npm run dev:gestor       # http://localhost:5173
npm run dev:nr1          # http://localhost:5174
npm run dev:premiacoes   # http://localhost:5175
```

Login em qualquer um dos 3: `gestor@innova.com.br` / `Innova@2026`

## 🔑 Credenciais e perfis

| Sistema | Acesso | Como | Login |
|---|---|---|---|
| **Gestor** (porta 5173) | Apenas perfil `gestor` | Email + senha | `gestor@innova.com.br` |
| **NR1** (porta 5174) | `profissional`, `proprietario`, `gestor` | Email + senha | mesmo |
| **NR1 · colaborador** | Funcionário do cliente | Token + CPF | URL `/c/<token>` |
| **Premiações** (porta 5175) | `proprietario`, `gestor`, `profissional` | Email + senha | mesmo |

Para criar mais usuários (proprietário, profissional), faça login no **Gestor** → Usuários → "+ Convidar".

Para criar avaliações no NR1: faça login → Avaliações → "+ Nova avaliação" → o sistema gera o token e o link `/c/<token>` que você envia ao colaborador.

## 🏗 Arquitetura

### Stack
- **React 18 + Vite + TypeScript** · SPAs rápidas, type-safe
- **Tailwind CSS** com tokens Innova (Inter + DM Serif + paleta roxa)
- **Supabase** · auth, Postgres, Row Level Security
- **React Router v6** · navegação client-side
- **Zustand** · estado simples e tipado

### Modelo de dados (11 tabelas)

| Tabela | Função |
|---|---|
| `profiles` | Usuários (extends `auth.users`) com role |
| `companies` | Empresas-cliente |
| `user_companies` | Vínculo many-to-many com `system_access[]` |
| `audit_logs` | Trilha imutável de ações sensíveis |
| `assessments` | Avaliações NR-1 com token público |
| `copsoq_responses` | Respostas anônimas (sem ligação ao usuário) |
| `ipar_items` | Inventário de Riscos e Avaliação |
| `action_plan` | Plano de Ação PGR |
| `hazard_communications` | Comunicação de perigo dos colaboradores |
| `premiacao_programs` | Programas de premiação Art. 457 |
| `premiacao_atas` | Atas mensais aprovadas e pagas |

### Roles e segurança

- **`gestor`** · admin master (acesso total)
- **`profissional`** · faz laudos NR-1 (técnico SST)
- **`proprietario`** · cliente, vê laudos/relatórios da sua empresa
- **`colaborador`** · NÃO loga · acessa por token único + CPF + nascimento

Toda tabela tem **Row Level Security** ativo. Helpers SQL:
- `is_gestor()` · checa se é gestor
- `has_company_access(company_id)` · checa vínculo
- `current_user_role()` · retorna role do logado

Audit log automático em ações críticas (login, logout, reset de senha, criar/editar/deletar empresa, etc).

## 🌐 Deploy (Netlify)

Cada app é um site Netlify separado, todos apontando pro mesmo repo:

1. **Push no GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <seu-repo>
   git push -u origin main
   ```

2. No **Netlify Dashboard** → "Add new site" → "Import from GitHub"
3. Selecione este repositório
4. Para cada um dos 3 sites configure:
   - **Site 1 (Gestor)**: Base directory `apps/gestor`, Build `npm run build:gestor`, Publish `apps/gestor/dist`
   - **Site 2 (NR1)**: Base `apps/nr1`, Build `npm run build:nr1`, Publish `apps/nr1/dist`
   - **Site 3 (Premiações)**: Base `apps/premiacoes`, Build `npm run build:premiacoes`, Publish `apps/premiacoes/dist`
5. Em cada site → Site settings → Environment variables → adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
6. **Custom domains** (quando tiver `innova.com.br`):
   - Site 1: `gestor.innova.com.br`
   - Site 2: `nr1.innova.com.br`
   - Site 3: `premios.innova.com.br`

O `netlify.toml` raiz e os `netlify.toml` em cada app cuidam dos defaults (SPA redirect, headers de segurança, cache).

## 📦 Comandos

```bash
# Dev (cada um em terminal separado)
npm run dev:gestor
npm run dev:nr1
npm run dev:premiacoes

# Build de produção
npm run build:gestor
npm run build:nr1
npm run build:premiacoes
npm run build:all          # os 3 de uma vez

# Type-check (todos)
npm run type-check

# Preview do build
npm run preview:gestor
npm run preview:nr1
npm run preview:premiacoes
```

## 🧪 Testando

Com a sample data carregada, ao logar como gestor você vai ver:

**No Gestor:**
- Dashboard com KPIs reais (3 empresas, 1 usuário, etc)
- Página Empresas com Acme/Atende+/Vila Nova
- Página Auditoria com logs

**No NR1:**
- Dashboard com 1 avaliação em curso, 5 itens IPAR, 3 ações abertas
- IPAR completo com 5 perigos e classificação automática P×S
- Plano de Ação com 3 ações em diferentes statuses
- Comunicações com 3 reportes
- Avaliações com link copiável `/c/<token>`

**No Premiações:**
- Dashboard com programa ativo + 2 atas pagas
- Programas com Programa de Performance Logística
- Atas com Q1 2026 (R$ 18.200) e Q4 2025 (R$ 15.500)
- Calculadora interativa de economia em encargos

**Para testar o fluxo do colaborador (NR1):**
1. No NR1 → Avaliações → copie o link
2. Cole em uma nova aba (estilo `localhost:5174/c/abcdef123`)
3. Valide com qualquer CPF de 11 dígitos + data de nascimento
4. Aceite o TCLE
5. Responda o COPSOQ II ou comunique um perigo
6. Volte ao app profissional → Comunicações para ver a entrada

## 🗺 Roadmap

- [x] Fase 1 — Fundação (monorepo + design system + Supabase + auth)
- [x] Fase 2 — Sistema Gestor (CRUD empresas/usuários + audit log)
- [x] Fase 3 — Sistema NR1 (3 perfis + IPAR + Plano + Avaliação + Token público)
- [x] Fase 4 — Sistema Premiações (Programas + Atas + Calculadora)
- [ ] Fase 5 — Edge Function para gerar PDF do laudo PGR
- [ ] Fase 6 — Integração eSocial S-2240 real
- [ ] Fase 7 — WhatsApp Business API + ICP-Brasil

## 📞 Suporte

Time Innova · contato@innova.com.br
