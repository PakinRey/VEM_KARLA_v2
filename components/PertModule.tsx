import React, { useState } from 'react';
import type { PertActivity, CalculatedPertActivity, PertResults } from '../types';
import { getAIAnalysis } from '../services/geminiService';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import MermaidDiagram from './ui/MermaidDiagram';

const parsePrecedences = (precedencias: string): string[] => {
    if (!precedencias) return [];
    return precedencias.split(',').map(p => p.trim().toUpperCase()).filter(p => p !== '');
};

const calculatePertAnalysis = (activities: PertActivity[]): PertResults => {
    if (activities.length === 0) {
        return { activities: [], criticalPath: [], projectDuration: 0, projectVariance: 0, mermaidGraph: '' };
    }

    const activityMap = new Map<string, CalculatedPertActivity>();
    const activityIds = new Set(activities.map(a => a.id.trim().toUpperCase()));

    if (activityIds.size !== activities.length) {
        throw new Error("Duplicate activity IDs found. Each activity must have a unique ID.");
    }

    // 1. Initial calculation and graph structure build
    activities.forEach(act => {
        const id = act.id.trim().toUpperCase();
        if (!id) {
            throw new Error("Activity ID cannot be empty.");
        }
        const tiempoEsperado = (act.a + 4 * act.m + act.b) / 6;
        const varianza = Math.pow((act.b - act.a) / 6, 2);
        const predecessors = parsePrecedences(act.precedencias);
        activityMap.set(id, {
            ...act,
            id,
            tiempoEsperado,
            varianza,
            es: 0, ef: 0, ls: 0, lf: 0, holgura: 0, isCritical: false,
            predecessors,
            successors: [],
            currentDuration: tiempoEsperado,
        });
    });

    // Build successors list and check for valid predecessors
    for (const [id, activity] of activityMap.entries()) {
        for (const predId of activity.predecessors) {
            if (!activityIds.has(predId)) {
                throw new Error(`Activity "${id}" has a non-existent predecessor "${predId}".`);
            }
            const predActivity = activityMap.get(predId);
            predActivity?.successors.push(id);
        }
    }

    // 2. Topological sort (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    activityMap.forEach((_, id) => inDegree.set(id, 0));
    activityMap.forEach(activity => {
        activity.successors.forEach(succId => {
            inDegree.set(succId, (inDegree.get(succId) || 0) + 1);
        });
    });

    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
        if (degree === 0) queue.push(id);
    });

    const sortedActivities: string[] = [];
    while (queue.length > 0) {
        const u = queue.shift()!;
        sortedActivities.push(u);
        const uActivity = activityMap.get(u)!;
        uActivity.successors.forEach(vId => {
            const newDegree = (inDegree.get(vId) || 0) - 1;
            inDegree.set(vId, newDegree);
            if (newDegree === 0) queue.push(vId);
        });
    }

    if (sortedActivities.length !== activities.length) {
        throw new Error("Cycle detected in the project network. Please check activity dependencies.");
    }
    
    // 3. Forward Pass
    sortedActivities.forEach(id => {
        const activity = activityMap.get(id)!;
        const maxPredEf = activity.predecessors.reduce((max, predId) => {
            const predEf = activityMap.get(predId)!.ef;
            return Math.max(max, predEf);
        }, 0);
        activity.es = maxPredEf;
        activity.ef = activity.es + activity.tiempoEsperado;
    });

    const projectDuration = Math.max(0, ...Array.from(activityMap.values()).map(a => a.ef));

    // 4. Backward Pass
    [...sortedActivities].reverse().forEach(id => {
        const activity = activityMap.get(id)!;
        if (activity.successors.length === 0) {
            activity.lf = projectDuration;
        } else {
            const minSuccLs = activity.successors.reduce((min, succId) => {
                const succLs = activityMap.get(succId)!.ls;
                return Math.min(min, succLs);
            }, Infinity);
            activity.lf = minSuccLs;
        }
        activity.ls = activity.lf - activity.tiempoEsperado;
    });

    // 5. Calculate Slack and Critical Path
    const criticalPath: string[] = [];
    let projectVariance = 0;

    activityMap.forEach(activity => {
        activity.holgura = activity.lf - activity.ef;
        if (Math.abs(activity.holgura) < 1e-9) {
            activity.isCritical = true;
            criticalPath.push(activity.id);
            projectVariance += activity.varianza;
        }
    });
    
    const sortedCriticalPath = sortedActivities.filter(id => activityMap.get(id)!.isCritical);

    // 6. Generate Mermaid Graph
    let mermaidGraph = 'graph TD\n';
    const startNodes = sortedActivities.filter(id => activityMap.get(id)!.predecessors.length === 0);
    if(startNodes.length > 0){
        mermaidGraph += `    start((Start)) --> ${startNodes.join(' & ')}\n`;
    }

    activityMap.forEach(activity => {
        mermaidGraph += `    ${activity.id}[${activity.id}<br>Te=${activity.tiempoEsperado.toFixed(2)}]\n`;
        if (activity.isCritical) {
            mermaidGraph += `    style ${activity.id} fill:#ffcccc,stroke:#cc0000,stroke-width:2px\n`;
        }
        if (activity.successors.length === 0) {
            mermaidGraph += `    ${activity.id} --> finish((Finish))\n`;
        } else {
            activity.successors.forEach(succId => {
                mermaidGraph += `    ${activity.id} --> ${succId}\n`;
            });
        }
    });
    
    return {
        activities: Array.from(activityMap.values()).sort((a,b) => sortedActivities.indexOf(a.id) - sortedActivities.indexOf(b.id)),
        criticalPath: sortedCriticalPath,
        projectDuration,
        projectVariance,
        mermaidGraph
    };
};

const PertModule: React.FC = () => {
    const [activities, setActivities] = useState<PertActivity[]>([
        { id: 'A', precedencias: '', a: 2, m: 4, b: 6 },
        { id: 'B', precedencias: 'A', a: 3, m: 5, b: 7 },
        { id: 'C', precedencias: 'A', a: 4, m: 6, b: 8 },
        { id: 'D', precedencias: 'B', a: 5, m: 7, b: 9 },
        { id: 'E', precedencias: 'C', a: 1, m: 2, b: 3 },
        { id: 'F', precedencias: 'D,E', a: 4, m: 5, b: 6 },
    ]);
    const [results, setResults] = useState<PertResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleActivityChange = (index: number, field: keyof PertActivity, value: string | number) => {
        const newActivities = [...activities];
        const activity = { ...newActivities[index] };

        if (field === 'id' || field === 'precedencias') {
            activity[field] = String(value);
        } else {
            // Allow empty string for number inputs to clear them
            activity[field] = value === '' ? 0 : Number(value);
        }
        
        newActivities[index] = activity;
        setActivities(newActivities);
    };

    const addActivity = () => {
        const existingIds = new Set(activities.map(a => a.id.toUpperCase()));
        let nextId = '';
        for (let i = 0; i < 26; i++) {
            const char = String.fromCharCode(65 + i);
            if (!existingIds.has(char)) {
                nextId = char;
                break;
            }
        }
        if (!nextId) {
            nextId = `ACT${activities.length + 1}`;
        }
        setActivities([...activities, { id: nextId, precedencias: '', a: 0, m: 0, b: 0 }]);
    };
    
    const removeActivity = (indexToRemove: number) => {
        setActivities(activities.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResults(null);
        setAiAnalysis('');
        
        // Use a timeout to allow the UI to update to the loading state
        setTimeout(() => {
            try {
                if(activities.some(a => a.a < 0 || a.m < 0 || a.b < 0)) {
                    throw new Error("Activity times (a, m, b) cannot be negative.");
                }
                if(activities.some(a => a.a > a.m || a.m > a.b)) {
                    throw new Error("Activity times must follow the order: optimistic (a) ≤ most likely (m) ≤ pessimistic (b).");
                }
                const pertResults = calculatePertAnalysis(activities);
                setResults(pertResults);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }, 50); // Small delay
    };

    const handleAiAnalysis = async () => {
        if (!results) return;
        setIsAiLoading(true);
        setAiAnalysis('');
        const prompt = `
            You are an expert in Project Management and Operations Research.
            Analyze the following PERT/CPM analysis results for a project and provide actionable business insights.
            Explain the critical path and project duration in simple terms.
            Suggest which activities managers should focus on to avoid delays.
            Discuss the project's risk based on its variance.

            Project Activities (ID, Optimistic, Most Likely, Pessimistic, Expected Time):
            ${results.activities.map(a => `- ${a.id}, ${a.a}, ${a.m}, ${a.b}, ${a.tiempoEsperado.toFixed(2)}`).join('\n')}

            Analysis Results:
            - Project Duration (Expected): ${results.projectDuration.toFixed(2)} units of time
            - Critical Path: ${results.criticalPath.join(' -> ')}
            - Project Variance (sum of variances on critical path): ${results.projectVariance.toFixed(2)}
            - Project Standard Deviation: ${Math.sqrt(results.projectVariance).toFixed(2)}

            Based on these results, what is the overall health of this project plan? 
            What are the main risks? 
            Provide specific, practical recommendations for the project manager to ensure timely completion and mitigate risks.
        `;
        const analysis = await getAIAnalysis(prompt);
        setAiAnalysis(analysis);
        setIsAiLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-800">PERT/CPM Activities</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Predecessors</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Optimistic (a)</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Most Likely (m)</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Pessimistic (b)</th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {activities.map((activity, index) => (
                                    <tr key={index}>
                                        <td><Input label="" id={`id-${index}`} type="text" value={activity.id} onChange={(e) => handleActivityChange(index, 'id', e.target.value)} required className="w-20" /></td>
                                        <td><Input label="" id={`precedencias-${index}`} type="text" value={activity.precedencias} onChange={(e) => handleActivityChange(index, 'precedencias', e.target.value)} className="w-28" /></td>
                                        <td><Input label="" id={`a-${index}`} type="number" value={activity.a} onChange={(e) => handleActivityChange(index, 'a', e.target.value)} min="0" step="any" required className="w-24" /></td>
                                        <td><Input label="" id={`m-${index}`} type="number" value={activity.m} onChange={(e) => handleActivityChange(index, 'm', e.target.value)} min="0" step="any" required className="w-24" /></td>
                                        <td><Input label="" id={`b-${index}`} type="number" value={activity.b} onChange={(e) => handleActivityChange(index, 'b', e.target.value)} min="0" step="any" required className="w-24" /></td>
                                        <td><Button type="button" variant="secondary" onClick={() => removeActivity(index)} className="ml-2 !p-2"><span className="font-mono">X</span></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex space-x-4">
                        <Button type="button" onClick={addActivity} variant="outline">Add Activity</Button>
                        <Button type="submit" isLoading={isLoading} disabled={isLoading}>Calculate PERT Analysis</Button>
                    </div>
                </form>
                 {error && <p className="mt-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
            </Card>

            {results && (
                <Card>
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">PERT/CPM Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <ResultItem label="Project Duration" value={results.projectDuration.toFixed(2)} />
                        <ResultItem label="Critical Path" value={results.criticalPath.join(' → ')} />
                        <ResultItem label="Project St. Dev." value={Math.sqrt(results.projectVariance).toFixed(2)} />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Project Network Diagram</h3>
                    <div className="bg-slate-50 p-4 rounded-lg mb-6 flex justify-center overflow-x-auto">
                        <MermaidDiagram chart={results.mermaidGraph} />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Activity Details</h3>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                <tr>
                                    {['ID', 'Te', 'Var', 'ES', 'EF', 'LS', 'LF', 'Slack'].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {results.activities.map(act => (
                                    <tr key={act.id} className={act.isCritical ? 'bg-red-50' : ''}>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm font-bold">{act.id}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">{act.tiempoEsperado.toFixed(2)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">{act.varianza.toFixed(2)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">{act.es.toFixed(2)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">{act.ef.toFixed(2)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">{act.ls.toFixed(2)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">{act.lf.toFixed(2)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm">{act.holgura.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6">
                        <Button onClick={handleAiAnalysis} isLoading={isAiLoading} disabled={isAiLoading} variant="secondary">
                            Get AI Analysis & Insights
                        </Button>
                    </div>
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
    <div className="bg-slate-50 p-4 rounded-lg text-center">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 truncate">{value}</p>
    </div>
);

export default PertModule;
