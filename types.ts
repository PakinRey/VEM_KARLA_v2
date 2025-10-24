export interface QueuingParams {
  lambda: number; // Arrival rate
  mu: number; // Service rate
  s: number; // Number of servers
}

export interface QueuingResults {
  rho: number; // Utilization
  L: number; // Avg number in system
  Lq: number; // Avg number in queue
  W: number; // Avg time in system
  Wq: number; // Avg time in queue
  P0: number; // Probability of zero customers
}

export interface PnData {
  n: number;
  Pn: number;
  cumulativePn: number;
}

export interface PertActivity {
  id: string;
  precedencias: string;
  a: number; // optimistic
  m: number; // most likely
  b: number; // pessimistic
  normalCost?: number;
  crashTime?: number;
  crashCost?: number;
}

export interface CalculatedPertActivity extends PertActivity {
  tiempoEsperado: number;
  varianza: number;
  es: number; // early start
  ef: number; // early finish
  ls: number; // late start
  lf: number; // late finish
  holgura: number; // slack
  isCritical: boolean;
  crashCostPerUnit?: number;
  currentDuration: number;
  // FIX: Add predecessors and successors to properly type the activity nodes used in calculations.
  predecessors: string[];
  successors: string[];
}

export interface PertResults {
  activities: CalculatedPertActivity[];
  criticalPath: string[];
  projectDuration: number;
  projectVariance: number;
  mermaidGraph: string;
}

export interface CrashingStep {
  activityId: string;
  crashedBy: number;
  cost: number;
  newDuration: number;
  criticalPath: string[];
}

export interface CrashingResults {
    steps: CrashingStep[];
    totalCrashCost: number;
    finalDuration: number;
    initialDuration: number;
    isPossible: boolean;
    reason?: string;
}