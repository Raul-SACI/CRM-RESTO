-- ============================================================================
-- INVITACIONES A CENA PARA CLIENTES OCULTOS
-- El admin le asigna a un cliente oculto puntual una "cena para 2" cubierta,
-- para una sucursal y un día específico, de un solo uso.
-- Ejecutar en el Editor SQL de Supabase (después de supabase_mystery_shopper.sql,
-- que crea la función check_is_admin). Es idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mystery_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  branch TEXT,
  valid_date DATE NOT NULL,                         -- el día en que se puede usar
  title TEXT DEFAULT 'Cena para 2 (cena + 2 bebidas)',
  code TEXT,                                        -- código de canje generado al usarla
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'usada', 'vencida')),
  used_at TIMESTAMPTZ,
  invoice_number TEXT,                              -- N° de comprobante confirmado en caja
  amount_spent NUMERIC(12, 2),                      -- monto real, lo carga el admin después
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mystery_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client sees own invitations" ON public.mystery_invitations;
DROP POLICY IF EXISTS "Client uses own invitation" ON public.mystery_invitations;
DROP POLICY IF EXISTS "Admin manages invitations" ON public.mystery_invitations;

-- El cliente ve solo sus invitaciones.
CREATE POLICY "Client sees own invitations"
  ON public.mystery_invitations FOR SELECT
  USING (auth.uid() = client_id);

-- El cliente puede marcar su invitación como usada (al canjearla).
CREATE POLICY "Client uses own invitation"
  ON public.mystery_invitations FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- El admin gestiona todas (crear, cargar monto, etc.).
CREATE POLICY "Admin manages invitations"
  ON public.mystery_invitations FOR ALL
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

CREATE INDEX IF NOT EXISTS idx_mystery_invitations_client ON public.mystery_invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_mystery_invitations_status ON public.mystery_invitations(status);
