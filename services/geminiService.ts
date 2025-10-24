import { GoogleGenAI } from "@google/genai";

// Per guidelines, initialize with apiKey from process.env
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates analysis from the Gemini model for business decision tasks.
 * @param prompt The prompt to send to the model.
 * @returns The text response from the model.
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
