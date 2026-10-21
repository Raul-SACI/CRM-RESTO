-- ============================================================================
-- GIFT CARDS (Descuentos Exclusivos)
-- Ejecutar este bloque en el Editor SQL de Supabase.
-- Es idempotente: se puede correr varias veces sin romper nada.
--
-- Modelo: USO ÚNICO. La gift card se canjea entera en una sola visita.
-- Vencimiento configurable (por defecto 30 días). El comprador recibe los
-- puntos (se cargan desde el front, igual que la compra de combos). El canje
-- lo hace el cajero tecleando el código (no necesita cámara).
-- ============================================================================

-- 1. Tabla de gift cards vendidas (cada fila es una tarjeta única).
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                 -- código corto para tipear (ej. GC-4F7K2P)
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  price_paid NUMERIC NOT NULL,               -- lo que pagó el comprador
  value NUMERIC NOT NULL,                     -- saldo de la tarjeta (con el extra)
  recipient_name TEXT,                        -- "Para"
  sender_name TEXT,                           -- "De"
  message TEXT,                               -- mensaje opcional
  status TEXT NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','usada','vencida')),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- cajero que la canjeó
  invoice_number TEXT,                        -- N° de comprobante del canje
  consumed_amount NUMERIC,                    -- lo que consumió (informativo)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON public.gift_cards (code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_buyer ON public.gift_cards (buyer_id);

-- 2. RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- El comprador ve sus propias gift cards (para "Mis Gift Cards").
DROP POLICY IF EXISTS "gc_select_own" ON public.gift_cards;
CREATE POLICY "gc_select_own" ON public.gift_cards
  FOR SELECT USING ((SELECT auth.uid()) = buyer_id);

-- El admin ve y administra todas.
DROP POLICY IF EXISTS "gc_admin_all" ON public.gift_cards;
CREATE POLICY "gc_admin_all" ON public.gift_cards
  FOR ALL USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

-- (La creación y el canje se hacen con funciones SECURITY DEFINER de abajo,
--  así que no hace falta policy de INSERT/UPDATE para clientes ni cajeros.)

-- 3. Crear una gift card (la llama el comprador tras aprobarse el pago).
--    Genera un código único corto, sin caracteres ambiguos (O/0, I/1, L).
CREATE OR REPLACE FUNCTION public.create_gift_card(
  p_price NUMERIC,
  p_value NUMERIC,
  p_recipient TEXT DEFAULT NULL,
  p_sender TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_expires_days INT DEFAULT 30
) RETURNS public.gift_cards AS $$
DECLARE
  v_alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code TEXT;
  v_i INT;
  v_row public.gift_cards;
  v_try INT := 0;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF COALESCE(p_value, 0) <= 0 OR COALESCE(p_price, 0) < 0 THEN
    RAISE EXCEPTION 'Monto inválido';
  END IF;

  LOOP
    v_try := v_try + 1;
    v_code := 'GC-';
    FOR v_i IN 1..6 LOOP
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.gift_cards
        (code, buyer_id, price_paid, value, recipient_name, sender_name, message, status, created_at, expires_at)
      VALUES
        (v_code, (SELECT auth.uid()), p_price, p_value,
         NULLIF(trim(p_recipient), ''), NULLIF(trim(p_sender), ''), NULLIF(trim(p_message), ''),
         'activa', now(), now() + (GREATEST(p_expires_days, 1)::text || ' days')::interval)
      RETURNING * INTO v_row;
      RETURN v_row;
    EXCEPTION WHEN unique_violation THEN
      IF v_try > 8 THEN RAISE EXCEPTION 'No se pudo generar un código único'; END IF;
      -- reintenta con otro código
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Consultar una gift card por código (la usa el cajero antes de canjear).
CREATE OR REPLACE FUNCTION public.gift_card_lookup(p_code TEXT)
RETURNS public.gift_cards AS $$
DECLARE v_row public.gift_cards;
BEGIN
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Solo el personal puede consultar gift cards';
  END IF;
  SELECT * INTO v_row FROM public.gift_cards WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe una gift card con ese código';
  END IF;
  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Canjear una gift card (uso único, atómico). La usa el cajero.
CREATE OR REPLACE FUNCTION public.redeem_gift_card(
  p_code TEXT,
  p_invoice TEXT DEFAULT NULL,
  p_consumed NUMERIC DEFAULT NULL
) RETURNS public.gift_cards AS $$
DECLARE
  v_row public.gift_cards;
  v_existing public.gift_cards;
BEGIN
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Solo el personal puede canjear gift cards';
  END IF;

  -- Marca como usada SOLO si está activa y no vencida (evita doble uso).
  UPDATE public.gift_cards
    SET status = 'usada',
        used_at = now(),
        used_by = (SELECT auth.uid()),
        invoice_number = NULLIF(trim(p_invoice), ''),
        consumed_amount = p_consumed
    WHERE code = upper(trim(p_code))
      AND status = 'activa'
      AND expires_at >= now()
    RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN v_row;
  END IF;

  -- No se actualizó: explicamos por qué.
  SELECT * INTO v_existing FROM public.gift_cards WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe una gift card con ese código';
  END IF;
  IF v_existing.status = 'usada' THEN
    RAISE EXCEPTION 'Esta gift card ya fue usada el %', to_char(v_existing.used_at, 'DD/MM/YYYY');
  END IF;
  IF v_existing.expires_at < now() THEN
    RAISE EXCEPTION 'Esta gift card venció el %', to_char(v_existing.expires_at, 'DD/MM/YYYY');
  END IF;
  RAISE EXCEPTION 'No se pudo canjear la gift card';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_gift_card(NUMERIC, NUMERIC, TEXT, TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gift_card_lookup(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card(TEXT, TEXT, NUMERIC) TO authenticated;
