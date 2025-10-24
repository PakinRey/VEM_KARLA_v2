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