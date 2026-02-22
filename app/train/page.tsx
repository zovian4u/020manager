"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';
import Link from 'next/link';

interface TrainRecord {
    id?: number;
    week_key: string;
    day_index: number;
    train_type: 'alliance' | 'aj' | 'baby';
    conductor_id: string | null;
    guardian_id: string | null;
    conductor_name?: string;
    guardian_name?: string;
}

interface Member {
    user_id: string;
    username: string;
    total_hero_power: number;
    role: string;
    vs_priority?: number;
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function TrainPage() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();

    const [hasMounted, setHasMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<Member[]>([]);
    const [schedule, setSchedule] = useState<TrainRecord[]>([]);
    const [weekKey, setWeekKey] = useState('2026-W08');
    const [isR4, setIsR4] = useState(false);
    const [currentUserMember, setCurrentUserMember] = useState<Member | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [activeSlot, setActiveSlot] = useState<{ day: number, type: 'alliance' | 'aj' | 'baby', mode: 'conductor' | 'guardian' } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState<'power' | 'vs'>('power');

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        const { data: sData } = await supabase.from('settings').select('current_vs_week').eq('id', 1).single();
        const currentWeek = sData?.current_vs_week || '2026-W08';
        setWeekKey(currentWeek);

        const { data: mData } = await supabase.from('members').select('user_id, username, total_hero_power, role');
        const { data: vData } = await supabase.from('vs_weekly_scores').select('user_id, d1, d2, d3, d4, d5, d6').eq('week_key', currentWeek);

        if (mData) {
            const memberList: Member[] = mData.map(m => {
                const vs = vData?.find(v => v.user_id === m.user_id);
                const priority = vs ? (vs.d1 + vs.d2 + vs.d3 + vs.d4 + vs.d5 + vs.d6) : 0;
                return { ...m, vs_priority: priority };
            });
            setMembers(memberList);

            const me = memberList.find(m => m.user_id === user.id);
            if (me) {
                setCurrentUserMember(me);
                setIsR4(me.role === 'R4');
            }
        }

        const { data: schData } = await supabase.from('train_schedule').select('*').eq('week_key', currentWeek);
        if (schData) setSchedule(schData);

        setLoading(false);
    };

    useEffect(() => {
        if (hasMounted && user) fetchData();
    }, [hasMounted, user]);

    const handleAssign = (day: number, type: 'alliance' | 'aj' | 'baby', mode: 'conductor' | 'guardian') => {
        setActiveSlot({ day, type, mode });
        setShowModal(true);
    };

    const confirmAssignment = async (m: Member) => {
        if (!activeSlot) return;

        const updateData: Partial<TrainRecord> = {
            week_key: weekKey,
            day_index: activeSlot.day,
            train_type: activeSlot.type,
            [activeSlot.mode === 'conductor' ? 'conductor_id' : 'guardian_id']: m.user_id
        };

        const { error } = await supabase.from('train_schedule').upsert(updateData, { onConflict: 'week_key, day_index, train_type' });

        if (!error) {
            fetchData();
            setShowModal(false);
        } else {
            alert(error.message);
        }
    };

    const sortedMembers = useMemo(() => {
        let list = [...members];
        if (searchQuery) {
            list = list.filter(m => m.username.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (sortMode === 'power') {
            list.sort((a, b) => b.total_hero_power - a.total_hero_power);
        } else {
            list.sort((a, b) => (b.vs_priority || 0) - (a.vs_priority || 0));
        }
        return list;
    }, [members, searchQuery, sortMode]);

    if (!hasMounted) return null;
    if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse">{t('identifying')}</div>;

    const isAj = currentUserMember?.username?.includes('ᴬᴶ') || currentUserMember?.username?.includes('ThinkK');
    const isBaby = currentUserMember?.username?.includes('Baby');

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-8 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">
                            <span className="text-amber-600">020</span> {t('trainConductor')}
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">
                            {t('activeWeek').toUpperCase()}: {weekKey} — {t('incubateVictory')}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/hub" className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            {t('backToHub')}
                        </Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem]">
                        <h3 className="text-amber-800 font-black text-xs uppercase italic mb-2">🏷️ {t('dailyAllianceTrain')}</h3>
                        <p className="text-[10px] text-amber-600/70 font-bold uppercase leading-relaxed">{t('allianceTrainDesc')}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem]">
                        <h3 className="text-blue-800 font-black text-xs uppercase italic mb-2">💎 ᴬᴶ ThinkK ʚଓ's {t('specialTrain')}</h3>
                        <p className="text-[10px] text-blue-600/70 font-bold uppercase leading-relaxed">{t('ajTrainDesc')}</p>
                    </div>
                    <div className="bg-pink-50 border border-pink-100 p-6 rounded-[2rem]">
                        <h3 className="text-pink-800 font-black text-xs uppercase italic mb-2">🌸 Baby ʚଓ奥特曼's {t('specialTrain')}</h3>
                        <p className="text-[10px] text-pink-600/70 font-bold uppercase leading-relaxed">{t('babyTrainDesc')}</p>
                    </div>
                </div>

                <div
                    className="relative rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[600px] flex flex-col bg-slate-900"
                >
                    {/* Main Image Layer - Crisp and Clear */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: `url('/images/train/train.jpg')`,
                            backgroundPosition: 'center center',
                            backgroundSize: 'cover',
                            backgroundRepeat: 'no-repeat'
                        }}
                    />

                    {/* Dashboard Content - No blur, clear background */}
                    <div className="relative z-10 flex flex-col h-full bg-slate-900/10">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/20">
                            <h2 className="font-black text-white uppercase tracking-tight text-4xl italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t('mon')} - {t('sun')} {t('train')}</h2>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-black/40 sticky top-0 z-20 shadow-sm border-b border-white/10">
                                    <tr className="text-[10px] uppercase text-slate-400 font-black tracking-widest">
                                        <th className="px-8 py-5 w-40">{t('dayAbbr')}</th>
                                        <th className="px-8 py-5">{t('dailyAllianceTrain')}</th>
                                        <th className="px-8 py-5 text-blue-600">ᴬᴶ ThinkK ʚଓ's {t('train')}</th>
                                        <th className="px-8 py-5 text-pink-600">Baby ʚଓ奥特曼's {t('train')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/30">
                                    {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
                                        const dayKey = DAYS[dayIdx];
                                        return (
                                            <tr key={dayIdx} className="hover:bg-black/60 transition-colors border-b border-white/10 bg-black/40">
                                                <td className="px-8 py-6">
                                                    <span className="text-xs font-black uppercase tracking-widest text-slate-300 block mb-1 drop-shadow-md">{t(dayKey as any)}</span>
                                                    <span className="text-xl font-black text-white italic uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{t(dayKey as any).slice(0, 3)}</span>
                                                </td>

                                                <td className="px-8 py-6">
                                                    {(() => {
                                                        const record = schedule.find(s => s.day_index === dayIdx && s.train_type === 'alliance');
                                                        const cond = members.find(m => m.user_id === record?.conductor_id);
                                                        return (
                                                            <div className="flex items-center justify-between group min-h-[40px]">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black uppercase text-amber-400 mb-1 drop-shadow-md font-outline-sm">{t('conductor')}</span>
                                                                    <span className="text-sm font-black uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] bg-black/20 px-2 py-1 rounded">{cond?.username || '---'}</span>
                                                                </div>
                                                                {isR4 && (
                                                                    <button onClick={() => handleAssign(dayIdx, 'alliance', 'conductor')} className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-white/20 text-white rounded-lg text-[9px] font-black uppercase hover:bg-amber-600 hover:text-white transition-all border border-white/20">
                                                                        {t('edit')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>

                                                <td className="px-8 py-6 border-l border-white/10">
                                                    {(() => {
                                                        const record = schedule.find(s => s.day_index === dayIdx && s.train_type === 'aj');
                                                        const guard = members.find(m => m.user_id === record?.guardian_id);
                                                        return (
                                                            <div className="flex items-center justify-between group min-h-[40px]">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black uppercase text-blue-400 mb-1 drop-shadow-md">{t('vipPassenger')}</span>
                                                                    <span className="text-sm font-black uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] bg-black/20 px-2 py-1 rounded">{guard?.username || '---'}</span>
                                                                </div>
                                                                {(isR4 || isAj) && (
                                                                    <button onClick={() => handleAssign(dayIdx, 'aj', 'guardian')} className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-white/20 text-white rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all border border-white/20">
                                                                        {t('edit')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>

                                                <td className="px-8 py-6 border-l border-white/10">
                                                    {(() => {
                                                        const record = schedule.find(s => s.day_index === dayIdx && s.train_type === 'baby');
                                                        const guard = members.find(m => m.user_id === record?.guardian_id);
                                                        return (
                                                            <div className="flex items-center justify-between group min-h-[40px]">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black uppercase text-pink-400 mb-1 drop-shadow-md">{t('vipPassenger')}</span>
                                                                    <span className="text-sm font-black uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] bg-black/20 px-2 py-1 rounded">{guard?.username || '---'}</span>
                                                                </div>
                                                                {(isR4 || isBaby) && (
                                                                    <button onClick={() => handleAssign(dayIdx, 'baby', 'guardian')} className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-white/20 text-white rounded-lg text-[9px) font-black uppercase hover:bg-pink-600 hover:text-white transition-all border border-white/20">
                                                                        {t('edit')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {showModal && (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
                        <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">{t('selectMember')}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                        {activeSlot?.mode === 'conductor' ? t('conductor') : t('guardian')} — {activeSlot?.type === 'alliance' ? t('dailyAllianceTrain') : activeSlot?.type === 'aj' ? "ᴬᴶ ThinkK ʚଓ's Train" : "Baby ʚଓ奥特曼's Train"}
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-600 transition-colors">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            <div className="p-6 bg-white flex flex-col gap-4 sticky top-0 z-10 border-b border-slate-50">
                                <input
                                    type="text"
                                    placeholder="Search commander..."
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-amber-500 font-bold uppercase text-xs text-slate-900"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setSortMode('power')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortMode === 'power' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>{t('power')}</button>
                                    <button onClick={() => setSortMode('vs')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortMode === 'vs' ? 'bg-pink-600 text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>{t('vsScore')}</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {sortedMembers.map(m => (
                                    <button
                                        key={m.user_id}
                                        onClick={() => confirmAssignment(m)}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                                    >
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400 text-xs">020</div>
                                            <div>
                                                <span className="block font-black uppercase text-sm text-slate-800">{m.username}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{m.role}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-black text-pink-600 text-xs">{(m.total_hero_power / 1000000).toFixed(1)}M</span>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase italic">Priority: {(m.vs_priority || 0).toLocaleString()}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
