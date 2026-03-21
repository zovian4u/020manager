"use client";

import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../../../lib/LanguageContext";
import { Plus, Minus, Info, Zap, TrendingUp, ShieldCheck } from "lucide-react";

type ResearchType = 'helmet' | 'bodyArmor' | 'accessories' | 'weapon';
type Tier = 'base' | 'star1' | 'star2' | 'star3';

interface Requirement {
    level: number;
    mats: number;
    cores: number;
    oil: number;
}

// Exact per-level data from Cpt Hedgehog's requirement tables.
const BASE_COSTS: Record<ResearchType, { matsLow: number; matsHigh: number; coreLow: number; coreHigh: number }> = {
    helmet:      { matsLow: 6000,  matsHigh: 8000,  coreLow: 10, coreHigh: 15 },
    bodyArmor:   { matsLow: 10000, matsHigh: 12000, coreLow: 20, coreHigh: 25 },
    accessories: { matsLow: 16000, matsHigh: 20000, coreLow: 30, coreHigh: 40 },
    weapon:      { matsLow: 30000, matsHigh: 30000, coreLow: 40, coreHigh: 40 },
};

const WEAPON_CORE_LEVELS = [2,5,8,11,14,17,20,23,26,29,32,35,38,41,44,47,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,99];

const STAR2_COSTS: Record<ResearchType, { mats: number; cores: number }> = {
    helmet:      { mats: 50000, cores: 45 },
    bodyArmor:   { mats: 60000, cores: 45 },
    accessories: { mats: 60000, cores: 45 },
    weapon:      { mats: 60000, cores: 45 },
};
const STAR3_COSTS: Record<ResearchType, { mats: number; cores: number }> = {
    helmet:      { mats: 60000, cores: 50 },
    bodyArmor:   { mats: 72000, cores: 50 },
    accessories: { mats: 72000, cores: 50 },
    weapon:      { mats: 72000, cores: 50 },
};

const generateDataSet = (type: ResearchType, tier: Tier): Requirement[] => {
    const data: Requirement[] = [];
    if (tier === 'base') {
        const cfg = BASE_COSTS[type];
        for (let i = 1; i <= 100; i++) {
            const mats = i < 100 ? (i < 50 ? cfg.matsLow : cfg.matsHigh) : 0;
            let cores = 0;
            if (type === 'weapon') {
                if (WEAPON_CORE_LEVELS.includes(i)) cores = cfg.coreLow;
            } else {
                if (i % 5 === 0) cores = (i < 50 ? cfg.coreLow : cfg.coreHigh);
            }
            const oil = i === 100 ? 1200000 : 0;
            data.push({ level: i, mats, cores, oil });
        }
    } else if (tier === 'star1') {
        for (let i = 1; i <= 100; i++) {
            const mats = i < 100 ? 30000 : 0;
            const cores = (i % 2 === 0 || i === 100) ? 40 : 0;
            const oil = i === 100 ? 3200000 : 0;
            data.push({ level: i, mats, cores, oil });
        }
    } else {
        const cfg = tier === 'star2' ? STAR2_COSTS[type] : STAR3_COSTS[type];
        for (let i = 2; i <= 100; i += 2) {
            const mats = i < 100 ? cfg.mats : 0;
            const cores = cfg.cores;
            const oil = i === 100 ? 3600000 : 0;
            data.push({ level: i, mats, cores, oil });
        }
    }
    return data;
};

const FINAL_TIER_COSTS = {
    base: { mats: 120000, cores: 200, oil: 1200000 },
    star1: { mats: 140000, cores: 225, oil: 3200000 },
    star2: { mats: 160000, cores: 250, oil: 3600000 },
    star3: { mats: 200000, cores: 300, oil: 4000000 }
};

export default function T11CalculatorPage() {
    const { t } = useLanguage();
    const [isMounted, setIsMounted] = useState(false);
    const [researchType, setResearchType] = useState<ResearchType>('helmet');
    const [tier, setTier] = useState<Tier>('base');
    const [fromLevel, setFromLevel] = useState(0);
    const [toLevel, setToLevel] = useState(100);
    const [fromInput, setFromInput] = useState("0");
    const [toInput, setToInput] = useState("100");
    const [includeFinalStep, setIncludeFinalStep] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const dataSet = useMemo(() => generateDataSet(researchType, tier), [researchType, tier]);

    const handleLevelChange = (setter: (val: number) => void, inputSetter: (val: string) => void, current: number, delta: number) => {
        const step = (tier === 'star2' || tier === 'star3') ? 2 : 1;
        const newVal = Math.max(0, Math.min(100, current + (delta * step)));
        setter(newVal);
        inputSetter(newVal.toString());
    };

    const handleInputChange = (type: 'from' | 'to', value: string) => {
        const sanitized = value.replace(/\D/g, '');
        if (type === 'from') {
            setFromInput(sanitized);
            const num = parseInt(sanitized);
            if (!isNaN(num)) setFromLevel(Math.max(0, Math.min(100, num)));
        } else {
            setToInput(sanitized);
            const num = parseInt(sanitized);
            if (!isNaN(num)) setToLevel(Math.max(0, Math.min(100, num)));
        }
    };

    const handleInputBlur = (type: 'from' | 'to') => {
        const val = type === 'from' ? fromInput : toInput;
        let num = parseInt(val) || 0;
        num = Math.max(0, Math.min(100, num));
        if ((tier === 'star2' || tier === 'star3') && num % 2 !== 0) num = Math.min(100, num + 1);
        if (type === 'from') {
            setFromLevel(num);
            setFromInput(num.toString());
            if (num > toLevel) { setToLevel(num); setToInput(num.toString()); }
        } else {
            setToLevel(num);
            setToInput(num.toString());
            if (num < fromLevel) { setFromLevel(num); setFromInput(num.toString()); }
        }
    };

    const totals = useMemo(() => {
        let mats = 0, cores = 0, oil = 0;
        dataSet.forEach(req => {
            if (req.level > fromLevel && req.level <= toLevel) {
                mats += req.mats; cores += req.cores; oil += req.oil;
            }
        });
        if (includeFinalStep && toLevel === 100) {
            mats += FINAL_TIER_COSTS[tier].mats;
            cores += FINAL_TIER_COSTS[tier].cores;
            oil += FINAL_TIER_COSTS[tier].oil;
        }
        return { mats, cores, oil };
    }, [dataSet, fromLevel, toLevel, includeFinalStep, tier]);

    const formatNumber = (num: number, useSuffix = false) => {
        if (useSuffix) {
            if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
            return num.toString();
        }
        return isMounted ? num.toLocaleString() : num.toString();
    };

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-white flex flex-col relative font-sans pt-12 md:pt-20">
            {/* Rich Aesthetics: Background Blobs */}
            <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/15 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/15 rounded-full blur-[100px]" />
            </div>

            <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full relative z-10 p-1 md:p-6 pb-32 md:pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
                    {/* Control Panel */}
                    <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-3 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-1">
                            <h1 className="text-sm md:text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
                                {t('t11Calculator').toUpperCase()}
                            </h1>
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                                <Zap size={8} fill="currentColor" />
                                020 TACTICAL
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Research Type */}
                            <div className="space-y-1.5">
                                <div className="grid grid-cols-4 gap-1">
                                    {(['helmet', 'bodyArmor', 'accessories', 'weapon'] as const).map((type) => (
                                        <button 
                                            key={type} 
                                            onClick={() => setResearchType(type)} 
                                            className={`px-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${researchType === type ? 'bg-blue-600 text-white border-blue-400' : 'bg-black/40 text-slate-500 border-white/5 hover:bg-white/10'}`}
                                        > 
                                            {t(type)} 
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tier Selection */}
                            <div className="space-y-1.5">
                                <div className="grid grid-cols-4 gap-1">
                                    {(['base', 'star1', 'star2', 'star3'] as const).map((tValue) => (
                                        <button 
                                            key={tValue} 
                                            onClick={() => { setTier(tValue); setFromLevel(0); setToLevel(100); setFromInput("0"); setToInput("100"); }} 
                                            className={`px-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${tier === tValue ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-black/40 text-slate-500 border-white/5 hover:bg-white/10'}`}
                                        > 
                                            {tValue === 'base' ? 'BASE' : tValue.slice(0, 5).toUpperCase()} 
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Range Inputs */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest pl-1 opacity-70">{t('fromPercentage')}</label>
                                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                                        <button onClick={() => handleLevelChange(setFromLevel, setFromInput, fromLevel, -1)} className="p-1 rounded-lg text-slate-600 hover:text-blue-400 transition-colors"><Minus size={12} /></button>
                                        <input type="text" inputMode="numeric" value={fromInput} onChange={(e) => handleInputChange('from', e.target.value)} onBlur={() => handleInputBlur('from')} className="flex-1 bg-transparent text-center font-black text-lg text-white outline-none w-8" />
                                        <button onClick={() => handleLevelChange(setFromLevel, setFromInput, fromLevel, 1)} className="p-1 rounded-lg text-slate-600 hover:text-blue-400 transition-colors"><Plus size={12} /></button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest pl-1 opacity-70">{t('toPercentage')}</label>
                                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                                        <button onClick={() => handleLevelChange(setToLevel, setToInput, toLevel, -1)} className="p-1 rounded-lg text-slate-600 hover:text-blue-400 transition-colors"><Minus size={12} /></button>
                                        <input type="text" inputMode="numeric" value={toInput} onChange={(e) => handleInputChange('to', e.target.value)} onBlur={() => handleInputBlur('to')} className="flex-1 bg-transparent text-center font-black text-lg text-white outline-none w-8" />
                                        <button onClick={() => handleLevelChange(setToLevel, setToInput, toLevel, 1)} className="p-1 rounded-lg text-slate-600 hover:text-blue-400 transition-colors"><Plus size={12} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-0.5 flex flex-wrap gap-1 items-center">
                                {[0, 25, 50, 75, 100].map(val => (
                                    <button 
                                        key={val} 
                                        onClick={() => { setToLevel(val); setToInput(val.toString()); if (val < fromLevel) { setFromLevel(val); setFromInput(val.toString()); } }} 
                                        className={`px-1.5 py-1 rounded-md text-[7px] font-black transition-all uppercase tracking-tight ${toLevel === val ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-600 border border-transparent'}`}
                                    > 
                                        {val}% 
                                    </button>
                                ))}
                                <div className="h-3 w-px bg-white/10 mx-0.5"></div>
                                <button 
                                    onClick={() => setIncludeFinalStep(!includeFinalStep)} 
                                    className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-[7px] font-black transition-all uppercase tracking-tight border ${includeFinalStep ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-slate-600 border-transparent'}`}
                                > 
                                    <ShieldCheck size={8} /> {t('finalStep')} 
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="lg:col-span-7 flex flex-col gap-2">
                        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-3 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl relative overflow-hidden flex-1 flex flex-col">
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                            
                            <h3 className="text-[8px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3 text-center italic opacity-60">
                                {t('requiredResources')}
                            </h3>

                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { label: 'MATERIALS', img: 'armament-materials.png', color: 'blue', val: totals.mats, iconColor: 'text-blue-500/80' },
                                    { label: 'CORES', img: 'armament-core.png', color: 'indigo', val: totals.cores, iconColor: 'text-indigo-400/80' },
                                    { label: 'OIL', img: 'oil.png', color: 'amber', val: totals.oil, iconColor: 'text-amber-500/80' }
                                ].map((row, idx) => (
                                    <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-2 md:p-6 flex flex-col items-center justify-center group relative overflow-hidden">
                                        <div className="w-8 h-8 md:w-14 md:h-14 mb-1 relative shrink-0">
                                            <img src={`/images/resources/${row.img}`} alt={row.label} className="w-full h-full object-contain relative z-10 filter" />
                                        </div>
                                        <div className={`text-[7px] md:text-[9px] font-black uppercase tracking-tighter mb-0.5 ${row.iconColor} truncate max-w-full`}>{row.label}</div>
                                        <div className="text-sm md:text-2xl font-black text-white font-mono tracking-tighter tabular-nums leading-none">{formatNumber(row.val, true)}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 p-1.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center gap-1.5">
                                <Info className="text-blue-400/30 shrink-0" size={10} />
                                <div className="text-[7px] text-slate-600 font-bold uppercase italic tracking-wide break-words">{t('orderMessage')}</div>
                            </div>
                        </div>

                        {/* Credits / Footer */}
                        <div className="bg-white/[0.01] border border-white/5 p-1 rounded-lg flex items-center justify-between px-3">
                             <p className="text-[6px] font-black text-slate-800 uppercase tracking-widest">DS: Cpt-Hedge.com</p>
                             <p className="text-[6px] font-black text-slate-800 uppercase tracking-widest italic opacity-30">020 Alliance Hub</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
