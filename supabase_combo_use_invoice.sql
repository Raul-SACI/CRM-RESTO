-- ============================================================================
-- COMPROBANTE EN LOS USOS DE COMBO
-- Guarda el N° de comprobante emitido en caja al confirmar un USO / combo.
-- Ejecutar en el Editor SQL de Supabase. Es idempotente.
-- (Opcional: el comprobante ya queda registrado en la transacción CONSUMO_COMBO;
--  esta columna permite además verlo en la lista de "Confirmados hoy".)
-- ============================================================================

ALTER TABLE public.combo_use_requests
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;
