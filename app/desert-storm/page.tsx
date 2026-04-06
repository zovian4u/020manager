"use client";

import React, { useState, useEffect } from "react";
import { useStackApp } from "@stackframe/stack";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { useLanguage } from "../../lib/LanguageContext";

interface MemberProfile {
    user_id: string;
    username: string;
    role?: string;
    total_hero_power: number;
    squad_1_power: number;
    arena_power?: number;
    ds_choice?: string;
    ds_team?: string; // Member's preference
    ds_signup_time?: string;
}

export default function DesertStormSignup() {
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
                supabase.from("settings").select("registration_open").eq("id", 1).single()
            ]);

            if (userRes.data) {
                setUserData(userRes.data as MemberProfile);
                if (userRes.data.ds_choice) setSelectedChoice(userRes.data.ds_choice);
                if (userRes.data.ds_team) setSelectedTeam(userRes.data.ds_team);

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
                setIsWindowOpen(settingsRes.data.registration_open);
            }
            setStatusChecked(true);
        }
        fetchSystemAndUser();
    }, [user]);

    if (!user) return <div className="min-h-screen flex items-center justify-center bg-pink-50 font-black text-slate-400 uppercase text-[10px] tracking-widest">{t('identifying')}</div>;
    if (!statusChecked) return <div className="min-h-screen flex items-center justify-center bg-pink-50 font-black text-slate-400 uppercase text-[10px] tracking-widest">{t('checkingProtocol')}</div>;

    if (!isWindowOpen) {
        return (
            <div className="min-h-[calc(100vh-72px)] px-4 md:px-8 pb-32 md:pb-8 bg-slate-50 text-slate-900 pt-8">
                <div className="w-full max-w-md bg-white p-10 rounded-[3rem] text-center shadow-2xl z-10">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🚫</div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase italic">{t('windowLocked')}</h2>
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

    const ALLOWED_ROLES = ["R1", "R2", "R3", "R4", "R5"];
    const userRole = userData?.role || "Guest";
    const hasAccess = ALLOWED_ROLES.includes(userRole);

    if (!hasAccess) {
        return (
            <div className="relative flex flex-col items-center justify-start px-4 sm:px-6 pb-20 sm:pb-12 pt-2 sm:pt-6 overflow-y-auto w-full min-h-screen">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200" />
                <div className="relative w-full max-w-lg bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-[3rem] shadow-2xl p-6 sm:p-10 border border-white/50 z-10 mt-2 sm:mt-8 text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl shadow-inner border-4 border-white">🔒</div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">{t('accessRestricted')}</h2>
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.25em] mb-6">{t('dsRegistrationLabel')}</p>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-left">
                        <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest mb-1">{t('currentRoleLabel')}</p>
                        <p className="text-base font-black text-amber-700 uppercase italic mb-3">{userRole}</p>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                            {t('onlyR2R5Allowed')}
                        </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">{t('needAccessLabel')}</p>
                        <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                            {t('contactR4Msg')}
                        </p>
                    </div>

                    <Link href="/hub" className="block w-full py-4 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:scale-105 transition-all">
                        {t('returnToHub2')}
                    </Link>
                </div>
            </div>
        );
    }

    const choices = ['YES', 'MAYBE', 'NO'];
    const choiceLabels: Record<string, string> = {
        'YES': t('yesBeThere'),
        'MAYBE': t('maybeSub'),
        'NO': t('sorryCantMakeIt')
    };

    const teams = [
        { id: "Team A", label: t('teamALabel') },
        { id: "Team B", label: t('teamBLabel') },
        { id: "Both", label: t('noPreference') }
    ];

    return (
        <div className="relative flex flex-col items-center justify-start px-4 sm:px-6 pb-20 sm:pb-12 pt-2 sm:pt-6 overflow-y-auto w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200" />

            <div className="relative w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-[3rem] shadow-2xl p-4 sm:p-10 border border-white/50 z-10 mt-2 sm:mt-8">
                <header className="text-center mb-4 md:mb-10">
                    <h1 className="text-xl sm:text-4xl font-black text-slate-800 italic uppercase tracking-tighter">{t('desertStorm')}</h1>
                    <p className="text-slate-500 font-bold uppercase text-[8px] md:text-[10px] tracking-[0.4em] mt-1">{t('mobilizationProtocol')}</p>
                </header>

                {isSuccess ? (
                    <div className="text-center py-4 md:py-10 animate-in fade-in zoom-in duration-500">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 text-3xl md:text-5xl shadow-lg border-4 border-white animate-bounce">✅</div>
                        <h2 className="text-lg sm:text-3xl font-black text-slate-800 uppercase italic mb-2 md:mb-4">{t('registered')}!</h2>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl p-4 md:p-6 mb-4 md:mb-8 text-left">
                            <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{t('status')}</p>
                            <p className="font-bold text-slate-700 uppercase mb-2 md:mb-4 text-xs md:text-base">
                                {choiceLabels[selectedChoice]}
                            </p>

                            {selectedTeam && selectedChoice === 'YES' && (
                                <>
                                    <p className="text-[8px] md:text-[10px] text-pink-500 font-black uppercase tracking-widest mb-1">{t('requestedTeam')}</p>
                                    <p className="font-bold text-pink-600 uppercase text-xs md:text-base">
                                        {selectedTeam === "Team A" ? t('teamALabel') : selectedTeam === "Team B" ? t('teamBLabel') : "Both Teams (Any)"}
                                    </p>
                                </>
                            )}
                        </div>
                        <p className="text-slate-500 font-bold text-[8px] md:text-[10px] uppercase tracking-widest mb-4 md:mb-8 leading-relaxed">
                            Orders logged. <br />R4 Command will finalize soon.
                        </p>
                        <Link href="/hub" className="block w-full py-4 md:py-5 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:scale-105 transition-all text-center">
                            {t('backToHub')}
                        </Link>
                    </div>
                ) : !showPreview ? (
                    <div className="space-y-2.5 md:space-y-6">
                        <section className="space-y-2">
                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] text-center mb-1">{t('step1Availability')}</p>
                            {choices.map((choice) => (
                                <button key={choice} onClick={() => { setSelectedChoice(choice); if (choice !== 'YES') setSelectedTeam(''); }}
                                    className={`w-full py-2.5 md:py-5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border-2
                                    ${selectedChoice === choice ? "bg-slate-900 text-white border-transparent shadow-lg scale-[1.02]" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"}`}>
                                    {choiceLabels[choice]}
                                </button>
                            ))}
                        </section>

                        {selectedChoice === 'YES' && (
                            <section className="space-y-2 pt-2 md:pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                <p className="text-[8px] text-pink-500 font-black uppercase tracking-[0.2em] text-center mb-1">{t('step2Priority')}</p>
                                {teams.map((team) => (
                                    <button key={team.id} onClick={() => setSelectedTeam(team.id)}
                                        className={`w-full py-2.5 md:py-5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border-2
                                        ${selectedTeam === team.id ? "bg-pink-600 text-white border-transparent shadow-lg scale-[1.02]" : "bg-white border-slate-100 text-slate-400 hover:border-pink-200"}`}>
                                        {team.label}
                                    </button>
                                ))}
                            </section>
                        )}

                        {/* Inline validation warning */}
                        {(() => {
                            if (!selectedChoice) return (
                                <p className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center animate-in fade-in duration-300">
                                    {t('validationSelectAttendance')}
                                </p>
                            );
                            if (selectedChoice === 'YES' && !selectedTeam) return (
                                <p className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center animate-in fade-in duration-300">
                                    {t('validationSelectTeam')}
                                </p>
                            );
                            return null;
                        })()}

                        <button
                            disabled={!selectedChoice || (selectedChoice === 'YES' && !selectedTeam)}
                            onClick={() => setShowPreview(true)}
                            className="w-full mt-4 py-4 md:py-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black uppercase tracking-widest shadow-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {t('submitIntel')}
                        </button>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-10 space-y-4 text-left">
                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">{t('ign')}</span>
                                    <p className="text-lg font-black text-slate-800 uppercase italic">
                                        {userData?.username || "Commander"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">{t('status')}</span>
                                    <p className="text-[10px] font-black text-slate-800 uppercase italic">
                                        {selectedChoice === 'YES' ? "Attending" : selectedChoice === 'MAYBE' ? "Sub" : "Absent"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">{t('totalPower').split(' ')[0]}</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={statsData.total_hero_power === 0 ? "" : statsData.total_hero_power}
                                        placeholder="0.0"
                                        className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-800 font-bold outline-none w-full text-xs"
                                        onChange={e => setStatsData({ ...statsData, total_hero_power: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">S1 Power</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={statsData.squad_1_power === 0 ? "" : statsData.squad_1_power}
                                        placeholder="0.0"
                                        className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-800 font-bold outline-none w-full text-xs"
                                        onChange={e => setStatsData({ ...statsData, squad_1_power: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[7px] md:text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">Arena</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={statsData.arena_power === 0 ? "" : statsData.arena_power}
                                        placeholder="0.0"
                                        className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-800 font-bold outline-none w-full text-xs"
                                        onChange={e => setStatsData({ ...statsData, arena_power: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            {selectedTeam && selectedChoice === 'YES' && (
                                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[8px] text-pink-500 uppercase font-black tracking-widest">{t('requestedTeam')}</span>
                                    <p className="text-[10px] font-black text-pink-600 uppercase">
                                        {selectedTeam === "Both" ? "Any Team" : selectedTeam}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setShowPreview(false)} className="flex-1 py-3 rounded-full bg-slate-100 text-slate-500 font-bold uppercase text-[9px] md:text-[10px]">{t('edit')}</button>
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
                                        ds_choice: selectedChoice,
                                        ds_team: selectedChoice === 'YES' ? selectedTeam : null,
                                        ds_signup_time: new Date().toISOString()
                                    }, { onConflict: "user_id" });

                                    if (error) { setLoading(false); console.error(error.message); }
                                    else { setIsSuccess(true); }
                                }}
                                className="flex-1 py-3 rounded-full bg-slate-900 text-white font-black uppercase text-[9px] md:text-[10px]"
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