"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "../../lib/LanguageContext";

export default function ProtocolGuide() {
    const { t } = useLanguage();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="min-h-screen bg-[#0a0a0c]" />;

    return (
        <main className="min-h-screen bg-[#0a0a0c] text-white pb-32 md:pb-20 pt-8 px-4 md:px-8 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                <header className="mb-10 md:mb-20">
                    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                        <Link href="/hub" className="p-2 md:p-3 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl hover:bg-white/10 transition-all group">
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <span className="text-pink-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.4em]">{t('guide').toUpperCase()}</span>
                    </div>
                    <h1 className="text-2xl sm:text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-4 md:mb-6">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">{t('guideTitle')}</span>
                    </h1>
                    <p className="max-w-2xl text-slate-400 font-bold text-[10px] md:text-sm uppercase leading-relaxed tracking-wider">
                        {t('guideIntro')}
                    </p>
                </header>

                <div className="space-y-16">
                    {/* Desert Storm Section */}
                    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-[3rem] p-6 md:p-12 hover:border-pink-500/30 transition-all group">
                        <div className="flex flex-col md:flex-row gap-6 md:gap-12">
                            <div className="md:w-1/3">
                                <div className="text-2xl md:text-4xl mb-4 md:mb-6">🏜️</div>
                                <h2 className="text-2xl md:text-3xl font-black italic uppercase mb-3 md:mb-4 tracking-tighter">{t('dsProtocolTitle')}</h2>
                                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase leading-relaxed">{t('dsProtocolDesc')}</p>
                            </div>
                            <div className="md:w-2/3 space-y-4 md:space-y-8">
                                {[
                                    { step: "01", text: t('dsStepMob'), icon: "📱" },
                                    { step: "02", text: t('dsStepAttendance'), icon: "📝" },
                                    { step: "03", text: t('dsStepCommand'), icon: "⚖️" },
                                    { step: "04", text: t('dsStepFinal'), icon: "🎯" }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-4 md:gap-6 items-start">
                                        <span className="text-pink-500 font-black text-base md:text-xl italic opacity-50">{item.step}</span>
                                        <div>
                                            <p className="text-slate-200 text-xs md:text-sm font-bold uppercase tracking-wide leading-relaxed">
                                                <span className="mr-2">{item.icon}</span> {item.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>



                    {/* Alliance Duel Section */}
                    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-[3rem] p-6 md:p-12 hover:border-blue-500/30 transition-all">
                        <div className="flex flex-col md:flex-row gap-6 md:gap-12">
                            <div className="md:w-1/3">
                                <div className="text-2xl md:text-4xl mb-4 md:mb-6">⚔️</div>
                                <h2 className="text-2xl md:text-3xl font-black italic uppercase mb-3 md:mb-4 tracking-tighter text-blue-500">{t('vsProtocolTitle')}</h2>
                                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase leading-relaxed">{t('vsProtocolDesc')}</p>
                            </div>
                            <div className="md:w-2/3 space-y-4 md:space-y-6">
                                <div className="p-4 md:p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl md:rounded-3xl">
                                    <h3 className="text-blue-400 font-black text-[10px] uppercase mb-1 md:mb-3 tracking-widest">{t('saveWeek').toUpperCase()}</h3>
                                    <p className="text-slate-300 text-[10px] md:text-xs font-bold uppercase leading-relaxed italic">{t('vsSaveExplanation')}</p>
                                </div>
                                <div className="p-4 md:p-6 bg-pink-500/5 border border-pink-500/20 rounded-2xl md:rounded-3xl">
                                    <h3 className="text-pink-400 font-black text-[10px] uppercase mb-1 md:mb-3 tracking-widest">{t('pushWeek').toUpperCase()}</h3>
                                    <p className="text-slate-300 text-[10px] md:text-xs font-bold uppercase leading-relaxed italic">{t('vsPushExplanation')}</p>
                                </div>
                                <div className="pt-2 md:pt-4 flex items-center gap-3 md:gap-4 text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest bg-black/20 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/5">
                                    <span>💡</span>
                                    <span>{t('autoCalculateD6')}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* R4 Command Section */}
                    <section className="bg-slate-900 border border-red-500/20 rounded-2xl md:rounded-[3rem] p-6 md:p-12 hover:border-red-500/40 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />

                        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-12">
                            <div className="md:w-1/3">
                                <div className="text-2xl md:text-4xl mb-4 md:mb-6">🎖️</div>
                                <h2 className="text-2xl md:text-3xl font-black italic uppercase mb-3 md:mb-4 tracking-tighter text-red-500">{t('r4AuthorityTitle')}</h2>
                                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase leading-relaxed">{t('r4AuthorityDesc')}</p>
                            </div>
                            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                                {[
                                    { text: t('r4FeatureDS'), icon: "🗺️" },
                                    { text: t('r4FeatureVS'), icon: "⚖️" },
                                    { text: t('r4FeatureTrain'), icon: "📋" },
                                    { text: t('r4FeatureIntel'), icon: "📡" }
                                ].map((item, idx) => (
                                    <div key={idx} className="p-4 md:p-5 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl flex gap-3 md:gap-4 items-start hover:bg-white/10 transition-colors">
                                        <span className="text-lg md:text-xl shrink-0">{item.icon}</span>
                                        <p className="text-[9px] md:text-[10px] text-slate-300 font-bold uppercase leading-relaxed tracking-wide">
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Logistics & Tools */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-[3rem] p-6 md:p-8 hover:bg-white/10 transition-all">
                            <div className="text-2xl md:text-3xl mb-3 md:mb-4">🚂</div>
                            <h2 className="text-lg md:text-xl font-black italic uppercase mb-2 md:mb-4 tracking-tighter">{t('trainProtocolTitle')}</h2>
                            <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase leading-relaxed">{t('trainProtocolDesc')}</p>
                        </section>
                        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-[3rem] p-6 md:p-8 hover:bg-white/10 transition-all">
                            <div className="text-2xl md:text-3xl mb-3 md:mb-4">📊</div>
                            <h2 className="text-lg md:text-xl font-black italic uppercase mb-2 md:mb-4 tracking-tighter">{t('tacticalDashboard')}</h2>
                            <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase leading-relaxed">Cross-referenced database of active commanders, power metrics, and historical performance.</p>
                        </section>
                    </div>
                </div>

                <footer className="mt-32 pt-12 border-t border-white/5 text-center">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] mb-8">{t('incubateVictory')}</p>
                    <Link href="/hub" className="inline-block px-12 py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black uppercase tracking-widest italic rounded-full shadow-2xl hover:scale-105 transition-all">
                        {t('enterStrategicHub')}
                    </Link>
                </footer>
            </div>
        </main>
    );
}
