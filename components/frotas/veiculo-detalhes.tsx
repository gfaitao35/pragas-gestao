'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Car, 
  Calendar, 
  Gauge, 
  Fuel, 
  Palette, 
  FileText,
  Plus,
  Wrench,
  Droplets,
  Image as ImageIcon,
} from 'lucide-react'
import { VeiculoForm } from './veiculo-form'
import { DocumentosSection } from './documentos-section'
import { ManutencoesSection } from './manutencoes-section'
import { AbastecimentosSection } from './abastecimentos-section'
import type { Veiculo, VeiculoDocumento, Manutencao, Abastecimento } from '@/lib/types'

interface VeiculoDetalhesProps {
  veiculo: Veiculo
  documentos: VeiculoDocumento[]
  manutencoes: Manutencao[]
  abastecimentos: Abastecimento[]
}

const combustivelLabels: Record<string, string> = {
  'flex': 'Flex',
  'gasolina': 'Gasolina',
  'etanol': 'Etanol',
  'diesel': 'Diesel',
  'gnv': 'GNV',
  'eletrico': 'Elétrico',
}

export function VeiculoDetalhes({ veiculo, documentos, manutencoes, abastecimentos }: VeiculoDetalhesProps) {
  const [editOpen, setEditOpen] = useState(false)

  const formatKm = (km: number) => {
    return new Intl.NumberFormat('pt-BR').format(km) + ' km'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const custoManutencoes = manutencoes.reduce((acc, m) => acc + m.valor, 0)
  const custoAbastecimentos = abastecimentos.reduce((acc, a) => acc + a.valor_total, 0)
  const custoTotal = custoManutencoes + custoAbastecimentos

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Gauge className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quilometragem</p>
                <p className="text-xl font-bold">{formatKm(veiculo.quilometragem)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <Wrench className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manutenções</p>
                <p className="text-xl font-bold">{manutencoes.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(custoManutencoes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Fuel className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Abastecimentos</p>
                <p className="text-xl font-bold">{abastecimentos.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(custoAbastecimentos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-destructive/10 p-3">
                <Droplets className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-xl font-bold">{formatCurrency(custoTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações do veículo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Informações do Veículo
          </CardTitle>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Editar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Veículo</DialogTitle>
              </DialogHeader>
              <VeiculoForm veiculo={veiculo} onSuccess={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Car className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Marca/Modelo</p>
                <p className="font-medium">{veiculo.marca ? `${veiculo.marca} ${veiculo.modelo}` : veiculo.modelo}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Placa</p>
                <p className="font-medium font-mono">{veiculo.placa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Ano</p>
                <p className="font-medium">{veiculo.ano || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Cor</p>
                <p className="font-medium">{veiculo.cor || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Fuel className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Combustível</p>
                <p className="font-medium">
                  {veiculo.tipo_combustivel ? combustivelLabels[veiculo.tipo_combustivel] : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={veiculo.ativo ? 'default' : 'secondary'}>
                {veiculo.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
          {veiculo.observacoes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{veiculo.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Abas de documentos, manutenções e abastecimentos */}
      <Tabs defaultValue="documentos">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Documentos ({documentos.length})
          </TabsTrigger>
          <TabsTrigger value="manutencoes" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Manutenções ({manutencoes.length})
          </TabsTrigger>
          <TabsTrigger value="abastecimentos" className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Abastecimentos ({abastecimentos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="mt-4">
          <DocumentosSection veiculoId={veiculo.id} documentos={documentos} />
        </TabsContent>

        <TabsContent value="manutencoes" className="mt-4">
          <ManutencoesSection veiculoId={veiculo.id} manutencoes={manutencoes} />
        </TabsContent>

        <TabsContent value="abastecimentos" className="mt-4">
          <AbastecimentosSection veiculoId={veiculo.id} abastecimentos={abastecimentos} tipoCombustivel={veiculo.tipo_combustivel} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
