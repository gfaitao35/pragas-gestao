import { query } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { redirect } from 'next/navigation'
import { VeiculosTable } from '@/components/frotas/veiculos-table'
import { VeiculoForm } from '@/components/frotas/veiculo-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import type { Veiculo, TipoCombustivel } from '@/lib/types'

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

export default async function FrotasPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  const rows = await query<Record<string, unknown>>`
    SELECT v.*, 
      (SELECT COUNT(*) FROM manutencoes m WHERE m.veiculo_id = v.id) as total_manutencoes,
      (SELECT COUNT(*) FROM abastecimentos a WHERE a.veiculo_id = v.id) as total_abastecimentos,
      (SELECT COALESCE(SUM(m.valor), 0) FROM manutencoes m WHERE m.veiculo_id = v.id) as custo_manutencoes,
      (SELECT COALESCE(SUM(a.valor_total), 0) FROM abastecimentos a WHERE a.veiculo_id = v.id) as custo_abastecimentos
    FROM veiculos v 
    WHERE v.user_id = ${userId} 
    ORDER BY v.modelo ASC
  `
  
  const veiculos = rows.map(row => ({
    ...rowToVeiculo(row),
    total_manutencoes: Number(row.total_manutencoes) || 0,
    total_abastecimentos: Number(row.total_abastecimentos) || 0,
    custo_total: (Number(row.custo_manutencoes) || 0) + (Number(row.custo_abastecimentos) || 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Frotas</h1>
          <p className="text-muted-foreground">Gerencie os veículos da empresa</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Veículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Veículo</DialogTitle>
            </DialogHeader>
            <VeiculoForm />
          </DialogContent>
        </Dialog>
      </div>

      <VeiculosTable veiculos={veiculos} />
    </div>
  )
}
