import { NextRequest, NextResponse } from 'next/server'
import { sql, query, queryOne } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')

    const now = new Date()
    const currentMonth = mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Calcular mes anterior
    const [y, m] = currentMonth.split('-').map(Number)
    const prevDate = new Date(y, m - 2)
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

    // STATS (mes atual)
    const statsCurrent = await queryOne<any>`
      SELECT 
        COUNT(*) as total_os,
        COUNT(CASE WHEN status='concluida' THEN 1 END) as os_concluidas,
        COALESCE(SUM(CASE WHEN status='concluida' THEN valor ELSE 0 END), 0) as valor_total,
        COALESCE(SUM(CASE WHEN liquidado=1 THEN COALESCE(valor_pago, valor, 0) ELSE 0 END), 0) as valor_liquidado,
        COUNT(DISTINCT cliente_id) as clientes_atendidos
      FROM ordens_servico
      WHERE user_id=${userId} AND TO_CHAR(data_execucao::date, 'YYYY-MM')=${currentMonth}
    ` || { total_os: 0, os_concluidas: 0, valor_total: 0, valor_liquidado: 0, clientes_atendidos: 0 }

    const statsPrevious = await queryOne<any>`
      SELECT 
        COUNT(*) as total_os,
        COUNT(CASE WHEN status='concluida' THEN 1 END) as os_concluidas,
        COALESCE(SUM(CASE WHEN status='concluida' THEN valor ELSE 0 END), 0) as valor_total,
        COALESCE(SUM(CASE WHEN liquidado=1 THEN COALESCE(valor_pago, valor, 0) ELSE 0 END), 0) as valor_liquidado,
        COUNT(DISTINCT cliente_id) as clientes_atendidos
      FROM ordens_servico
      WHERE user_id=${userId} AND TO_CHAR(data_execucao::date, 'YYYY-MM')=${prevMonth}
    ` || { total_os: 0, os_concluidas: 0, valor_total: 0, valor_liquidado: 0, clientes_atendidos: 0 }

    // SERVICOS POR TIPO
    const servicosPorTipo = await query<any>`
      SELECT tipo_servico, COUNT(*) as quantidade, COALESCE(SUM(valor), 0) as valor_total
      FROM ordens_servico
      WHERE user_id=${userId} AND TO_CHAR(data_execucao::date, 'YYYY-MM')=${currentMonth} AND status='concluida'
      GROUP BY tipo_servico
      ORDER BY quantidade DESC
    `

    // TOP CLIENTES
    const topClientes = await query<any>`
      SELECT c.razao_social, COUNT(o.id) as quantidade_os, COALESCE(SUM(o.valor), 0) as valor_total
      FROM ordens_servico o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.user_id=${userId} AND TO_CHAR(o.data_execucao::date, 'YYYY-MM')=${currentMonth} AND o.status='concluida'
      GROUP BY o.cliente_id, c.razao_social
      ORDER BY valor_total DESC
      LIMIT 10
    `

    // ORDENS DO MES
    const ordens = await query<any>`
      SELECT o.id, o.numero_os, c.razao_social, o.tipo_servico, o.valor, o.status, 
             o.data_execucao, o.liquidado, o.valor_pago, o.descricao_servico, 
             o.tecnico_responsavel, o.data_liquidacao, o.local_execucao
      FROM ordens_servico o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.user_id=${userId} AND TO_CHAR(o.data_execucao::date, 'YYYY-MM')=${currentMonth}
      ORDER BY o.data_execucao DESC
    `

    // CONTRATOS VIGENTES NO MES
    const mesInicio = `${currentMonth}-01`
    const mesUltimoDia = new Date(y, m, 0).toISOString().slice(0, 10)

    const contratos = await query<any>`
      SELECT ct.id, ct.numero_contrato, cl.razao_social, ct.valor_total, ct.numero_parcelas,
             ct.status, ct.data_inicio, ct.data_fim, ct.valor_parcela, ct.dia_vencimento,
             (SELECT COUNT(*) FROM parcelas p WHERE p.contrato_id = ct.id AND p.status = 'paga') as parcelas_pagas,
             (SELECT COALESCE(SUM(COALESCE(p2.valor_pago, p2.valor_parcela, 0)), 0) 
              FROM parcelas p2 WHERE p2.contrato_id = ct.id AND p2.status = 'paga' 
              AND TO_CHAR(p2.data_pagamento::date, 'YYYY-MM') = ${currentMonth}) as valor_recebido_mes
      FROM contratos ct
      LEFT JOIN clientes cl ON ct.cliente_id = cl.id
      WHERE ct.user_id = ${userId} AND ct.status IN ('ativo', 'concluido')
        AND ct.data_inicio::date <= ${mesUltimoDia}::date AND ct.data_fim::date >= ${mesInicio}::date
      ORDER BY ct.data_inicio DESC
    `

    // PARCELAS DO MES
    const parcelas = await query<any>`
      SELECT p.id, p.numero_parcela, p.valor_parcela, p.data_vencimento, p.data_pagamento,
             p.valor_pago, p.status, p.forma_pagamento, ct.numero_contrato, cl.razao_social
      FROM parcelas p
      LEFT JOIN contratos ct ON p.contrato_id = ct.id
      LEFT JOIN clientes cl ON ct.cliente_id = cl.id
      WHERE ct.user_id = ${userId} AND TO_CHAR(p.data_vencimento::date, 'YYYY-MM') = ${currentMonth}
      ORDER BY p.data_vencimento ASC
    `

    // LANCAMENTOS FINANCEIROS DO MES
    const lancamentos = await query<any>`
      SELECT l.id, l.tipo, l.descricao, l.valor, l.data_lancamento, l.data_pagamento,
             l.status, l.forma_pagamento, l.referencia_tipo,
             COALESCE(cat.nome, '') as categoria_nome, COALESCE(cat.cor, '#6b7280') as categoria_cor
      FROM lancamentos_financeiros l
      LEFT JOIN categorias_financeiras cat ON l.categoria_id = cat.id
      WHERE l.user_id = ${userId} AND TO_CHAR(l.data_lancamento::date, 'YYYY-MM') = ${currentMonth}
      ORDER BY l.data_lancamento DESC
    `

    // RESUMO FINANCEIRO
    const osRecebido = Number(statsCurrent.valor_liquidado) || 0

    const parcelasRecebidas = await queryOne<any>`
      SELECT COALESCE(SUM(COALESCE(p.valor_pago, p.valor_parcela, 0)), 0) as total
      FROM parcelas p
      LEFT JOIN contratos ct ON p.contrato_id = ct.id
      WHERE ct.user_id = ${userId} AND p.status = 'paga' AND TO_CHAR(p.data_pagamento::date, 'YYYY-MM') = ${currentMonth}
    `

    const lancResumo = await queryOne<any>`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo='receita' AND status='pago' AND referencia_tipo='manual' THEN valor ELSE 0 END), 0) as receitas_avulsas,
        COALESCE(SUM(CASE WHEN tipo='despesa' AND status='pago' THEN valor ELSE 0 END), 0) as despesas_pagas,
        COALESCE(SUM(CASE WHEN tipo='receita' AND status='pendente' AND referencia_tipo='manual' THEN valor ELSE 0 END), 0) as receitas_pendentes,
        COALESCE(SUM(CASE WHEN tipo='despesa' AND status='pendente' THEN valor ELSE 0 END), 0) as despesas_pendentes
      FROM lancamentos_financeiros
      WHERE user_id = ${userId} AND TO_CHAR(data_lancamento::date, 'YYYY-MM') = ${currentMonth}
    ` || { receitas_avulsas: 0, despesas_pagas: 0, receitas_pendentes: 0, despesas_pendentes: 0 }

    const receitaTotal = osRecebido + Number(parcelasRecebidas?.total || 0) + Number(lancResumo?.receitas_avulsas || 0)
    const despesaTotal = Number(lancResumo?.despesas_pagas || 0)
    const lucroAtual = receitaTotal - despesaTotal

    // META DE LUCRO
    const meta = await queryOne<any>`
      SELECT id, valor_meta, observacoes FROM metas_lucro WHERE user_id = ${userId} AND mes = ${currentMonth}
    `

    return NextResponse.json({
      mes: currentMonth,
      mes_anterior: prevMonth,
      stats: {
        current: {
          total_os: Number(statsCurrent.total_os) || 0,
          os_concluidas: Number(statsCurrent.os_concluidas) || 0,
          valor_total: Number(statsCurrent.valor_total) || 0,
          valor_liquidado: Number(statsCurrent.valor_liquidado) || 0,
          clientes_atendidos: Number(statsCurrent.clientes_atendidos) || 0
        },
        previous: {
          total_os: Number(statsPrevious.total_os) || 0,
          os_concluidas: Number(statsPrevious.os_concluidas) || 0,
          valor_total: Number(statsPrevious.valor_total) || 0,
          valor_liquidado: Number(statsPrevious.valor_liquidado) || 0,
          clientes_atendidos: Number(statsPrevious.clientes_atendidos) || 0
        }
      },
      servicos_por_tipo: servicosPorTipo,
      top_clientes: topClientes,
      ordens,
      contratos,
      parcelas,
      lancamentos,
      resumo: {
        receita_total: receitaTotal,
        despesa_total: despesaTotal,
        lucro_atual: lucroAtual,
        os_recebido: osRecebido,
        parcelas_recebidas: Number(parcelasRecebidas?.total || 0),
        receitas_avulsas: Number(lancResumo?.receitas_avulsas || 0),
        despesas_pagas: despesaTotal,
        receitas_pendentes: Number(lancResumo?.receitas_pendentes || 0),
        despesas_pendentes: Number(lancResumo?.despesas_pendentes || 0)
      },
      meta: meta || null
    })
  } catch (error) {
    console.error('Erro ao buscar relatorio mensal:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
