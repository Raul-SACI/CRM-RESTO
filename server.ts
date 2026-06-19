import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser limit and configurations
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Loyalty App Server is runnning." });
  });

  // Mercado Pago Preference Creation (Secure Backend endpoint)
  app.post("/api/mercadopago/preference", async (req, res) => {
    try {
      const { combo, client_id, app_url } = req.body;

      if (!combo || !client_id) {
        return res.status(400).json({ error: "Faltan parámetros requeridos combo o client_id" });
      }

      let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (accessToken) {
        accessToken = accessToken.replace(/['"]/g, "").trim();
      }

      const baseUrl = app_url || process.env.APP_URL || "http://localhost:3000";
      const currencyId = process.env.MERCADO_PAGO_CURRENCY || "ARS";

      // If no Mercado Pago Access Token is configured, return Sandbox Mode with Demo values
      if (!accessToken || accessToken === "your-access-token" || accessToken === "" || accessToken.trim() === "") {
        console.warn("Mercado Pago token is missing or default. Returning Sandbox trial config.");
        
        // Generate a simulated approved URL that redirects back to success tab
        const simulatedSuccessUrl = `${baseUrl}/?payment_status=success&combo_id=${combo.id}&combo_title=${encodeURIComponent(combo.title)}&totalUses=${combo.totalUses}&price=${combo.price}&demo=true`;
        
        return res.json({
          isSandboxDemo: true,
          init_point: simulatedSuccessUrl,
          message: "Credenciales de Mercado Pago no configuradas. Redirigiendo a Pasarela Demo.",
          warning: "Para activar cobros reales, configura MERCADO_PAGO_ACCESS_TOKEN en las variables de entorno."
        });
      }

      console.log(`Creando preferencia real de Mercado Pago para combo: ${combo.title} (Precio: $${combo.price}, Moneda: ${currencyId})`);

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
        return res.status(500).json({ error: "Error respuesta de Mercado Pago", details: errText });
      }

      const prefData = await response.json();
      
      return res.json({
        isSandboxDemo: false,
        id: prefData.id,
        init_point: prefData.init_point, // For production/live mode
        sandbox_init_point: prefData.sandbox_init_point // For sandbox mode
      });

    } catch (error: any) {
      console.error("Internal Server Error in /api/mercadopago/preference:", error);
      res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
  });

  // Serve static assets and configure Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in Development Mode with Vite HMR middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in Production Mode serving static dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Loyalty App full-stack server running securely on http://localhost:${PORT}`);
  });
}

startServer();
