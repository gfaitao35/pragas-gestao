const path = require('path')
const Database = require('better-sqlite3')

const dbPath = path.join(process.cwd(), 'data', 'app.db')
const db = new Database(dbPath, { readonly: true })

const userId = db.prepare('SELECT id FROM users LIMIT 1').get()?.id
if (!userId) {
  console.error('No user found')
  process.exit(1)
}

const data_inicio = process.argv[2] || null
const data_fim = process.argv[3] || null

function run() {
  const osQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN liquidado = 1 THEN COALESCE(valor_pago, valor, 0) ELSE 0 END), 0) as os_recebido
      FROM ordens_servico WHERE user_id = ?
  `
  const osResumo = db.prepare(osQuery).get(userId)

  const parcelasQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN p.status = 'paga' THEN COALESCE(p.valor_pago, p.valor_parcela, 0) ELSE 0 END), 0) as parcelas_recebido
      FROM parcelas p
      LEFT JOIN contratos c ON p.contrato_id = c.id
      WHERE c.user_id = ? AND c.status IN ('ativo', 'concluido')
  `
  const parcelasResumo = db.prepare(parcelasQuery).get(userId)

  const lancQuery = `
    SELECT COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor ELSE 0 END), 0) as receitas_pagas
    FROM lancamentos_financeiros WHERE user_id = ? AND referencia_tipo = 'manual'
  `
  const lancResumo = db.prepare(lancQuery).get(userId)

  const contratosQuery = `SELECT COALESCE(SUM(valor_total), 0) as contratos_total FROM contratos WHERE user_id = ? AND status IN ('ativo', 'concluido')`
  const contratosResumo = db.prepare(contratosQuery).get(userId)

  const parcelasIndepQuery = `SELECT COALESCE(SUM(CASE WHEN status = 'paga' THEN COALESCE(valor_pago, valor_parcela, 0) ELSE 0 END),0) as parcelas_recebido_indep FROM parcelas p WHERE p.contrato_id IS NULL`
  const parcelasIndepResumo = db.prepare(parcelasIndepQuery).get()

  const total = {
    os: osResumo.os_recebido,
    parcelas_total_contratos: parcelasResumo.parcelas_recebido_contratos,
    parcelas_independentes: parcelasIndepResumo.parcelas_recebido_indep,
    lancamentos_manuais: lancResumo.receitas_pagas,
    contratos: contratosResumo.contratos_total,
    receita_total: osResumo.os_recebido + contratosResumo.contratos_total + parcelasIndepResumo.parcelas_recebido_indep + lancResumo.receitas_pagas
  }
  console.log(JSON.stringify(total, null, 2))
}

run()
