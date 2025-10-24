import React, { useState } from 'react';
import type { QueuingParams, QueuingResults, PnData } from '../types';
import { solveMMs, calculatePnDistribution } from '../services/queuingService';
import { getAIAnalysis } from '../services/geminiService';
import { useLanguage } from '../i18n/LanguageContext';
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
    const { t } = useLanguage();

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
                 throw new Error(t('errorPositiveNumbers'));
            }
             if (!Number.isInteger(params.s)) {
                throw new Error(t('errorIntegerServers'));
            }
            if (params.s * params.mu <= params.lambda) {
                throw new Error(t('errorStableSystemMMS'));
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
        const prompt = t('aiPromptQueuing', {
          lambda: params.lambda,
          mu: params.mu,
          s: params.s,
          rho: (results.rho * 100).toFixed(2),
          L: results.L.toFixed(3),
          Lq: results.Lq.toFixed(3),
          W: results.W.toFixed(3),
          Wq: results.Wq.toFixed(3),
          P0: (results.P0 * 100).toFixed(2),
        });
        const analysis = await getAIAnalysis(prompt);
        setAiAnalysis(analysis);
        setIsAiLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-semibold text-zinc-800">{t('queuingTitle')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label={t('arrivalRateLabel')} type="number" name="lambda" value={params.lambda} onChange={handleChange} step="any" min="0.1" required />
                        <Input label={t('serviceRateLabel')} type="number" name="mu" value={params.mu} onChange={handleChange} step="any" min="0.1" required />
                        <Input label={t('serversLabel')} type="number" name="s" value={params.s} onChange={handleChange} step="1" min="1" required />
                    </div>
                    <Button type="submit" isLoading={isLoading} disabled={isLoading}>{t('calculateButton')}</Button>
                </form>
                {error && <p className="mt-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
            </Card>

            {results && (
                <Card>
                    <h2 className="text-xl font-semibold text-zinc-800 mb-4">{t('resultsTitle')}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                        <ResultItem label={t('serverUtilization')} value={`${(results.rho * 100).toFixed(2)}%`} />
                        <ResultItem label={t('avgSystemCustomers')} value={results.L.toFixed(4)} />
                        <ResultItem label={t('avgQueueCustomers')} value={results.Lq.toFixed(4)} />
                        <ResultItem label={t('avgSystemTime')} value={results.W.toFixed(4)} />
                        <ResultItem label={t('avgQueueTime')} value={results.Wq.toFixed(4)} />
                        <ResultItem label={t('probSystemEmpty')} value={`${(results.P0 * 100).toFixed(2)}%`} />
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-zinc-700 mb-2">{t('probDistributionTitle')}</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-200">
                                <thead className="bg-zinc-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('nColumn')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('pnColumn')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('cumulativePnColumn')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-zinc-200">
                                    {pnData.map(item => (
                                        <tr key={item.n}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900">{item.n}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{item.Pn.toExponential(4)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{(item.cumulativePn * 100).toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Button onClick={handleAiAnalysis} isLoading={isAiLoading} disabled={isAiLoading} variant="secondary">
                        {t('getAiAnalysisButton')}
                    </Button>
                </Card>
            )}

            {aiAnalysis && (
                <Card>
                    <h2 className="text-xl font-semibold text-zinc-800 mb-4">{t('aiAnalysisTitle')}</h2>
                     <div className="prose prose-zinc max-w-none" dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br />') }} />
                </Card>
            )}
        </div>
    );
};

const ResultItem = ({ label, value }: { label: string, value: string }) => (
    <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
);

export default QueuingModule;
