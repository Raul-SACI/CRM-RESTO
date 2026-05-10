-- SQL para ejecutar en el Editor SQL de Supabase

-- 1. Tabla de Perfiles (Extensión de Auth.Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  dni TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  birth_date DATE,
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'waiter', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Transacciones
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  waiter_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  points_earned INTEGER NOT NULL,
  description TEXT DEFAULT 'Carga de puntos por consumo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Catálogo de Premios
CREATE TABLE public.catalogo_premios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_premios ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Los usuarios pueden ver su propio perfil" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);

-- NOTA: Esta política puede causar recursión infinita si no se maneja bien.
-- La solución recomendada en Supabase es usar una función SECURITY DEFINER
-- para chequear el rol sin disparar RLS de nuevo.

CREATE OR REPLACE FUNCTION public.check_is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('waiter', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Los mozos pueden ver todos los perfiles" 
  ON public.profiles FOR SELECT USING (public.check_is_staff());

CREATE POLICY "Los mozos pueden actualizar puntos de clientes"
  ON public.profiles FOR UPDATE USING (public.check_is_staff());

-- Políticas para Transactions
CREATE POLICY "Los usuarios pueden ver sus transacciones" 
  ON public.transactions FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Los mozos pueden insertar transacciones" 
  ON public.transactions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('waiter', 'admin'))
  );

-- Políticas para Catalogo
CREATE POLICY "Todo el mundo puede ver los premios" 
  ON public.catalogo_premios FOR SELECT USING (true);

-- Lógica de Cumpleaños (Trigger Sugerido)
-- Esta es una función que se podría llamar vía Edge Function o CRON Job cada día a las 00:00
CREATE OR REPLACE FUNCTION public.otorgar_puntos_cumpleaños()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET points = points + 500
  WHERE 
    EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND
    EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
