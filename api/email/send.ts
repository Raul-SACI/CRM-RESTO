export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { to, subject, message } = req.body || {};

    if (!to || !subject || !message) {
      return res.status(400).json({ error: "Faltan parámetros: to, subject o message." });
    }

    // Destinatarios: aceptamos uno (string) o varios (array)
    const recipients: string[] = Array.isArray(to) ? to : [to];
    if (recipients.length === 0) {
      return res.status(400).json({ error: "No hay destinatarios." });
    }

    let apiKey = process.env.RESEND_API_KEY;
    if (apiKey) apiKey = apiKey.replace(/['"]/g, "").trim();

    if (!apiKey) {
      return res.status(500).json({
        error: "Falta configurar RESEND_API_KEY en Vercel. Cargá la clave en las variables de entorno."
      });
    }

    // Remitente: debe ser de un dominio verificado en Resend.
    // Mientras no verifiques el dominio, podés usar el de prueba de Resend.
    const fromAddress = process.env.EMAIL_FROM || "CRAFT <onboarding@resend.dev>";

    // Construimos un HTML simple y prolijo
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background:#ffffff;">
        <div style="background:#ef4444; color:#fff; padding:14px 18px; border-radius:14px; font-weight:800; letter-spacing:1px; text-transform:uppercase; font-size:14px;">
          Club Craft
        </div>
        <h2 style="color:#0f172a; margin:24px 0 8px;">${escapeHtml(subject)}</h2>
        <p style="color:#334155; font-size:15px; line-height:1.6; white-space:pre-line;">${escapeHtml(message)}</p>
        <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
        <p style="color:#94a3b8; font-size:12px;">Este es un mensaje de Club Craft. Por favor no respondas a este correo.</p>
      </div>
    `;

    // Resend permite enviar a varios destinatarios; para privacidad,
    // enviamos individualmente cuando son muchos (cada uno recibe el suyo).
    const results: any[] = [];
    for (const rcpt of recipients) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromAddress,
          to: rcpt,
          subject: subject,
          html: html
        })
      });
      const data = await resp.json();
      results.push({ to: rcpt, ok: resp.ok, data });
    }

    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      return res.status(207).json({
        message: "Algunos correos no se enviaron.",
        sent: results.length - failed.length,
        failed: failed.length,
        details: results
      });
    }

    return res.status(200).json({ message: "Correos enviados.", sent: results.length });
  } catch (err: any) {
    console.error("Error enviando email:", err);
    return res.status(500).json({ error: err?.message || "Error interno al enviar email." });
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
