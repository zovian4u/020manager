"use client";

import React, { useState, useEffect } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';
import Link from 'next/link';

export default function SettingsPage() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { language, t } = useLanguage();

    const [hasMounted, setHasMounted] = useState(false);
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

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted || !user) return;

        async function fetchUserData() {
            try {
                setIsLoading(true);
                const { data } = await supabase
                    .from('members')
                    .select('*')
                    .eq('user_id', user!.id)
                    .single();

                if (data) {
                    const formatInM = (val: number) => {
                        if (!val) return 0;
                        return val > 1000000 ? val / 1000000 : val;
                    };

                    setFormData({
                        username: data.username || "",
                        total_hero_power: formatInM(data.total_hero_power || 0),
                        squad_1_power: formatInM(data.squad_1_power || 0),
                        arena_power: formatInM(data.arena_power || 0),
                        bio: data.bio || "",
                        gender: data.gender || "",
                        birthday: data.birthday || "",
                        language: data.language || language
                    });
                }
            } catch (err) {
                console.error("Error fetching settings:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchUserData();
    }, [hasMounted, user]);

    const handleSubmit = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const dataToUpdate = {
                username: formData.username,
                total_hero_power: (formData.total_hero_power || 0) * 1000000,
                squad_1_power: (formData.squad_1_power || 0) * 1000000,
                arena_power: (formData.arena_power || 0) * 1000000,
                bio: formData.bio,
                gender: formData.gender,
                birthday: formData.birthday || null,
                language: formData.language
            };

            const { error } = await supabase
                .from('members')
                .upsert(
                    { user_id: user.id, role: 'Guest', ...dataToUpdate },
                    { onConflict: 'user_id' }
                );

            if (!error) {
                window.location.href = '/hub';
            } else {
                alert("Error updating profile");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!hasMounted) return null;

    if (!user) {
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
               <div className="text-white font-black text-2xl uppercase italic tracking-tighter mb-8">{t('signInPrompt')}</div>
               <Link href="/signin">
                    <button className="px-12 py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black rounded-full uppercase tracking-widest hover:scale-110 transition-all shadow-2xl">
                        {t('signIn')}
                    </button>
               </Link>
            </div>
        );
    }

    // Compute missing fields live from form state
    const missingFields: string[] = [];
    if (!formData.username.trim()) missingFields.push(t('fieldIGN'));
    if (!formData.gender) missingFields.push(t('fieldGender'));
    if (!formData.birthday) missingFields.push(t('fieldBirthday'));
    if (!formData.bio.trim()) missingFields.push(t('fieldBio'));
    if ((formData.total_hero_power || 0) === 0) missingFields.push(t('fieldTotalPower'));

    return (
        <div className="h-screen bg-[#0a0f1d] text-white flex flex-col items-center justify-start p-4 overflow-hidden pt-16 pb-20 md:p-8 md:justify-center lg:pb-8 lg:pt-8">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,#0f172a_0%,#020617_100%)] pointer-events-none" />
            
            <div className="relative w-full max-w-5xl flex flex-col gap-2 h-full md:h-auto overflow-hidden">
                <header className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0 px-1">
                    <div>
                        <h1 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-white leading-none mb-0.5">{t('settings')}</h1>
                        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[7px] md:text-[8px]">{t('allianceName')} 020 Strategic Board</p>
                    </div>
                    <Link href="/hub">
                        <button className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700 text-white rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center gap-1.5">
                           <span className="opacity-50">←</span> {t('backToHub')}
                        </button>
                    </Link>
                </header>

                {/* Missing fields banner — disappears as user fills fields */}
                {missingFields.length > 0 && (
                    <div className="shrink-0 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 flex items-start gap-3 animate-in fade-in duration-300">
                        <span className="text-lg shrink-0 mt-0.5">⚠️</span>
                        <div className="min-w-0">
                            <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-1">{t('completeProfileBanner')}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {missingFields.map(f => (
                                    <span key={f} className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[8px] font-black uppercase rounded-md tracking-wide">{f}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                            {/* Personal Info Group - Explicitly Side by Side on Mobile */}
                            <div className="flex flex-col col-span-1">
                                <label className="text-[8px] md:text-[9px] text-pink-500 font-black uppercase tracking-widest mb-1 leading-none">{t('ign')}</label>
                                <input 
                                    value={formData.username} 
                                    className="bg-slate-800/40 border border-white/5 p-2 rounded-lg text-white font-bold outline-none focus:border-pink-500/50 transition-colors text-xs" 
                                    onChange={e => setFormData({ ...formData, username: e.target.value })} 
                                    placeholder="IGN"
                                />
                            </div>
                            <div className="flex flex-col col-span-1">
                                <label className="text-[8px] md:text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">{t('gender')}</label>
                                <select 
                                    value={formData.gender} 
                                    className="bg-slate-800/40 border border-white/5 p-2 rounded-lg text-white font-bold outline-none focus:border-pink-500/50 transition-colors text-xs w-full" 
                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="" className="bg-slate-900">Select</option>
                                    <option value="Male" className="bg-slate-900">Male</option>
                                    <option value="Female" className="bg-slate-900">Female</option>
                                </select>
                            </div>
                            <div className="flex flex-col col-span-2 lg:col-span-1">
                                <label className="text-[8px] md:text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">{t('birthday')}</label>
                                <input 
                                    type="date" 
                                    value={formData.birthday} 
                                    className="bg-slate-800/40 border border-white/5 p-2 rounded-lg text-white font-bold outline-none focus:border-pink-500/50 transition-colors w-full text-xs [color-scheme:dark]" 
                                    onChange={e => setFormData({ ...formData, birthday: e.target.value })} 
                                />
                            </div>

                            {/* Power Info Group - Explicitly Side by Side on Mobile */}
                            <div className="flex flex-col col-span-1">
                                <label className="text-[8px] md:text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1 leading-none">{t('totalHeroPower')} (M)</label>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    value={formData.total_hero_power} 
                                    className="bg-slate-800/40 border border-white/5 p-2 rounded-lg text-white font-bold outline-none focus:border-blue-500/50 transition-colors text-xs" 
                                    onChange={e => setFormData({ ...formData, total_hero_power: parseFloat(e.target.value) || 0 })} 
                                />
                            </div>
                            <div className="flex flex-col col-span-1">
                                <label className="text-[8px] md:text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1 leading-none">{t('squad1Power')} (M)</label>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    value={formData.squad_1_power} 
                                    className="bg-slate-800/40 border border-white/5 p-2 rounded-lg text-white font-bold outline-none focus:border-blue-500/50 transition-colors text-xs" 
                                    onChange={e => setFormData({ ...formData, squad_1_power: parseFloat(e.target.value) || 0 })} 
                                />
                            </div>
                            <div className="flex flex-col col-span-2 lg:col-span-1">
                                <label className="text-[8px] md:text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1 leading-none">{t('arenaPower')} (M)</label>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    value={formData.arena_power} 
                                    className="bg-slate-800/40 border border-white/5 p-2 rounded-lg text-white font-bold outline-none focus:border-blue-500/50 transition-colors text-xs" 
                                    onChange={e => setFormData({ ...formData, arena_power: parseFloat(e.target.value) || 0 })} 
                                />
                            </div>
                        
                        {/* Bio Section - Full Width but Compact */}
                        <div className="col-span-2 lg:col-span-3 space-y-1">
                            <label className="text-[8px] md:text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5 leading-none px-1">
                                <span className="w-1 h-1 bg-slate-500 rounded-full" /> {t('bio')}
                            </label>
                            <textarea 
                                value={formData.bio} 
                                className="w-full bg-slate-800/40 border border-white/5 p-3 rounded-xl text-white font-bold outline-none focus:border-pink-500/50 transition-colors h-14 md:h-12 resize-none text-xs placeholder:text-slate-600" 
                                onChange={e => setFormData({ ...formData, bio: e.target.value })} 
                                placeholder="Tactical biography..."
                            />
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-row gap-3 pt-2 shrink-0">
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting}
                            className={`flex-1 py-3 bg-gradient-to-r from-pink-600 to-purple-700 text-white font-black rounded-xl uppercase tracking-widest shadow-[0_10px_30px_rgba(236,72,153,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-[10px]`}
                        >
                            {isSubmitting ? t('syncing') : t('saveRecords')}
                        </button>
                        <Link href="/hub" className="flex-1">
                            <button className="w-full py-3 bg-slate-800/50 text-slate-400 font-black rounded-xl uppercase tracking-widest border border-white/5 hover:bg-slate-700 hover:text-white transition-all text-[10px]">
                                {t('cancel')}
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
