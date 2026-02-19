"use client";

import React, { useState, useEffect } from "react";
import { useStackApp } from "@stackframe/stack";
import { supabase } from "../../lib/supabase";

interface MemberProfile {
    user_id: string;
    username: string;
    squad_1_power: number;
    ds_choice?: string;
    ds_signup_time?: string;
}

export default function DesertStormSignup() {
    const stack = useStackApp();
    const user = stack.useUser();

    const [userData, setUserData] = useState<MemberProfile | null>(null);
    const [selectedChoice, setSelectedChoice] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // ✅ Registration Window State
    const [isWindowOpen, setIsWindowOpen] = useState(false);
    const [statusChecked, setStatusChecked] = useState(false);

    useEffect(() => {
        if (!user) return;

        async function fetchSystemAndUser() {
            // ✅ Fetch both User profile and Global Window Status
            const [userRes, settingsRes] = await Promise.all([
                supabase.from("members").select("*").eq("user_id", user!.id).single(),
                supabase.from("settings").select("registration_open").eq("id", 1).single()
            ]);

            if (userRes.data) {
                setUserData(userRes.data as MemberProfile);
                if (userRes.data.ds_choice) setSelectedChoice(userRes.data.ds_choice);
            }

            if (settingsRes.data) {
                setIsWindowOpen(settingsRes.data.registration_open);
            }
            setStatusChecked(true);
        }
        fetchSystemAndUser();
    }, [user]);

    if (!user) return <div className="min-h-screen flex items-center justify-center bg-pink-50">...</div>;
    if (!statusChecked) return <div className="min-h-screen flex items-center justify-center bg-pink-50">Checking Protocol...</div>;

    // 🛡️ BLOCKADE: If R4 has closed the window, show this instead of the signup UI
    if (!isWindowOpen) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-900 px-6">
                <div className="w-full max-w-md bg-white p-10 rounded-[3rem] text-center shadow-2xl animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🚫</div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase italic">Window Locked</h2>
                    <p className="text-slate-500 font-bold text-[10px] mt-4 leading-relaxed uppercase tracking-[0.2em]">
                        R4 Command has closed the registration window. No further signups or modifications are permitted.
                    </p>
                    <button 
                        onClick={() => window.location.href = "/"} 
                        className="mt-10 w-full py-4 bg-slate-100 rounded-full font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all cursor-pointer"
                    >
                        Return to Hub
                    </button>
                </div>
            </main>
        );
    }

    const choices = ["Yes, I will be there 🎉", "Maybe, sign me as sub 🤔", "Sorry, can't make it 😢"];

    const formatTime = (timeStr: string) => {
        try {
            const date = new Date(timeStr.replace(' ', 'T'));
            return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return timeStr;
        }
    };

    return (
        <main className="relative min-h-screen flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200" />

            <div className="relative w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl p-10 border border-white/50">
                <header className="text-center mb-10">
                    <h1 className="text-4xl font-black text-slate-800 italic uppercase tracking-tighter">Desert Storm</h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Mobilization Protocol</p>
                </header>

                <div className="bg-white/60 border border-white rounded-[2.5rem] p-8 mb-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-left">
                            <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Commander</p>
                            <p className="text-xl font-black text-slate-800 uppercase">{userData?.username || "---"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Squad Power</p>
                            <p className="text-xl font-black text-pink-600 italic">{userData?.squad_1_power || 0}M</p>
                        </div>
                    </div>

                    {userData?.ds_signup_time && (
                        <div className="pt-4 border-t border-white/40">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Last Sync Time</p>
                            <p className="text-[11px] font-bold text-slate-600 uppercase">
                                {formatTime(userData.ds_signup_time)}
                            </p>
                        </div>
                    )}
                </div>

                {!showPreview ? (
                    <div className="space-y-4">
                        {choices.map((choice) => (
                            <button
                                key={choice}
                                onClick={() => setSelectedChoice(choice)}
                                className={`w-full py-6 px-8 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 border-2
                                    ${selectedChoice === choice
                                        ? "bg-slate-900 text-white border-transparent shadow-lg scale-[1.02]"
                                        : "bg-white border-slate-100 text-slate-400 hover:border-pink-200"
                                    }`}
                            >
                                {choice}
                            </button>
                        ))}
                        <button
                            disabled={!selectedChoice}
                            onClick={() => setShowPreview(true)}
                            className="w-full mt-10 py-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black uppercase tracking-widest shadow-xl cursor-pointer disabled:opacity-30"
                        >
                            Review Intel
                        </button>
                    </div>
                ) : (
                    <div className="animate-in zoom-in duration-300 text-center">
                        <div className="bg-white border border-pink-100 rounded-[2.5rem] p-10 mb-10">
                            <span className="text-[10px] text-pink-500 uppercase font-black tracking-widest block mb-3">Target Directive</span>
                            <p className="text-xl font-black text-slate-800 italic uppercase">{selectedChoice}</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowPreview(false)} className="flex-1 py-5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase text-[10px]">Edit</button>
                            <button
                                onClick={async () => {
                                    if (!userData) return;
                                    setLoading(true);
                                    const currentTime = new Date().toISOString();
                                    const { error } = await supabase
                                        .from("members")
                                        .upsert({ ...userData, ds_choice: selectedChoice, ds_signup_time: currentTime }, { onConflict: "user_id" });

                                    if (error) {
                                        setLoading(false);
                                        console.error(error.message);
                                    } else {
                                        window.location.href = "/";
                                    }
                                }}
                                className="flex-1 py-5 rounded-full bg-slate-900 text-white font-black uppercase text-[10px] cursor-pointer"
                            >
                                {loading ? "Syncing..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}