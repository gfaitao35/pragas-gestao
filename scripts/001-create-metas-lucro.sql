-- Criação da tabela metas_lucro
CREATE TABLE IF NOT EXISTS metas_lucro (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mes VARCHAR(7) NOT NULL, -- formato: 'YYYY-MM'
  valor_meta NUMERIC(12, 2) NOT NULL DEFAULT 0,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mes)
);

-- Índice para buscas por user_id e mes
CREATE INDEX IF NOT EXISTS idx_metas_lucro_user_mes ON metas_lucro(user_id, mes);
