import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY no está definida");

const genAI = new GoogleGenerativeAI(API_KEY);
const toPart = async (file: File) => {
  const b64 = await new Promise<string>(res=>{
    const r=new FileReader(); r.onloadend=()=>res((r.result as string).split(',')[1]); r.readAsDataURL(file);
  });
  return { inlineData: { data: b64, mimeType: file.type } };
};

export const extractDataWithGemini = async (file: File) => {
  const imagePart = await toPart(file);
  const prompt = `
  Extrae datos para:
  1) PERT/Crashing: tabla actividades (id, predecesores, T.Normal, C.Normal, T.Crash, C.Crash, a,m,b),
     costos fijos/sem y penalización/sem (si aparecen).
  2) Colas M/M/s: "X personas / Y minutos" para llegada y servicio; s si aparece.
  3) Decisiones: decisiones (5/20/40), demandas (5/20/40), p,c,s y probabilidades por estado.

  Devuelve un objeto JSON del schema. Si no hay datos de un bloque, pon null.
  `;

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      pert: {
        type: SchemaType.OBJECT, nullable: true,
        properties: {
          activities: {
            type: SchemaType.ARRAY, items: {
              type: SchemaType.OBJECT,
              properties: {
                id:{type:SchemaType.STRING}, predecessors:{type:SchemaType.STRING},
                normalTime:{type:SchemaType.NUMBER}, normalCost:{type:SchemaType.NUMBER},
                crashTime:{type:SchemaType.NUMBER}, crashCost:{type:SchemaType.NUMBER},
                a:{type:SchemaType.NUMBER}, m:{type:SchemaType.NUMBER}, b:{type:SchemaType.NUMBER}
              }
            }
          },
          fixedCosts:{type:SchemaType.NUMBER},
          penaltyCost:{type:SchemaType.NUMBER},
          penaltyStartsAfterWeek:{type:SchemaType.NUMBER}
        }
      },
      queuing: {
        type: SchemaType.OBJECT, nullable:true,
        properties: {
          lambda:{type:SchemaType.NUMBER}, lambdaUnit:{type:SchemaType.NUMBER},
          mu:{type:SchemaType.NUMBER}, muUnit:{type:SchemaType.NUMBER}, s:{type:SchemaType.NUMBER}
        }
      },
      decision: {
        type: SchemaType.OBJECT, nullable:true,
        properties: {
          decisions: { type:SchemaType.ARRAY, items:{type:SchemaType.NUMBER} },
          demands:   { type:SchemaType.ARRAY, items:{ type:SchemaType.OBJECT, properties:{
            name:{type:SchemaType.STRING}, value:{type:SchemaType.NUMBER}, prob:{type:SchemaType.NUMBER}
          }}},
          payoffs:   { type:SchemaType.OBJECT, properties:{
            price:{type:SchemaType.NUMBER}, cost:{type:SchemaType.NUMBER}, shortage:{type:SchemaType.NUMBER}
          }}
        }
      }
    }
  };

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    generationConfig: { responseMimeType:'application/json', responseSchema: schema }
  });

  const res = await model.generateContent({ contents: [{ parts: [imagePart, { text: prompt }] }] });
  return JSON.parse(res.response.text());
};
