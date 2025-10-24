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