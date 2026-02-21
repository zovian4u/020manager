"use client";

import Link from "next/link";
import { useLanguage } from "../../lib/LanguageContext";

export default function ContactUs() {
    const { t } = useLanguage();

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-4 sm:px-6 pb-20 relative overflow-hidden">
            {/* Background animated gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pink-600/20 blur-[120px] rounded-full mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen" />


            <div className="relative z-10 w-full max-w-2xl bg-white/5 backdrop-blur-2xl border border-white/10 p-8 sm:p-12 rounded-2xl sm:rounded-[3rem] text-center shadow-2xl">
                <div className="mb-8 relative inline-block">
                    <div className="w-24 h-24 bg-[#5865F2]/20 rounded-full flex items-center justify-center mx-auto absolute top-0 left-0 blur-xl animate-pulse" />
                    <div className="w-24 h-24 bg-gradient-to-br from-[#5865F2] to-[#4752C4] rounded-full flex items-center justify-center mx-auto shadow-2xl relative z-10 hover:scale-105 transition-transform duration-300">
                        {/* Discord SVG Formatted Logo */}
                        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 127.14 96.36">
                            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white italic tracking-tighter uppercase mb-4">
                    {t('contactUs')}
                </h1>

                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-12">
                    Join the 020 Alliance Communications Network
                </p>

                <a
                    href="https://discord.gg/XC9nUxQZ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-10 py-5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full font-black uppercase text-xs tracking-widest shadow-[0_0_40px_rgba(88,101,242,0.4)] hover:shadow-[0_0_60px_rgba(88,101,242,0.6)] hover:-translate-y-1 transition-all"
                >
                    Connect to Discord
                </a>
            </div>
        </main>
    );
}
