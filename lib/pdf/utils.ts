// lib/pdf/utils.ts
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { formatDateBRFromYYYYMMDD } from '@/lib/utils'  // ← reuso do seu utils existente!

type Template = {
  nome_empresa: string | null
  subtitulo_empresa: string | null
  logo_url: string | null
  cor_primaria: string
  cor_secundaria: string
  cor_texto: string
  fonte_familia: string
  fonte_tamanho: number
  mostrar_borda: number  // 0 ou 1
  estilo_borda: string
  texto_rodape: string | null
  texto_assinatura: string | null
  nome_assinatura: string | null
  cargo_assinatura: string | null
  // campos_visiveis?: string  // se for JSON string, pode parsear depois
}

export async function getTemplate(tipo: 'os' | 'certificado' | 'orcamento'): Promise<Template | null> {
  const userId = await getSessionUserId()
  if (!userId) return null

  const db = getDb()

  // Tenta o template específico
  let template = db.prepare(
    'SELECT * FROM document_templates WHERE user_id = ? AND tipo = ?'
  ).get(userId, tipo) as Template | undefined

  // Fallback para 'os' se não encontrar e não for OS
  if (!template && tipo !== 'os') {
    template = db.prepare(
      'SELECT * FROM document_templates WHERE user_id = ? AND tipo = ?'
    ).get(userId, 'os') as Template | undefined
  }

  return template || null
}

export function renderOrcamentoHtml(
  orcamento: {
    numero: number
    data: string          // YYYY-MM-DD
    cliente: { nome: string; contato?: string; endereco?: string; cidade?: string }
    tituloServico: string
    procedimentos: Array<{ titulo: string; descricao: string }>
    garantia: string
    valorInvestimento: number
    formasPagamento: string[]
    consideracoes: string[]
    diasValidade: number
    empresa?: { nomeFantasia?: string; razaoSocial?: string; /* outros se quiser usar */ }
  },
  template: Template
): string {
  const {
    numero, data, cliente, tituloServico, procedimentos,
    garantia, valorInvestimento, formasPagamento, consideracoes, diasValidade
  } = orcamento

  const borda = template.mostrar_borda
    ? `border: 1px ${template.estilo_borda} ${template.cor_secundaria};`
    : 'border: none;'

  const dataFormatada = formatDateBRFromYYYYMMDD(data)  // ← usando sua função!

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: ${template.fonte_familia || 'Arial, Helvetica, sans-serif'};
      font-size: ${template.fonte_tamanho || 12}px;
      color: ${template.cor_texto || '#1f2937'};
      line-height: 1.5;
      margin: 0;
      padding: 40px 35px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 4px solid ${template.cor_primaria || '#1e40af'};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo img { max-height: 100px; max-width: 200px; object-fit: contain; }
    .empresa h1 { margin: 0; font-size: 26px; color: ${template.cor_primaria}; }
    .title { 
      text-align: center; 
      font-size: 24px; 
      font-weight: bold; 
      color: ${template.cor_primaria}; 
      margin: 30px 0 25px;
      text-transform: uppercase;
    }
    .info-line { margin-bottom: 8px; }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: ${template.cor_primaria};
      margin: 30px 0 12px;
      border-left: 5px solid ${template.cor_secundaria};
      padding-left: 10px;
    }
    table { width: 100%; ${borda} border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px 12px; text-align: left; ${borda} vertical-align: top; }
    th { background: ${template.cor_secundaria || '#3b82f6'}; color: white; font-weight: bold; }
    .valor-total {
      font-size: 20px;
      font-weight: bold;
      color: ${template.cor_primaria};
      text-align: right;
      margin: 20px 0;
    }
    .assinatura {
      margin-top: 60px;
      text-align: center;
      border-top: 1px solid #888;
      padding-top: 20px;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 11px;
      color: #555;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
  </style>
</head>
<body>

  <div class="header">
    ${template.logo_url ? `<div class="logo"><img src="${template.logo_url}" alt="Logo da empresa"></div>` : ''}
    <div class="empresa">
      <h1>${template.nome_empresa || orcamento.empresa?.nomeFantasia || 'Empresa'}</h1>
      ${template.subtitulo_empresa ? `<div>${template.subtitulo_empresa}</div>` : ''}
    </div>
  </div>

  <div class="title">ORÇAMENTO Nº ${numero.toString().padStart(5, '0')}</div>

  <div class="info-line"><strong>Data:</strong> ${dataFormatada}</div>
  <div class="info-line"><strong>Validade:</strong> ${diasValidade} dias a partir da data de emissão</div>

  <div class="section-title">Cliente</div>
  <p>
    <strong>${cliente.nome || '—'}</strong><br>
    ${cliente.contato ? `Contato: ${cliente.contato}<br>` : ''}
    ${cliente.endereco ? `${cliente.endereco}<br>` : ''}
    ${cliente.cidade ? `${cliente.cidade}` : ''}
  </p>

  <div class="section-title">${tituloServico || 'Serviço(s) Orçado(s)'}</div>

  ${procedimentos.map(proc => `
    <div style="margin-bottom: 20px;">
      <strong style="font-size: 16px;">${proc.titulo || 'Procedimento'}</strong>
      <p style="white-space: pre-wrap; margin-top: 6px;">${proc.descricao || ''}</p>
    </div>
  `).join('')}

  <div class="section-title">Garantia</div>
  <p>${garantia || '—'}</p>

  <div class="section-title">Investimento Total</div>
  <div class="valor-total">
    R$ ${valorInvestimento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </div>

  <div class="section-title">Formas de Pagamento</div>
  <ul style="margin: 0; padding-left: 20px;">
    ${formasPagamento.map(fp => `<li>${fp}</li>`).join('')}
  </ul>

  <div class="section-title">Considerações Finais</div>
  <ul style="margin: 0; padding-left: 20px;">
    ${consideracoes.map(c => `<li>${c}</li>`).join('')}
  </ul>

  ${template.texto_assinatura ? `
    <div class="assinatura">
      <p>______________________________________________</p>
      <p><strong>${template.nome_assinatura || ''}</strong></p>
      <p>${template.cargo_assinatura || ''}</p>
    </div>
  ` : ''}

  <div class="footer">
    ${template.texto_rodape || 'Documento gerado pelo Sistema de Gestão de Serviços'}<br>
    Gerado em ${new Date().toLocaleString('pt-BR')}
  </div>

</body>
</html>
  `
}