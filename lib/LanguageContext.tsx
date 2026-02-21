"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from './translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, initialLanguage = 'en' }: { children: React.ReactNode, initialLanguage?: Language }) {
    const [language, setLanguageState] = useState<Language>(initialLanguage);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('preferred_language', lang);
            // We'll also update the user profile in Supabase from the component that triggers the change
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem('preferred_language') as Language;
        if (saved && (saved === 'en' || saved === 'zh' || saved === 'ja' || saved === 'th')) {
            setLanguageState(saved);
        }
    }, []);

    const t = (key: TranslationKey): string => {
        return translations[language][key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
