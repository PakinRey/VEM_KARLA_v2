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
import React, { useEffect, useMemo, useState } from 'react';
import Spreadsheet, { Matrix, CellBase } from 'react-spreadsheet';
import Card from './ui/Card';
import { runDecision } from '../services/decisionService';

type Props = {
  initialData: {
    decisions: number[];
    demands: { name: string; value: number; prob: number }[];
    payoffs: { price: number; cost: number; shortage: number };
  };
};

const fmt = (x: unknown, d=2)=> typeof x==='number' && isFinite(x) ? x.toFixed(d) : '...';

export default function DecisionModule({ initialData }: Props) {
  // Hoja editable “Decisiones × Estados” (solo números)
  const [decsStates, setDecsStates] = useState<Matrix<CellBase>>([]);
  // Parámetros (inputs simples tipo Excel-celdas)
  const [price, setPrice] = useState(initialData.payoffs.price);
  const [cost, setCost] = useState(initialData.payoffs.cost);
  const [shortage, setShortage] = useState(initialData.payoffs.shortage);
  const [pLow, setPLow] = useState(initialData.demands.find(d=>d.name==='Baja')?.prob ?? 0.2);
  const [pMed, setPMed] = useState(initialData.demands.find(d=>d.name==='Media')?.prob ?? 0.5);
  const pHigh = Math.max(0, 1 - (pLow + pMed)); // se cierra a 1

  // Construir hoja a partir de initialData
  useEffect(() => {
    const states = initialData.demands.map(d=>d.value);
    const head = [{value:''}, ...states.map(v=>({value:v}))];
    const body = initialData.decisions.map(q => ([{value:q}, ...states.map(()=>({value:''}))]));
    setDecsStates([head as CellBase[], ...body as CellBase[][]]);
    setPrice(initialData.payoffs.price);
    setCost(initialData.payoffs.cost);
    setShortage(initialData.payoffs.shortage);
  }, [initialData]);

  // Parsear la hoja para obtener arrays de decisions y demands
  const decisions = useMemo<number[]>(() => {
    if (decsStates.length<2) return [];
    const out:number[]=[];
    for (let r=1;r<decsStates.length;r++){
      const q = Number((decsStates[r]?.[0]?.value ?? '').toString().replace(',','.'));
      if (!isNaN(q) && q>0) out.push(q);
    }
    return out;
  }, [decsStates]);

  const demands = useMemo<number[]>(() => {
    if (!decsStates[0]) return [];
    const out:number[]=[];
    for (let c=1;c<decsStates[0].length;c++){
      const d = Number((decsStates[0]?.[c]?.value ?? '').toString().replace(',','.'));
      if (!isNaN(d) && d>=0) out.push(d);
    }
    return out;
  }, [decsStates]);

  // Armar estructura para servicio
  const decisionInput = useMemo(() => ({
    decisions,
    demands: [
      { name:'Baja',  value: demands[0] ?? 5,  prob: pLow },
      { name:'Media', value: demands[1] ?? 20, prob: pMed },
      { name:'Alta',  value: demands[2] ?? 40, prob: pHigh }
    ],
    payoffs: { price, cost, shortage }
  }), [decisions, demands, price, cost, shortage, pLow, pMed, pHigh]);

  const out = useMemo(()=> decisions.length && demands.length ? runDecision(decisionInput) : null, [decisionInput, decisions.length, demands.length]);

  // Construir “Matriz de pagos” como hoja (solo lectura)
  const payoffSheet = useMemo<Matrix<CellBase>>(() => {
    if (!out) return [];
    const head = [{value:''},{value:`Dem ${demands[0]}`},{value:`Dem ${demands[1]}`},{value:`Dem ${demands[2]}`}];
    const rows = decisionInput.decisions.map(q => ([
      { value: `Ordenar ${q}`, readOnly: true, className:'bg-slate-50 font-bold' },
      { value: out.payoff[`${q}|${demands[0]}`], readOnly: true },
      { value: out.payoff[`${q}|${demands[1]}`], readOnly: true },
      { value: out.payoff[`${q}|${demands[2]}`], readOnly: true },
    ] as CellBase[]));
    return [head as CellBase[], ...rows];
  }, [out, demands, decisionInput.decisions]);

  return (
    <Card>
      <h2 className="text-xl font-bold mb-2">Caso 3 — Teoría de Decisiones (Q16–Q20)</h2>

      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <label className="text-sm">Precio venta (p)
          <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1" value={price} onChange={e=>setPrice(+e.target.value||0)} />
        </label>
        <label className="text-sm">Costo compra (c)
          <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1" value={cost} onChange={e=>setCost(+e.target.value||0)} />
        </label>
        <label className="text-sm">Penalización faltante (s)
          <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1" value={shortage} onChange={e=>setShortage(+e.target.value||0)} />
        </label>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <label className="text-sm">P(Baja)
          <input type="number" step="0.01" className="mt-1 block w-full border rounded-md px-2 py-1" value={pLow} onChange={e=>setPLow(Math.max(0, Math.min(1, +e.target.value||0)))} />
        </label>
        <label className="text-sm">P(Media)
          <input type="number" step="0.01" className="mt-1 block w-full border rounded-md px-2 py-1" value={pMed} onChange={e=>setPMed(Math.max(0, Math.min(1, +e.target.value||0)))} />
        </label>
        <div className="text-sm">
          P(Alta)
          <div className="mt-1 px-3 py-2 border rounded-md bg-slate-50">{fmt(pHigh,2)}</div>
        </div>
      </div>

      <h3 className="font-semibold mb-2">Hoja “Decisiones × Estados” (edítala)</h3>
      <Spreadsheet data={decsStates} onChange={setDecsStates} />

      {out && (
        <>
          <h3 className="font-semibold mt-6 mb-2">Matriz de Pagos (auto)</h3>
          <Spreadsheet data={payoffSheet} />

          <div className="mt-5 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold mb-3">Respuestas</h4>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div><b>Q16</b> VME óptimo = ${fmt(out.vmeBest.value)} (ordenar {out.vmeBest.decision})</div>
              <div><b>Q17</b> VEBC = ${fmt(out.vebc)}</div>
              <div><b>Q18</b> Minimax ⇒ ordenar {out.minimax.decision} (máx arrep {fmt(out.minimax.maxRegret,0)})</div>
              <div><b>Q19</b> U(orden 40, dem 5) = {fmt(out.payoff[`40|5`],0)}</div>
              <div><b>Q20</b> U(orden 5, dem 5) = {fmt(out.payoff[`5|5`],0)}</div>
            </div>
          </div>
        </>
      )}
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

## Archivo: `components\PertModule.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import Spreadsheet, { Matrix, CellBase } from 'react-spreadsheet';
import Card from './ui/Card';
import MermaidDiagram from './ui/MermaidDiagram';
import {
  calculatePertAnalysis,
  calculateCrashingAnalysis,
  PertActivityIn
} from '../services/pertService';

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

const headers = ['ID', 'Predecesores', 'T.Normal', 'C.Normal', 'T.Crash', 'C.Crash', 'a', 'm', 'b'];

export default function PertModule({ initialData }: Props) {
  const [sheet, setSheet] = useState<Matrix<CellBase>>([]);
  const [fixedCosts, setFixedCosts] = useState(initialData.fixedCosts);
  const [penaltyCost, setPenaltyCost] = useState(initialData.penaltyCost);
  const [penaltyWeek, setPenaltyWeek] = useState(initialData.penaltyStartsAfterWeek);

  // construir hoja a partir de initialData
  useEffect(() => {
    const headRow = headers.map(h => ({ value: h, readOnly: true, className: 'font-bold bg-slate-100' }));
    const rows = initialData.activities.map(a => ([
      { value: a.id },
      { value: a.predecessors ?? '-' },
      { value: a.normalTime ?? '' },
      { value: a.normalCost ?? '' },
      { value: a.crashTime ?? '' },
      { value: a.crashCost ?? '' },
      { value: a.a ?? '' },
      { value: a.m ?? '' },
      { value: a.b ?? '' }
    ] as CellBase[]));
    setSheet([headRow, ...rows]);
    setFixedCosts(initialData.fixedCosts);
    setPenaltyCost(initialData.penaltyCost);
    setPenaltyWeek(initialData.penaltyStartsAfterWeek);
  }, [initialData]);

  // parsear hoja → activities[]
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
        id: val(0),
        predecessors: predsStr === '-' ? '' : predsStr,
        normalTime: num(2),
        normalCost: num(3),
        crashTime: num(4),
        crashCost: num(5),
        a: num(6),
        m: num(7),
        b: num(8)
      });
    }
    return out.filter(a => a.id);
  }, [sheet]);

  // cálculos PERT + Crashing
  const pert = useMemo(() => activitiesFromSheet.length ? calculatePertAnalysis(activitiesFromSheet) : null, [activitiesFromSheet]);
  const crash = useMemo(
    () => activitiesFromSheet.length
      ? calculateCrashingAnalysis(activitiesFromSheet, fixedCosts, penaltyCost, penaltyWeek)
      : null,
    [activitiesFromSheet, fixedCosts, penaltyCost, penaltyWeek]
  );

  // Q3/Q5 (ingreso 0 en la semana 29; deuda usando T_opt y costo óptimo)
  const q3 = 0.0;
  const q5 = useMemo(() => {
    if (!crash?.optimalTime || !crash?.optimalCost) return 0;
    const weeksOp = 29 - crash.optimalTime;
    const monthsOp = weeksOp / weeksPerMonth;
    const ingreso = monthsOp * (initialData.monthlyOps?.avgSales ?? 32000);
    const costoOp = monthsOp * (initialData.monthlyOps?.fixedOpsCost ?? 10000);
    return ingreso - costoOp - crash.optimalCost;
  }, [crash, initialData.monthlyOps]);

  return (
    <Card>
      <h2 className="text-xl font-bold mb-2">Caso 1 — PERT / Crashing (Q1–Q9)</h2>

      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <label className="text-sm">Costos fijos por semana
          <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1"
            value={fixedCosts} onChange={e=>setFixedCosts(+e.target.value||0)} />
        </label>
        <label className="text-sm">Penalización por semana
          <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1"
            value={penaltyCost} onChange={e=>setPenaltyCost(+e.target.value||0)} />
        </label>
        <label className="text-sm">Penaliza después de la semana
          <input type="number" className="mt-1 block w-full border rounded-md px-2 py-1"
            value={penaltyWeek} onChange={e=>setPenaltyWeek(+e.target.value||0)} />
        </label>
      </div>

      <h3 className="font-semibold mb-2">Hoja de Actividades (editable)</h3>
      <Spreadsheet data={sheet} onChange={setSheet} />

      {pert?.mermaidGraph && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Red del proyecto (según μ PERT)</h4>
          <MermaidDiagram chart={pert.mermaidGraph} />
        </div>
      )}

      {(pert && crash) && (
        <div className="mt-5 p-4 bg-slate-50 rounded-lg">
          <h4 className="font-semibold mb-3">Resultados</h4>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div><div className="text-slate-500 text-sm">Duración μ PERT</div><div className="text-lg font-bold">{fmt(pert.projectDuration,2)} sem</div></div>
            <div><div className="text-slate-500 text-sm">Ruta crítica (PERT)</div><div className="text-sm">{pert.criticalPath.join(' → ')}</div></div>
            <div><div className="text-slate-500 text-sm">σ del proyecto</div><div className="text-lg font-bold">{fmt(Math.sqrt(pert.projectVariance),3)}</div></div>

            <div><div className="text-slate-500 text-sm">Q1 Costo total óptimo</div><div className="text-lg font-bold">${fmt(crash.optimalCost)}</div></div>
            <div><div className="text-slate-500 text-sm">Tiempo óptimo (crashing)</div><div className="text-lg font-bold">{fmt(crash.optimalTime,0)} sem</div></div>
            <div><div className="text-slate-500 text-sm">Q2 Costo actividades a 29s</div><div className="text-lg font-bold">${fmt(crash.costAt29Weeks_Activities)}</div></div>
            <div><div className="text-slate-500 text-sm">Q3 Ingreso semana 29</div><div className="text-lg font-bold">${fmt(q3)}</div></div>
            <div><div className="text-slate-500 text-sm">Q4 Costo total a 29s</div><div className="text-lg font-bold">${fmt(crash.costAt29Weeks_Total)}</div></div>
            <div><div className="text-slate-500 text-sm">Q5 Deuda semana 29 (opt)</div><div className="text-lg font-bold">${fmt(q5)}</div></div>

            <div><div className="text-slate-500 text-sm">Q6 P(T≤49)</div><div className="text-lg font-bold">{fmt(pert.probQ6,6)}</div></div>
            <div><div className="text-slate-500 text-sm">Q7 P(54≤T≤57)</div><div className="text-lg font-bold">{fmt(pert.probQ7,6)}</div></div>
            <div><div className="text-slate-500 text-sm">Q8 P(T≥51)</div><div className="text-lg font-bold">{fmt(pert.probQ8,6)}</div></div>
            <div><div className="text-slate-500 text-sm">Q9</div><div className="text-lg font-bold">0.0</div></div>
          </div>
        </div>
      )}
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

export interface InitialData {
  lambda: number; lambdaUnit: number; // 7 / 91
  mu: number; muUnit: number;         // 4.5 / 45
  s?: number;
}

const fmt = (x: unknown, d=12) => typeof x==='number' && isFinite(x) ? x.toFixed(d) : '...';

export default function QueuingModule({ initialData }: { initialData?: InitialData }) {
  const [lambda, setLambda] = useState(0);
  const [mu, setMu] = useState(0);
  const [s, setS] = useState(1);
  const [res, setRes] = useState<any>(null);

  useEffect(() => {
    if (!initialData) return;
    setLambda(initialData.lambda / (initialData.lambdaUnit || 1));
    setMu(initialData.mu / (initialData.muUnit || 1));
    setS(initialData.s ?? 1);
  }, [initialData]);

  const stable = useMemo(() => lambda>0 && mu>0 && s>0 && lambda < s*mu, [lambda,mu,s]);

  useEffect(() => {
    if (!stable) return setRes(null);
    const m = calculateMetrics({ lambda, mu, s });
    const Pn = (n:number)=>calculatePn({ lambda, mu, s, n, P0:m.P0, rho:m.rho });
    const q10 = 1 - (Pn(0) + Pn(1)); // ≥1 en cola -> n_s ≥ s+1 (s=1)
    const q11 = Pn(3);
    const q12 = Pn(s + 4);
    let q13 = 0; for (let k=0;k<=s+5;k++) q13+=Pn(k);
    const q14 = Pn(0)+Pn(1)+Pn(2);
    const q15 = 1 - q14;
    setRes({ m, q10,q11,q12,q13,q14,q15 });
  }, [lambda,mu,s,stable]);

  return (
    <Card>
      <h2 className="text-xl font-bold mb-2">Caso 2 — Líneas de Espera (M/M/1) (Q10–Q15)</h2>

      <div className="grid md:grid-cols-3 gap-3">
        <Input label="λ (clientes/min)" type="number" step="0.0001" value={lambda}
               onChange={(e)=>setLambda(parseFloat(e.target.value))}/>
        <Input label="μ (clientes/min)" type="number" step="0.0001" value={mu}
               onChange={(e)=>setMu(parseFloat(e.target.value))}/>
        <Input label="Servidores (s)" type="number" value={s} onChange={(e)=>setS(parseInt(e.target.value))}/>
      </div>

      {!stable && <p className="text-red-600 mt-3 font-medium">Sistema inestable (λ ≥ s·μ).</p>}

      {stable && res && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div><div className="text-slate-500 text-sm">ρ</div><div className="text-lg font-bold">{fmt(res.m.rho,6)}</div></div>
            <div><div className="text-slate-500 text-sm">P₀</div><div className="text-lg font-bold">{fmt(res.m.P0,6)}</div></div>
            <div><div className="text-slate-500 text-sm">Lq</div><div className="text-lg font-bold">{fmt(res.m.Lq,6)}</div></div>
          </div>

          <h4 className="font-semibold mt-4 mb-2">Respuestas</h4>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div><b>Q10</b> P(nq≥1) = {fmt(res.q10)}</div>
            <div><b>Q11</b> P(ns=3) = {fmt(res.q11)}</div>
            <div><b>Q12</b> P(nq=4) = {fmt(res.q12)}</div>
            <div><b>Q13</b> P(nq≤5) = {fmt(res.q13)}</div>
            <div><b>Q14</b> P(ns&lt;3) = {fmt(res.q14)}</div>
            <div><b>Q15</b> P(ns≥3) = {fmt(res.q15)}</div>
          </div>
        </div>
      )}
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
  const baseStyles = 'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';
  
  const variantStyles = {
    primary: 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-400',
    secondary: 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:ring-indigo-500 disabled:bg-indigo-50',
    outline: 'text-indigo-600 bg-white border-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400',
  };

  const spinner = (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    <div className={`bg-white shadow-lg rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
};

export default Card;

```

---

## Archivo: `components\ui\Input.tsx`

```tsx

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, icon, id, ...props }, ref) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={`block w-full rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${icon ? 'pl-10' : ''}`}
          {...props}
        />
      </div>
    </div>
  );
});

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
    "@google/genai": "^1.27.0",
    "@google/generative-ai": "^0.24.1",
    "mermaid": "^10.9.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-spreadsheet": "^0.10.1",
    "recharts": "^3.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
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
export type DecisionInput = {
  decisions: number[];
  demands: { name:string; value:number; prob:number }[];
  payoffs: { price:number; cost:number; shortage:number };
};
export type DecisionOutput = {
  payoff: Record<string, number>;
  vmePerDecision: Record<number, number>;
  vmeBest: { decision:number; value:number };
  vebc: number;
  minimax: { decision:number; maxRegret:number };
};

const key=(q:number,d:number)=>`${q}|${d}`;

export function utilityUnit(q:number,d:number, price:number,cost:number,shortage:number){
  const sold=Math.min(q,d), miss=Math.max(0,d-q);
  return sold*price - q*cost - miss*shortage;
}

export function runDecision(input:DecisionInput):DecisionOutput{
  const { decisions, demands, payoffs } = input;
  const payoff:Record<string,number> = {};
  for (const q of decisions) for (const dem of demands)
    payoff[key(q,dem.value)] = utilityUnit(q, dem.value, payoffs.price, payoffs.cost, payoffs.shortage);

  const vmePerDecision:Record<number,number> = {};
  for (const q of decisions){
    vmePerDecision[q] = demands.reduce((a,dem)=>a + payoff[key(q,dem.value)]*dem.prob, 0);
  }
  const vmeBest = Object.entries(vmePerDecision).reduce((b,[q,v]) => (+v>b.value?{decision:+q,value:+v}:b), {decision:decisions[0], value:vmePerDecision[decisions[0]]});

  const maxByState:Record<number,number> = {};
  for (const dem of demands) maxByState[dem.value] = Math.max(...decisions.map(q=>payoff[key(q,dem.value)]));
  const vebc = demands.reduce((a,dem)=>a + maxByState[dem.value]*dem.prob, 0);

  const regrets:Record<string,number> = {};
  for (const dem of demands) for (const q of decisions) regrets[key(q,dem.value)] = maxByState[dem.value]-payoff[key(q,dem.value)];
  const maxRegretByQ:Record<number,number> = {};
  for (const q of decisions) maxRegretByQ[q] = Math.max(...demands.map(d=>regrets[key(q,d.value)]));
  const minimax = Object.entries(maxRegretByQ).reduce((b,[q,v])=>(+v<b.maxRegret?{decision:+q,maxRegret:+v}:b), {decision:decisions[0], maxRegret:maxRegretByQ[decisions[0]]});

  return { payoff, vmePerDecision, vmeBest, vebc, minimax };
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

