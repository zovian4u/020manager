"use client";

import React, { useEffect, useState } from "react";
import { useStackApp } from "@stackframe/stack";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/LanguageContext";

export default function UserStatusButton() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();

    const [userData, setUserData] = useState<{ username: string; role: string } | null>(null);

    useEffect(() => {
        if (!user) {
            setUserData(null);
            return;
        }

        async function fetchUser() {
            const { data, error } = await supabase
                .from('members')
                .select('username, role')
                .eq('user_id', user!.id)
                .single();

            if (data && !error) {
                setUserData(data);
            }
        }

        fetchUser();
    }, [user]);

    if (!user || !userData) return null;

    return (
        <div className="bg-slate-900 border-2 border-slate-700/50 hover:border-pink-500/50 backdrop-blur-md px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-3 transition-all">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse" />
            <span className="text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap leading-none">
                {t('loggedInAs')}: <span className="text-pink-400">{userData.username}</span> <span className="text-slate-400">({userData.role || 'Member'})</span>
            </span>
        </div>
    );
}
