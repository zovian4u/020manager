"use client";

import React, { useState } from 'react';
import { useStackApp } from "@stackframe/stack";
import { useLanguage } from '../../lib/LanguageContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
    const stack = useStackApp();
    const { t } = useLanguage();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await stack.signUpWithCredential({ email, password });

            // Stack returns a result object — check status, don't just check truthiness
            if (result && (result as any).status === 'error') {
                const code = (result as any).error?.code || '';
                if (code === 'USER_EMAIL_ALREADY_EXISTS' || code.includes('already_exists') || code.includes('ALREADY_EXISTS')) {
                    setError('An account with this email already exists. Please sign in instead.');
                } else {
                    setError((result as any).error?.message || 'Sign up failed. Please try again.');
                }
                return;
            }

            // Success — navigate to hub
            router.push('/hub');
        } catch (err: any) {
            console.error("Signup Error:", err);
            // Parse known Stack error codes from thrown errors too
            const code = err?.code || err?.error?.code || '';
            if (code === 'USER_EMAIL_ALREADY_EXISTS' || code.includes('already_exists') || code.includes('ALREADY_EXISTS')) {
                setError('An account with this email already exists. Please sign in instead.');
            } else if (code === 'EMAIL_PASSWORD_MISMATCH' || code.includes('MISMATCH')) {
                setError('Incorrect password. Please try again or reset your password.');
            } else {
                setError(err.message || 'Sign up failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 w-full max-w-md">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-[24px] shadow-2xl flex items-center justify-center text-white font-black text-3xl italic mb-4 border-4 border-white/10">
                        020
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase italic drop-shadow-lg text-center leading-tight">
                        Registration Closed
                    </h1>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-[10px] uppercase">
                        Join the Elite Alliance
                    </p>
                </div>

                {/* Closed Message Card */}
                <div className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] text-center space-y-6">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 text-3xl mx-auto filter drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                        ⚠️
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-white font-black uppercase tracking-wider text-sm">
                            Recruitment is Closed
                        </h2>
                        <p className="text-slate-400 text-xs leading-relaxed font-bold">
                            Registration for the 020 Strategic Hub is currently closed to new members. If you need access, please contact an R4 Officer or the Alliance Leader.
                        </p>
                    </div>

                    <Link href="/signin" className="block">
                        <button
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black py-4 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 uppercase tracking-widest text-xs"
                        >
                            Return to Sign In
                        </button>
                    </Link>
                </div>

                {/* Footer Meta */}
                <div className="mt-8 text-center">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">
                        Official Recruitment Portal v2.0
                    </p>
                </div>
            </div>
        </div>
    );
}