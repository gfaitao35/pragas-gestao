# Guia de Migração: Electron + SQLite → Vercel + Neon

## Visão Geral
Este guia migra seu sistema de um app desktop (Electron) para um site acessível
de qualquer lugar, com banco de dados PostgreSQL na nuvem (Neon).

---

## PASSO 1 — Criar o banco de dados no Neon (gratuito)

1. Acesse **https://neon.tech** e crie uma conta (pode usar Google/GitHub)
2. Clique em **"New Project"** → dê um nome (ex: `gestao-pragas`)
3. Selecione a região **South America (São Paulo)** para menor latência
4. Após criar, copie a **Connection String** — vai parecer com:
   ```
   postgresql://usuario:senha@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
   ```
5. No painel do Neon, clique em **"SQL Editor"**
6. Cole TODO o conteúdo do arquivo `schema.sql` e clique em **Run**
   - Isso cria todas as tabelas no PostgreSQL

---

## PASSO 2 — Migrar os dados existentes do SQLite para o Neon

> ⚠️ Faça isso ANTES de apagar qualquer coisa do projeto atual

1. Instale o script de migração:
   ```bash
   npm install @neondatabase/serverless better-sqlite3
   ```

2. Crie um arquivo `migrate-data.js` na raiz do projeto:
   ```js
   const Database = require('better-sqlite3')
   const { neon } = require('@neondatabase/serverless')
   const path = require('path')

   const DATABASE_URL = 'COLE_SUA_CONNECTION_STRING_AQUI'
   const SQLITE_PATH = './data/app.db' // ajuste o caminho se necessário

   const sqlite = new Database(SQLITE_PATH)
   const sql = neon(DATABASE_URL)

   async function migrate() {
     const tables = [
       'users', 'clientes', 'ordens_servico', 'certificados',
       'contratos', 'parcelas', 'document_templates',
       'categorias_financeiras', 'lancamentos_financeiros',
       'empresa_config', 'servicos', 'password_resets',
       'laudos', 'cliente_documentos'
     ]

     for (const table of tables) {
       console.log(`Migrando ${table}...`)
       const rows = sqlite.prepare(`SELECT * FROM ${table}`).all()
       for (const row of rows) {
         const cols = Object.keys(row)
         const vals = cols.map(c => row[c])
         const placeholders = cols.map((_, i) => `$${i+1}`).join(', ')
         try {
           await sql.query(
             `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
             vals
           )
         } catch(e) {
           console.error(`Erro em ${table}:`, e.message)
         }
       }
       console.log(`✅ ${table}: ${rows.length} registros`)
     }
     console.log('\n✅ Migração concluída!')
   }

   migrate().catch(console.error)
   ```

3. Execute:
   ```bash
   node migrate-data.js
   ```

---

## PASSO 3 — Atualizar o código do projeto

### 3.1 Substituir os arquivos migrados

Copie todos os arquivos da pasta `migration/` para as respectivas pastas do projeto:

```
migration/lib/db.ts              → lib/db.ts
migration/next.config.mjs        → next.config.mjs
migration/app/api/clientes/      → app/api/clientes/
migration/app/api/ordens/        → app/api/ordens/
migration/app/api/contratos/     → app/api/contratos/
migration/app/api/lancamentos/   → app/api/lancamentos/
migration/app/api/parcelas/      → app/api/parcelas/
migration/app/api/categorias/    → app/api/categorias/
migration/app/api/servicos/      → app/api/servicos/
migration/app/api/certificados/  → app/api/certificados/
migration/app/api/laudos/        → app/api/laudos/
migration/app/api/modulos/       → app/api/modulos/
migration/app/api/user/          → app/api/user/
```

### 3.2 Atualizar dependências

Execute no terminal dentro da pasta do projeto:
```bash
npm uninstall better-sqlite3 electron electron-builder wait-on open
npm install @neondatabase/serverless
```

### 3.3 Apagar arquivos do Electron (não são mais necessários)

Apague os arquivos:
- `main.js`
- `preload.js`
- `updater.js`
- `migrate.js`
- `build-installer.bat`
- `gerar-update.ps1`
- `scripts/prepare-electron.js`

### 3.4 Criar arquivo de variáveis de ambiente local

Crie um arquivo `.env.local` na raiz do projeto:
```
DATABASE_URL=postgresql://usuario:senha@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
```
> ⚠️ NUNCA suba esse arquivo para o GitHub — o `.gitignore` já deve ignorar `.env.local`

---

## PASSO 4 — Testar localmente

```bash
npm run dev
```

Acesse http://localhost:3000 e teste todas as funcionalidades.

---

## PASSO 5 — Subir para a Vercel (gratuito)

### 5.1 Criar repositório no GitHub

1. Acesse **https://github.com** e crie um repositório novo (pode ser privado)
2. Na pasta do projeto, execute:
   ```bash
   git init
   git add .
   git commit -m "Migração para Vercel + Neon"
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```

### 5.2 Conectar na Vercel

1. Acesse **https://vercel.com** e crie uma conta (use GitHub para login)
2. Clique em **"Add New Project"**
3. Selecione o repositório que você criou
4. Antes de clicar em Deploy, vá em **"Environment Variables"** e adicione:
   - Nome: `DATABASE_URL`
   - Valor: sua connection string do Neon
5. Clique em **Deploy**

Em ~2 minutos seu site estará no ar com uma URL como:
`https://gestao-pragas-xxx.vercel.app`

### 5.3 (Opcional) Domínio personalizado

No painel da Vercel você pode adicionar um domínio próprio (ex: `sistema.empresadamae.com.br`)
gratuitamente, se você já tiver o domínio.

---

## PASSO 6 — Uploads de arquivos (imagens, PDFs)

> ⚠️ Atenção especial: a Vercel não tem disco permanente.

Atualmente o sistema salva uploads em `public/uploads/`. Na Vercel isso não funciona
porque cada deploy recria os arquivos.

**Solução recomendada: Cloudflare R2 ou Vercel Blob (gratuito até 1GB)**

Para usar Vercel Blob, atualize `app/api/uploads/route.ts`:

```ts
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const blob = await put(file.name, file, { access: 'public' })
  return NextResponse.json({ url: blob.url })
}
```

E instale: `npm install @vercel/blob`

No painel da Vercel, vá em **Storage → Blob → Create Store** e adicione
`BLOB_READ_WRITE_TOKEN` nas variáveis de ambiente.

---

## Resumo de variáveis de ambiente necessárias na Vercel

| Variável | Onde pegar |
|---|---|
| `DATABASE_URL` | Painel do Neon → Connection String |
| `BLOB_READ_WRITE_TOKEN` | Painel da Vercel → Storage → Blob |
| `NEXTAUTH_SECRET` | Gere com: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL do seu site na Vercel (ex: https://meusite.vercel.app) |

---

## Segurança

- ✅ HTTPS automático na Vercel
- ✅ Banco Neon com SSL obrigatório
- ✅ Dados isolados por `user_id` em todas as queries
- ✅ Backups automáticos diários no Neon (plano gratuito)
- ✅ Zero acesso físico ao servidor (gerenciado pela Vercel/Neon)

---

## Suporte

- Neon docs: https://neon.tech/docs
- Vercel docs: https://vercel.com/docs
- @neondatabase/serverless: https://github.com/neondatabase/serverless
