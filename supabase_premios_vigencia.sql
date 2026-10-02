-- ============================================================================
-- VIGENCIA DE PREMIOS (activación/desactivación automática por fechas)
-- El premio solo se muestra a los clientes dentro del rango de fechas.
-- Ejecutar en el Editor SQL de Supabase. Es idempotente.
-- ============================================================================

ALTER TABLE public.catalogo_premios
  ADD COLUMN IF NOT EXISTS active_from DATE,   -- activo desde (opcional)
  ADD COLUMN IF NOT EXISTS active_until DATE;  -- activo hasta (opcional, inclusive)
