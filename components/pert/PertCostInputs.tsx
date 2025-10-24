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