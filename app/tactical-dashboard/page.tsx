"use client";

import React, { useState, useEffect } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useLanguage } from '../../lib/LanguageContext';

// 🛡️ Updated interface to include member preferences and assignments
interface Member {
    user_id: string;
    username: string;
    squad_1_power: number;
    total_hero_power?: number;
    team_assignment?: string; // R4 Final Decision
    ds_choice?: string;       // Attendance status
    ds_team?: string;         // ✅ Member's requested Team (A or B)
    role?: string;
    missed_ds?: number;       // Historical missed count
}

export default function TacticalDashboard() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();

    const [hasMounted, setHasMounted] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [zoviFilter, setZoviFilter] = useState(false);

    // ✅ Attendance Tracking States
    const [attendanceMode, setAttendanceMode] = useState(false);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [historyMode, setHistoryMode] = useState(false);

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
                    .select('user_id, username, squad_1_power, total_hero_power, team_assignment, ds_choice, ds_team, role, missed_ds');

                if (initialData) {
                    data = initialData as Member[];
                } else if (error) {
                    console.warn("Retrying without missed_ds column...");
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .from('members')
                        .select('user_id, username, squad_1_power, total_hero_power, team_assignment, ds_choice, ds_team, role');

                    if (fallbackData) {
                        data = fallbackData as Member[];
                    } else if (fallbackError) {
                        console.error("Supabase Connection Error:", fallbackError.message);
                        return;
                    }
                }

                if (data) {
                    setMembers(data as Member[]);
                    // Initialize attendance map for everyone assigned to a team
                    const initialMap: Record<string, boolean> = {};
                    data.forEach(m => {
                        if (m.team_assignment === 'A' || m.team_assignment === 'B') {
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

    // Role Guard
    const currentUser = members.find(m => m.user_id === user?.id);
    if (currentUser && currentUser.role !== 'R4') {
        return <div className="p-20 text-center font-black text-red-600 uppercase tracking-widest">{t('unauthorized')}</div>;
    }

    const assignedMembers = members.filter(m => m.team_assignment === 'A' || m.team_assignment === 'B');
    const teamACount = members.filter(m => m.team_assignment === 'A').length;
    const teamBCount = members.filter(m => m.team_assignment === 'B').length;

    const sortedMembers = zoviFilter
        ? [...members].sort((a, b) => {
            const getP = (c?: string) => c?.includes("for sure") ? 3 : c?.includes("sub") ? 2 : 1;
            const pA = Number(a.squad_1_power || a.total_hero_power || 0);
            const pB = Number(b.squad_1_power || b.total_hero_power || 0);
            return getP(b.ds_choice) !== getP(a.ds_choice) ? getP(b.ds_choice) - getP(a.ds_choice) : pB - pA;
        })
        : members;

    const handleMassAction = async (team: string) => {
        if (selectedUsers.length === 0) return;
        const { error } = await supabase.from('members').update({ team_assignment: team }).in('user_id', selectedUsers);
        if (!error) window.location.reload();
    };

    const handleSubmitAttendance = async () => {
        setIsSubmitting(true);
        const weekKey = new Date().toISOString().split('T')[0]; // Simple week identifier

        try {
            // 1. Log to history table (assumes table exists or handled by Supabase)
            const historyRecords = assignedMembers.map(m => ({
                user_id: m.user_id,
                username: m.username,
                week_key: weekKey,
                team: m.team_assignment,
                attended: attendanceMap[m.user_id] || false
            }));

            await supabase.from('ds_attendance_history').insert(historyRecords);

            // 2. Update member miss counts
            const missedUsers = assignedMembers.filter(m => !attendanceMap[m.user_id]);
            for (const m of missedUsers) {
                try {
                    // Only try RPC/Update if column exists in our local state check
                    // Note: We don't have a strict hasColumn state here, but we can check if m.missed_ds was undefined in the fetch
                    if (m.missed_ds !== undefined) {
                        await supabase.rpc('increment_miss_count', { user_id_param: m.user_id });
                        await supabase.from('members').update({ missed_ds: (m.missed_ds || 0) + 1 }).eq('user_id', m.user_id);
                    }
                } catch (e) {
                    console.warn("Could not update miss count for", m.username);
                }
            }

            // 3. Mark attendance as completed in settings to allow next week signups
            const settingsUpdate: any = { registration_open: false };
            // We'll trust the fetch detection or try/catch here
            try {
                // If we want to be safe, we could have fetched settings here too, 
                // but let's just try to update attendance_marked and fallback if it fails
                await supabase.from('settings').update({ ...settingsUpdate, attendance_marked: true }).eq('id', 1);
            } catch (e) {
                await supabase.from('settings').update(settingsUpdate).eq('id', 1);
            }

            // 4. Reset team assignments for everyone for the next week
            await supabase.from('members').update({
                team_assignment: null,
                ds_choice: null,
                ds_team: null
            }).neq('user_id', 'SYSTEM');

            alert(t('complete'));
            window.location.href = '/hub';
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-72px)] px-4 md:px-8 pb-8 bg-slate-50 text-slate-900 pt-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 border-b border-slate-200 pb-6 gap-2">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-black text-red-700 uppercase italic leading-tight">{t('commandCenter')}</h1>
                        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">{t('allianceName')} 020 Strategic Board</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setAttendanceMode(!attendanceMode); setHistoryMode(false); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${attendanceMode ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                        >
                            📋 {t('markAttendance')}
                        </button>
                        <button
                            onClick={() => { setHistoryMode(!historyMode); setAttendanceMode(false); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${historyMode ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                        >
                            📜 {t('pastMisses')}
                        </button>
                    </div>
                </header>

                {!attendanceMode && !historyMode && (
                    <>
                        <div className="flex flex-wrap gap-3 mb-8 items-center">
                            <button onClick={() => handleMassAction('A')} className="px-5 py-2.5 bg-blue-600 text-white text-[10px] font-black rounded-xl cursor-pointer hover:scale-105 transition-all shadow-md">{t('assignTeamA')} ({teamACount}/30)</button>
                            <button onClick={() => handleMassAction('B')} className="px-5 py-2.5 bg-green-600 text-white text-[10px] font-black rounded-xl cursor-pointer hover:scale-105 transition-all shadow-md">{t('assignTeamB')} ({teamBCount}/30)</button>
                            <button onClick={() => handleMassAction('None')} className="px-5 py-2.5 bg-slate-300 text-slate-700 text-[10px] font-black rounded-xl cursor-pointer hover:bg-slate-400">{t('removeFromTeams')}</button>
                            <button onClick={() => setZoviFilter(!zoviFilter)} className={`px-5 py-2.5 text-[10px] font-black rounded-xl text-white cursor-pointer shadow-md transition-all ${zoviFilter ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                {zoviFilter ? t('disableZovi') : t('applyZovi')}
                            </button>
                            <div className="ml-auto flex gap-4 text-[10px] font-black text-blue-600 uppercase underline cursor-pointer">
                                <span onClick={() => setSelectedUsers(members.map(m => m.user_id))}>{t('selectAll')}</span>
                                <span onClick={() => setSelectedUsers([])} className="text-red-500">{t('uncheckAll')}</span>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50/80 border-b border-slate-100">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="p-6 w-12 text-center">{t('select')}</th>
                                            <th className="p-6">{t('finalAssignment')}</th>
                                            <th className="p-6">{t('memberName')}</th>
                                            <th className="p-6">{t('powerM')}</th>
                                            <th className="p-6">{t('attendance')}</th>
                                            <th className="p-6">{t('requestedTeam')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-bold text-slate-700">
                                        {sortedMembers.map(m => {
                                            const powerValue = Number(m.squad_1_power || m.total_hero_power || 0);
                                            return (
                                                <tr key={m.user_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-6 text-center">
                                                        <input type="checkbox" className="cursor-pointer w-4 h-4 rounded border-slate-300 accent-blue-600" checked={selectedUsers.includes(m.user_id)} onChange={(e) => e.target.checked ? setSelectedUsers([...selectedUsers, m.user_id]) : setSelectedUsers(selectedUsers.filter(id => id !== m.user_id))} />
                                                    </td>
                                                    <td className="p-6">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black text-white ${m.team_assignment === 'A' ? 'bg-blue-600 shadow-[0_4px_10px_rgba(37,99,235,0.3)]' : m.team_assignment === 'B' ? 'bg-green-600 shadow-[0_4px_10px_rgba(22,163,74,0.3)]' : 'bg-slate-300'}`}>
                                                            {m.team_assignment ? `${t('team')} ${m.team_assignment}` : t('pending')}
                                                        </span>
                                                    </td>
                                                    <td className="p-6 uppercase tracking-tighter text-slate-900">{m.username}</td>
                                                    <td className="p-6 font-mono text-pink-600">{powerValue.toFixed(2)}M</td>
                                                    <td className="p-6 text-[10px] uppercase font-black text-slate-500">
                                                        {m.ds_choice ? m.ds_choice.split(' ')[0] : '---'}
                                                    </td>
                                                    <td className="p-6">
                                                        {m.ds_team ? (
                                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${m.ds_team === 'Team A' ? 'border-blue-200 text-blue-500 bg-blue-50' : 'border-green-200 text-green-600 bg-green-50'}`}>
                                                                {m.ds_team.toUpperCase()}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 text-[10px]">{t('noPreference')}</span>
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

                        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="p-6">{t('memberName')}</th>
                                        <th className="p-6">{t('team')}</th>
                                        <th className="p-6 text-center">{t('status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignedMembers.map(m => (
                                        <tr key={m.user_id} className="border-b border-slate-50">
                                            <td className="p-6 font-bold uppercase">{m.username}</td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black text-white ${m.team_assignment === 'A' ? 'bg-blue-600' : 'bg-green-600'}`}>
                                                    {t('team')} {m.team_assignment}
                                                </span>
                                            </td>
                                            <td className="p-6">
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
                )}

                {historyMode && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {members.filter(m => (m.missed_ds || 0) > 0).sort((a, b) => (b.missed_ds || 0) - (a.missed_ds || 0)).map(m => (
                                <div key={m.user_id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-lg flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase italic tracking-tighter">{m.username}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('attendanceHistory')}</p>
                                    </div>
                                    <div className="bg-red-50 px-4 py-2 rounded-2xl border border-red-100">
                                        <span className="text-red-600 font-black text-xl">{m.missed_ds}</span>
                                        <span className="text-red-400 text-[8px] font-black block uppercase">{t('missed')}</span>
                                    </div>
                                </div>
                            ))}
                            {members.filter(m => (m.missed_ds || 0) > 0).length === 0 && (
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
