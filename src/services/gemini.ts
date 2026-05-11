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

export interface ExtractedReceiptData {
  amount: number | null;
  invoice_number: string | null;
  items: string[];
}

export async function extractDataFromReceipt(base64Image: string): Promise<ExtractedReceiptData> {
  const ai = getAI();
  const prompt = `
    Analiza este ticket de restaurante. Extrae los siguientes datos en formato JSON:
    1. "amount": El monto total a pagar (solo el número). En el ticket suele estar después de "Total:". Si hay un total parcial o subtotal mayor, usa el monto que parezca ser el total de la cuenta.
    2. "invoice_number": El número de pedido o ticket. Busca el número que aparece después de "Pedido:".
    3. "items": Una lista de los nombres de los productos consumidos (ej: "RABAS", "Sand pollo").

    Si no encuentras un dato, devuelve null para ese campo.
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
