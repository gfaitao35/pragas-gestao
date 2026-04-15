// Mock data para demonstracao - NAO usar no projeto real (usar as APIs reais)

export function generateMockReport(mes: string) {
  const [year, month] = mes.split('-').map(Number)

  // Seed deterministica baseada no mes
  const seed = year * 100 + month
  const rand = (min: number, max: number) => {
    const x = Math.sin(seed * 9301 + 49297) % 233280
    const val = (Math.abs(x) / 233280)
    return Math.floor(min + val * (max - min))
  }

  const totalOS = rand(15, 45)
  const osConcluidas = rand(10, totalOS)
  const valorTotal = rand(20000, 80000)
  const valorLiquidado = rand(15000, valorTotal)
  const clientesAtendidos = rand(5, 20)

  const prevTotalOS = rand(12, 40)
  const prevOsConcluidas = rand(8, prevTotalOS)
  const prevValorTotal = rand(18000, 75000)
  const prevValorLiquidado = rand(12000, prevValorTotal)
  const prevClientes = rand(4, 18)

  const osRecebido = valorLiquidado
  const parcelasRecebidas = rand(3000, 15000)
  const receitasAvulsas = rand(1000, 8000)
  const despesasPagas = rand(8000, 30000)
  const receitaTotal = osRecebido + parcelasRecebidas + receitasAvulsas
  const lucroAtual = receitaTotal - despesasPagas

  const tiposServico = ['Desinsetizacao', 'Desratizacao', 'Descupinizacao', 'Sanitizacao', 'Controle Integrado']
  const clientes = ['Restaurante Bom Sabor Ltda', 'Condominio Parque das Flores', 'Hotel Central Palace', 'Shopping Center Norte', 'Supermercado Economia', 'Hospital Santa Cruz', 'Escola Municipal JK', 'Fabrica Alimentos SA']
  const tecnicos = ['Carlos Silva', 'Marcos Oliveira', 'Roberto Santos', 'Ana Paula']
  const statusOptions = ['pendente', 'em_andamento', 'concluida', 'cancelada']

  const servicosPorTipo = tiposServico.slice(0, rand(3, 5)).map(t => ({
    tipo_servico: t,
    quantidade: rand(2, 12),
    valor_total: rand(3000, 20000)
  }))

  const topClientes = clientes.slice(0, rand(3, 7)).map(c => ({
    razao_social: c,
    quantidade_os: rand(1, 8),
    valor_total: rand(2000, 18000)
  })).sort((a, b) => b.valor_total - a.valor_total)

  const ordens = Array.from({ length: totalOS }, (_, i) => {
    const status = statusOptions[i % 4]
    const valor = rand(500, 5000)
    const liquidado = status === 'concluida' && i % 3 !== 0 ? 1 : 0
    return {
      id: `os-${i}`,
      numero_os: `OS${String(seed * 100 + i + 1).padStart(6, '0')}`,
      razao_social: clientes[i % clientes.length],
      tipo_servico: tiposServico[i % tiposServico.length],
      valor,
      status,
      data_execucao: `${mes}-${String(Math.min(28, i + 1)).padStart(2, '0')}`,
      liquidado,
      valor_pago: liquidado ? valor : 0,
      descricao_servico: `Servico de ${tiposServico[i % tiposServico.length].toLowerCase()} - visita ${i + 1}`,
      tecnico_responsavel: tecnicos[i % tecnicos.length]
    }
  })

  const contratos = Array.from({ length: rand(2, 6) }, (_, i) => ({
    id: `ctr-${i}`,
    numero_contrato: `CTR${String(i + 1).padStart(6, '0')}`,
    razao_social: clientes[i % clientes.length],
    valor_total: rand(6000, 36000),
    numero_parcelas: rand(6, 12),
    status: i === 0 ? 'ativo' : i === 1 ? 'ativo' : 'concluido',
    data_inicio: `${year}-01-01`,
    data_fim: `${year}-12-31`,
    parcelas_pagas: rand(1, 6),
    valor_recebido_mes: rand(500, 3000)
  }))

  const parcelas = contratos.flatMap((c, ci) => 
    Array.from({ length: rand(1, 3) }, (_, pi) => ({
      id: `par-${ci}-${pi}`,
      numero_parcela: pi + 1,
      valor_parcela: rand(500, 3000),
      data_vencimento: `${mes}-${String(Math.min(28, (pi + 1) * 10)).padStart(2, '0')}`,
      data_pagamento: pi === 0 ? `${mes}-${String(Math.min(28, (pi + 1) * 10)).padStart(2, '0')}` : null,
      valor_pago: pi === 0 ? rand(500, 3000) : null,
      status: pi === 0 ? 'paga' : 'pendente',
      forma_pagamento: pi === 0 ? 'PIX' : null,
      numero_contrato: c.numero_contrato,
      razao_social: c.razao_social
    }))
  )

  const lancamentoDescs = [
    { tipo: 'despesa', desc: 'Aluguel escritorio', cat: 'Aluguel', cor: '#ef4444' },
    { tipo: 'despesa', desc: 'Combustivel veiculos', cat: 'Transporte', cor: '#f97316' },
    { tipo: 'despesa', desc: 'Produtos quimicos', cat: 'Insumos', cor: '#eab308' },
    { tipo: 'despesa', desc: 'Conta de energia', cat: 'Utilidades', cor: '#8b5cf6' },
    { tipo: 'despesa', desc: 'Salarios equipe', cat: 'Folha', cor: '#3b82f6' },
    { tipo: 'receita', desc: 'Consultoria avulsa', cat: 'Servicos', cor: '#22c55e' },
    { tipo: 'receita', desc: 'Venda de produtos', cat: 'Vendas', cor: '#10b981' },
    { tipo: 'despesa', desc: 'Material de escritorio', cat: 'Materiais', cor: '#6b7280' },
  ]

  const lancamentos = lancamentoDescs.map((l, i) => ({
    id: `lanc-${i}`,
    tipo: l.tipo,
    descricao: l.desc,
    valor: rand(200, 8000),
    data_lancamento: `${mes}-${String(Math.min(28, (i + 1) * 3)).padStart(2, '0')}`,
    data_pagamento: i < 5 ? `${mes}-${String(Math.min(28, (i + 1) * 3)).padStart(2, '0')}` : null,
    status: i < 5 ? 'pago' : 'pendente',
    forma_pagamento: i < 5 ? (i % 2 === 0 ? 'PIX' : 'Boleto') : null,
    referencia_tipo: 'manual',
    categoria_nome: l.cat,
    categoria_cor: l.cor
  }))

  return {
    mes,
    mes_anterior: `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}`,
    stats: {
      current: {
        total_os: totalOS,
        os_concluidas: osConcluidas,
        valor_total: valorTotal,
        valor_liquidado: valorLiquidado,
        clientes_atendidos: clientesAtendidos
      },
      previous: {
        total_os: prevTotalOS,
        os_concluidas: prevOsConcluidas,
        valor_total: prevValorTotal,
        valor_liquidado: prevValorLiquidado,
        clientes_atendidos: prevClientes
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
      despesa_total: despesasPagas,
      lucro_atual: lucroAtual,
      os_recebido: osRecebido,
      parcelas_recebidas: parcelasRecebidas,
      receitas_avulsas: receitasAvulsas,
      despesas_pagas: despesasPagas,
      receitas_pendentes: rand(2000, 10000),
      despesas_pendentes: rand(1000, 5000)
    },
    meta: null
  }
}

export function generateMockExportData(mes: string) {
  const report = generateMockReport(mes)
  return {
    mes,
    resumo: {
      total_os: report.stats.current.total_os,
      os_concluidas: report.stats.current.os_concluidas,
      faturamento_os: report.stats.current.valor_total,
      recebido_os: report.stats.current.valor_liquidado,
      receitas_avulsas: report.resumo.receitas_avulsas,
      despesas: report.resumo.despesas_pagas
    },
    ordens: report.ordens.map(o => ({
      ...o,
      data_liquidacao: o.liquidado ? o.data_execucao : null,
      local_execucao: 'Sede do cliente'
    })),
    contratos: report.contratos.map(c => ({
      ...c,
      valor_parcela: Math.round(c.valor_total / c.numero_parcelas),
      dia_vencimento: 10
    })),
    parcelas: report.parcelas,
    lancamentos: report.lancamentos
  }
}
