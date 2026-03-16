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
    team_assignment?: string;
    ds_choice?: string;
    ds_signup_time?: string;
    arena_power?: number;
    bio?: string;
    gender?: string;
    birthday?: string;
    language?: string;
    ds_team?: string;
    cs_choice?: string;
    cs_team?: string;
    cs_signup_time?: string;
}

export default function HubPage() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { language, setLanguage, t } = useLanguage();

    // ✅ State Management
    const [hasMounted, setHasMounted] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [currentUser, setCurrentUser] = useState<Member | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [csRegistrationOpen, setCsRegistrationOpen] = useState(false);
    const [attendanceMarked, setAttendanceMarked] = useState(true);
    const [hasAttendanceColumn, setHasAttendanceColumn] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRankModal, setShowRankModal] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        total_hero_power: 0,
        squad_1_power: 0,
        arena_power: 0,
        bio: "",
        gender: "",
        birthday: "",
        language: language as string
    });

    // 🛡️ System Guard
    useEffect(() => {
        setHasMounted(true);

        const handleOpenSettings = () => setIsEditing(true);
        window.addEventListener('open-settings', handleOpenSettings);

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('settings') === 'true') {
            setIsEditing(true);
            window.history.replaceState({}, '', '/hub');
        }

        return () => window.removeEventListener('open-settings', handleOpenSettings);
    }, []);

    // 🛡️ Data Guard: Fetch logic
    useEffect(() => {
        if (!hasMounted) return;

        async function getHubData() {
            try {
                setIsLoading(true);
                // Fetch members
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

                            // Smart Detection for UI loading
                            const formatForUI = (val: number) => {
                                if (!val) return 0;
                                // If already < 5000, it's likely already in Million format
                                return val > 5000 ? val / 1000000 : val;
                            };

                            setFormData({
                                username: current.username || "",
                                total_hero_power: formatForUI(current.total_hero_power || 0),
                                squad_1_power: formatForUI(current.squad_1_power || 0),
                                arena_power: formatForUI(current.arena_power || 0),
                                bio: current.bio || "",
                                gender: current.gender || "",
                                birthday: current.birthday || "",
                                language: current.language || "en"
                            });
                            if (current.language) {
                                setLanguage(current.language as Language);
                            }
                        }
                    }
                }

                // Fetch settings
                const { data: settingsData, error: settingsError } = await supabase
                    .from('settings')
                    .select('*')
                    .eq('id', 1);

                if (settingsError) {
                    console.error("Settings Fetch Error:", settingsError.message);
                } else if (settingsData && settingsData.length > 0) {
                    setRegistrationOpen(settingsData[0].registration_open);
                    setCsRegistrationOpen(settingsData[0].cs_registration_open);

                    // Column detection
                    if (settingsData[0].attendance_marked === undefined) {
                        setHasAttendanceColumn(false);
                        setAttendanceMarked(true);
                    } else {
                        setHasAttendanceColumn(true);
                        setAttendanceMarked(settingsData[0].attendance_marked ?? true);
                    }
                }
            } catch (err) {
                console.error("Hub Data Loader Exception:", err);
            } finally {
                setIsLoading(false);
            }
        }
        getHubData();
    }, [hasMounted, user]);

    // 🚨 Force profile completion for first-time login or fresh start
    useEffect(() => {
        if (!hasMounted || !user || isLoading) return;

        const current = members.find(m => m.user_id === user.id);
        // Force modal if missing basic info OR if starting fresh (power is 0)
        if (!current || !current.username || !current.bio || !current.gender || (current.total_hero_power || 0) === 0) {
            setIsEditing(true);
        }
    }, [hasMounted, user, members, isLoading]);

    // ✅ Helper calculations
    const desertSignups = members.filter(m => m.ds_choice && m.ds_signup_time);
    const canyonSignups = members.filter(m => m.cs_choice && m.cs_signup_time);
    const totalActiveMembers = members.length || 1;
    const signupPercentage = Math.round((desertSignups.length / totalActiveMembers) * 100);
    const csSignupPercentage = Math.round((canyonSignups.length / totalActiveMembers) * 100);

    const displayPower = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        const validNum = num || 0;
        if (validNum === 0) return "0.0M";

        // Smart Formatting:
        // If it's a raw integer (> 5000), divide by 1M
        if (validNum > 5000) {
            return (validNum / 1000000).toFixed(1) + "M";
        }
        // If it's already in Million format (e.g. 148.5), just show it
        return validNum.toFixed(1) + "M";
    };

    if (!hasMounted) return null;

    return (
        <div className="min-h-[calc(100vh-72px)] px-4 md:px-8 pb-8 bg-pink-50/50 text-slate-900 overflow-x-hidden pt-8">

            {/* 🛡️ Command Center (R4/R5) */}
            {(currentUser?.role === 'R4' || currentUser?.role === 'R5') && (
                <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4">
                    {/* DS Command */}
                    <div className="p-4 bg-slate-800 rounded-3xl flex items-center justify-between gap-4 border border-pink-500/20 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-xl">🛡️</div>
                            <div>
                                <p className="text-white font-black text-xs uppercase tracking-tight">{t('desertStorm')} {t('status')}</p>
                                <p className="text-pink-400 text-[10px] font-bold uppercase">{registrationOpen ? t('statusOpen') : t('statusLocked')}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    const newStatus = !registrationOpen;
                                    const { error } = await supabase.from('settings').update({ registration_open: newStatus }).eq('id', 1);
                                    if (error) alert("Error: " + error.message);
                                    else {
                                        setRegistrationOpen(newStatus);
                                        await supabase.from('audit_logs').insert({ user_id: user?.id, username: currentUser?.username, action: newStatus ? "OPEN_SIGNUPS" : "CLOSE_SIGNUPS", details: { context: "R4/R5 Hub" } });
                                    }
                                }}
                                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${registrationOpen ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                            >
                                {registrationOpen ? t('closeSignups') : t('openSignups')}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!window.confirm("⚠️ Clear ALL DS signups?")) return;
                                    const { error } = await supabase.from('members').update({ ds_choice: null, ds_team: null, ds_signup_time: null, team_assignment: null }).not('user_id', 'is', null);
                                    if (error) alert("Error: " + error.message);
                                    else {
                                        await supabase.from('audit_logs').insert({ user_id: user?.id, username: currentUser?.username, action: "CLEAR_ALL_SIGNUPS", details: { context: "R4/R5 Hub" } });
                                        window.location.reload();
                                    }
                                }}
                                className="px-4 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md"
                            >
                                {t('clearSignups')}
                            </button>
                        </div>
                    </div>

                    {/* CS Command */}
                    <div className="p-4 bg-slate-800 rounded-3xl flex items-center justify-between gap-4 border border-orange-500/20 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl">🔥</div>
                            <div>
                                <p className="text-white font-black text-xs uppercase tracking-tight">{t('canyonStorm')} {t('status')}</p>
                                <p className="text-orange-400 text-[10px] font-bold uppercase">{csRegistrationOpen ? t('statusOpen') : t('statusLocked')}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    const newStatus = !csRegistrationOpen;
                                    const { error } = await supabase.from('settings').update({ cs_registration_open: newStatus }).eq('id', 1);
                                    if (error) alert("Error: " + error.message);
                                    else {
                                        setCsRegistrationOpen(newStatus);
                                        await supabase.from('audit_logs').insert({ user_id: user?.id, username: currentUser?.username, action: newStatus ? "OPEN_CS_SIGNUPS" : "CLOSE_CS_SIGNUPS", details: { context: "R4/R5 Hub" } });
                                    }
                                }}
                                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${csRegistrationOpen ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}`}
                            >
                                {csRegistrationOpen ? t('closeSignups') : t('openSignups')}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!window.confirm("⚠️ Clear ALL CS signups?")) return;
                                    const { error } = await supabase.from('members').update({ cs_choice: null, cs_team: null, cs_team_assignment: null, cs_signup_time: null }).not('user_id', 'is', null);
                                    if (error) alert("Error: " + error.message);
                                    else {
                                        await supabase.from('audit_logs').insert({ user_id: user?.id, username: currentUser?.username, action: "CLEAR_ALL_CS_SIGNUPS", details: { context: "R4/R5 Hub" } });
                                        window.location.reload();
                                    }
                                }}
                                className="px-4 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md"
                            >
                                {t('clearCsSignups')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="text-center mb-16">
                <h2 className="text-4xl sm:text-7xl md:text-9xl font-black mb-10 tracking-tighter text-slate-900 leading-none uppercase italic">
                    {t('allianceName')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 italic">020</span>
                </h2>
                
                <div className="max-w-6xl mx-auto space-y-6">
                    {user ? (
                        <>
                            {/* Section 1: Battlefront Operations */}
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                                    <span className="h-px bg-slate-200 flex-1"></span>
                                    {t('battlefrontOperations')}
                                    <span className="h-px bg-slate-200 flex-1"></span>
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    <Link href="/desert-storm" className="group">
                                        <button className="w-full flex items-center gap-3 p-3 bg-slate-900 text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-left border border-slate-800">
                                            <div className="w-12 h-12 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">✨</div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-tight truncate leading-tight">{t('joinDesertStorm')}</div>
                                            </div>
                                        </button>
                                    </Link>
                                    <Link href="/canyon-storm" className="group">
                                        <button className="w-full flex items-center gap-3 p-3 bg-orange-600 text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-left border border-orange-500">
                                            <div className="w-12 h-12 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">🔥</div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-tight truncate leading-tight">{t('joinCanyonStorm')}</div>
                                            </div>
                                        </button>
                                    </Link>
                                    <Link href="/alliance-duel" className="group">
                                        <button className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-left border border-pink-400/30">
                                            <div className="w-12 h-12 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">⚔️</div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-tight truncate leading-tight">{t('enterVsScores')}</div>
                                            </div>
                                        </button>
                                    </Link>
                                </div>
                            </div>

                            {/* Section 2 & 3: Logistics & Calculators Row on Desktop */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Logistics */}
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                                        {t('allianceLogistics')}
                                        <span className="h-px bg-slate-200 flex-1"></span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Link href="/train" className="group">
                                            <button className="w-full flex items-center gap-3 p-3 bg-amber-600 text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-left border border-amber-500">
                                                <div className="w-12 h-12 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">🚂</div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-black uppercase tracking-tight truncate leading-tight">{t('trainConductor')}</div>
                                                </div>
                                            </button>
                                        </Link>
                                        <Link href="/guide" className="group">
                                            <button className="w-full flex items-center gap-3 p-3 bg-indigo-600 text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-left border border-indigo-500">
                                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">📖</div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-black uppercase tracking-tight truncate leading-tight">{t('guide')}</div>
                                                </div>
                                            </button>
                                        </Link>
                                    </div>
                                </div>

                                {/* Calculators */}
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                                        {t('strategicCalculators')}
                                        <span className="h-px bg-slate-200 flex-1"></span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Link href="/calculators/drone" className="group">
                                            <button className="w-full flex items-center gap-3 p-3 bg-teal-600 text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-left border border-teal-500">
                                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">🧮</div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-black uppercase tracking-tight truncate leading-tight">{t('droneCalculator')}</div>
                                                </div>
                                            </button>
                                        </Link>
                                        <Link href="/calculators/t11" className="group">
                                            <button className="w-full flex items-center gap-3 p-3 bg-blue-600 text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-left border border-blue-500">
                                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">🚀</div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-black uppercase tracking-tight truncate leading-tight">{t('t11Calculator')}</div>
                                                </div>
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Commander Tools (R4/R5) */}
                            {(currentUser?.role === 'R4' || currentUser?.role === 'R5') && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4">
                                    <h3 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] flex items-center gap-4">
                                        <span className="h-px bg-red-100 flex-1"></span>
                                        {t('commanderTools')}
                                        <span className="h-px bg-red-100 flex-1"></span>
                                    </h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <Link href="/tactical-dashboard" className="group">
                                            <button className="w-full flex items-center gap-3 p-3 bg-red-600 text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-left border border-red-500">
                                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">📊</div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-black uppercase tracking-tight truncate leading-tight">{t('tacticalDashboard')}</div>
                                                </div>
                                            </button>
                                        </Link>
                                        <button 
                                            onClick={() => setShowRankModal(true)} 
                                            className="group w-full flex items-center gap-3 p-3 bg-blue-700 text-white rounded-2xl hover:scale-[1.02] transition-all shadow-lg text-left border border-blue-600"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">⭐</div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-black uppercase tracking-tight truncate leading-tight">{t('manageRanks')}</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-20 bg-white/50 backdrop-blur-md rounded-[3rem] border border-white shadow-2xl">
                            <h3 className="text-2xl font-black text-slate-800 mb-4 uppercase italic">{t('signInPrompt')}</h3>
                            <Link href="/">
                                <button className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                                    {t('signIn')}
                                </button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* ✅ Condensed Mobilization Status Panels */}
                <div className="mt-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* DS Status */}
                    <div className="bg-white/50 backdrop-blur-md rounded-3xl p-4 border border-white shadow-lg flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900/5 flex items-center justify-center text-xl">✨</div>
                            <div className="text-left">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dsMobilization')}</h3>
                                {currentUser?.ds_choice ? (
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-slate-800 uppercase italic leading-none">{currentUser.ds_choice}</p>
                                        <span className="text-[10px] text-blue-500 font-bold leading-none">
                                            {currentUser.team_assignment && currentUser.team_assignment !== "None" ? `✅ ${t('team')} ${currentUser.team_assignment}` : `⏳ ${t('awaitingAssignment')}`}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-sm font-black text-slate-400 uppercase italic">{t('notRegistered')}</p>
                                )}
                            </div>
                        </div>
                        <Link href="/desert-storm">
                            <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md">
                                {currentUser?.ds_choice ? t('edit') : t('join')}
                            </button>
                        </Link>
                    </div>

                    {/* CS Status */}
                    <div className="bg-orange-50/50 backdrop-blur-md rounded-3xl p-4 border border-orange-100 shadow-lg flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/5 flex items-center justify-center text-xl">🔥</div>
                            <div className="text-left">
                                <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{t('csMobilization')}</h3>
                                {currentUser?.cs_choice ? (
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-slate-800 uppercase italic leading-none">{currentUser.cs_choice}</p>
                                        <span className="text-[10px] text-orange-500 font-bold leading-none">⏳ {t('awaitingAssignment')}</span>
                                    </div>
                                ) : (
                                    <p className="text-sm font-black text-slate-400 uppercase italic">{t('notRegistered')}</p>
                                )}
                            </div>
                        </div>
                        <Link href="/canyon-storm">
                            <button className="px-4 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md">
                                {currentUser?.cs_choice ? t('edit') : t('join')}
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ✅ Leaderboards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-[1400px] mx-auto mb-20 px-4">
                {[
                    { title: t('power'), data: members, val: (m: Member) => displayPower(m.total_hero_power) },
                    { title: t('squad1Power'), data: [...members].sort((a, b) => (b.squad_1_power || 0) - (a.squad_1_power || 0)), val: (m: Member) => displayPower(m.squad_1_power) },
                    { title: `${t('upcomingBirthdays')} 🎂`, data: [...members].filter(m => {
                        if (!m.birthday) return false;
                        const today = new Date();
                        const bday = new Date(m.birthday);
                        bday.setFullYear(today.getFullYear());
                        
                        // If birthday already passed this year, look at next year
                        if (bday < today) {
                            bday.setFullYear(today.getFullYear() + 1);
                        }
                        
                        const diffTime = Math.abs(bday.getTime() - today.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 30;
                    }).sort((a, b) => {
                        const today = new Date();
                        const getNextBday = (dateStr: string) => {
                            const d = new Date(dateStr);
                            d.setFullYear(today.getFullYear());
                            if (d < today) d.setFullYear(today.getFullYear() + 1);
                            return d.getTime();
                        };
                        return getNextBday(a.birthday!) - getNextBday(b.birthday!);
                    }), val: (m: Member) => new Date(m.birthday!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
                    { title: t('dsMobilization'), isStats: true, total: desertSignups.length },
                    { title: t('csMobilization'), isStats: true, isCS: true, total: canyonSignups.length }
                ].map((board, i) => (
                    <div key={i} className="bg-white/70 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all flex flex-col h-[280px]">
                        <h3 className="text-[11px] font-black text-slate-800 mb-6 uppercase italic tracking-wider border-b border-pink-100 pb-2 shrink-0">{board.title}</h3>

                        {board.isStats ? (
                            <div className="space-y-6 py-2 flex-1">
                                <div className="flex justify-between items-center text-xl font-black text-pink-600">
                                    <span>{board.total}</span>
                                    <span className="text-[10px] uppercase text-slate-400 italic">{t('registered')}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-50">
                                    <div
                                        className={board.isCS ? "bg-gradient-to-r from-orange-400 to-orange-600 h-full transition-all duration-1000" : "bg-gradient-to-r from-pink-500 to-purple-600 h-full transition-all duration-1000"}
                                        style={{ width: `${board.isCS ? csSignupPercentage : signupPercentage}%` }}
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 text-right uppercase tracking-widest">{board.isCS ? csSignupPercentage : signupPercentage}% {t('complete')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2 custom-scrollbar">
                                {board.data && board.data.length > 0 ? board.data.map((m, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <span className="font-bold text-slate-600 text-[11px] truncate mr-2">{idx + 1}. {m.username}</span>
                                        <span className="font-mono text-[9px] text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg font-bold shrink-0">
                                            {board.val ? board.val(m) : ''}
                                        </span>
                                    </div>
                                )) : <p className="text-[9px] text-slate-300 uppercase font-bold italic">{t('noData')}</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ✅ Settings Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-white/30 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white border border-pink-100 p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-2xl font-black text-slate-800 mb-6 uppercase italic">{t('commanderIntel')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('ign')}</label>
                                <input value={formData.username} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none" onChange={e => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('birthday')}</label>
                                <input type="date" value={formData.birthday} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none" onChange={e => setFormData({ ...formData, birthday: e.target.value })} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('totalPower')}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.total_hero_power === 0 ? "" : formData.total_hero_power}
                                    placeholder="0.0"
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => setFormData({ ...formData, total_hero_power: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('squad1Power')}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.squad_1_power === 0 ? "" : formData.squad_1_power}
                                    placeholder="0.0"
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => setFormData({ ...formData, squad_1_power: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('arenaPower')}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.arena_power === 0 ? "" : formData.arena_power}
                                    placeholder="0.0"
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => setFormData({ ...formData, arena_power: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('gender')}</label>
                                <select value={formData.gender} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none" onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('language')}</label>
                                <select
                                    value={formData.language}
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => {
                                        const newLang = e.target.value as Language;
                                        setFormData({ ...formData, language: newLang });
                                        setLanguage(newLang);
                                    }}
                                >
                                    <option value="en">English</option>
                                    <option value="zh">中文 (Chinese)</option>
                                    <option value="ja">日本語 (Japanese)</option>
                                    <option value="th">ไทย (Thai)</option>
                                    <option value="vi">Tiếng Việt (Vietnamese)</option>
                                </select>
                            </div>
                            <div className="flex flex-col md:col-span-2">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('bio')}</label>
                                <textarea value={formData.bio} rows={2} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none resize-none" onChange={e => setFormData({ ...formData, bio: e.target.value })} />
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col gap-2">
                            <button
                                disabled={isSubmitting}
                                onClick={async () => {
                                    if (!formData.username || !formData.bio || !formData.gender || formData.total_hero_power === 0 || formData.squad_1_power === 0) {
                                        alert("Please complete all mandatory fields: Name, Power, Gender, and Bio.");
                                        return;
                                    }

                                    try {
                                        setIsSubmitting(true);
                                        // Ensure we have a valid user ID before attempting save
                                        if (!user?.id) {
                                            alert("Auth session error. Please refresh the page.");
                                            return;
                                        }

                                        console.log("Saving member data for:", user.id, formData);

                                        // 🧪 Intelligent Scaling: Handle both Millions (173.9) and Raw (173935040)
                                        const smartScale = (val: number) => {
                                            if (val <= 0) return 0;
                                            // If input is less than 5000, it's definitely the "Million" format (e.g. 200.0)
                                            return val < 5000 ? Math.round(val * 1000000) : Math.round(val);
                                        };

                                        const finalTHP = smartScale(formData.total_hero_power);
                                        const finalS1P = smartScale(formData.squad_1_power);
                                        const finalAP = smartScale(formData.arena_power);

                                        // 🚨 Tactical Validation: Ensure it's at least 10M
                                        if (finalTHP < 10000000) {
                                            alert("Minimum power required is 10M.");
                                            setIsSubmitting(false);
                                            return;
                                        }

                                        // 🧪 Attempt 1: Full Save (Raw Integer Storage)
                                        const fullSaveData = {
                                            user_id: user.id,
                                            username: formData.username,
                                            total_hero_power: finalTHP,
                                            squad_1_power: finalS1P,
                                            arena_power: finalAP,
                                            bio: formData.bio,
                                            gender: formData.gender,
                                            birthday: formData.birthday,
                                            language: formData.language
                                        };

                                        const { error: fullError } = await supabase
                                            .from('members')
                                            .upsert(fullSaveData, { onConflict: 'user_id' });

                                        if (!fullError) {
                                            console.log("Full Save successful!");
                                            setIsEditing(false);
                                            window.location.reload();
                                            return;
                                        }

                                        console.warn("Full Save failed, checking for missing columns...", fullError);

                                        // 🧪 Attempt 2: Safe Save (Basic fields only)
                                        // Some columns might not exist in the database yet
                                        if (fullError.message.includes("column") || fullError.code === "42703") {
                                            const { error: safeError } = await supabase
                                                .from('members')
                                                .upsert({
                                                    user_id: user.id,
                                                    username: formData.username,
                                                    total_hero_power: finalTHP,
                                                    squad_1_power: finalS1P,
                                                    arena_power: finalAP
                                                }, { onConflict: 'user_id' });

                                            if (!safeError) {
                                                alert("Partial Save: IGN and Power saved, but some fields (Bio/Gender/Lang) might be missing from the database schema.");
                                                setIsEditing(false);
                                                window.location.reload();
                                                return;
                                            }

                                            alert("Database Error: " + safeError.message);
                                        } else {
                                            alert("Save Error: " + fullError.message);
                                        }
                                    } catch (err: any) {
                                        console.error("Save Exception:", err);
                                        alert("Critical Error: " + err.message);
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                className={`w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer transition-all ${isSubmitting ? 'opacity-50 cursor-wait' : 'hover:bg-slate-800'}`}
                            >
                                {isSubmitting ? t('syncing') : t('saveRecords')}
                            </button>

                        </div>
                    </div>
                </div>
            )}
            {/* ✅ Rank Assignment Modal */}
            {showRankModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 p-8 rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800 uppercase italic">Rank Assignment</h3>
                            <button onClick={() => setShowRankModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-black rounded-full w-10 h-10 flex items-center justify-center transition-colors">
                                X
                            </button>
                        </div>

                        <div className="overflow-x-auto w-full border border-slate-100 rounded-3xl">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                        <th className="px-6 py-4">{t('memberName')}</th>
                                        <th className="px-6 py-4">{t('power')}</th>
                                        <th className="px-6 py-4">Current Rank</th>
                                        <th className="px-6 py-4 text-right">Assign New Rank</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-bold text-slate-700">
                                    {members.map(m => (
                                        <tr key={m.user_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 uppercase tracking-tighter text-slate-900">{m.username}</td>
                                            <td className="px-6 py-4 font-mono text-pink-600">{displayPower(m.total_hero_power)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${m.role === 'R5' ? 'bg-orange-100 text-orange-600' :
                                                    m.role === 'R4' ? 'bg-red-100 text-red-600' :
                                                        m.role === 'R3' ? 'bg-blue-100 text-blue-600' :
                                                            m.role === 'R2' ? 'bg-green-100 text-green-600' :
                                                                'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {m.role || 'R1'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(m.role === 'R4' || m.role === 'R5') ? (
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-4 py-2 rounded-xl">🔒 Locked</span>
                                                ) : (
                                                    <select
                                                        className="bg-slate-100 border border-slate-200 outline-none rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors"
                                                        value={m.role || 'R1'}
                                                        onChange={async (e) => {
                                                            const newRole = e.target.value;
                                                            // Optimistic UI update
                                                            setMembers(members.map(member => member.user_id === m.user_id ? { ...member, role: newRole } : member));

                                                            const { error } = await supabase.from('members').update({ role: newRole }).eq('user_id', m.user_id);

                                                            if (error) {
                                                                alert("Failed to update rank: " + error.message);
                                                                // Revert on local state if failed
                                                                setMembers(members);
                                                            } else {
                                                                // Optional: log to audit_logs if needed
                                                                await supabase.from('audit_logs').insert({
                                                                    user_id: user?.id,
                                                                    username: currentUser?.username,
                                                                    action: `UPDATE_RANK_TO_${newRole}`,
                                                                    details: { context: `R4 Hub Control Panel - Target: ${m.username}` }
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <option value="R1">R1 (Member)</option>
                                                        <option value="R2">R2 (Veteran)</option>
                                                        <option value="R3">R3 (Officer)</option>
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
