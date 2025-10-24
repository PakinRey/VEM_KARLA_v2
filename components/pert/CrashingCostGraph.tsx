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