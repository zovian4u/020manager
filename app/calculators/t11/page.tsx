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
// Base tier: costs change at the 50% mark. Levels 1-49 use low rate, 50-99 use high rate.
// Cores are every 5th level (except Weapon which has a +3/+2 alternating pattern).
// Core values also split at level 50 (levels 5-45 = low, 50-100 = high).
const BASE_COSTS: Record<ResearchType, { matsLow: number; matsHigh: number; coreLow: number; coreHigh: number }> = {
    helmet:      { matsLow: 6000,  matsHigh: 8000,  coreLow: 10, coreHigh: 15 },
    bodyArmor:   { matsLow: 10000, matsHigh: 12000, coreLow: 20, coreHigh: 25 },
    accessories: { matsLow: 16000, matsHigh: 20000, coreLow: 30, coreHigh: 40 },
    weapon:      { matsLow: 30000, matsHigh: 30000, coreLow: 40, coreHigh: 40 },
};

// Weapon cores follow a split pattern from Cpt Hedgehog:
// Phase 1 (0-50%): every 3 levels starting at 2 → 2,5,8,...,50 (17 levels)
// Phase 2 (50-98%): every 2 levels starting at 52 → 52,54,...,98 (24 levels)
// Phase 3: final level 99 (1 level)
// Total: 42 levels × 40 cores = 1,680
const WEAPON_CORE_LEVELS = [2,5,8,11,14,17,20,23,26,29,32,35,38,41,44,47,50,52,54,56,58,60,62,64,66,68,70,72,74,76,78,80,82,84,86,88,90,92,94,96,98,99];

// Star 2/3: per-step costs differ for Helmet vs other types
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
            // Materials: levels 1-49 use low rate, 50-99 use high rate, level 100 = 0
            const mats = i < 100 ? (i < 50 ? cfg.matsLow : cfg.matsHigh) : 0;
            let cores = 0;

            if (type === 'weapon') {
                // Weapon: alternating +3/+2 pattern
                if (WEAPON_CORE_LEVELS.includes(i)) cores = cfg.coreLow; // uniform 40
            } else {
                // Others: every 5th level; value splits at level 50
                if (i % 5 === 0) cores = (i < 50 ? cfg.coreLow : cfg.coreHigh);
            }

            const oil = i === 100 ? 1200000 : 0;
            data.push({ level: i, mats, cores, oil });
        }
    } else if (tier === 'star1') {
        // Star 1: ALL types are identical — 30,000 mats/level, 40 cores every other level
        for (let i = 1; i <= 100; i++) {
            const mats = i < 100 ? 30000 : 0;
            const cores = (i % 2 === 0 || i === 100) ? 40 : 0;
            const oil = i === 100 ? 3200000 : 0;
            data.push({ level: i, mats, cores, oil });
        }
    } else {
        // Star 2 & 3: 2% increments (50 steps), costs differ by type
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
            if (!isNaN(num)) {
                setFromLevel(Math.max(0, Math.min(100, num)));
            }
        } else {
            setToInput(sanitized);
            const num = parseInt(sanitized);
            if (!isNaN(num)) {
                setToLevel(Math.max(0, Math.min(100, num)));
            }
        }
    };

    const handleInputBlur = (type: 'from' | 'to') => {
        const val = type === 'from' ? fromInput : toInput;
        let num = parseInt(val) || 0;
        num = Math.max(0, Math.min(100, num));
        
        // Ensure steps of 2 for star tiers
        if (tier === 'star2' || tier === 'star3') {
            if (num % 2 !== 0) num = Math.min(100, num + 1);
        }

        if (type === 'from') {
            setFromLevel(num);
            setFromInput(num.toString());
            if (num > toLevel) {
                setToLevel(num);
                setToInput(num.toString());
            }
        } else {
            setToLevel(num);
            setToInput(num.toString());
            if (num < fromLevel) {
                setFromLevel(num);
                setFromInput(num.toString());
            }
        }
    };

    const totals = useMemo(() => {
        let mats = 0;
        let cores = 0;
        let oil = 0;

        dataSet.forEach(req => {
            if (req.level > fromLevel && req.level <= toLevel) {
                mats += req.mats;
                cores += req.cores;
                oil += req.oil;
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
        <div className="min-h-screen bg-[#0c0f1a] pt-20 pb-6 font-['Outfit'] transition-colors duration-500">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Compact Header */}
                <div className="mb-5 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-500/20">
                        <Zap size={10} fill="currentColor" />
                        <span>020 Tactical</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
                        {t('t11Calculator')}
                    </h1>
                </div>

                {/* Main Card */}
                <div className="bg-[#141829] rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-6 relative overflow-hidden">
                    {/* Glowing top accent */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-0 items-start">
                        {/* Left: Controls */}
                        <div className="space-y-4 lg:pr-6">
                            {/* Research Type + Tier - side by side on desktop */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.15em] flex items-center gap-1.5 pl-0.5">
                                        <TrendingUp size={10} />
                                        {t('research')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-1">
                                        {(['helmet', 'bodyArmor', 'accessories', 'weapon'] as const).map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setResearchType(type)}
                                                className={`px-2 py-2 rounded-lg text-[11px] font-bold transition-all ${
                                                    researchType === type 
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
                                                }`}
                                            >
                                                {t(type)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em] flex items-center gap-1.5 pl-0.5">
                                        <ShieldCheck size={10} />
                                        {t('tier')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-1">
                                        {(['base', 'star1', 'star2', 'star3'] as const).map((tValue) => (
                                            <button
                                                key={tValue}
                                                onClick={() => {
                                                    setTier(tValue);
                                                    setFromLevel(0);
                                                    setToLevel(100);
                                                    setFromInput("0");
                                                    setToInput("100");
                                                }}
                                                className={`px-2 py-2 rounded-lg text-[11px] font-bold transition-all ${
                                                    tier === tValue 
                                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
                                                }`}
                                            >
                                                {tValue === 'base' ? 'BASE' : tValue.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Range Inputs - compact row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] text-slate-500 font-black uppercase tracking-[0.15em] pl-0.5">{t('fromPercentage')}</label>
                                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                                        <button onClick={() => handleLevelChange(setFromLevel, setFromInput, fromLevel, -1)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/5 transition-colors"><Minus size={16} /></button>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={fromInput}
                                            onChange={(e) => handleInputChange('from', e.target.value)}
                                            onBlur={() => handleInputBlur('from')}
                                            className="flex-1 bg-transparent text-center font-black text-xl text-white outline-none w-8"
                                        />
                                        <button onClick={() => handleLevelChange(setFromLevel, setFromInput, fromLevel, 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/5 transition-colors"><Plus size={16} /></button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] text-slate-500 font-black uppercase tracking-[0.15em] pl-0.5">{t('toPercentage')}</label>
                                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                                        <button onClick={() => handleLevelChange(setToLevel, setToInput, toLevel, -1)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/5 transition-colors"><Minus size={16} /></button>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={toInput}
                                            onChange={(e) => handleInputChange('to', e.target.value)}
                                            onBlur={() => handleInputBlur('to')}
                                            className="flex-1 bg-transparent text-center font-black text-xl text-white outline-none w-8"
                                        />
                                        <button onClick={() => handleLevelChange(setToLevel, setToInput, toLevel, 1)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/5 transition-colors"><Plus size={16} /></button>
                                    </div>
                                </div>
                            </div>

                            {/* Quick set + Final Step row */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {[0, 25, 50, 75, 100].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => {
                                            setToLevel(val);
                                            setToInput(val.toString());
                                            if (val < fromLevel) {
                                                setFromLevel(val);
                                                setFromInput(val.toString());
                                            }
                                        }}
                                        className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-colors ${
                                            toLevel === val ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-transparent'
                                        }`}
                                    >
                                        {val}%
                                    </button>
                                ))}
                                <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block"></div>
                                <button
                                    onClick={() => setIncludeFinalStep(!includeFinalStep)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black transition-all border ${
                                        includeFinalStep 
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                        : 'bg-white/5 text-slate-500 hover:text-slate-300 border-transparent'
                                    }`}
                                >
                                    <ShieldCheck size={10} />
                                    {t('finalStep')}
                                </button>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent self-stretch mx-4"></div>
                        <div className="lg:hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                        {/* Right: Results */}
                        <div className="lg:pl-6 flex flex-col justify-center h-full">
                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3 text-center">
                                {t(researchType)} · {tier === 'base' ? 'INITIAL' : tier.toUpperCase()} · {fromLevel}% → {toLevel}%
                            </div>

                            <div className="grid grid-cols-3 gap-2 md:gap-3">
                                {/* Materials */}
                                <div className="text-center p-3 md:p-4 rounded-2xl bg-gradient-to-b from-blue-500/10 to-blue-500/5 border border-blue-500/10 group hover:border-blue-500/25 transition-all">
                                    <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 rounded-xl bg-blue-500/10 p-1.5 md:p-2 group-hover:scale-110 transition-transform">
                                        <img src="/images/resources/armament-materials.png" alt="Materials" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-[8px] md:text-[9px] font-black text-blue-400/70 uppercase tracking-wider mb-0.5">{t('armamentMaterials')}</div>
                                    <div className="text-lg md:text-2xl font-black text-white font-mono tracking-tighter" title={formatNumber(totals.mats)}>
                                        {formatNumber(totals.mats, true)}
                                    </div>
                                </div>

                                {/* Cores */}
                                <div className="text-center p-3 md:p-4 rounded-2xl bg-gradient-to-b from-indigo-500/10 to-indigo-500/5 border border-indigo-500/10 group hover:border-indigo-500/25 transition-all">
                                    <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 rounded-xl bg-indigo-500/10 p-1.5 md:p-2 group-hover:scale-110 transition-transform">
                                        <img src="/images/resources/armament-core.png" alt="Cores" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-[8px] md:text-[9px] font-black text-indigo-400/70 uppercase tracking-wider mb-0.5">{t('armamentCores')}</div>
                                    <div className="text-lg md:text-2xl font-black text-white font-mono tracking-tighter" title={formatNumber(totals.cores)}>
                                        {formatNumber(totals.cores, true)}
                                    </div>
                                </div>

                                {/* Oil */}
                                <div className="text-center p-3 md:p-4 rounded-2xl bg-gradient-to-b from-amber-500/10 to-amber-500/5 border border-amber-500/10 group hover:border-amber-500/25 transition-all">
                                    <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 rounded-xl bg-amber-500/10 p-1.5 md:p-2 group-hover:scale-110 transition-transform">
                                        <img src="/images/resources/oil.png" alt="Oil" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-[8px] md:text-[9px] font-black text-amber-400/70 uppercase tracking-wider mb-0.5">{t('oil')}</div>
                                    <div className="text-lg md:text-2xl font-black text-white font-mono tracking-tighter" title={formatNumber(totals.oil)}>
                                        {totals.oil > 0 ? formatNumber(totals.oil, true) : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Info bar */}
                            <div className="mt-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2">
                                <Info className="text-blue-400/50 shrink-0" size={12} />
                                <div className="text-[9px] text-slate-500 font-semibold text-left">
                                    {t('orderMessage')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-3 text-center">
                    <div className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.15em]">
                        Data from <a href="https://cpt-hedge.com" target="_blank" className="text-blue-500/60 hover:text-blue-400 transition-colors">Cpt-Hedge.com</a> · 020 Alliance
                    </div>
                </div>
            </div>
        </div>
    );
}
