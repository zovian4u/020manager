"use client";

import React, { useState, useEffect } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../lib/supabase';
import Link from 'next/link';

interface Member {
    user_id: string;
    username: string;
    total_hero_power: number;
    vs_score?: number;
    desert_points?: number;
    squad_1_power: number;
    role?: string;
    team_assignment?: string;
    ds_choice?: string;
    ds_signup_time?: string;
    bio?: string;
    gender?: string;
    birthday?: string;
}

export default function Home() {
    const stack = useStackApp();
    const user = stack.useUser();

    // ✅ State Management
    const [hasMounted, setHasMounted] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [currentUser, setCurrentUser] = useState<Member | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [registrationOpen, setRegistrationOpen] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        total_hero_power: 0,
        squad_1_power: 0,
        bio: "",
        gender: "",
        birthday: ""
    });

    // 🛡️ System Guard
    useEffect(() => {
        setHasMounted(true);
    }, []);

    // 🛡️ Data Guard: Fetch logic
    useEffect(() => {
        if (!hasMounted) return;

        async function getHubData() {
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
                        setFormData({
                            username: current.username || "",
                            total_hero_power: current.total_hero_power || 0,
                            squad_1_power: current.squad_1_power || 0,
                            bio: current.bio || "",
                            gender: current.gender || "",
                            birthday: current.birthday || ""
                        });
                    }
                }
            }

            const { data: settingsData } = await supabase
                .from('settings')
                .select('registration_open')
                .eq('id', 1);

            if (settingsData && settingsData.length > 0) {
                setRegistrationOpen(settingsData[0].registration_open);
            }
        }
        getHubData();
    }, [hasMounted, user]);

    // ✅ Logic for Desert Signups
    const desertSignups = members.filter(m => m.ds_choice && m.ds_signup_time);
    const totalActiveMembers = members.length || 1;
    const signupPercentage = Math.round((desertSignups.length / totalActiveMembers) * 100);

    // ✅ Fix: Specified type as string | number to resolve "Unexpected any"
    const displayPower = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        const validNum = num || 0;
        if (validNum === 0) return "0.0M";

        // If raw large integer (e.g. 85000000)
        if (validNum >= 1000) {
            return (validNum / 1000000).toFixed(1) + "M";
        }

        // If already stored as decimal (e.g. 85.4)
        return validNum.toFixed(1) + "M";
    };

    if (!hasMounted) return null;

    return (
        <main className="min-h-screen p-8 bg-pink-50/50 text-slate-900">
            <header className="max-w-7xl mx-auto flex justify-between items-center mb-16">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center text-white font-black text-xl italic">020</div>
                    <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Strategic Hub</h1>
                </div>

                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <button onClick={() => stack.signOut()} className="px-5 py-2 bg-slate-100 rounded-full shadow-sm font-bold text-red-500 hover:bg-red-50 transition-all uppercase text-xs tracking-widest cursor-pointer">Logout</button>
                            <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-white rounded-full shadow-sm font-bold text-slate-600 hover:shadow-md transition-all uppercase text-xs tracking-widest cursor-pointer">⚙️ Settings</button>
                        </>
                    ) : (
                        <Link href="/signin">
                            <button className="px-6 py-2 bg-slate-900 text-white rounded-full font-bold uppercase text-xs tracking-widest shadow-lg hover:scale-105 transition-all">Enter Member Area</button>
                        </Link>
                    )}
                </div>
            </header>

            {/* 🛡️ R4 Command Panel */}
            {currentUser?.role === 'R4' && (
                <div className="max-w-7xl mx-auto mb-10 p-6 bg-slate-900 rounded-[2.5rem] flex justify-between items-center shadow-2xl border border-slate-800">
                    <div>
                        <p className="text-white font-black uppercase text-[10px] tracking-[0.3em]">Command Center</p>
                        <p className="text-slate-400 text-[9px] font-bold uppercase mt-1">Status: {registrationOpen ? "Window Open" : "Window Locked"}</p>
                    </div>
                    <button
                        onClick={async () => {
                            const newStatus = !registrationOpen;
                            const { error } = await supabase.from('settings').update({ registration_open: newStatus }).eq('id', 1);
                            if (!error) setRegistrationOpen(newStatus);
                        }}
                        className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${registrationOpen ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                    >
                        {registrationOpen ? 'Close Signups' : 'Open Signups'}
                    </button>
                </div>
            )}

            <section className="text-center mb-20">
                <h2 className="text-7xl md:text-9xl font-black mb-6 tracking-tighter text-slate-900 leading-none uppercase italic">
                    ALLIANCE <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 italic">020</span>
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {user ? (
                        <>
                            <Link href="/desert-storm">
                                <button className="px-10 py-4 bg-slate-900 text-white rounded-full font-black text-lg hover:scale-105 transition-all shadow-xl uppercase tracking-widest cursor-pointer">Join Desert Storm ✨</button>
                            </Link>
                            {currentUser?.role === 'R4' && (
                                <Link href="/tactical-dashboard">
                                    <button className="px-10 py-4 bg-red-600 text-white rounded-full font-black text-lg hover:scale-105 transition-all shadow-xl uppercase tracking-widest cursor-pointer">📊 Tactical Dashboard</button>
                                </Link>
                            )}
                        </>
                    ) : (
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em]">Sign in to access Member Intel</p>
                    )}
                </div>
            </section>

            {/* ✅ Leaderboards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
                {[
                    { title: 'Power', data: members.slice(0, 5), val: (m: Member) => displayPower(m.total_hero_power) },
                    { title: 'Vs Score', data: [...members].sort((a, b) => (Number(b.vs_score || 0)) - (Number(a.vs_score || 0))).slice(0, 5), val: (m: Member) => m.vs_score || 0 },
                    { title: 'Desert Pts', data: [...members].sort((a, b) => (Number(b.desert_points || 0)) - (Number(a.desert_points || 0))).slice(0, 5), val: (m: Member) => m.desert_points || 0 },
                    { title: 'DS Mobilization', isStats: true, total: desertSignups.length }
                ].map((board, i) => (
                    <div key={i} className="bg-white/70 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl">
                        <h3 className="text-[11px] font-black text-slate-800 mb-6 uppercase italic tracking-wider border-b border-pink-100 pb-2">{board.title}</h3>

                        {board.isStats ? (
                            <div className="space-y-6 py-2">
                                <div className="flex justify-between items-center text-xl font-black text-pink-600">
                                    <span>{board.total}</span>
                                    <span className="text-[10px] uppercase text-slate-400 italic">Registered</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-50">
                                    <div
                                        className="bg-gradient-to-r from-pink-500 to-purple-600 h-full transition-all duration-1000"
                                        style={{ width: `${signupPercentage}%` }}
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 text-right uppercase tracking-widest">{signupPercentage}% COMPLETE</p>
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
                                )) : <p className="text-[9px] text-slate-300 uppercase font-bold italic">No Data</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ✅ Settings Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-white/30 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white border border-pink-100 p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-2xl font-black text-slate-800 mb-6 uppercase italic">Commander Intel</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">In-Game Name</label>
                                <input value={formData.username} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none" onChange={e => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">Birthday</label>
                                <input type="date" value={formData.birthday} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none" onChange={e => setFormData({ ...formData, birthday: e.target.value })} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">Total Power</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.total_hero_power}
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => setFormData({ ...formData, total_hero_power: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">Squad 1 Power</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.squad_1_power}
                                    className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none"
                                    onChange={e => setFormData({ ...formData, squad_1_power: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">Gender</label>
                                <select value={formData.gender} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none" onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="flex flex-col md:col-span-2">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-1">Bio</label>
                                <textarea value={formData.bio} rows={2} className="bg-slate-100 border p-3 rounded-xl text-slate-800 font-bold outline-none resize-none" onChange={e => setFormData({ ...formData, bio: e.target.value })} />
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col gap-2">
                            <button onClick={async () => {
                                await supabase.from('members').upsert({ user_id: user!.id, ...formData }, { onConflict: 'user_id' });
                                setIsEditing(false);
                                window.location.reload();
                            }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer">Save Records</button>
                            <button onClick={() => setIsEditing(false)} className="w-full text-slate-400 font-black uppercase text-[10px] mt-2 tracking-widest cursor-pointer">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}