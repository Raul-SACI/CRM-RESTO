import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface ExtractedReceiptData {
  amount: number | null;
  invoice_number: string | null;
  items: string[];
}

export async function extractDataFromReceipt(base64Image: string): Promise<ExtractedReceiptData> {
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
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const responseText = result.response.text();
    // Clean potential markdown code blocks
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJson) as ExtractedReceiptData;
  } catch (error) {
    console.error("Error extracting receipt data:", error);
    throw new Error("No se pudo procesar la imagen del ticket. Intente manualmente.");
  }
}
