import React, { useState } from 'react';

// Módulos
import PertModule from './components/PertModule';
import QueuingModule from './components/QueuingModule';
import DecisionModule from './components/DecisionModule';
import FileUploader from './components/FileUploader';

// IA (se conserva)
import { extractDataWithGemini } from './services/geminiService';

// --- Datos base del examen (precargados) ---
// ¡AQUÍ ESTÁ LA CORRECCIÓN! Esta es la lista completa de 16 actividades (A-P)
const INITIAL_PERT = {
  fixedCosts: 10000,
  penaltyCost: 10000,
  penaltyStartsAfterWeek: 17,
  monthlyOps: { avgSales: 32000, fixedOpsCost: 10000 },
  activities: [
    { id: 'A', predecessors: '-',   normalTime: 5, normalCost: 25000, crashTime: 3,   crashCost: 36000, a: 2, m: 3, b: 4 },
    { id: 'B', predecessors: '-',   normalTime: 1, normalCost: 10000, crashTime: 0.5, crashCost: 15000, a: 1, m: 1, b: 1 },
    { id: 'C', predecessors: 'A',   normalTime: 3, normalCost: 18000, crashTime: 1.5, crashCost: 22000, a: 2, m: 2, b: 2 },
    { id: 'D', predecessors: 'A',   normalTime: 2, normalCost: 8000,  crashTime: 1,   crashCost: 12000, a: 4, m: 6, b: 12 },
    { id: 'E', predecessors: 'A',   normalTime: 4, normalCost: 8000,  crashTime: 1.5, crashCost: 15000, a: 2, m: 5, b: 8 },
    { id: 'F', predecessors: 'B, C',normalTime: 1, normalCost: 12000, crashTime: 0.5, crashCost: 15000, a: 2, m: 3, b: 8 },
    { id: 'G', predecessors: 'D',   normalTime: 4, normalCost: 20000, crashTime: 2.5, crashCost: 30000, a: 3, m: 7, b: 10 },
    { id: 'H', predecessors: 'E',   normalTime: 2, normalCost: 12000, crashTime: 1.5, crashCost: 17000, a: 3, m: 5, b: 9 },
    { id: 'I', predecessors: 'F, G',normalTime: 4, normalCost: 13000, crashTime: 2.5, crashCost: 21000, a: 5, m: 8, b: 18 },
    { id: 'J', predecessors: 'G, H',normalTime: 2, normalCost: 10000, crashTime: 1.5, crashCost: 16000, a: 1, m: 1, b: 5 },
    { id: 'K', predecessors: 'I, J',normalTime: 2, normalCost: 8000,  crashTime: 1,   crashCost: 12000, a: 1, m: 2, b: 3 },
    { id: 'L', predecessors: 'J',   normalTime: 3, normalCost: 7000,  crashTime: 2,   crashCost: 10000, a: 2, m: 3, b: 4 },
    { id: 'M', predecessors: 'K',   normalTime: 1, normalCost: 5000,  crashTime: 0.5, crashCost: 9000,  a: 1, m: 1, b: 1 },
    { id: 'N', predecessors: 'K',   normalTime: 3, normalCost: 6000,  crashTime: 1.5, crashCost: 10000, a: 2, m: 3, b: 5 },
    { id: 'O', predecessors: 'L, M',normalTime: 5, normalCost: 14000, crashTime: 3,   crashCost: 22000, a: 3, m: 5, b: 7 },
    { id: 'P', predecessors: 'N',   normalTime: 4, normalCost: 16000, crashTime: 2.5, crashCost: 24000, a: 2, m: 4, b: 6 }
  ]
};

// Esta es tu estructura de datos original, la respetamos
const INITIAL_QUEUE = {
  s: 1,
  arrival: { customers: 7, timeMinutes: 91 },
  service: { customers: 4.5, timeMinutes: 45 }
};

// Esta es tu estructura de datos original, la respetamos
const INITIAL_DECISION = {
  decisions: [5, 20, 40],
  demands: [
    { name: 'Baja',  value: 5,  prob: 0.2 },
    { name: 'Media', value: 20, prob: 0.5 },
    { name: 'Alta',  value: 40, prob: 0.3 }
  ],
  payoffs: { price: 100, cost: 20, shortage: 50 }
};

export default function App() {
  const [pertData, setPertData] = useState(INITIAL_PERT);
  const [queueData, setQueueData] = useState(INITIAL_QUEUE);
  const [decisionData, setDecisionData] = useState(INITIAL_DECISION);
  const [mode, setMode] = useState<'STATIC' | 'IMPORTED'>('STATIC');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const jsonData = await extractDataWithGemini(file);
      // El merge de datos es más robusto
      if (jsonData.pert) {
        setPertData(prev => ({ 
          ...prev, 
          ...jsonData.pert, 
          activities: jsonData.pert.activities || prev.activities 
        }));
      }
      if (jsonData.queuing) {
        // Adaptamos el JSON de gemini a la estructura de App.tsx
        setQueueData({
          s: jsonData.queuing.s || 1,
          arrival: { customers: jsonData.queuing.lambda, timeMinutes: jsonData.queuing.lambdaUnit },
          service: { customers: jsonData.queuing.mu, timeMinutes: jsonData.queuing.muUnit }
        });
      }
      if (jsonData.decision) {
         // Adaptamos el JSON de gemini a la estructura de App.tsx
        setDecisionData({
          decisions: jsonData.decision.options || [5, 20, 40],
          payoffs: {
            price: jsonData.decision.payoffs.sellPrice || 100,
            cost: jsonData.decision.payoffs.buyCost || 20,
            shortage: jsonData.decision.payoffs.shortageCost || 50
          },
          demands: [
            { name: 'Baja',  value: jsonData.decision.states[0] || 5,  prob: 1 - (jsonData.decision.probabilities.media || 0.5) - (jsonData.decision.probabilities.alta || 0.3) },
            { name: 'Media', value: jsonData.decision.states[1] || 20, prob: jsonData.decision.probabilities.media || 0.5 },
            { name: 'Alta',  value: jsonData.decision.states[2] || 40, prob: jsonData.decision.probabilities.alta || 0.3 }
          ]
        });
      }
      setMode('IMPORTED');
    } catch (e) {
      console.error(e);
      alert('Error al analizar el archivo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-[1200px] mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">VEM_KARLA_v2 — Examen 20/20 (híbrida)</h1>
        <span className={`px-3 py-1 rounded-full text-sm ${mode==='STATIC'?'bg-slate-200':'bg-emerald-200'}`}>
          Modo datos: {mode==='STATIC'?'Estáticos':'Importados'}
        </span>
      </header>

      <section className="p-4 border rounded-lg bg-white">
        <h3 className="font-semibold mb-2 text-center">Cargar PDF/Imagen para autollenado</h3>
        <p className="text-sm text-slate-600 text-center mb-4">
          La app inicia con datos del examen. Si cargas otro en PDF/JPG/PNG, la IA extrae
          tablas/valores y recalculamos todo.
        </p>
        <FileUploader onFileUpload={handleFileUpload} />
        {isLoading && <p className="text-center text-indigo-600 mt-3">Analizando archivo… 🧠</p>}
      </section>

      {/* El módulo PERT solo necesita 'initialData' */}
      <PertModule initialData={pertData} />
      
      {/* El módulo Queuing necesita que transformemos los datos */}
      <QueuingModule initialData={{
        lambda: queueData.arrival.customers,
        lambdaUnit: queueData.arrival.timeMinutes,
        mu: queueData.service.customers,
        muUnit: queueData.service.timeMinutes,
        s: queueData.s
      }} />

      {/* El módulo Decision necesita que transformemos los datos */}
      <DecisionModule
        initialData={{
          decisions: decisionData.decisions,
          demands: decisionData.demands,
          payoffs: decisionData.payoffs
        }}
      />
    </main>
  );
}
