// Ruta: src/services/queuingService.ts
// ¡Verificado! Esta lógica es correcta para M/M/s.

export interface QueuingParams {
  lambda: number; // Tasa de llegada
  mu: number; // Tasa de servicio
  s: number; // Número de servidores
}

// Helper de Factorial
const factorial = (n: number): number => {
  if (n < 0) return -1;
  if (n === 0) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
};

/**
 * Calcula las métricas base (L, Lq, W, Wq, P0, rho) para un sistema M/M/s
 */
export const calculateMetrics = ({ lambda, mu, s }: QueuingParams) => {
  const rho = lambda / (s * mu);
  let P0 = 0;

  if (rho < 1) {
    let sum = 0;
    for (let n = 0; n < s; n++) {
      sum += Math.pow(lambda / mu, n) / factorial(n);
    }
    const secondPart = Math.pow(lambda / mu, s) / (factorial(s) * (1 - rho));
    P0 = 1 / (sum + secondPart);
  } else {
    // Sistema inestable
    return { lambda, mu, s, rho, L: Infinity, Lq: Infinity, W: Infinity, Wq: Infinity, P0: 0 };
  }
  
  const Lq = (P0 * Math.pow(lambda / mu, s) * rho) / (factorial(s) * Math.pow(1 - rho, 2));
  const L = Lq + (lambda / mu);
  const Wq = Lq / lambda;
  const W = Wq + (1 / mu);

  return { lambda, mu, s, rho, L, Lq, W, Wq, P0 };
};

/**
 * Calcula la probabilidad de 'n' clientes en el sistema (Pn) para M/M/s
 */
export const calculatePn = ({
  lambda,
  mu,
  s,
  n,
  P0,
}: QueuingParams & { n: number; P0: number; rho: number }) => {
  
  if (n < 0) return 0;
  if (isNaN(P0) || !isFinite(P0) || P0 === 0) return 0; // Evitar P0 de sistema inestable

  if (n < s) {
    return (Math.pow(lambda / mu, n) / factorial(n)) * P0;
  } else {
    return (Math.pow(lambda / mu, n) / (factorial(s) * Math.pow(s, n - s))) * P0;
  }
};