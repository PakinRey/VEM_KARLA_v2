// Ruta: src/services/pertService.ts
// Lógica de CPM, PERT y Crashing - Versión Limpia

// --- INTERFACES ---
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

// Interfaz enriquecida para cálculos internos (usada por componentes hijos)
export interface ActivityNode {
  id: string;
  preds: string[];
  succs: string[];
  normalTime: number;
  crashTime: number;
  te: number; // PERT
  duration: number; // Tiempo actual (para crashing)
  normalCost: number;
  crashCost: number;
  crashCostPerWeek: number;
  maxCrashWeeks: number;
  variance: number; // PERT
  es: number; // CPM
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  isCritical: boolean;
}

// Interfaz para los resultados del análisis PERT
export interface PertAnalysis {
  activities: ActivityNode[];
  criticalPath: string[];
  projectDuration: number; // μ_proy
  projectVariance: number; // σ²_proy
  // mermaidGraph: string; // Se puede quitar si React Flow lo reemplaza totalmente
  probQ6: number;
  probQ7: number;
  probQ8: number;
  probQ9: number;
}

// Interfaz para los pasos del Crashing
export interface CrashStep {
  duration: number;
  activityCost: number;
  fixedCost: number;
  penaltyCost: number;
  totalCost: number;
  lastCrashed?: string;
}

// Interfaz para los resultados del análisis Crashing
export interface CrashingAnalysis {
  steps: CrashStep[];
  initialDuration: number;
  optimalTime: number; // Tiempo Óptimo
  optimalCost: number; // Costo Total Óptimo (Q1)
  costAt29Weeks_Activities: number; // (Q2)
  costAt29Weeks_Total: number; // (Q4)
}


// --- UTILIDADES ---
function parsePreds(p?: string | string[]): string[] {
  if (!p) return [];
  if (Array.isArray(p)) return p.filter(Boolean).map(String);
  return p.split(',').map((x) => x.trim()).filter((x) => x.length > 0 && x !== '-');
}

function teOf(a?: number, m?: number, b?: number, fallback?: number): number {
  if (typeof a === 'number' && typeof m === 'number' && typeof b === 'number' && a <= m && m <= b) {
    return (a + 4 * m + b) / 6;
  }
  // Si los datos PERT no son válidos o no existen, usa el tiempo normal o 0
  return fallback ?? 0;
}

function varOf(a?: number, b?: number): number {
  if (typeof a === 'number' && typeof b === 'number' && b >= a) {
    const sd = (b - a) / 6;
    return sd * sd;
  }
  return 0; // Varianza cero si los datos no son válidos
}

// Función de Distribución Acumulada Normal (CDF)
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

// --- Algoritmo CPM Genérico ---
function runCPM(nodes: Map<string, ActivityNode>, timeField: 'te' | 'normalTime' | 'duration'): { projectDuration: number; criticalPath: string[] } {
  const nodeIds = Array.from(nodes.keys());
  
  // Resetear cálculos previos antes de empezar
  for (const node of nodes.values()) {
      node.es = 0; node.ef = 0; node.ls = Infinity; node.lf = Infinity; node.slack = Infinity; node.isCritical = false;
  }
  
  // Nodos START y END virtuales para manejar múltiples inicios/fines
  const startNode: ActivityNode = { id: 'START', preds: [], succs: [], normalTime: 0, crashTime: 0, te: 0, duration: 0, normalCost: 0, crashCost: 0, crashCostPerWeek: Infinity, maxCrashWeeks: 0, variance: 0, es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false };
  const endNode: ActivityNode = { ...startNode, id: 'END' }; // Copia básica

  // Conectar nodos sin predecesores a START
  for (const node of nodes.values()) {
      if (node.preds.length === 0) {
          startNode.succs.push(node.id);
          node.preds.push('START'); // Asegura la conexión bidireccional
      }
  }
   // Conectar nodos sin sucesores a END
  for (const node of nodes.values()) {
      if (node.succs.length === 0 && node.id !== 'START') { // Evitar conectar START a END si no hay nodos
          endNode.preds.push(node.id);
          node.succs.push('END'); // Asegura la conexión bidireccional
      }
  }

  // Añadir START y END al mapa temporalmente para el cálculo
  nodes.set('START', startNode);
  nodes.set('END', endNode);
  
  // 1. Forward Pass (ES, EF) usando recursión con memoización
  const efCache = new Map<string, number>();
  function getEF(id: string): number {
    if (efCache.has(id)) return efCache.get(id)!;
    
    const node = nodes.get(id)!;
    let es = 0;
    if (id !== 'START') {
        for (const predId of node.preds) {
            es = Math.max(es, getEF(predId));
        }
    }
    
    const duration = node[timeField] ?? 0; // Usar 0 si el campo no existe (START/END)
    const ef = es + duration;
    
    node.es = es;
    node.ef = ef;
    efCache.set(id, ef);
    return ef;
  }
  
  const projectDuration = getEF('END'); // La EF de END es la duración total

  // 2. Backward Pass (LF, LS) usando recursión con memoización
  const lsCache = new Map<string, number>();
  function getLS(id: string): number {
    if (lsCache.has(id)) return lsCache.get(id)!;

    const node = nodes.get(id)!;
    let lf = projectDuration; // Por defecto es la duración del proyecto
    
    if (id !== 'END' && node.succs.length > 0) {
       lf = Infinity;
       for (const succId of node.succs) {
           lf = Math.min(lf, getLS(succId));
       }
    }

    const duration = node[timeField] ?? 0;
    const ls = lf - duration;
    
    node.lf = lf;
    node.ls = ls;
    lsCache.set(id, ls);
    return ls;
  }

  getLS('START'); // Iniciar el backward pass desde START

  // 3. Calculate Slack and Critical Path
  const criticalPath: string[] = [];
  for (const node of nodes.values()) {
    // Ignorar nodos virtuales en el resultado final de la ruta crítica
    if (node.id === 'START' || node.id === 'END') continue; 
    
    // Calcular Slack con tolerancia a errores de punto flotante
    node.slack = node.ls - node.es;
    node.isCritical = Math.abs(node.slack) < 1e-9; // Comparar con un epsilon muy pequeño
    
    // Adicional: verificar si LF - EF también es cercano a cero
    if (!node.isCritical && Math.abs(node.lf - node.ef) < 1e-9) {
        node.isCritical = true;
    }

    if (node.isCritical) {
      criticalPath.push(node.id);
    }
  }
  
  // Eliminar START y END del mapa antes de devolver
  nodes.delete('START');
  nodes.delete('END');

  // Reajustar preds/succs eliminando START/END
   for (const node of nodes.values()) {
       node.preds = node.preds.filter(p => p !== 'START');
       node.succs = node.succs.filter(s => s !== 'END');
   }
  
  return { projectDuration, criticalPath };
}


// --- Función de pre-procesamiento ---
function buildActivityMap(activitiesIn: PertActivityIn[]): Map<string, ActivityNode> {
  const nodes = new Map<string, ActivityNode>();

  for (const a of activitiesIn) {
    // Validaciones básicas de entrada
    const normalTime = Math.max(0, a.normalTime ?? 0);
    const crashTime = Math.max(0, a.crashTime ?? normalTime); // No puede ser menor que 0
    const finalCrashTime = Math.min(normalTime, crashTime); // No puede ser mayor que normalTime
    
    const normalCost = Math.max(0, a.normalCost ?? 0);
    const crashCostInput = Math.max(0, a.crashCost ?? normalCost);
    // CrashCost debe ser al menos NormalCost
    const finalCrashCost = Math.max(normalCost, crashCostInput); 

    const maxCrashWeeks = normalTime - finalCrashTime;
    let crashCostPerWeek = Infinity; // Por defecto, si no se puede acortar
    if (maxCrashWeeks > 1e-9) { // Evitar división por cero con floats
      const costDiff = finalCrashCost - normalCost;
      if (costDiff >= 0) { // El costo debe aumentar o ser igual
          crashCostPerWeek = costDiff / maxCrashWeeks;
      }
    } else if (finalCrashCost > normalCost) {
        // Si no se puede acortar pero el costo crash es mayor, algo está mal
        console.warn(`Activity ${a.id}: Cannot be crashed (T_norm=${normalTime}, T_crash=${finalCrashTime}), but Crash Cost (${finalCrashCost}) > Normal Cost (${normalCost}). Setting crash cost/week to Infinity.`);
        crashCostPerWeek = Infinity;
    } else {
        // Si no se puede acortar y los costos son iguales (o crash < normal, ya corregido), está bien
        crashCostPerWeek = Infinity;
    }


    nodes.set(a.id, {
      id: a.id,
      preds: parsePreds(a.predecessors),
      succs: [], // Se llenará después
      normalTime,
      crashTime: finalCrashTime,
      normalCost,
      crashCost: finalCrashCost,
      maxCrashWeeks,
      crashCostPerWeek: isFinite(crashCostPerWeek) ? crashCostPerWeek : Infinity,
      duration: normalTime, // Duración actual inicia como normal
      te: teOf(a.a, a.m, a.b, normalTime),
      variance: varOf(a.a, a.b),
      // Se inicializan a 0/Infinity pero runCPM los calculará
      es: 0, ef: 0, ls: Infinity, lf: Infinity, slack: Infinity, isCritical: false, 
    });
  }

  // Conectar sucesores (runCPM manejará START/END)
  const allIds = new Set(nodes.keys());
  for (const node of nodes.values()) {
    for (const predId of node.preds) {
      if (nodes.has(predId)) {
        nodes.get(predId)!.succs.push(node.id);
      } else {
        console.warn(`Predecessor '${predId}' for activity '${node.id}' not found in the activity list.`);
      }
    }
     // Validar que los predecesores existan
    node.preds = node.preds.filter(predId => allIds.has(predId));
  }

  return nodes;
}


// --- SERVICIO 1: PERT (Q6-9) ---
export function calculatePertAnalysis(activitiesIn: PertActivityIn[]): PertAnalysis | null {
  if (!activitiesIn || activitiesIn.length === 0) return null;
  
  const nodes = buildActivityMap(activitiesIn);
  // Asegurarse de que el mapa no esté vacío después de buildActivityMap
  if (nodes.size === 0) return null;
  
  // Ejecutar CPM usando el tiempo esperado (Te)
  const { projectDuration, criticalPath } = runCPM(nodes, 'te');

  const projectVariance = criticalPath.reduce((acc, id) => {
      const node = nodes.get(id);
      return acc + (node ? node.variance : 0);
  }, 0);
  
  const sd = Math.max(Math.sqrt(projectVariance), 1e-9); // Evitar división por cero si varianza es 0

  // Cálculos de Probabilidad (Q6-Q9)
  const z = (target: number) => (target - projectDuration) / sd;
  const probQ6 = normCdf(z(49)); // P(T <= 49)
  const probQ8 = 1 - normCdf(z(51)); // P(T >= 51) = 1 - P(T < 51) ~ 1 - P(T <= 51)
  const probQ7 = Math.max(0, normCdf(z(57)) - normCdf(z(54))); // P(54 <= T <= 57)
  const probQ9 = 0.0; // P(T<=49 y T>=55) es imposible

  // Devolver solo los nodos de actividad reales
  const activities = Array.from(nodes.values()); 
  
  return {
    activities,
    criticalPath,
    projectDuration,
    projectVariance,
    // mermaidGraph, // Opcional si se reemplaza por React Flow
    probQ6,
    probQ7,
    probQ8,
    probQ9,
  };
}

// --- SERVICIO 2: CRASHING (Q1-5) ---
export function calculateCrashingAnalysis(
  activitiesIn: PertActivityIn[],
  fixedCosts: number = 0,
  penaltyCost: number = 0,
  penaltyStartsAfterWeek: number = 0
): CrashingAnalysis | null {
  if (!activitiesIn || activitiesIn.length === 0) return null;

  const nodes = buildActivityMap(activitiesIn);
  if (nodes.size === 0) return null;
  
  // Función auxiliar para calcular costo total
  const getTotalCost = (T: number, activityCost: number): Omit<CrashStep, 'lastCrashed'> => {
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

  // 1. Estado Inicial (Tiempos Normales)
  // Establecer duraciones a NormalTime antes del primer CPM
  for (const node of nodes.values()) { node.duration = node.normalTime; }
  let cpmResult = runCPM(nodes, 'duration'); // Usar 'duration' que ahora es 'normalTime'
  let currentDuration = cpmResult.projectDuration;
  const initialDuration = currentDuration;
  const baseActivityCost = Array.from(nodes.values()).reduce((sum, node) => sum + node.normalCost, 0);
  let currentActivityCost = baseActivityCost;
  
  const costSteps: CrashStep[] = [];
  costSteps.push(getTotalCost(currentDuration, currentActivityCost));
  
  // 2. Bucle iterativo de Crashing
  let iteration = 0;
  const MAX_ITERATIONS = nodes.size * 10; // Límite de seguridad generoso

  while (iteration < MAX_ITERATIONS) {
     iteration++;
     
    // Recalcular CPM en cada iteración para asegurar que 'isCritical' esté actualizado
    cpmResult = runCPM(nodes, 'duration');
    currentDuration = cpmResult.projectDuration; // Actualizar duración por si acaso

    // 2a. Encontrar actividades críticas que aún se pueden acortar
    const crashableCriticalActs = Array.from(nodes.values()).filter(n => 
      n.isCritical && 
      n.duration > n.crashTime + 1e-9 // Usar epsilon para comparación float
    );

    if (crashableCriticalActs.length === 0) break; // No se puede acortar más
    
    // 2b. Encontrar la más barata con costo finito
    crashableCriticalActs.sort((a, b) => a.crashCostPerWeek - b.crashCostPerWeek);
    const cheapestToCrash = crashableCriticalActs.find(a => a.crashCostPerWeek !== Infinity);

    if (!cheapestToCrash) break; // No hay ninguna acortable con costo finito

    // 2c. Determinar cuánto se puede acortar (máx 1 semana o lo que quede)
    const possibleCrashAmount = cheapestToCrash.duration - cheapestToCrash.crashTime;
    const crashAmount = Math.min(1, possibleCrashAmount); 
    
    if (crashAmount < 1e-9) break; // Cantidad a acortar es despreciable
    
    // Aplicar el acortamiento y actualizar costo
    cheapestToCrash.duration -= crashAmount;
    currentActivityCost += cheapestToCrash.crashCostPerWeek * crashAmount;

    // 2d. Recalcular CPM con la nueva duración de la actividad acortada
    // Nota: No es necesario recalcular *todo* el CPM aquí si solo una duración cambió,
    // pero por simplicidad y robustez, lo recalculamos. Para optimización,
    // se podría recalcular solo la parte afectada de la red.
    cpmResult = runCPM(nodes, 'duration');
    const newProjectDuration = cpmResult.projectDuration;

    // 2e. Guardar el paso
    costSteps.push({
      ...getTotalCost(newProjectDuration, currentActivityCost),
      lastCrashed: cheapestToCrash.id,
    });
    
    // Condición de parada: Si la duración del proyecto dejó de disminuir
    // OJO: Comparamos con la duración *antes* de esta iteración guardada en el paso anterior
    const previousDuration = costSteps[costSteps.length - 2].duration;
    if (newProjectDuration >= previousDuration - 1e-9) { // Usar epsilon
        // Si no disminuyó, deshacer el último crash y parar
        cheapestToCrash.duration += crashAmount; // Revertir duración
        currentActivityCost -= cheapestToCrash.crashCostPerWeek * crashAmount; // Revertir costo
        costSteps.pop(); // Eliminar el último paso inútil
        break;
    }
    
    // Actualizar currentDuration para la próxima iteración
    currentDuration = newProjectDuration; 
  }

  // 3. Analizar resultados para encontrar el óptimo
  let optimalCost = costSteps[0]?.totalCost ?? Infinity;
  let optimalTime = costSteps[0]?.duration ?? initialDuration;
  costSteps.forEach(step => {
    if (step.totalCost < optimalCost) {
      optimalCost = step.totalCost;
      optimalTime = step.duration;
    }
  });

  // 4. Calcular costos para Q2 y Q4 (asumiendo que T=29 semanas se alcanza *sin* crashing)
  //    Si 29 < Tiempo Mínimo posible, estos costos serían teóricamente infinitos o no alcanzables.
  //    Dado que 29 es > initialDuration (17), usamos los costos base.
  let costAt29Weeks_Activities = baseActivityCost;
  let costAt29Weeks_Total = getTotalCost(29, baseActivityCost).totalCost;
  
  // (Podríamos añadir lógica aquí por si se pidiera un tiempo < initialDuration
  //  para encontrar el costo interpolado en la tabla `costSteps` si fuera necesario)

  return {
    steps: costSteps,
    initialDuration,
    optimalTime, 
    optimalCost, 
    costAt29Weeks_Activities, 
    costAt29Weeks_Total, 
  };
}