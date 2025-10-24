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