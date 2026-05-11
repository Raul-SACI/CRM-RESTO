import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = typeof process !== 'undefined' && process.env?.GEMINI_API_KEY 
    ? process.env.GEMINI_API_KEY 
    : (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
  
  return new GoogleGenAI({ apiKey });
};

export interface ExtractedReceiptData {
  amount: number | null;
  invoice_number: string | null;
  items: string[];
}

export async function extractDataFromReceipt(base64Image: string): Promise<ExtractedReceiptData> {
  const ai = getAI();
  const prompt = `
    Analyze this restaurant receipt carefully. Extract the following information in JSON format:
    1. "amount": The total amount to pay (as a number).
    2. "invoice_number": The invoice or ticket number (usually found at the top, format like 0001-00001234).
    3. "items": An array of strings representing the names of the items consumed.

    If a value is not clearly found, return null for that field.
    Only return the JSON object, nothing else.
  `;

  // Remove data:image/jpeg;base64, prefix if present
  const base64Data = base64Image.split(",")[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
      ],
    });

    const responseText = response.text || "";
    // Clean potential markdown code blocks
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson) as ExtractedReceiptData;
  } catch (error) {
    console.error("Error extracting receipt data:", error);
    throw new Error("No se pudo procesar la imagen del ticket. Intente manualmente.");
  }
}
