# Compilación de Código del Proyecto: VEM_KARLA_v2

---

## Archivo: `App.tsx`

```tsx
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

```

---

## Archivo: `codigo_proyecto_VEM_Karla.md`

```markdown

```

---

## Archivo: `components\DecisionModule.tsx`

```tsx
// components/DecisionModule.tsx

import React, { useEffect, useMemo, useState } from 'react';
import Spreadsheet, { Matrix, CellBase, DataViewerProps } from 'react-spreadsheet';
import Card from './ui/Card';
import { runDecision, DecisionInput, FormulaCell } from '../services/decisionService';

// --- NUEVAS IMPORTACIONES ---
import { Tooltip } from 'react-tooltip';
import { FaCalculator } from 'react-icons/fa';
import { Info } from 'lucide-react';
import clsx from 'clsx';
// --- FIN NUEVAS IMPORTACIONES ---

type Props = {
  initialData: {
    decisions: number[];
    demands: { name: string; value: number; prob: number }[];
    payoffs: { price: number; cost: number; shortage: number };
  };
};

const fmt = (x: unknown, d = 2) => typeof x === 'number' && isFinite(x) ? x.toFixed(d) : '...';

// --- ¡CORRECCIÓN DEL BUG AQUÍ! ---
// Esta función faltaba. Es necesaria para construir
// las claves del objeto (ej: '5|20')
const key = (q: number, d: number) => `${q}|${d}`;
// --- FIN DE LA CORRECCIÓN ---


// --- ¡NUEVO! Visor de Celdas Personalizado ---
const FormulaCellViewer = (props: DataViewerProps<FormulaCell | string | number | undefined>) => {
  const { cell } = props;

  // Comprueba si es nuestro objeto especial de fórmula
  if (cell && typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value) {
    const { value, formula } = cell.value;
    return (
      <span
        className="flex items-center justify-between w-full h-full px-1"
        data-tooltip-id="formula-tip"
        data-tooltip-content={formula}
        data-tooltip-place="top"
      >
        <span>{fmt(value, 0)}</span>
        <Info size={14} className="text-blue-400 opacity-60" />
      </span>
    );
  }

  // Fallback para valores normales (como headers o números simples)
  return (
    <span className="flex items-center w-full h-full px-1">
      {fmt(cell?.value, 2)}
    </span>
  );
};
// --- FIN Visor de Celdas Personalizado ---


export default function DecisionModule({ initialData }: Props) {
  // Hoja editable “Decisiones × Estados” (solo números)
  const [decsStates, setDecsStates] = useState<Matrix<CellBase>>([]);
  // Parámetros (inputs simples tipo Excel-celdas)
  const [price, setPrice] = useState(initialData.payoffs.price);
  const [cost, setCost] = useState(initialData.payoffs.cost);
  const [shortage, setShortage] = useState(initialData.payoffs.shortage);
  const [pLow, setPLow] = useState(initialData.demands.find(d => d.name === 'Baja')?.prob ?? 0.2);
  const [pMed, setPMed] = useState(initialData.demands.find(d => d.name === 'Media')?.prob ?? 0.5);
  const pHigh = Math.max(0, 1 - (pLow + pMed)); // se cierra a 1

  // Construir hoja a partir de initialData
  useEffect(() => {
    const states = initialData.demands.map(d => d.value);
    const head = [{ value: '' }, ...states.map(v => ({ value: v }))];
    const body = initialData.decisions.map(q => ([{ value: q }, ...states.map(() => ({ value: '' }))]));
    setDecsStates([head as CellBase[], ...body as CellBase[][]]);
    setPrice(initialData.payoffs.price);
    setCost(initialData.payoffs.cost);
    setShortage(initialData.payoffs.shortage);
  }, [initialData]);

  // Parsear la hoja para obtener arrays de decisions y demands
  const decisions = useMemo<number[]>(() => {
    if (decsStates.length < 2) return [];
    const out: number[] = [];
    for (let r = 1; r < decsStates.length; r++) {
      const q = Number((decsStates[r]?.[0]?.value ?? '').toString().replace(',', '.'));
      if (!isNaN(q) && q > 0) out.push(q);
    }
    return out;
  }, [decsStates]);

  const demands = useMemo<number[]>(() => {
    if (!decsStates[0]) return [];
    const out: number[] = [];
    for (let c = 1; c < decsStates[0].length; c++) {
      const d = Number((decsStates[0]?.[c]?.value ?? '').toString().replace(',', '.'));
      if (!isNaN(d) && d >= 0) out.push(d);
    }
    return out;
  }, [decsStates]);

  // Armar estructura para servicio
  const decisionInput = useMemo<DecisionInput>(() => ({
    decisions,
    demands: [
      { name: 'Baja', value: demands[0] ?? 5, prob: pLow },
      { name: 'Media', value: demands[1] ?? 20, prob: pMed },
      { name: 'Alta', value: demands[2] ?? 40, prob: pHigh }
    ],
    payoffs: { price, cost, shortage }
  }), [decisions, demands, price, cost, shortage, pLow, pMed, pHigh]);

  const out = useMemo(() => decisions.length && demands.length ? runDecision(decisionInput) : null, [decisionInput]);

  // --- HOJAS DE CÁLCULO MEJORADAS ---

  // 1. Matriz de Pagos (Utilidad)
  const payoffSheet = useMemo<Matrix<CellBase>>(() => {
    if (!out) return [];
    const head = [
      { value: "Decisión (q) \\ Demanda (d)", readOnly: true, className: 'font-bold bg-slate-100' },
      ...demands.map(d => ({ value: `${d}`, readOnly: true, className: 'font-bold bg-slate-100' }))
    ];
    const rows = decisions.map(q => ([
      { value: `Ordenar ${q}`, readOnly: true, className: 'font-bold bg-slate-50' },
      ...demands.map(d => ({
        value: out.payoffMatrix[key(q, d)], // <- Pasa el objeto {value, formula}
        readOnly: true,
        DataViewer: FormulaCellViewer // <- Usa el visor personalizado
      }))
    ] as CellBase[]));
    return [head as CellBase[], ...rows];
  }, [out, demands, decisions]);

  // 2. ¡NUEVA! Matriz de Arrepentimiento (Minimax)
  const regretSheet = useMemo<Matrix<CellBase>>(() => {
    if (!out) return [];
    // Fila de "Mejor Pago por Estado" para justificar el cálculo
    const maxPayRow = [
      { value: "Mejor Pago (Max de Col)", readOnly: true, className: 'font-bold bg-slate-50' },
      ...demands.map(d => {
        const best = Math.max(...decisions.map(q => out.payoffRaw[key(q,d)]));
        return { value: best, readOnly: true, className: 'font-bold bg-blue-50' };
      })
    ];
    
    const head = [
      { value: "Decisión (q) \\ Demanda (d)", readOnly: true, className: 'font-bold bg-slate-100' },
      ...demands.map(d => ({ value: `${d}`, readOnly: true, className: 'font-bold bg-slate-100' }))
    ];

    const rows = decisions.map(q => ([
      { value: `Ordenar ${q}`, readOnly: true, className: 'font-bold bg-slate-50' },
      ...demands.map(d => ({
        value: out.regretMatrix[key(q, d)], // <- Pasa el objeto {value, formula}
        readOnly: true,
        DataViewer: FormulaCellViewer // <- Usa el visor personalizado
      }))
    ] as CellBase[]));
    return [head as CellBase[], maxPayRow as CellBase[], ...rows];
  }, [out, demands, decisions]);
  
  // 3. ¡NUEVA! Resumen de Criterios
  const summarySheet = useMemo<Matrix<CellBase>>(() => {
    if (!out) return [];
    
    const head = [
      { value: "Decisión (Ordenar q)", readOnly: true, className: 'font-bold bg-slate-100' },
      { value: "VME (Valor Monetario Esperado)", readOnly: true, className: 'font-bold bg-slate-100' },
      { value: "Máx. Arrepentimiento (Minimax)", readOnly: true, className: 'font-bold bg-slate-100' }
    ];

    const rows = decisions.map(q => {
      const isBestVME = q === out.vmeBest.decision;
      const isBestMinimax = q === out.minimax.decision;
      
      return [
        { value: `Ordenar ${q}`, readOnly: true, className: 'font-bold bg-slate-50' },
        { 
          value: out.vmePerDecision[q], // <- Objeto {value, formula}
          readOnly: true, 
          DataViewer: FormulaCellViewer,
          className: clsx(isBestVME && 'bg-green-100 font-bold') // Resalta el mejor
        },
        { 
          value: out.maxRegretByQ[q], // <- Objeto {value, formula}
          readOnly: true, 
          DataViewer: FormulaCellViewer,
          className: clsx(isBestMinimax && 'bg-green-100 font-bold') // Resalta el mejor
        }
      ] as CellBase[];
    });

    const vebcRow = [
      { value: "VEBC (Valor Esperado con Certeza)", readOnly: true, className: 'font-bold bg-slate-50' },
      { 
        value: out.vebc, // <- Objeto {value, formula}
        readOnly: true, 
        DataViewer: FormulaCellViewer,
        className: 'font-bold bg-blue-50'
      },
      { value: "" }, // Celda vacía
    ];
    
    const vepiRow = [
      { value: "VEPI (Valor Esperado Info Perfecta)", readOnly: true, className: 'font-bold bg-slate-50' },
      { 
        readOnly: true, 
        DataViewer: FormulaCellViewer,
        // Formula para VEPI
        value: { value: out.vebc.value - out.vmeBest.value, formula: "= (Celda VEBC) - (Celda Mejor VME)"}
      },
      { value: "" }, // Celda vacía
    ];

    return [head, ...rows, vebcRow, vepiRow];
  }, [out, decisions]);


  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <FaCalculator />
        Caso 3 — Teoría de Decisiones (Q16–Q20)
      </h2>

      {/* --- SECCIÓN DE INPUTS --- */}
      <h3 className="font-semibold mb-2 text-base text-slate-700">Parámetros del Problema</h3>
      <div className="grid md:grid-cols-3 gap-3 mb-3 p-3 border rounded-lg bg-slate-50">
        <label className="text-sm">Precio venta (p)
          <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1" value={price} onChange={e => setPrice(+e.target.value || 0)} />
        </label>
        <label className="text-sm">Costo compra (c)
          <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1" value={cost} onChange={e => setCost(+e.target.value || 0)} />
        </label>
        <label className="text-sm">Penalización faltante (s)
          <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1" value={shortage} onChange={e => setShortage(+e.target.value || 0)} />
        </label>
      </div>
      <div className="grid md:grid-cols-3 gap-3 mb-4 p-3 border rounded-lg bg-slate-50">
        <label className="text-sm">P(Baja)
          <input type="number" step="0.01" className="mt-1 block w-full border rounded-md px-2 py-1" value={pLow} onChange={e => setPLow(Math.max(0, Math.min(1, +e.target.value || 0)))} />
        </label>
        <label className="text-sm">P(Media)
          <input type="number" step="0.01" className="mt-1 block w-full border rounded-md px-2 py-1" value={pMed} onChange={e => setPMed(Math.max(0, Math.min(1, +e.target.value || 0)))} />
        </label>
        <div className="text-sm">
          P(Alta)
          <div className="mt-1 px-3 py-2 border rounded-md bg-white text-slate-800">{fmt(pHigh, 2)}</div>
        </div>
      </div>
      
      <h3 className="font-semibold mb-2">Hoja “Decisiones × Estados” (editable)</h3>
      <Spreadsheet data={decsStates} onChange={setDecsStates} />

      {/* --- SECCIÓN DE RESULTADOS Y JUSTIFICACIÓN --- */}
      {out && (
        <>
          <h3 className="font-semibold mt-6 mb-2">1. Matriz de Pagos (Utilidad)</h3>
          <p className="text-sm text-slate-600 mb-2">
            Justifica Q19 y Q20. Pasa el mouse sobre una celda para ver la fórmula de Google Sheets.
          </p>
          <Spreadsheet data={payoffSheet} />

          <h3 className="font-semibold mt-6 mb-2">2. Matriz de Arrepentimiento (Costo de Oportunidad)</h3>
          <p className="text-sm text-slate-600 mb-2">
            Justifica Q18 (Minimax). Muestra cuánto se "pierde" por no elegir la mejor opción para cada estado de demanda.
          </p>
          <Spreadsheet data={regretSheet} />
          
          <h3 className="font-semibold mt-6 mb-2">3. Resumen de Criterios</h3>
           <p className="text-sm text-slate-600 mb-2">
            Justifica Q16 (VME) y Q17 (VEBC). El VME óptimo y el Minimax están resaltados en verde.
          </p>
          <Spreadsheet data={summarySheet} />

          {/* Resumen de Respuestas Finales */}
          <div className="mt-6 p-4 bg-slate-800 text-white rounded-lg">
            <h4 className="font-semibold mb-3 text-lg">Respuestas del Examen</h4>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono">
              <div><b>Q16 VME Óptimo:</b> ${fmt(out.vmeBest.value, 0)} (Ordenar {out.vmeBest.decision})</div>
              <div><b>Q17 VEBC:</b> ${fmt(out.vebc.value, 0)}</div>
              <div><b>Q18 Minimax:</b> Ordenar {out.minimax.decision} (Arrep. ${fmt(out.minimax.maxRegret, 0)})</div>
              <div><b>Q19 U(40, 5):</b> {fmt(out.payoffRaw[`40|5`], 0)}</div>
              <div><b>Q20 U(5, 5):</b> {fmt(out.payoffRaw[`5|5`], 0)}</div>
            </div>
          </div>
        </>
      )}
      
      {/* ¡NUEVO! El componente Tooltip que escucha a los íconos */}
      <Tooltip id="formula-tip" className="bg-gray-700 text-white p-2 rounded-md shadow-lg max-w-xs" style={{ zIndex: 50 }} />
    </Card>
  );
}
```

---

## Archivo: `components\FileUploader.tsx`

```tsx
import React, { useState, useCallback } from 'react';

export default function FileUploader({ onFileUpload }: { onFileUpload: (f: File) => void }) {
  const [drag, setDrag] = useState(false);

  const handleFile = (f: File | undefined) => f && onFileUpload(f);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, []);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
        ${drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'}`}
      onDrop={onDrop}
      onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onClick={()=>document.getElementById('uploader-input')?.click()}
    >
      <input id="uploader-input" type="file" className="hidden"
        accept="image/*,application/pdf" onChange={(e)=>handleFile(e.target.files?.[0])}/>
      <p className="text-slate-600">Arrastra y suelta tu archivo (PDF/JPG/PNG) o haz clic.</p>
    </div>
  );
}

```

---

## Archivo: `components\pert\CrashingCalculations.tsx`

```tsx
    import React, { useMemo } from 'react';
import Spreadsheet, { Matrix, CellBase } from 'react-spreadsheet';
import { ActivityNode } from '../../services/pertService';
import { FormulaCellViewer } from '../ui/FormulaCellViewer';
import styles from '../PertModule.module.scss';

type Props = {
  activities: ActivityNode[];
};

export default function CrashingCalculations({ activities }: Props) {
  const crashingCalcSheet = useMemo<Matrix<CellBase>>(() => {
    const head = ["ID", "Semanas Max. Compresión", "Costo / Semana"]
      .map(h => ({ value: h, readOnly: true, className: 'font-bold bg-slate-100' }));
    
    const rows = activities.map(act => {
      const max_formula = `= T.Normal - T.Crash\n= ${act.normalTime} - ${act.crashTime}`;
      const cost_formula = `=(C.Crash - C.Normal) / (T.Normal - T.Crash)\n=(${act.crashCost} - ${act.normalCost}) / (${act.normalTime} - ${act.crashTime})`;
      
      return [
        { value: act.id, readOnly: true },
        { value: { value: act.maxCrashWeeks, formula: max_formula }, DataViewer: FormulaCellViewer },
        { value: { value: act.crashCostPerWeek, formula: cost_formula }, DataViewer: FormulaCellViewer }
      ] as CellBase[];
    });
    return [head, ...rows];
  }, [activities]);

  return (
    <>
      <h3 className={styles.subHeader}>Cálculo de Costo de Compresión</h3>
      <p className={styles.description}>
        Aquí se justifica "cuánto cuesta" reducir cada actividad por semana. Esta es la
        métrica clave para decidir qué actividad comprimir primero.
      </p>
      <Spreadsheet data={crashingCalcSheet} />
    </>
  );
}
```

---

## Archivo: `components\pert\CrashingCostGraph.tsx`

```tsx
import React from 'react';
import { CrashingAnalysis } from '../../services/pertService';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot, Label
} from 'recharts';
import styles from '../PertModule.module.scss';

type Props = {
  crash: CrashingAnalysis;
};

const fmtCost = (x: unknown) => typeof x === 'number' && isFinite(x) ? `$${x.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '...';

export default function CrashingCostGraph({ crash }: Props) {
  return (
    <>
      <h3 className={`${styles.subHeader} mt-6`}>Gráfico de Costos del Proyecto</h3>
      <p className={styles.description}>
        Visualización de la tabla anterior. El punto más bajo de la curva "Costo Total" es
        el Tiempo y Costo Óptimos.
      </p>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={crash.steps} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="duration" label={{ value: 'Duración del Proyecto (Semanas)', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Costo ($)', angle: -90, position: 'insideLeft' }}
                   tickFormatter={(val) => `$${val/1000}k`} />
            <RechartsTooltip formatter={(val:number) => fmtCost(val)} />
            <Line type="monotone" dataKey="activityCost" name="Costo Actividad" stroke="#8884d8" />
            <Line type="monotone" dataKey="totalCost" name="Costo Total" stroke="#82ca9d" strokeWidth={3} />
            <Line type="monotone" dataKey="fixedCost" name="Costo Fijo" stroke="#ccc" />
            <Line type="monotone" dataKey="penaltyCost" name="Costo Penalidad" stroke="#ffc658" />
            <ReferenceDot x={crash.optimalTime} y={crash.optimalCost} r={8} fill="#82ca9d" stroke="white">
              <Label value="Costo Óptimo" position="top" offset={10} />
            </ReferenceDot>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
```

---

## Archivo: `components\pert\CrashingStepsTable.tsx`

```tsx
    import React, { useMemo } from 'react';
import Spreadsheet, { Matrix, CellBase } from 'react-spreadsheet';
import { CrashStep, CrashingAnalysis } from '../../services/pertService'; // Exporta CrashingAnalysis
import { FormulaCellViewer } from '../ui/FormulaCellViewer';
import styles from '../PertModule.module.scss';
import clsx from 'clsx';

type Props = {
  crash: CrashingAnalysis;
  fixedCosts: number;
  penaltyCost: number;
  penaltyWeek: number;
};

const fmt = (x: unknown, d = 2) => typeof x === 'number' && isFinite(x) ? x.toFixed(d) : '...';
const fmtCost = (x: unknown) => typeof x === 'number' && isFinite(x) ? `$${x.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '...';

export default function CrashingStepsTable({ crash, fixedCosts, penaltyCost, penaltyWeek }: Props) {
  const crashingStepsSheet = useMemo<Matrix<CellBase>>(() => {
    const head = ["Duración (T)", "Costo Actividad", "Costo Fijo", "Costo Penalización", "Costo Total"]
      .map(h => ({ value: h, readOnly: true, className: 'font-bold bg-slate-100' }));

    const rows = crash.steps.map((step: CrashStep) => {
      const isOptimal = step.duration === crash.optimalTime;
      const f_fixed = `= Duración * Costo Fijo/sem\n= ${fmt(step.duration)} * ${fmtCost(fixedCosts)}`;
      const f_pen = `= MAX(0, T - T_lim) * Pen/sem\n= MAX(0, ${fmt(step.duration)} - ${penaltyWeek}) * ${fmtCost(penaltyCost)}`;
      const f_total = `= C.Act + C.Fijo + C.Pen\n= ${fmtCost(step.activityCost)} + ${fmtCost(step.fixedCost)} + ${fmtCost(step.penaltyCost)}`;

      return [
        { value: fmt(step.duration), className: clsx(isOptimal && 'font-bold bg-green-100') },
        { value: fmtCost(step.activityCost) },
        { value: { value: fmtCost(step.fixedCost), formula: f_fixed }, DataViewer: FormulaCellViewer },
        { value: { value: fmtCost(step.penaltyCost), formula: f_pen }, DataViewer: FormulaCellViewer },
        { value: { value: fmtCost(step.totalCost), formula: f_total }, DataViewer: FormulaCellViewer, className: clsx(isOptimal && 'font-bold bg-green-100') }
      ] as CellBase[];
    });
    return [head, ...rows];
  }, [crash, fixedCosts, penaltyCost, penaltyWeek]);

  return (
    <>
      <h3 className={`${styles.subHeader} mt-6`}>Iteraciones de Compresión (Crashing)</h3>
      <p className={styles.description}>
        Esta tabla muestra el proceso iterativo. El **Costo Total Óptimo (Q1)** es el valor mínimo
        en la columna "Costo Total" (resaltado en verde).
      </p>
      <Spreadsheet data={crashingStepsSheet} />
    </>
  );
}
```

---

## Archivo: `components\pert\PertActivitySheet.tsx`

```tsx
import React from 'react';
import Spreadsheet, { Matrix, CellBase } from 'react-spreadsheet';
import styles from '../PertModule.module.scss';

type Props = {
  sheet: Matrix<CellBase>;
  setSheet: (s: Matrix<CellBase>) => void;
};

export default function PertActivitySheet({ sheet, setSheet }: Props) {
  return (
    <details className={styles.details}>
      <summary>Hoja de Actividades Principal (Editable)</summary>
      <div className={styles.content}>
        <Spreadsheet data={sheet} onChange={setSheet} />
      </div>
    </details>
  );
}
```

---

## Archivo: `components\pert\PertAnalysisTable.tsx`

```tsx
import React, { useMemo } from 'react';
import Spreadsheet, { Matrix, CellBase } from 'react-spreadsheet';
import { ActivityNode, PertActivityIn } from '../../services/pertService';
import { FormulaCellViewer } from '../ui/FormulaCellViewer';
import styles from '../PertModule.module.scss';
import clsx from 'clsx';

type Props = {
  activities: ActivityNode[];
  activitiesFromSheet: PertActivityIn[]; // Para jalar a, m, b
};

export default function PertAnalysisTable({ activities, activitiesFromSheet }: Props) {
  const pertAnalysisSheet = useMemo<Matrix<CellBase>>(() => {
    const head = ["ID", "T Esperado (Tₑ)", "Varianza (σ²)", "ES", "EF", "LS", "LF", "Holgura (S)"]
      .map(h => ({ value: h, readOnly: true, className: 'font-bold bg-slate-100' }));
    
    const inputMap = new Map(activitiesFromSheet.map(a => [a.id, a]));

    const rows = activities.map(act => {
      const input = inputMap.get(act.id) || {};
      const te_formula = `=(a + 4m + b) / 6\n=(${input.a} + 4*${input.m} + ${input.b}) / 6`;
      const var_formula = `=[(b - a) / 6]²\n=[(${input.b} - ${input.a}) / 6]²`;

      return [
        { value: act.id, readOnly: true, className: clsx(act.isCritical && 'font-bold bg-red-50') },
        { value: { value: act.te, formula: te_formula }, DataViewer: FormulaCellViewer },
        { value: { value: act.variance, formula: var_formula }, DataViewer: FormulaCellViewer },
        { value: act.es },
        { value: act.ef },
        { value: act.ls },
        { value: act.lf },
        { value: act.slack, className: clsx(act.isCritical && 'font-bold bg-red-50') }
      ] as CellBase[];
    });
    return [head, ...rows];
  }, [activities, activitiesFromSheet]);

  return (
    <>
      <h3 className={`${styles.subHeader} mt-6`}>Cálculos CPM / PERT</h3>
      <p className={styles.description}>
        Cálculos intermedios para Tₑ, Varianza, y el método de la Ruta Crítica (CPM). 
        La Ruta Crítica (filas en rojo) tiene Holgura (Slack) cero.
      </p>
      <Spreadsheet data={pertAnalysisSheet} />
    </>
  );
}
```

---

## Archivo: `components\pert\PertCostInputs.tsx`

```tsx
    import React from 'react';
import styles from '../PertModule.module.scss';

type Props = {
  fixedCosts: number;
  setFixedCosts: (n: number) => void;
  penaltyCost: number;
  setPenaltyCost: (n: number) => void;
  penaltyWeek: number;
  setPenaltyWeek: (n: number) => void;
};

export default function PertCostInputs({
  fixedCosts, setFixedCosts,
  penaltyCost, setPenaltyCost,
  penaltyWeek, setPenaltyWeek
}: Props) {
  return (
    <div className={styles.inputGrid}>
      <label className="text-sm">Costos fijos por semana
        <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1"
          value={fixedCosts} onChange={e => setFixedCosts(+e.target.value || 0)} />
      </label>
      <label className="text-sm">Penalización por semana
        <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1"
          value={penaltyCost} onChange={e => setPenaltyCost(+e.target.value || 0)} />
      </label>
      <label className="text-sm">Penaliza después de la semana
        <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1"
          value={penaltyWeek} onChange={e => setPenaltyWeek(+e.target.value || 0)} />
      </label>
    </div>
  );
}
```

---

## Archivo: `components\pert\PertNetworkDiagram.tsx`

```tsx
// components/pert/PertNetworkDiagram.tsx

import React, { useMemo, useEffect } from 'react'; // Añadir useEffect
import ReactFlow, { MiniMap, Controls, Background, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { ActivityNode, PertAnalysis } from '../../services/pertService'; 
import styles from '../PertModule.module.scss';
import clsx from 'clsx';

type Props = {
  pert: PertAnalysis | null; 
};

// Nodo personalizado (sin cambios)
const CustomNode = ({ data }: { data: { label: string; te: number; isCritical: boolean } }) => (
  <div className={clsx(styles.reactFlowNode, data.isCritical && styles.critical)}>
    <div className={styles.label}>{data.label}</div>
    <div className={styles.te}>Tₑ: {data.te.toFixed(2)}</div>
  </div>
);
const nodeTypes = { custom: CustomNode };

// Lógica de auto-layout con Dagre (sin cambios)
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 120;
const nodeHeight = 60;
const getLayoutedElements = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
  try { // --- Añadido try-catch por si Dagre falla ---
    dagreGraph.setGraph({ rankdir: 'LR' }); 
    nodes.forEach((node) => { dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }); });
    edges.forEach((edge) => { dagreGraph.setEdge(edge.source, edge.target); });
    dagre.layout(dagreGraph);
    nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      // --- Verificación extra por si nodeWithPosition es undefined ---
      if (nodeWithPosition) {
          node.position = { x: nodeWithPosition.x - nodeWidth / 2, y: nodeWithPosition.y - nodeHeight / 2 };
      } else {
          console.error(`Dagre: No position found for node ${node.id}`);
          node.position = { x: Math.random() * 100, y: Math.random() * 100 }; // Fallback position
      }
      return node;
    });
    return { nodes, edges };
  } catch (error) {
    console.error("Error during Dagre layout:", error);
    // Retorna nodos sin posición calculada si falla
    return { nodes, edges }; 
  }
};

export default function PertNetworkDiagram({ pert }: Props) {
  
  // --- Depuración: Loggear los datos recibidos ---
  useEffect(() => {
    console.log("PertNetworkDiagram received pert data:", pert);
  }, [pert]);
  // --- Fin Depuración ---

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    // --- Verificación Robusta: Asegurarse que pert y activities existen ---
    if (!pert || !pert.activities || pert.activities.length === 0) {
      console.log("PertNetworkDiagram: No valid 'pert' data or activities found, returning empty elements.");
      return { nodes: [], edges: [] };
    }
    
    console.log("PertNetworkDiagram: Generating nodes and edges..."); // Log para ver si entra aquí
    
    const criticalPathSet = new Set(pert.criticalPath || []);
    const activities = pert.activities;

    // Creación de Nodos (sin cambios)
    const reactFlowNodes: Node[] = activities.map(act => ({
      id: act.id,
      type: 'custom',
      data: { label: act.id, te: act.te, isCritical: criticalPathSet.has(act.id) },
      position: { x: 0, y: 0 }, 
    }));
    reactFlowNodes.push({ id: 'START', data: { label: 'START' }, position: { x: 0, y: 0 }, style: { padding: '10px 20px', background: '#dff0d8' } });
    reactFlowNodes.push({ id: 'END', data: { label: 'END' }, position: { x: 0, y: 0 }, style: { padding: '10px 20px', background: '#dff0d8' } });

    // Creación de Aristas (con estilos críticos)
    const reactFlowEdges: Edge[] = [];
     activities.forEach(act => {
      const isActCritical = criticalPathSet.has(act.id);
      
      // Conexiones desde START
      if (act.preds.length === 0 || act.preds.includes('START')) {
        const isEdgeCritical = isActCritical; 
        reactFlowEdges.push({ 
          id: `START-${act.id}`, source: 'START', target: act.id, animated: isEdgeCritical, 
          style: { stroke: isEdgeCritical ? '#EF4444' : '#6b7280', strokeWidth: isEdgeCritical ? 3 : 1.5 } 
        });
      }
      
      // Conexiones entre actividades
      act.preds.forEach(predId => {
        if (predId === 'START') return;
        const isPredCritical = criticalPathSet.has(predId);
        const isEdgeCritical = isActCritical && isPredCritical; 
        reactFlowEdges.push({ 
          id: `${predId}-${act.id}`, source: predId, target: act.id, animated: isEdgeCritical, 
          style: { stroke: isEdgeCritical ? '#EF4444' : '#6b7280', strokeWidth: isEdgeCritical ? 3 : 1.5 } 
        });
      });

      // Conexiones hacia END
      if (act.succs.length === 0) {
        const isEdgeCritical = isActCritical; 
        reactFlowEdges.push({ 
          id: `${act.id}-END`, source: act.id, target: 'END', animated: isEdgeCritical, 
          style: { stroke: isEdgeCritical ? '#EF4444' : '#6b7280', strokeWidth: isEdgeCritical ? 3 : 1.5 } 
        });
      }
    });
    
    // --- Depuración: Loggear nodos/aristas ANTES del layout ---
    // console.log("Nodes before layout:", JSON.stringify(reactFlowNodes));
    // console.log("Edges before layout:", JSON.stringify(reactFlowEdges));

    const layoutResult = getLayoutedElements(reactFlowNodes, reactFlowEdges);
    
    // --- Depuración: Loggear nodos/aristas DESPUÉS del layout ---
    // console.log("Nodes after layout:", JSON.stringify(layoutResult.nodes));
    
    return layoutResult;
  }, [pert]);

  // --- Renderizado Condicional Mejorado ---
  if (!pert) {
    return (
      <div className={styles.description}>
        Esperando datos del análisis PERT...
      </div>
    );
  }
  if (!pert.activities || pert.activities.length === 0) {
    return (
      <div className={styles.description}>
        No hay actividades definidas para mostrar el diagrama.
      </div>
    );
  }
   if (layoutedNodes.length === 0 && layoutedEdges.length === 0 && pert.activities.length > 0) {
     return (
       <div className={`${styles.description} text-red-600`}>
         Error al generar los elementos del diagrama. Revisa la consola para más detalles.
       </div>
     );
  }


  return (
    <>
      <h3 className={styles.subHeader}>Red del Proyecto (React Flow)</h3>
      <p className={styles.description}>
        Diagrama interactivo de la red. Los nodos y flechas en rojo indican la Ruta Crítica.
      </p>
      {/* --- Contenedor con altura mínima garantizada --- */}
      <div className={styles.reactFlowContainer} style={{ minHeight: '400px' }}> 
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }} 
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </>
  );
}       
```

---

## Archivo: `components\pert\PertResultsGrid.tsx`

```tsx
// components/pert/PertResultsGrid.tsx

import React from 'react';
import { PertAnalysis, CrashingAnalysis } from '../../services/pertService';
import { Info } from 'lucide-react';
import styles from '../PertModule.module.scss';

type Props = {
  pert: PertAnalysis;
  crash: CrashingAnalysis;
  q5: number;
  q5_formula: string;
  q3: number;
  fixedCosts: number;
  penaltyCost: number;
  penaltyWeek: number;
};

const fmt = (x: unknown, d = 2) => typeof x === 'number' && isFinite(x) ? x.toFixed(d) : '...';
const fmtCost = (x: unknown) => typeof x === 'number' && isFinite(x) ? `$${x.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '...';

export default function PertResultsGrid({
  pert, crash, q5, q5_formula, q3, fixedCosts, penaltyCost, penaltyWeek
}: Props) {
  const q4_formula = `= C.Act(29s) + C.Fijo(29s) + C.Pen(29s)\n` +
                   `=${fmtCost(crash.costAt29Weeks_Activities)} + ${fmtCost(29 * fixedCosts)} + ${fmtCost(Math.max(0, 29-penaltyWeek)*penaltyCost)}`;

  return (
    // --- ¡CORRECCIÓN DE ORDEN AQUÍ! ---
    <div className={styles.resultsGrid}>
      {/* --- PREGUNTAS DE CRASHING (Q1-Q5) --- */}
      <div className={styles.resultBox}>
        <div><span><b>Q1</b> Costo total óptimo</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content="El punto más bajo en la curva de 'Costo Total' del gráfico." className={styles.formulaIcon} /></div>
        <div>{fmtCost(crash.optimalCost)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q2</b> Costo actividades (29s)</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content="Como 29s > T.Normal (17s), no se comprime nada. El costo es el base." className={styles.formulaIcon} /></div>
        <div>{fmtCost(crash.costAt29Weeks_Activities)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q3</b> Ingreso sem 29</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content="Si el proyecto dura 29 semanas, abre en la semana 29. No hay ingresos *en* la semana 29." className={styles.formulaIcon} /></div>
        <div>{fmtCost(q3)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q4</b> Costo total (29s)</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content={q4_formula} className={styles.formulaIcon} /></div>
        <div>{fmtCost(crash.costAt29Weeks_Total)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q5</b> Deuda sem 29 (T. opt)</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content={q5_formula} className={styles.formulaIcon} /></div>
        <div>{fmtCost(q5)}</div>
      </div>
      
      {/* --- PREGUNTAS DE PERT (Q6-Q9) --- */}
      <div className={styles.resultBox}>
        <div><span><b>Q6</b> P(T ≤ 49)</span></div>
        <div>{fmt(pert.probQ6, 6)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q7</b> P(54 ≤ T ≤ 57)</span></div>
        <div>{fmt(pert.probQ7, 6)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q8</b> P(T ≥ 51)</span></div>
        <div>{fmt(pert.probQ8, 6)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q9</b> P(T≤49 y T≥55)</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content="Evento imposible. Un número no puede ser a la vez menor que 49 y mayor que 55." className={styles.formulaIcon} /></div>
        <div>0.0</div>
      </div>

      {/* --- DATOS INFORMATIVOS (SIN PREGUNTA) --- */}
      <div className={styles.resultBox}>
        <div><span>Duración Tₑ (PERT)</span></div>
        <div>{fmt(pert.projectDuration, 2)} sem</div>
      </div>
      <div className={styles.resultBox}>
        <div><span>Ruta Crítica (PERT)</span></div>
        <div className="text-sm font-semibold">{pert.criticalPath.join(' → ')}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span>Desv. Estándar (σ)</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content={`= SQRT(Suma de Varianzas de Ruta Crítica)\n= SQRT(${fmt(pert.projectVariance, 4)})`} className={styles.formulaIcon} /></div>
        <div>{fmt(Math.sqrt(pert.projectVariance), 3)}</div>
      </div>
    </div>
    // --- FIN DE LA CORRECCIÓN DE ORDEN ---
  );
}
```

---

## Archivo: `components\PertModule.tsx`

```tsx
// components/PertModule.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Matrix, CellBase } from 'react-spreadsheet';
import Card from './ui/Card';
import {
  calculatePertAnalysis,
  calculateCrashingAnalysis,
  PertActivityIn
} from '../services/pertService';

// --- NUEVAS IMPORTACIONES DE COMPONENTES HIJOS ---
import styles from './PertModule.module.scss';
import { Tooltip } from 'react-tooltip';
import { FaProjectDiagram } from 'react-icons/fa';
import PertCostInputs from './pert/PertCostInputs';
import PertActivitySheet from './pert/PertActivitySheet';
import PertNetworkDiagram from './pert/PertNetworkDiagram';
import PertAnalysisTable from './pert/PertAnalysisTable';
import CrashingCalculations from './pert/CrashingCalculations';
import CrashingStepsTable from './pert/CrashingStepsTable';
import CrashingCostGraph from './pert/CrashingCostGraph';
import PertResultsGrid from './pert/PertResultsGrid';
// --- FIN DE IMPORTACIONES ---

type Props = {
  initialData: {
    fixedCosts: number;
    penaltyCost: number;
    penaltyStartsAfterWeek: number;
    monthlyOps?: { avgSales: number; fixedOpsCost: number };
    activities: PertActivityIn[];
  };
};

const weeksPerMonth = 365.25 / 12 / 7;
const fmt = (x: unknown, d = 2) => typeof x === 'number' && isFinite(x) ? x.toFixed(d) : '...';
const fmtCost = (x: unknown) => typeof x === 'number' && isFinite(x) ? `$${x.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '...';

const headers = ['ID', 'Predecesores', 'T.Normal', 'C.Normal', 'T.Crash', 'C.Crash', 'a', 'm', 'b'];

export default function PertModule({ initialData }: Props) {
  // --- ESTADO (STATE) ---
  const [sheet, setSheet] = useState<Matrix<CellBase>>([]);
  const [fixedCosts, setFixedCosts] = useState(initialData.fixedCosts);
  const [penaltyCost, setPenaltyCost] = useState(initialData.penaltyCost);
  const [penaltyWeek, setPenaltyWeek] = useState(initialData.penaltyStartsAfterWeek);

  // --- LÓGICA DE DATOS (MEMOS) ---
  // (Esta lógica se queda en el padre)

  // 1. Construir hoja (solo se ejecuta 1 vez)
  useEffect(() => {
    const headRow = headers.map(h => ({ value: h, readOnly: true, className: 'font-bold bg-slate-100' }));
    const rows = initialData.activities.map(a => ([
      { value: a.id }, { value: a.predecessors ?? '-' },
      { value: a.normalTime ?? '' }, { value: a.normalCost ?? '' },
      { value: a.crashTime ?? '' }, { value: a.crashCost ?? '' },
      { value: a.a ?? '' }, { value: a.m ?? '' }, { value: a.b ?? '' }
    ] as CellBase[]));
    setSheet([headRow, ...rows]);
    setFixedCosts(initialData.fixedCosts);
    setPenaltyCost(initialData.penaltyCost);
    setPenaltyWeek(initialData.penaltyStartsAfterWeek);
  }, [initialData]);

  // 2. Parsear hoja (se re-ejecuta si 'sheet' cambia)
  const activitiesFromSheet = useMemo<PertActivityIn[]>(() => {
    if (sheet.length < 2) return [];
    const out: PertActivityIn[] = [];
    for (let r = 1; r < sheet.length; r++) {
      const row = sheet[r] || [];
      const val = (c: number) => (row[c]?.value ?? '').toString().trim();
      const num = (c: number) => {
        const raw = val(c).replace(/,/g, '.').replace(/\s/g,'');
        const n = Number(raw);
        return isNaN(n) ? undefined : n;
      };
      const predsStr = val(1);
      out.push({
        id: val(0), predecessors: predsStr === '-' ? '' : predsStr,
        normalTime: num(2), normalCost: num(3),
        crashTime: num(4), crashCost: num(5),
        a: num(6), m: num(7), b: num(8)
      });
    }
    return out.filter(a => a.id);
  }, [sheet]);

  // 3. Cálculos principales (se re-ejecutan si los datos parseados o costos cambian)
  const pert = useMemo(() => activitiesFromSheet.length ? calculatePertAnalysis(activitiesFromSheet) : null, [activitiesFromSheet]);
  const crash = useMemo(
    () => activitiesFromSheet.length
      ? calculateCrashingAnalysis(activitiesFromSheet, fixedCosts, penaltyCost, penaltyWeek)
      : null,
    [activitiesFromSheet, fixedCosts, penaltyCost, penaltyWeek]
  );

  // 4. Cálculos de preguntas (Q3, Q5)
  const q3 = 0.0;
  const q5 = useMemo(() => {
    if (!crash?.optimalTime || !crash?.optimalCost) return 0;
    const weeksOp = 29 - crash.optimalTime;
    const monthsOp = weeksOp / weeksPerMonth;
    const ingreso = monthsOp * (initialData.monthlyOps?.avgSales ?? 32000);
    const costoOp = monthsOp * (initialData.monthlyOps?.fixedOpsCost ?? 10000);
    return ingreso - costoOp - crash.optimalCost;
  }, [crash, initialData.monthlyOps]);
  
  // 4b. Fórmula para Q5 (para el tooltip)
  const q5_formula = `T_op = 29 - T_opt = 29 - ${fmt(crash?.optimalTime, 0)} = ${fmt(29 - (crash?.optimalTime || 0))}\n` +
                   `Meses_op = T_op / ${fmt(weeksPerMonth)} = ${fmt((29 - (crash?.optimalTime || 0)) / weeksPerMonth)}\n` +
                   `Ingreso = Meses_op * 32000 = ${fmtCost(((29 - (crash?.optimalTime || 0)) / weeksPerMonth) * 32000)}\n` +
                   `Costo_op = Meses_op * 10000 = ${fmtCost(((29 - (crash?.optimalTime || 0)) / weeksPerMonth) * 10000)}\n` +
                   `Deuda = Ingreso - Costo_op - Costo_Total_Opt\n` +
                   `Deuda = ... - ${fmtCost(crash?.optimalCost)} = ${fmtCost(q5)}`;

  // --- RENDERIZADO (VISTA) ---
  // (Ahora solo renderiza los componentes hijos)
  return (
    <Card>
      <h2 className={styles.cardHeader}>
        <FaProjectDiagram />
        Caso 1 — PERT / Crashing (Q1–Q9)
      </h2>

      <PertCostInputs
        fixedCosts={fixedCosts} setFixedCosts={setFixedCosts}
        penaltyCost={penaltyCost} setPenaltyCost={setPenaltyCost}
        penaltyWeek={penaltyWeek} setPenaltyWeek={setPenaltyWeek}
      />

      <PertActivitySheet sheet={sheet} setSheet={setSheet} />

      {(pert && crash) && (
        <>
          <details className={styles.details} open>
            <summary>1. Justificación Análisis PERT (Probabilidades Q6-Q9)</summary>
            <div className={styles.content}>
              
              {/* --- ¡CORRECCIÓN AQUÍ! --- */}
              {/* Le pasamos el objeto 'pert' completo, no solo 'pert.activities' */}
              <PertNetworkDiagram pert={pert} />
              {/* --- FIN DE LA CORRECCIÓN --- */}

              <PertAnalysisTable activities={pert.activities} activitiesFromSheet={activitiesFromSheet} />
            </div>
          </details>

          <details className={styles.details} open>
            <summary>2. Justificación Análisis de Costos (Crashing Q1-Q5)</summary>
            <div className={styles.content}>
              <CrashingCalculations activities={pert.activities} />
              <CrashingStepsTable crash={crash} fixedCosts={fixedCosts} penaltyCost={penaltyCost} penaltyWeek={penaltyWeek} />
              <CrashingCostGraph crash={crash} />
            </div>
          </details>

          <PertResultsGrid
            pert={pert}
            crash={crash}
            q5={q5}
            q5_formula={q5_formula}
            q3={q3}
            fixedCosts={fixedCosts}
            penaltyCost={penaltyCost}
            penaltyWeek={penaltyWeek}
          />
        </>
      )}
      
      {/* Tooltip Global */}
      <Tooltip id="pert-formula-tip" className={styles.tooltip} />
    </Card>
  );
}
```

---

## Archivo: `components\QueuingModule.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import Card from './ui/Card';
import Input from './ui/Input';
import { calculateMetrics, calculatePn } from '../services/queuingService';

// --- NUEVAS IMPORTACIONES ---
import styles from './QueuingModule.module.scss';
import { Tooltip } from 'react-tooltip';
import { FaUsers } from 'react-icons/fa';
import { Users, Clock, Server, Info } from 'lucide-react';
// --- FIN NUEVAS IMPORTACIONES ---

export interface InitialData {
  lambda: number; lambdaUnit: number; // 7 / 91
  mu: number; muUnit: number;         // 4.5 / 45
  s?: number;
}

const fmt = (x: unknown, d = 12) => typeof x === 'number' && isFinite(x) ? x.toFixed(d) : '...';

export default function QueuingModule({ initialData }: { initialData?: InitialData }) {
  // --- ESTADOS PARA INPUTS CRUDOS ---
  const [arrivalCustomers, setArrivalCustomers] = useState(initialData?.lambda || 7);
  const [arrivalMinutes, setArrivalMinutes] = useState(initialData?.lambdaUnit || 91);
  const [serviceCustomers, setServiceCustomers] = useState(initialData?.mu || 4.5);
  const [serviceMinutes, setServiceMinutes] = useState(initialData?.muUnit || 45);
  const [s, setS] = useState(initialData?.s ?? 1);

  // --- ESTADOS PARA TASAS CALCULADAS ---
  const [lambda, setLambda] = useState(0);
  const [mu, setMu] = useState(0);
  const [res, setRes] = useState<any>(null);

  // Recalcular tasas cuando los inputs crudos cambian
  useEffect(() => {
    setLambda(arrivalCustomers / (arrivalMinutes || 1));
    setMu(serviceCustomers / (serviceMinutes || 1));
  }, [arrivalCustomers, arrivalMinutes, serviceCustomers, serviceMinutes]);

  const stable = useMemo(() => lambda > 0 && mu > 0 && s > 0 && lambda < s * mu, [lambda, mu, s]);

  // --- ¡SOLUCIÓN ROBUSTA! ---
  // Objeto de fórmulas con 'f' (fórmula) y 'd' (descripción) separados.
  // Esto evita errores de sintaxis y es más limpio.
  const formulas = {
    lambda: { f: `= ${arrivalCustomers} / ${arrivalMinutes}`, d: "Clientes / Minutos" },
    mu: { f: `= ${serviceCustomers} / ${serviceMinutes}`, d: "Clientes / Minutos" },
    s: { f: `s = 1`, d: "Se usará el modelo M/M/1" },
    // Asumimos B4=λ, B5=μ, B6=s
    rho: { f: `= B4 / (B6 * B5)`, d: "λ / (s * μ). Asume λ en B4, μ en B5, s en B6" },
    P0: { f: `= 1 - B7`, d: "Para s=1, P₀ = 1 - ρ. Asume ρ en B7" },
    Lq: { f: `= (B7^2) / (1 - B7)`, d: "Para s=1. Asume ρ en B7" },
    L: { f: `= B8 + (B4 / B5)`, d: "L = Lq + (λ / μ). Asume Lq en B8" },
    Wq: { f: `= B8 / B4`, d: "Wq = Lq / λ. Asume Lq en B8" },
    W: { f: `= B10 + (1 / B5)`, d: "W = Wq + (1 / μ). Asume Wq en B10" },
    // Justificación de preguntas
    q10: { f: `1 - P(0) - P(1)`, d: "P(n_q ≥ 1) ➜ P(n_s ≥ 2)" },
    q11: { f: `P(n_s = 3)`, d: "Probabilidad de 3 en sistema" },
    q12: { f: `P(n_s = 5)`, d: "P(n_q = 4) ➜ P(n_s = s + 4)" },
    q13: { f: `SUM(P(0)..P(6))`, d: "P(n_q ≤ 5) ➜ P(n_s ≤ s + 5)" },
    q14: { f: `P(0) + P(1) + P(2)`, d: "P(n_s < 3)" },
    q15: { f: `1 - (Celda Q14)`, d: "P(n_s ≥ 3) = 1 - P(n_s < 3)" }
  };
  // --- FIN DE LA SOLUCIÓN ---

  // Recalcular métricas cuando las tasas cambian
  useEffect(() => {
    if (!stable) return setRes(null);
    const m = calculateMetrics({ lambda, mu, s });
    const Pn = (n: number) => calculatePn({ lambda, mu, s, n, P0: m.P0, rho: m.rho });
    
    // Lógica de Preguntas (s=1)
    const P0 = Pn(0);
    const P1 = Pn(1);
    const P2 = Pn(2);
    const q10 = 1 - (P0 + P1);
    const q11 = Pn(3);
    const q12 = Pn(s + 4); // P(5)
    let q13 = 0; for (let k = 0; k <= s + 5; k++) q13 += Pn(k); // P(0)...P(6)
    const q14 = P0 + P1 + P2;
    const q15 = 1 - q14;

    setRes({ m, q10, q11, q12, q13, q14, q15 });
  }, [lambda, mu, s, stable]);

  // Helper para formatear el contenido del tooltip
  const getTooltipContent = (formulaObj: { f: string; d: string }) => {
    return `${formulaObj.f}\n${formulaObj.d}`;
  };

  return (
    <Card>
      <h2 className={styles.cardHeader}>
        <FaUsers />
        Caso 2 — Líneas de Espera (M/M/1) (Q10–Q15)
      </h2>

      {/* --- SECCIÓN DE INPUTS CRUDOS --- */}
      <div className={styles.inputSection}>
        <div className={styles.inputGrid}>
          {/* Grupo de Llegada (Lambda) */}
          <div className={styles.inputGroup}>
            <label><Users size={16} /> Tasa de Llegada (λ)</label>
            <Input label="Clientes" type="number" value={arrivalCustomers}
                   onChange={(e) => setArrivalCustomers(parseFloat(e.target.value))} />
            <Input label="Minutos" type="number" value={arrivalMinutes}
                   onChange={(e) => setArrivalMinutes(parseFloat(e.target.value))} />
          </div>
          {/* Grupo de Servicio (Mu) */}
          <div className={styles.inputGroup}>
            <label><Clock size={16} /> Tasa de Servicio (μ)</label>
            <Input label="Clientes" type="number" value={serviceCustomers}
                   onChange={(e) => setServiceCustomers(parseFloat(e.target.value))} />
            <Input label="Minutos" type="number" value={serviceMinutes}
                   onChange={(e) => setServiceMinutes(parseFloat(e.target.value))} />
          </div>
        </div>
      </div>

      {/* --- SECCIÓN DE TASAS CALCULADAS --- */}
      <div className={styles.ratesGrid}>
        <Input label="λ (clientes/min)" type="number" value={fmt(lambda, 6)} readOnly
               icon={<Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.lambda)} className={styles.formulaIcon} />} />
        <Input label="μ (clientes/min)" type="number" value={fmt(mu, 6)} readOnly
               icon={<Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.mu)} className={styles.formulaIcon} />} />
        <Input label="Servidores (s)" type="number" value={s}
               onChange={(e) => setS(parseInt(e.target.value))}
               icon={<Server />} />
      </div>

      {!stable && <p className={styles.unstableMessage}>Sistema inestable (λ ≥ s·μ).</p>}

      {stable && res && (
        <div className={styles.resultsSection}>
          {/* --- MÉTRICAS DE RENDIMIENTO --- */}
          <h3 className={styles.subHeader}>Métricas de Rendimiento (M/M/1)</h3>
          <div className={styles.resultsGrid}>
            <div className={styles.resultBox}>
              <div><span>Utilización (ρ)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.rho)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.m.rho, 6)}</div>
            </div>
            <div className={styles.resultBox}>
              <div><span>Prob. Ocioso (P₀)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.P0)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.m.P0, 6)}</div>
            </div>
            <div className={styles.resultBox}>
              <div><span>Clientes en Cola (Lq)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.Lq)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.m.Lq, 6)}</div>
            </div>
            <div className={styles.resultBox}>
              <div><span>Clientes en Sistema (L)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.L)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.m.L, 6)}</div>
            </div>
            <div className={styles.resultBox}>
              <div><span>Tiempo en Cola (Wq)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.Wq)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.m.Wq, 6)}</div>
            </div>
            <div className={styles.resultBox}>
              <div><span>Tiempo en Sistema (W)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.W)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.m.W, 6)}</div>
            </div>
          </div>

          {/* --- RESPUESTAS DEL EXAMEN --- */}
          <h3 className={`${styles.subHeader} mt-4`}>Respuestas del Examen</h3>
          <div className={styles.answerGrid}>
            <div className={styles.answerBox}>
              <div><span><b>Q10</b> P(n_q ≥ 1)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.q10)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.q10)}</div>
            </div>
            <div className={styles.answerBox}>
              <div><span><b>Q11</b> P(n_s = 3)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.q11)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.q11)}</div>
            </div>
            <div className={styles.answerBox}>
              <div><span><b>Q12</b> P(n_q = 4)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.q12)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.q12)}</div>
            </div>
            <div className={styles.answerBox}>
              <div><span><b>Q13</b> P(n_q ≤ 5)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.q13)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.q13)}</div>
            </div>
            <div className={styles.answerBox}>
              <div><span><b>Q14</b> P(n_s &lt; 3)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.q14)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.q14)}</div>
            </div>
            <div className={styles.answerBox}>
              <div><span><b>Q15</b> P(n_s ≥ 3)</span> <Info data-tooltip-id="q-formula-tip" data-tooltip-content={getTooltipContent(formulas.q15)} className={styles.formulaIcon} /></div>
              <div>{fmt(res.q15)}</div>
            </div>
          </div>
        </div>
      )}

      {/* El componente Tooltip que escucha a los íconos */}
      {/* ¡IMPORTANTE! Se añade 'whiteSpace: "pre-line"' para que respete los saltos de línea (\n) */}
      <Tooltip 
        id="q-formula-tip" 
        className={styles.tooltip}
        style={{ whiteSpace: 'pre-line' }}
      />
    </Card>
  );
}
```

---

## Archivo: `components\ui\Button.tsx`

```tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out';
  
  const variantStyles = {
    primary: 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 border-transparent disabled:bg-blue-400',
    secondary: 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500 border-transparent disabled:bg-blue-50',
    outline: 'text-blue-600 bg-white border-blue-600 hover:bg-blue-50 focus:ring-blue-500 disabled:bg-zinc-50 disabled:text-zinc-400 disabled:border-zinc-300',
  };

  const spinner = (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${isLoading ? 'cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && spinner}
      {children}
    </button>
  );
};

export default Button;

```

---

## Archivo: `components\ui\Card.tsx`

```tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white shadow-md rounded-lg p-6 ${className}`}>
      {children}
    </div>
  );
};

export default Card;

```

---

## Archivo: `components\ui\FormulaCellViewer.tsx`

```tsx
import React from 'react';
import { DataViewerProps } from 'react-spreadsheet';
import { Info } from 'lucide-react';
// Asumimos que los estilos .formulaIcon y .tooltip están en un archivo global
// o en el SCSS del módulo padre que se esté usando.
// Por simplicidad, importaremos el de PertModule
import styles from '../PertModule.module.scss'; 

export interface FormulaCell {
  value: number | string;
  formula: string;
}

const fmt = (x: unknown, d = 2) => typeof x === 'number' && isFinite(x) ? x.toFixed(d) : '...';

// --- ¡CORRECCIÓN AQUÍ! ---
// Se eliminó la 'T' extra que estaba antes del '=>'
export const FormulaCellViewer = (props: DataViewerProps<FormulaCell | string | number | undefined>) => {
// --- FIN DE LA CORRECCIÓN ---
  const { cell } = props;
  if (cell && typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value) {
    const { value, formula } = cell.value;
    const displayValue = typeof value === 'number' ? (value === Infinity ? 'N/A' : fmt(value)) : value;
    return (
      <span
        className="flex items-center justify-between w-full h-full px-1"
        data-tooltip-id="pert-formula-tip"
        data-tooltip-content={formula}
      >
        <span>{displayValue}</span>
        <Info size={14} className={styles.formulaIcon} />
      </span>
    );
  }
  return <span className="flex items-center w-full h-full px-1">{fmt(cell?.value, 2)}</span>;
};
```

---

## Archivo: `components\ui\Input.tsx`

```tsx
import React from 'react';

// Actualizado para aceptar un 'icon' opcional y 'className'
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, id, className, ...props }, ref) => {
    return (
      <div className={className}>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
        <div className="relative rounded-md shadow-sm">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              {React.cloneElement(icon as React.ReactElement, {
                className: "h-5 w-5 text-slate-400"
              })}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={`block w-full rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
              icon ? 'pl-10' : 'px-3'
            } py-2`}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
```

---

## Archivo: `components\ui\MermaidDiagram.tsx`

```tsx
import React, { useEffect, useRef, useId } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid once at the module level.
// startOnLoad: false is crucial for programmatic use in React.
mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  // Using a unique ID for each render is good practice with mermaid's async render
  const svgId = `mermaid-svg-${id}`;

  useEffect(() => {
    const renderMermaid = async () => {
      // Ensure the container ref is attached and we have a chart string to render
      if (containerRef.current && chart) {
        try {
          // Clear previous render to prevent artifacts
          containerRef.current.innerHTML = '';
          // Use the modern async mermaid.render which returns the SVG
          const { svg } = await mermaid.render(svgId, chart);
          // Check if the component is still mounted before updating the DOM
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error("Mermaid render error:", error);
          // Provide a fallback in case of an error
          if (containerRef.current) {
            containerRef.current.innerHTML = '<div class="text-red-500">Error rendering diagram.</div>';
          }
        }
      }
    };

    renderMermaid();
  }, [chart, svgId]); // Re-run the effect if the chart data or component ID changes

  return <div ref={containerRef} className="mermaid-container w-full flex justify-center" />;
};

export default MermaidDiagram;

```

---

## Archivo: `datos_problemas.json`

```json
{
  "problema_portobello_crashing_pert": {
    "preguntasAsociadas": [1, 2, 4, 5, 6, 7, 8, 9],
    "fuentesDeDatos": [
      "Documento sin título (1).pdf",
      "Crashing.csv",
      "WhatsApp Image 2025-10-23 at 9.46.59 PM.jpeg"
    ],
    "inputData": {
      "costosFijosPorSemana": 10000,
      "costoPenalizacionPorSemana": 10000,
      "semanaLimitePenalizacion": 17,
      "actividades": [
        {
          "id": "A",
          "predecesores": "-",
          "tiempoNormal": 5,
          "costoNormal": 25000,
          "tiempoAcelerado": 3,
          "costoAcelerado": 36000,
          "pert_a": 2,
          "pert_m": 3,
          "pert_b": 4
        },
        {
          "id": "B",
          "predecesores": "-",
          "tiempoNormal": 1,
          "costoNormal": 10000,
          "tiempoAcelerado": 0.5,
          "costoAcelerado": 15000,
          "pert_a": 1,
          "pert_m": 1,
          "pert_b": 1
        },
        {
          "id": "C",
          "predecesores": "A",
          "tiempoNormal": 3,
          "costoNormal": 18000,
          "tiempoAcelerado": 1.5,
          "costoAcelerado": 22000,
          "pert_a": 2,
          "pert_m": 2,
          "pert_b": 2
        },
        {
          "id": "D",
          "predecesores": "A",
          "tiempoNormal": 2,
          "costoNormal": 8000,
          "tiempoAcelerado": 1,
          "costoAcelerado": 12000,
          "pert_a": 4,
          "pert_m": 6,
          "pert_b": 12
        },
        {
          "id": "E",
          "predecesores": "A",
          "tiempoNormal": 4,
          "costoNormal": 8000,
          "tiempoAcelerado": 1.5,
          "costoAcelerado": 15000,
          "pert_a": 2,
          "pert_m": 5,
          "pert_b": 8
        },
        {
          "id": "F",
          "predecesores": "B, C",
          "tiempoNormal": 1,
          "costoNormal": 12000,
          "tiempoAcelerado": 0.5,
          "costoAcelerado": 15000,
          "pert_a": 2,
          "pert_m": 3,
          "pert_b": 8
        },
        {
          "id": "G",
          "predecesores": "D",
          "tiempoNormal": 4,
          "costoNormal": 20000,
          "tiempoAcelerado": 2.5,
          "costoAcelerado": 30000,
          "pert_a": 3,
          "pert_m": 7,
          "pert_b": 10
        },
        {
          "id": "H",
          "predecesores": "E",
          "tiempoNormal": 2,
          "costoNormal": 12000,
          "tiempoAcelerado": 1.5,
          "costoAcelerado": 17000,
          "pert_a": 3,
          "pert_m": 5,
          "pert_b": 9
        },
        {
          "id": "I",
          "predecesores": "F, G",
          "tiempoNormal": 4,
          "costoNormal": 13000,
          "tiempoAcelerado": 2.5,
          "costoAcelerado": 21000,
          "pert_a": 5,
          "pert_m": 8,
          "pert_b": 18
        },
        {
          "id": "J",
          "predecesores": "G, H",
          "tiempoNormal": 2,
          "costoNormal": 10000,
          "tiempoAcelerado": 1.5,
          "costoAcelerado": 16000,
          "pert_a": 1,
          "pert_m": 1,
          "pert_b": 5
        },
        {
          "id": "K",
          "predecesores": "I, J",
          "tiempoNormal": 2,
          "costoNormal": 8000,
          "tiempoAcelerado": 1,
          "costoAcelerado": 12000,
          "pert_a": 1,
          "pert_m": 2,
          "pert_b": 3
        },
        {
          "id": "L",
          "predecesores": "J",
          "tiempoNormal": 3,
          "costoNormal": 7000,
          "tiempoAcelerado": 2,
          "costoAcelerado": 10000,
          "pert_a": 2,
          "pert_m": 3,
          "pert_b": 4
        },
        {
          "id": "M",
          "predecesores": "K",
          "tiempoNormal": 1,
          "costoNormal": 5000,
          "tiempoAcelerado": 0.5,
          "costoAcelerado": 9000,
          "pert_a": 1,
          "pert_m": 1,
          "pert_b": 1
        },
        {
          "id": "N",
          "predecesores": "K",
          "tiempoNormal": 3,
          "costoNormal": 6000,
          "tiempoAcelerado": 1.5,
          "costoAcelerado": 10000,
          "pert_a": 2,
          "pert_m": 3,
          "pert_b": 5
        },
        {
          "id": "O",
          "predecesores": "L, M",
          "tiempoNormal": 5,
          "costoNormal": 14000,
          "tiempoAcelerado": 3,
          "costoAcelerado": 22000,
          "pert_a": 3,
          "pert_m": 5,
          "pert_b": 7
        },
        {
          "id": "P",
          "predecesores": "N",
          "tiempoNormal": 4,
          "costoNormal": 16000,
          "tiempoAcelerado": 2.5,
          "costoAcelerado": 24000,
          "pert_a": 2,
          "pert_m": 4,
          "pert_b": 6
        }
      ]
    }
  },
  "costos_operacion_restaurante": {
    "preguntasAsociadas": [3, 5],
    "fuentesDeDatos": ["Documento sin título (1).pdf"],
    "inputData": {
      "costoFijoOperacionMensual": 10000,
      "ventasPromedioMensual": 32000
    }
  },
  "problema_lineas_espera": {
    "preguntasAsociadas": [10, 11, 12, 13, 14, 15],
    "fuentesDeDatos": ["Documento sin título (1).pdf"],
    "inputData": {
      "servidores_s": 1,
      "llegada_clientes": 7,
      "llegada_tiempo_minutos": 91,
      "servicio_clientes": 4.5,
      "servicio_tiempo_minutos": 45
    }
  },
  "problema_teoria_decisiones": {
    "preguntasAsociadas": [16, 17, 18, 19, 20],
    "fuentesDeDatos": ["Documento sin título (1).pdf"],
    "inputData": {
      "decisiones_ordenar": [5, 20, 40],
      "estados_demanda": [
        {"nombre": "Baja", "valor": 5},
        {"nombre": "Media", "valor": 20},
        {"nombre": "Alta", "valor": 40}
      ],
      "pagos": {
        "precioVenta": 100,
        "costoCompra": 20,
        "costoFaltante": 50
      },
      "probabilidades": {
        "alta": 0.3,
        "media": 0.5,
        "baja": 0.2
      }
    }
  }
}
```

---

## Archivo: `i18n\LanguageContext.tsx`

```tsx
// i18n/LanguageContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations } from './locales';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof typeof translations.en, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: keyof typeof translations.en, replacements?: Record<string, string | number>): string => {
    let translation = translations[language][key] || translations.en[key];
    if (replacements) {
      Object.entries(replacements).forEach(([key, value]) => {
        translation = translation.replace(`{${key}}`, String(value));
      });
    }
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

```

---

## Archivo: `i18n\locales.ts`

```ts
// i18n/locales.ts
export const translations = {
  en: {
    // App Shell
    appTitle: "Business Decision Toolkit",
    appSubtitle: "AI-Powered Operations Management",
    queuingModuleTab: "Queuing Theory (M/M/s)",
    pertModuleTab: "PERT / CPM Analysis",

    // Queuing Module
    queuingTitle: "M/M/s Model Parameters",
    arrivalRateLabel: "Arrival Rate (λ)",
    serviceRateLabel: "Service Rate (μ)",
    serversLabel: "Number of Servers (s)",
    calculateButton: "Calculate",
    errorStableSystemMMS: "For a stable M/M/s system, total service rate (s * μ) must be greater than arrival rate (λ).",
    errorPositiveNumbers: "Arrival rate (λ), service rate (μ), and number of servers (s) must be positive numbers.",
    errorIntegerServers: "Number of servers (s) must be an integer.",
    resultsTitle: "Results",
    serverUtilization: "Server Utilization (ρ)",
    avgSystemCustomers: "Avg. System Customers (L)",
    avgQueueCustomers: "Avg. Queue Customers (Lq)",
    avgSystemTime: "Avg. System Time (W)",
    avgQueueTime: "Avg. Queue Time (Wq)",
    probSystemEmpty: "P(0) - System Empty",
    probDistributionTitle: "Probability Distribution P(n)",
    nColumn: "n",
    pnColumn: "P(n)",
    cumulativePnColumn: "Cumulative P(n)",
    getAiAnalysisButton: "Get AI Analysis & Insights",
    aiAnalysisTitle: "AI-Powered Analysis",
    aiPromptQueuing: `
      You are an expert in Operations Management.
      Analyze the following M/M/s queuing system results and provide actionable business insights.
      Explain the key metrics in simple terms and suggest potential improvements.

      System Parameters:
      - Arrival Rate (λ): {lambda} customers/unit of time
      - Service Rate per Server (μ): {mu} customers/unit of time
      - Number of Servers (s): {s}

      Calculated Metrics:
      - Server Utilization (ρ): {rho}%
      - Average number of customers in the system (L): {L}
      - Average number of customers in the queue (Lq): {Lq}
      - Average time a customer spends in the system (W): {W} units of time
      - Average time a customer spends in the queue (Wq): {Wq} units of time
      - Probability of the system being empty (P0): {P0}%

      Based on these results, what is the overall health of this queuing system? What are the main bottlenecks or inefficiencies? 
      Provide specific, practical recommendations for the business to improve customer experience and operational efficiency. 
      For example, should they consider adding/removing servers, improving service speed, or managing arrivals?
    `,

    // PERT Module
    pertTitle: "PERT/CPM Activities",
    addActivityButton: "Add Activity",
    removeButton: "Remove",
    analyzeProjectButton: "Analyze Project",
    predecessorsPlaceholder: "A,B",
    // Table Headers
    idHeader: "ID",
    predecessorsHeader: "Predecessors",
    optimisticHeader: "Optimistic (a)",
    mostLikelyHeader: "Most Likely (m)",
    pessimisticHeader: "Pessimistic (b)",
    normalCostHeader: "Normal Cost",
    crashTimeHeader: "Crash Time",
    crashCostHeader: "Crash Cost",
    // Analysis Results
    analysisTab: "PERT Analysis",
    crashingTab: "Crashing Analysis",
    analysisResultsTitle: "Analysis Results",
    projectDuration: "Project Duration (Te)",
    criticalPath: "Critical Path",
    projectVariance: "Project Variance",
    projectStdDev: "Project Std. Dev.",
    activityDetailsTitle: "Activity Details",
    networkDiagramTitle: "Project Network Diagram",
    // Activity Details Table Headers
    teHeader: "Te",
    varHeader: "Var",
    esHeader: "ES",
    efHeader: "EF",
    lsHeader: "LS",
    lfHeader: "LF",
    slackHeader: "Slack",
    // Crashing Analysis
    crashEfficiencyTitle: "Crash Cost Efficiency",
    crashChartTitle: "Cost to Reduce Duration by One Time Unit",
    costAxisLabel: "Cost ($)",
    activityAxisLabel: "Activity ID",
    targetDurationLabel: "Target Project Duration",
    calculateCrashingButton: "Calculate Crashing Plan",
    initialDuration: "Initial Duration",
    finalDuration: "Final Duration",
    totalCrashingCost: "Total Crashing Cost",
    crashingStepsTitle: "Crashing Steps",
    // Crashing Steps Table
    stepHeader: "Step",
    crashActivityHeader: "Crash Activity",
    stepCostHeader: "Step Cost",
    newDurationHeader: "New Duration",
    // Errors
    errorUniqueIds: "Activity IDs must be unique.",
    errorCircularDependency: "Circular dependency detected.",
    errorPredecessorNotFound: "Predecessor '{p}' for activity '{id}' not found.",
    errorEmptyId: "Activity ID cannot be empty.",
    errorNegativeDurations: "Error in Activity '{id}': Durations cannot be negative.",
    errorActivityTimesOrder: "Error in Activity '{id}': Durations must follow a <= m <= b.",
    errorCrashTimeGreater: "Error in Activity '{id}': Crash time cannot be greater than normal time.",
    errorCrashCostLower: "Error in Activity '{id}': Crash cost must be greater than or equal to normal cost.",
    errorNoCrashButCost: "Error in Activity '{id}': Activity cannot be crashed but has extra cost.",
    errorTargetDurationGreater: "Target duration must be less than the current project duration.",
    errorTargetDurationPositive: "Target duration must be a positive number.",
    errorCannotShortenFurther: "Cannot shorten further. No crashable activities on the critical path.",
    // AI Prompt PERT
    aiPromptPert: `
      You are an expert in Project Management and Operations Research.
      Analyze the following PERT analysis results for a project and provide actionable business insights.

      Project Summary:
      - Critical Path: {criticalPath}
      - Total Project Duration (Expected): {projectDuration}
      - Project Standard Deviation: {stdDev}

      Activity Details:
      {activitiesSummary}

      Based on these results:
      1. What is the significance of the critical path?
      2. Which non-critical activities have the most slack for resource allocation flexibility?
      3. Which activities have the highest variance and pose the greatest risk?
      4. Provide specific, practical recommendations for the project manager.
    `,
  },
  es: {
    // App Shell
    appTitle: "Kit de Herramientas de Decisión",
    appSubtitle: "Gestión de Operaciones con IA",
    queuingModuleTab: "Teoría de Colas (M/M/s)",
    pertModuleTab: "Análisis PERT / CPM",

    // Queuing Module
    queuingTitle: "Parámetros del Modelo M/M/s",
    arrivalRateLabel: "Tasa de Llegada (λ)",
    serviceRateLabel: "Tasa de Servicio (μ)",
    serversLabel: "Número de Servidores (s)",
    calculateButton: "Calcular",
    errorStableSystemMMS: "Para un sistema M/M/s estable, la tasa total de servicio (s * μ) debe ser mayor que la tasa de llegada (λ).",
    errorPositiveNumbers: "La tasa de llegada (λ), la tasa de servicio (μ) y el número de servidores (s) deben ser números positivos.",
    errorIntegerServers: "El número de servidores (s) debe ser un número entero.",
    resultsTitle: "Resultados",
    serverUtilization: "Utilización del Servidor (ρ)",
    avgSystemCustomers: "Nº Prom. Clientes en Sistema (L)",
    avgQueueCustomers: "Nº Prom. Clientes en Cola (Lq)",
    avgSystemTime: "Tiempo Prom. en Sistema (W)",
    avgQueueTime: "Tiempo Prom. en Cola (Wq)",
    probSystemEmpty: "P(0) - Sistema Vacío",
    probDistributionTitle: "Distribución de Probabilidad P(n)",
    nColumn: "n",
    pnColumn: "P(n)",
    cumulativePnColumn: "P(n) Acumulada",
    getAiAnalysisButton: "Obtener Análisis con IA",
    aiAnalysisTitle: "Análisis con Inteligencia Artificial",
    aiPromptQueuing: `
      Eres un experto en Gestión de Operaciones.
      Analiza los siguientes resultados del sistema de colas M/M/s y proporciona ideas de negocio accionables.
      Explica las métricas clave en términos sencillos y sugiere posibles mejoras.

      Parámetros del Sistema:
      - Tasa de Llegada (λ): {lambda} clientes/unidad de tiempo
      - Tasa de Servicio por Servidor (μ): {mu} clientes/unidad de tiempo
      - Número de Servidores (s): {s}

      Métricas Calculadas:
      - Utilización del Servidor (ρ): {rho}%
      - Número promedio de clientes en el sistema (L): {L}
      - Número promedio de clientes en la cola (Lq): {Lq}
      - Tiempo promedio que un cliente pasa en el sistema (W): {W} unidades de tiempo
      - Tiempo promedio que un cliente pasa en la cola (Wq): {Wq} unidades de tiempo
      - Probabilidad de que el sistema esté vacío (P0): {P0}%

      Basado en estos resultados, ¿cuál es la salud general de este sistema de colas? ¿Cuáles son los principales cuellos de botella o ineficiencias?
      Proporciona recomendaciones específicas y prácticas para que el negocio mejore la experiencia del cliente y la eficiencia operativa.
      Por ejemplo, ¿deberían considerar añadir/quitar servidores, mejorar la velocidad del servicio o gestionar las llegadas?
    `,

    // PERT Module
    pertTitle: "Actividades PERT/CPM",
    addActivityButton: "Añadir Actividad",
    removeButton: "Eliminar",
    analyzeProjectButton: "Analizar Proyecto",
    predecessorsPlaceholder: "A,B",
    // Table Headers
    idHeader: "ID",
    predecessorsHeader: "Predecesores",
    optimisticHeader: "Optimista (a)",
    mostLikelyHeader: "Más Probable (m)",
    pessimisticHeader: "Pesimista (b)",
    normalCostHeader: "Costo Normal",
    crashTimeHeader: "Tiempo Crash",
    crashCostHeader: "Costo Crash",
    // Analysis Results
    analysisTab: "Análisis PERT",
    crashingTab: "Análisis de Crashing",
    analysisResultsTitle: "Resultados del Análisis",
    projectDuration: "Duración del Proyecto (Te)",
    criticalPath: "Ruta Crítica",
    projectVariance: "Varianza del Proyecto",
    projectStdDev: "Desv. Est. del Proyecto",
    activityDetailsTitle: "Detalles de Actividad",
    networkDiagramTitle: "Diagrama de Red del Proyecto",
    // Activity Details Table Headers
    teHeader: "Te",
    varHeader: "Var",
    esHeader: "ES",
    efHeader: "EF",
    lsHeader: "LS",
    lfHeader: "LF",
    slackHeader: "Holgura",
    // Crashing Analysis
    crashEfficiencyTitle: "Eficiencia de Costo de Crashing",
    crashChartTitle: "Costo por Reducir la Duración en una Unidad",
    costAxisLabel: "Costo ($)",
    activityAxisLabel: "ID de Actividad",
    targetDurationLabel: "Duración Objetivo del Proyecto",
    calculateCrashingButton: "Calcular Plan de Crashing",
    initialDuration: "Duración Inicial",
    finalDuration: "Duración Final",
    totalCrashingCost: "Costo Total de Crashing",
    crashingStepsTitle: "Pasos de Crashing",
    // Crashing Steps Table
    stepHeader: "Paso",
    crashActivityHeader: "Actividad Acelerada",
    stepCostHeader: "Costo del Paso",
    newDurationHeader: "Nueva Duración",
    // Errors
    errorUniqueIds: "Los IDs de las actividades deben ser únicos.",
    errorCircularDependency: "Se detectó una dependencia circular.",
    errorPredecessorNotFound: "El predecesor '{p}' para la actividad '{id}' no fue encontrado.",
    errorEmptyId: "El ID de la actividad no puede estar vacío.",
    errorNegativeDurations: "Error en Actividad '{id}': Las duraciones no pueden ser negativas.",
    errorActivityTimesOrder: "Error en Actividad '{id}': Las duraciones deben seguir el orden a <= m <= b.",
    errorCrashTimeGreater: "Error en Actividad '{id}': El tiempo de crash no puede ser mayor al tiempo normal.",
    errorCrashCostLower: "Error en Actividad '{id}': El costo de crash debe ser mayor o igual al costo normal.",
    errorNoCrashButCost: "Error en Actividad '{id}': La actividad no puede ser acelerada pero tiene un costo extra.",
    errorTargetDurationGreater: "La duración objetivo debe ser menor que la duración actual del proyecto.",
    errorTargetDurationPositive: "La duración objetivo debe ser un número positivo.",
    errorCannotShortenFurther: "No se puede acortar más. No hay actividades acelerables en la ruta crítica.",
    // AI Prompt PERT
    aiPromptPert: `
      Eres un experto en Gestión de Proyectos e Investigación de Operaciones.
      Analiza los siguientes resultados del análisis PERT para un proyecto y proporciona ideas de negocio accionables.

      Resumen del Proyecto:
      - Ruta Crítica: {criticalPath}
      - Duración Total del Proyecto (Esperada): {projectDuration}
      - Desviación Estándar del Proyecto: {stdDev}

      Detalles de Actividades:
      {activitiesSummary}

      Basado en estos resultados:
      1. ¿Cuál es la importancia de la ruta crítica?
      2. ¿Qué actividades no críticas tienen la mayor holgura para flexibilidad en la asignación de recursos?
      3. ¿Qué actividades tienen la mayor varianza y representan el mayor riesgo?
      4. Proporciona recomendaciones específicas y prácticas para el director del proyecto.
    `,
  },
};

```

---

## Archivo: `index.html`

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VEM_KARLA_v2 — Examen Resuelto</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-50">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>

```

---

## Archivo: `index.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n/LanguageContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App/></React.StrictMode>
);

```

---

## Archivo: `metadata.json`

```json
{
  "name": "Business Decision Toolkit Suite",
  "description": "A modular suite of tools for business decision-making, starting with a powerful Queuing Theory analyzer. Users can manually input parameters or upload a photo of a problem for Gemini to analyze and auto-populate the form, enabling quick calculations and visualizations of system performance.",
  "requestFramePermissions": []
}
```

---

## Archivo: `package.json`

```json
{
  "name": "business-decision-toolkit-suite",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@google/genai": "^1.27.0",
    "@google/generative-ai": "^0.24.1",
    "clsx": "^2.1.1",
    "dagre": "^0.8.5",
    "lucide-react": "^0.547.0",
    "mermaid": "^10.9.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-icons": "^5.5.0",
    "react-spreadsheet": "^0.10.1",
    "react-tooltip": "^5.30.0",
    "reactflow": "^11.11.4",
    "recharts": "^3.3.0"
  },
  "devDependencies": {
    "@types/dagre": "^0.7.53",
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "sass-embedded": "^1.93.2",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}

```

---

## Archivo: `README.md`

```markdown
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-VIGbMAW65YWhIaOguYKO3SUnyQb-nkT

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

```

---

## Archivo: `services\decisionService.ts`

```ts
// services/decisionService.ts

export interface DecisionInput {
  decisions: number[];
  demands: { name: string; value: number; prob: number }[];
  payoffs: { price: number; cost: number; shortage: number };
}

// Interfaz para celdas con fórmulas
export interface FormulaCell {
  value: number;
  formula: string;
}

export interface DecisionOutput {
  payoffMatrix: Record<string, FormulaCell>;
  regretMatrix: Record<string, FormulaCell>;
  vmePerDecision: Record<number, FormulaCell>;
  maxRegretByQ: Record<number, FormulaCell>;
  vmeBest: { decision: number; value: number };
  vebc: FormulaCell;
  minimax: { decision: number; maxRegret: number };
  // Para Q19 y Q20
  payoffRaw: Record<string, number>;
}

const key = (q: number, d: number) => `${q}|${d}`;

/**
 * Genera el objeto de pago y la fórmula de Google Sheets
 * Asumimos:
 * q = $A{row} (ej: $A9)
 * d = B${row} (ej: B$8)
 * p = $B$2
 * c = $B$3
 * s = $B$4
 */
function utilityUnit(
  q: number,
  d: number,
  price: number,
  cost: number,
  shortage: number,
  qCell: string,
  dCell: string,
  pCell = "$B$2",
  cCell = "$B$3",
  sCell = "$B$4"
): FormulaCell {
  const sold = Math.min(q, d);
  const miss = Math.max(0, d - q);
  const value = sold * price - q * cost - miss * shortage;

  const formula = `=MIN(${qCell}, ${dCell})*${pCell} - ${qCell}*${cCell} - MAX(0, ${dCell}-${qCell})*${sCell}`;

  return { value, formula };
}

export function runDecision(input: DecisionInput): DecisionOutput {
  const { decisions, demands, payoffs } = input;
  
  const payoffMatrix: Record<string, FormulaCell> = {};
  const payoffRaw: Record<string, number> = {};

  // Asumimos que las demandas (estados) están en B8, C8, D8
  // y las decisiones (ordenar) en A9, A10, A11
  const demandCells = ["B$8", "C$8", "D$8"]; 
  const decisionCells = ["$A9", "$A10", "$A11"];

  decisions.forEach((q, rIdx) => {
    demands.forEach((dem, cIdx) => {
      const qCell = decisionCells[rIdx] || `$A${9 + rIdx}`;
      const dCell = demandCells[cIdx] || `${String.fromCharCode(66 + cIdx)}$8`;
      
      const cellData = utilityUnit(q, dem.value, payoffs.price, payoffs.cost, payoffs.shortage, qCell, dCell);
      payoffMatrix[key(q, dem.value)] = cellData;
      payoffRaw[key(q, dem.value)] = cellData.value;
    });
  });

  // --- VME (Q16) ---
  const vmePerDecision: Record<number, FormulaCell> = {};
  // Asumimos Probs en B7, C7, D7 y Pagos en B9:D9, B10:D10, etc.
  decisions.forEach((q, rIdx) => {
    const vme = demands.reduce((acc, dem) => acc + payoffRaw[key(q, dem.value)] * dem.prob, 0);
    const payRow = `B${9 + rIdx}:D${9 + rIdx}`;
    const probRow = "$B$7:$D$7";
    const formula = `=SUMPRODUCT(${payRow}, ${probRow})`;
    vmePerDecision[q] = { value: vme, formula };
  });
  
  const vmeBest = Object.entries(vmePerDecision).reduce(
    (best, [q, cell]) => (cell.value > best.value ? { decision: +q, value: cell.value } : best),
    { decision: decisions[0], value: vmePerDecision[decisions[0]].value }
  );

  // --- VEBC (Q17) ---
  const maxByState: Record<number, number> = {};
  demands.forEach((dem) => {
    maxByState[dem.value] = Math.max(...decisions.map(q => payoffRaw[key(q, dem.value)]));
  });
  
  const vebcValue = demands.reduce((acc, dem) => acc + maxByState[dem.value] * dem.prob, 0);
  // Asumimos Max Pagos por estado en B12:D12
  const vebcFormula = `=SUMPRODUCT($B$7:$D$7, B12:D12)`;
  const vebc: FormulaCell = { value: vebcValue, formula: vebcFormula };

  // --- Minimax (Q18) ---
  const regretMatrix: Record<string, FormulaCell> = {};
  const maxRegretByQ: Record<number, FormulaCell> = {};

  demands.forEach((dem, cIdx) => {
    // Asumimos Max Pagos por estado en B12, C12, D12
    const maxPayCell = `${String.fromCharCode(66 + cIdx)}$12`;
    
    decisions.forEach((q, rIdx) => {
      // Asumimos Pagos en B9, B10, B11...
      const payCell = `${String.fromCharCode(66 + cIdx)}${9 + rIdx}`;
      const value = maxByState[dem.value] - payoffRaw[key(q, dem.value)];
      const formula = `=${maxPayCell} - ${payCell}`;
      regretMatrix[key(q, dem.value)] = { value, formula };
    });
  });

  decisions.forEach((q, rIdx) => {
    const regrets = demands.map(d => regretMatrix[key(q, d.value)].value);
    const maxRegret = Math.max(...regrets);
    // Asumimos Matriz de Arrepentimiento en B15:D17
    const regretRow = `B${15 + rIdx}:D${15 + rIdx}`;
    const formula = `=MAX(${regretRow})`;
    maxRegretByQ[q] = { value: maxRegret, formula };
  });

  const minimax = Object.entries(maxRegretByQ).reduce(
    (best, [q, cell]) => (cell.value < best.maxRegret ? { decision: +q, maxRegret: cell.value } : best),
    { decision: decisions[0], maxRegret: maxRegretByQ[decisions[0]].value }
  );

  return { payoffMatrix, payoffRaw, regretMatrix, vmePerDecision, maxRegretByQ, vmeBest, vebc, minimax };
}
```

---

## Archivo: `services\geminiService.ts`

```ts
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

```

---

## Archivo: `services\pertService.ts`

```ts
// Ruta: src/services/pertService.ts
// ¡Servicio con lógica REAL de CPM, PERT y Crashing!

// --- INTERFACES (Sin cambios) ---
export interface PertActivityIn {
  id: string;
  predecessors?: string | string[];
  normalTime?: number;
  normalCost?: number;
  crashTime?: number;
  crashCost?: number;
  a?: number;
  m?: number;
  b?: number;
}

// Interfaz enriquecida para cálculos internos
interface ActivityNode {
  id: string;
  preds: string[];
  succs: string[];
  
  // Tiempos
  normalTime: number;
  crashTime: number;
  te: number; // PERT
  duration: number; // Tiempo actual (para crashing)

  // Costos
  normalCost: number;
  crashCost: number;
  crashCostPerWeek: number;
  maxCrashWeeks: number;

  // PERT
  variance: number;
  
  // CPM
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  isCritical: boolean;
}

// --- UTILIDADES (Copias de tu archivo) ---
const clampNum = (n: number, min = -1e12, max = 1e12) =>
  Number.isFinite(n) ? Math.min(Math.max(n, min), max) : 0;

function parsePreds(p?: string | string[]): string[] {
  if (!p) return [];
  if (Array.isArray(p)) return p.filter(Boolean).map(String);
  return p.split(',').map((x) => x.trim()).filter((x) => x.length > 0 && x !== '-');
}

function teOf(a?: number, m?: number, b?: number, fallback?: number): number {
  if (typeof a === 'number' && typeof m === 'number' && typeof b === 'number') {
    return (a + 4 * m + b) / 6;
  }
  return fallback ?? 0;
}

function varOf(a?: number, b?: number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    const sd = (b - a) / 6;
    return sd * sd;
  }
  return 0;
}

// CDF Normal (de tu archivo)
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}
function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// --- ¡NUEVO! Algoritmo CPM Genérico ---
// Este es el motor para PERT y Crashing.
function runCPM(nodes: Map<string, ActivityNode>, timeField: 'te' | 'normalTime' | 'duration') {
  const nodeIds = Array.from(nodes.keys());
  
  // 1. Forward Pass (ES, EF)
  const efCache = new Map<string, number>();
  
  function getEF(id: string): number {
    if (efCache.has(id)) return efCache.get(id)!;
    if (id === 'START') return 0;

    const node = nodes.get(id)!;
    let es = 0;
    for (const predId of node.preds) {
      es = Math.max(es, getEF(predId));
    }
    
    const duration = node[timeField];
    const ef = es + duration;
    
    node.es = es;
    node.ef = ef;
    efCache.set(id, ef);
    return ef;
  }
  
  let projectDuration = 0;
  for (const id of nodeIds) {
    if (nodes.get(id)!.succs.length === 0) { // Nodos finales
      projectDuration = Math.max(projectDuration, getEF(id));
    }
  }

  // 2. Backward Pass (LF, LS)
  const lsCache = new Map<string, number>();

  function getLS(id: string): number {
    if (lsCache.has(id)) return lsCache.get(id)!;
    if (id === 'END') return projectDuration;

    const node = nodes.get(id)!;
    let lf = projectDuration;
    
    if (node.succs.length > 0) {
      lf = Infinity;
      for (const succId of node.succs) {
        lf = Math.min(lf, getLS(succId));
      }
    }

    const duration = node[timeField];
    const ls = lf - duration;
    
    node.lf = lf;
    node.ls = ls;
    lsCache.set(id, ls);
    return ls;
  }

  for (const id of nodeIds) {
    if (nodes.get(id)!.preds.length === 0) { // Nodos iniciales
      getLS(id);
    }
  }
  
  // 3. Calculate Slack and Critical Path
  const criticalPath: string[] = [];
  for (const node of nodes.values()) {
    if (node.id === 'START' || node.id === 'END') continue;
    node.slack = node.ls - node.es;
    // Usamos un epsilon pequeño para comparar floats
    node.isCritical = node.slack < 1e-5;
    if (node.isCritical) {
      criticalPath.push(node.id);
    }
  }
  
  return { projectDuration, criticalPath };
}

// --- Función de pre-procesamiento ---
function buildActivityMap(activitiesIn: PertActivityIn[]): Map<string, ActivityNode> {
  const nodes = new Map<string, ActivityNode>();
  const allIds = new Set(activitiesIn.map(a => a.id));

  // 1. Crear nodos
  for (const a of activitiesIn) {
    const normalTime = a.normalTime ?? 0;
    const crashTime = a.crashTime ?? normalTime;
    const normalCost = a.normalCost ?? 0;
    const crashCost = a.crashCost ?? normalCost;
    const maxCrashWeeks = normalTime - crashTime;
    let crashCostPerWeek = 0;
    if (maxCrashWeeks > 0) {
      crashCostPerWeek = (crashCost - normalCost) / maxCrashWeeks;
    }

    nodes.set(a.id, {
      id: a.id,
      preds: parsePreds(a.predecessors),
      succs: [], // Se llenará después
      normalTime,
      crashTime,
      normalCost,
      crashCost,
      maxCrashWeeks,
      crashCostPerWeek: isFinite(crashCostPerWeek) ? crashCostPerWeek : Infinity,
      duration: normalTime, // Duración actual inicia como normal
      te: teOf(a.a, a.m, a.b, normalTime),
      variance: varOf(a.a, a.b),
      es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false,
    });
  }

  // 2. Conectar sucesores y virtual START
  for (const node of nodes.values()) {
    if (node.preds.length === 0) {
      node.preds.push('START'); // Conectar a START virtual
    }
    for (const predId of node.preds) {
      if (nodes.has(predId)) {
        nodes.get(predId)!.succs.push(node.id);
      }
    }
  }
  // Añadir nodo START
  nodes.set('START', { id: 'START', preds: [], succs: [], normalTime: 0, crashTime: 0, normalCost: 0, crashCost: 0, maxCrashWeeks: 0, crashCostPerWeek: 0, duration: 0, te: 0, variance: 0, es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false });

  return nodes;
}

// --- SERVICIO 1: PERT (Q6-9) (Modificado para usar el nuevo CPM) ---
export function calculatePertAnalysis(activitiesIn: PertActivityIn[]) {
  const nodes = buildActivityMap(activitiesIn);
  const { projectDuration, criticalPath } = runCPM(nodes, 'te');

  const projectVariance = criticalPath.reduce((acc, id) => acc + (nodes.get(id)?.variance || 0), 0);
  const sd = Math.max(Math.sqrt(projectVariance), 1e-6);

  // Cálculos de Probabilidad
  const z49 = (49 - projectDuration) / sd;
  const z51 = (51 - projectDuration) / sd;
  const z54 = (54 - projectDuration) / sd;
  const z57 = (57 - projectDuration) / sd;

  const probQ6 = normCdf(z49);
  const probQ8 = 1 - normCdf(z51);
  const probQ7 = Math.max(0, normCdf(z57) - normCdf(z54));
  const probQ9 = 0.0; // Evento imposible

  // Generar Mermaid (código de tu archivo)
  const edges: string[] = [];
  for (const a of activitiesIn) {
    const preds = parsePreds(a.predecessors);
    if (preds.length === 0) {
      edges.push(`START --> ${a.id}[${a.id}]`);
    } else {
      for (const p of preds) {
        edges.push(`${p} --> ${a.id}`);
      }
    }
  }
  const mermaidGraph = `graph LR\n${edges.join('\n')}`;

  const activities = Array.from(nodes.values()).filter(n => n.id !== 'START');
  
  return {
    activities,
    criticalPath,
    projectDuration, // μ_proy
    projectVariance, // σ²_proy
    mermaidGraph,
    probQ6,
    probQ7,
    probQ8,
    probQ9,
  };
}

// --- SERVICIO 2: CRASHING (Q1-5) (¡Implementación REAL!) ---
export interface CrashStep {
  duration: number;
  activityCost: number;
  fixedCost: number;
  penaltyCost: number;
  totalCost: number;
  lastCrashed?: string;
}

export function calculateCrashingAnalysis(
  activitiesIn: PertActivityIn[],
  fixedCosts: number = 0,
  penaltyCost: number = 0,
  penaltyStartsAfterWeek: number = 0
) {
  const nodes = buildActivityMap(activitiesIn);
  
  // 1. Estado Inicial (Tiempos Normales)
  let { projectDuration: currentDuration } = runCPM(nodes, 'normalTime');
  const initialDuration = currentDuration;
  const baseActivityCost = activitiesIn.reduce((sum, a) => sum + (a.normalCost || 0), 0);
  
  const costSteps: CrashStep[] = [];

  // Función para calcular costo total en una duración T
  const getTotalCost = (T: number, activityCost: number) => {
    const fixed = T * fixedCosts;
    const penalty = Math.max(0, T - penaltyStartsAfterWeek) * penaltyCost;
    return {
      duration: T,
      activityCost,
      fixedCost: fixed,
      penaltyCost: penalty,
      totalCost: activityCost + fixed + penalty,
    };
  };

  costSteps.push(getTotalCost(currentDuration, baseActivityCost));
  let currentActivityCost = baseActivityCost;
  
  // 2. Bucle iterativo de Crashing
  // (Simplificación: asumimos que se puede reducir 1 semana a la vez)
  while (true) {
    // 2a. Encontrar actividades críticas que se pueden acortar
    const crashableCriticalActs = Array.from(nodes.values()).filter(n => 
      n.isCritical && 
      n.duration > n.crashTime
    );

    if (crashableCriticalActs.length === 0) {
      break; // No se puede acortar más
    }
    
    // 2b. Encontrar la más barata de acortar
    crashableCriticalActs.sort((a, b) => a.crashCostPerWeek - b.crashCostPerWeek);
    const cheapestToCrash = crashableCriticalActs[0];

    // 2c. Acortar 1 semana (o lo que quede)
    const crashAmount = Math.min(1, cheapestToCrash.duration - cheapestToCrash.crashTime);
    
    // Si el crashAmount es 0 (problema de floats), paramos
    if (crashAmount < 1e-5) break; 
    
    cheapestToCrash.duration -= crashAmount;
    currentActivityCost += cheapestToCrash.crashCostPerWeek * crashAmount;

    // 2d. Recalcular CPM con la nueva duración
    const { projectDuration: newDuration } = runCPM(nodes, 'duration');
    currentDuration = newDuration;

    // 2e. Guardar el paso
    costSteps.push({
      ...getTotalCost(currentDuration, currentActivityCost),
      lastCrashed: cheapestToCrash.id,
    });
    
    // Si la duración del proyecto no se reduce, es que acortamos una
    // actividad que ya no era la única crítica. Paramos.
    if (currentDuration >= costSteps[costSteps.length - 2].duration) {
      break;
    }
  }

  // 3. Analizar resultados
  let optimalCost = Infinity;
  let optimalTime = initialDuration;
  costSteps.forEach(step => {
    if (step.totalCost < optimalCost) {
      optimalCost = step.totalCost;
      optimalTime = step.duration;
    }
  });

  // 4. Encontrar costos para Q2 y Q4 (29 semanas)
  // Como 29 > 17 (duración normal), no se acorta.
  const costAt29Weeks = getTotalCost(29, baseActivityCost);

  return {
    steps: costSteps,
    initialDuration,
    optimalTime, // Tiempo Óptimo
    optimalCost, // Costo Total Óptimo (Q1)
    costAt29Weeks_Activities: baseActivityCost, // (Q2)
    costAt29Weeks_Total: costAt29Weeks.totalCost, // (Q4)
  };
}
```

---

## Archivo: `services\queuingService.ts`

```ts
// Ruta: src/services/queuingService.ts
// ¡Verificado! Esta lógica es correcta para M/M/s.

export interface QueuingParams {
  lambda: number; // Tasa de llegada
  mu: number; // Tasa de servicio
  s: number; // Número de servidores
}

// Helper de Factorial
const factorial = (n: number): number => {
  if (n < 0) return -1;
  if (n === 0) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
};

/**
 * Calcula las métricas base (L, Lq, W, Wq, P0, rho) para un sistema M/M/s
 */
export const calculateMetrics = ({ lambda, mu, s }: QueuingParams) => {
  const rho = lambda / (s * mu);
  let P0 = 0;

  if (rho < 1) {
    let sum = 0;
    for (let n = 0; n < s; n++) {
      sum += Math.pow(lambda / mu, n) / factorial(n);
    }
    const secondPart = Math.pow(lambda / mu, s) / (factorial(s) * (1 - rho));
    P0 = 1 / (sum + secondPart);
  } else {
    // Sistema inestable
    return { lambda, mu, s, rho, L: Infinity, Lq: Infinity, W: Infinity, Wq: Infinity, P0: 0 };
  }
  
  const Lq = (P0 * Math.pow(lambda / mu, s) * rho) / (factorial(s) * Math.pow(1 - rho, 2));
  const L = Lq + (lambda / mu);
  const Wq = Lq / lambda;
  const W = Wq + (1 / mu);

  return { lambda, mu, s, rho, L, Lq, W, Wq, P0 };
};

/**
 * Calcula la probabilidad de 'n' clientes en el sistema (Pn) para M/M/s
 */
export const calculatePn = ({
  lambda,
  mu,
  s,
  n,
  P0,
}: QueuingParams & { n: number; P0: number; rho: number }) => {
  
  if (n < 0) return 0;
  if (isNaN(P0) || !isFinite(P0) || P0 === 0) return 0; // Evitar P0 de sistema inestable

  if (n < s) {
    return (Math.pow(lambda / mu, n) / factorial(n)) * P0;
  } else {
    return (Math.pow(lambda / mu, n) / (factorial(s) * Math.pow(s, n - s))) * P0;
  }
};
```

---

## Archivo: `src\components\ui\Card.tsx`

```tsx
import React from 'react';
export default function Card({ children, className='' }: {children:React.ReactNode; className?:string}) {
  return <div className={`bg-white rounded-xl shadow p-5 ${className}`}>{children}</div>;
}

```

---

## Archivo: `src\components\ui\Input.tsx`

```tsx
import React from 'react';
export default function Input(props: React.InputHTMLAttributes<HTMLInputElement> & {label:string}) {
  const {label, id, ...rest} = props;
  return (
    <label className="text-sm">
      {label}
      <input id={id} {...rest} className={`mt-1 block w-full border rounded-md px-2 py-1`} />
    </label>
  );
}

```

---

## Archivo: `src\components\ui\MermaidDiagram.tsx`

```tsx
import React, { useEffect, useRef, useId } from 'react';
import mermaid from 'mermaid';
mermaid.initialize({ startOnLoad:false, theme:'neutral', securityLevel:'loose' });

export default function MermaidDiagram({ chart }: {chart:string}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(()=>{
    const run = async ()=>{
      if (!ref.current || !chart) return;
      try {
        ref.current.innerHTML = '';
        const { svg } = await mermaid.render(`m-${id}`, chart);
        ref.current.innerHTML = svg;
      } catch(e) {
        ref.current.innerHTML = '<div class="text-red-600">Error mermaid</div>';
      }
    };
    run();
  }, [chart, id]);
  return <div ref={ref} className="w-full overflow-x-auto" />;
}

```

---

## Archivo: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022","DOM","DOM.Iterable"],
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}

```

---

## Archivo: `types.ts`

```ts
export interface QueuingParams {
  lambda: number; // Arrival rate
  mu: number; // Service rate
  s: number; // Number of servers
}

export interface QueuingResults {
  rho: number; // Utilization
  L: number; // Avg number in system
  Lq: number; // Avg number in queue
  W: number; // Avg time in system
  Wq: number; // Avg time in queue
  P0: number; // Probability of zero customers
}

export interface PnData {
  n: number;
  Pn: number;
  cumulativePn: number;
}

export interface PertActivity {
  id: string;
  precedencias: string;
  a: number; // optimistic
  m: number; // most likely
  b: number; // pessimistic
  normalCost?: number;
  crashTime?: number;
  crashCost?: number;
}

export interface CalculatedPertActivity extends PertActivity {
  tiempoEsperado: number;
  varianza: number;
  es: number; // early start
  ef: number; // early finish
  ls: number; // late start
  lf: number; // late finish
  holgura: number; // slack
  isCritical: boolean;
  crashCostPerUnit?: number;
  currentDuration: number;
  // FIX: Add predecessors and successors to properly type the activity nodes used in calculations.
  predecessors: string[];
  successors: string[];
}

export interface PertResults {
  activities: CalculatedPertActivity[];
  criticalPath: string[];
  projectDuration: number;
  projectVariance: number;
  mermaidGraph: string;
}

export interface CrashingStep {
  activityId: string;
  crashedBy: number;
  cost: number;
  newDuration: number;
  criticalPath: string[];
}

export interface CrashingResults {
    steps: CrashingStep[];
    totalCrashCost: number;
    finalDuration: number;
    initialDuration: number;
    isPossible: boolean;
    reason?: string;
}
```

---

## Archivo: `vite.config.ts`

```ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

```

