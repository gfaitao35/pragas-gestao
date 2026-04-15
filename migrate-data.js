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