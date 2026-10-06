-- ============================================================================
-- ATRIBUCIÓN DE REGISTRO POR MOZO (QR de cada mozo)
-- Guarda qué mozo trajo a cada cliente (para el ranking / incentivos).
-- Ejecutar en el Editor SQL de Supabase. Es idempotente.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registered_by UUID;  -- id del mozo que lo registró (vía su QR)

CREATE INDEX IF NOT EXISTS idx_profiles_registered_by ON public.profiles(registered_by);
