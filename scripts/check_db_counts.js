#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath = path.join(process.cwd(), 'data', 'app.db')
if (!fs.existsSync(dbPath)) {
  console.error('Banco de dados não encontrado em', dbPath)
  process.exit(1)
}

const db = new Database(dbPath, { readonly: true })
const tables = [
  'users', 'clientes', 'contratos', 'parcelas', 'lancamentos_financeiros',
  'ordens_servico', 'certificados', 'document_templates', 'categorias_financeiras'
]

const result = {}
for (const t of tables) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get()
    result[t] = row ? row.c : 0
  } catch (err) {
    result[t] = `error: ${err.message}`
  }
}

console.log(JSON.stringify(result, null, 2))
