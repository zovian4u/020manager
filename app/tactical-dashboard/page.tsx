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
}

export default function TacticalDashboard() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();

    const [hasMounted, setHasMounted] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [zoviFilter, setZoviFilter] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted || !user) return;
        async function getData() {
            // ✅ Fetching ds_team to show member preferences
            const { data, error } = await supabase
                .from('members')
                .select('user_id, username, squad_1_power, total_hero_power, team_assignment, ds_choice, ds_team, role');

            if (error) {
                console.error("Supabase Connection Error:", error.message);
                return;
            }

            if (data) {
                setMembers(data as Member[]);
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

    return (
        <div className="min-h-[calc(100vh-72px)] px-4 md:px-8 pb-8 bg-slate-50 text-slate-900 pt-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-10 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-red-700 uppercase italic leading-tight">{t('commandCenter')}</h1>
                        <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">{t('allianceName')} 020 Strategic Board</p>
                    </div>
                </header>

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

                <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="p-6 w-12 text-center">{t('select')}</th>
                                <th className="p-6">{t('finalAssignment')}</th>
                                <th className="p-6">{t('memberName')}</th>
                                <th className="p-6">{t('powerM')}</th>
                                <th className="p-6">{t('attendance')}</th>
                                <th className="p-6">{t('requestedTeam')}</th> {/* ✅ New Audit Column */}
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
                                            {/* ✅ Shows exactly what the user picked in Desert Storm page */}
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
        </div>
    );
}