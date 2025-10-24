// i18n/LanguageContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations } from './locales';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof typeof translations.en, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: keyof typeof translations.en, replacements?: Record<string, string | number>): string => {
    let translation = translations[language][key] || translations.en[key];
    if (replacements) {
      Object.entries(replacements).forEach(([key, value]) => {
        translation = translation.replace(`{${key}}`, String(value));
      });
    }
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
