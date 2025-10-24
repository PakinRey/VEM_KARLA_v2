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