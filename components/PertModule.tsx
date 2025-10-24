import React, { useState, useRef } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import MermaidDiagram from './ui/MermaidDiagram';
import { analyzePertImage } from '../services/geminiService';
import type { PertActivity, PertResults, CalculatedPertActivity, CrashingResults, CrashingStep } from '../types';

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;


const calculatePert = (currentActivities: CalculatedPertActivity[]): PertResults => {
    // FIX: The errors regarding missing 'successors' and 'predecessors' are resolved by updating the CalculatedPertActivity type.
    // This allows removing the type casts on 'successors' throughout this function.
    const nodes: { [key: string]: CalculatedPertActivity } = {};
    currentActivities.forEach(act => {
        nodes[act.id] = { ...act, successors: [], es: 0, ef: 0, ls: Infinity, lf: Infinity, holgura: 0, isCritical: false };
    });

    Object.values(nodes).forEach(node => {
        node.predecessors.forEach((predId: string) => {
            if (nodes[predId]) {
                nodes[predId].successors.push(node.id);
            }
        });
    });

    // Forward Pass
    const topologicalOrder = [];
    const inDegree: { [key: string]: number } = {};
    Object.keys(nodes).forEach(id => { inDegree[id] = nodes[id].predecessors.length; });

    const queue = Object.keys(nodes).filter(id => inDegree[id] === 0);
    while (queue.length > 0) {
        const u = queue.shift()!;
        topologicalOrder.push(u);
        nodes[u].successors.forEach(v => {
            inDegree[v]--;
            if (inDegree[v] === 0) queue.push(v);
        });
    }

    topologicalOrder.forEach(nodeId => {
        const node = nodes[nodeId];
        node.predecessors.forEach(predId => {
            node.es = Math.max(node.es, nodes[predId].ef);
        });
        node.ef = node.es + node.currentDuration;
    });

    const projectDuration = Math.max(0, ...Object.values(nodes).map(n => n.ef));

    // Backward Pass
    const reverseTopologicalOrder = topologicalOrder.slice().reverse();
    Object.values(nodes).forEach(n => n.lf = projectDuration);

    reverseTopologicalOrder.forEach(nodeId => {
        const node = nodes[nodeId];
        if (node.successors.length === 0) {
            node.lf = projectDuration;
        } else {
             node.lf = Math.min(...node.successors.map(succId => nodes[succId].ls));
        }
        node.ls = node.lf - node.currentDuration;
    });
    
    // Slack and Critical Path
    let projectVariance = 0;
    Object.values(nodes).forEach(node => {
        node.holgura = node.ls - node.es;
        if (Math.abs(node.holgura) < 1e-9) {
            node.isCritical = true;
            projectVariance += node.varianza;
        }
    });

    const criticalPathNodes = Object.values(nodes).filter(n => n.isCritical).sort((a,b) => a.es - b.es);
    const criticalPath = criticalPathNodes.map(n => n.id);

    // Mermaid Graph
    let mermaidGraph = "graph TD;\n";
    Object.values(nodes).forEach(node => {
        const label = `${node.id}[${node.id}<br/>t=${node.currentDuration.toFixed(2)}]`;
        mermaidGraph += `    ${label}\n`;
        if (node.isCritical) {
            mermaidGraph += `    style ${node.id} fill:#fecaca,stroke:#b91c1c,stroke-width:2px\n`;
        }
        node.successors.forEach((succId: string) => {
            mermaidGraph += `    ${node.id} --> ${succId}\n`;
        });
    });

    return {
        activities: Object.values(nodes),
        criticalPath,
        projectDuration,
        projectVariance,
        mermaidGraph
    };
};


const PertModule: React.FC = () => {
    const [activities, setActivities] = useState<PertActivity[]>([
        { id: 'A', precedencias: '', a: 2, m: 4, b: 6, normalCost: 100, crashTime: 3, crashCost: 200 },
        { id: 'B', precedencias: 'A', a: 3, m: 5, b: 7, normalCost: 150, crashTime: 4, crashCost: 250 },
        { id: 'C', precedencias: 'A', a: 4, m: 6, b: 8, normalCost: 200, crashTime: 5, crashCost: 350 },
        { id: 'D', precedencias: 'B', a: 5, m: 7, b: 9, normalCost: 120, crashTime: 6, crashCost: 180 },
        { id: 'E', precedencias: 'C', a: 1, m: 2, b: 3, normalCost: 300, crashTime: 1, crashCost: 400 },
    ]);
    const [results, setResults] = useState<PertResults | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<'calculator' | 'crashing'>('calculator');
    const [targetDuration, setTargetDuration] = useState<number>(0);
    const [crashingResults, setCrashingResults] = useState<CrashingResults | null>(null);
    const [isCrashing, setIsCrashing] = useState(false);

    const handleActivityChange = (index: number, field: keyof PertActivity, value: string | number) => {
        const newActivities = [...activities];
        const activity = newActivities[index];
        if (typeof activity[field] === 'number') {
            (activity as any)[field] = Number(value) >= 0 ? Number(value) : 0;
        } else {
            (activity as any)[field] = value as string;
        }
        setActivities(newActivities);
    };

    const addActivity = () => {
        setActivities([...activities, { id: '', precedencias: '', a: 0, m: 0, b: 0, normalCost: 0, crashTime: 0, crashCost: 0 }]);
    };

    const removeActivity = (index: number) => {
        setActivities(activities.filter((_, i) => i !== index));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        try {
            const extractedActivities = await analyzePertImage(file);
            // Add default values for potentially missing fields
            const sanitizedActivities = extractedActivities.map(act => ({
                id: act.id || '',
                precedencias: act.precedencias || '',
                a: act.a || 0,
                m: act.m || 0,
                b: act.b || 0,
                normalCost: act.normalCost || 0,
                crashTime: act.crashTime || 0,
                crashCost: act.crashCost || 0,
            }));
            setActivities(sanitizedActivities);
        } catch (err) {
            console.error("Error analyzing image:", err);
            setError("Failed to analyze PERT data from image. Please ensure it's a clear table.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    
    const runInitialCalculation = () => {
        setError(null);
        setResults(null);
        setCrashingResults(null);
        setIsLoading(true);

        try {
            const activityIds = new Set(activities.map(a => a.id.trim()).filter(id => id));
            if (activityIds.size !== activities.length || activities.some(a => !a.id.trim())) {
                throw new Error("Activity IDs must be unique and cannot be empty.");
            }

            const initialNodes: CalculatedPertActivity[] = activities.map(act => {
                const tiempoEsperado = (act.a + 4 * act.m + act.b) / 6;
                const normalCost = act.normalCost || 0;
                const crashTime = act.crashTime || 0;
                const crashCost = act.crashCost || 0;
                const normalTime = tiempoEsperado;
                
                let crashCostPerUnit: number | undefined = undefined;
                if (crashTime > 0 && normalTime > crashTime && crashCost > normalCost) {
                    crashCostPerUnit = (crashCost - normalCost) / (normalTime - crashTime);
                }

                return {
                    ...act,
                    tiempoEsperado,
                    currentDuration: tiempoEsperado,
                    varianza: ((act.b - act.a) / 6) ** 2,
                    predecessors: act.precedencias.split(',').map(p => p.trim()).filter(p => p && activityIds.has(p)),
                    // FIX: Initialize successors to conform to the updated CalculatedPertActivity type.
                    successors: [],
                    crashCostPerUnit,
                    es: 0, ef: 0, ls: 0, lf: 0, holgura: 0, isCritical: false
                };
            });
            
            const pertResults = calculatePert(initialNodes);
            setResults(pertResults);
            setTargetDuration(pertResults.projectDuration);

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateCrashingPlan = () => {
        if (!results) {
            setError("Please run the initial calculation first.");
            return;
        }
        setIsCrashing(true);
        setCrashingResults(null);

        let currentActivities = JSON.parse(JSON.stringify(results.activities)) as CalculatedPertActivity[];
        let currentDuration = results.projectDuration;
        let totalCrashCost = 0;
        const steps: CrashingStep[] = [];
        
        const minPossibleDuration = calculatePert(currentActivities.map(act => ({ ...act, currentDuration: act.crashTime || act.tiempoEsperado }))).projectDuration;

        if (targetDuration < minPossibleDuration) {
            setCrashingResults({
                steps: [],
                totalCrashCost: 0,
                finalDuration: currentDuration,
                initialDuration: results.projectDuration,
                isPossible: false,
                reason: `Target duration is unachievable. The minimum possible duration is ${minPossibleDuration.toFixed(2)}.`
            });
            setIsCrashing(false);
            return;
        }


        while (currentDuration > targetDuration) {
            let iterationPert = calculatePert(currentActivities);
            currentDuration = iterationPert.projectDuration;
             if (currentDuration <= targetDuration) break;

            const criticalActivities = iterationPert.activities.filter(a => a.isCritical);
            const crashableCandidates = criticalActivities.filter(a => a.crashCostPerUnit !== undefined && a.currentDuration > (a.crashTime || a.currentDuration));
            
            if (crashableCandidates.length === 0) {
                 setCrashingResults({ steps, totalCrashCost, finalDuration: currentDuration, initialDuration: results.projectDuration, isPossible: false, reason: "No more crashable activities on the critical path." });
                 setIsCrashing(false);
                 return;
            }

            crashableCandidates.sort((a, b) => (a.crashCostPerUnit!) - (b.crashCostPerUnit!));
            const activityToCrash = crashableCandidates[0];
            
            const maxCrashAmount = activityToCrash.currentDuration - (activityToCrash.crashTime || activityToCrash.currentDuration);
            const crashAmount = Math.min(1, maxCrashAmount, currentDuration - targetDuration);
            
            if (crashAmount <= 1e-9) break;

            const costForThisStep = crashAmount * activityToCrash.crashCostPerUnit!;
            totalCrashCost += costForThisStep;
            
            currentActivities = currentActivities.map(act => act.id === activityToCrash.id ? { ...act, currentDuration: act.currentDuration - crashAmount } : act);
            
            iterationPert = calculatePert(currentActivities);
            currentDuration = iterationPert.projectDuration;

            steps.push({
                activityId: activityToCrash.id,
                crashedBy: crashAmount,
                cost: costForThisStep,
                newDuration: currentDuration,
                criticalPath: iterationPert.criticalPath,
            });
        }

        setCrashingResults({
            steps,
            totalCrashCost,
            finalDuration: currentDuration,
            initialDuration: results.projectDuration,
            isPossible: true,
        });
        setIsCrashing(false);
    };

    const renderCalculator = () => (
        <>
        <Card>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Project Activities</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-2 py-2 text-left font-medium text-slate-500">ID</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500">Predecessors</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500">Time (a, m, b)</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500">Normal Cost</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500">Crash Time</th>
                            <th className="px-2 py-2 text-left font-medium text-slate-500">Crash Cost</th>
                            <th className="px-2 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {activities.map((act, index) => (
                            <tr key={index}>
                                <td className="p-1"><input type="text" value={act.id} onChange={e => handleActivityChange(index, 'id', e.target.value)} className="w-16 rounded border-slate-300" /></td>
                                <td className="p-1"><input type="text" value={act.precedencias} onChange={e => handleActivityChange(index, 'precedencias', e.target.value)} className="w-24 rounded border-slate-300" placeholder="A,B"/></td>
                                <td className="p-1 whitespace-nowrap">
                                    <input type="number" value={act.a} onChange={e => handleActivityChange(index, 'a', e.target.value)} className="w-16 mr-1 rounded border-slate-300" />
                                    <input type="number" value={act.m} onChange={e => handleActivityChange(index, 'm', e.target.value)} className="w-16 mr-1 rounded border-slate-300" />
                                    <input type="number" value={act.b} onChange={e => handleActivityChange(index, 'b', e.target.value)} className="w-16 rounded border-slate-300" />
                                </td>
                                <td className="p-1"><input type="number" value={act.normalCost} onChange={e => handleActivityChange(index, 'normalCost', e.target.value)} className="w-24 rounded border-slate-300" /></td>
                                <td className="p-1"><input type="number" value={act.crashTime} onChange={e => handleActivityChange(index, 'crashTime', e.target.value)} className="w-24 rounded border-slate-300" /></td>
                                <td className="p-1"><input type="number" value={act.crashCost} onChange={e => handleActivityChange(index, 'crashCost', e.target.value)} className="w-24 rounded border-slate-300" /></td>
                                <td className="p-1"><button onClick={() => removeActivity(index)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
                <Button onClick={addActivity} variant="secondary">Add Activity</Button>
                <Button onClick={runInitialCalculation} isLoading={isLoading}>Calculate Critical Path</Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} isLoading={isUploading}>
                    <UploadIcon /> {isUploading ? 'Analyzing...' : 'Upload Photo'}
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>
             {error && <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
        </Card>
        
        {results && (
            <Card>
                <h3 className="text-xl font-semibold text-slate-800 mb-4">Analysis Results</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-lg text-center"><p className="text-sm text-slate-500">Project Duration</p><p className="text-2xl font-bold text-indigo-600">{results.projectDuration.toFixed(2)}</p></div>
                    <div className="bg-slate-50 p-4 rounded-lg text-center"><p className="text-sm text-slate-500">Project Variance</p><p className="text-2xl font-bold text-indigo-600">{results.projectVariance.toFixed(2)}</p></div>
                    <div className="bg-slate-50 p-4 rounded-lg text-center col-span-2"><p className="text-sm text-slate-500">Critical Path</p><p className="text-xl font-bold text-red-600">{results.criticalPath.join(' → ')}</p></div>
                </div>
                
                <h4 className="text-lg font-semibold text-slate-700 mb-2">Activity Details</h4>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                       <thead className="bg-slate-50">
                            <tr>
                                {['ID', 'tₑ', 'σ²', 'ES', 'EF', 'LS', 'LF', 'Slack', 'Critical?'].map(h => <th key={h} className="px-2 py-2 text-center text-xs font-medium text-slate-500">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {results.activities.map(act => (
                                <tr key={act.id} className={act.isCritical ? 'bg-red-50' : ''}>
                                    <td className="font-bold text-center py-2">{act.id}</td>
                                    <td className="text-center py-2">{act.tiempoEsperado.toFixed(2)}</td>
                                    <td className="text-center py-2">{act.varianza.toFixed(2)}</td>
                                    <td className="text-center py-2">{act.es.toFixed(2)}</td>
                                    <td className="text-center py-2">{act.ef.toFixed(2)}</td>
                                    <td className="text-center py-2">{act.ls.toFixed(2)}</td>
                                    <td className="text-center py-2">{act.lf.toFixed(2)}</td>
                                    <td className="text-center py-2">{act.holgura.toFixed(2)}</td>
                                    <td className="text-center py-2">{act.isCritical ? 'Yes' : 'No'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <h4 className="text-lg font-semibold text-slate-700 mt-6 mb-2">Project Network Diagram</h4>
                <div className="p-4 bg-slate-50 rounded-lg">
                    <MermaidDiagram chart={results.mermaidGraph} />
                </div>
            </Card>
        )}
        </>
    );

    const renderCrashing = () => (
        <Card>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Project Crashing Analysis</h3>
            {!results ? (
                <p className="text-slate-500">Please calculate the critical path first on the "Calculator" tab to enable crashing analysis.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className='md:col-span-1 space-y-4'>
                     <div className="bg-slate-100 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-slate-700">Initial Duration</label>
                        <p className="text-2xl font-bold text-slate-800">{results.projectDuration.toFixed(2)} days</p>
                     </div>
                     <Input 
                        id="targetDuration" 
                        name="targetDuration" 
                        label="Target Duration" 
                        type="number" 
                        value={targetDuration} 
                        onChange={(e) => setTargetDuration(parseFloat(e.target.value) || 0)}
                        placeholder="e.g., 15"
                     />
                     <Button onClick={calculateCrashingPlan} isLoading={isCrashing} className="w-full">Calculate Crashing Plan</Button>
                   </div>
                   <div className="md:col-span-2">
                    {crashingResults ? (
                        <div>
                             <h4 className="text-lg font-semibold text-slate-700 mb-2">Crashing Summary</h4>
                             {crashingResults.isPossible ? (
                                <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                     <div className="bg-green-50 p-4 rounded-lg text-center"><p className="text-sm text-green-700">Final Duration</p><p className="text-2xl font-bold text-green-800">{crashingResults.finalDuration.toFixed(2)}</p></div>
                                     <div className="bg-amber-50 p-4 rounded-lg text-center"><p className="text-sm text-amber-700">Total Crash Cost</p><p className="text-2xl font-bold text-amber-800">${crashingResults.totalCrashCost.toFixed(2)}</p></div>
                                </div>
                                <h4 className="text-lg font-semibold text-slate-700 mb-2">Crashing Steps</h4>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-slate-500">Step</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-500">Crash Activity</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-500">Cost</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-500">New Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {crashingResults.steps.map((step, i) => (
                                                <tr key={i}>
                                                    <td className="px-3 py-2">{i+1}</td>
                                                    <td className="px-3 py-2 font-semibold text-indigo-600">{step.activityId}</td>
                                                    <td className="px-3 py-2">${step.cost.toFixed(2)}</td>
                                                    <td className="px-3 py-2">{step.newDuration.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                </>
                             ) : (
                                <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{crashingResults.reason}</div>
                             )}
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-full text-slate-500 bg-slate-50 rounded-lg p-6">
                           <p>Crashing plan results will be displayed here.</p>
                        </div>
                    )}
                   </div>
                </div>
            )}
        </Card>
    );
    
    return (
        <div className="space-y-8">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('calculator')} className={`${activeTab === 'calculator' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Calculator & Critical Path
                    </button>
                    <button onClick={() => setActiveTab('crashing')} className={`${activeTab === 'crashing' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Crashing Analysis
                    </button>
                </nav>
            </div>
            {activeTab === 'calculator' && renderCalculator()}
            {activeTab === 'crashing' && renderCrashing()}
        </div>
    );
};

export default PertModule;