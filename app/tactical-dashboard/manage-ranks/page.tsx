"use client";

import React, { useState, useEffect } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../lib/LanguageContext';
import Link from 'next/link';

interface Member {
    user_id: string;
    username: string;
    total_hero_power: number;
    squad_1_power: number;
    role?: string;
}

const displayPower = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    const validNum = num || 0;
    if (validNum === 0) return "0.0M";
    if (validNum > 10000000) return (validNum / 1000000).toFixed(1) + "M";
    if (validNum < 5000) return validNum.toFixed(1) + "M";
    return (validNum / 1000).toFixed(1) + "K";
};

export default function ManageRanksPage() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();
    const [hasMounted, setHasMounted] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [currentUser, setCurrentUser] = useState<Member | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;

        async function getData() {
            try {
                setIsLoading(true);
                const { data: membersData } = await supabase
                    .from('members')
                    .select('user_id, username, total_hero_power, squad_1_power, role')
                    .order('total_hero_power', { ascending: false });

                if (membersData) {
                    setMembers(membersData as Member[]);
                    if (user) {
                        const current = (membersData as Member[]).find(m => m.user_id === user.id);
                        if (current) setCurrentUser(current);
                    }
                }
            } catch (err) {
                console.error("Manage Ranks Data Loader Error:", err);
            } finally {
                setIsLoading(false);
            }
        }
        getData();
    }, [hasMounted, user]);

    if (!hasMounted) return null;

    const filteredMembers = members.filter(m => 
        m.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Role Guard
    if (currentUser && currentUser.role !== 'R4' && currentUser.role !== 'R5') {
        return (
            <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-8 pt-20">
                <div className="text-center space-y-4">
                    <div className="text-4xl mb-4">🚫</div>
                    <h1 className="text-xl font-black text-red-500 uppercase italic tracking-widest">{t('unauthorized')}</h1>
                    <Link href="/hub" className="text-slate-500 underline uppercase text-[8px] font-black tracking-[0.2em] hover:text-white transition-colors">Return to Hub</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-white pt-16 md:pt-24 pb-20 overflow-x-hidden">
            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            <main className="max-w-4xl mx-auto px-2 md:px-8 pb-28 md:pb-8 relative z-10 w-full overflow-x-hidden">
                <header className="mb-2 md:mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-2 px-2">
                    <div className="animate-in slide-in-from-left-8 duration-700">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-600 text-white text-[7px] font-black uppercase tracking-[0.2em] rounded">R4 COMMAND</span>
                        </div>
                        <h1 className="text-lg md:text-3xl font-black uppercase italic tracking-tighter leading-none mt-1">
                            MANAGE <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">OFFICER RANKS</span>
                        </h1>
                    </div>
                    
                    <Link href="/tactical-dashboard">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95">
                            <span className="text-slate-400 font-black text-[7px] uppercase tracking-widest">Dashboard →</span>
                        </div>
                    </Link>
                </header>

                <div className="mb-3 relative group px-2">
                    <input 
                        type="text" 
                        placeholder="Search officer name..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/60 backdrop-blur-3xl border border-white/5 p-2 px-9 rounded-xl text-[9px] md:text-xs font-black text-white uppercase outline-none focus:border-red-500/30 transition-all font-mono"
                    />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] opacity-40">🔍</span>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 mx-1">
                    <div className="overflow-x-auto w-full scrollbar-hide">
                        <table className="w-full text-left border-collapse min-w-[450px] md:min-w-full">
                            <thead>
                                <tr className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-4 md:px-6 py-2">Commander</th>
                                    <th className="px-4 md:px-6 py-2">Power</th>
                                    <th className="px-4 md:px-6 py-2">Rank</th>
                                    <th className="px-4 md:px-6 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-[9px] md:text-xs font-black text-slate-300">
                                {filteredMembers.map((m) => (
                                    <tr key={m.user_id} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-4 md:px-6 py-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded bg-slate-800 border border-white/5 flex items-center justify-center text-[8px] font-black text-slate-700 group-hover:text-red-500 transition-colors">
                                                    {m.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-white uppercase tracking-tighter truncate max-w-[80px] md:max-w-none">{m.username}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-6 py-1.5">
                                            <span className="font-mono text-pink-500/80">{displayPower(m.total_hero_power)}</span>
                                        </td>
                                        <td className="px-4 md:px-6 py-1.5">
                                            <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${
                                                m.role === 'R5' ? 'bg-orange-500/20 text-orange-400' :
                                                m.role === 'R4' ? 'bg-red-500/20 text-red-400' :
                                                m.role === 'R3' ? 'bg-blue-500/20 text-blue-400' :
                                                m.role === 'R2' ? 'bg-green-500/20 text-green-400' :
                                                'bg-white/5 text-slate-700'
                                            }`}>
                                                {m.role || 'R1'}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-1.5 text-right">
                                            {(m.role === 'R4' || m.role === 'R5') || (currentUser?.role !== 'R4' && currentUser?.role !== 'R5') ? (
                                                <span className="text-[6px] text-slate-800 uppercase italic">🔒 Locked</span>
                                            ) : (
                                                <select
                                                    className="bg-slate-800/50 border border-white/5 outline-none rounded-md px-1.5 py-0.5 text-[7px] font-black uppercase text-white cursor-pointer hover:border-red-500/20 transition-all appearance-none text-center"
                                                    value={m.role || 'R1'}
                                                    onChange={async (e) => {
                                                        const newRole = e.target.value;
                                                        const oldRole = m.role || 'R1';
                                                        const oldMembers = [...members];
                                                        
                                                        // Optimistic update
                                                        setMembers(members.map(member => member.user_id === m.user_id ? { ...member, role: newRole } : member));
                                                        
                                                        const { error } = await supabase.from('members').update({ role: newRole }).eq('user_id', m.user_id);
                                                        
                                                        if (error) { 
                                                            alert("Ops! " + error.message); 
                                                            setMembers(oldMembers); 
                                                        } else {
                                                            // Log the change
                                                            try {
                                                                await supabase.from('officer_logs').insert({
                                                                    actor_id: user?.id,
                                                                    actor_username: currentUser?.username || 'Unknown',
                                                                    target_id: m.user_id,
                                                                    target_username: m.username,
                                                                    old_role: oldRole,
                                                                    new_role: newRole,
                                                                    action_type: 'RANK_CHANGE'
                                                                });
                                                            } catch (logErr) {
                                                                console.error("Failed to log rank change:", logErr);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <option value="R1">R1</option>
                                                    <option value="R2">R2</option>
                                                    <option value="R3">R3</option>
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredMembers.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-slate-700 font-black uppercase italic text-[8px] tracking-[0.3em]">
                                            No matches found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <footer className="mt-4 flex justify-between items-center opacity-30 px-2">
                    <p className="text-[6px] font-black uppercase tracking-[0.2em]">020 Command Hub</p>
                    <p className="text-[6px] font-black uppercase tracking-[0.2em]">Data Synced</p>
                </footer>
            </main>
        </div>
    );
}
