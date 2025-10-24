import React, { useState } from 'react';
import QueuingModule from './components/QueuingModule';
import PertModule from './components/PertModule';
import { useLanguage } from './i18n/LanguageContext';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'queuing' | 'pert'>('queuing');
  const { language, setLanguage, t } = useLanguage();

  const modules = {
    queuing: { name: t('queuingModuleTab'), component: <QueuingModule /> },
    pert: { name: t('pertModuleTab'), component: <PertModule /> },
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                {t('appTitle')}
              </h1>
              <p className="text-zinc-500 text-sm mt-1">{t('appSubtitle')}</p>
            </div>
            <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setLanguage('en')} 
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('es')} 
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${language === 'es' ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'}`}
                >
                  ES
                </button>
            </div>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
           <div className="border-b border-zinc-200 mb-6">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {Object.keys(modules).map((key) => (
                      <button
                          key={key}
                          onClick={() => setActiveModule(key as 'queuing' | 'pert')}
                          className={`${activeModule === key ? 'border-blue-500 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
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
