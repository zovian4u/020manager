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
                        {t('signUpTitle')}
                    </h1>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-[10px] uppercase">
                        Join the Elite Alliance
                    </p>
                </div>

                {/* Signup Card */}
                <div className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl text-xs font-black uppercase tracking-wider animate-shake">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                                {t('email')}
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 transition-all placeholder:text-slate-600"
                                placeholder="commander@020.alliance"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                                {t('password')}
                            </label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 transition-all placeholder:text-slate-600"
                                placeholder="Min. 8 characters"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black py-5 rounded-2xl shadow-[0_20px_40px_-10px_rgba(236,72,153,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2 uppercase tracking-[0.2em]">
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {t('signUp')}
                                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            {t('alreadyAccount')}
                            <Link href="/signin" className="ml-2 text-pink-500 hover:text-pink-400 transition-colors underline-offset-4 hover:underline">
                                {t('signIn')}
                            </Link>
                        </p>
                    </div>
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