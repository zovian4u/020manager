"use client";

import React, { useState, useEffect } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useLanguage } from '../../lib/LanguageContext';
import { getWeekKey } from '../../lib/utils';

// 🛡️ Updated interface to include member preferences and assignments
interface Member {
    user_id: string;
    username: string;
    squad_1_power: number;
    total_hero_power?: number;
    arena_power?: number;
    team_assignment?: string; // R4 Final Decision for DS
    ds_choice?: string;       // Attendance status for DS
    ds_team?: string;         // Member's requested Team for DS
    cs_team_assignment?: string; // R4 Final Decision for CS
    cs_choice?: string;       // Attendance status for CS
    cs_team?: string;         // Member's requested Team for CS
    role?: string;
    missed_ds?: number;       // Historical missed count for DS
    missed_cs?: number;       // Historical missed count for CS
}

export default function TacticalDashboard() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();

    const [hasMounted, setHasMounted] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [magicFilterMode, setMagicFilterMode] = useState<'off' | 'hero' | 'squad' | 'arena'>('off');
    const [useAttendancePreference, setUseAttendancePreference] = useState(true);
    const [requestedTeamFilter, setRequestedTeamFilter] = useState<'All' | 'Team A' | 'Team B' | 'Both'>('All');
    const [assignedTeamFilter, setAssignedTeamFilter] = useState<'All' | 'Team A' | 'Team B' | 'Unassigned'>('All');

    // ✅ Attendance Tracking States
    const [attendanceMode, setAttendanceMode] = useState(false);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [historyMode, setHistoryMode] = useState(false);

    // ✅ Event Mode Toggle
    const [activeEvent, setActiveEvent] = useState<'DS' | 'CS'>('DS');

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted || !user) return;
        async function getData() {
            try {
                // Try fetching all columns. If it fails, try a fallback without the new missed_ds column
                let data: Member[] | null = null;
                const { data: initialData, error } = await supabase
                    .from('members')
                    .select('user_id, username, squad_1_power, total_hero_power, arena_power, team_assignment, ds_choice, ds_team, cs_team_assignment, cs_choice, cs_team, role, missed_ds, missed_cs');

                if (initialData) {
                    data = initialData as Member[];
                } else if (error) {
                    console.warn("Retrying without missed_cs/missed_ds columns...");
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .from('members')
                        .select('user_id, username, squad_1_power, total_hero_power, arena_power, team_assignment, ds_choice, ds_team, cs_team_assignment, cs_choice, cs_team, role');

                    if (fallbackData) {
                        data = fallbackData as Member[];
                    } else if (fallbackError) {
                        console.error("Supabase Connection Error:", fallbackError.message);
                        return;
                    }
                }

                if (data) {
                    setMembers(data as Member[]);
                    // Initialize attendance map for everyone assigned to a team (for both events)
                    const initialMap: Record<string, boolean> = {};
                    data.forEach(m => {
                        if (m.team_assignment === 'A' || m.team_assignment === 'B' || m.cs_team_assignment === 'A' || m.cs_team_assignment === 'B') {
                            initialMap[m.user_id] = true; // Default to attended
                        }
                    });
                    setAttendanceMap(initialMap);
                }
            } catch (err) {
                console.error("Tactical Dashboard Data Loader Error:", err);
            }
        }
        getData();
    }, [hasMounted, user]);

    if (!hasMounted) return null;

    const getAssignment = (m: Member) => activeEvent === 'DS' ? m.team_assignment : m.cs_team_assignment;
    const getChoice = (m: Member) => activeEvent === 'DS' ? m.ds_choice : m.cs_choice;
    const getTeam = (m: Member) => activeEvent === 'DS' ? m.ds_team : m.cs_team;
    const getMissed = (m: Member) => activeEvent === 'DS' ? m.missed_ds : m.missed_cs;

    // Role Guard
    const currentUser = members.find(m => m.user_id === user?.id);
    if (currentUser && currentUser.role !== 'R4' && currentUser.role !== 'R5') {
        return <div className="p-20 text-center font-black text-red-600 uppercase tracking-widest">{t('unauthorized')}</div>;
    }

    const assignedMembers = members.filter(m => getAssignment(m) === 'A' || getAssignment(m) === 'B');
    const teamACount = members.filter(m => getAssignment(m) === 'A').length;
    const teamBCount = members.filter(m => getAssignment(m) === 'B').length;

    const shouldSort = magicFilterMode !== 'off' || useAttendancePreference || requestedTeamFilter !== 'All' || assignedTeamFilter !== 'All';
    const filteredMembers = members.filter(m => {
        if (searchQuery && !m.username.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        if (assignedTeamFilter === 'Team A' && getAssignment(m) !== 'A') return false;
        if (assignedTeamFilter === 'Team B' && getAssignment(m) !== 'B') return false;
        if (assignedTeamFilter === 'Unassigned' && (getAssignment(m) === 'A' || getAssignment(m) === 'B')) return false;

        const reqTeam = getTeam(m);
        if (requestedTeamFilter === 'Team A' && reqTeam !== 'Team A' && reqTeam !== 'Both') return false;
        if (requestedTeamFilter === 'Team B' && reqTeam !== 'Team B' && reqTeam !== 'Both') return false;
        if (requestedTeamFilter === 'Both' && reqTeam !== 'Both') return false;

        return true;
    });

    const sortedMembers = shouldSort
        ? [...filteredMembers].sort((a, b) => {
            // Priority 1: Requested 'Both' vs Specific Team
            if (requestedTeamFilter === 'Team A' || requestedTeamFilter === 'Team B') {
                const aIsBoth = getTeam(a) === 'Both';
                const bIsBoth = getTeam(b) === 'Both';

                if (aIsBoth && !bIsBoth) return -1;
                if (!aIsBoth && bIsBoth) return 1;
            }

            // Priority 2: Attendance Preference
            if (useAttendancePreference) {
                const getP = (c?: string) => {
                    if (!c) return 0;
                    const upper = c.toUpperCase();
                    if (upper === 'YES') return 3;
                    if (upper === 'MAYBE') return 2;
                    if (upper === 'NO') return 1;

                    // Fallback for old translated data
                    const lower = c.toLowerCase();
                    if (lower.includes("yes") || lower.includes("for sure")) return 3;
                    if (lower.includes("maybe") || lower.includes("sub")) return 2;
                    if (lower.includes("sorry") || lower.includes("can't") || lower.includes("cant")) return 1;
                    return 0;
                };
                const prefA = getP(getChoice(a));
                const prefB = getP(getChoice(b));
                if (prefA !== prefB) {
                    return prefB - prefA; // Higher preference values first
                }
            }

            // Priority 3: Magic Filter Power
            let pA = 0;
            let pB = 0;
            if (magicFilterMode === 'hero') {
                pA = Number(a.total_hero_power || 0);
                pB = Number(b.total_hero_power || 0);
            } else if (magicFilterMode === 'squad') {
                pA = Number(a.squad_1_power || 0);
                pB = Number(b.squad_1_power || 0);
            } else if (magicFilterMode === 'arena') {
                pA = Number(a.arena_power || 0);
                pB = Number(b.arena_power || 0);
            }

            return pB - pA; // If tie in preference or preference is off, sort by power
        })
        : filteredMembers;

    const handleMassAction = async (team: string | null) => {
        if (selectedUsers.length === 0) return;
        const columnToUpdate = activeEvent === 'DS' ? 'team_assignment' : 'cs_team_assignment';
        const { error } = await supabase.from('members').update({ [columnToUpdate]: team }).in('user_id', selectedUsers);
        if (!error) window.location.reload();
    };

    const handleSubmitAttendance = async () => {
        setIsSubmitting(true);
        const weekKey = getWeekKey();

        try {
            // 1. Log to history table (assumes table exists or handled by Supabase)
            const historyRecords = assignedMembers.map(m => ({
                user_id: m.user_id,
                username: m.username,
                week_key: weekKey,
                team: getAssignment(m),
                attended: attendanceMap[m.user_id] || false
            }));

            const historyTable = activeEvent === 'DS' ? 'ds_attendance_history' : 'cs_attendance_history';
            await supabase.from(historyTable).insert(historyRecords);

            // 2. Update member miss counts
            const missedUsers = assignedMembers.filter(m => !attendanceMap[m.user_id]);
            for (const m of missedUsers) {
                try {
                    // Only try RPC/Update if column exists in our local state check
                    const currentMissed = getMissed(m);
                    if (currentMissed !== undefined) {
                        const rpcName = activeEvent === 'DS' ? 'increment_miss_count' : 'increment_miss_count_cs';
                        const missCol = activeEvent === 'DS' ? 'missed_ds' : 'missed_cs';
                        await supabase.rpc(rpcName, { user_id_param: m.user_id });
                        await supabase.from('members').update({ [missCol]: (currentMissed || 0) + 1 }).eq('user_id', m.user_id);
                    }
                } catch (e) {
                    console.warn("Could not update miss count for", m.username);
                }
            }

            // 3. Mark attendance as completed in settings to allow next week signups
            if (activeEvent === 'DS') {
                const settingsUpdate: any = { registration_open: false };
                try {
                    await supabase.from('settings').update({ ...settingsUpdate, attendance_marked: true }).eq('id', 1);
                } catch (e) {
                    await supabase.from('settings').update(settingsUpdate).eq('id', 1);
                }
            } else {
                await supabase.from('settings').update({ cs_registration_open: false }).eq('id', 1);
            }

            // 4. Reset team assignments for everyone for the next week
            if (activeEvent === 'DS') {
                await supabase.from('members').update({
                    team_assignment: null,
                    ds_choice: null,
                    ds_team: null
                }).neq('user_id', 'SYSTEM');
            } else {
                await supabase.from('members').update({
                    cs_team_assignment: null,
                    cs_choice: null,
                    cs_team: null
                }).neq('user_id', 'SYSTEM');
            }

            alert(t('complete'));
            window.location.href = '/hub';
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-72px)] px-4 md:px-8 pb-32 md:pb-8 bg-slate-50 text-slate-900 pt-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 border-b border-slate-200 pb-6 gap-2">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="text-xl sm:text-3xl font-black text-red-700 uppercase italic leading-tight">{t('commandCenter')}</h1>
                            <div className="flex bg-slate-200 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveEvent('DS')}
                                    className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeEvent === 'DS' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t('desertStorm')}
                                </button>
                                <button
                                    onClick={() => setActiveEvent('CS')}
                                    className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeEvent === 'CS' ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t('canyonStorm')}
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">{t('allianceName')} 020 Strategic Board — {activeEvent === 'DS' ? t('desertStorm') : t('canyonStorm')}</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/tactical-dashboard/manage-ranks">
                            <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-blue-700 text-white hover:bg-blue-800 shadow-md whitespace-nowrap">
                                ⭐ {t('manageRanks')}
                            </button>
                        </Link>
                        <button
                            onClick={() => { setAttendanceMode(!attendanceMode); setHistoryMode(false); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${attendanceMode ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-200 text-slate-600'}`}
                        >
                            📋 {t('markAttendance')}
                        </button>
                        <button
                            onClick={() => { setHistoryMode(!historyMode); setAttendanceMode(false); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${historyMode ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-200 text-slate-600'}`}
                        >
                            📜 {t('pastMisses')}
                        </button>
                    </div>
                </header>

                {!attendanceMode && !historyMode && (
                    <>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-6 items-stretch sm:items-center">
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={() => handleMassAction('A')} className="flex-1 px-3 py-2 bg-blue-600 text-white text-[9px] font-black rounded-lg cursor-pointer hover:scale-105 transition-all shadow-md whitespace-nowrap">{t('assignTeamA')} ({teamACount}/30)</button>
                                <button onClick={() => handleMassAction('B')} className="flex-1 px-3 py-2 bg-green-600 text-white text-[9px] font-black rounded-lg cursor-pointer hover:scale-105 transition-all shadow-md whitespace-nowrap">{t('assignTeamB')} ({teamBCount}/30)</button>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={() => handleMassAction(null)} className="flex-1 px-3 py-2 bg-slate-300 text-slate-700 text-[9px] font-black rounded-lg cursor-pointer hover:bg-slate-400 whitespace-nowrap uppercase">{t('removeFromTeams')}</button>
                                <button
                                    onClick={() => setUseAttendancePreference(!useAttendancePreference)}
                                    className={`flex-1 px-3 py-2 text-[9px] whitespace-nowrap font-black rounded-lg cursor-pointer shadow-md transition-all ${useAttendancePreference ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                >
                                    PRIORITY: {useAttendancePreference ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            <div className="w-full sm:w-auto flex-1 min-w-[120px]">
                                <input
                                    type="text"
                                    placeholder={t('searchPlayer') || "Search..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-3 py-2 outline-none text-[9px] font-black rounded-lg bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-500 transition-all shadow-sm h-[34px]"
                                />
                            </div>
                            <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                                <select
                                    value={magicFilterMode}
                                    onChange={(e) => setMagicFilterMode(e.target.value as any)}
                                    className={`px-3 py-2 outline-none appearance-none text-[8px] font-black rounded-lg text-white cursor-pointer shadow-sm transition-all h-[34px] ${magicFilterMode !== 'off' ? 'bg-orange-500' : 'bg-purple-600'}`}
                                >
                                    <option value="off">MAGIC: OFF</option>
                                    <option value="hero">MAGIC: HERO</option>
                                    <option value="squad">MAGIC: SQUAD 1</option>
                                    <option value="arena">MAGIC: ARENA</option>
                                </select>
                                <select
                                    value={requestedTeamFilter}
                                    onChange={(e) => setRequestedTeamFilter(e.target.value as any)}
                                    className={`px-3 py-2 outline-none appearance-none text-[8px] font-black rounded-lg text-white cursor-pointer shadow-sm transition-all h-[34px] ${requestedTeamFilter !== 'All' ? 'bg-pink-600' : 'bg-slate-500'}`}
                                >
                                    <option value="All">REQ: ALL</option>
                                    <option value="Team A">REQ: A/BOTH</option>
                                    <option value="Team B">REQ: B/BOTH</option>
                                    <option value="Both">REQ: ONLY BOTH</option>
                                </select>
                                <select
                                    value={assignedTeamFilter}
                                    onChange={(e) => setAssignedTeamFilter(e.target.value as any)}
                                    className={`px-3 py-2 outline-none appearance-none text-[8px] font-black rounded-lg text-white cursor-pointer shadow-sm transition-all h-[34px] ${assignedTeamFilter !== 'All' ? 'bg-teal-600' : 'bg-slate-500'}`}
                                >
                                    <option value="All">ASSGN: ALL</option>
                                    <option value="Team A">ASSGN: A</option>
                                    <option value="Team B">ASSGN: B</option>
                                    <option value="Unassigned">ASSGN: NONE</option>
                                </select>
                            </div>
                            <div className="w-full sm:w-auto sm:ml-auto flex justify-between gap-4 text-[9px] font-black text-blue-600 uppercase underline cursor-pointer">
                                <span onClick={() => setSelectedUsers(members.map(m => m.user_id))}>{t('selectAll')}</span>
                                <span onClick={() => setSelectedUsers([])} className="text-red-500">{t('uncheckAll')}</span>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse table-auto">
                                    <thead className="bg-slate-50/80 border-b border-slate-100">
                                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-tight whitespace-nowrap">
                                            <th className="px-3 py-3 w-10 text-center">{t('select')}</th>
                                            <th className="px-3 py-3 w-10 text-center hidden md:table-cell">S.No.</th>
                                            <th className="px-3 py-3 w-28">{t('finalAssignment')}</th>
                                            <th className="px-3 py-3">{t('memberName')}</th>
                                            <th className={`px-3 py-3 ${magicFilterMode === 'hero' ? 'table-cell' : 'hidden lg:table-cell'}`}>HERO (M)</th>
                                            <th className={`px-3 py-3 ${magicFilterMode === 'squad' || magicFilterMode === 'off' ? 'table-cell' : 'hidden sm:table-cell'}`}>SQUAD 1 (M)</th>
                                            <th className={`px-3 py-3 ${magicFilterMode === 'arena' ? 'table-cell' : 'hidden xl:table-cell'}`}>ARENA (M)</th>
                                            <th className="px-3 py-3 hidden sm:table-cell">{t('attendance')}</th>
                                            <th className="px-3 py-3 hidden md:table-cell">{t('requestedTeam')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-bold text-slate-700">
                                        {sortedMembers.map((m, index) => {
                                            const heroPower = Number(m.total_hero_power || 0);
                                            const squadPower = Number(m.squad_1_power || 0);
                                            const arenaPower = Number(m.arena_power || 0);
                                            return (
                                                <tr key={m.user_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                                                    <td className="px-3 py-3 text-center">
                                                        <input type="checkbox" className={`cursor-pointer w-4 h-4 rounded border-slate-300 ${activeEvent === 'DS' ? 'accent-pink-600' : 'accent-orange-600'}`} checked={selectedUsers.includes(m.user_id)} onChange={(e) => e.target.checked ? setSelectedUsers([...selectedUsers, m.user_id]) : setSelectedUsers(selectedUsers.filter(id => id !== m.user_id))} />
                                                    </td>
                                                    <td className="px-3 py-3 text-center text-slate-400 text-[9px] font-black hidden md:table-cell">{index + 1}</td>
                                                    <td className="px-3 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${getAssignment(m) === 'A' ? 'bg-blue-600' : getAssignment(m) === 'B' ? 'bg-green-600' : 'bg-slate-700'}`}>
                                                            {getAssignment(m) && getAssignment(m) !== 'None' ? `${t('team')} ${getAssignment(m)}` : t('pending')}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 max-w-[100px] truncate">
                                                        <div className="uppercase tracking-tighter text-slate-900 font-bold truncate">{m.username}</div>
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">({m.role || 'R1'})</div>
                                                    </td>
                                                    <td className={`px-3 py-3 font-mono ${magicFilterMode === 'hero' ? 'text-pink-600 font-extrabold table-cell' : 'text-slate-500 hidden lg:table-cell'}`}>{heroPower.toFixed(2)}M</td>
                                                    <td className={`px-3 py-3 font-mono ${magicFilterMode === 'squad' || magicFilterMode === 'off' ? 'table-cell' : 'hidden sm:table-cell'} ${magicFilterMode === 'squad' ? 'text-pink-600 font-extrabold sm:text-sm' : 'text-slate-500'}`}>{squadPower.toFixed(2)}M</td>
                                                    <td className={`px-3 py-3 font-mono ${magicFilterMode === 'arena' ? 'text-pink-600 font-extrabold table-cell' : 'text-slate-500 hidden xl:table-cell'}`}>{arenaPower.toFixed(2)}M</td>
                                                    <td className="px-3 py-3 text-[9px] uppercase font-black text-slate-500 hidden sm:table-cell">
                                                        {(() => {
                                                            const choice = getChoice(m);
                                                            if (!choice) return '---';
                                                            if (choice === 'YES') return t('yesBeThere').split(' ')[0];
                                                            if (choice === 'MAYBE') return t('maybeSub').split(' ')[0];
                                                            if (choice === 'NO') return (t('sorryCantMakeIt').split(' ')[0] || 'No');
                                                            return choice.split(' ')[0];
                                                        })()}
                                                    </td>
                                                    <td className="px-3 py-3 hidden md:table-cell">
                                                        {getTeam(m) ? (
                                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black border ${getTeam(m) === 'Team A' ? 'border-blue-200 text-blue-500 bg-blue-50' :
                                                                getTeam(m) === 'Team B' ? 'border-green-200 text-green-600 bg-green-50' :
                                                                    'border-purple-200 text-purple-600 bg-purple-50'
                                                                }`}>
                                                                {getTeam(m)?.toUpperCase()}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 text-[9px]">{t('noPreference')}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {attendanceMode && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl mb-8 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-orange-800 uppercase italic">{t('submitAttendance')}</h2>
                                <p className="text-[10px] font-bold text-orange-600/70 uppercase tracking-widest mt-1">Reviewing assigned participants</p>
                            </div>
                            <button
                                onClick={handleSubmitAttendance}
                                disabled={isSubmitting || assignedMembers.length === 0}
                                className="px-8 py-4 bg-orange-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? t('syncing') : t('saveRecords')}
                            </button>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2.5rem] shadow-xl overflow-hidden">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left min-w-max">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                            <th className="px-4 py-4 sm:p-6 w-12 text-center">S.No.</th>
                                            <th className="px-4 py-4 sm:p-6">{t('memberName')}</th>
                                            <th className="px-4 py-4 sm:p-6">{t('team')}</th>
                                            <th className="px-4 py-4 sm:p-6 text-center">{t('status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignedMembers.map((m, index) => (
                                            <tr key={m.user_id} className="border-b border-slate-50 whitespace-nowrap">
                                                <td className="px-4 py-4 sm:p-6 text-center text-slate-400 text-[10px] font-black">{index + 1}</td>
                                                <td className="px-4 py-4 sm:p-6 font-bold uppercase">{m.username}</td>
                                                <td className="px-4 py-4 sm:p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black text-white ${getAssignment(m) === 'A' ? 'bg-blue-600' : 'bg-green-600'}`}>
                                                        {t('team')} {getAssignment(m)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 sm:p-6">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => setAttendanceMap({ ...attendanceMap, [m.user_id]: true })}
                                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${attendanceMap[m.user_id] ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                                                        >
                                                            {t('showedUp')}
                                                        </button>
                                                        <button
                                                            onClick={() => setAttendanceMap({ ...attendanceMap, [m.user_id]: false })}
                                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${attendanceMap[m.user_id] === false ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                                                        >
                                                            {t('missed')}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {assignedMembers.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">{t('noData')}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {historyMode && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {members.filter(m => (getMissed(m) || 0) > 0).sort((a, b) => (getMissed(b) || 0) - (getMissed(a) || 0)).map(m => (
                                <div key={m.user_id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-lg flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase italic tracking-tighter">{m.username}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('attendanceHistory')}</p>
                                    </div>
                                    <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100">
                                        <span className="text-red-600 font-black text-xl">{getMissed(m)}</span>
                                        <span className="text-red-400 text-[8px] font-black block uppercase">{t('missed')}</span>
                                    </div>
                                </div>
                            ))}
                            {members.filter(m => (getMissed(m) || 0) > 0).length === 0 && (
                                <div className="col-span-full p-20 text-center text-slate-300 font-black uppercase italic tracking-widest bg-white border border-slate-100 rounded-[3rem]">
                                    {t('noData')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
