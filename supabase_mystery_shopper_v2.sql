-- ============================================================================
-- SUPERVISIONES v2 — formulario ampliado
-- Ejecutar en el Editor SQL de Supabase DESPUÉS de supabase_mystery_shopper.sql
-- Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================

-- 1. Nuevas columnas en los reportes de supervisión.
--    (Se reutilizan las existentes: rating_cleanliness = limpieza del local,
--     rating_service = predisposición del mozo, rating_food = calidad del plato,
--     rating_overall = calificación general, comment = observaciones.)
ALTER TABLE public.mystery_reports
  ADD COLUMN IF NOT EXISTS visit_time TEXT,                       -- horario de la visita (HH:MM)
  ADD COLUMN IF NOT EXISTS rating_cleanliness_bathroom INTEGER    -- limpieza e higiene del baño
    CHECK (rating_cleanliness_bathroom BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS waiter_name TEXT,                      -- nombre de quién atendió
  ADD COLUMN IF NOT EXISTS wait_greeting TEXT,                    -- espera hasta que te atendieron
  ADD COLUMN IF NOT EXISTS wait_order_taken TEXT,                 -- espera hasta que tomaron el pedido
  ADD COLUMN IF NOT EXISTS order_type TEXT,                       -- 'bebida' | 'bebida_comida'
  ADD COLUMN IF NOT EXISTS wait_order_delivered TEXT,            -- espera hasta que trajeron el pedido
  ADD COLUMN IF NOT EXISTS photo_url TEXT,                        -- foto del plato/bebida
  ADD COLUMN IF NOT EXISTS rating_aesthetics INTEGER             -- estética del plato/bebida
    CHECK (rating_aesthetics BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS wait_bill TEXT;                        -- espera hasta que trajeron la cuenta

-- 2. Bucket de storage para las fotos de los platos (público para lectura).
INSERT INTO storage.buckets (id, name, public)
VALUES ('supervision-fotos', 'supervision-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de storage: cualquier usuario autenticado (el cliente oculto)
--    puede SUBIR fotos a ese bucket; la lectura es pública.
DROP POLICY IF EXISTS "Auth sube fotos supervision" ON storage.objects;
DROP POLICY IF EXISTS "Lectura publica fotos supervision" ON storage.objects;

CREATE POLICY "Auth sube fotos supervision"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'supervision-fotos');

CREATE POLICY "Lectura publica fotos supervision"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'supervision-fotos');
