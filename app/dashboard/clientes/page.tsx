import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { redirect } from 'next/navigation'
import { ClientesTable } from '@/components/clientes/clientes-table'
import { ClienteForm } from '@/components/clientes/cliente-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import type { Cliente } from '@/lib/types'

function rowToCliente(row: Record<string, unknown>): Cliente {
  return {
    id: row.id as string,
    tipo_pessoa: (row.tipo_pessoa as 'fisica' | 'juridica') || 'juridica',
    razao_social: row.razao_social as string,
    nome_fantasia: (row.nome_fantasia as string) || null,
    cnpj: (row.cnpj as string) || '',
    cpf: (row.cpf as string) || null,
    endereco: (row.endereco as string) || null,
    cidade: (row.cidade as string) || null,
    estado: (row.estado as string) || null,
    cep: (row.cep as string) || null,
    telefone: (row.telefone as string) || null,
    email: (row.email as string) || null,
    contato_responsavel: (row.contato_responsavel as string) || null,
    observacoes: (row.observacoes as string) || null,
    ativo: (row.ativo as number) === 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user_id: row.user_id as string,
  }
}

export default async function ClientesPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  const database = getDb()
  const rows = database.prepare('SELECT * FROM clientes WHERE user_id = ? ORDER BY razao_social ASC').all(userId) as Record<string, unknown>[]
  const clientes = rows.map(rowToCliente)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie os clientes cadastrados</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
            </DialogHeader>
            <ClienteForm />
          </DialogContent>
        </Dialog>
      </div>

      <ClientesTable clientes={clientes} />
    </div>
  )
}
