import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
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

    const database = getDb()

    // ==============================
    // STATS (mes atual e anterior)
    // ==============================
    const statsQuery = `
      SELECT 
        COUNT(*) as total_os,
        COUNT(CASE WHEN status='concluida' THEN 1 END) as os_concluidas,
        COALESCE(SUM(CASE WHEN status='concluida' THEN valor ELSE 0 END), 0) as valor_total,
        COALESCE(SUM(CASE WHEN liquidado=1 THEN COALESCE(valor_pago, valor, 0) ELSE 0 END), 0) as valor_liquidado,
        COUNT(DISTINCT cliente_id) as clientes_atendidos
      FROM ordens_servico
      WHERE user_id=? AND strftime('%Y-%m', data_execucao)=?
    `
    const statsCurrent = database.prepare(statsQuery).get(userId, currentMonth) as any
    const statsPrevious = database.prepare(statsQuery).get(userId, prevMonth) as any

    // ==============================
    // SERVICOS POR TIPO
    // ==============================
    const servicosPorTipo = database.prepare(`
      SELECT tipo_servico, COUNT(*) as quantidade, COALESCE(SUM(valor), 0) as valor_total
      FROM ordens_servico
      WHERE user_id=? AND strftime('%Y-%m', data_execucao)=? AND status='concluida'
      GROUP BY tipo_servico
      ORDER BY quantidade DESC
    `).all(userId, currentMonth) as any[]

    // ==============================
    // TOP CLIENTES
    // ==============================
    const topClientes = database.prepare(`
      SELECT c.razao_social, COUNT(o.id) as quantidade_os, COALESCE(SUM(o.valor), 0) as valor_total
      FROM ordens_servico o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.user_id=? AND strftime('%Y-%m', o.data_execucao)=? AND o.status='concluida'
      GROUP BY o.cliente_id, c.razao_social
      ORDER BY valor_total DESC
      LIMIT 10
    `).all(userId, currentMonth) as any[]

    // ==============================
    // ORDENS DO MES (todas)
    // ==============================
    const ordens = database.prepare(`
      SELECT o.id, o.numero_os, c.razao_social, o.tipo_servico, o.valor, o.status, 
             o.data_execucao, o.liquidado, o.valor_pago, o.descricao_servico, 
             o.tecnico_responsavel, o.data_liquidacao, o.local_execucao
      FROM ordens_servico o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.user_id=? AND strftime('%Y-%m', o.data_execucao)=?
      ORDER BY o.data_execucao DESC
    `).all(userId, currentMonth) as any[]

    // ==============================
    // CONTRATOS VIGENTES NO MES
    // ==============================
    const mesInicio = `${currentMonth}-01`
    const mesUltimoDia = new Date(y, m, 0).toISOString().slice(0, 10)

    const contratos = database.prepare(`
      SELECT ct.id, ct.numero_contrato, cl.razao_social, ct.valor_total, ct.numero_parcelas,
             ct.status, ct.data_inicio, ct.data_fim, ct.valor_parcela, ct.dia_vencimento,
             (SELECT COUNT(*) FROM parcelas p WHERE p.contrato_id = ct.id AND p.status = 'paga') as parcelas_pagas,
             (SELECT COALESCE(SUM(COALESCE(p2.valor_pago, p2.valor_parcela, 0)), 0) 
              FROM parcelas p2 WHERE p2.contrato_id = ct.id AND p2.status = 'paga' 
              AND strftime('%Y-%m', p2.data_pagamento) = ?) as valor_recebido_mes
      FROM contratos ct
      LEFT JOIN clientes cl ON ct.cliente_id = cl.id
      WHERE ct.user_id = ? AND ct.status IN ('ativo', 'concluido')
        AND ct.data_inicio <= ? AND ct.data_fim >= ?
      ORDER BY ct.data_inicio DESC
    `).all(currentMonth, userId, mesUltimoDia, mesInicio) as any[]

    // ==============================
    // PARCELAS DO MES (vencimento no mes)
    // ==============================
    const parcelas = database.prepare(`
      SELECT p.id, p.numero_parcela, p.valor_parcela, p.data_vencimento, p.data_pagamento,
             p.valor_pago, p.status, p.forma_pagamento, ct.numero_contrato, cl.razao_social
      FROM parcelas p
      LEFT JOIN contratos ct ON p.contrato_id = ct.id
      LEFT JOIN clientes cl ON ct.cliente_id = cl.id
      WHERE ct.user_id = ? AND strftime('%Y-%m', p.data_vencimento) = ?
      ORDER BY p.data_vencimento ASC
    `).all(userId, currentMonth) as any[]

    // ==============================
    // LANCAMENTOS FINANCEIROS DO MES
    // ==============================
    const lancamentos = database.prepare(`
      SELECT l.id, l.tipo, l.descricao, l.valor, l.data_lancamento, l.data_pagamento,
             l.status, l.forma_pagamento, l.referencia_tipo,
             COALESCE(cat.nome, '') as categoria_nome, COALESCE(cat.cor, '#6b7280') as categoria_cor
      FROM lancamentos_financeiros l
      LEFT JOIN categorias_financeiras cat ON l.categoria_id = cat.id
      WHERE l.user_id = ? AND strftime('%Y-%m', l.data_lancamento) = ?
      ORDER BY l.data_lancamento DESC
    `).all(userId, currentMonth) as any[]

    // ==============================
    // RESUMO FINANCEIRO
    // ==============================
    const osRecebido = statsCurrent.valor_liquidado || 0

    const parcelasRecebidas = database.prepare(`
      SELECT COALESCE(SUM(COALESCE(p.valor_pago, p.valor_parcela, 0)), 0) as total
      FROM parcelas p
      LEFT JOIN contratos ct ON p.contrato_id = ct.id
      WHERE ct.user_id = ? AND p.status = 'paga' AND strftime('%Y-%m', p.data_pagamento) = ?
    `).get(userId, currentMonth) as any

    const lancResumo = database.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo='receita' AND status='pago' AND referencia_tipo='manual' THEN valor ELSE 0 END), 0) as receitas_avulsas,
        COALESCE(SUM(CASE WHEN tipo='despesa' AND status='pago' THEN valor ELSE 0 END), 0) as despesas_pagas,
        COALESCE(SUM(CASE WHEN tipo='receita' AND status='pendente' AND referencia_tipo='manual' THEN valor ELSE 0 END), 0) as receitas_pendentes,
        COALESCE(SUM(CASE WHEN tipo='despesa' AND status='pendente' THEN valor ELSE 0 END), 0) as despesas_pendentes
      FROM lancamentos_financeiros
      WHERE user_id = ? AND strftime('%Y-%m', data_lancamento) = ?
    `).get(userId, currentMonth) as any

    const receitaTotal = osRecebido + (parcelasRecebidas?.total || 0) + (lancResumo?.receitas_avulsas || 0)
    const despesaTotal = lancResumo?.despesas_pagas || 0
    const lucroAtual = receitaTotal - despesaTotal

    // ==============================
    // META DE LUCRO
    // ==============================
    // Criar tabela se nao existir
    database.exec(`
      CREATE TABLE IF NOT EXISTS metas_lucro (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mes TEXT NOT NULL,
        valor_meta REAL NOT NULL,
        observacoes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, mes)
      )
    `)

    const meta = database.prepare(`
      SELECT id, valor_meta, observacoes FROM metas_lucro WHERE user_id = ? AND mes = ?
    `).get(userId, currentMonth) as any

    // ==============================
    // RESPOSTA
    // ==============================
    return NextResponse.json({
      mes: currentMonth,
      mes_anterior: prevMonth,
      stats: {
        current: {
          total_os: statsCurrent.total_os || 0,
          os_concluidas: statsCurrent.os_concluidas || 0,
          valor_total: statsCurrent.valor_total || 0,
          valor_liquidado: statsCurrent.valor_liquidado || 0,
          clientes_atendidos: statsCurrent.clientes_atendidos || 0
        },
        previous: {
          total_os: statsPrevious.total_os || 0,
          os_concluidas: statsPrevious.os_concluidas || 0,
          valor_total: statsPrevious.valor_total || 0,
          valor_liquidado: statsPrevious.valor_liquidado || 0,
          clientes_atendidos: statsPrevious.clientes_atendidos || 0
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
        parcelas_recebidas: parcelasRecebidas?.total || 0,
        receitas_avulsas: lancResumo?.receitas_avulsas || 0,
        despesas_pagas: despesaTotal,
        receitas_pendentes: lancResumo?.receitas_pendentes || 0,
        despesas_pendentes: lancResumo?.despesas_pendentes || 0
      },
      meta: meta || null
    })
  } catch (error) {
    console.error('Erro ao buscar relatorio mensal:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
