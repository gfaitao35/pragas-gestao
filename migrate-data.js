require('dotenv').config()
const Database = require('better-sqlite3')
const { neon } = require('@neondatabase/serverless')

const sqlite = new Database('./unified.db') // ajuste o caminho se necessário
const sql = neon(process.env.DATABASE_URL)

// Ordem importa por causa de foreign keys
const TABLES = [
  'users',
  'empresa_config',
  'clientes',
  'servicos',
  'categorias_financeiras',
  'document_templates',
  'ordens_servico',
  'certificados',
  'contratos',
  'parcelas',
  'lancamentos_financeiros',
  'metas_lucro',
  'laudos',
  'cliente_documentos',
  'password_resets',
]

async function migrateTable(table) {
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all()

  if (rows.length === 0) {
    console.log(`  ⏭  ${table}: vazio, pulando`)
    return
  }

  const cols = Object.keys(rows[0])
  const colList = cols.join(', ')
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
  const query = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    const values = cols.map(c => row[c] ?? null)
    try {
      const result = await sql.query(query, values)
      if (result.rowCount === 0) {
        skipped++ // ON CONFLICT DO NOTHING — já existia
      } else {
        inserted++
      }
    } catch (e) {
      if (errors === 0) {
        console.log(`  ⚠️  Primeiro erro em ${table}: ${e.message}`)
      }
      errors++
    }
  }

  console.log(`  ✅ ${table}: ${inserted} inseridos | ${skipped} já existiam | ${errors} erros`)
}

async function main() {
  console.log('🚀 Iniciando migração SQLite → Neon...\n')

  for (const table of TABLES) {
    console.log(`📦 Migrando ${table}...`)
    try {
      await migrateTable(table)
    } catch (e) {
      console.log(`  ❌ Erro geral em ${table}: ${e.message}`)
    }
  }

  console.log('\n✅ Migração concluída!')
  sqlite.close()
}

main().catch(e => {
  console.error('Erro fatal:', e)
  process.exit(1)
})