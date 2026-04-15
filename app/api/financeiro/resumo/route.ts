import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')

    const database = getDb()

    console.log('[API resumo] userId=', userId, 'data_inicio=', data_inicio, 'data_fim=', data_fim)

    // OS receitas no periodo (excluindo OS parceladas, que contam via lancamentos)
    let osQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN liquidado = 1 AND COALESCE(num_parcelas,1) <= 1 THEN COALESCE(valor_pago, valor, 0) ELSE 0 END), 0) as os_recebido,
        COALESCE(SUM(CASE WHEN liquidado = 0 AND status != 'cancelada' AND COALESCE(num_parcelas,1) <= 1 THEN COALESCE(valor, 0) ELSE 0 END), 0) as os_pendente,
        COUNT(CASE WHEN liquidado = 1 THEN 1 END) as os_recebido_count,
        COUNT(CASE WHEN liquidado = 0 AND status != 'cancelada' THEN 1 END) as os_pendente_count
      FROM ordens_servico WHERE user_id = ?
    `
    const osParams: any[] = [userId]
    if (data_inicio) { osQuery += ' AND data_execucao >= ?'; osParams.push(data_inicio) }
    if (data_fim) { osQuery += ' AND data_execucao <= ?'; osParams.push(data_fim) }
    const osResumo = database.prepare(osQuery).get(...osParams) as any
    console.log('[API resumo] osResumo=', osResumo)

    // Parcelas receitas no periodo
    // a) Parcela vinculadas a contratos (para display)
    let parcelasContratoQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN p.status = 'paga' THEN COALESCE(p.valor_pago, p.valor_parcela, 0) ELSE 0 END), 0) as parcelas_recebido_contratos,
        COALESCE(SUM(CASE WHEN p.status IN ('pendente', 'atrasada') THEN p.valor_parcela ELSE 0 END), 0) as parcelas_pendente_contratos,
        COUNT(CASE WHEN p.status = 'paga' THEN 1 END) as parcelas_pago_count_contratos,
        COUNT(CASE WHEN p.status IN ('pendente', 'atrasada') THEN 1 END) as parcelas_pendente_count_contratos,
        COUNT(CASE WHEN p.status = 'atrasada' OR (p.status = 'pendente' AND p.data_vencimento < date('now')) THEN 1 END) as parcelas_atrasadas_count_contratos
      FROM parcelas p
      LEFT JOIN contratos c ON p.contrato_id = c.id
      WHERE c.user_id = ? AND c.status IN ('ativo', 'concluido')
    `
    const parcelasContratoParams: any[] = [userId]
    if (data_inicio) { parcelasContratoQuery += ' AND p.data_vencimento >= ?'; parcelasContratoParams.push(data_inicio) }
    if (data_fim) { parcelasContratoQuery += ' AND p.data_vencimento <= ?'; parcelasContratoParams.push(data_fim) }
    const parcelasContratoResumo = database.prepare(parcelasContratoQuery).get(...parcelasContratoParams) as any
    console.log('[API resumo] parcelasContratoResumo=', parcelasContratoResumo)

    // b) Parcelas nao vinculadas a contratos (contabilizar na receita)
    let parcelasIndepQuery = `
      SELECT COALESCE(SUM(CASE WHEN status = 'paga' THEN COALESCE(valor_pago, valor_parcela, 0) ELSE 0 END), 0) as parcelas_recebido_indep
      FROM parcelas p WHERE p.contrato_id IS NULL
    `
    const parcelasIndepParams: any[] = []
    if (data_inicio) { parcelasIndepQuery += ' AND p.data_vencimento >= ?'; parcelasIndepParams.push(data_inicio) }
    if (data_fim) { parcelasIndepQuery += ' AND p.data_vencimento <= ?'; parcelasIndepParams.push(data_fim) }
    const parcelasIndepResumo = database.prepare(parcelasIndepQuery).get(...parcelasIndepParams) as any
    console.log('[API resumo] parcelasIndepResumo=', parcelasIndepResumo)

    // Lancamentos no periodo — manuais E parcelas de OS criadas automaticamente
    let lancQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor ELSE 0 END), 0) as receitas_pagas,
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pendente' THEN valor ELSE 0 END), 0) as receitas_pendentes,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor ELSE 0 END), 0) as despesas_pagas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pendente' THEN valor ELSE 0 END), 0) as despesas_pendentes
      FROM lancamentos_financeiros WHERE user_id = ? AND (referencia_tipo = 'manual' OR referencia_tipo = 'os' OR referencia_tipo IS NULL)
    `
    const lancParams: any[] = [userId]
    if (data_inicio) { lancQuery += ' AND data_lancamento >= ?'; lancParams.push(data_inicio) }
    if (data_fim) { lancQuery += ' AND data_lancamento <= ?'; lancParams.push(data_fim) }
    const lancResumo = database.prepare(lancQuery).get(...lancParams) as any
    console.log('[API resumo] lancResumo=', lancResumo)

    // Receitas/Despesas por mes (pagas e pendentes) - respeita data_inicio/data_fim quando fornecidos
    let chartWhere = "WHERE data_ref >= date('now', '-6 months')"
    const chartParams: any[] = [userId, userId, userId, userId]
    if (data_inicio) {
      chartWhere = (data_fim) ? 'WHERE data_ref >= ? AND data_ref <= ?' : 'WHERE data_ref >= ?'
      chartParams.push(data_inicio)
      if (data_fim) chartParams.push(data_fim)
    } else if (data_fim) {
      chartWhere = 'WHERE data_ref <= ?'
      chartParams.push(data_fim)
    }

    const chartData = database.prepare(`
      SELECT
        strftime('%Y-%m', data_ref) as mes,
        SUM(receita_paga) as receitas_pagas,
        SUM(receita_pendente) as receitas_pendentes,
        SUM(despesa_paga) as despesas_pagas,
        SUM(despesa_pendente) as despesas_pendentes
      FROM (
        -- ordens: pagas x pendentes (data_ref = data_execucao) — apenas OS à vista
        SELECT data_execucao as data_ref,
          CASE WHEN liquidado = 1 AND COALESCE(num_parcelas,1) <= 1 THEN COALESCE(valor_pago, valor, 0) ELSE 0 END as receita_paga,
          CASE WHEN liquidado = 0 AND COALESCE(num_parcelas,1) <= 1 THEN COALESCE(valor, 0) ELSE 0 END as receita_pendente,
          0 as despesa_paga,
          0 as despesa_pendente
        FROM ordens_servico WHERE user_id = ?

        UNION ALL

        -- parcelas vinculadas a contratos: pagas (data_pagamento) e pendentes (data_vencimento)
        SELECT p.data_pagamento as data_ref,
          COALESCE(p.valor_pago, p.valor_parcela, 0) as receita_paga,
          0 as receita_pendente,
          0 as despesa_paga,
          0 as despesa_pendente
        FROM parcelas p LEFT JOIN contratos c ON p.contrato_id = c.id
        WHERE c.user_id = ? AND p.status = 'paga' AND p.data_pagamento IS NOT NULL

        UNION ALL

        SELECT p.data_vencimento as data_ref,
          0 as receita_paga,
          CASE WHEN p.status IN ('pendente','atrasada') THEN COALESCE(p.valor_parcela,0) ELSE 0 END as receita_pendente,
          0 as despesa_paga,
          0 as despesa_pendente
        FROM parcelas p LEFT JOIN contratos c2 ON p.contrato_id = c2.id
        WHERE c2.user_id = ? AND p.status IN ('pendente','atrasada')

        UNION ALL

        -- lancamentos manuais e parcelas de OS: pagas x pendentes (data_lancamento)
        SELECT data_lancamento as data_ref,
          CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor ELSE 0 END as receita_paga,
          CASE WHEN tipo = 'receita' AND status != 'pago' THEN valor ELSE 0 END as receita_pendente,
          CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor ELSE 0 END as despesa_paga,
          CASE WHEN tipo = 'despesa' AND status != 'pago' THEN valor ELSE 0 END as despesa_pendente
        FROM lancamentos_financeiros WHERE user_id = ? AND (referencia_tipo = 'manual' OR referencia_tipo = 'os' OR referencia_tipo IS NULL)
      )
      ${chartWhere}
      GROUP BY mes
      ORDER BY mes ASC
    `).all(...chartParams)
    console.log('[API resumo] chartData length=', Array.isArray(chartData) ? chartData.length : 0)

    // Despesas por categoria
    const despesasPorCategoria = database.prepare(`
      SELECT 
        COALESCE(c.nome, 'Sem Categoria') as categoria,
        COALESCE(c.cor, '#6b7280') as cor,
        SUM(l.valor) as total
      FROM lancamentos_financeiros l
      LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
      WHERE l.user_id = ? AND l.tipo = 'despesa' AND l.status = 'pago'
      GROUP BY l.categoria_id
      ORDER BY total DESC
    `).all(userId)

    // Total de contratos (accrual) no periodo/ativo
    let contratosQuery = `SELECT COALESCE(SUM(valor_total), 0) as contratos_total FROM contratos WHERE user_id = ? AND status IN ('ativo', 'concluido')`
    const contratosParams: any[] = [userId]
    if (data_inicio) { contratosQuery += ' AND data_inicio >= ?'; contratosParams.push(data_inicio) }
    if (data_fim) { contratosQuery += ' AND data_fim <= ?'; contratosParams.push(data_fim) }
    const contratosResumo = database.prepare(contratosQuery).get(...contratosParams) as any

    const totalReceitaRealizado = osResumo.os_recebido + contratosResumo.contratos_total + parcelasIndepResumo.parcelas_recebido_indep + lancResumo.receitas_pagas
    const totalDespesaRealizado = lancResumo.despesas_pagas
    const totalAReceber = osResumo.os_pendente + (parcelasContratoResumo?.parcelas_pendente_contratos || 0) + lancResumo.receitas_pendentes
    const totalAPagar = lancResumo.despesas_pendentes

    return NextResponse.json({
      receita_total: totalReceitaRealizado,
      despesa_total: totalDespesaRealizado,
      lucro_liquido: totalReceitaRealizado - totalDespesaRealizado,
      a_receber: totalAReceber,
      a_pagar: totalAPagar,
      os: osResumo,
      parcelas: parcelasContratoResumo,
      lancamentos: lancResumo,
      contratos: contratosResumo,
      chart_mensal: chartData,
      despesas_por_categoria: despesasPorCategoria
    })
  } catch (error) {
    console.error('Erro ao buscar resumo financeiro:', error)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
