-- ServicePro - Sistema de Gestao de Servicos
-- Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'operador' CHECK (role IN ('admin', 'operador')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', 'Usuario'),
    COALESCE(new.raw_user_meta_data ->> 'role', 'operador')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Clients table
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  nome_razao_social TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj);
CREATE INDEX idx_clientes_nome ON public.clientes(nome_razao_social);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select" ON public.clientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE USING (auth.uid() = user_id);

-- Service Orders table
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_os SERIAL,
  data_abertura DATE NOT NULL DEFAULT CURRENT_DATE,
  data_execucao DATE,
  data_conclusao DATE,
  tipo_servico TEXT NOT NULL,
  descricao TEXT,
  valor DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_os_user_id ON public.ordens_servico(user_id);
CREATE INDEX idx_os_cliente_id ON public.ordens_servico(cliente_id);
CREATE INDEX idx_os_numero ON public.ordens_servico(numero_os);
CREATE INDEX idx_os_status ON public.ordens_servico(status);

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "os_select" ON public.ordens_servico FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "os_insert" ON public.ordens_servico FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "os_update" ON public.ordens_servico FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "os_delete" ON public.ordens_servico FOR DELETE USING (auth.uid() = user_id);

-- Certificates table
CREATE TABLE IF NOT EXISTS public.certificados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordem_servico_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  numero_certificado SERIAL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  validade DATE,
  observacoes TEXT,
  assinatura_digital TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cert_user_id ON public.certificados(user_id);
CREATE INDEX idx_cert_os_id ON public.certificados(ordem_servico_id);

ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert_select" ON public.certificados FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cert_insert" ON public.certificados FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cert_update" ON public.certificados FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cert_delete" ON public.certificados FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_os_updated_at ON public.ordens_servico;
CREATE TRIGGER update_os_updated_at
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
