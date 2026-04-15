#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const args = process.argv.slice(2)
const yes = args.includes('--yes')

const dbPath = path.join(process.cwd(), 'data', 'app.db')
if (!fs.existsSync(dbPath)) {
  console.error('Banco de dados não encontrado em', dbPath)
  process.exit(1)
}

console.log('Este script irá REMOVER dados do banco localizado em', dbPath)
console.log('Tabelas afetadas: lancamentos_financeiros, parcelas, contratos, ordens_servico, certificados, document_templates, categorias_financeiras, clientes, users')
if (!yes) {
  console.log('\nPara executar, rode:')
  console.log('  node scripts/reset_database.js --yes')
  process.exit(0)
}

const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

try {
  const clear = db.transaction(() => {
    const res = {}
    res.lancamentos = db.prepare('DELETE FROM lancamentos_financeiros').run().changes
    res.parcelas = db.prepare('DELETE FROM parcelas').run().changes
    res.contratos = db.prepare('DELETE FROM contratos').run().changes
    res.ordens = db.prepare('DELETE FROM ordens_servico').run().changes
    res.certificados = db.prepare('DELETE FROM certificados').run().changes
    res.templates = db.prepare('DELETE FROM document_templates').run().changes
    res.categorias = db.prepare('DELETE FROM categorias_financeiras').run().changes
    res.clientes = db.prepare('DELETE FROM clientes').run().changes
    res.users = db.prepare('DELETE FROM users').run().changes
    return res
  })()

  console.log('Reset concluído. Registros removidos:')
  console.table(clear)
  process.exit(0)
} catch (err) {
  console.error('Erro ao resetar o banco:', err)
  process.exit(2)
}
