"use client";

import React, { useState, useEffect } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useLanguage } from '../../lib/LanguageContext';

// Simple SVG Pie Chart Component
const SimplePieChart = ({ data, size = 160 }: { data: { name: string, value: number, color: string }[], size?: number }) => {
    const total = data.reduce((acc, d) => acc + d.value, 0);
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
                <div className="w-full h-full rounded-full border-4 border-slate-700/50 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                    No Data
                </div>
            </div>
        );
    }

    return (
        <div className="relative group cursor-default" style={{ width: size, height: size }}>
            <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }} className="drop-shadow-2xl overflow-visible">
                {data.map((slice, i) => {
                    if (slice.value === 0) return null;
                    const startPercent = cumulativePercent;
                    const endPercent = cumulativePercent + (slice.value / total);
                    cumulativePercent = endPercent;

                    const [startX, startY] = getCoordinatesForPercent(startPercent);
                    const [endX, endY] = getCoordinatesForPercent(endPercent);
                    const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;

                    const pathData = [
                        `M ${startX} ${startY}`,
                        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        `L 0 0`,
                    ].join(' ');

                    return (
                        <path
                            key={i}
                            d={pathData}
                            fill={slice.color}
                            className="transition-all duration-300 hover:scale-[1.05] hover:opacity-90"
                            stroke="#0f172a"
                            strokeWidth="0.02"
                        >
                            <title>{slice.name}: {slice.value}</title>
                        </path>
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md rounded-full w-1/3 h-1/3 flex items-center justify-center border border-white/10 shadow-inner">
                    <span className="text-[10px] font-black text-white">{total}</span>
                </div>
            </div>
        </div>
    );
};

const ChartLegend = ({ data }: { data: { name: string, value: number, color: string }[] }) => (
    <div className="flex flex-col gap-y-0.5">
        {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight truncate">
                    {item.name}: <span className="text-white">{item.value}</span>
                </span>
            </div>
        ))}
    </div>
);

export default function CommandCenter() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();

    const [hasMounted, setHasMounted] = useState(false);
    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [csRegistrationOpen, setCsRegistrationOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ role?: string; username?: string } | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [lastSnapshot, setLastSnapshot] = useState<any>(null);
    const [isSnapshotting, setIsSnapshotting] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const getWeekNumber = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    };

    useEffect(() => {
        if (!hasMounted || !user) return;

        async function loadData() {
            if (!user) return;
            // Fetch User
            const { data: memberData } = await supabase
                .from('members')
                .select('role, username')
                .eq('user_id', user.id)
                .single();
            if (memberData) setCurrentUser(memberData);

            // Fetch settings
            const { data: settingsData } = await supabase
                .from('settings')
                .select('*')
                .eq('id', 1).single();
            
            if (settingsData) {
                setRegistrationOpen(settingsData.registration_open || false);
                setCsRegistrationOpen(settingsData.cs_registration_open || false);
            }

            // Fetch All Members for stats
            const { data: membersData } = await supabase.from('members').select('*');
            if (membersData) setMembers(membersData);

            // Fetch last growth snapshot info
            const { data: lastSnap } = await supabase
                .from('growth_snapshots')
                .select('week_label, captured_at')
                .order('captured_at', { ascending: false })
                .limit(1);
            if (lastSnap && lastSnap.length > 0) setLastSnapshot(lastSnap[0]);
        }
        loadData();
    }, [hasMounted, user]);

    const isSuperAdmin = user?.id === '1ae3fd86-2f52-45d7-9b37-00d41e42cabf' || (user as any)?.username === 'Zovian';

    const triggerSnapshot = async (overwrite = false) => {
        setIsSnapshotting(true);
        try {
            const response = await fetch(`/api/cron/snapshot?secret=${process.env.NEXT_PUBLIC_CRON_SECRET || 'manual'}${overwrite ? '&overwrite=true' : ''}`);
            const result = await response.json();
            if (response.ok) {
                alert(`✅ Snapshot successful: ${result.message}`);
                window.location.reload();
            } else {
                alert(`❌ Failed: ${result.error || result.message}`);
            }
        } catch (err) {
            alert("❌ Network Error: Could not trigger snapshot.");
        } finally {
            setIsSnapshotting(false);
        }
    };

    // Calculate Stats
    const getStats = (event: 'DS' | 'CS') => {
        const assignedA = members.filter(m => (event === 'DS' ? m.team_assignment : m.cs_team_assignment) === 'A').length;
        const assignedB = members.filter(m => (event === 'DS' ? m.team_assignment : m.cs_team_assignment) === 'B').length;
        const assignedNone = members.filter(m => (event === 'DS' ? m.ds_choice : m.cs_choice) && !(event === 'DS' ? m.team_assignment : m.cs_team_assignment)).length;

        const reqA = members.filter(m => (event === 'DS' ? m.ds_team : m.cs_team) === 'Team A').length;
        const reqB = members.filter(m => (event === 'DS' ? m.ds_team : m.cs_team) === 'Team B').length;
        const reqBoth = members.filter(m => (event === 'DS' ? m.ds_team : m.cs_team) === 'Both').length;

        return {
            assigned: [
                { name: 'Team A', value: assignedA, color: '#2563eb' },
                { name: 'Team B', value: assignedB, color: '#16a34a' },
                { name: 'Pending', value: assignedNone, color: '#64748b' }
            ],
            requested: [
                { name: 'Team A', value: reqA, color: '#3b82f6' },
                { name: 'Team B', value: reqB, color: '#22c55e' },
                { name: 'Both', value: reqBoth, color: '#8b5cf6' }
            ]
        };
    };

    const dsStats = getStats('DS');
    const csStats = getStats('CS');

    if (!hasMounted) return null;

    if (!user || (currentUser && currentUser.role !== 'R4' && currentUser.role !== 'R5')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-red-500 uppercase italic tracking-widest">{t('unauthorized')}</h1>
                    <Link href="/hub">
                        <button className="px-6 py-3 bg-red-600/20 text-red-500 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all">
                            {t('backToHub')}
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-72px)] px-1 py-1 md:py-2 pb-28 md:pb-6 bg-slate-900 text-slate-100 overflow-x-hidden">
            <div className="max-w-6xl mx-auto space-y-2 animate-in fade-in slide-in-from-top-4">
                
                <div className="flex items-center justify-between px-2 h-8">
                    <div className="flex items-center gap-3">
                        <Link href="/hub">
                            <button className="text-slate-500 hover:text-white flex items-center gap-1 text-[8px] font-black uppercase tracking-widest transition-colors bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                ← HUB
                            </button>
                        </Link>
                        <h1 className="text-lg md:text-2xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-600">
                            {t('commandCenter')}
                        </h1>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {/* LEFT COLUMN: DESERT STORM */}
                    <div className="space-y-2 bg-slate-800/40 p-2 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between border-b border-pink-500/10 pb-1">
                            <h3 className="text-[10px] font-black text-white italic tracking-widest">DESERT STORM</h3>
                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${registrationOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {registrationOpen ? 'WINDOW OPEN' : 'WINDOW CLOSED'}
                            </span>
                        </div>

                        {/* DS Command Section */}
                        <div className="space-y-1.5 pt-1">
                            <button
                                onClick={async () => {
                                    if (!window.confirm(`⚠️ Confirm ${registrationOpen ? 'CLOSING' : 'OPENING'} DS signups?`)) return;
                                    const newStatus = !registrationOpen;
                                    const { error } = await supabase.from('settings').update({ registration_open: newStatus }).eq('id', 1).single();
                                    if (error) alert("Error: " + error.message);
                                    else {
                                        setRegistrationOpen(newStatus);
                                        await supabase.from('audit_logs').insert({ user_id: user?.id, username: currentUser?.username, action: newStatus ? "OPEN_SIGNUPS" : "CLOSE_SIGNUPS", details: { context: "Command Center" } });
                                    }
                                }}
                                className={`w-full py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${registrationOpen ? 'bg-red-600/20 text-red-500 border border-red-500/30' : 'bg-green-600/20 text-green-500 border border-green-500/30'}`}
                            >
                                {registrationOpen ? "CLOSE" : "OPEN"} SIGNUPS
                            </button>
                            
                            <button
                                onClick={async () => {
                                    if (!window.confirm("❗ DANGER: Clear ALL DS signups? This cannot be undone.")) return;
                                    const { error } = await supabase.from('members').update({ ds_choice: null, ds_team: null, ds_signup_time: null, team_assignment: null }).not('user_id', 'is', null);
                                    if (error) alert("Error: " + error.message);
                                    else {
                                        await supabase.from('audit_logs').insert({ user_id: user?.id, username: currentUser?.username, action: "CLEAR_ALL_SIGNUPS", details: { context: "Command Center" } });
                                        window.location.reload();
                                    }
                                }}
                                className="w-full py-1.5 bg-slate-900/50 text-slate-500 border border-slate-700 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30"
                            >
                                CLEAR ALL DATA
                            </button>
                        </div>

                        {/* DS Stats - Stacked */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                                <SimplePieChart data={dsStats.assigned} size={65} />
                                <div className="flex-1">
                                    <p className="text-[7px] font-black text-pink-500/50 uppercase mb-1 tracking-widest italic">ASSIGNMENT STATUS</p>
                                    <ChartLegend data={dsStats.assigned} />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                                <SimplePieChart data={dsStats.requested} size={65} />
                                <div className="flex-1">
                                    <p className="text-[7px] font-black text-pink-500/50 uppercase mb-1 tracking-widest italic">MEMBER REQUESTS</p>
                                    <ChartLegend data={dsStats.requested} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CANYON STORM */}
                    <div className="space-y-2 bg-slate-800/40 p-2 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between border-b border-orange-500/10 pb-1">
                            <h3 className="text-[10px] font-black text-white italic tracking-widest">CANYON STORM</h3>
                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${csRegistrationOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {csRegistrationOpen ? 'WINDOW OPEN' : 'WINDOW CLOSED'}
                            </span>
                        </div>

                        {/* CS Command Section */}
                        <div className="space-y-1.5 pt-1">
                            <button
                                onClick={async () => {
                                    if (!window.confirm(`⚠️ Confirm ${csRegistrationOpen ? 'CLOSING' : 'OPENING'} CS signups?`)) return;
                                    const newStatus = !csRegistrationOpen;
                                    const { error } = await supabase.from('settings').update({ cs_registration_open: newStatus }).eq('id', 1).single();
                                    if (error) alert("Error: " + error.message);
                                    else {
                                        setCsRegistrationOpen(newStatus);
                                        await supabase.from('audit_logs').insert({ user_id: user?.id, username: currentUser?.username, action: newStatus ? "OPEN_CS_SIGNUPS" : "CLOSE_CS_SIGNUPS", details: { context: "Command Center" } });
                                    }
                                }}
                                className={`w-full py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${csRegistrationOpen ? 'bg-red-600/20 text-red-500 border border-red-500/30' : 'bg-green-600/20 text-green-500 border border-green-500/30'}`}
                            >
                                {csRegistrationOpen ? "CLOSE" : "OPEN"} SIGNUPS
                            </button>
                            
                            <button
                                onClick={async () => {
                                    if (!window.confirm("❗ DANGER: Clear ALL CS signups? This cannot be undone.")) return;
                                    const { error } = await supabase.from('members').update({ cs_choice: null, cs_team: null, cs_team_assignment: null, cs_signup_time: null }).not('user_id', 'is', null);
                                    if (error) alert("Error: " + error.message);
                                    else {
                                        await supabase.from('audit_logs').insert({ user_id: user?.id, username: currentUser?.username, action: "CLEAR_ALL_CS_SIGNUPS", details: { context: "Command Center" } });
                                        window.location.reload();
                                    }
                                }}
                                className="w-full py-1.5 bg-slate-900/50 text-slate-500 border border-slate-700 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all hover:bg-orange-500/20 hover:text-orange-500 hover:border-orange-500/30"
                            >
                                CLEAR ALL DATA
                            </button>
                        </div>

                        {/* CS Stats - Stacked */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                                <SimplePieChart data={csStats.assigned} size={65} />
                                <div className="flex-1">
                                    <p className="text-[7px] font-black text-orange-500/50 uppercase mb-1 tracking-widest italic">ASSIGNMENT STATUS</p>
                                    <ChartLegend data={csStats.assigned} />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                                <SimplePieChart data={csStats.requested} size={65} />
                                <div className="flex-1">
                                    <p className="text-[7px] font-black text-orange-500/50 uppercase mb-1 tracking-widest italic">MEMBER REQUESTS</p>
                                    <ChartLegend data={csStats.requested} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM SECTION: GROWTH OPERATIONS - RESTRICTED TO ZOVIAN ONLY */}
                {isSuperAdmin && (
                    <div className="bg-slate-800/40 p-4 rounded-xl border border-pink-500/10 space-y-4">
                        <div className="flex items-center justify-between border-b border-pink-500/10 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">📊</span>
                                <h3 className="text-[12px] font-black text-white italic tracking-widest uppercase">Growth Logistics (Zovian Only)</h3>
                            </div>
                            {lastSnapshot && (
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                    Last Captured: <span className="text-pink-500">{lastSnapshot.week_label}</span> ({new Date(lastSnapshot.captured_at).toLocaleDateString()})
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">
                                    Manual Power Snapshot Override
                                </p>
                                <p className="text-[8px] text-slate-500 font-medium">
                                    Forces a snapshot of all active player power stats. This controls the global growth repository.
                                </p>
                            </div>
                            
                            <button
                                disabled={isSnapshotting}
                                onClick={() => {
                                    const now = new Date();
                                    const currentWeekLabel = `W${getWeekNumber(now)}-${now.getFullYear()}`;
                                    
                                    if (lastSnapshot && lastSnapshot.week_label === currentWeekLabel) {
                                        if (window.confirm(`⚠️ Data for this week (${lastSnapshot.week_label}) has already been captured. Overwrite existing records?`)) {
                                            triggerSnapshot(true);
                                        }
                                    } else {
                                        if (window.confirm("🚀 Trigger manual power snapshot for all members?")) {
                                            triggerSnapshot(false);
                                        }
                                    }
                                }}
                                className={`py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                    isSnapshotting ? 'bg-slate-800 text-slate-600 animate-pulse' : 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-lg hover:shadow-pink-500/20 hover:scale-[1.02]'
                                }`}
                            >
                                {isSnapshotting ? 'SYNCING_INTEL...' : '🚀 Execute Manual Snapshot'}
                            </button>
                        </div>
                    </div>
                )}

                <footer className="pt-2 border-t border-white/5 flex justify-between items-center opacity-30 px-2">
                    <p className="text-[6px] font-black uppercase tracking-[0.2em]">020 Strategic Command</p>
                    <p className="text-[6px] font-black uppercase tracking-[0.2em]">Operational Status: Active</p>
                </footer>
            </div>
        </div>
    );
}
