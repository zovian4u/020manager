"use client";

import { useState } from "react";
import { useLanguage } from "../../../lib/LanguageContext";
import { droneLevelData, DroneLevelData } from "../../../lib/droneData";

export default function DroneCalculatorPage() {
    const { t } = useLanguage();
    const [fromLevelInputValue, setFromLevelInputValue] = useState("1");
    const [toLevelInputValue, setToLevelInputValue] = useState("10");

    // Calculate totals based on the selected range
    const calculateTotals = () => {
        let totalParts = 0;
        let totalData = 0;

        const fromNum = parseInt(fromLevelInputValue) || 1;
        const toNum = parseInt(toLevelInputValue) || 1;

        if (fromNum >= toNum || fromNum < 1 || toNum > 300) return { totalParts, totalData };

        for (let i = fromNum; i < toNum; i++) {
            const levelRequirement = droneLevelData.find((d: DroneLevelData) => d.level === i);
            if (levelRequirement) {
                totalParts += levelRequirement.droneParts;
                totalData += levelRequirement.battleData;
            }
        }

        return { totalParts, totalData };
    };

    const totals = calculateTotals();

    const formatNumber = (num: number, useSuffix = false) => {
        if (useSuffix) {
            if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
            return num.toString();
        }
        return num.toLocaleString();
    };

    const handleFromLevelBlur = () => {
        let val = parseInt(fromLevelInputValue);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 300) val = 300;
        
        let toVal = parseInt(toLevelInputValue) || 10;
        if (val >= toVal && val < 300) {
            setToLevelInputValue((val + 1).toString());
        }
        setFromLevelInputValue(val.toString());
    };

    const handleToLevelBlur = () => {
        let val = parseInt(toLevelInputValue);
        if (isNaN(val) || val < 2) val = 2;
        if (val > 300) val = 300;
        
        let fromVal = parseInt(fromLevelInputValue) || 1;
        if (val <= fromVal && val > 1) {
            setFromLevelInputValue((val - 1).toString());
        }
        // setToLevelInputValue(val.toString()); // This line was removed as per the new structure
    };

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-white flex flex-col relative font-sans pt-12 md:pt-20">
            {/* Dynamic Background Blobs */}
            <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-pink-500/15 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-purple-500/15 rounded-full blur-[100px]" />
            </div>

            <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full relative z-10 p-1 md:p-6 pb-32 md:pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                    {/* Control Panel */}
                    <div className="md:col-span-1 bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-3 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-1">
                            <h1 className="text-sm md:text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
                                {t('droneCalculator').toUpperCase()}
                            </h1>
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-[8px] font-black uppercase tracking-[0.2em] border border-pink-500/20">
                                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse" />
                                020 TACTICAL
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Level Inputs */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest pl-1">{t('currentLevel')}</label>
                                    <input 
                                        type="text" 
                                        inputMode="numeric" 
                                        value={fromLevelInputValue} 
                                        onChange={(e) => setFromLevelInputValue(e.target.value.replace(/\D/g, ''))} 
                                        onBlur={handleFromLevelBlur}
                                        className="w-full bg-black/40 border border-white/10 p-2 rounded-xl text-white font-black text-xl text-center outline-none focus:border-pink-500/50 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest pl-1">{t('targetLevel')}</label>
                                    <input 
                                        type="text" 
                                        inputMode="numeric" 
                                        value={toLevelInputValue} 
                                        onChange={(e) => setToLevelInputValue(e.target.value.replace(/\D/g, ''))} 
                                        onBlur={handleToLevelBlur}
                                        className="w-full bg-black/40 border border-white/10 p-2 rounded-xl text-white font-black text-xl text-center outline-none focus:border-purple-500/50 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Quick Selectors */}
                            <div className="grid grid-cols-4 gap-1">
                                {[50, 100, 150, 300].map(val => (
                                    <button 
                                        key={val} 
                                        onClick={() => { setToLevelInputValue(val.toString()); handleToLevelBlur(); }} 
                                        className={`px-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all bg-white/5 border border-transparent hover:bg-white/10 ${toLevelInputValue === val.toString() ? 'text-pink-400 border-pink-500/30 bg-pink-500/5' : 'text-slate-500'}`}
                                    > 
                                        Lv. {val} 
                                    </button>
                                ))}
                            </div>

                            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2">
                                <span className="text-[10px] opacity-30">ℹ️</span>
                                <p className="text-[7px] text-slate-500 font-bold uppercase italic leading-tight">{t('orderMessage')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="md:col-span-1 bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-3 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5 opacity-50" />
                        <h3 className="text-[8px] text-slate-500 font-black uppercase tracking-[0.3em] mb-4 text-center italic opacity-60">
                            {t('requiredResources')}
                        </h3>

                        <div className="grid grid-cols-2 gap-2 w-full">
                            {[
                                { label: t('droneParts'), img: 'drone-part.png', val: totals.totalParts, color: 'pink', iconColor: 'text-pink-500/80' },
                                { label: t('battleData'), img: 'battle-data.png', val: totals.totalData, color: 'blue', iconColor: 'text-blue-400/80' }
                            ].map((res, idx) => (
                                <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-2.5 md:p-6 flex flex-col items-center justify-center group overflow-hidden relative">
                                    <div className="w-8 h-8 md:w-16 md:h-16 mb-1 relative shrink-0">
                                        <img src={`/images/resources/${res.img}`} alt={res.label} className="w-full h-full object-contain relative z-20 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div className={`text-[7px] md:text-[9px] font-black ${res.iconColor} uppercase tracking-tighter mb-0.5 truncate max-w-full`}>{res.label}</div>
                                    <div className="text-sm md:text-2xl font-black text-white font-mono tracking-tighter tabular-nums leading-none">
                                        {formatNumber(res.val)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="mt-4 text-[6px] font-black text-slate-800 uppercase tracking-widest opacity-50">020 Alliance Est. 2024</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
