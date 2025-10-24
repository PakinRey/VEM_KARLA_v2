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
  return (
    <Card>
      <h2 className={styles.cardHeader}>
        <FaProjectDiagram />
        Caso 1 — PERT / Crashing (Q1–Q9)
      </h2>

      {/* --- SECCIÓN DE INPUTS --- */}
      <PertCostInputs
        fixedCosts={fixedCosts} setFixedCosts={setFixedCosts}
        penaltyCost={penaltyCost} setPenaltyCost={setPenaltyCost}
        penaltyWeek={penaltyWeek} setPenaltyWeek={setPenaltyWeek}
      />
      <PertActivitySheet sheet={sheet} setSheet={setSheet} />

      {/* --- SECCIÓN DE PROCEDIMIENTOS Y RESPUESTAS --- */}
      {(pert && crash) && (
        <>
          {/* --- BLOQUE DE PROCEDIMIENTOS --- */}
          <details className={styles.details} open>
            <summary>1. Procedimiento y Justificación (PERT Q6-Q9)</summary>
            <div className={styles.content}>
              <PertNetworkDiagram pert={pert} />
              <PertAnalysisTable activities={pert.activities} activitiesFromSheet={activitiesFromSheet} />
            </div>
          </details>

          <details className={styles.details} open>
            <summary>2. Procedimiento y Justificación (Crashing Q1-Q5)</summary>
            <div className={styles.content}>
              <CrashingCalculations activities={pert.activities} />
              <CrashingStepsTable crash={crash} fixedCosts={fixedCosts} penaltyCost={penaltyCost} penaltyWeek={penaltyWeek} />
              <CrashingCostGraph crash={crash} />
            </div>
          </details>

          {/* --- BLOQUE DE RESPUESTAS (MEJORADO) --- */}
          <div className="mt-6 p-4 bg-slate-800 text-white rounded-lg">
            <h4 className="font-semibold mb-3 text-lg">Respuestas del Examen (Q1-Q9)</h4>
            
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
          </div>
          {/* --- FIN DE LA MEJORA --- */}
        </>
      )}
      
      {/* Tooltip Global */}
      <Tooltip id="pert-formula-tip" className={styles.tooltip} />
    </Card>
  );
}