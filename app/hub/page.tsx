"use client";

import React, { useState, useEffect } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useLanguage } from '../../lib/LanguageContext';
import { Language } from '../../lib/translations';

interface Member {
    user_id: string;
    username: string;
    total_hero_power: number;
    squad_1_power: number;
    role?: string;
    team_assignment?: string; // DS Assigned
    ds_choice?: string;
    ds_signup_time?: string;
    arena_power?: number;
    bio?: string;
    gender?: string;
    birthday?: string;
    language?: string;
    ds_team?: string;        // DS Requested
    cs_choice?: string;      // CS Requested Action
    cs_team?: string;        // CS Requested Team
    cs_team_assignment?: string; // CS Assigned
    cs_signup_time?: string;
}

const displayPower = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    const validNum = num || 0;
    if (validNum === 0) return "0.0M";

    if (validNum > 10000000) {
        return (validNum / 1000000).toFixed(1) + "M";
    }
    if (validNum < 5000) {
        return validNum.toFixed(1) + "M";
    }
    return (validNum / 1000).toFixed(1) + "K";
};

export default function HubPage() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { language, setLanguage, t } = useLanguage();

    const [hasMounted, setHasMounted] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [currentUser, setCurrentUser] = useState<Member | null>(null);
    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [csRegistrationOpen, setCsRegistrationOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;

        async function getHubData() {
            try {
                setIsLoading(true);
                const { data: membersData } = await supabase
                    .from('members')
                    .select('*')
                    .order('total_hero_power', { ascending: false });

                if (membersData) {
                    const typedData = membersData as Member[];
                    setMembers(typedData);

                    if (user) {
                        const current = typedData.find(m => m.user_id === user.id);
                        if (current) {
                            setCurrentUser(current);
                        }
                    }
                }

                const { data: settingsData } = await supabase
                    .from('settings')
                    .select('*')
                    .eq('id', 1);

                if (settingsData && settingsData.length > 0) {
                    setRegistrationOpen(settingsData[0].registration_open);
                    setCsRegistrationOpen(settingsData[0].cs_registration_open);
                }
            } catch (err) {
                console.error("Hub Data Loader Exception:", err);
            } finally {
                setIsLoading(false);
            }
        }
        getHubData();
    }, [hasMounted, user]);

    useEffect(() => {
        if (!hasMounted || !user || isLoading) return;
        const current = members.find(m => m.user_id === user.id);

        // Check for missing mandatory profile fields and warn the user instead of redirecting
        const missing: string[] = [];
        if (!current || !current.username) missing.push(t('fieldIGN'));
        if (!current?.gender) missing.push(t('fieldGender'));
        if (!current?.birthday) missing.push(t('fieldBirthday'));
        if (!current?.bio) missing.push(t('fieldBio'));
        if ((current?.total_hero_power || 0) === 0) missing.push(t('fieldTotalPower'));

        if (missing.length > 0) {
            setMissingFields(missing);
            setShowIncompleteWarning(true);
        }
    }, [hasMounted, user, members, isLoading]);

    if (!hasMounted) return null;

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 relative overflow-hidden pt-20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 text-center shadow-2xl space-y-8 animate-in zoom-in-95 duration-700">
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-red-600/20 rounded-2xl border border-red-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner group">
                            <span className="group-hover:rotate-12 transition-transform">🔒</span>
                        </div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                            {t('signInPrompt')}
                        </h1>
                        <p className="text-slate-400 text-sm font-bold leading-relaxed px-4">
                            {t('restrictedContentMessage')}
                        </p>
                    </div>

                    <Link href="/signin">
                        <button className="w-full py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                            {t('signIn')}
                        </button>
                    </Link>

                    <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/5">
                        <Link href="/about" className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">{t('aboutUs')}</Link>
                        <Link href="/contact" className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">{t('contactUs')}</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-white overflow-hidden pb-32">

            {/* ===== Incomplete Profile Warning Modal ===== */}
            {showIncompleteWarning && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-[2rem] p-6 shadow-[0_32px_80px_-10px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
                        {/* Glow */}
                        <div className="absolute inset-0 bg-amber-500/5 rounded-[2rem] pointer-events-none" />

                        {/* Icon + Title */}
                        <div className="flex flex-col items-center text-center mb-5">
                            <div className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner">
                                ⚠️
                            </div>
                            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter leading-tight">{t('profileIncomplete')}</h2>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{t('actionRequired')}</p>
                        </div>

                        {/* Explanation */}
                        <p className="text-slate-300 text-xs font-bold text-center mb-4 leading-relaxed">
                            {t('profileIncompleteDesc')}
                        </p>

                        {/* Missing Fields List */}
                        <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-5 space-y-2">
                            <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-3">{t('missingFields')}</p>
                            {missingFields.map((field) => (
                                <div key={field} className="flex items-center gap-2.5">
                                    <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                    </div>
                                    <span className="text-[11px] font-black text-white uppercase tracking-wide">{field}</span>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowIncompleteWarning(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-black rounded-xl uppercase text-[9px] tracking-widest border border-white/5 transition-all"
                            >
                                {t('laterBtn')}
                            </button>
                            <Link href="/settings" className="flex-2">
                                <button className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black rounded-xl uppercase text-[9px] tracking-widest shadow-[0_8px_24px_-4px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-95 transition-all">
                                    {t('completeProfileBtn')}
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
            <div className="fixed top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-blue-600/5 via-transparent to-transparent pointer-events-none" />
            <div className="fixed -top-20 -right-20 w-96 h-96 bg-pink-600/10 blur-[100px] rounded-full pointer-events-none" />

            <main className="relative z-10 p-4 md:p-8 pt-16 md:pt-20">
                <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 mb-2 md:mb-6">
                        <div className="animate-in slide-in-from-left-8 duration-700">
                            <div className="flex items-center gap-2 mb-1 md:mb-3 text-left">
                                <span className="px-2 py-0.5 md:px-3 md:py-1 bg-red-600 text-white text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] rounded-md leading-none">{t('liveOps')}</span>
                                <span className="text-slate-500 text-[7px] md:text-[9px] font-black uppercase tracking-widest leading-none truncate max-w-[150px] md:max-w-none">{t('allianceName')} 020 UNIT</span>
                            </div>
                            <h1 className="text-4xl md:text-8xl font-black uppercase italic tracking-tighter leading-none text-white text-left break-tight">
                                {t('hubTitle').includes(' ') ? (
                                    <>
                                        {t('hubTitle').split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-purple-600">{t('hubTitle').split(' ')[1]}</span>
                                    </>
                                ) : (
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-purple-600">
                                        {t('hubTitle')}
                                    </span>
                                )}
                            </h1>
                        </div>
                    </header>

                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 animate-in slide-in-from-bottom-8 duration-700 delay-300">
                        {/* Compact Your Status Module */}
                        <div className="flex-1 md:max-w-2xl p-4 md:p-6 bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col justify-between group transition-all hover:border-white/20">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5 text-left">
                                        <h3 className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('yourStatus')}</h3>
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg md:text-2xl font-black text-white uppercase italic leading-tight">{currentUser?.username || 'Commander'}</p>
                                            <Link href="/settings" className="p-1.5 bg-white/5 hover:bg-pink-500/20 rounded-lg border border-white/5 transition-all group/edit">
                                                <svg className="w-3 h-3 text-slate-500 group-hover/edit:text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </Link>
                                        </div>
                                        <div className="text-[7px] md:text-[9px] font-black text-red-500 uppercase flex items-center gap-1">
                                            <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" /> {currentUser?.role || 'R1'} {t('officerLabel')}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">{t('totalHeroPower')}</p>
                                        <p className="text-xl md:text-2xl font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{displayPower(currentUser?.total_hero_power || 0)}</p>
                                    </div>
                                </div>

                                {/* Combat Readiness / Mission Status - Highly Detailed & Compact */}
                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                                    {/* Desert Storm Details */}
                                    <div className="space-y-2 text-left bg-black/20 p-2 rounded-xl border border-white/5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[7px] font-black text-pink-500 uppercase tracking-widest leading-none">{t('dsLabel')}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500/30" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center bg-white/[0.02] p-1 rounded">
                                                <span className="text-[6px] text-slate-500 font-bold uppercase">{t('assignedLabel')}</span>
                                                <span className="text-[8px] font-black text-white uppercase">{currentUser?.team_assignment || t('noData')}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white/[0.02] p-1 rounded">
                                                <span className="text-[6px] text-slate-500 font-bold uppercase">{t('requestLabel')}</span>
                                                <span className="text-[8px] font-black text-slate-300 uppercase truncate max-w-[40px]">{currentUser?.ds_team || t('noData')}</span>
                                            </div>
                                            <div className="mt-1">
                                                <span className="text-[6px] text-slate-600 font-black uppercase block leading-none">{t('lastActionLabel')}</span>
                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">
                                                    {currentUser?.ds_signup_time ? `${new Date(currentUser.ds_signup_time).toLocaleDateString()} @ ${new Date(currentUser.ds_signup_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : t('noneRecorded')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Canyon Storm Details */}
                                    <div className="space-y-2 text-left bg-black/20 p-2 rounded-xl border border-white/5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[7px] font-black text-orange-500 uppercase tracking-widest leading-none">{t('csLabel')}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500/30" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center bg-white/[0.02] p-1 rounded">
                                                <span className="text-[6px] text-slate-500 font-bold uppercase">{t('assignedLabel')}</span>
                                                <span className="text-[8px] font-black text-white uppercase">{currentUser?.cs_team_assignment || t('noData')}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white/[0.02] p-1 rounded">
                                                <span className="text-[6px] text-slate-500 font-bold uppercase">{t('requestLabel')}</span>
                                                <span className="text-[8px] font-black text-slate-300 uppercase truncate max-w-[40px]">{currentUser?.cs_team || t('noData')}</span>
                                            </div>
                                            <div className="mt-1">
                                                <span className="text-[6px] text-slate-600 font-black uppercase block leading-none">{t('lastActionLabel')}</span>
                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">
                                                    {currentUser?.cs_signup_time ? `${new Date(currentUser.cs_signup_time).toLocaleDateString()} @ ${new Date(currentUser.cs_signup_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : t('noneRecorded')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-4 md:gap-8 justify-start">
                                <div className="text-left">
                                    <p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase tracking-tighter mb-0.5 italic leading-none">{t('squad1PowerLabel')}</p>
                                    <p className="text-sm md:text-lg font-black text-white leading-none tracking-tight">{displayPower(currentUser?.squad_1_power || 0)}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase tracking-tighter mb-0.5 italic leading-none">{t('arenaPowerLabel')}</p>
                                    <p className="text-sm md:text-lg font-black text-white leading-none tracking-tight">{displayPower(currentUser?.arena_power || 0)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Optional Info Box or Space Filler */}
                        <div className="hidden md:flex flex-1 items-stretch">
                            <div className="w-full bg-gradient-to-br from-white/[0.02] to-transparent rounded-[2rem] border border-white/5 flex flex-col items-center justify-center p-8 text-center opacity-40">
                                <div className="text-4xl mb-4 grayscale">🏛️</div>
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/50">{t('allianceName')} {t('strategicAssetLabel')}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 md:space-y-6 pt-2 md:pt-8 animate-in slide-in-from-bottom-12 duration-1000 delay-500">
                        <div className="flex items-center gap-2 md:gap-4">
                            <h2 className="text-sm md:text-xl font-black uppercase italic tracking-tighter text-white">{t('rankingsLabel')}</h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                        </div>

                        <div className="grid grid-cols-3 gap-1 md:gap-4">
                            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-xl md:rounded-[2rem] p-2 md:p-6 flex flex-col min-w-0">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1.5 md:mb-3">
                                    <h3 className="text-[7px] md:text-[10px] font-black text-slate-500 uppercase tracking-tighter flex items-center gap-1">
                                        <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-red-500 rounded-full" /> {t('heroRanking')}
                                    </h3>
                                    <span className="hidden md:inline text-[8px] font-bold text-slate-600 uppercase">{t('power')}</span>
                                </div>
                                <div className="space-y-0.5 h-48 md:h-64 overflow-y-auto custom-scrollbar pr-0.5">
                                    {members.map((m, i) => (
                                        <div key={m.user_id} className={`flex items-center justify-between p-1 md:p-2 rounded md:rounded-lg transition-colors ${m.user_id === user.id ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                                            <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
                                                <span className={`text-[7px] md:text-[9px] font-black w-2.5 ${i === 0 ? 'text-yellow-500' : 'text-slate-600'}`}>{i + 1}</span>
                                                <span className="text-[7px] md:text-[10px] font-black uppercase tracking-tight text-white truncate">{m.username}</span>
                                            </div>
                                            <span className="text-[6px] md:text-[10px] font-mono font-bold text-slate-400 ml-1 shrink-0">{displayPower(m.total_hero_power).replace('M', '')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-xl md:rounded-[2rem] p-2 md:p-6 flex flex-col min-w-0 text-left">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1.5 md:mb-3">
                                    <h3 className="text-[7px] md:text-[10px] font-black text-slate-500 uppercase tracking-tighter flex items-center gap-1">
                                        <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-pink-500 rounded-full" /> {t('squadRanking')}
                                    </h3>
                                    <span className="hidden md:inline text-[8px] font-bold text-slate-600 uppercase">{t('power')}</span>
                                </div>
                                <div className="space-y-0.5 h-48 md:h-64 overflow-y-auto custom-scrollbar pr-0.5">
                                    {[...members].sort((a, b) => (b.squad_1_power || 0) - (a.squad_1_power || 0)).map((m, i) => (
                                        <div key={m.user_id} className={`flex items-center justify-between p-1 md:p-2 rounded md:rounded-lg transition-colors ${m.user_id === user.id ? 'bg-pink-500/10 ring-1 ring-pink-500/20' : 'hover:bg-white/5'}`}>
                                            <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
                                                <span className={`text-[7px] md:text-[9px] font-black w-2.5 ${i === 0 ? 'text-yellow-500' : 'text-slate-600'}`}>{i + 1}</span>
                                                <span className="text-[7px] md:text-[10px] font-black uppercase tracking-tight text-white truncate">{m.username}</span>
                                            </div>
                                            <span className="text-[6px] md:text-[10px] font-mono font-bold text-slate-400 ml-1 shrink-0">{displayPower(m.squad_1_power).replace('M', '')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-xl md:rounded-[2rem] p-2 md:p-6 flex flex-col min-w-0 text-left">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1.5 md:mb-3">
                                    <h3 className="text-[7px] md:text-[10px] font-black text-slate-500 uppercase tracking-tighter flex items-center gap-1">
                                        <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-blue-500 rounded-full" /> {t('arenaRanking')}
                                    </h3>
                                    <span className="hidden md:inline text-[8px] font-bold text-slate-600 uppercase">{t('power')}</span>
                                </div>
                                <div className="space-y-0.5 h-48 md:h-64 overflow-y-auto custom-scrollbar pr-0.5">
                                    {[...members].sort((a, b) => (b.arena_power || 0) - (a.arena_power || 0)).map((m, i) => (
                                        <div key={m.user_id} className={`flex items-center justify-between p-1 md:p-2 rounded md:rounded-lg transition-colors ${m.user_id === user.id ? 'bg-blue-500/10 ring-1 ring-blue-500/20' : 'hover:bg-white/5'}`}>
                                            <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
                                                <span className={`text-[7px] md:text-[9px] font-black w-2.5 ${i === 0 ? 'text-yellow-500' : 'text-slate-600'}`}>{i + 1}</span>
                                                <span className="text-[7px] md:text-[10px] font-black uppercase tracking-tight text-white truncate">{m.username}</span>
                                            </div>
                                            <span className="text-[6px] md:text-[10px] font-mono font-bold text-slate-400 ml-1 shrink-0">{displayPower(m.arena_power || 0).replace('M', '')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-2 md:pt-4">
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-3 md:p-6 rounded-2xl md:rounded-[2.5rem] space-y-4">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🎂</span>
                                        <div>
                                            <h3 className="text-[10px] md:text-sm font-black text-white uppercase tracking-widest">{t('upcomingBirthdays')}</h3>
                                            <p className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('next30Days')}</p>
                                        </div>
                                    </div>
                                    <div className="px-2 py-0.5 bg-pink-500/10 rounded-md border border-pink-500/20 text-[6px] md:text-[8px] font-black text-pink-500 uppercase">
                                        {t('officialUpdates')}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 md:gap-3 max-h-48 md:max-h-96 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                                    {members.filter(m => {
                                        if (!m.birthday) return false;
                                        const now = new Date();
                                        const bDay = new Date(m.birthday);
                                        bDay.setFullYear(now.getFullYear());
                                        if (bDay < now) bDay.setFullYear(now.getFullYear() + 1);
                                        const diff = Math.ceil(Math.abs(bDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                        return diff <= 30;
                                    }).sort((a,b) => {
                                        const now = new Date();
                                        const getTS = (s:string) => {
                                            const d = new Date(s); d.setFullYear(now.getFullYear()); if(d<now) d.setFullYear(now.getFullYear()+1); return d.getTime();
                                        };
                                        return getTS(a.birthday!) - getTS(b.birthday!);
                                    }).map(m => {
                                        const now = new Date();
                                        const bDate = new Date(m.birthday!);
                                        bDate.setFullYear(now.getFullYear());
                                        if (bDate < now) bDate.setFullYear(now.getFullYear() + 1);
                                        const diff = Math.ceil((bDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                        const month = bDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                                        const day = bDate.getDate();

                                        const isToday = diff === 0;
                                        return (
                                            <div key={m.user_id} className="flex flex-col gap-1.5 p-1.5 md:p-2.5 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/[0.08] transition-all group min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div className="w-6 h-8 md:w-8 md:h-10 bg-gradient-to-br from-pink-600 to-purple-600 rounded flex flex-col items-center justify-center shrink-0 shadow-lg">
                                                        <span className="text-[5px] md:text-[6px] font-black uppercase text-pink-100/70">{month}</span>
                                                        <span className="text-[10px] md:text-sm font-black text-white leading-none">{day}</span>
                                                    </div>
                                                    <div className={`px-1 rounded-sm text-[5px] md:text-[6px] font-black uppercase ${isToday ? 'bg-pink-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                                                        {isToday ? t('today') : `${diff}D`}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[7px] md:text-[10px] font-black text-white uppercase truncate tracking-tighter">{m.username}</span>
                                                    <span className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">{isToday ? t('today') : t('inDays').replace('{n}', String(diff))}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
