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
    <div className={styles.resultsGrid}>
      <div className={styles.resultBox}>
        <div><span><b>Q1</b> Costo total óptimo</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content="El punto más bajo en la curva de 'Costo Total' del gráfico." className={styles.formulaIcon} /></div>
        <div>{fmtCost(crash.optimalCost)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q2</b> Costo actividades (29s)</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content="Como 29s > T.Normal (17s), no se comprime nada. El costo es el base." className={styles.formulaIcon} /></div>
        <div>{fmtCost(crash.costAt29Weeks_Activities)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q4</b> Costo total (29s)</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content={q4_formula} className={styles.formulaIcon} /></div>
        <div>{fmtCost(crash.costAt29Weeks_Total)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q5</b> Deuda sem 29 (T. opt)</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content={q5_formula} className={styles.formulaIcon} /></div>
        <div>{fmtCost(q5)}</div>
      </div>
      <div className={styles.resultBox}>
        <div><span><b>Q3</b> Ingreso sem 29</span> <Info data-tooltip-id="pert-formula-tip" data-tooltip-content="Si el proyecto dura 29 semanas, abre en la semana 29. No hay ingresos *en* la semana 29." className={styles.formulaIcon} /></div>
        <div>{fmtCost(q3)}</div>
      </div>
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
    </div>
  );
}