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

function all(sql, params=[]) {
  try { return db.prepare(sql).all(...params) } catch (e) { return { error: e.message } }
}

const ordens = all('SELECT id, numero_os, valor, valor_pago, liquidado, data_liquidacao FROM ordens_servico')
const contratos = all('SELECT id, numero_contrato, valor_total, numero_parcelas FROM contratos')
const parcelas = all('SELECT id, contrato_id, numero_parcela, valor_parcela, valor_pago, status, data_pagamento FROM parcelas')
const lancamentos = all('SELECT id, tipo, descricao, valor, data_lancamento, data_pagamento, status, referencia_tipo, referencia_id FROM lancamentos_financeiros')

console.log('ORDENS:', JSON.stringify(ordens, null, 2))
console.log('CONTRATOS:', JSON.stringify(contratos, null, 2))
console.log('PARCELAS:', JSON.stringify(parcelas, null, 2))
console.log('LANCAMENTOS:', JSON.stringify(lancamentos, null, 2))
