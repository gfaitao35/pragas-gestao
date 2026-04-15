const Database = require('better-sqlite3')
const path = require('path')

const id = process.argv[2]
if (!id) {
  console.error('Usage: node check_contract.js <contract_id>')
  process.exit(2)
}

const dbPath = path.join(process.cwd(), 'data', 'app.db')
try {
  const db = new Database(dbPath, { readonly: true })
  const contrato = db.prepare('SELECT id, user_id, cliente_id, numero_contrato FROM contratos WHERE id = ?').get(id)
  if (!contrato) {
    console.log('NOT FOUND')
    process.exit(0)
  }
  const parcelas = db.prepare('SELECT id, status, valor_parcela FROM parcelas WHERE contrato_id = ? ORDER BY numero_parcela').all(id)
  console.log('CONTRATO:', contrato)
  console.log('PARCELAS_COUNT:', parcelas.length)
  console.log('PARCELAS_SAMPLE:', parcelas.slice(0,5))
} catch (err) {
  console.error('Error opening DB:', err.message)
  process.exit(1)
}
