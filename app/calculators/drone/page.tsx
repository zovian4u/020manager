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
        setToLevelInputValue(val.toString());
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="mb-8 text-center animate-in slide-in-from-bottom border-b border-pink-100 pb-8">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 uppercase italic tracking-tighter mb-4">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                            {t('droneCalculator') || "Drone Calculator"}
                        </span>
                    </h1>
                    <p className="text-slate-500 font-bold max-w-2xl mx-auto">
                        {t('droneCalcDesc') || "Calculate the exact Drone Parts and Battle Data required for your next upgrade target."}
                    </p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

                    <div className="relative z-10">
                        {/* Inputs Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest">{t('currentLevel') || "Current Level"}</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={fromLevelInputValue}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFromLevelInputValue(val);
                                    }}
                                    onBlur={handleFromLevelBlur}
                                    className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-800 font-bold text-xl outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 transition-all shadow-inner"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest">{t('targetLevel') || "Target Level"}</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={toLevelInputValue}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setToLevelInputValue(val);
                                    }}
                                    onBlur={handleToLevelBlur}
                                    className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-800 font-bold text-xl outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {/* Results Section */}
                        <div className="bg-slate-900 rounded-[2rem] p-8 shadow-inner border border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>

                            <h3 className="text-center text-[10px] text-slate-400 font-black uppercase mb-6 tracking-widest">
                                {t('requiredResources') || "Required Resources"}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex items-center justify-center p-6 bg-slate-800/50 rounded-3xl border border-slate-700/50 hover:border-pink-500/30 transition-colors gap-6 pointer-events-auto group/item relative">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 animate-in zoom-in spin-in-12 duration-700 pointer-events-none drop-shadow-2xl">
                                        <img src="/images/resources/drone-part.png" alt="Drone Parts" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-1 font-mono cursor-help" title={totals.totalParts.toLocaleString()}>
                                            {formatNumber(totals.totalParts, true)}
                                        </div>
                                        <div className="text-[11px] text-pink-400 font-black uppercase tracking-widest">
                                            {t('droneParts') || "Drone Parts"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center p-6 bg-slate-800/50 rounded-3xl border border-slate-700/50 hover:border-blue-500/30 transition-colors gap-6 pointer-events-auto group/item relative">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 animate-in zoom-in spin-in-12 duration-700 pointer-events-none drop-shadow-2xl">
                                        <img src="/images/resources/battle-data.png" alt="Battle Data" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <div className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-1 font-mono cursor-help" title={totals.totalData.toLocaleString()}>
                                            {formatNumber(totals.totalData, true)}
                                        </div>
                                        <div className="text-[11px] text-blue-400 font-black uppercase tracking-widest">
                                            {t('battleData') || "Battle Data"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
