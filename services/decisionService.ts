// services/decisionService.ts

export interface DecisionInput {
  decisions: number[];
  demands: { name: string; value: number; prob: number }[];
  payoffs: { price: number; cost: number; shortage: number };
}

// Interfaz para celdas con fórmulas
export interface FormulaCell {
  value: number;
  formula: string;
}

export interface DecisionOutput {
  payoffMatrix: Record<string, FormulaCell>;
  regretMatrix: Record<string, FormulaCell>;
  vmePerDecision: Record<number, FormulaCell>;
  maxRegretByQ: Record<number, FormulaCell>;
  vmeBest: { decision: number; value: number };
  vebc: FormulaCell;
  minimax: { decision: number; maxRegret: number };
  // Para Q19 y Q20
  payoffRaw: Record<string, number>;
}

const key = (q: number, d: number) => `${q}|${d}`;

/**
 * Genera el objeto de pago y la fórmula de Google Sheets
 * Asumimos:
 * q = $A{row} (ej: $A9)
 * d = B${row} (ej: B$8)
 * p = $B$2
 * c = $B$3
 * s = $B$4
 */
function utilityUnit(
  q: number,
  d: number,
  price: number,
  cost: number,
  shortage: number,
  qCell: string,
  dCell: string,
  pCell = "$B$2",
  cCell = "$B$3",
  sCell = "$B$4"
): FormulaCell {
  const sold = Math.min(q, d);
  const miss = Math.max(0, d - q);
  const value = sold * price - q * cost - miss * shortage;

  const formula = `=MIN(${qCell}, ${dCell})*${pCell} - ${qCell}*${cCell} - MAX(0, ${dCell}-${qCell})*${sCell}`;

  return { value, formula };
}

export function runDecision(input: DecisionInput): DecisionOutput {
  const { decisions, demands, payoffs } = input;
  
  const payoffMatrix: Record<string, FormulaCell> = {};
  const payoffRaw: Record<string, number> = {};

  // Asumimos que las demandas (estados) están en B8, C8, D8
  // y las decisiones (ordenar) en A9, A10, A11
  const demandCells = ["B$8", "C$8", "D$8"]; 
  const decisionCells = ["$A9", "$A10", "$A11"];

  decisions.forEach((q, rIdx) => {
    demands.forEach((dem, cIdx) => {
      const qCell = decisionCells[rIdx] || `$A${9 + rIdx}`;
      const dCell = demandCells[cIdx] || `${String.fromCharCode(66 + cIdx)}$8`;
      
      const cellData = utilityUnit(q, dem.value, payoffs.price, payoffs.cost, payoffs.shortage, qCell, dCell);
      payoffMatrix[key(q, dem.value)] = cellData;
      payoffRaw[key(q, dem.value)] = cellData.value;
    });
  });

  // --- VME (Q16) ---
  const vmePerDecision: Record<number, FormulaCell> = {};
  // Asumimos Probs en B7, C7, D7 y Pagos en B9:D9, B10:D10, etc.
  decisions.forEach((q, rIdx) => {
    const vme = demands.reduce((acc, dem) => acc + payoffRaw[key(q, dem.value)] * dem.prob, 0);
    const payRow = `B${9 + rIdx}:D${9 + rIdx}`;
    const probRow = "$B$7:$D$7";
    const formula = `=SUMPRODUCT(${payRow}, ${probRow})`;
    vmePerDecision[q] = { value: vme, formula };
  });
  
  const vmeBest = Object.entries(vmePerDecision).reduce(
    (best, [q, cell]) => (cell.value > best.value ? { decision: +q, value: cell.value } : best),
    { decision: decisions[0], value: vmePerDecision[decisions[0]].value }
  );

  // --- VEBC (Q17) ---
  const maxByState: Record<number, number> = {};
  demands.forEach((dem) => {
    maxByState[dem.value] = Math.max(...decisions.map(q => payoffRaw[key(q, dem.value)]));
  });
  
  const vebcValue = demands.reduce((acc, dem) => acc + maxByState[dem.value] * dem.prob, 0);
  // Asumimos Max Pagos por estado en B12:D12
  const vebcFormula = `=SUMPRODUCT($B$7:$D$7, B12:D12)`;
  const vebc: FormulaCell = { value: vebcValue, formula: vebcFormula };

  // --- Minimax (Q18) ---
  const regretMatrix: Record<string, FormulaCell> = {};
  const maxRegretByQ: Record<number, FormulaCell> = {};

  demands.forEach((dem, cIdx) => {
    // Asumimos Max Pagos por estado en B12, C12, D12
    const maxPayCell = `${String.fromCharCode(66 + cIdx)}$12`;
    
    decisions.forEach((q, rIdx) => {
      // Asumimos Pagos en B9, B10, B11...
      const payCell = `${String.fromCharCode(66 + cIdx)}${9 + rIdx}`;
      const value = maxByState[dem.value] - payoffRaw[key(q, dem.value)];
      const formula = `=${maxPayCell} - ${payCell}`;
      regretMatrix[key(q, dem.value)] = { value, formula };
    });
  });

  decisions.forEach((q, rIdx) => {
    const regrets = demands.map(d => regretMatrix[key(q, d.value)].value);
    const maxRegret = Math.max(...regrets);
    // Asumimos Matriz de Arrepentimiento en B15:D17
    const regretRow = `B${15 + rIdx}:D${15 + rIdx}`;
    const formula = `=MAX(${regretRow})`;
    maxRegretByQ[q] = { value: maxRegret, formula };
  });

  const minimax = Object.entries(maxRegretByQ).reduce(
    (best, [q, cell]) => (cell.value < best.maxRegret ? { decision: +q, maxRegret: cell.value } : best),
    { decision: decisions[0], maxRegret: maxRegretByQ[decisions[0]].value }
  );

  return { payoffMatrix, payoffRaw, regretMatrix, vmePerDecision, maxRegretByQ, vmeBest, vebc, minimax };
}