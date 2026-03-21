"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';
import { getWeekKey } from '../../lib/utils';

interface VSScore {
    user_id: string;
    username: string;
    week_key: string;
    d1: number;
    d2: number;
    d3: number;
    d4: number;
    d5: number;
    d6: number;
}

interface VSSettings {
    vs_strategy: string;
    vs_active_days: boolean[];
    current_vs_week: string;
}

export default function AllianceDuelPage() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();

    const [hasMounted, setHasMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [settings, setSettings] = useState<VSSettings>({
        vs_strategy: 'save',
        vs_active_days: [true, true, true, true, false, false],
        current_vs_week: getWeekKey()
    });

    const [allScores, setAllScores] = useState<VSScore[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [personalScore, setPersonalScore] = useState<VSScore | null>(null);

    const [selectedDay, setSelectedDay] = useState(0);
    const [scoreInput, setScoreInput] = useState('');

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const fetchData = async () => {
        if (!user) return;

        // 1. Fetch settings (Strategy + Active Week)
        const { data: sData } = await supabase.from('settings').select('vs_strategy, vs_active_days, current_vs_week').eq('id', 1).single();
        let currentWeek = '2026-W08';
        if (sData) {
            currentWeek = sData.current_vs_week || '2026-W08';
            setSettings({
                vs_strategy: sData.vs_strategy || 'save',
                vs_active_days: sData.vs_active_days || [true, true, true, true, false, false],
                current_vs_week: currentWeek
            });
        }

        // 2. Fetch member role & username
        const { data: mData } = await supabase.from('members').select('role, username').eq('user_id', user.id).single();
        if (mData) setCurrentUserRole(mData.role || 'Member');

        // 3. Fetch scores for the ACTIVE week only
        const { data: scData } = await supabase.from('vs_weekly_scores').select('*').eq('week_key', currentWeek);

        if (scData) {
            const typedScores = scData as VSScore[];
            setAllScores(typedScores);

            const me = typedScores.find(s => s.user_id === user.id);
            if (me) {
                setPersonalScore(me);
                const dayKey = `d${selectedDay + 1}` as keyof VSScore;
                setScoreInput(me[dayKey]?.toString() || '0');
            } else if (mData) {
                // Return dummy object if player hasn't posted yet
                setPersonalScore({
                    user_id: user.id,
                    username: mData.username,
                    week_key: currentWeek,
                    d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0
                });
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        if (hasMounted && user) fetchData();
    }, [hasMounted, user, selectedDay]);

    const calculatePriority = (score: number, dayIndex: number, strategy: string, allScores: VSScore[]) => {
        const s = score / 1000000;
        if (s === 0) return 0;
        if (strategy === 'save') {
            if (s === 7.2) return 2.0;
            if (s < 3.6) return 1.0;
            if (s >= 3.6 && s <= 10.8) return Math.max(1.0, 2.0 - (Math.abs(7.2 - s) / 3.6));
            if (s > 10.8 && s <= 14.8) return Math.max(0, 1.0 - ((s - 10.8) / 4.0));
            return 0;
        } else {
            const dayKey = `d${dayIndex + 1}` as keyof VSScore;
            const dayScores = allScores.map(m => (m[dayKey] as number) / 1000000).filter(v => v > 0);
            if (dayScores.length === 0) return 1.0;
            const max = Math.max(...dayScores), min = Math.min(...dayScores);
            const avg = dayScores.reduce((a, b) => a + b, 0) / dayScores.length;
            if (s >= avg) return max === avg ? 1.0 : 1.0 + ((s - avg) / (max - avg));
            return avg === min ? 0.0 : (s - min) / (avg - min);
        }
    };

    const getPriorityColor = (pts: number) => {
        if (pts >= 1.8) return 'text-emerald-500';
        if (pts >= 1.0) return 'text-blue-500';
        if (pts > 0) return 'text-yellow-600';
        return 'text-red-500';
    };

    const rankedMembers = useMemo(() => {
        return allScores.map(m => {
            let total = 0;
            settings.vs_active_days.forEach((active, idx) => {
                if (active) {
                    const dayKey = `d${idx + 1}` as keyof VSScore;
                    total += calculatePriority(m[dayKey] as number, idx, settings.vs_strategy, allScores);
                }
            });
            return { ...m, totalPriority: total };
        }).sort((a, b) => b.totalPriority - a.totalPriority);
    }, [allScores, settings]);

    const handleSaveScore = async () => {
        if (!user || !personalScore) return;
        setSaving(true);

        const cleanScore = parseInt(scoreInput.replace(/,/g, '')) || 0;
        let payload: VSScore = { ...personalScore };

        if (selectedDay === 6) { // User entered the TOTAL weekly score
            const sumD1toD5 = (payload.d1 || 0) + (payload.d2 || 0) + (payload.d3 || 0) + (payload.d4 || 0) + (payload.d5 || 0);
            // Calculate Day 6 as the difference
            payload.d6 = Math.max(0, cleanScore - sumD1toD5);
        } else {
            const dayKey = `d${selectedDay + 1}` as keyof VSScore;
            (payload[dayKey] as any) = cleanScore;
        }

        const { error } = await supabase.from('vs_weekly_scores').upsert(payload, { onConflict: 'user_id, week_key' });

        if (!error) {
            await fetchData();
            // If they just saved total, update the input field to show the calculated D6 or the total they just entered
            if (selectedDay === 6) setScoreInput(cleanScore.toString());
        }
        setSaving(false);
    };

    const updateSettings = async (newSets: Partial<VSSettings>) => {
        if (currentUserRole !== 'R4') return;
        const updated = { ...settings, ...newSets };
        const { error } = await supabase.from('settings').update({
            vs_strategy: updated.vs_strategy,
            vs_active_days: updated.vs_active_days,
            current_vs_week: updated.current_vs_week
        }).eq('id', 1);
        if (!error) setSettings(updated);
    };

    if (!hasMounted) return null;
    if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse">{t('identifying')}</div>;

    const isR4 = currentUserRole === 'R4';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-32 pt-8 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">

                <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-10">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">
                            <span className="text-pink-600">020</span> VS {t('allianceDuel')}
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">
                            {t('activeWeek').toUpperCase()} {settings.current_vs_week} — {settings.vs_strategy === 'save' ? t('targetPoints') : t('mvpMode')}
                        </p>
                    </div>

                    {isR4 && (
                        <div className="flex flex-wrap gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <span className="text-[10px] block text-slate-400 uppercase font-black px-1 mb-2 tracking-widest">{t('activeWeek')}</span>
                                <input
                                    type="text"
                                    value={settings.current_vs_week}
                                    onChange={(e) => updateSettings({ current_vs_week: e.target.value })}
                                    className="bg-transparent text-sm font-black focus:outline-none text-blue-600 uppercase border-b border-slate-100"
                                />
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <span className="text-[10px] block text-slate-400 uppercase font-black px-1 mb-2 tracking-widest">{t('vsStrategy')}</span>
                                <select
                                    value={settings.vs_strategy}
                                    onChange={(e) => updateSettings({ vs_strategy: e.target.value })}
                                    className="bg-transparent text-sm font-black focus:outline-none cursor-pointer text-pink-600 uppercase"
                                >
                                    <option value="save">{t('saveWeek')}</option>
                                    <option value="push">{t('pushWeek')}</option>
                                </select>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <span className="text-[10px] block text-slate-400 uppercase font-black px-1 mb-2 tracking-widest">{t('activeMonitoringDays')}</span>
                                <div className="flex gap-4 px-1">
                                    {[0, 1, 2, 3, 4, 5].map(day => (
                                        <label key={day} className="flex items-center gap-2 cursor-pointer hover:text-pink-600 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={settings.vs_active_days[day]}
                                                onChange={(e) => {
                                                    const newDays = [...settings.vs_active_days];
                                                    newDays[day] = e.target.checked;
                                                    updateSettings({ vs_active_days: newDays });
                                                }}
                                                className="rounded border-slate-300 text-pink-600 focus:ring-pink-500 w-4 h-4 cursor-pointer"
                                            />
                                            <span className="text-[10px] font-black uppercase">{t('dayAbbr')}{day + 1}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Sidebar: Score Input + Strategy Info + Rules */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Score Submission */}
                        <div className="bg-white p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden relative">
                            {saving && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center animate-pulse"><div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div></div>}
                            <h2 className="text-xs font-black text-pink-600 uppercase tracking-widest mb-6 italic border-b border-pink-50 pb-2">{t('submitDailyScore')}</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-black uppercase mb-3 block">{t('selectDay')}</label>
                                    <div className="grid grid-cols-6 gap-1">
                                        {[0, 1, 2, 3, 4].map(d => (
                                            <button key={d} onClick={() => setSelectedDay(d)} className={`h-10 rounded-xl text-[10px] font-black transition-all border ${selectedDay === d ? 'bg-pink-600 text-white border-transparent' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{t('dayAbbr')}{d + 1}</button>
                                        ))}
                                        <button onClick={() => setSelectedDay(6)} className={`h-10 rounded-xl text-[8px] font-black transition-all border ${selectedDay === 6 ? 'bg-blue-600 text-white border-transparent' : 'bg-blue-50 text-blue-400 border-blue-100'}`}>{t('totalWeekly').toUpperCase()}</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-black uppercase mb-3 block">
                                        {selectedDay === 6 ? t('totalWeekly') : t('score')}
                                    </label>
                                    <input type="text" value={scoreInput} onChange={(e) => setScoreInput(e.target.value)} placeholder="0" className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-lg md:text-xl font-black text-slate-800" />
                                    {selectedDay === 6 && (
                                        <p className="text-[9px] text-blue-500 font-bold uppercase mt-2 italic">
                                            ⚠️ {t('autoCalculateD6')}
                                        </p>
                                    )}
                                </div>
                                <button onClick={handleSaveScore} disabled={!scoreInput || saving} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg cursor-pointer">{t('saveScore')}</button>
                            </div>
                        </div>

                        {/* Strategy Info Box */}
                        <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-2xl text-white">
                            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{t('strategyReport')}</h3>
                            <p className="text-sm font-bold leading-relaxed">
                                {settings.vs_strategy === 'save'
                                    ? t('disciplineMode')
                                    : t('pushModeActive')}
                            </p>
                        </div>

                        {/* Tactical Protocol Section (Rules) */}
                        <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-200 shadow-xl">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 italic border-b border-slate-100 pb-2">{t('tacticalProtocol')}</h3>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-pink-600 uppercase mb-2">{t('saveWeekRules')}</h4>
                                    <ul className="text-[10px] font-bold text-slate-500 space-y-2 uppercase leading-tight">
                                        <li className="flex justify-between"><span>{t('perfectScore')}</span> <span className="text-pink-600">2.000 Pts</span></li>
                                        <li className="flex justify-between"><span>{t('below36M')}</span> <span className="text-slate-400">1.000 Pts</span></li>
                                        <li className="flex justify-between"><span>{t('between36M108M')}</span> <span className="text-blue-500">1.0 - 2.0 Pts</span></li>
                                        <li className="flex justify-between"><span>{t('above148M')}</span> <span className="text-red-500">0.000 Pts</span></li>
                                    </ul>
                                    <p className="text-[9px] text-slate-400 italic mt-2 leading-tight">{t('saveWeekObjective')}</p>
                                </div>

                                <div className="pt-4 border-t border-slate-50">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase mb-2">{t('pushWeekRules')}</h4>
                                    <ul className="text-[10px] font-bold text-slate-500 space-y-2 uppercase leading-tight">
                                        <li className="flex justify-between"><span>{t('topAllianceScorer')}</span> <span className="text-blue-600">2.000 Pts</span></li>
                                        <li className="flex justify-between"><span>{t('averageAllianceScorer')}</span> <span className="text-slate-500">1.000 Pts</span></li>
                                        <li className="flex justify-between"><span>{t('lowestAllianceScorer')}</span> <span className="text-red-500">0.000 Pts</span></li>
                                    </ul>
                                    <p className="text-[9px] text-slate-400 italic mt-2 leading-tight">{t('pushWeekObjective')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Leaderboard */}
                    <div className="lg:col-span-8 bg-white rounded-3xl md:rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-black text-slate-900 uppercase tracking-tight text-lg md:text-xl italic">{t('priority')} {t('rank')}</h2>
                            <p className="text-[10px] text-slate-400 uppercase font-black">{allScores.length} {t('commandersActive')}</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white shadow-sm">
                                    <tr className="text-[10px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-100">
                                        <th className="px-8 py-5">{t('rank')}</th>
                                        <th className="px-8 py-5">{t('commander')}</th>
                                        {[0, 1, 2, 3, 4, 5].map(d => settings.vs_active_days[d] && <th key={d} className="px-6 py-5 text-center">{t('dayAbbr')}{d + 1}</th>)}
                                        <th className="px-6 py-5 text-center text-blue-600 italic">{t('totalWeekly')}</th>
                                        <th className="px-8 py-5 text-right text-pink-600 italic">{t('priority')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rankedMembers.map((m, idx) => (
                                        <tr key={m.user_id} className={`hover:bg-pink-50/30 transition-colors ${m.user_id === user?.id ? 'bg-pink-50/20' : ''}`}>
                                            <td className="px-8 py-6 font-black text-xs text-slate-300">#{idx + 1}</td>
                                            <td className="px-8 py-6 font-black uppercase text-sm tracking-tighter">{m.username}</td>
                                            {[0, 1, 2, 3, 4, 5].map(d => settings.vs_active_days[d] && (
                                                <td key={d} className="px-6 py-6 text-center">
                                                    <div className="text-[10px] font-black text-slate-400">{(m[`d${d + 1}` as keyof VSScore] as number / 1000000).toFixed(1)}M</div>
                                                    <div className={`text-[9px] font-black italic mt-1 ${getPriorityColor(calculatePriority(m[`d${d + 1}` as keyof VSScore] as number, d, settings.vs_strategy, allScores))}`}>
                                                        {calculatePriority(m[`d${d + 1}` as keyof VSScore] as number, d, settings.vs_strategy, allScores).toFixed(3)}
                                                    </div>
                                                </td>
                                            ))}
                                            <td className="px-6 py-6 text-center bg-blue-50/10">
                                                <div className="text-[10px] font-black text-blue-600">
                                                    {((m.d1 + m.d2 + m.d3 + m.d4 + m.d5 + m.d6) / 1000000).toFixed(1)}M
                                                </div>
                                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">TOTAL</div>
                                            </td>
                                            <td className="px-4 md:px-8 py-6 text-right font-black text-pink-600 text-2xl md:text-3xl italic">{m.totalPriority.toFixed(3)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
