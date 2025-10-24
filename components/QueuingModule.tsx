import React, { useState } from 'react';
import type { QueuingParams, QueuingResults, PnData } from '../types';
import { solveMMs, calculatePnDistribution } from '../services/queuingService';
import { getAIAnalysis } from '../services/geminiService';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';

const QueuingModule: React.FC = () => {
    const [params, setParams] = useState<QueuingParams>({ lambda: 5, mu: 3, s: 2 });
    const [results, setResults] = useState<QueuingResults | null>(null);
    const [pnData, setPnData] = useState<PnData[]>([]);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setParams({ ...params, [e.target.name]: parseFloat(e.target.value) });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResults(null);
        setPnData([]);
        setAiAnalysis('');

        try {
            if (params.lambda <= 0 || params.mu <= 0 || params.s <= 0) {
                 throw new Error("Arrival rate (λ), service rate (μ), and number of servers (s) must be positive numbers.");
            }
             if (!Number.isInteger(params.s)) {
                throw new Error("Number of servers (s) must be an integer.");
            }
            if (params.s * params.mu <= params.lambda) {
                throw new Error('For a stable M/M/s system, total service rate (s * μ) must be greater than arrival rate (λ).');
            }
            
            const res = solveMMs(params);
            setResults(res);
            const pn = calculatePnDistribution(res, params);
            setPnData(pn);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAiAnalysis = async () => {
        if (!results) return;
        setIsAiLoading(true);
        setAiAnalysis('');
        const prompt = `
            You are an expert in Operations Management.
            Analyze the following M/M/s queuing system results and provide actionable business insights.
            Explain the key metrics in simple terms and suggest potential improvements.

            System Parameters:
            - Arrival Rate (λ): ${params.lambda} customers/unit of time
            - Service Rate per Server (μ): ${params.mu} customers/unit of time
            - Number of Servers (s): ${params.s}

            Calculated Metrics:
            - Server Utilization (ρ): ${(results.rho * 100).toFixed(2)}%
            - Average number of customers in the system (L): ${results.L.toFixed(3)}
            - Average number of customers in the queue (Lq): ${results.Lq.toFixed(3)}
            - Average time a customer spends in the system (W): ${results.W.toFixed(3)} units of time
            - Average time a customer spends in the queue (Wq): ${results.Wq.toFixed(3)} units of time
            - Probability of the system being empty (P0): ${(results.P0 * 100).toFixed(2)}%

            Based on these results, what is the overall health of this queuing system? What are the main bottlenecks or inefficiencies? 
            Provide specific, practical recommendations for the business to improve customer experience and operational efficiency. 
            For example, should they consider adding/removing servers, improving service speed, or managing arrivals?
        `;
        const analysis = await getAIAnalysis(prompt);
        setAiAnalysis(analysis);
        setIsAiLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-800">M/M/s Model Parameters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Arrival Rate (λ)" type="number" name="lambda" value={params.lambda} onChange={handleChange} step="any" min="0.1" required />
                        <Input label="Service Rate (μ)" type="number" name="mu" value={params.mu} onChange={handleChange} step="any" min="0.1" required />
                        <Input label="Number of Servers (s)" type="number" name="s" value={params.s} onChange={handleChange} step="1" min="1" required />
                    </div>
                    <Button type="submit" isLoading={isLoading} disabled={isLoading}>Calculate</Button>
                </form>
                {error && <p className="mt-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
            </Card>

            {results && (
                <Card>
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">Results</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                        <ResultItem label="Server Utilization (ρ)" value={`${(results.rho * 100).toFixed(2)}%`} />
                        <ResultItem label="Avg. System Customers (L)" value={results.L.toFixed(4)} />
                        <ResultItem label="Avg. Queue Customers (Lq)" value={results.Lq.toFixed(4)} />
                        <ResultItem label="Avg. System Time (W)" value={results.W.toFixed(4)} />
                        <ResultItem label="Avg. Queue Time (Wq)" value={results.Wq.toFixed(4)} />
                        <ResultItem label="P(0) - System Empty" value={`${(results.P0 * 100).toFixed(2)}%`} />
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Probability Distribution P(n)</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">n</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P(n)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative P(n)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {pnData.map(item => (
                                        <tr key={item.n}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.n}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.Pn.toExponential(4)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(item.cumulativePn * 100).toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Button onClick={handleAiAnalysis} isLoading={isAiLoading} disabled={isAiLoading} variant="secondary">
                        Get AI Analysis & Insights
                    </Button>
                </Card>
            )}

            {aiAnalysis && (
                <Card>
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">AI-Powered Analysis</h2>
                     <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br />') }} />
                </Card>
            )}
        </div>
    );
};

const ResultItem = ({ label, value }: { label: string, value: string }) => (
    <div className="bg-slate-50 p-4 rounded-lg">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
);

export default QueuingModule;
