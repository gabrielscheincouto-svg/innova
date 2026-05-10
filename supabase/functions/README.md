# Supabase Edge Functions

Funções serverless rodando em Deno na infra Supabase.

## Funções disponíveis

### `generate-laudo`

Gera o PDF do Laudo PGR · NR-1 a partir de `assessment_id`. Retorna o PDF binário pra download direto.

**Endpoint:** `POST /functions/v1/generate-laudo`

**Body:**
```json
{ "assessment_id": "uuid-da-avaliação" }
```

**Auth:** requer JWT do Supabase no header `Authorization: Bearer <token>`. Permitidos:
- `gestor` · sempre pode gerar
- `profissional` · sempre pode gerar
- `proprietario` · só se tem vínculo com a empresa do assessment

**Response:** `application/pdf` (download direto · headers inclui hash SHA-256 do documento)

**Side effects:**
- Cria entrada em `audit_logs` (action = `laudo_generated`)
- Upload do PDF em `storage.laudos/<company_id>/<assessment_id>-<timestamp>.pdf` (best-effort · ignora se bucket não existir)

## Setup do bucket de storage (opcional · recomendado)

Se quiser que os PDFs gerados fiquem armazenados no Storage (acessíveis depois sem regerar):

```sql
-- Cria o bucket privado 'laudos'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('laudos', 'laudos', false, 10485760, array['application/pdf'])
on conflict do nothing;

-- Política: gestor + profissional podem fazer upload
create policy "laudos_insert_staff"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'laudos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('gestor', 'profissional')
    )
  );

-- Política: leitura — staff vê tudo, proprietário vê só de empresas vinculadas
create policy "laudos_read_staff"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'laudos'
    and (
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('gestor', 'profissional')
      )
      or exists (
        select 1 from public.user_companies
        where profile_id = auth.uid()
        and company_id::text = split_part(name, '/', 1)
      )
    )
  );
```

## Deploy

### 1. Instale o Supabase CLI
```bash
npm install -g supabase
# ou: brew install supabase/tap/supabase
```

### 2. Faça login
```bash
supabase login
```

### 3. Linka o projeto local com o projeto remoto
```bash
cd "Innova capital"
supabase link --project-ref <seu-project-ref>
# project-ref aparece na URL do dashboard: https://app.supabase.com/project/<ref>
```

### 4. Deploy a função
```bash
supabase functions deploy generate-laudo --no-verify-jwt
```

> ⚠ A flag `--no-verify-jwt` é importante porque a função verifica o JWT internamente (precisa do header pra rotear pelo role). Se não usar, o gateway do Supabase derruba antes de chegar na função.

### 5. Verifica
```bash
# Lista as funções deployadas
supabase functions list

# Vê os logs em tempo real
supabase functions logs generate-laudo --tail
```

### 6. Variáveis de ambiente

A função usa essas variáveis (já injetadas automaticamente pelo Supabase):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Se quiser sobrescrever:
```bash
supabase secrets set SOME_KEY=valor
```

## Testando localmente (opcional)

Pra rodar a função localmente antes de deploy:

```bash
supabase start                     # sobe Postgres + Auth local
supabase functions serve generate-laudo
```

Em outro terminal:
```bash
curl -X POST http://localhost:54321/functions/v1/generate-laudo \
  -H "Authorization: Bearer SEU-JWT" \
  -H "Content-Type: application/json" \
  -d '{"assessment_id":"UUID"}' \
  --output laudo.pdf
```

## Estrutura

```
supabase/functions/
├── _shared/
│   └── cors.ts              # Headers CORS compartilhados
└── generate-laudo/
    ├── deno.json            # Imports map (pdf-lib)
    ├── index.ts             # Handler principal
    └── pdf-builder.ts       # Lógica de montagem do PDF (5 páginas)
```

## Custos

Edge Functions no Supabase free tier: **500K invocations/mês**, **2M GB-s**. Dá tranquilo pra centenas de laudos por mês mesmo com pico.

## Próximas funções planejadas

- `send-assessment-link` · envia o link da avaliação via WhatsApp Business API + email
- `transmit-s2240` · transmite o evento eSocial S-2240 para o webservice oficial
- `generate-ata-457` · gera PDF da ata de premiação Art. 457
