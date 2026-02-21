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
        <main className="min-h-screen bg-slate-900 px-4 sm:px-6 pb-20 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-10%] right-[20%] w-[40rem] h-[40rem] bg-pink-600/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[20%] left-[-10%] w-[30rem] h-[30rem] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-full max-w-7xl h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-xl pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto">
                <header className="text-center mb-24">
                    <h1 className="text-3xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 uppercase italic tracking-tighter drop-shadow-2xl">
                        {t('aboutUs')}
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.5em] mt-6">
                        The Vanguard of 020 Alliance
                    </p>
                </header>

                {loading ? (
                    <div className="flex justify-center items-center py-32">
                        <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin shadow-[0_0_30px_rgba(236,72,153,0.5)]" />
                    </div>
                ) : (
                    <div className="space-y-32">
                        {orderedRoles.map((role) => (
                            <section key={role} className="relative">
                                {/* Section Header */}
                                <div className="flex items-center gap-6 mb-12">
                                    <div className="h-[2px] w-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full" />
                                    <h2 className="text-xl sm:text-3xl font-black text-white uppercase italic tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                        Rank {role}
                                    </h2>
                                    <div className="h-[2px] flex-1 bg-gradient-to-r from-purple-500/50 to-transparent rounded-full" />
                                </div>

                                {/* Members Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                                    {groupedMembers[role].map((member, i) => (
                                        <div
                                            key={member.user_id}
                                            className="group relative bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl hover:-translate-y-2 transition-transform duration-500 hover:shadow-[0_20px_40px_-20px_rgba(236,72,153,0.3)]"
                                        >
                                            {/* Glowing border effect on hover */}
                                            <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-pink-500/50 transition-colors duration-500" />

                                            <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-inner rounded-full flex items-center justify-center mx-auto mb-4 relative overflow-hidden">
                                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-purple-400">
                                                    {member.username.charAt(0).toUpperCase()}
                                                </span>
                                            </div>

                                            <div className="text-center relative z-10">
                                                <h3 className="text-white font-black text-sm uppercase tracking-wide truncate mb-1" title={member.username}>
                                                    {member.username}
                                                </h3>
                                                <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">
                                                    PWR: {(() => {
                                                        const num = typeof member.total_hero_power === 'string' ? parseFloat(member.total_hero_power) : (member.total_hero_power || 0);
                                                        if (num === 0) return "0.0M";
                                                        if (num >= 1000) return (num / 1000000).toFixed(1) + "M";
                                                        return num.toFixed(1) + "M";
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
