
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { solveMM1, solveMMs, calculatePnDistribution } from '../services/queuingService';
import { analyzeProblemImage, explainConcept, analyzeComplexScenario } from '../services/geminiService';
import type { QueuingParams, QueuingResults, PnData } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

const LambdaIcon = () => <span className="text-slate-400 font-serif text-lg">λ</span>;
const MuIcon = () => <span className="text-slate-400 font-serif text-lg">μ</span>;
const ServerIcon = () => <span className="text-slate-400 font-bold">s</span>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;

const QueuingModule: React.FC = () => {
    const [params, setParams] = useState<QueuingParams>({ lambda: 5, mu: 6, s: 1 });
    const [results, setResults] = useState<QueuingResults | null>(null);
    const [pnData, setPnData] = useState<PnData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'calculator' | 'analysis' | 'explanation'>('calculator');

    const [analysisQuery, setAnalysisQuery] = useState('');
    const [analysisResult, setAnalysisResult] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [explanationResult, setExplanationResult] = useState<{ explanation: string; sources: any[] } | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setParams({ ...params, [e.target.name]: parseFloat(e.target.value) || 0 });
    };

    const handleCalculate = useCallback(() => {
        setIsLoading(true);
        setError(null);
        setResults(null);
        setPnData([]);
        try {
            const newResults = params.s === 1 ? solveMM1(params) : solveMMs(params);
            setResults(newResults);
            const newPnData = calculatePnDistribution(newResults, params);
            setPnData(newPnData);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [params]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        try {
            const extractedParams = await analyzeProblemImage(file);
            setParams({
                lambda: extractedParams.lambda || 0,
                mu: extractedParams.mu || 0,
                s: extractedParams.s || 1,
            });
        } catch (err) {
            console.error("Error analyzing image:", err);
            setError("Failed to analyze image. Please check the image format and content.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleAnalyzeScenario = async () => {
        if (!analysisQuery.trim()) return;
        setIsAnalyzing(true);
        setAnalysisResult('');
        setError(null);
        try {
            const result = await analyzeComplexScenario(analysisQuery);
            setAnalysisResult(result);
        } catch (err) {
            setError('Failed to get analysis from Gemini.');
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleExplainConcept = async () => {
        setIsExplaining(true);
        setExplanationResult(null);
        setError(null);
        try {
            const result = await explainConcept('Queuing Theory M/M/s model');
            setExplanationResult(result);
        } catch (err) {
            setError('Failed to get explanation from Gemini.');
        } finally {
            setIsExplaining(false);
        }
    };

    const resultMetrics = useMemo(() => results ? [
        { label: 'System Utilization (ρ)', value: results.rho.toFixed(4), description: 'Proportion of time servers are busy.' },
        { label: 'Avg # in System (L)', value: results.L.toFixed(4), description: 'Average number of customers in the system.' },
        { label: 'Avg # in Queue (Lq)', value: results.Lq.toFixed(4), description: 'Average number of customers waiting in line.' },
        { label: 'Avg Time in System (W)', value: results.W.toFixed(4), description: 'Average time a customer spends in the system.' },
        { label: 'Avg Time in Queue (Wq)', value: results.Wq.toFixed(4), description: 'Average time a customer waits in line.' },
        { label: 'Idle Probability (P₀)', value: results.P0.toFixed(4), description: 'Probability of the system being empty.' },
    ] : [], [results]);

    const renderCalculator = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="flex flex-col">
                    <h3 className="text-xl font-semibold text-slate-800 mb-4">Input Parameters</h3>
                    <div className="space-y-4">
                        <Input id="lambda" name="lambda" label="Arrival Rate (λ)" type="number" value={params.lambda} onChange={handleParamChange} icon={<LambdaIcon />} placeholder="e.g., 10" />
                        <Input id="mu" name="mu" label="Service Rate (μ) per server" type="number" value={params.mu} onChange={handleParamChange} icon={<MuIcon />} placeholder="e.g., 12" />
                        <Input id="s" name="s" label="Number of Servers (s)" type="number" min="1" step="1" value={params.s} onChange={handleParamChange} icon={<ServerIcon />} placeholder="e.g., 1" />
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleCalculate} isLoading={isLoading} className="flex-1">Calculate</Button>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} isLoading={isUploading} className="flex-1">
                            <UploadIcon /> {isUploading ? 'Analyzing...' : 'Upload Photo'}
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    </div>
                    {error && <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
                </Card>

                <Card>
                    <h3 className="text-xl font-semibold text-slate-800 mb-4">Performance Metrics</h3>
                    {results ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {resultMetrics.map(metric => (
                                <div key={metric.label} className="bg-slate-50 p-4 rounded-lg text-center" title={metric.description}>
                                    <p className="text-sm text-slate-500">{metric.label}</p>
                                    <p className="text-2xl font-bold text-indigo-600">{metric.value}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">
                           <p>Results will be displayed here.</p>
                        </div>
                    )}
                </Card>
            </div>
            {pnData.length > 0 && (
                <Card className="mt-8">
                    <h3 className="text-xl font-semibold text-slate-800 mb-4">Probability Distribution P(n)</h3>
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <ComposedChart data={pnData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="n" label={{ value: 'Number of Customers (n)', position: 'insideBottom', offset: -5 }} />
                                <YAxis yAxisId="left" label={{ value: 'Probability', angle: -90, position: 'insideLeft' }} />
                                <YAxis yAxisId="right" orientation="right" label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                                <Tooltip formatter={(value, name) => [typeof value === 'number' ? value.toFixed(4) : value, name]} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="Pn" fill="#4f46e5" name="Probability of n customers" />
                                <Line yAxisId="right" type="monotone" dataKey="cumulativePn" stroke="#db2777" name="Cumulative Probability" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            )}
        </>
    );

    const renderAnalysis = () => (
         <Card>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Complex Scenario Analysis (Gemini Pro)</h3>
            <p className="text-slate-600 mb-4">Describe a complex business problem. Gemini will use its advanced reasoning ("thinking mode") to provide a detailed analysis.</p>
            <textarea
                value={analysisQuery}
                onChange={(e) => setAnalysisQuery(e.target.value)}
                className="w-full h-32 p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., A hospital emergency room is experiencing long wait times. Arrivals are Poisson at 10 patients/hour. There are 3 doctors, and each can treat a patient in an average of 15 minutes (exponential). What are the bottlenecks and how can we improve flow?"
            />
            <Button onClick={handleAnalyzeScenario} isLoading={isAnalyzing} className="mt-4">Analyze with Gemini Pro</Button>
            {isAnalyzing && <p className="mt-4 text-indigo-600">Gemini is thinking... this might take a moment.</p>}
            {analysisResult && (
                <div className="mt-6 p-4 bg-slate-50 rounded-md prose max-w-none">
                   <pre className="whitespace-pre-wrap font-sans">{analysisResult}</pre>
                </div>
            )}
        </Card>
    );
    
    const renderExplanation = () => (
        <Card>
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Concept Explanation (Gemini + Google Search)</h3>
            <Button onClick={handleExplainConcept} isLoading={isExplaining} className="mb-4">Explain Queuing Theory</Button>
            {isExplaining && <p className="text-indigo-600">Fetching up-to-date information...</p>}
            {explanationResult && (
                 <div className="mt-6 p-4 bg-slate-50 rounded-md prose max-w-none">
                    <pre className="whitespace-pre-wrap font-sans">{explanationResult.explanation}</pre>
                    {explanationResult.sources.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-semibold">Sources from Google Search:</h4>
                            <ul className="list-disc pl-5">
                                {explanationResult.sources.map((chunk, index) => (
                                    <li key={index}>
                                        <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{chunk.web.title}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'calculator': return renderCalculator();
            case 'analysis': return renderAnalysis();
            case 'explanation': return renderExplanation();
            default: return renderCalculator();
        }
    };
    
    return (
        <div className="space-y-8">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('calculator')} className={`${activeTab === 'calculator' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        Queuing Calculator
                    </button>
                    <button onClick={() => setActiveTab('analysis')} className={`${activeTab === 'analysis' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        AI Scenario Analysis
                    </button>
                    <button onClick={() => setActiveTab('explanation')} className={`${activeTab === 'explanation' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                        AI Concept Explainer
                    </button>
                </nav>
            </div>
            {renderContent()}
        </div>
    );
};

export default QueuingModule;
