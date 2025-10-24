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