import { NextRequest, NextResponse } from 'next/server'
import { sql, queryOne, query } from '@/lib/db'
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

    console.log('[API resumo] userId=', userId, 'data_inicio=', data_inicio, 'data_fim=', data_fim)

    // OS receitas no periodo (excluindo OS parceladas, que contam via lancamentos)
    const osResumo = await queryOne<any>`
      SELECT 
        COALESCE(SUM(CASE WHEN liquidado = 1 AND COALESCE(num_parcelas,1) <= 1 THEN COALESCE(valor_pago, valor, 0) ELSE 0 END), 0) as os_recebido,
        COALESCE(SUM(CASE WHEN liquidado = 0 AND status != 'cancelada' AND COALESCE(num_parcelas,1) <= 1 THEN COALESCE(valor, 0) ELSE 0 END), 0) as os_pendente,
        COUNT(CASE WHEN liquidado = 1 THEN 1 END) as os_recebido_count,
        COUNT(CASE WHEN liquidado = 0 AND status != 'cancelada' THEN 1 END) as os_pendente_count
      FROM ordens_servico WHERE user_id = ${userId}
        ${data_inicio ? sql`AND data_execucao >= ${data_inicio}` : sql``}
        ${data_fim ? sql`AND data_execucao <= ${data_fim}` : sql``}
    ` || { os_recebido: 0, os_pendente: 0, os_recebido_count: 0, os_pendente_count: 0 }
    console.log('[API resumo] osResumo=', osResumo)

    // Parcelas receitas no periodo - vinculadas a contratos
    const parcelasContratoResumo = await queryOne<any>`
      SELECT 
        COALESCE(SUM(CASE WHEN p.status = 'paga' THEN COALESCE(p.valor_pago, p.valor_parcela, 0) ELSE 0 END), 0) as parcelas_recebido_contratos,
        COALESCE(SUM(CASE WHEN p.status IN ('pendente', 'atrasada') THEN p.valor_parcela ELSE 0 END), 0) as parcelas_pendente_contratos,
        COUNT(CASE WHEN p.status = 'paga' THEN 1 END) as parcelas_pago_count_contratos,
        COUNT(CASE WHEN p.status IN ('pendente', 'atrasada') THEN 1 END) as parcelas_pendente_count_contratos,
        COUNT(CASE WHEN p.status = 'atrasada' OR (p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE) THEN 1 END) as parcelas_atrasadas_count_contratos
      FROM parcelas p
      LEFT JOIN contratos c ON p.contrato_id = c.id
      WHERE c.user_id = ${userId} AND c.status IN ('ativo', 'concluido')
        ${data_inicio ? sql`AND p.data_vencimento >= ${data_inicio}` : sql``}
        ${data_fim ? sql`AND p.data_vencimento <= ${data_fim}` : sql``}
    ` || { parcelas_recebido_contratos: 0, parcelas_pendente_contratos: 0 }
    console.log('[API resumo] parcelasContratoResumo=', parcelasContratoResumo)

    // Parcelas independentes
    const parcelasIndepResumo = await queryOne<any>`
      SELECT COALESCE(SUM(CASE WHEN status = 'paga' THEN COALESCE(valor_pago, valor_parcela, 0) ELSE 0 END), 0) as parcelas_recebido_indep
      FROM parcelas p WHERE p.contrato_id IS NULL
        ${data_inicio ? sql`AND p.data_vencimento >= ${data_inicio}` : sql``}
        ${data_fim ? sql`AND p.data_vencimento <= ${data_fim}` : sql``}
    ` || { parcelas_recebido_indep: 0 }
    console.log('[API resumo] parcelasIndepResumo=', parcelasIndepResumo)

    // Lancamentos no periodo
    const lancResumo = await queryOne<any>`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor ELSE 0 END), 0) as receitas_pagas,
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pendente' THEN valor ELSE 0 END), 0) as receitas_pendentes,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor ELSE 0 END), 0) as despesas_pagas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pendente' THEN valor ELSE 0 END), 0) as despesas_pendentes
      FROM lancamentos_financeiros WHERE user_id = ${userId} AND (referencia_tipo = 'manual' OR referencia_tipo = 'os' OR referencia_tipo IS NULL)
        ${data_inicio ? sql`AND data_lancamento >= ${data_inicio}` : sql``}
        ${data_fim ? sql`AND data_lancamento <= ${data_fim}` : sql``}
    ` || { receitas_pagas: 0, receitas_pendentes: 0, despesas_pagas: 0, despesas_pendentes: 0 }
    console.log('[API resumo] lancResumo=', lancResumo)

    // Chart data - simplificado para PostgreSQL
    const chartData = await query<any>`
      SELECT
        TO_CHAR(data_execucao, 'YYYY-MM') as mes,
        COALESCE(SUM(CASE WHEN liquidado = 1 THEN COALESCE(valor_pago, valor, 0) ELSE 0 END), 0) as receitas_pagas,
        COALESCE(SUM(CASE WHEN liquidado = 0 THEN COALESCE(valor, 0) ELSE 0 END), 0) as receitas_pendentes,
        0 as despesas_pagas,
        0 as despesas_pendentes
      FROM ordens_servico 
      WHERE user_id = ${userId}
        AND data_execucao >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(data_execucao, 'YYYY-MM')
      ORDER BY mes ASC
    `
    console.log('[API resumo] chartData length=', Array.isArray(chartData) ? chartData.length : 0)

    // Despesas por categoria
    const despesasPorCategoria = await query<any>`
      SELECT 
        COALESCE(c.nome, 'Sem Categoria') as categoria,
        COALESCE(c.cor, '#6b7280') as cor,
        SUM(l.valor) as total
      FROM lancamentos_financeiros l
      LEFT JOIN categorias_financeiras c ON l.categoria_id = c.id
      WHERE l.user_id = ${userId} AND l.tipo = 'despesa' AND l.status = 'pago'
      GROUP BY l.categoria_id, c.nome, c.cor
      ORDER BY total DESC
    `

    // Total de contratos
    const contratosResumo = await queryOne<any>`
      SELECT COALESCE(SUM(valor_total), 0) as contratos_total 
      FROM contratos WHERE user_id = ${userId} AND status IN ('ativo', 'concluido')
        ${data_inicio ? sql`AND data_inicio >= ${data_inicio}` : sql``}
        ${data_fim ? sql`AND data_fim <= ${data_fim}` : sql``}
    ` || { contratos_total: 0 }

    const totalReceitaRealizado = Number(osResumo.os_recebido) + Number(contratosResumo.contratos_total) + Number(parcelasIndepResumo.parcelas_recebido_indep) + Number(lancResumo.receitas_pagas)
    const totalDespesaRealizado = Number(lancResumo.despesas_pagas)
    const totalAReceber = Number(osResumo.os_pendente) + Number(parcelasContratoResumo?.parcelas_pendente_contratos || 0) + Number(lancResumo.receitas_pendentes)
    const totalAPagar = Number(lancResumo.despesas_pendentes)

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
