
import type { QueuingParams, QueuingResults, PnData } from '../types';

const factorial = (n: number): number => {
  if (n < 0) return NaN;
  if (n === 0) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
};

export const solveMM1 = (params: Omit<QueuingParams, 's'>): QueuingResults => {
  const { lambda, mu } = params;
  if (mu <= lambda) {
    throw new Error('Service rate (μ) must be greater than arrival rate (λ) for a stable M/M/1 system.');
  }

  const rho = lambda / mu;
  const L = lambda / (mu - lambda);
  const Lq = (lambda * lambda) / (mu * (mu - lambda)); // or L * rho
  const W = 1 / (mu - lambda); // or L / lambda
  const Wq = lambda / (mu * (mu - lambda)); // or Lq / lambda
  const P0 = 1 - rho;

  return { rho, L, Lq, W, Wq, P0 };
};

export const solveMMs = (params: QueuingParams): QueuingResults => {
  const { lambda, mu, s } = params;
  if (s * mu <= lambda) {
    throw new Error('Total service rate (s * μ) must be greater than arrival rate (λ) for a stable M/M/s system.');
  }

  const rho = lambda / (s * mu);
  const r = lambda / mu;

  let sumTerm = 0;
  for (let n = 0; n < s; n++) {
    sumTerm += Math.pow(r, n) / factorial(n);
  }

  const lastTerm = Math.pow(r, s) / (factorial(s) * (1 - rho));
  const P0 = 1 / (sumTerm + lastTerm);
  
  const Lq = (P0 * Math.pow(r, s) * rho) / (factorial(s) * Math.pow(1 - rho, 2));
  const L = Lq + r;
  const Wq = Lq / lambda;
  const W = Wq + (1 / mu);

  return { rho, L, Lq, W, Wq, P0 };
};

export const calculatePnDistribution = (results: QueuingResults, params: QueuingParams, maxN: number = 15): PnData[] => {
    const { lambda, mu, s } = params;
    const { P0 } = results;
    const r = lambda / mu;
    const data: PnData[] = [];
    let cumulativePn = 0;

    for (let n = 0; n <= maxN; n++) {
        let Pn = 0;
        if (n >= 0 && n < s) {
            Pn = (Math.pow(r, n) / factorial(n)) * P0;
        } else if (n >= s) {
            Pn = (Math.pow(r, n) / (factorial(s) * Math.pow(s, n - s))) * P0;
        }
        
        if (Pn < 0 || !isFinite(Pn)) Pn = 0; // Guard against invalid values
        
        cumulativePn += Pn;
        data.push({ n, Pn, cumulativePn: Math.min(cumulativePn, 1) });
    }

    return data;
};
