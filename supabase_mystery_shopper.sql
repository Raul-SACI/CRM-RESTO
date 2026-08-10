-- ============================================================================
-- CLIENTES OCULTOS (MYSTERY SHOPPERS) + SUPERVISIONES
-- Ejecutar este bloque en el Editor SQL de Supabase.
-- Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================

-- 1. Marca de "cliente oculto" en el perfil.
--    El cliente sigue siendo role = 'client'; solo se le agrega esta bandera.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_mystery_shopper BOOLEAN DEFAULT FALSE;

-- 2. Helper: ¿el usuario actual es ADMIN? (NO incluye a los cajeros/mozos)
--    Lo usamos para que SOLO el admin vea las supervisiones.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper: ¿el usuario actual está designado como cliente oculto?
CREATE OR REPLACE FUNCTION public.is_mystery_shopper()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND is_mystery_shopper = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Tabla de reportes de supervisión (uno por visita del cliente oculto).
CREATE TABLE IF NOT EXISTS public.mystery_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  branch TEXT,
  visit_date DATE,
  rating_cleanliness INTEGER CHECK (rating_cleanliness BETWEEN 1 AND 5),
  rating_service INTEGER CHECK (rating_service BETWEEN 1 AND 5),
  rating_speed INTEGER CHECK (rating_speed BETWEEN 1 AND 5),
  rating_food INTEGER CHECK (rating_food BETWEEN 1 AND 5),
  rating_overall INTEGER CHECK (rating_overall BETWEEN 1 AND 5),
  comment TEXT,
  -- 'pendiente' = enviado por el cliente, esperando lectura del admin
  -- 'revisado'  = el admin lo leyó y (si correspondía) regaló puntos
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'revisado')),
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seguridad a nivel de fila (RLS)
ALTER TABLE public.mystery_reports ENABLE ROW LEVEL SECURITY;

-- Limpieza previa (para poder re-ejecutar el script)
DROP POLICY IF EXISTS "Mystery shopper sees own reports" ON public.mystery_reports;
DROP POLICY IF EXISTS "Mystery shopper inserts own reports" ON public.mystery_reports;
DROP POLICY IF EXISTS "Mystery shopper edits own pending reports" ON public.mystery_reports;
DROP POLICY IF EXISTS "Admin manages all reports" ON public.mystery_reports;

-- El cliente oculto ve SOLO sus propios reportes.
CREATE POLICY "Mystery shopper sees own reports"
  ON public.mystery_reports FOR SELECT
  USING (auth.uid() = client_id);

-- El cliente oculto crea reportes propios (solo si está designado).
CREATE POLICY "Mystery shopper inserts own reports"
  ON public.mystery_reports FOR INSERT
  WITH CHECK (auth.uid() = client_id AND public.is_mystery_shopper());

-- El cliente oculto puede corregir su reporte mientras siga "pendiente".
CREATE POLICY "Mystery shopper edits own pending reports"
  ON public.mystery_reports FOR UPDATE
  USING (auth.uid() = client_id AND status = 'pendiente')
  WITH CHECK (auth.uid() = client_id);

-- SOLO el admin ve y gestiona todos los reportes. Los cajeros/mozos NO acceden.
CREATE POLICY "Admin manages all reports"
  ON public.mystery_reports FOR ALL
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

-- 6. Índices útiles
CREATE INDEX IF NOT EXISTS idx_mystery_reports_client ON public.mystery_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_mystery_reports_status ON public.mystery_reports(status);
