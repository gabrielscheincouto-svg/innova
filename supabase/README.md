# Supabase · setup do banco

## Passo a passo

### 1. Criar projeto
1. Vá em https://app.supabase.com
2. **New Project** → escolha região São Paulo (sa-east-1) — melhor latência pro Brasil
3. Anote o **database password** (não vai precisar agora, mas guarde)
4. Espere ~2 min até o projeto ficar verde

### 2. Rodar o schema
1. Menu lateral → **SQL Editor** → **New query**
2. Abra `supabase/schema.sql` deste repo, copie tudo
3. Cole no SQL Editor e clique **RUN** (botão verde no canto)
4. Deve aparecer "Success. No rows returned"

### 3. Criar usuário gestor
1. Menu lateral → **Authentication** → **Users**
2. Clique **Add user** → **Create new user**
3. Preencha:
   - **Email**: `gestor@innova.com.br`
   - **Password**: `Innova@2026` (você troca depois no primeiro login)
   - **Auto Confirm Email**: ✅ marcado
4. Clique **Create user**
5. Clique no usuário recém-criado → copie o **UUID** mostrado em "User UID"

### 4. Rodar o seed
1. Volte em **SQL Editor** → **New query**
2. Abra `supabase/seed.sql`
3. **TROQUE** o UUID `00000000-0000-0000-0000-000000000000` pelo UUID que você copiou
4. Cole tudo no SQL Editor e clique **RUN**

### 5. Pegar as keys
1. Menu lateral → **Settings** → **API**
2. Copie:
   - **Project URL** → vai no `.env` como `VITE_SUPABASE_URL`
   - **anon public key** → vai como `VITE_SUPABASE_ANON_KEY`
3. NUNCA copie a `service_role` pro frontend — só backend.

### 6. Pronto pra rodar
```bash
cp .env.example apps/gestor/.env
# Edite apps/gestor/.env com URL + anon key
npm install
npm run dev:gestor
```

Login: `gestor@innova.com.br` / `Innova@2026`

## Arquitetura de RLS

Toda tabela tem Row Level Security ativo. As policies seguem o padrão:

| Quem | Acesso |
|---|---|
| **Gestor** | Tudo · todas as empresas · todos os usuários |
| **Profissional** | Empresas que ele atende (via `user_companies`) |
| **Proprietário** | Apenas a sua empresa |
| **Colaborador** | Não loga · acessa só por token de avaliação |

## Helpers SQL disponíveis

```sql
-- No SQL: pega role do usuário logado
select public.current_user_role();

-- No SQL: checa se é gestor
select public.is_gestor();

-- No SQL: checa se usuário tem acesso a uma empresa
select public.has_company_access('uuid-da-empresa');
```

Use estes helpers em queries customizadas pra respeitar as policies.

## Storage buckets (próxima fase)

Quando rodarmos NR1, criar buckets:
- `laudos` — PDFs assinados (privado, só gestor + dono da empresa)
- `evidencias` — fotos do plano de ação (privado por empresa)
- `assinaturas` — imagens de assinatura digital (privado)

Comando:
```sql
insert into storage.buckets (id, name, public) values
  ('laudos', 'laudos', false),
  ('evidencias', 'evidencias', false),
  ('assinaturas', 'assinaturas', false);
```

## Backup

Supabase free tier não tem backup automático. Habilite no plano Pro ou faça dump manual:

```bash
supabase db dump -f backup-$(date +%Y%m%d).sql
```
