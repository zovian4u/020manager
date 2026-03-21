"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/LanguageContext";

interface Member {
    user_id: string;
    username: string;
    role: string;
    total_hero_power: number;
}

const RANK_ORDER: Record<string, number> = {
    "R5": 5,
    "R4": 4,
    "R3": 3,
    "R2": 2,
    "R1": 1,
    "Member": 0
};

export default function AboutUs() {
    const { t } = useLanguage();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMembers() {
            setLoading(true);
            const { data, error } = await supabase
                .from("members")
                .select("user_id, username, role, total_hero_power");

            if (data && !error) {
                // Sort by rank first, then by hero power
                const sorted = data.sort((a, b) => {
                    const rankA = RANK_ORDER[a.role || "Member"] ?? -1;
                    const rankB = RANK_ORDER[b.role || "Member"] ?? -1;
                    if (rankB !== rankA) {
                        return rankB - rankA;
                    }
                    return (b.total_hero_power || 0) - (a.total_hero_power || 0);
                });
                setMembers(sorted);
            }
            setLoading(false);
        }
        fetchMembers();
    }, []);

    const groupedMembers = members.reduce((acc, member) => {
        const role = member.role || "Member";
        if (!acc[role]) acc[role] = [];
        acc[role].push(member);
        return acc;
    }, {} as Record<string, Member[]>);

    const orderedRoles = ["R5", "R4", "R3", "R2", "R1", "Member"].filter(r => groupedMembers[r]?.length > 0);

    return (
        <main className="min-h-screen bg-slate-900 px-4 sm:px-6 pt-12 md:pt-20 pb-20 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-10%] right-[20%] w-[40rem] h-[40rem] bg-pink-600/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[20%] left-[-10%] w-[30rem] h-[30rem] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-full max-w-7xl h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-xl pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto">
                <header className="text-center mb-24">
                    <h1 className="text-3xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 uppercase italic tracking-tighter drop-shadow-2xl py-2">
                        {t('aboutUs')}
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.5em] mt-6">
                        The Vanguard of 020 Alliance
                    </p>
                </header>

                {/* Season Gallery Section */}
                <div className="grid grid-cols-2 gap-4 md:gap-8 mb-16 group">
                    <div className="relative group/season">
                        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-purple-600 rounded-3xl md:rounded-[3rem] blur opacity-25 group-hover/season:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-slate-900 rounded-3xl md:rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                            <img
                                src="/images/about/season 3.jpg"
                                alt="020 Season 3"
                                className="w-full h-[180px] sm:h-[250px] md:h-[300px] object-cover hover:scale-110 transition-transform duration-[2s] cursor-zoom-in"
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent">
                                <span className="text-pink-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.4em] mb-1 block">Legacy</span>
                                <h3 className="text-xs md:text-xl font-black text-white italic uppercase tracking-tighter">Season 3</h3>
                            </div>
                        </div>
                    </div>

                    <div className="relative group/season">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-600 rounded-3xl md:rounded-[3rem] blur opacity-25 group-hover/season:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-slate-900 rounded-3xl md:rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                            <img
                                src="/images/about/season 4.jpg"
                                alt="020 Season 4"
                                className="w-full h-[180px] sm:h-[250px] md:h-[300px] object-cover hover:scale-110 transition-transform duration-[2s] cursor-zoom-in"
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent">
                                <span className="text-blue-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.4em] mb-1 block">Active</span>
                                <h3 className="text-xs md:text-xl font-black text-white italic uppercase tracking-tighter">Season 4</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Localized Description Section */}
                <div className="grid grid-cols-2 gap-3 md:gap-6 mb-16">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-2xl hover:bg-white/10 transition-all duration-500">
                        <div className="text-emerald-500 mb-2 text-xl">🌍</div>
                        <p className="text-slate-200 font-medium leading-normal text-[11px] md:text-sm">{t('aboutIntro')}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-2xl hover:bg-white/10 transition-all duration-500">
                        <div className="text-purple-500 mb-2 text-xl">💬</div>
                        <p className="text-slate-200 font-medium leading-normal text-[11px] md:text-sm">{t('aboutGroups')}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-2xl hover:bg-white/10 transition-all duration-500">
                        <div className="text-pink-500 mb-2 text-xl">⚡</div>
                        <p className="text-slate-200 font-medium leading-normal text-[11px] md:text-sm">{t('aboutInactive')}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-2xl hover:bg-white/10 transition-all duration-500">
                        <div className="text-sky-500 mb-2 text-xl">🤝</div>
                        <p className="text-slate-200 font-medium leading-normal text-[11px] md:text-sm">{t('aboutSpirit')}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-32">
                        <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin shadow-[0_0_30px_rgba(236,72,153,0.5)]" />
                    </div>
                ) : (
                    <div className="space-y-12 pb-20">
                        {orderedRoles.map((role) => {
                            const isAlpha = role === "R5" || role === "R4" || role === "R3";

                            return (
                                <section key={role} className="relative">
                                    {/* Section Header */}
                                    <div className="flex items-center gap-4 mb-6">
                                        <h2 className={`font-black uppercase italic tracking-widest ${isAlpha ? 'text-xl sm:text-2xl text-white' : 'text-sm text-slate-400'}`}>
                                            Rank {role}
                                        </h2>
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-700/50 to-transparent rounded-full" />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                            {role === 'R5' ? 'Leader' : role === 'R4' ? 'Admin' : 'Member'}
                                        </span>
                                    </div>

                                    {/* Conditional Grid Layout */}
                                    {isAlpha ? (
                                        /* Prominent cards for High Ranks */
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {groupedMembers[role].map((member) => (
                                                <div
                                                    key={member.user_id}
                                                    className="group relative bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all duration-300"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-full flex items-center justify-center relative overflow-hidden">
                                                            <span className="text-xs font-black text-pink-400">
                                                                {member.username.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-white font-black text-[11px] uppercase truncate" title={member.username}>
                                                                {member.username}
                                                            </h3>
                                                            <p className="text-[9px] text-pink-400/70 font-bold uppercase">
                                                                {(() => {
                                                                    const num = typeof member.total_hero_power === 'string' ? parseFloat(member.total_hero_power) : (member.total_hero_power || 0);
                                                                    // Show in Millions if > 1000000, otherwise show raw Millions if it's already a million-scale number
                                                                    return num >= 1000 ? (num / 1000000).toFixed(1) + "M" : num.toFixed(1) + "M";
                                                                })()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        /* High-density layout for R2 and lower */
                                        <div className="flex flex-wrap gap-2">
                                            {groupedMembers[role].map((member) => (
                                                <div
                                                    key={member.user_id}
                                                    className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-2 rounded-xl group hover:border-slate-500 transition-colors"
                                                >
                                                    <span className="text-white font-bold text-[10px] uppercase">{member.username}</span>
                                                    <span className="text-[9px] text-slate-500 font-black">
                                                        {(() => {
                                                            const num = typeof member.total_hero_power === 'string' ? parseFloat(member.total_hero_power) : (member.total_hero_power || 0);
                                                            return num >= 1000 ? (num / 1000000).toFixed(1) + "M" : num.toFixed(1) + "M";
                                                        })()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
