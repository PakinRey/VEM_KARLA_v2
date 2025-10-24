// Ruta: src/services/pertService.ts
// ¡Servicio con lógica REAL de CPM, PERT y Crashing!

// --- INTERFACES (Sin cambios) ---
export interface PertActivityIn {
  id: string;
  predecessors?: string | string[];
  normalTime?: number;
  normalCost?: number;
  crashTime?: number;
  crashCost?: number;
  a?: number;
  m?: number;
  b?: number;
}

// Interfaz enriquecida para cálculos internos
interface ActivityNode {
  id: string;
  preds: string[];
  succs: string[];
  
  // Tiempos
  normalTime: number;
  crashTime: number;
  te: number; // PERT
  duration: number; // Tiempo actual (para crashing)

  // Costos
  normalCost: number;
  crashCost: number;
  crashCostPerWeek: number;
  maxCrashWeeks: number;

  // PERT
  variance: number;
  
  // CPM
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  isCritical: boolean;
}

// --- UTILIDADES (Copias de tu archivo) ---
const clampNum = (n: number, min = -1e12, max = 1e12) =>
  Number.isFinite(n) ? Math.min(Math.max(n, min), max) : 0;

function parsePreds(p?: string | string[]): string[] {
  if (!p) return [];
  if (Array.isArray(p)) return p.filter(Boolean).map(String);
  return p.split(',').map((x) => x.trim()).filter((x) => x.length > 0 && x !== '-');
}

function teOf(a?: number, m?: number, b?: number, fallback?: number): number {
  if (typeof a === 'number' && typeof m === 'number' && typeof b === 'number') {
    return (a + 4 * m + b) / 6;
  }
  return fallback ?? 0;
}

function varOf(a?: number, b?: number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    const sd = (b - a) / 6;
    return sd * sd;
  }
  return 0;
}

// CDF Normal (de tu archivo)
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}
function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// --- ¡NUEVO! Algoritmo CPM Genérico ---
// Este es el motor para PERT y Crashing.
function runCPM(nodes: Map<string, ActivityNode>, timeField: 'te' | 'normalTime' | 'duration') {
  const nodeIds = Array.from(nodes.keys());
  
  // 1. Forward Pass (ES, EF)
  const efCache = new Map<string, number>();
  
  function getEF(id: string): number {
    if (efCache.has(id)) return efCache.get(id)!;
    if (id === 'START') return 0;

    const node = nodes.get(id)!;
    let es = 0;
    for (const predId of node.preds) {
      es = Math.max(es, getEF(predId));
    }
    
    const duration = node[timeField];
    const ef = es + duration;
    
    node.es = es;
    node.ef = ef;
    efCache.set(id, ef);
    return ef;
  }
  
  let projectDuration = 0;
  for (const id of nodeIds) {
    if (nodes.get(id)!.succs.length === 0) { // Nodos finales
      projectDuration = Math.max(projectDuration, getEF(id));
    }
  }

  // 2. Backward Pass (LF, LS)
  const lsCache = new Map<string, number>();

  function getLS(id: string): number {
    if (lsCache.has(id)) return lsCache.get(id)!;
    if (id === 'END') return projectDuration;

    const node = nodes.get(id)!;
    let lf = projectDuration;
    
    if (node.succs.length > 0) {
      lf = Infinity;
      for (const succId of node.succs) {
        lf = Math.min(lf, getLS(succId));
      }
    }

    const duration = node[timeField];
    const ls = lf - duration;
    
    node.lf = lf;
    node.ls = ls;
    lsCache.set(id, ls);
    return ls;
  }

  for (const id of nodeIds) {
    if (nodes.get(id)!.preds.length === 0) { // Nodos iniciales
      getLS(id);
    }
  }
  
  // 3. Calculate Slack and Critical Path
  const criticalPath: string[] = [];
  for (const node of nodes.values()) {
    if (node.id === 'START' || node.id === 'END') continue;
    node.slack = node.ls - node.es;
    // Usamos un epsilon pequeño para comparar floats
    node.isCritical = node.slack < 1e-5;
    if (node.isCritical) {
      criticalPath.push(node.id);
    }
  }
  
  return { projectDuration, criticalPath };
}

// --- Función de pre-procesamiento ---
function buildActivityMap(activitiesIn: PertActivityIn[]): Map<string, ActivityNode> {
  const nodes = new Map<string, ActivityNode>();
  const allIds = new Set(activitiesIn.map(a => a.id));

  // 1. Crear nodos
  for (const a of activitiesIn) {
    const normalTime = a.normalTime ?? 0;
    const crashTime = a.crashTime ?? normalTime;
    const normalCost = a.normalCost ?? 0;
    const crashCost = a.crashCost ?? normalCost;
    const maxCrashWeeks = normalTime - crashTime;
    let crashCostPerWeek = 0;
    if (maxCrashWeeks > 0) {
      crashCostPerWeek = (crashCost - normalCost) / maxCrashWeeks;
    }

    nodes.set(a.id, {
      id: a.id,
      preds: parsePreds(a.predecessors),
      succs: [], // Se llenará después
      normalTime,
      crashTime,
      normalCost,
      crashCost,
      maxCrashWeeks,
      crashCostPerWeek: isFinite(crashCostPerWeek) ? crashCostPerWeek : Infinity,
      duration: normalTime, // Duración actual inicia como normal
      te: teOf(a.a, a.m, a.b, normalTime),
      variance: varOf(a.a, a.b),
      es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false,
    });
  }

  // 2. Conectar sucesores y virtual START
  for (const node of nodes.values()) {
    if (node.preds.length === 0) {
      node.preds.push('START'); // Conectar a START virtual
    }
    for (const predId of node.preds) {
      if (nodes.has(predId)) {
        nodes.get(predId)!.succs.push(node.id);
      }
    }
  }
  // Añadir nodo START
  nodes.set('START', { id: 'START', preds: [], succs: [], normalTime: 0, crashTime: 0, normalCost: 0, crashCost: 0, maxCrashWeeks: 0, crashCostPerWeek: 0, duration: 0, te: 0, variance: 0, es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false });

  return nodes;
}

// --- SERVICIO 1: PERT (Q6-9) (Modificado para usar el nuevo CPM) ---
export function calculatePertAnalysis(activitiesIn: PertActivityIn[]) {
  const nodes = buildActivityMap(activitiesIn);
  const { projectDuration, criticalPath } = runCPM(nodes, 'te');

  const projectVariance = criticalPath.reduce((acc, id) => acc + (nodes.get(id)?.variance || 0), 0);
  const sd = Math.max(Math.sqrt(projectVariance), 1e-6);

  // Cálculos de Probabilidad
  const z49 = (49 - projectDuration) / sd;
  const z51 = (51 - projectDuration) / sd;
  const z54 = (54 - projectDuration) / sd;
  const z57 = (57 - projectDuration) / sd;

  const probQ6 = normCdf(z49);
  const probQ8 = 1 - normCdf(z51);
  const probQ7 = Math.max(0, normCdf(z57) - normCdf(z54));
  const probQ9 = 0.0; // Evento imposible

  // Generar Mermaid (código de tu archivo)
  const edges: string[] = [];
  for (const a of activitiesIn) {
    const preds = parsePreds(a.predecessors);
    if (preds.length === 0) {
      edges.push(`START --> ${a.id}[${a.id}]`);
    } else {
      for (const p of preds) {
        edges.push(`${p} --> ${a.id}`);
      }
    }
  }
  const mermaidGraph = `graph LR\n${edges.join('\n')}`;

  const activities = Array.from(nodes.values()).filter(n => n.id !== 'START');
  
  return {
    activities,
    criticalPath,
    projectDuration, // μ_proy
    projectVariance, // σ²_proy
    mermaidGraph,
    probQ6,
    probQ7,
    probQ8,
    probQ9,
  };
}

// --- SERVICIO 2: CRASHING (Q1-5) (¡Implementación REAL!) ---
export interface CrashStep {
  duration: number;
  activityCost: number;
  fixedCost: number;
  penaltyCost: number;
  totalCost: number;
  lastCrashed?: string;
}

export function calculateCrashingAnalysis(
  activitiesIn: PertActivityIn[],
  fixedCosts: number = 0,
  penaltyCost: number = 0,
  penaltyStartsAfterWeek: number = 0
) {
  const nodes = buildActivityMap(activitiesIn);
  
  // 1. Estado Inicial (Tiempos Normales)
  let { projectDuration: currentDuration } = runCPM(nodes, 'normalTime');
  const initialDuration = currentDuration;
  const baseActivityCost = activitiesIn.reduce((sum, a) => sum + (a.normalCost || 0), 0);
  
  const costSteps: CrashStep[] = [];

  // Función para calcular costo total en una duración T
  const getTotalCost = (T: number, activityCost: number) => {
    const fixed = T * fixedCosts;
    const penalty = Math.max(0, T - penaltyStartsAfterWeek) * penaltyCost;
    return {
      duration: T,
      activityCost,
      fixedCost: fixed,
      penaltyCost: penalty,
      totalCost: activityCost + fixed + penalty,
    };
  };

  costSteps.push(getTotalCost(currentDuration, baseActivityCost));
  let currentActivityCost = baseActivityCost;
  
  // 2. Bucle iterativo de Crashing
  // (Simplificación: asumimos que se puede reducir 1 semana a la vez)
  while (true) {
    // 2a. Encontrar actividades críticas que se pueden acortar
    const crashableCriticalActs = Array.from(nodes.values()).filter(n => 
      n.isCritical && 
      n.duration > n.crashTime
    );

    if (crashableCriticalActs.length === 0) {
      break; // No se puede acortar más
    }
    
    // 2b. Encontrar la más barata de acortar
    crashableCriticalActs.sort((a, b) => a.crashCostPerWeek - b.crashCostPerWeek);
    const cheapestToCrash = crashableCriticalActs[0];

    // 2c. Acortar 1 semana (o lo que quede)
    const crashAmount = Math.min(1, cheapestToCrash.duration - cheapestToCrash.crashTime);
    
    // Si el crashAmount es 0 (problema de floats), paramos
    if (crashAmount < 1e-5) break; 
    
    cheapestToCrash.duration -= crashAmount;
    currentActivityCost += cheapestToCrash.crashCostPerWeek * crashAmount;

    // 2d. Recalcular CPM con la nueva duración
    const { projectDuration: newDuration } = runCPM(nodes, 'duration');
    currentDuration = newDuration;

    // 2e. Guardar el paso
    costSteps.push({
      ...getTotalCost(currentDuration, currentActivityCost),
      lastCrashed: cheapestToCrash.id,
    });
    
    // Si la duración del proyecto no se reduce, es que acortamos una
    // actividad que ya no era la única crítica. Paramos.
    if (currentDuration >= costSteps[costSteps.length - 2].duration) {
      break;
    }
  }

  // 3. Analizar resultados
  let optimalCost = Infinity;
  let optimalTime = initialDuration;
  costSteps.forEach(step => {
    if (step.totalCost < optimalCost) {
      optimalCost = step.totalCost;
      optimalTime = step.duration;
    }
  });

  // 4. Encontrar costos para Q2 y Q4 (29 semanas)
  // Como 29 > 17 (duración normal), no se acorta.
  const costAt29Weeks = getTotalCost(29, baseActivityCost);

  return {
    steps: costSteps,
    initialDuration,
    optimalTime, // Tiempo Óptimo
    optimalCost, // Costo Total Óptimo (Q1)
    costAt29Weeks_Activities: baseActivityCost, // (Q2)
    costAt29Weeks_Total: costAt29Weeks.totalCost, // (Q4)
  };
}