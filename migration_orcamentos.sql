-- Migration: criar tabela de orçamentos
-- Execute este script no seu banco de dados Neon (PostgreSQL)

CREATE TABLE IF NOT EXISTS orcamentos (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  numero           INTEGER NOT NULL,
  data             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'rascunho',
  empresa          JSONB NOT NULL DEFAULT '{}',
  cliente          JSONB NOT NULL DEFAULT '{}',
  titulo_servico   TEXT NOT NULL DEFAULT '',
  procedimentos    JSONB NOT NULL DEFAULT '[]',
  garantia         TEXT NOT NULL DEFAULT '',
  valor_investimento NUMERIC(12, 2) NOT NULL DEFAULT 0,
  formas_pagamento JSONB NOT NULL DEFAULT '[]',
  consideracoes    JSONB NOT NULL DEFAULT '[]',
  dias_validade    INTEGER NOT NULL DEFAULT 10,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscar orçamentos de um usuário rapidamente
CREATE INDEX IF NOT EXISTS idx_orcamentos_user_id ON orcamentos(user_id);
