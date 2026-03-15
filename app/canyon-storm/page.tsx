"use client";

import React, { useState, useEffect } from "react";
import { useStackApp } from "@stackframe/stack";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { useLanguage } from "../../lib/LanguageContext";

interface MemberProfile {
    user_id: string;
    username: string;
    total_hero_power: number;
    squad_1_power: number;
    arena_power?: number;
    cs_choice?: string;
    cs_team?: string; // Member's preference
    cs_signup_time?: string;
}

export default function CanyonStormSignup() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();

    const [userData, setUserData] = useState<MemberProfile | null>(null);
    const [selectedChoice, setSelectedChoice] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [statsData, setStatsData] = useState({
        total_hero_power: 0,
        squad_1_power: 0,
        arena_power: 0,
    });

    const [isWindowOpen, setIsWindowOpen] = useState(false);
    const [statusChecked, setStatusChecked] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!user) return;

        async function fetchSystemAndUser() {
            const [userRes, settingsRes] = await Promise.all([
                supabase.from("members").select("*").eq("user_id", user!.id).single(),
                supabase.from("settings").select("cs_registration_open").eq("id", 1).single()
            ]);

            if (userRes.data) {
                setUserData(userRes.data as MemberProfile);
                if (userRes.data.cs_choice) setSelectedChoice(userRes.data.cs_choice);
                if (userRes.data.cs_team) setSelectedTeam(userRes.data.cs_team);

                const formatForUI = (val: number) => {
                    if (!val) return 0;
                    return val > 5000 ? val / 1000000 : val;
                };
                setStatsData({
                    total_hero_power: formatForUI(userRes.data.total_hero_power || 0),
                    squad_1_power: formatForUI(userRes.data.squad_1_power || 0),
                    arena_power: formatForUI(userRes.data.arena_power || 0),
                });
            }

            if (settingsRes.data) {
                setIsWindowOpen(settingsRes.data.cs_registration_open);
            }
            setStatusChecked(true);
        }
        fetchSystemAndUser();
    }, [user]);

    if (!user) return <div className="min-h-screen flex items-center justify-center bg-orange-50 font-black text-slate-400 uppercase text-[10px] tracking-widest">{t('identifying')}</div>;
    if (!statusChecked) return <div className="min-h-screen flex items-center justify-center bg-orange-50 font-black text-slate-400 uppercase text-[10px] tracking-widest">{t('checkingProtocol')}</div>;

    if (!isWindowOpen) {
        return (
            <div className="flex flex-col items-center justify-start bg-slate-900 px-6 pb-12 pt-8">
                <div className="w-full max-w-md bg-white p-10 rounded-[3rem] text-center shadow-2xl z-10">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🚫</div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase italic">Window Locked</h2>
                    <p className="text-slate-500 font-bold text-[10px] mt-4 leading-relaxed uppercase tracking-[0.2em]">
                        {t('registrationClosed')}
                    </p>
                    <Link href="/hub" className="mt-10 block py-4 bg-slate-100 rounded-full font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all">
                        {t('returnToHub')}
                    </Link>
                </div>
            </div>
        );
    }

    const choices = ["Yes, I will be there 🎉", "Maybe, sign me as sub 🤔", "Sorry, can't make it 😢"];
    const teams = [
        { id: "Team A", label: "Team A (Thu 12:00 Server)" },
        { id: "Team B", label: "Team B (Thu 12:00 Server)" },
        { id: "Both", label: "Both Teams (Any)" }
    ];

    return (
        <div className="relative flex flex-col items-center justify-start px-4 sm:px-6 pb-12 pt-4 sm:pt-8 overflow-y-auto w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-200 via-pink-200 to-red-200" />

            <div className="relative w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-[3rem] shadow-2xl p-6 sm:p-10 border border-white/50 z-10 mt-4 sm:mt-8">
                <header className="text-center mb-10">
                    <h1 className="text-2xl sm:text-4xl font-black text-orange-600 italic uppercase tracking-tighter">{t('canyonStorm')}</h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">{t('mobilizationProtocol')}</p>
                </header>

                {isSuccess ? (
                    <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-lg border-4 border-white animate-bounce">✅</div>
                        <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-4">{t('registered')}!</h2>
                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-8 text-left">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">{t('status')}</p>
                            <p className="font-bold text-slate-700 uppercase mb-4">
                                {selectedChoice === choices[0] ? t('yesBeThere') : selectedChoice === choices[1] ? t('maybeSub') : t('sorryCantMakeIt')}
                            </p>

                            {selectedTeam && selectedChoice.startsWith("Yes") && (
                                <>
                                    <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-2">{t('requestedTeam')}</p>
                                    <p className="font-bold text-orange-600 uppercase">
                                        {selectedTeam === "Team A" ? "Team A (Thu 12:00 Server)" : selectedTeam === "Team B" ? "Team B (Thu 12:00 Server)" : "Both Teams (Any)"}
                                    </p>
                                </>
                            )}
                        </div>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-8 leading-relaxed">
                            Your orders have been logged in the Strategic Hub. <br />R4 Command will finalize team assignments soon.
                        </p>
                        <Link href="/hub" className="block w-full py-5 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:scale-105 transition-all">
                            {t('backToHub')}
                        </Link>
                    </div>
                ) : !showPreview ? (
                    <div className="space-y-6">
                        <section className="space-y-3">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] text-center mb-2">{t('step1Availability')}</p>
                            {choices.map((choice) => (
                                <button key={choice} onClick={() => setSelectedChoice(choice)}
                                    className={`w-full py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2
                                    ${selectedChoice === choice ? "bg-slate-900 text-white border-transparent" : "bg-white border-slate-100 text-slate-400"}`}>
                                    {choice === choices[0] ? t('yesBeThere') : choice === choices[1] ? t('maybeSub') : t('sorryCantMakeIt')}
                                </button>
                            ))}
                        </section>

                        {selectedChoice.startsWith("Yes") && (
                            <section className="space-y-3 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                <p className="text-[9px] text-orange-500 font-black uppercase tracking-[0.2em] text-center mb-2">{t('step2Priority')}</p>
                                {teams.map((team) => (
                                    <button key={team.id} onClick={() => setSelectedTeam(team.id)}
                                        className={`w-full py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2
                                        ${selectedTeam === team.id ? "bg-orange-600 text-white border-transparent" : "bg-white border-slate-100 text-slate-400"}`}>
                                        {team.id === "Team A" ? "Team A (Thu 12:00 Server)" : team.id === "Team B" ? "Team B (Thu 12:00 Server)" : "Both Teams (Any)"}
                                    </button>
                                ))}
                            </section>
                        )}

                        <button
                            disabled={!selectedChoice || (selectedChoice.startsWith("Yes") && !selectedTeam)}
                            onClick={() => setShowPreview(true)}
                            className="w-full mt-6 py-6 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-black uppercase tracking-widest shadow-xl disabled:opacity-30 transition-all hover:scale-[1.02]"
                        >
                            {t('submitIntel')}
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="bg-white border border-orange-100 rounded-[2.5rem] p-10 mb-8 space-y-4 text-left">
                            <div>
                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-1">{t('ign' as any)}</span>
                                <p className="text-xl font-black text-slate-800 uppercase italic">
                                    {userData?.username || "Commander"}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-1">{t('totalPower')}</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={statsData.total_hero_power === 0 ? "" : statsData.total_hero_power}
                                        placeholder="0.0"
                                        className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 font-bold outline-none w-full"
                                        onChange={e => setStatsData({ ...statsData, total_hero_power: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-1">{t('squad1Power')}</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={statsData.squad_1_power === 0 ? "" : statsData.squad_1_power}
                                        placeholder="0.0"
                                        className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 font-bold outline-none w-full"
                                        onChange={e => setStatsData({ ...statsData, squad_1_power: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-1">{t('arenaPower')}</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={statsData.arena_power === 0 ? "" : statsData.arena_power}
                                        placeholder="0.0"
                                        className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 font-bold outline-none w-full"
                                        onChange={e => setStatsData({ ...statsData, arena_power: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-1">{t('status')}</span>
                                <p className="text-xl font-black text-slate-800 uppercase italic">
                                    {selectedChoice === choices[0] ? t('yesBeThere') : selectedChoice === choices[1] ? t('maybeSub') : t('sorryCantMakeIt')}
                                </p>
                            </div>
                            {selectedTeam && selectedChoice.startsWith("Yes") && (
                                <div>
                                    <span className="text-[9px] text-orange-500 uppercase font-black tracking-widest block mb-1">{t('requestedTeam')}</span>
                                    <p className="text-xl font-black text-orange-600 uppercase italic">
                                        {selectedTeam === "Team A" ? "Team A (Thu 12:00 Server)" : selectedTeam === "Team B" ? "Team B (Thu 12:00 Server)" : "Both Teams (Any)"}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowPreview(false)} className="flex-1 py-5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase text-[10px]">{t('edit')}</button>
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    const smartScale = (val: number) => {
                                        if (val <= 0) return 0;
                                        return val < 5000 ? Math.round(val * 1000000) : Math.round(val);
                                    };
                                    
                                    const finalTHP = smartScale(statsData.total_hero_power);
                                    const finalS1P = smartScale(statsData.squad_1_power);
                                    const finalAP = smartScale(statsData.arena_power);

                                    const { error } = await supabase.from("members").upsert({
                                        ...userData,
                                        total_hero_power: finalTHP,
                                        squad_1_power: finalS1P,
                                        arena_power: finalAP,
                                        cs_choice: selectedChoice,
                                        cs_team: selectedChoice.startsWith("Yes") ? selectedTeam : null,
                                        cs_signup_time: new Date().toISOString()
                                    }, { onConflict: "user_id" });

                                    if (error) { setLoading(false); console.error(error.message); }
                                    else { setIsSuccess(true); }
                                }}
                                className="flex-1 py-5 rounded-full bg-slate-900 text-white font-black uppercase text-[10px]"
                            >
                                {loading ? t('syncing') : t('confirmDeployment')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
