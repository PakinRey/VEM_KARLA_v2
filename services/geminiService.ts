import { GoogleGenAI, Type } from "@google/genai";
import { PertActivity } from "../types";

// Assume API_KEY is set in the environment
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // For this context, we assume it's always available.
  console.warn("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

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
};

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
}

export const explainConcept = async (topic: string) => {
  const prompt = `Explain the core concepts of ${topic} in the context of operations management. Provide a clear, concise summary suitable for a business student. Also list any relevant formulas.`;

  const response = await ai.models.generateContent({
     model: "gemini-2.5-flash",
     contents: prompt,
     config: {
       tools: [{googleSearch: {}}],
     },
  });

  return {
    explanation: response.text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
  };
};

export const analyzeComplexScenario = async (scenario: string) => {
    const prompt = `Analyze the following complex business scenario related to operations and queuing. Provide a detailed analysis, identify potential bottlenecks, and suggest strategies for improvement. The scenario is: "${scenario}"`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });

    return response.text;
};