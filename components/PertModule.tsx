import React, { useState, useCallback, useMemo } from 'react';
import { PertActivity, PertResults, CalculatedPertActivity, CrashingResults, CrashingStep } from '../types';
import { getAIAnalysis } from '../services/geminiService';
import { useLanguage } from '../i18n/LanguageContext';
import Card from './ui/Card';
import Button from './ui/Button';
import MermaidDiagram from './ui/MermaidDiagram';
import Input from './ui/Input';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const sampleActivities: PertActivity[] = [
    { id: 'A', precedencias: '', a: 1, m: 2, b: 3, normalCost: 100, crashTime: 1, crashCost: 200 },
    { id: 'B', precedencias: 'A', a: 2, m: 3, b: 10, normalCost: 200, crashTime: 2, crashCost: 350 },
    { id: 'C', precedencias: 'A', a: 2, m: 4, b: 6, normalCost: 150, crashTime: 3, crashCost: 200 },
    { id: 'D', precedencias: 'B', a: 4, m: 5, b: 6, normalCost: 250, crashTime: 4, crashCost: 300 },
    { id: 'E', precedencias: 'C', a: 2, m: 4, b: 6, normalCost: 180, crashTime: 3, crashCost: 280 },
    { id: 'F', precedencias: 'D,E', a: 1, m: 2, b: 3, normalCost: 120, crashTime: 1, crashCost: 180 },
];

const runPertCalculation = (
    activities: PertActivity[],
    durationOverride?: Map<string, number>
): PertResults => {
        const activityIds = new Set(activities.map(act => act.id));
        if (activityIds.size !== activities.length) throw new Error("Activity IDs must be unique.");
        
        const activityMap: Map<string, CalculatedPertActivity> = new Map();
        const inDegree: Map<string, number> = new Map();

        activities.forEach(act => {
            const tiempoEsperado = (act.a + 4 * act.m + act.b) / 6;
            const currentDuration = durationOverride?.get(act.id) ?? tiempoEsperado;
            activityMap.set(act.id, {
                ...act,
                tiempoEsperado,
                varianza: Math.pow((act.b - act.a) / 6, 2),
                es: 0, ef: 0, ls: 0, lf: 0, holgura: 0, isCritical: false,
                currentDuration,
                predecessors: act.precedencias.split(',').filter(p => p.trim() !== ''),
                successors: [],
            });
            inDegree.set(act.id, 0);
        });
        
        activityMap.forEach(node => {
            node.predecessors.forEach(pId => {
                activityMap.get(pId)?.successors.push(node.id);
                inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
            });
        });

        // Forward Pass
        const queue: CalculatedPertActivity[] = [];
        inDegree.forEach((degree, id) => {
            if (degree === 0) queue.push(activityMap.get(id)!);
        });
        
        const topologicalOrder: CalculatedPertActivity[] = [];
        while(queue.length > 0) {
            const currentNode = queue.shift()!;
            topologicalOrder.push(currentNode);
            currentNode.ef = currentNode.es + currentNode.currentDuration;
            currentNode.successors.forEach(sId => {
                const successorNode = activityMap.get(sId)!;
                successorNode.es = Math.max(successorNode.es, currentNode.ef);
                const newDegree = (inDegree.get(sId) || 1) - 1;
                inDegree.set(sId, newDegree);
                if (newDegree === 0) queue.push(successorNode);
            });
        }
        if (topologicalOrder.length !== activities.length) throw new Error("Circular dependency detected.");

        const projectDuration = Math.max(0, ...topologicalOrder.map(n => n.ef));

        // Backward Pass
        [...topologicalOrder].reverse().forEach(node => {
            node.lf = node.successors.length === 0 ? projectDuration : Math.min(...node.successors.map(sId => activityMap.get(sId)!.ls));
            node.ls = node.lf - node.currentDuration;
        });

        // Slack and Critical Path
        let projectVariance = 0;
        activityMap.forEach(node => {
            node.holgura = node.lf - node.ef;
            if (Math.abs(node.holgura) < 1e-6) {
                node.isCritical = true;
                projectVariance += node.varianza;
            }
        });

        const criticalPath = topologicalOrder.filter(n => n.isCritical).map(n => n.id);
        
        // Generate Mermaid Graph
        let mermaidGraph = 'graph TD\n';
        activityMap.forEach((node) => {
            mermaidGraph += `    ${node.id}["<b>${node.id}</b><br>T=${node.currentDuration.toFixed(2)}"]\n`;
            node.successors.forEach((sId) => mermaidGraph += `    ${node.id} --> ${sId}\n`);
        });
        mermaidGraph += `classDef critical fill:#fecaca,stroke:#b91c1c,stroke-width:2px\n`;
        if (criticalPath.length > 0) {
           mermaidGraph += `class ${criticalPath.join(',')} critical\n`;
        }

        return {
            activities: Array.from(activityMap.values()).sort((a, b) => a.id.localeCompare(b.id)),
            criticalPath,
            projectDuration,
            projectVariance,
            mermaidGraph,
        };
}

const PertModule: React.FC = () => {
    const { t } = useLanguage();
    const [activities, setActivities] = useState<PertActivity[]>(sampleActivities);
    const [results, setResults] = useState<PertResults | null>(null);
    const [crashingResults, setCrashingResults] = useState<CrashingResults | null>(null);
    const [targetDuration, setTargetDuration] = useState<number>(0);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'analysis' | 'crashing'>('analysis');

    const handleActivityChange = (index: number, field: keyof PertActivity, value: string) => {
        const newActivities = [...activities];
        const activity = { ...newActivities[index] };

        if (field === 'id' || field === 'precedencias') {
            activity[field] = value.toUpperCase().replace(/\s/g, '');
        } else {
            const numValue = parseFloat(value);
            activity[field] = isNaN(numValue) ? 0 : numValue;
        }

        newActivities[index] = activity;
        setActivities(newActivities);
    };

    const addActivity = () => {
        const newId = String.fromCharCode(65 + activities.length);
        setActivities([...activities, { id: newId, precedencias: '', a: 0, m: 0, b: 0, normalCost: 0, crashTime: 0, crashCost: 0 }]);
    };

    const removeActivity = (index: number) => {
        setActivities(activities.filter((_, i) => i !== index));
    };
    
    const validateInputs = (activityList: PertActivity[]) => {
        for (const act of activityList) {
            if (!act.id) throw new Error(t('errorEmptyId'));
            if (act.a < 0 || act.m < 0 || act.b < 0) throw new Error(t('errorNegativeDurations', { id: act.id }));
            if (act.a > act.m || act.m > act.b) throw new Error(t('errorActivityTimesOrder', { id: act.id }));
            
            const normalTime = (act.a + 4 * act.m + act.b) / 6;
            if (act.crashTime && act.crashTime > normalTime) throw new Error(t('errorCrashTimeGreater', { id: act.id }));
            if (act.crashCost && act.normalCost && act.crashCost < act.normalCost) throw new Error(t('errorCrashCostLower', { id: act.id }));
            if (act.crashTime && act.crashTime === normalTime && act.crashCost && act.normalCost && act.crashCost > act.normalCost) throw new Error(t('errorNoCrashButCost', { id: act.id }));
        }
        const activityIds = new Set(activityList.map(act => act.id));
        for (const act of activityList) {
            act.precedencias.split(',').filter(p => p).forEach(p => {
                if (!activityIds.has(p)) throw new Error(t('errorPredecessorNotFound', { p, id: act.id }));
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResults(null);
        setAiAnalysis('');
        setCrashingResults(null);
        setActiveTab('analysis');

        try {
            validateInputs(activities);
            const pertResults = runPertCalculation(activities);
            setResults(pertResults);
            setTargetDuration(pertResults.projectDuration);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCrashingSubmit = () => {
        if (!results) return;

        setIsLoading(true);
        setError('');

        try {
            const initialDuration = results.projectDuration;
            if (targetDuration >= initialDuration) {
                throw new Error(t('errorTargetDurationGreater'));
            }
            if (targetDuration <= 0) {
                 throw new Error(t('errorTargetDurationPositive'));
            }

            const crashingSteps: CrashingStep[] = [];
            let totalCrashCost = 0;
            
            const durationMap = new Map<string, number>(results.activities.map(a => [a.id, a.currentDuration]));
            let currentPertResults = results;

            while (currentPertResults.projectDuration > targetDuration) {
                const criticalActivities = currentPertResults.activities.filter(a => a.isCritical);
                
                let bestActivityToCrash: CalculatedPertActivity | null = null;
                let minCostPerUnit = Infinity;

                for (const activity of criticalActivities) {
                    const normalTime = activity.tiempoEsperado;
                    const canBeCrashed = activity.crashTime !== undefined && durationMap.get(activity.id)! > activity.crashTime;
                    
                    if (canBeCrashed) {
                        const costDiff = (activity.crashCost || 0) - (activity.normalCost || 0);
                        const timeDiff = normalTime - (activity.crashTime || normalTime);
                        if (timeDiff > 0) {
                            const costPerUnit = costDiff / timeDiff;
                            if (costPerUnit < minCostPerUnit) {
                                minCostPerUnit = costPerUnit;
                                bestActivityToCrash = activity;
                            }
                        }
                    }
                }
                
                if (!bestActivityToCrash) {
                    setCrashingResults({ steps: crashingSteps, totalCrashCost, finalDuration: currentPertResults.projectDuration, initialDuration, isPossible: false, reason: t('errorCannotShortenFurther') });
                    setIsLoading(false);
                    return;
                }
                
                const crashAmount = 1;
                const currentDuration = durationMap.get(bestActivityToCrash.id)!;
                durationMap.set(bestActivityToCrash.id, currentDuration - crashAmount);
                totalCrashCost += minCostPerUnit * crashAmount;

                crashingSteps.push({
                    activityId: bestActivityToCrash.id,
                    crashedBy: crashAmount,
                    cost: minCostPerUnit * crashAmount,
                    newDuration: currentPertResults.projectDuration - 1,
                    criticalPath: currentPertResults.criticalPath,
                });
                
                currentPertResults = runPertCalculation(activities, durationMap);
                crashingSteps[crashingSteps.length-1].newDuration = currentPertResults.projectDuration;
            }

            setCrashingResults({
                steps: crashingSteps,
                totalCrashCost,
                finalDuration: currentPertResults.projectDuration,
                initialDuration,
                isPossible: true,
            });

        } catch(err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAiAnalysis = async () => {
        if (!results) return;
        setIsAiLoading(true);
        setAiAnalysis('');

        const activitiesSummary = results.activities.map(a => 
            `- Activity ${a.id}: Te=${a.tiempoEsperado.toFixed(2)}, Var=${a.varianza.toFixed(2)}, Slack=${a.holgura.toFixed(2)} ${a.isCritical ? '(CRITICAL)' : ''}`
        ).join('\n');

        const prompt = t('aiPromptPert', {
            criticalPath: results.criticalPath.join(' -> '),
            projectDuration: results.projectDuration.toFixed(2),
            stdDev: Math.sqrt(results.projectVariance).toFixed(2),
            activitiesSummary: activitiesSummary
        });

        const analysis = await getAIAnalysis(prompt);
        setAiAnalysis(analysis);
        setIsAiLoading(false);
    };
    
    const crashCostChartData = useMemo(() => {
        if (!results) return null;
        const crashableActivities = results.activities.map(activity => {
            const timeDiff = activity.tiempoEsperado - (activity.crashTime ?? activity.tiempoEsperado);
            if (timeDiff > 0) {
                const costDiff = (activity.crashCost ?? 0) - (activity.normalCost ?? 0);
                return { id: activity.id, costPerUnit: costDiff / timeDiff };
            }
            return null;
        }).filter((item): item is { id: string; costPerUnit: number } => item !== null && item.costPerUnit >= 0);

        if (crashableActivities.length === 0) return null;
        crashableActivities.sort((a, b) => a.costPerUnit - b.costPerUnit);

        return {
            labels: crashableActivities.map(a => a.id),
            datasets: [{
                label: t('crashChartTitle'),
                data: crashableActivities.map(a => a.costPerUnit),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
            }],
        };
    }, [results, t]);

    const TABS = {
        analysis: t('analysisTab'),
        crashing: t('crashingTab')
    };

    return (
        <div className="space-y-6">
            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-between items-center">
                         <h2 className="text-xl font-semibold text-zinc-800">{t('pertTitle')}</h2>
                         <Button type="button" variant="secondary" onClick={addActivity}>
                            <span className="font-bold mr-2">+</span>{t('addActivityButton')}
                         </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                            <thead className="bg-zinc-50">
                                <tr>
                                    {[t('idHeader'), t('predecessorsHeader'), t('optimisticHeader'), t('mostLikelyHeader'), t('pessimisticHeader'), t('normalCostHeader'), t('crashTimeHeader'), t('crashCostHeader'), ''].map(h => 
                                        <th key={h} className="px-2 py-2 text-left text-xs font-medium text-zinc-500 uppercase">{h}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-zinc-200">
                                {activities.map((act, index) => (
                                    <tr key={index}>
                                        <td className="p-1"><input value={act.id} onChange={e => handleActivityChange(index, 'id', e.target.value)} className="w-16 border-zinc-300 rounded-md shadow-sm p-2"/></td>
                                        <td className="p-1"><input value={act.precedencias} onChange={e => handleActivityChange(index, 'precedencias', e.target.value)} className="w-24 border-zinc-300 rounded-md shadow-sm p-2" placeholder={t('predecessorsPlaceholder')}/></td>
                                        <td className="p-1"><input type="number" value={act.a} onChange={e => handleActivityChange(index, 'a', e.target.value)} className="w-24 border-zinc-300 rounded-md shadow-sm p-2" min="0" step="any"/></td>
                                        <td className="p-1"><input type="number" value={act.m} onChange={e => handleActivityChange(index, 'm', e.target.value)} className="w-24 border-zinc-300 rounded-md shadow-sm p-2" min="0" step="any"/></td>
                                        <td className="p-1"><input type="number" value={act.b} onChange={e => handleActivityChange(index, 'b', e.target.value)} className="w-24 border-zinc-300 rounded-md shadow-sm p-2" min="0" step="any"/></td>
                                        <td className="p-1"><input type="number" value={act.normalCost} onChange={e => handleActivityChange(index, 'normalCost', e.target.value)} className="w-24 border-zinc-300 rounded-md shadow-sm p-2" min="0" step="any"/></td>
                                        <td className="p-1"><input type="number" value={act.crashTime} onChange={e => handleActivityChange(index, 'crashTime', e.target.value)} className="w-24 border-zinc-300 rounded-md shadow-sm p-2" min="0" step="any"/></td>
                                        <td className="p-1"><input type="number" value={act.crashCost} onChange={e => handleActivityChange(index, 'crashCost', e.target.value)} className="w-24 border-zinc-300 rounded-md shadow-sm p-2" min="0" step="any"/></td>
                                        <td className="p-1"><Button type="button" variant="outline" onClick={() => removeActivity(index)} className="p-2 text-xs">{t('removeButton')}</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button type="submit" isLoading={isLoading && !crashingResults} disabled={isLoading}>{t('analyzeProjectButton')}</Button>
                </form>
                {error && <p className="mt-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
            </Card>

            {results && (
                 <Card>
                    <div className="border-b border-zinc-200 mb-4">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            {Object.entries(TABS).map(([key, name]) => (
                                <button key={key} onClick={() => setActiveTab(key as 'analysis' | 'crashing')} className={`${activeTab === key ? 'border-blue-500 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                    {name}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {activeTab === 'analysis' && (
                        <div>
                             <h2 className="text-xl font-semibold text-zinc-800 mb-4">{t('analysisResultsTitle')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <ResultItem label={t('projectDuration')} value={results.projectDuration.toFixed(2)} />
                                <ResultItem label={t('criticalPath')} value={results.criticalPath.join(' → ')} />
                                <ResultItem label={t('projectVariance')} value={results.projectVariance.toFixed(2)} />
                                <ResultItem label={t('projectStdDev')} value={Math.sqrt(results.projectVariance).toFixed(2)} />
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">{t('activityDetailsTitle')}</h3>
                                    <div className="overflow-x-auto max-h-96 relative border rounded-md">
                                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                                            <thead className="bg-zinc-50 sticky top-0">
                                                <tr>{[t('idHeader'), t('teHeader'), t('varHeader'), t('esHeader'), t('efHeader'), t('lsHeader'), t('lfHeader'), t('slackHeader')].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase">{h}</th>)}</tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-zinc-200">
                                                {results.activities.map(act => (
                                                    <tr key={act.id} className={act.isCritical ? 'bg-red-50' : ''}>
                                                        <td className="px-3 py-2 font-bold whitespace-nowrap">{act.id}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{act.tiempoEsperado.toFixed(2)}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{act.varianza.toFixed(2)}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{act.es.toFixed(2)}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{act.ef.toFixed(2)}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{act.ls.toFixed(2)}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{act.lf.toFixed(2)}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{act.holgura.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">{t('networkDiagramTitle')}</h3>
                                    <div className="p-4 border rounded-lg bg-zinc-50 min-h-[20rem] flex items-center justify-center">
                                        <MermaidDiagram chart={results.mermaidGraph} />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <Button onClick={handleAiAnalysis} isLoading={isAiLoading} disabled={isAiLoading} variant="secondary">
                                    {t('getAiAnalysisButton')}
                                </Button>
                            </div>
                        </div>
                    )}
                    {activeTab === 'crashing' && (
                        <div>
                             <h2 className="text-xl font-semibold text-zinc-800 mb-4">{t('crashingTab')}</h2>
                            
                            {crashCostChartData && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-zinc-700 mb-2">{t('crashEfficiencyTitle')}</h3>
                                    <div className="p-4 border rounded-lg bg-zinc-50">
                                        <Bar 
                                            data={crashCostChartData} 
                                            options={{ responsive: true, plugins: { legend: { position: 'top' as const }, title: { display: true, text: t('crashChartTitle') }, }, scales: { y: { beginAtZero: true, title: { display: true, text: t('costAxisLabel') } }, x: { title: { display: true, text: t('activityAxisLabel') } } }}}
                                        />
                                    </div>
                                </div>
                            )}

                             <div className="flex items-end gap-4 mb-4 p-4 bg-zinc-50 rounded-lg border">
                                <Input label={t('targetDurationLabel')} type="number" name="targetDuration" value={targetDuration} onChange={(e) => setTargetDuration(parseFloat(e.target.value))} step="any" min="0" />
                                <Button onClick={handleCrashingSubmit} isLoading={isLoading} disabled={isLoading}>{t('calculateCrashingButton')}</Button>
                             </div>

                             {crashingResults && (
                                <div>
                                    {crashingResults.isPossible ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <ResultItem label={t('initialDuration')} value={crashingResults.initialDuration.toFixed(2)} />
                                                <ResultItem label={t('finalDuration')} value={crashingResults.finalDuration.toFixed(2)} />
                                                <ResultItem label={t('totalCrashingCost')} value={`$${crashingResults.totalCrashCost.toFixed(2)}`} />
                                            </div>
                                            <h3 className="text-lg font-semibold text-zinc-700">{t('crashingStepsTitle')}</h3>
                                            <div className="overflow-x-auto max-h-96 border rounded-md">
                                                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                                                    <thead className="bg-zinc-50 sticky top-0">
                                                        <tr>
                                                            {[t('stepHeader'), t('crashActivityHeader'), t('stepCostHeader'), t('newDurationHeader')].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase">{h}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-zinc-200">
                                                        {crashingResults.steps.map((step, index) => (
                                                            <tr key={index}>
                                                                <td className="px-3 py-2 font-bold">{index + 1}</td>
                                                                <td className="px-3 py-2">{step.activityId}</td>
                                                                <td className="px-3 py-2">{`$${step.cost.toFixed(2)}`}</td>
                                                                <td className="px-3 py-2">{step.newDuration.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-amber-700 bg-amber-100 p-3 rounded-md">{crashingResults.reason}</p>
                                    )}
                                </div>
                             )}
                        </div>
                    )}
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
        <p className="text-lg font-semibold text-zinc-900 break-words">{value}</p>
    </div>
);


export default PertModule;
