"use client";

import React, { createContext, useContext, useState, useEffect, Suspense, useRef } from 'react';
import { translations, Language, TranslationKey } from './translations';
import { useUser } from "@stackframe/stack";
import { supabase } from './supabase';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: string) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 🛡️ Strategic Map: Normalize all variants of Chinese/Other to supported codes
const normalizeLanguage = (lang: string | null | undefined): Language => {
    if (!lang) return 'en';
    const clean = lang.toLowerCase().split('-')[0]; // Handle 'zh-CN', 'zh-TW', 'en-US'
    if (clean === 'cn' || clean === 'zh') return 'zh';
    if (['en', 'ja', 'th', 'vi'].includes(clean)) return clean as Language;
    return 'en';
};

function LanguageSync({
    language,
    setLanguageState
}: {
    language: Language,
    setLanguageState: (lang: Language) => void
}) {
    const user = useUser();
    const isInitialMount = useRef(true);

    // 🌐 Initial Sync: Pull from Database ONLY if local device has no preference
    useEffect(() => {
        const syncLanguage = async () => {
            if (user) {
                const { data } = await supabase
                    .from('members')
                    .select('language')
                    .eq('user_id', user.id)
                    .single();

                if (data?.language) {
                    const normalized = normalizeLanguage(data.language);
                    const localPref = localStorage.getItem('preferred_language');
                    
                    // Only apply database language if we don't have a firm local choice.
                    // This prevents the "split-second Chinese then reverts to English" race condition.
                    if (!localPref && normalized !== language) {
                        setLanguageState(normalized);
                        localStorage.setItem('preferred_language', normalized);
                    } else if (localPref && localPref !== normalized) {
                        // If local preference exists and differs from DB, sync local TO DB
                        await supabase
                            .from('members')
                            .update({ language: localPref })
                            .eq('user_id', user.id);
                    }
                }
            }
        };
        syncLanguage();
    }, [user?.id]); // Only run on login/user change

    // 🚀 Persistent Sync: Push to Database
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
    const [language, setLanguageState] = useState<Language>(normalizeLanguage(initialLanguage));

    const setLanguage = (lang: string) => {
        const normalized = normalizeLanguage(lang);
        setLanguageState(normalized);
        if (typeof window !== 'undefined') {
            localStorage.setItem('preferred_language', normalized);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const langParam = urlParams.get('lang');

            if (langParam) {
                const normalized = normalizeLanguage(langParam);
                setLanguageState(normalized);
                localStorage.setItem('preferred_language', normalized);
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            } else {
                const saved = localStorage.getItem('preferred_language');
                if (saved) {
                    setLanguageState(normalizeLanguage(saved));
                }
            }
        }
    }, []);

    const t = (key: TranslationKey): string => {
        const langPack = translations[language] || translations['en'];
        return langPack[key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {/* Database sync is isolated in a Suspense-friendly component */}
            <Suspense fallback={null}>
                <LanguageSync 
                    language={language} 
                    setLanguageState={setLanguageState} 
                />
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
