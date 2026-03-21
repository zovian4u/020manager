"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';
import Link from 'next/link';
import { getWeekKey } from '../../lib/utils';

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
    const [weekKey, setWeekKey] = useState(getWeekKey());
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
        const currentWeek = sData?.current_vs_week || getWeekKey();
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

        const { data: schData = [] } = await supabase.from('train_schedule').select('*').eq('week_key', currentWeek);
        setSchedule(schData || []);

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
    if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse h-screen flex items-center justify-center bg-[#0a0f1d]">{t('identifying')}</div>;

    const isAj = currentUserMember?.username?.includes('ᴬᴶ') || currentUserMember?.username?.includes('ThinkK');
    const isBaby = currentUserMember?.username?.includes('Baby');

    return (
        <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] bg-[#0a0f1d] text-white flex flex-col overflow-hidden relative font-sans">
            <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-amber-500/15 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-blue-500/15 rounded-full blur-[100px]" />
            </div>

            <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full relative z-10 p-0.5 md:p-3 pb-28 md:pb-6 overflow-hidden">
                <header className="flex justify-between items-center border-b border-white/10 pb-0.5 md:pb-2 gap-2 mb-0.5 shrink-0 px-1 md:px-0">
                    <div className="min-w-0">
                        <h1 className="text-sm md:text-3xl font-black text-white italic tracking-tighter uppercase leading-none truncate ml-1">
                             020 {t('train').toUpperCase()}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden md:block text-slate-500 text-[9px] font-black uppercase tracking-widest italic leading-none">{weekKey}</span>
                        <Link href="/hub" className="p-1 md:p-2 bg-white/5 border border-white/10 text-white rounded-lg font-black text-[7px] md:text-[8px] uppercase tracking-widest transition-all flex items-center gap-2 hover:bg-white/10 shadow-lg">
                            <svg className="w-3 h-3 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </Link>
                    </div>
                </header>

                {/* Grid Header Info - Better space utilization */}
                <div className="grid grid-cols-10 gap-0.5 mb-1 shrink-0 px-0.5 md:px-0">
                    <div className="col-span-1" />
                    <div className="col-span-3 px-1.5 md:px-3 py-1 md:py-1.5 border border-amber-500/30 bg-amber-500/10 rounded-lg md:rounded-xl backdrop-blur-md min-h-[55px] md:min-h-[60px] flex flex-col justify-center">
                        <h4 className="text-[11px] md:text-sm font-black uppercase text-amber-500 italic tracking-widest mb-0.5 leading-none">{t('allianceTrain')}</h4>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-300 uppercase leading-tight italic opacity-90 break-words">{t('allianceTrainDesc')}</p>
                    </div>
                    <div className="col-span-3 px-1.5 md:px-3 py-1 md:py-1.5 border border-blue-500/30 bg-blue-500/10 rounded-lg md:rounded-xl backdrop-blur-md min-h-[55px] md:min-h-[60px] flex flex-col justify-center">
                        <h4 className="text-[11px] md:text-sm font-black uppercase text-blue-400 italic tracking-widest mb-0.5 leading-none">AJ VIP</h4>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-300 uppercase leading-tight italic opacity-90 break-words">{t('ajTrainDesc')}</p>
                    </div>
                    <div className="col-span-3 px-1.5 md:px-3 py-1 md:py-1.5 border border-pink-500/30 bg-pink-500/10 rounded-lg md:rounded-xl backdrop-blur-md min-h-[55px] md:min-h-[60px] flex flex-col justify-center">
                        <h4 className="text-[11px] md:text-sm font-black uppercase text-pink-400 italic tracking-widest mb-0.5 leading-none">BABY VIP</h4>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-300 uppercase leading-tight italic opacity-90 break-words">{t('babyTrainDesc')}</p>
                    </div>
                </div>

                <div className="flex-1 relative rounded-lg md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col bg-slate-950 min-h-0">
                    <div className="absolute inset-0 pointer-events-none opacity-25 h-full w-full"
                        style={{ backgroundImage: `url('/images/train/train.jpg')`, backgroundPosition: 'center', backgroundSize: 'cover' }}
                    />
                    <div className="relative z-10 flex flex-col h-full bg-slate-950/75 backdrop-blur-[2px]">
                        {/* Compact Table Header */}
                        <div className="grid grid-cols-10 gap-0.5 bg-black/60 border-b border-white/10 sticky top-0 z-20 shrink-0">
                            <div className="col-span-1 p-1 md:p-2 text-center border-r border-white/5"><span className="text-[5px] md:text-[9px] font-black text-slate-500 uppercase leading-none">DAY</span></div>
                            <div className="col-span-3 p-1 md:p-2 text-center border-r border-white/5"><span className="text-[6px] md:text-[10px] font-black text-amber-500 uppercase leading-none tracking-widest">ALLIANCE</span></div>
                            <div className="col-span-3 p-1 md:p-2 text-center border-r border-white/5"><span className="text-[6px] md:text-[10px] font-black text-blue-400 uppercase leading-none tracking-widest">THINK VIP</span></div>
                            <div className="col-span-3 p-1 md:p-2 text-center"><span className="text-[6px] md:text-[10px] font-black text-pink-400 uppercase leading-none tracking-widest">BABY VIP</span></div>
                        </div>
                        {/* Content optimized for "Zero Scroll" and "Full Space" */}
                        <div className="flex-1 flex flex-col divide-y divide-white/5 min-h-0">
                            {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                const dayKey = DAYS[dayIdx];
                                const aRec = (schedule || []).find(s => s.day_index === dayIdx && s.train_type === 'alliance');
                                const ajRec = (schedule || []).find(s => s.day_index === dayIdx && s.train_type === 'aj');
                                const bRec = (schedule || []).find(s => s.day_index === dayIdx && s.train_type === 'baby');
                                return (
                                    <div key={dayIdx} className="grid grid-cols-10 gap-0.5 flex-1 hover:bg-white/[0.04] transition-colors items-stretch min-h-0 overflow-hidden group">
                                        <div className="col-span-1 flex flex-col items-center justify-center bg-black/40 border-r border-white/10">
                                            <span className="text-[7px] md:text-[10px] font-black text-slate-600 uppercase leading-none mb-0.5">{t(dayKey as any).slice(0, 3)}</span>
                                            <span className="text-[10px] md:text-[18px] font-black text-white italic tracking-tighter leading-none">{dayIdx === 0 ? 7 : dayIdx}</span>
                                        </div>
                                        {[
                                            { rec: aRec, mode: 'conductor' as const, type: 'alliance' as const, canEdit: isR4 },
                                            { rec: ajRec, mode: 'guardian' as const, type: 'aj' as const, canEdit: isR4 || isAj },
                                            { rec: bRec, mode: 'guardian' as const, type: 'baby' as const, canEdit: isR4 || isBaby }
                                        ].map((col, idx) => {
                                            const member = members.find(m => m.user_id === (col.mode === 'conductor' ? col.rec?.conductor_id : col.rec?.guardian_id));
                                            return (
                                                <div key={idx} className={`col-span-3 px-1.5 md:px-3 border-r border-white/5 flex items-center justify-between min-w-0 overflow-hidden gap-1`}>
                                                    <span className="text-[11px] md:text-lg font-black uppercase text-white truncate leading-none md:drop-shadow-lg flex-1">
                                                        {member?.username || '---'}
                                                    </span>
                                                    {col.canEdit && (
                                                        <button onClick={() => handleAssign(dayIdx, col.type, col.mode)} className="w-[18px] h-[18px] md:w-8 md:h-8 bg-white/5 hover:bg-white text-white/40 hover:text-black rounded md:rounded-lg border border-white/10 flex items-center justify-center transition-all md:opacity-0 group-hover:opacity-100 shrink-0 ml-auto"><svg className="w-2.5 h-2.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg></button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {showModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-8 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in">
                        <div className="bg-[#0a0f1d] border border-white/10 w-full max-w-xl rounded-[2rem] md:rounded-[3rem] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                <div><h3 className="text-xl font-black text-white uppercase italic leading-none">{t('selectMember')}</h3><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">{activeSlot?.mode === 'conductor' ? t('conductor') : "VIP Guest"} — Day {activeSlot?.day === 0 ? 7 : activeSlot?.day}</p></div>
                                <button onClick={() => setShowModal(false)} className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white hover:bg-red-500 transition-transform active:scale-95"><span>✕</span></button>
                            </div>
                            <div className="p-4 md:p-6 space-y-4">
                                <input type="text" placeholder="SEARCH COMMANDER..." className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-amber-500 text-white font-black uppercase text-[11px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                <div className="flex gap-2"><button onClick={() => setSortMode('power')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${sortMode === 'power' ? 'bg-amber-600 text-white' : 'bg-white/5 text-slate-500'}`}>{t('power')}</button><button onClick={() => setSortMode('vs')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${sortMode === 'vs' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}>{t('vsScore')}</button></div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {sortedMembers.map(m => (
                                    <button key={m.user_id} onClick={() => confirmAssignment(m)} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group">
                                        <div className="flex items-center gap-4 text-left"><div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center font-black text-slate-600 text-[10px]">020</div><div className="min-w-0"><span className="block font-black uppercase text-sm text-white truncate">{m.username}</span><span className="text-[9px] font-bold text-slate-600 uppercase italic leading-none">{m.role}</span></div></div>
                                        <div className="text-right shrink-0"><span className="block font-black text-amber-500 text-xs">{(m.total_hero_power / 1000000).toFixed(1)}M</span></div>
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
