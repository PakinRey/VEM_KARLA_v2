import React, { useState } from 'react';
import QueuingModule from './components/QueuingModule';
import PertModule from './components/PertModule';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'queuing' | 'pert'>('queuing');

  const modules = {
    queuing: { name: 'Queuing Theory (M/M/s)', component: <QueuingModule /> },
    pert: { name: 'PERT / CPM Analysis', component: <PertModule /> },
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-slate-900">
            Business Decision Toolkit
          </h1>
          <p className="text-slate-500 mt-1">AI-Powered Operations Management</p>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
           <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {Object.keys(modules).map((key) => (
                      <button
                          key={key}
                          onClick={() => setActiveModule(key as 'queuing' | 'pert')}
                          className={`${activeModule === key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                          {modules[key as 'queuing' | 'pert'].name}
                      </button>
                  ))}
              </nav>
          </div>

          {modules[activeModule].component}
        </div>
      </main>
    </div>
  );
};

export default App;