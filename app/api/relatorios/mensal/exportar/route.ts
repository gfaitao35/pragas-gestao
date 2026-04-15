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

    if (!mes) {
      return NextResponse.json({ error: 'Parametro mes obrigatorio' }, { status: 400 })
    }

    const database = getDb()
    const [y, m] = mes.split('-').map(Number)
    const mesInicio = `${mes}-01`
    const mesUltimoDia = new Date(y, m, 0).toISOString().slice(0, 10)

    // ==============================
    // RESUMO
    // ==============================
    const statsOS = database.prepare(`
      SELECT 
        COUNT(*) as total_os,
        COUNT(CASE WHEN status='concluida' THEN 1 END) as os_concluidas,
        COALESCE(SUM(CASE WHEN status='concluida' THEN valor ELSE 0 END), 0) as faturamento_os,
        COALESCE(SUM(CASE WHEN liquidado=1 THEN COALESCE(valor_pago, valor, 0) ELSE 0 END), 0) as recebido_os
      FROM ordens_servico
      WHERE user_id=? AND strftime('%Y-%m', data_execucao)=?
    `).get(userId, mes) as any

    const lancResumo = database.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo='receita' AND status='pago' THEN valor ELSE 0 END), 0) as receitas_avulsas,
        COALESCE(SUM(CASE WHEN tipo='despesa' AND status='pago' THEN valor ELSE 0 END), 0) as despesas
      FROM lancamentos_financeiros
      WHERE user_id = ? AND strftime('%Y-%m', data_lancamento) = ?
    `).get(userId, mes) as any

    // ==============================
    // ORDENS
    // ==============================
    const ordens = database.prepare(`
      SELECT o.numero_os, c.razao_social, o.tipo_servico, o.descricao_servico, o.valor, 
             o.status, o.data_execucao, o.liquidado, o.valor_pago, o.data_liquidacao,
             o.tecnico_responsavel, o.local_execucao
      FROM ordens_servico o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE o.user_id=? AND strftime('%Y-%m', o.data_execucao)=?
      ORDER BY o.data_execucao DESC
    `).all(userId, mes) as any[]

    // ==============================
    // CONTRATOS
    // ==============================
    const contratos = database.prepare(`
      SELECT ct.numero_contrato, cl.razao_social, ct.valor_total, ct.numero_parcelas,
             ct.valor_parcela, ct.status, ct.data_inicio, ct.data_fim, ct.dia_vencimento
      FROM contratos ct
      LEFT JOIN clientes cl ON ct.cliente_id = cl.id
      WHERE ct.user_id = ? AND ct.status IN ('ativo', 'concluido')
        AND ct.data_inicio <= ? AND ct.data_fim >= ?
      ORDER BY ct.data_inicio DESC
    `).all(userId, mesUltimoDia, mesInicio) as any[]

    // ==============================
    // PARCELAS
    // ==============================
    const parcelas = database.prepare(`
      SELECT p.numero_parcela, p.valor_parcela, p.data_vencimento, p.data_pagamento,
             p.valor_pago, p.status, p.forma_pagamento, ct.numero_contrato, cl.razao_social
      FROM parcelas p
      LEFT JOIN contratos ct ON p.contrato_id = ct.id
      LEFT JOIN clientes cl ON ct.cliente_id = cl.id
      WHERE ct.user_id = ? AND strftime('%Y-%m', p.data_vencimento) = ?
      ORDER BY p.data_vencimento ASC
    `).all(userId, mes) as any[]

    // ==============================
    // LANCAMENTOS
    // ==============================
    const lancamentos = database.prepare(`
      SELECT l.tipo, l.descricao, l.valor, l.data_lancamento, l.data_pagamento,
             l.status, l.forma_pagamento, l.referencia_tipo,
             COALESCE(cat.nome, '') as categoria_nome
      FROM lancamentos_financeiros l
      LEFT JOIN categorias_financeiras cat ON l.categoria_id = cat.id
      WHERE l.user_id = ? AND strftime('%Y-%m', l.data_lancamento) = ?
      ORDER BY l.data_lancamento DESC
    `).all(userId, mes) as any[]

    return NextResponse.json({
      resumo: {
        total_os: statsOS.total_os || 0,
        os_concluidas: statsOS.os_concluidas || 0,
        faturamento_os: statsOS.faturamento_os || 0,
        recebido_os: statsOS.recebido_os || 0,
        receitas_avulsas: lancResumo?.receitas_avulsas || 0,
        despesas: lancResumo?.despesas || 0
      },
      ordens,
      contratos,
      parcelas,
      lancamentos
    })
  } catch (error) {
    console.error('Erro ao exportar relatorio:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
