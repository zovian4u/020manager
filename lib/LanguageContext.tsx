"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { translations, Language, TranslationKey } from './translations';
import { useUser } from "@stackframe/stack";
import { supabase } from './supabase';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Separate component to handle database sync, wrapped in Suspense
function LanguageSync({
    language,
    setLanguageState
}: {
    language: Language,
    setLanguageState: (lang: Language) => void
}) {
    const user = useUser();
    const isInitialMount = React.useRef(true);

    // 1. Initial Sync: Pull from Database when User logs in
    useEffect(() => {
        const syncLanguage = async () => {
            if (user) {
                const { data } = await supabase
                    .from('members')
                    .select('language')
                    .eq('user_id', user.id)
                    .single();

                if (data?.language && data.language !== language) {
                    setLanguageState(data.language as Language);
                    localStorage.setItem('preferred_language', data.language);
                }
            }
        };
        syncLanguage();
    }, [user?.id]); // Only run on login change

    // 2. Persistent Sync: Push to Database when language state changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const updateDatabase = async () => {
            if (user) {
                await supabase
                    .from('members')
                    .update({ language: language })
                    .eq('user_id', user.id);
            }
        };
        updateDatabase();
    }, [language, user?.id]);

    return null;
}

export function LanguageProvider({ children, initialLanguage = 'en' }: { children: React.ReactNode, initialLanguage?: Language }) {
    const [language, setLanguageState] = useState<Language>(initialLanguage);

    const setLanguage = async (lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('preferred_language', lang);
        }

        // We'll handle database update here if possible, but we don't have 'user' here to avoid suspense
        // Instead, we can use a separate mechanism or just let the Sync component handle it if it was a "push"
        // But the user might want immediate sync on change.
        // We can try to fetch the user session manually via Supabase or handle it in a way that doesn't suspend.
    };

    // 1. Initial Load from LocalStorage (Immediate)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('preferred_language') as Language;
            if (saved && (saved === 'en' || saved === 'zh' || saved === 'ja' || saved === 'th' || saved === 'vi')) {
                setLanguageState(saved);
            }
        }
    }, []);

    const t = (key: TranslationKey): string => {
        return translations[language][key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {/* Database sync is isolated in a Suspense-friendly component */}
            <Suspense fallback={null}>
                <LanguageSync language={language} setLanguageState={setLanguageState} />
            </Suspense>
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
