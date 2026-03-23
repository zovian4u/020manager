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
    birthday?: string;
}

interface TrainSettings {
    train_mvp_ids: string[];
    train_powerful_ids: string[];
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0];

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
    const [trainSettings, setTrainSettings] = useState<TrainSettings>({ train_mvp_ids: [], train_powerful_ids: [] });
    const [showMgmtModal, setShowMgmtModal] = useState(false);
    const [mgmtMode, setMgmtMode] = useState<'mvp' | 'powerful'>('mvp');
    const [currentWeekDates, setCurrentWeekDates] = useState<Date[]>([]);
    const [nextWeekKey, setNextWeekKey] = useState('');
    const [showNextWeek, setShowNextWeek] = useState(false);

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

        const { data: sData } = await supabase.from('settings').select('current_vs_week, train_mvp_ids, train_powerful_ids').eq('id', 1).single();
        const actualWeek = getWeekKey();
        
        // Auto-sync global week key if out of date
        if (sData && sData.current_vs_week !== actualWeek) {
            await supabase.from('settings').update({ current_vs_week: actualWeek }).eq('id', 1);
        }

        const currentWeek = actualWeek;
        setWeekKey(currentWeek);
        setTrainSettings({
            train_mvp_ids: sData?.train_mvp_ids || [],
            train_powerful_ids: sData?.train_powerful_ids || []
        });

        // Compute week dates for 14 days
        const [year, weekNum] = (sData?.current_vs_week || getWeekKey()).split('-W').map(Number);
        const jan4 = new Date(year, 0, 4);
        const monW1 = new Date(jan4.getTime());
        monW1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
        const weekStart = new Date(monW1.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
        
        const dates: Date[] = [];
        for (let i = 0; i < 14; i++) {
            const d = new Date(weekStart.getTime());
            d.setDate(weekStart.getDate() + i);
            dates.push(d);
        }
        setCurrentWeekDates(dates);

        // Next Week Key
        const nextWeekDate = new Date(weekStart.getTime());
        nextWeekDate.setDate(weekStart.getDate() + 7);
        const nextWeek = getWeekKey(nextWeekDate);
        setNextWeekKey(nextWeek);

        const { data: mData } = await supabase.from('members').select('user_id, username, total_hero_power, role, birthday');
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

        const { data: schData = [] } = await supabase.from('train_schedule').select('*').in('week_key', [currentWeek, nextWeek]);
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

    const toggleMgmtMember = async (userId: string) => {
        let newIds = mgmtMode === 'mvp' ? [...trainSettings.train_mvp_ids] : [...trainSettings.train_powerful_ids];
        const limit = mgmtMode === 'mvp' ? 3 : 7;

        if (newIds.includes(userId)) {
            newIds = newIds.filter(id => id !== userId);
        } else {
            if (newIds.length >= limit) {
                alert(`Maximum ${limit} members allowed for ${mgmtMode.toUpperCase()}`);
                return;
            }
            newIds.push(userId);
        }

        const nextSettings = { ...trainSettings, [mgmtMode === 'mvp' ? 'train_mvp_ids' : 'train_powerful_ids']: newIds };
        setTrainSettings(nextSettings);

        const { error } = await supabase.from('settings').update({
            [mgmtMode === 'mvp' ? 'train_mvp_ids' : 'train_powerful_ids']: newIds
        }).eq('id', 1);

        if (error) alert(error.message);
    };

    const autoGenerateSchedule = async () => {
        if (!window.confirm("This will overwrite the Alliance Train schedule for the next 14 days. Continue?")) return;
        if (currentWeekDates.length === 0) return;

        // 1. Fetch historical schedules to determine "oldest" trains
        const { data: history } = await supabase.from('train_schedule')
            .select('conductor_id, week_key, day_index')
            .eq('train_type', 'alliance')
            .order('week_key', { ascending: false })
            .order('day_index', { ascending: false })
            .limit(200);

        // 1. Unified Score Tracking (Virtual & Historical)
        const lastTrainMap = new Map<string, number>();
        members.forEach(m => {
            const h = history?.find(rec => rec.conductor_id === m.user_id);
            lastTrainMap.set(m.user_id, h ? (parseInt(h.week_key.split('-W')[1]) * 100 + h.day_index) : -1);
        });

        const getScore = (id: string) => lastTrainMap.get(id) ?? -1;
        const setVirtualScore = (id: string, idx: number) => lastTrainMap.set(id, 1000000 + idx);

        // 2. Prepare 14 slots with status
        const slotResults: (Partial<TrainRecord> & { assigned: boolean, date: Date })[] = [];
        [0, 1].forEach(offset => {
            const wKey = offset === 0 ? weekKey : nextWeekKey;
            DAY_INDICES.forEach((dayIdx) => {
                const dateIdx = DAY_INDICES.indexOf(dayIdx) + (offset * 7);
                const date = currentWeekDates[dateIdx];
                slotResults.push({ week_key: wKey, day_index: dayIdx, train_type: 'alliance', assigned: false, date });
            });
        });

        const usedInCycleMVPs = new Set<string>();
        const parseBday = (bday: string) => {
            const parts = bday.split(/[-/.]/);
            let bm, bd;
            if (parts[0].length === 4) { bm = parseInt(parts[1]); bd = parseInt(parts[2]); }
            else { bm = parseInt(parts[0]); bd = parseInt(parts[1]); }
            return { bm, bd };
        };

        // Phase 1: Absolute Birthdays (No cost to rotation)
        slotResults.forEach((slot, idx) => {
            const bdayMember = members.find(m => {
                if (!m.birthday) return false;
                const { bm, bd } = parseBday(m.birthday);
                return bm === (slot.date.getMonth() + 1) && bd === slot.date.getDate();
            });
            if (bdayMember) {
                slotResults[idx].conductor_id = bdayMember.user_id;
                slotResults[idx].assigned = true;
            }
        });

        // Phase 2: Sequential Fill (Date Order)
        slotResults.forEach((slot, idx) => {
            if (slot.assigned) return;

            // Week 1 Priority: Alliance MVPs
            if (idx < 7) {
                const availableMVP = trainSettings.train_mvp_ids
                    .filter(id => !usedInCycleMVPs.has(id))
                    .sort((a, b) => getScore(a) - getScore(b))[0];
                if (availableMVP) {
                    slotResults[idx].conductor_id = availableMVP;
                    slotResults[idx].assigned = true;
                    usedInCycleMVPs.add(availableMVP);
                    setVirtualScore(availableMVP, idx);
                    return;
                }
            }

            // Power Rotation (Fill remaining slots)
            const oldestPowerId = [...trainSettings.train_powerful_ids]
                .sort((a, b) => getScore(a) - getScore(b))[0];
            
            if (oldestPowerId) {
                slotResults[idx].conductor_id = oldestPowerId;
                slotResults[idx].assigned = true;
                setVirtualScore(oldestPowerId, idx);
            }
        });

        // Save to DB
        for (const res of slotResults.filter(r => r.conductor_id)) {
            const { assigned, date, ...record } = res;
            await supabase.from('train_schedule').upsert(record, { onConflict: 'week_key, day_index, train_type' });
        }

        fetchData();
        alert("14-Day Cycle Generated: Birthdays, MVPs (Week 1), and Rotating Power Members only.");

        fetchData();
        alert("14-Day Schedule generated with Rotation logic!");
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
                        {isR4 && (
                            <button 
                                onClick={() => setShowMgmtModal(true)}
                                className="px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-500 rounded-lg font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all hover:bg-red-600 hover:text-white shadow-lg flex items-center gap-2"
                            >
                                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                                R4 COMMAND
                            </button>
                        )}
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
                    <div className="relative z-10 flex flex-col h-full bg-slate-950/75 backdrop-blur-[2px]">
                        {/* 14-Day View Container */}
                        <div className="flex-1 flex flex-col overflow-y-auto divide-y divide-white/5 pb-20 md:pb-0">
                            {[0, 1].map(weekOffset => {
                                const wKey = weekOffset === 0 ? weekKey : nextWeekKey;
                                return (
                                    <React.Fragment key={wKey}>
                                        <div className="bg-white/5 px-4 py-2 flex justify-between items-center sticky top-0 z-20 backdrop-blur-md">
                                            <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                {weekOffset === 0 ? 'CURRENT WEEK' : 'UPCOMING WEEK'} — {wKey}
                                            </span>
                                            <span className="text-[8px] md:text-[10px] font-black text-white/20 italic">020 COMMAND</span>
                                        </div>
                                        <div className="grid grid-cols-10 gap-0.5 bg-black/60 border-b border-white/10 sticky top-[28px] md:top-[34px] z-20 shrink-0">
                                            <div className="col-span-1 p-1 md:p-2 text-center border-r border-white/5 flex items-center justify-center"><span className="text-[5px] md:text-[8px] font-black text-slate-500 uppercase leading-none truncate">DATE</span></div>
                                            <div className="col-span-3 p-1 md:p-2 text-center border-r border-white/5"><span className="text-[6px] md:text-[9px] font-black text-amber-500 uppercase leading-none tracking-widest">ALLIANCE</span></div>
                                            <div className="col-span-3 p-1 md:p-2 text-center border-r border-white/5"><span className="text-[6px] md:text-[9px] font-black text-blue-400 uppercase leading-none tracking-widest">THINK VIP</span></div>
                                            <div className="col-span-3 p-1 md:p-2 text-center"><span className="text-[6px] md:text-[9px] font-black text-pink-400 uppercase leading-none tracking-widest">BABY VIP</span></div>
                                        </div>
                                        {DAY_INDICES.map((dayIdx) => {
                                            const dayKey = DAYS[dayIdx];
                                            const dateIdx = DAY_INDICES.indexOf(dayIdx) + (weekOffset * 7);
                                            const date = currentWeekDates[dateIdx];
                                            const formattedDate = date ? `${date.getDate()} ${date.toLocaleString('default', { month: 'short' }).toUpperCase()}` : '';
                                            
                                            const aRec = (schedule || []).find(s => s.week_key === wKey && s.day_index === dayIdx && s.train_type === 'alliance');
                                            const ajRec = (schedule || []).find(s => s.week_key === wKey && s.day_index === dayIdx && s.train_type === 'aj');
                                            const bRec = (schedule || []).find(s => s.week_key === wKey && s.day_index === dayIdx && s.train_type === 'baby');

                                            return (
                                                <div key={`${wKey}-${dayIdx}`} className="grid grid-cols-10 gap-0.5 min-h-[55px] md:min-h-[65px] hover:bg-white/[0.04] transition-colors items-stretch overflow-hidden group">
                                                    <div className="col-span-1 flex flex-col items-center justify-center bg-black/40 border-r border-white/10">
                                                        <span className="text-[6px] md:text-[8px] font-black text-slate-600 uppercase leading-none mb-1">{t(dayKey as any).slice(0, 3)}</span>
                                                        <span className="text-[8px] md:text-[11px] font-black text-white italic tracking-tighter leading-none">{formattedDate}</span>
                                                    </div>
                                                    {[
                                                        { rec: aRec, mode: 'conductor' as const, type: 'alliance' as const, canEdit: isR4, w: wKey },
                                                        { rec: ajRec, mode: 'guardian' as const, type: 'aj' as const, canEdit: isR4 || isAj, w: wKey },
                                                        { rec: bRec, mode: 'guardian' as const, type: 'baby' as const, canEdit: isR4 || isBaby, w: wKey }
                                                    ].map((col, idx) => {
                                                        const member = members.find(m => m.user_id === (col.mode === 'conductor' ? col.rec?.conductor_id : col.rec?.guardian_id));
                                                        let reasonBadge = null;
                                                        if (col.type === 'alliance' && date && member) {
                                                            const { bm, bd } = { bm: -1, bd: -1 };
                                                            const parts = member.birthday?.split(/[-/.]/) || [];
                                                            const bm_val = parts[0]?.length === 4 ? parseInt(parts[1]) : parseInt(parts[0]);
                                                            const bd_val = parts[0]?.length === 4 ? parseInt(parts[2]) : parseInt(parts[1]);
                                                            if (bm_val === (date.getMonth() + 1) && bd_val === date.getDate()) {
                                                                reasonBadge = <span className="text-[7px] md:text-[8px] font-black text-pink-500 uppercase italic tracking-tighter mt-1">🎂 B-DAY</span>;
                                                            } else if (trainSettings.train_mvp_ids.includes(member.user_id)) {
                                                                reasonBadge = <span className="text-[7px] md:text-[8px] font-black text-amber-500 uppercase italic tracking-tighter mt-1">🏆 MVP</span>;
                                                            } else if (trainSettings.train_powerful_ids.includes(member.user_id)) {
                                                                reasonBadge = <span className="text-[7px] md:text-[8px] font-black text-blue-400 uppercase italic tracking-tighter mt-1">⚡ POWER</span>;
                                                            } else if (member.total_hero_power > 0) {
                                                                reasonBadge = <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase italic tracking-tighter mt-1 opacity-50">⚔️ STRENGTH</span>;
                                                            }
                                                        }
                                                        return (
                                                            <div key={idx} className={`col-span-3 px-1.5 border-r border-white/5 flex items-center justify-between min-w-0 overflow-hidden gap-1 ${reasonBadge?.props?.children?.includes('B-DAY') ? 'bg-pink-500/10' : ''}`}>
                                                                <div className="flex flex-col flex-1 min-w-0">
                                                                    <span className="text-[10px] md:text-base font-black uppercase text-white truncate leading-none md:drop-shadow-lg">{member?.username || '---'}</span>
                                                                    {reasonBadge}
                                                                </div>
                                                                {col.canEdit && (
                                                                    <button onClick={() => { setActiveSlot({ day: dayIdx, type: col.type, mode: col.mode }); setWeekKey(col.w); setShowModal(true); }} className="w-[20px] h-[20px] md:w-8 md:h-8 bg-white/5 hover:bg-white text-white/40 hover:text-black rounded md:rounded-lg border border-white/10 flex items-center justify-center transition-all md:opacity-0 group-hover:opacity-100 shrink-0 ml-auto leading-none">
                                                                        <svg className="w-2.5 h-2.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
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

                {showMgmtModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-1 md:p-8 bg-slate-950/98 backdrop-blur-3xl animate-in fade-in">
                        <div className="bg-[#0a0f1d] border border-white/10 w-full max-w-xl rounded-[1.5rem] md:rounded-[3rem] shadow-3xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh] ring-2 ring-white/5">
                            <div className="p-3 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                <div>
                                    <h3 className="text-base md:text-xl font-black text-white uppercase italic leading-none text-red-500">TRAIN MANAGEMENT</h3>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 px-1 border-l-2 border-red-500 leading-none">R4 TACTICAL OPS</p>
                                </div>
                                <button onClick={() => setShowMgmtModal(false)} className="w-8 h-8 md:w-12 md:h-12 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-red-500 transition-all font-black">✕</button>
                            </div>

                            <div className="flex p-1.5 bg-black/40 gap-1.5">
                                <button onClick={() => setMgmtMode('mvp')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${mgmtMode === 'mvp' ? 'bg-amber-600 text-white' : 'bg-white/5 text-slate-500'}`}>ALLIANCE MVP (3)</button>
                                <button onClick={() => setMgmtMode('powerful')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${mgmtMode === 'powerful' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}>POWERFUL (7)</button>
                            </div>

                            <div className="p-3 space-y-3">
                                <div className="flex gap-1.5">
                                    <input type="text" placeholder="SEARCH COMMANDER..." className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-red-500 text-white font-black uppercase text-[10px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                    <button onClick={autoGenerateSchedule} className="px-3 bg-red-600 text-white rounded-xl font-black uppercase text-[9px] tracking-tight hover:bg-red-700 transition-all flex items-center gap-1 shadow-lg shrink-0">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        AUTO-GEN
                                    </button>
                                </div>
                                
                                <div className="flex flex-wrap gap-1.5 overflow-hidden">
                                    {(mgmtMode === 'mvp' ? trainSettings.train_mvp_ids : trainSettings.train_powerful_ids).map(id => {
                                        const m = members.find(mem => mem.user_id === id);
                                        return (
                                            <div key={id} className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-1.5 shrink-0">
                                                <span className="text-[9px] font-black text-white uppercase italic truncate max-w-[80px]">{m?.username || '---'}</span>
                                                <button onClick={() => toggleMgmtMember(id)} className="text-red-500 hover:text-white transition-colors text-[8px]">✕</button>
                                            </div>
                                        );
                                    })}
                                    {(mgmtMode === 'mvp' ? trainSettings.train_mvp_ids : trainSettings.train_powerful_ids).length === 0 && (
                                        <span className="text-[9px] font-black text-slate-700 uppercase italic">Empty — Tap names below</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-black/20">
                                {sortedMembers.map(m => {
                                    const isSelected = (mgmtMode === 'mvp' ? trainSettings.train_mvp_ids : trainSettings.train_powerful_ids).includes(m.user_id);
                                    return (
                                        <button key={m.user_id} onClick={() => toggleMgmtMember(m.user_id)} className={`w-full flex items-center justify-between p-2 md:p-3 rounded-lg transition-all border ${isSelected ? 'bg-red-500/10 border-red-500/40' : 'bg-white/2 hover:bg-white/4 border-transparent'}`}>
                                            <div className="flex items-center gap-3 text-left min-w-0">
                                                <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center font-black text-[9px] md:text-[10px] shrink-0 ${isSelected ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-600'}`}>020</div>
                                                <div className="min-w-0">
                                                    <span className="block font-black uppercase text-[11px] md:text-sm text-white truncate leading-tight">{m.username}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-black text-slate-600 uppercase italic leading-none">{m.role}</span>
                                                        {m.birthday && <span className="text-[8px] font-black text-pink-500/60 uppercase italic leading-none truncate">🎂 {m.birthday.split('-').slice(1).join('/')}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 pl-2">
                                                <span className="block font-black text-amber-500 text-[10px] md:text-xs">{(m.total_hero_power / 1000000).toFixed(1)}M</span>
                                                {isSelected && <span className="text-[7px] font-black text-red-500 uppercase tracking-tighter leading-none">SELECTED</span>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="p-2 md:p-6 bg-[#0a0f1d] border-t border-white/10 pb-24 md:pb-8">
                                <button onClick={() => setShowMgmtModal(false)} className="w-full py-5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-[2rem] font-black uppercase text-xs md:text-sm tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-3 group border border-white/10 hover:scale-[1.02] active:scale-[0.98]">
                                    <svg className="w-5 h-5 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                    EXIT COMMAND HUB
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
