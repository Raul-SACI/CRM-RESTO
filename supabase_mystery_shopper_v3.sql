-- ============================================================================
-- SUPERVISIONES v3 — preguntas personalizadas
-- Ejecutar en el Editor SQL de Supabase DESPUÉS de supabase_mystery_shopper_v2.sql
-- Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================

-- Respuestas a las preguntas que el admin agrega desde el editor del formulario.
-- Se guardan como JSON, con la clave = id de la pregunta.
ALTER TABLE public.mystery_reports
  ADD COLUMN IF NOT EXISTS custom_answers JSONB DEFAULT '{}'::jsonb;
