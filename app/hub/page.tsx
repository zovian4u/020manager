"use client";

import React, { useState, useEffect } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useLanguage } from '../../lib/LanguageContext';
import { Language } from '../../lib/translations';

interface Member {
    user_id: string;
    username: string;
    total_hero_power: number;
    squad_1_power: number;
    role?: string;
    team_assignment?: string;
    ds_choice?: string;
    ds_signup_time?: string;
    arena_power?: number;
    bio?: string;
    gender?: string;
    birthday?: string;
    language?: string;
    ds_team?: string;
}

export default function HubPage() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { language, setLanguage, t } = useLanguage();

    // ✅ State Management
    const [hasMounted, setHasMounted] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [currentUser, setCurrentUser] = useState<Member | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [attendanceMarked, setAttendanceMarked] = useState(true);
    const [hasAttendanceColumn, setHasAttendanceColumn] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        total_hero_power: 0,
        squad_1_power: 0,
        arena_power: 0,
        bio: "",
        gender: "",
        birthday: "",
        language: language as string
    });

    // 🛡️ System Guard
    useEffect(() => {
        setHasMounted(true);

        const handleOpenSettings = () => setIsEditing(true);
        window.addEventListener('open-settings', handleOpenSettings);

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('settings') === 'true') {
            setIsEditing(true);
            window.history.replaceState({}, '', '/hub');
        }

        return () => window.removeEventListener('open-settings', handleOpenSettings);
    }, []);

    // 🛡️ Data Guard: Fetch logic
    useEffect(() => {
        if (!hasMounted) return;

        async function getHubData() {
            try {
                setIsLoading(true);
                // Fetch members
                const { data: membersData } = await supabase
                    .from('members')
                    .select('*')
                    .order('total_hero_power', { ascending: false });

                if (membersData) {
                    const typedData = membersData as Member[];
                    setMembers(typedData);

                    if (user) {
                        const current = typedData.find(m => m.user_id === user.id);
                        if (current) {
                            setCurrentUser(current);

                            // Smart Detection for UI loading
                            const formatForUI = (val: number) => {
                                if (!val) return 0;
                                // If already < 5000, it's likely already in Million format
                                return val > 5000 ? val / 1000000 : val;
                            };

                            setFormData({
                                username: current.username || "",
                                total_hero_power: formatForUI(current.total_hero_power || 0),
                                squad_1_power: formatForUI(current.squad_1_power || 0),
                                arena_power: formatForUI(current.arena_power || 0),
                                bio: current.bio || "",
                                gender: current.gender || "",
                                birthday: current.birthday || "",
                                language: current.language || "en"
                            });
                            if (current.language) {
                                setLanguage(current.language as Language);
                            }
                        }
                    }
                }

                // Fetch settings
                const { data: settingsData, error: settingsError } = await supabase
                    .from('settings')
                    .select('*')
                    .eq('id', 1);

                if (settingsError) {
                    console.error("Settings Fetch Error:", settingsError.message);
                } else if (settingsData && settingsData.length > 0) {
                    setRegistrationOpen(settingsData[0].registration_open);

                    // Column detection
                    if (settingsData[0].attendance_marked === undefined) {
                        setHasAttendanceColumn(false);
                        setAttendanceMarked(true);
                    } else {
                        setHasAttendanceColumn(true);
                        setAttendanceMarked(settingsData[0].attendance_marked ?? true);
                    }
                }
            } catch (err) {
                console.error("Hub Data Loader Exception:", err);
            } finally {
                setIsLoading(false);
            }
        }
        getHubData();
    }, [hasMounted, user]);

    // 🚨 Force profile completion for first-time login or fresh start
    useEffect(() => {
        if (!hasMounted || !user || isLoading) return;

        const current = members.find(m => m.user_id === user.id);
        // Force modal if missing basic info OR if starting fresh (power is 0)
        if (!current || !current.username || !current.bio || !current.gender || (current.total_hero_power || 0) === 0) {
            setIsEditing(true);
        }
    }, [hasMounted, user, members, isLoading]);

    // ✅ Helper calculations
    const desertSignups = members.filter(m => m.ds_choice && m.ds_signup_time);
    const totalActiveMembers = members.length || 1;
    const signupPercentage = Math.round((desertSignups.length / totalActiveMembers) * 100);

    const displayPower = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        const validNum = num || 0;
        if (validNum === 0) return "0.0M";

        // Smart Formatting:
        // If it's a raw integer (> 5000), divide by 1M
        if (validNum > 5000) {
            return (validNum / 1000000).toFixed(1) + "M";
        }
        // If it's already in Million format (e.g. 148.5), just show it
        return validNum.toFixed(1) + "M";
    };

    if (!hasMounted) return null;

    return (
        <div className="min-h-[calc(100vh-72px)] px-4 md:px-8 pb-8 bg-pink-50/50 text-slate-900 overflow-x-hidden pt-8">

            {/* 🛡️ R4 Command Panel */}
            {currentUser?.role === 'R4' && (
                <div className="max-w-7xl mx-auto mb-10 p-4 sm:p-6 bg-slate-900 rounded-2xl sm:rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-top-4">
                    <div>
                        <p className="text-white font-black uppercase text-[10px] tracking-[0.3em]">{t('commandCenter')}</p>
                        <p className="text-slate-400 text-[9px] font-bold uppercase mt-1">{t('status')}: {registrationOpen ? t('statusOpen') : t('statusLocked')}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        {!registrationOpen && !attendanceMarked && hasAttendanceColumn && (
                            <p className="text-orange-400 text-[9px] font-black uppercase tracking-widest animate-pulse text-center sm:text-right max-w-[200px]">
                                ⚠️ {t('attendanceNotMarked')}
                            </p>
                        )}
                        <button
                            onClick={async () => {
                                if (hasAttendanceColumn && !registrationOpen && !attendanceMarked) {
                                    alert(t('attendanceNotMarked'));
                                    return;
                                }

                                const newStatus = !registrationOpen;
                                if (newStatus && !window.confirm("Opening signups will CLEAR all current member registrations for the new week. Proceed?")) {
                                    return;
                                }
                                const updateData: any = { registration_open: newStatus };
                                if (hasAttendanceColumn && newStatus === true) {
                                    updateData.attendance_marked = false;
                                }

                                const { error } = await supabase.from('settings').update(updateData).eq('id', 1);
                                if (error) {
                                    console.error("Update Registration Error:", error.message);
                                    // Fallback if attendance column is actually missing despite our detection
                                    if (error.message.includes('attendance_marked')) {
                                        const { error: fallbackError } = await supabase.from('settings').update({ registration_open: newStatus }).eq('id', 1);
                                        if (!fallbackError) {
                                            setRegistrationOpen(newStatus);
                                            setHasAttendanceColumn(false);
                                        } else {
                                            alert("Database Error: " + fallbackError.message);
                                        }
                                    } else {
                                        alert("Error: " + error.message);
                                    }
                                } else {
                                    setRegistrationOpen(newStatus);

                                    // 📝 COMMAND AUDIT LOG
                                    await supabase.from('audit_logs').insert({
                                        user_id: user?.id,
                                        username: currentUser?.username,
                                        action: newStatus ? "OPEN_DS_SIGNUPS" : "CLOSE_DS_SIGNUPS",
                                        details: { context: "R4 Hub Control Panel" }
                                    });

                                    if (hasAttendanceColumn && newStatus === true) {
                                        setAttendanceMarked(false);
                                        // 🔄 Reset the mobilization data for the new week
                                        await supabase.from('members').update({
                                            ds_choice: null,
                                            ds_team: null,
                                            ds_signup_time: null,
                                            team_assignment: null
                                        }).neq('user_id', ''); // Update all rows
                                        window.location.reload();
                                    }
                                }
                            }}
                            className={`px-6 sm:px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer w-full sm:w-auto text-center ${registrationOpen ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : ((attendanceMarked || !hasAttendanceColumn) ? 'bg-green-600 text-white shadow-[0_0_20px_rgba(22,163,74,0.4)]' : 'bg-slate-700 text-slate-400 cursor-not-allowed')}`}
                        >
                            {registrationOpen ? t('closeSignups') : t('openSignups')}
                        </button>
                    </div>
                </div>
            )}

            <section className="text-center mb-20">
                <h2 className="text-4xl sm:text-7xl md:text-9xl font-black mb-6 tracking-tighter text-slate-900 leading-none uppercase italic">
                    {t('allianceName')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 italic">020</span>
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {user ? (
                        <>
                            <Link href="/desert-storm">
                                <button className="px-6 sm:px-10 py-3 sm:py-4 bg-slate-900 text-white rounded-full font-black text-sm sm:text-lg hover:scale-105 transition-all shadow-xl uppercase tracking-widest cursor-pointer w-full sm:w-auto">{t('joinDesertStorm')}</button>
                            </Link>
                            <Link href="/alliance-duel">
                                <button className="px-6 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-black text-sm sm:text-lg hover:scale-105 transition-all shadow-xl uppercase tracking-widest cursor-pointer w-full sm:w-auto">{t('enterVsScores')}</button>
                            </Link>
                            <Link href="/train">
                                <button className="px-6 sm:px-10 py-3 sm:py-4 bg-amber-600 text-white rounded-full font-black text-sm sm:text-lg hover:scale-105 transition-all shadow-xl uppercase tracking-widest cursor-pointer w-full sm:w-auto">🚂 {t('trainConductor')}</button>
                            </Link>
                            <Link href="/guide">
                                <button className="px-6 sm:px-10 py-3 sm:py-4 bg-indigo-600 text-white rounded-full font-black text-sm sm:text-lg hover:scale-105 transition-all shadow-xl uppercase tracking-widest cursor-pointer w-full sm:w-auto">📖 {t('guide')}</button>
                            </Link>
                            {currentUser?.role === 'R4' && (
                                <Link href="/tactical-dashboard">
                                    <button className="px-6 sm:px-10 py-3 sm:py-4 bg-red-600 text-white rounded-full font-black text-sm sm:text-lg hover:scale-105 transition-all shadow-xl uppercase tracking-widest cursor-pointer w-full sm:w-auto">📊 {t('tacticalDashboard')}</button>
                                </Link>
                            )}
                        </>
                    ) : (
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em]">{t('signInPrompt')}</p>
                    )}
                </div>

                {/* ✅ Individual Tactical Status */}
                <div className="mt-12 max-w-xl mx-auto bg-white/50 backdrop-blur-md rounded-[2rem] p-6 border border-white shadow-lg animate-in fade-in zoom-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('dsMobilization')} - {t('status').toUpperCase()}</h3>
                        <span className={`flex h-2 w-2 rounded-full ${registrationOpen ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    </div>

                    {!registrationOpen ? (
                        <div className="text-center py-2">
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('mobilizationInactive')}</p>
                            {currentUser?.team_assignment && currentUser.team_assignment !== "None" && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] text-blue-400 font-black uppercase mb-1">{t('finalAssignment')}</p>
                                    <p className="text-xl font-black text-blue-600 uppercase italic">{t('team')} {currentUser.team_assignment}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-left">
                                {currentUser?.ds_choice ? (
                                    <>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('registered')}</p>
                                        <p className="text-xl font-black text-slate-800 uppercase italic leading-tight mb-2">{currentUser.ds_choice}</p>

                                        {currentUser.team_assignment && currentUser.team_assignment !== "None" ? (
                                            <p className="text-[10px] font-black text-blue-600 uppercase mt-1 tracking-widest">
                                                ✅ {t('assignedTo')} {t('team')} {currentUser.team_assignment}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] font-black text-pink-500 uppercase mt-1 tracking-widest">
                                                ⏳ {t('awaitingAssignment')}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-lg font-black text-slate-400 uppercase italic leading-tight">{t('notRegistered')}</p>
                                )}
                            </div>
                            <Link href="/desert-storm">
                                <button className="px-6 py-3 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md">
                                    {currentUser?.ds_choice ? t('edit') : t('joinDesertStorm')}
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* ✅ Leaderboards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-20">
                {[
                    { title: t('power'), data: members.slice(0, 5), val: (m: Member) => displayPower(m.total_hero_power) },
                    { title: t('squad1Power'), data: [...members].sort((a, b) => (b.squad_1_power || 0) - (a.squad_1_power || 0)).slice(0, 5), val: (m: Member) => displayPower(m.squad_1_power) },
                    { title: t('dsMobilization'), isStats: true, total: desertSignups.length }
                ].map((board, i) => (
                    <div key={i} className="bg-white/70 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all">
                        <h3 className="text-[11px] font-black text-slate-800 mb-6 uppercase italic tracking-wider border-b border-pink-100 pb-2">{board.title}</h3>

                        {board.isStats ? (
                            <div className="space-y-6 py-2">
                                <div className="flex justify-between items-center text-xl font-black text-pink-600">
                                    <span>{board.total}</span>
                                    <span className="text-[10px] uppercase text-slate-400 italic">{t('registered')}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-50">
                                    <div
                                        className="bg-gradient-to-r from-pink-500 to-purple-600 h-full transition-all duration-1000"
                                        style={{ width: `${signupPercentage}%` }}
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 text-right uppercase tracking-widest">{signupPercentage}% {t('complete')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {board.data && board.data.length > 0 ? board.data.map((m, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <span className="font-bold text-slate-600 text-[11px] truncate mr-2">{idx + 1}. {m.username}</span>
                                        <span className="font-mono text-[9px] text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg font-bold">
                                            {board.val ? board.val(m) : ''}
                                        </span>
                                    </div>
                                )) : <p className="text-[9px] text-slate-300 uppercase font-bold italic">{t('noData')}</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ✅ Settings Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-white/30 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white border border-pink-100 p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-2xl font-black text-slate-800 mb-6 uppercase italic">{t('commanderIntel')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('ign')}</label>
                                <input value={formData.username} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none" onChange={e => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('birthday')}</label>
                                <input type="date" value={formData.birthday} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none" onChange={e => setFormData({ ...formData, birthday: e.target.value })} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('totalPower')}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.total_hero_power === 0 ? "" : formData.total_hero_power}
                                    placeholder="0.0"
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => setFormData({ ...formData, total_hero_power: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('squad1Power')}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.squad_1_power === 0 ? "" : formData.squad_1_power}
                                    placeholder="0.0"
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => setFormData({ ...formData, squad_1_power: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('arenaPower')}</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.arena_power === 0 ? "" : formData.arena_power}
                                    placeholder="0.0"
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => setFormData({ ...formData, arena_power: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('gender')}</label>
                                <select value={formData.gender} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none" onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('language')}</label>
                                <select
                                    value={formData.language}
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => {
                                        const newLang = e.target.value as Language;
                                        setFormData({ ...formData, language: newLang });
                                        setLanguage(newLang);
                                    }}
                                >
                                    <option value="en">English</option>
                                    <option value="zh">中文 (Chinese)</option>
                                    <option value="ja">日本語 (Japanese)</option>
                                    <option value="th">ไทย (Thai)</option>
                                    <option value="vi">Tiếng Việt (Vietnamese)</option>
                                </select>
                            </div>
                            <div className="flex flex-col md:col-span-2">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">{t('bio')}</label>
                                <textarea value={formData.bio} rows={2} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none resize-none" onChange={e => setFormData({ ...formData, bio: e.target.value })} />
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col gap-2">
                            <button
                                disabled={isSubmitting}
                                onClick={async () => {
                                    if (!formData.username || !formData.bio || !formData.gender || formData.total_hero_power === 0 || formData.squad_1_power === 0) {
                                        alert("Please complete all mandatory fields: Name, Power, Gender, and Bio.");
                                        return;
                                    }

                                    try {
                                        setIsSubmitting(true);
                                        // Ensure we have a valid user ID before attempting save
                                        if (!user?.id) {
                                            alert("Auth session error. Please refresh the page.");
                                            return;
                                        }

                                        console.log("Saving member data for:", user.id, formData);

                                        // 🧪 Intelligent Scaling: Handle both Millions (173.9) and Raw (173935040)
                                        const smartScale = (val: number) => {
                                            if (val <= 0) return 0;
                                            // If input is less than 5000, it's definitely the "Million" format (e.g. 200.0)
                                            return val < 5000 ? Math.round(val * 1000000) : Math.round(val);
                                        };

                                        const finalTHP = smartScale(formData.total_hero_power);
                                        const finalS1P = smartScale(formData.squad_1_power);
                                        const finalAP = smartScale(formData.arena_power);

                                        // 🚨 Tactical Validation: Ensure it's at least 10M
                                        if (finalTHP < 10000000) {
                                            alert("Minimum power required is 10M.");
                                            setIsSubmitting(false);
                                            return;
                                        }

                                        // 🧪 Attempt 1: Full Save (Raw Integer Storage)
                                        const fullSaveData = {
                                            user_id: user.id,
                                            username: formData.username,
                                            total_hero_power: finalTHP,
                                            squad_1_power: finalS1P,
                                            arena_power: finalAP,
                                            bio: formData.bio,
                                            gender: formData.gender,
                                            birthday: formData.birthday,
                                            language: formData.language
                                        };

                                        const { error: fullError } = await supabase
                                            .from('members')
                                            .upsert(fullSaveData, { onConflict: 'user_id' });

                                        if (!fullError) {
                                            console.log("Full Save successful!");
                                            setIsEditing(false);
                                            window.location.reload();
                                            return;
                                        }

                                        console.warn("Full Save failed, checking for missing columns...", fullError);

                                        // 🧪 Attempt 2: Safe Save (Basic fields only)
                                        // Some columns might not exist in the database yet
                                        if (fullError.message.includes("column") || fullError.code === "42703") {
                                            const { error: safeError } = await supabase
                                                .from('members')
                                                .upsert({
                                                    user_id: user.id,
                                                    username: formData.username,
                                                    total_hero_power: finalTHP,
                                                    squad_1_power: finalS1P,
                                                    arena_power: finalAP
                                                }, { onConflict: 'user_id' });

                                            if (!safeError) {
                                                alert("Partial Save: IGN and Power saved, but some fields (Bio/Gender/Lang) might be missing from the database schema.");
                                                setIsEditing(false);
                                                window.location.reload();
                                                return;
                                            }

                                            alert("Database Error: " + safeError.message);
                                        } else {
                                            alert("Save Error: " + fullError.message);
                                        }
                                    } catch (err: any) {
                                        console.error("Save Exception:", err);
                                        alert("Critical Error: " + err.message);
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                className={`w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer transition-all ${isSubmitting ? 'opacity-50 cursor-wait' : 'hover:bg-slate-800'}`}
                            >
                                {isSubmitting ? t('syncing') : t('saveRecords')}
                            </button>
                            {(currentUser?.username && currentUser?.bio && currentUser?.gender) && (
                                <button onClick={() => setIsEditing(false)} className="w-full text-slate-400 font-black uppercase text-[10px] mt-2 tracking-widest cursor-pointer">{t('cancel')}</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
