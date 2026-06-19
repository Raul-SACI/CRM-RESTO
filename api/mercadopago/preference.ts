export default async function handler(req: any, res: any) {
  // Enable CORS
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
    const { combo, client_id, app_url } = req.body;

    if (!combo || !client_id) {
      return res.status(400).json({ error: "Faltan parámetros requeridos combo o client_id" });
    }

    let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (accessToken) {
      accessToken = accessToken.replace(/['"]/g, "").trim();
    }

    const baseUrl = app_url || process.env.APP_URL || "https://crm-resto.vercel.app";
    const currencyId = process.env.MERCADO_PAGO_CURRENCY || "ARS";

    // If no Mercado Pago Access Token is configured, return Sandbox Mode with Demo values
    if (!accessToken || accessToken === "your-access-token" || accessToken === "" || accessToken.trim() === "") {
      console.warn("Mercado Pago token is missing or default. Returning Sandbox trial config.");
      
      const simulatedSuccessUrl = `${baseUrl}/?payment_status=success&combo_id=${combo.id}&combo_title=${encodeURIComponent(combo.title)}&totalUses=${combo.totalUses}&price=${combo.price}&demo=true`;
      
      return res.status(200).json({
        isSandboxDemo: true,
        init_point: simulatedSuccessUrl,
        message: "Credenciales de Mercado Pago no configuradas en Vercel. Redirigiendo a Pasarela Demo.",
        warning: "Para activar cobros reales, configura la variable de entorno MERCADO_PAGO_ACCESS_TOKEN en el panel de Vercel."
      });
    }

    console.log(`[Vercel Serverless] Creando preferencia Mercado Pago para combo: ${combo.title} (Moneda: ${currencyId})`);

    // Call Mercado Pago API directly with secure headers
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            id: combo.id,
            title: combo.title,
            quantity: 1,
            unit_price: Number(combo.price),
            currency_id: currencyId,
            description: `Abono Prepago: ${combo.title} - ${combo.totalUses} usos`,
            category_id: "hospitality"
          }
        ],
        back_urls: {
          success: `${baseUrl}/?payment_status=success&combo_id=${combo.id}&combo_title=${encodeURIComponent(combo.title)}&totalUses=${combo.totalUses}&price=${combo.price}`,
          failure: `${baseUrl}/?payment_status=failure`,
          pending: `${baseUrl}/?payment_status=pending`
        },
        auto_return: "approved",
        external_reference: `CLIENT:${client_id}|COMBO:${combo.id}|USES:${combo.totalUses}`,
        statement_descriptor: "Fidelidad Club Prepago",
        binary_mode: true
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Mercado Pago API Error:", errText);
      return res.status(500).json({ error: "Error de Mercado Pago", details: errText });
    }

    const prefData = await response.json();
    
    return res.status(200).json({
      isSandboxDemo: false,
      id: prefData.id,
      init_point: prefData.init_point,
      sandbox_init_point: prefData.sandbox_init_point
    });

  } catch (error: any) {
    console.error("Internal Server Error in Vercel Serverless /api/mercadopago/preference:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}
