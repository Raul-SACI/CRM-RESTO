import { GoogleGenAI } from "@google/genai";

let genAIInstance: any = null;

function getAI() {
  if (!genAIInstance) {
    const apiKey = typeof process !== 'undefined' && process.env.GEMINI_API_KEY 
      ? process.env.GEMINI_API_KEY 
      : "";
    if (!apiKey) {
      console.warn("GEMINI_API_KEY no está configurada.");
    }
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

export interface ExtractedReceiptItem {
  name: string;
  quantity: number;
}

export interface ExtractedReceiptData {
  amount: number | null;
  invoice_number: string | null;
  items: ExtractedReceiptItem[];
}

export async function extractDataFromReceipt(base64Image: string): Promise<ExtractedReceiptData> {
  const ai = getAI();
  const prompt = `
    Analiza este ticket de restaurante. Extrae los siguientes datos en formato JSON:
    1. "amount": El monto total FINAL a pagar (solo el número). Busca palabras como "TOTAL", "Total:", "Total a pagar", "Importe Total". Asegúrate de obtener el valor final después de cualquier descuento.
    2. "invoice_number": El número de identificación del ticket o factura. Busca etiquetas como "Nro.:", "Pedido:", "Ticket Nro:", "Factura Nro:". Ejemplo: "B00999-00028504" o "306".
    3. "items": Una lista de OBJETOS con "name" (nombre del artículo) y "quantity" (cantidad consumida como número). Los items suelen estar bajo columnas como "DESCRIPCION" o "Detalle" y "CANT.". Ej: {"name": "BASTONES DE MOZZARELLA", "quantity": 1}.

    Si no encuentras un dato, devuelve null para ese campo o un array vacío para items.
    Devuelve ÚNICAMENTE el objeto JSON. No incluyas explicaciones ni bloques de código.
  `;

  // Remove data:image/XXXX;base64, prefix
  const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg",
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.text || "";
    console.log("Raw Gemini Response:", responseText);
    
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson) as ExtractedReceiptData;
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    
    // Fallback if structured output fails, try without MimeType config
    try {
      const fallbackResult = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: prompt + " (Devuelve solo el JSON puro)" },
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
          ]
        }
      });
      const fallbackText = fallbackResult.text || "";
      const cleaned = fallbackText.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned) as ExtractedReceiptData;
    } catch (innerError) {
      console.error("Gemini Fallback Error:", innerError);
      throw new Error("No se pudo procesar la imagen del ticket automáticamente. Asegúrate de que los datos (Total, Pedido e Items) sean visibles e inténtalo de nuevo o cárgalos manualmente.");
    }
  }
}
