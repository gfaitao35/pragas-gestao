-- ============================================================
-- SCHEMA COMPLETO — cole no SQL Editor do Neon e execute
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  role TEXT NOT NULL,
  cnpj TEXT,
  nome_fantasia TEXT,
  razao_social TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo_pessoa TEXT NOT NULL DEFAULT 'juridica' CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  cpf TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  contato_responsavel TEXT,
  observacoes TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);

CREATE TABLE IF NOT EXISTS ordens_servico (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_os TEXT NOT NULL,
  data_execucao TEXT NOT NULL,
  tipo_servico TEXT NOT NULL,
  descricao_servico TEXT,
  local_execucao TEXT,
  equipamentos_utilizados TEXT,
  produtos_aplicados TEXT,
  area_tratada TEXT,
  pragas_alvo TEXT,
  observacoes TEXT,
  tecnico_responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  valor REAL,
  liquidado INTEGER NOT NULL DEFAULT 0,
  data_liquidacao TEXT,
  valor_pago REAL,
  garantia_meses INTEGER,
  visitas_gratuitas INTEGER DEFAULT 0,
  contrato_id TEXT,
  num_parcelas INTEGER DEFAULT 1,
  dia_vencimento INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_user_id ON ordens_servico(user_id);
CREATE INDEX IF NOT EXISTS idx_os_cliente_id ON ordens_servico(cliente_id);

CREATE TABLE IF NOT EXISTS certificados (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ordem_servico_id TEXT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  numero_certificado TEXT NOT NULL,
  data_emissao TEXT NOT NULL,
  data_validade TEXT NOT NULL,
  tipo_certificado TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_user_id ON certificados(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_os_id ON certificados(ordem_servico_id);

CREATE TABLE IF NOT EXISTS contratos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_contrato TEXT NOT NULL UNIQUE,
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  valor_total REAL NOT NULL,
  numero_parcelas INTEGER NOT NULL,
  valor_parcela REAL NOT NULL,
  dia_vencimento INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'concluido')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_user_id ON contratos(user_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON contratos(cliente_id);

CREATE TABLE IF NOT EXISTS parcelas (
  id TEXT PRIMARY KEY,
  contrato_id TEXT NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela REAL NOT NULL,
  data_vencimento TEXT NOT NULL,
  data_pagamento TEXT,
  valor_pago REAL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'atrasada', 'cancelada')),
  forma_pagamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcelas_contrato_id ON parcelas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);

CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('os', 'certificado', 'orcamento')),
  nome_empresa TEXT,
  subtitulo_empresa TEXT,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#1e40af',
  cor_secundaria TEXT DEFAULT '#3b82f6',
  cor_texto TEXT DEFAULT '#1f2937',
  fonte_familia TEXT DEFAULT 'Arial',
  fonte_tamanho INTEGER DEFAULT 12,
  mostrar_borda INTEGER DEFAULT 1,
  estilo_borda TEXT DEFAULT 'solid',
  texto_rodape TEXT,
  texto_assinatura TEXT,
  nome_assinatura TEXT,
  cargo_assinatura TEXT,
  campos_visiveis TEXT DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tipo)
);

CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  cor TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias_financeiras(user_id);

CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria_id TEXT REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  data_lancamento TEXT NOT NULL,
  data_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  forma_pagamento TEXT,
  referencia_tipo TEXT CHECK (referencia_tipo IN ('os', 'contrato', 'manual')),
  referencia_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_user_id ON lancamentos_financeiros(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos_financeiros(tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos_financeiros(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos_financeiros(data_lancamento);

CREATE TABLE IF NOT EXISTS empresa_config (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  responsavel_legal_nome TEXT,
  responsavel_legal_cargo TEXT,
  responsavel_legal_cpf TEXT,
  responsavel_tecnico_nome TEXT,
  responsavel_tecnico_registro TEXT,
  responsavel_tecnico_cargo TEXT,
  alvara_sanitario TEXT,
  alvara_licenca TEXT,
  certificado_registro TEXT,
  observacoes_padrao TEXT DEFAULT 'Manter o ambiente arejado por pelo menos 2 horas apos a aplicacao.
Lavar loucas e utensilios que possam ter tido contato com o produto.
Manter criancas e animais domesticos afastados das areas tratadas.
Em caso de contato com o produto, lavar a area afetada com agua corrente.
Em caso de ingestao acidental, procurar atendimento medico imediatamente.',
  telefone TEXT,
  cor_sistema TEXT DEFAULT '#ea580c',
  assinatura_legal_tipo TEXT DEFAULT 'nenhuma',
  assinatura_legal_url TEXT,
  assinatura_tecnico_tipo TEXT DEFAULT 'nenhuma',
  assinatura_tecnico_url TEXT,
  modulos_liberados TEXT DEFAULT '[]',
  logo_url TEXT,
  certificado_automation TEXT DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  descricao_orcamento TEXT,
  observacoes_certificado TEXT,
  pragas_alvo TEXT,
  praga_alvo_auto INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicos_user_id ON servicos(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

CREATE TABLE IF NOT EXISTS laudos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ordem_servico_id TEXT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  numero_laudo TEXT NOT NULL,
  texto TEXT NOT NULL,
  imagens TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laudos_user_id ON laudos(user_id);
CREATE INDEX IF NOT EXISTS idx_laudos_os_id ON laudos(ordem_servico_id);

CREATE TABLE IF NOT EXISTS cliente_documentos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cliente_id TEXT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  url TEXT NOT NULL,
  tamanho INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliente_docs_cliente_id ON cliente_documentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_docs_user_id ON cliente_documentos(user_id);
