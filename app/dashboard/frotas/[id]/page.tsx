import { query, queryOne } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { VeiculoDetalhes } from '@/components/frotas/veiculo-detalhes'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { Veiculo, VeiculoDocumento, Manutencao, Abastecimento, TipoCombustivel, TipoManutencao } from '@/lib/types'

function rowToVeiculo(row: Record<string, unknown>): Veiculo {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    modelo: row.modelo as string,
    marca: (row.marca as string) || null,
    placa: row.placa as string,
    ano: (row.ano as number) || null,
    cor: (row.cor as string) || null,
    quilometragem: (row.quilometragem as number) || 0,
    tipo_combustivel: (row.tipo_combustivel as TipoCombustivel) || null,
    observacoes: (row.observacoes as string) || null,
    ativo: (row.ativo as number) === 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function rowToDocumento(row: Record<string, unknown>): VeiculoDocumento {
  return {
    id: row.id as string,
    veiculo_id: row.veiculo_id as string,
    user_id: row.user_id as string,
    nome: row.nome as string,
    tipo: row.tipo as string,
    url: row.url as string,
    tamanho: (row.tamanho as number) || null,
    created_at: row.created_at as string,
  }
}

function rowToManutencao(row: Record<string, unknown>): Manutencao {
  return {
    id: row.id as string,
    veiculo_id: row.veiculo_id as string,
    user_id: row.user_id as string,
    tipo_manutencao: row.tipo_manutencao as TipoManutencao,
    descricao: (row.descricao as string) || null,
    data_manutencao: row.data_manutencao as string,
    quilometragem: (row.quilometragem as number) || null,
    valor: row.valor as number,
    fornecedor: (row.fornecedor as string) || null,
    observacoes: (row.observacoes as string) || null,
    lancamento_id: (row.lancamento_id as string) || null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function rowToAbastecimento(row: Record<string, unknown>): Abastecimento {
  return {
    id: row.id as string,
    veiculo_id: row.veiculo_id as string,
    user_id: row.user_id as string,
    data_abastecimento: row.data_abastecimento as string,
    quilometragem: (row.quilometragem as number) || null,
    litros: row.litros as number,
    valor_litro: row.valor_litro as number,
    valor_total: row.valor_total as number,
    tipo_combustivel: (row.tipo_combustivel as TipoCombustivel) || null,
    posto: (row.posto as string) || null,
    observacoes: (row.observacoes as string) || null,
    lancamento_id: (row.lancamento_id as string) || null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export default async function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  const veiculoRow = await queryOne<Record<string, unknown>>`
    SELECT * FROM veiculos WHERE id = ${id} AND user_id = ${userId}
  `
  
  if (!veiculoRow) notFound()
  
  const veiculo = rowToVeiculo(veiculoRow)
  
  const [documentosRows, manutencoesRows, abastecimentosRows] = await Promise.all([
    query<Record<string, unknown>>`
      SELECT * FROM veiculo_documentos WHERE veiculo_id = ${id} ORDER BY created_at DESC
    `,
    query<Record<string, unknown>>`
      SELECT * FROM manutencoes WHERE veiculo_id = ${id} ORDER BY data_manutencao DESC
    `,
    query<Record<string, unknown>>`
      SELECT * FROM abastecimentos WHERE veiculo_id = ${id} ORDER BY data_abastecimento DESC
    `,
  ])
  
  const documentos = documentosRows.map(rowToDocumento)
  const manutencoes = manutencoesRows.map(rowToManutencao)
  const abastecimentos = abastecimentosRows.map(rowToAbastecimento)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/frotas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {veiculo.marca ? `${veiculo.marca} ${veiculo.modelo}` : veiculo.modelo}
          </h1>
          <p className="text-muted-foreground font-mono">{veiculo.placa}</p>
        </div>
      </div>

      <VeiculoDetalhes 
        veiculo={veiculo} 
        documentos={documentos}
        manutencoes={manutencoes}
        abastecimentos={abastecimentos}
      />
    </div>
  )
}
