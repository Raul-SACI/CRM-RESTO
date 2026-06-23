// Cron diario: cumpleaños, combos por vencer e inactividad.
// Lee la configuración editable desde el panel admin (__DESIGN_SETTINGS__.autoNotif):
// activar/desactivar, textos, días y puntos de regalo.
// Se ejecuta una vez por día vía Vercel Cron (ver vercel.json). Protegido por CRON_SECRET.

export default async function handler(req: any, res: any) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers["authorization"] || req.headers["Authorization"];
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "No autorizado." });
    }
  }

  const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/['"]/g, "").trim();
  const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").replace(/['"]/g, "").trim();
  const APP_URL = (process.env.APP_URL || "https://www.craftclub.com.ar").replace(/['"]/g, "").trim();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Faltan variables de Supabase en el servidor." });
  }

  const sb = async (path: string, options: any = {}) => {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Supabase ${path}: ${resp.status} ${txt}`);
    }
    if (resp.status === 204) return null;
    return resp.json();
  };

  const now = new Date();
  const ar = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const todayMonth = ar.getMonth() + 1;
  const todayDay = ar.getDate();
  const todayKey = `${ar.getFullYear()}-${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;
  const monthKey = `${ar.getFullYear()}-${String(todayMonth).padStart(2, "0")}`;

  const defaults = {
    birthday: { enabled: true, message: "¡Feliz cumple, {nombre}! Te esperamos en CRAFT.", giftPoints: 0 },
    comboExpiring: { enabled: true, message: 'A tu combo "{combo}" le quedan {dias} días. ¡Usalo en CRAFT!', daysBefore: 7 },
    inactive: { enabled: true, message: "Hace tiempo que no te vemos, {nombre}. ¡Volvé a CRAFT!", daysInactive: 60, giftPoints: 0 }
  };

  let cfg: any = defaults;
  let combosMeta: any[] = [];
  try {
    const design = await sb(`catalogo_premios?title=eq.__DESIGN_SETTINGS__&select=description`);
    if (design && design[0]?.description) {
      const parsed = JSON.parse(design[0].description);
      if (parsed.autoNotif) {
        cfg = {
          birthday: { ...defaults.birthday, ...(parsed.autoNotif.birthday || {}) },
          comboExpiring: { ...defaults.comboExpiring, ...(parsed.autoNotif.comboExpiring || {}) },
          inactive: { ...defaults.inactive, ...(parsed.autoNotif.inactive || {}) }
        };
      }
      combosMeta = parsed.combos || [];
    }
  } catch (e) { /* defaults */ }

  const summary = { birthdays: 0, expiring: 0, inactive: 0, gifted: 0, errors: [] as string[] };

  const fillText = (tpl: string, vars: Record<string, string>) =>
    tpl.replace(/\{(\w+)\}/g, (_m: string, k: string) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

  const giftPoints = async (client: any, points: number, concept: string) => {
    if (!points || points <= 0) return;
    await sb(`transactions`, {
      method: "POST",
      body: JSON.stringify({
        client_id: client.id, waiter_id: client.id, amount: 0,
        points_earned: points, branch: "REGALO AUTOMÁTICO", description: concept
      })
    });
    await sb(`profiles?id=eq.${client.id}`, {
      method: "PATCH",
      body: JSON.stringify({ points: (client.points || 0) + points })
    });
    summary.gifted++;
  };

  const sendAuto = async (client: any, kind: string, refKey: string, title: string, message: string) => {
    const existing = await sb(`auto_notifications_log?client_id=eq.${client.id}&kind=eq.${kind}&ref_key=eq.${encodeURIComponent(refKey)}&select=id`);
    if (existing && existing.length > 0) return false;
    await sb(`notifications`, { method: "POST", body: JSON.stringify({ client_id: client.id, title, message }) });
    if (client.email && client.email.includes("@")) {
      try {
        await fetch(`${APP_URL}/api/email/send`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: client.email, subject: title, message })
        });
      } catch (e: any) { summary.errors.push(`email ${client.id}: ${e?.message || e}`); }
    }
    await sb(`auto_notifications_log`, { method: "POST", body: JSON.stringify({ client_id: client.id, kind, ref_key: refKey }) });
    return true;
  };

  try {
    const clients = await sb(`profiles?role=eq.client&select=id,full_name,email,birth_date,points,created_at`);
    const clientById: Record<string, any> = {};
    (clients || []).forEach((c: any) => { clientById[c.id] = c; });

    // 1) CUMPLEAÑOS
    if (cfg.birthday.enabled) {
      for (const c of clients || []) {
        if (!c.birth_date) continue;
        const b = new Date(c.birth_date);
        if (isNaN(b.getTime())) continue;
        if (b.getMonth() + 1 === todayMonth && b.getDate() === todayDay) {
          try {
            const giftN = cfg.birthday.giftPoints || 0;
            const msg = fillText(cfg.birthday.message, { nombre: c.full_name || "crafter", puntos: String(giftN) });
            const ok = await sendAuto(c, "birthday", todayKey, "¡Feliz cumpleaños de parte de CRAFT! 🎉", msg);
            if (ok) { summary.birthdays++; if (giftN > 0) await giftPoints(c, giftN, `REGALO_CUMPLE: +${giftN} puntos de regalo`); }
          } catch (e: any) { summary.errors.push(`bday ${c.id}: ${e?.message || e}`); }
        }
      }
    }

    // 2) COMBO POR VENCER
    if (cfg.comboExpiring.enabled) {
      const daysBefore = cfg.comboExpiring.daysBefore || 7;
      const purchases = await sb(`transactions?description=like.COMPRA_COMBO:*&select=client_id,description,created_at&order=created_at.desc`);
      for (const p of purchases || []) {
        const body = (p.description || "").replace("COMPRA_COMBO:", "").trim();
        const comboPart = body.split("|")[0];
        const title = body.split("|")[1] || "tu combo";
        const lastU = comboPart.lastIndexOf("_");
        const comboId = lastU !== -1 ? comboPart.slice(0, lastU) : comboPart;
        const meta = combosMeta.find((m: any) => m.id === comboId);
        const expDays = (meta && meta.expirationDays) || 30;
        const purchaseDate = new Date(p.created_at);
        if (isNaN(purchaseDate.getTime())) continue;
        const limit = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), purchaseDate.getDate() + expDays);
        const today0 = new Date(ar.getFullYear(), ar.getMonth(), ar.getDate());
        const daysLeft = Math.round((limit.getTime() - today0.getTime()) / (24 * 60 * 60 * 1000));
        if (daysLeft === daysBefore) {
          const c = clientById[p.client_id];
          if (!c) continue;
          const refKey = `${comboId}_${p.created_at}`;
          try {
            const msg = fillText(cfg.comboExpiring.message, { nombre: c.full_name || "crafter", combo: title, dias: String(daysBefore) });
            const ok = await sendAuto(c, "combo_expiring", refKey, "Tu combo está por vencer ⏳", msg);
            if (ok) summary.expiring++;
          } catch (e: any) { summary.errors.push(`exp ${p.client_id}: ${e?.message || e}`); }
        }
      }
    }

    // 3) INACTIVIDAD
    if (cfg.inactive.enabled) {
      const daysInactive = cfg.inactive.daysInactive || 60;
      const cutoff = new Date(ar.getTime() - daysInactive * 24 * 60 * 60 * 1000).toISOString();
      for (const c of clients || []) {
        try {
          const recent = await sb(`transactions?client_id=eq.${c.id}&points_earned=gt.0&created_at=gte.${cutoff}&select=id&limit=1`);
          if (recent && recent.length > 0) continue;
          const ever = await sb(`transactions?client_id=eq.${c.id}&points_earned=gt.0&select=created_at&order=created_at.desc&limit=1`);
          if (!ever || ever.length === 0) continue;
          const giftN = cfg.inactive.giftPoints || 0;
          const msg = fillText(cfg.inactive.message, { nombre: c.full_name || "crafter", puntos: String(giftN) });
          const ok = await sendAuto(c, "inactive", monthKey, "¡Te extrañamos en CRAFT! 💔", msg);
          if (ok) { summary.inactive++; if (giftN > 0) await giftPoints(c, giftN, `REGALO_REGRESO: +${giftN} puntos para que vuelvas`); }
        } catch (e: any) { summary.errors.push(`inact ${c.id}: ${e?.message || e}`); }
      }
    }

    // === 4) CAMPAÑAS POR FECHA ===
    try {
      const campaigns = await sb(`campaigns?enabled=eq.true&select=*`);
      for (const camp of campaigns || []) {
        // ¿Le toca hoy?
        const sd = new Date(camp.send_date + "T00:00:00");
        if (isNaN(sd.getTime())) continue;
        const matchesToday = camp.yearly
          ? (sd.getMonth() === ar.getMonth() && sd.getDate() === ar.getDate())
          : (sd.getFullYear() === ar.getFullYear() && sd.getMonth() === ar.getMonth() && sd.getDate() === ar.getDate());
        if (!matchesToday) continue;

        // Clave de envío: para anuales incluye el año actual; para únicas, la fecha
        const sentKey = camp.yearly ? `${ar.getFullYear()}-${todayKey}` : camp.send_date;
        const already = await sb(`campaign_sends_log?campaign_id=eq.${camp.id}&sent_key=eq.${encodeURIComponent(sentKey)}&select=id`);
        if (already && already.length > 0) continue;

        // Determinar destinatarios según el grupo
        let targets = clients || [];
        if (camp.target === "fan") targets = (clients || []).filter((c: any) => (c.points || 0) < 500);
        else if (camp.target === "gold") targets = (clients || []).filter((c: any) => (c.points || 0) >= 500 && (c.points || 0) < 1000);
        else if (camp.target === "black") targets = (clients || []).filter((c: any) => (c.points || 0) >= 1000);
        else if (camp.target === "inactive") {
          const cutoff = new Date(ar.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
          const filtered: any[] = [];
          for (const c of clients || []) {
            const recent = await sb(`transactions?client_id=eq.${c.id}&points_earned=gt.0&created_at=gte.${cutoff}&select=id&limit=1`);
            if (!recent || recent.length === 0) filtered.push(c);
          }
          targets = filtered;
        }

        const wantApp = camp.channel === "app" || camp.channel === "both";
        const wantEmail = camp.channel === "email" || camp.channel === "both";

        for (const c of targets) {
          const msg = (camp.message || "").replace(/\{nombre\}/g, c.full_name || "crafter");
          if (wantApp) {
            await sb(`notifications`, { method: "POST", body: JSON.stringify({ client_id: c.id, title: camp.title, message: msg }) });
          }
          if (wantEmail && c.email && c.email.includes("@")) {
            try {
              await fetch(`${APP_URL}/api/email/send`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: c.email, subject: camp.title, message: msg })
              });
            } catch (e: any) { summary.errors.push(`camp-email ${c.id}: ${e?.message || e}`); }
          }
        }

        // Registrar que se envió
        await sb(`campaign_sends_log`, { method: "POST", body: JSON.stringify({ campaign_id: camp.id, sent_key: sentKey }) });
        (summary as any).campaigns = ((summary as any).campaigns || 0) + 1;
      }
    } catch (e: any) {
      summary.errors.push(`campaigns: ${e?.message || e}`);
    }

    return res.status(200).json({ ok: true, summary });
  } catch (err: any) {
    console.error("Error en cron diario:", err);
    return res.status(500).json({ error: err?.message || "Error interno del cron." });
  }
}
