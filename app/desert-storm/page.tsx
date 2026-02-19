"use client";

import React, { useState, useEffect } from "react";
import { useStackApp } from "@stackframe/stack";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

interface MemberProfile {
    user_id: string;
    username: string;
    squad_1_power: number;
    ds_choice?: string;
    ds_team?: string; // Member's preference
    ds_signup_time?: string;
}

export default function DesertStormSignup() {
    const stack = useStackApp();
    const user = stack.useUser();

    const [userData, setUserData] = useState<MemberProfile | null>(null);
    const [selectedChoice, setSelectedChoice] = useState("");
    const [selectedTeam, setSelectedTeam] = useState(""); 
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [isWindowOpen, setIsWindowOpen] = useState(false);
    const [statusChecked, setStatusChecked] = useState(false);

    useEffect(() => {
        if (!user) return;

        async function fetchSystemAndUser() {
            const [userRes, settingsRes] = await Promise.all([
                supabase.from("members").select("*").eq("user_id", user!.id).single(),
                supabase.from("settings").select("registration_open").eq("id", 1).single()
            ]);

            if (userRes.data) {
                setUserData(userRes.data as MemberProfile);
                if (userRes.data.ds_choice) setSelectedChoice(userRes.data.ds_choice);
                if (userRes.data.ds_team) setSelectedTeam(userRes.data.ds_team);
            }

            if (settingsRes.data) {
                setIsWindowOpen(settingsRes.data.registration_open);
            }
            setStatusChecked(true);
        }
        fetchSystemAndUser();
    }, [user]);

    if (!user) return <div className="min-h-screen flex items-center justify-center bg-pink-50 font-black text-slate-400 uppercase text-[10px] tracking-widest">Identifying...</div>;
    if (!statusChecked) return <div className="min-h-screen flex items-center justify-center bg-pink-50 font-black text-slate-400 uppercase text-[10px] tracking-widest">Checking Protocol...</div>;

    if (!isWindowOpen) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-900 px-6">
                <div className="w-full max-w-md bg-white p-10 rounded-[3rem] text-center shadow-2xl">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🚫</div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase italic">Window Locked</h2>
                    <p className="text-slate-500 font-bold text-[10px] mt-4 leading-relaxed uppercase tracking-[0.2em]">
                        R4 Command has closed registration. No further modifications permitted.
                    </p>
                    <Link href="/" className="mt-10 block py-4 bg-slate-100 rounded-full font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all">
                        Return to Hub
                    </Link>
                </div>
            </main>
        );
    }

    const choices = ["Yes, I will be there 🎉", "Maybe, sign me as sub 🤔", "Sorry, can't make it 😢"];
    const teams = [
        { id: "Team A", label: "Team A (Fri 09:00 Server)" },
        { id: "Team B", label: "Team B (Fri 23:00 Server)" }
    ];

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200" />
            
            <Link href="/" className="relative z-10 mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-all font-black uppercase text-[10px] tracking-widest">
                <span>←</span> Return to 020 Strategic Hub
            </Link>

            <div className="relative w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl p-10 border border-white/50">
                <header className="text-center mb-10">
                    <h1 className="text-4xl font-black text-slate-800 italic uppercase tracking-tighter">Desert Storm</h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Mobilization Protocol</p>
                </header>

                {!showPreview ? (
                    <div className="space-y-6">
                        <section className="space-y-3">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] text-center mb-2">Step 1: Availability</p>
                            {choices.map((choice) => (
                                <button key={choice} onClick={() => setSelectedChoice(choice)}
                                    className={`w-full py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2
                                    ${selectedChoice === choice ? "bg-slate-900 text-white border-transparent" : "bg-white border-slate-100 text-slate-400"}`}>
                                    {choice}
                                </button>
                            ))}
                        </section>

                        {selectedChoice.startsWith("Yes") && (
                            <section className="space-y-3 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                <p className="text-[9px] text-pink-500 font-black uppercase tracking-[0.2em] text-center mb-2">Step 2: Priority Choice</p>
                                {teams.map((team) => (
                                    <button key={team.id} onClick={() => setSelectedTeam(team.id)}
                                        className={`w-full py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2
                                        ${selectedTeam === team.id ? "bg-pink-600 text-white border-transparent" : "bg-white border-slate-100 text-slate-400"}`}>
                                        {team.label}
                                    </button>
                                ))}
                            </section>
                        )}

                        <button
                            disabled={!selectedChoice || (selectedChoice.startsWith("Yes") && !selectedTeam)}
                            onClick={() => setShowPreview(true)}
                            className="w-full mt-6 py-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black uppercase tracking-widest shadow-xl disabled:opacity-30 transition-all hover:scale-[1.02]"
                        >
                            Review Intel
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="bg-white border border-pink-100 rounded-[2.5rem] p-10 mb-8 space-y-4">
                            <div>
                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-1">Status</span>
                                <p className="text-xl font-black text-slate-800 uppercase italic">{selectedChoice}</p>
                            </div>
                            {selectedTeam && selectedChoice.startsWith("Yes") && (
                                <div>
                                    <span className="text-[9px] text-pink-500 uppercase font-black tracking-widest block mb-1">Requested Team</span>
                                    <p className="text-xl font-black text-pink-600 uppercase italic">{selectedTeam}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowPreview(false)} className="flex-1 py-5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase text-[10px]">Edit</button>
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    const { error } = await supabase.from("members").upsert({
                                        ...userData,
                                        ds_choice: selectedChoice,
                                        ds_team: selectedChoice.startsWith("Yes") ? selectedTeam : null,
                                        ds_signup_time: new Date().toISOString()
                                    }, { onConflict: "user_id" });

                                    if (error) { setLoading(false); console.error(error.message); } 
                                    else { window.location.href = "/"; }
                                }}
                                className="flex-1 py-5 rounded-full bg-slate-900 text-white font-black uppercase text-[10px]"
                            >
                                {loading ? "Syncing..." : "Confirm Deployment"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}