import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { redirect } from 'next/navigation'
import { CertificadosTable } from '@/components/certificados/certificados-table'
import type { Certificado, OrdemServico, Cliente } from '@/lib/types'

function rowToCertificado(
  row: Record<string, unknown>,
  ordem?: OrdemServico
): Certificado {
  return {
    id: row.id as string,
    ordem_servico_id: row.ordem_servico_id as string,
    numero_certificado: row.numero_certificado as string,
    data_emissao: row.data_emissao as string,
    data_validade: row.data_validade as string,
    tipo_certificado: row.tipo_certificado as string,
    observacoes: (row.observacoes as string) || null,
    created_at: row.created_at as string,
    user_id: row.user_id as string,
    ordem_servico: ordem,
  }
}

export default async function CertificadosPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/login')

  const database = getDb()
  const certRows = database.prepare('SELECT * FROM certificados WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Record<string, unknown>[]
  const osIds = [...new Set(certRows.map((r) => r.ordem_servico_id))] as string[]
  const ordensMap = new Map<string, OrdemServico & { cliente?: Partial<Cliente> }>()

  if (osIds.length > 0) {
    const placeholders = osIds.map(() => '?').join(',')
    const osRows = database.prepare(`SELECT * FROM ordens_servico WHERE id IN (${placeholders})`).all(...osIds) as Record<string, unknown>[]
    const clienteIds = [...new Set(osRows.map((r) => r.cliente_id))] as string[]
    const clientesRows = database.prepare(`SELECT * FROM clientes WHERE id IN (${clienteIds.map(() => '?').join(',')})`).all(...clienteIds) as Record<string, unknown>[]
    const clientesMap = new Map<string, Partial<Cliente>>()
    for (const r of clientesRows) {
      clientesMap.set(r.id as string, {
        id: r.id as string,
        tipo_pessoa: (r.tipo_pessoa as 'fisica' | 'juridica') || 'juridica',
        razao_social: r.razao_social as string,
        nome_fantasia: (r.nome_fantasia as string) || null,
        cnpj: r.cnpj as string,
        cpf: (r.cpf as string) || null,
        telefone: (r.telefone as string) || null,
        endereco: (r.endereco as string) || null,
        cidade: (r.cidade as string) || null,
        estado: (r.estado as string) || null,
      })
    }
    for (const r of osRows) {
      const cliente = clientesMap.get(r.cliente_id as string)
      ordensMap.set(r.id as string, {
        ...r,
        cliente,
      } as OrdemServico & { cliente?: Partial<Cliente> })
    }
  }

  const certificados = certRows.map((r) =>
    rowToCertificado(r, ordensMap.get(r.ordem_servico_id as string))
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Certificados</h1>
        <p className="text-muted-foreground">Gerencie os certificados emitidos</p>
      </div>

      <CertificadosTable certificados={certificados} />
    </div>
  )
}