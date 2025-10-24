import { GoogleGenAI, Type } from "@google/genai"; // <-- Añadir 'Type'
import { PertActivity } from "../types"; // <-- Añadir esta importación

// Per guidelines, initialize with apiKey from process.env
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CÓDIGO AÑADIDO (DEL .MD ORIGINAL) ---
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}; //

export const analyzeProblemImage = async (imageFile: File) => {
  const imagePart = await fileToGenerativePart(imageFile);
  
  const prompt = "Analyze the attached image which contains a queuing theory problem. Identify the arrival rate (lambda), the service rate (mu), and the number of servers (s). Extract these parameters into the provided JSON schema. If 's' is not specified, assume it is 1.";

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, {text: prompt}] },
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                lambda: { type: Type.NUMBER, description: "Arrival rate" },
                mu: { type: Type.NUMBER, description: "Service rate" },
                s: { type: Type.INTEGER, description: "Number of servers" }
            },
            required: ["lambda", "mu", "s"]
        }
    }
  });

  const responseText = result.text.trim();
  return JSON.parse(responseText);
}; //

export const analyzePertImage = async (imageFile: File): Promise<PertActivity[]> => {
    const imagePart = await fileToGenerativePart(imageFile);
    const prompt = `Analyze the image of a PERT/CPM problem. Extract all activities. For each activity, identify its ID, predecessors, optimistic time (a), most likely time (m), and pessimistic time (b). If crashing data is available (normal cost, crash time, crash cost), extract that as well. Structure the output into the provided JSON schema. Ensure all numeric fields are numbers, not strings. Predecessors should be a comma-separated string.`;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        precedencias: { type: Type.STRING },
                        a: { type: Type.NUMBER },
                        m: { type: Type.NUMBER },
                        b: { type: Type.NUMBER },
                        normalCost: { type: Type.NUMBER },
                        crashTime: { type: Type.NUMBER },
                        crashCost: { type: Type.NUMBER },
                    },
                    required: ["id", "precedencias", "a", "m", "b"]
                }
            }
        }
    });

    const responseText = result.text.trim();
    return JSON.parse(responseText);
} //
// --- FIN DEL CÓDIGO AÑADIDO ---


/**
 * Generates analysis from the Gemini model for business decision tasks.
 * (Esta es tu función actual, la dejas como está)
 */
export const getAIAnalysis = async (prompt: string): Promise<string> => {
  try {
    // Per guidelines, use ai.models.generateContent
    const response = await ai.models.generateContent({
      // Per guidelines, using 'gemini-2.5-pro' for complex text tasks
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        temperature: 0.3, // Lower temperature for more deterministic, analytical responses
      }
    });
    // Per guidelines, access text directly from response.text
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Provide a user-friendly error message
    return "An error occurred while generating the AI analysis. Please check your API key and network connection. More details may be available in the console.";
  }
};