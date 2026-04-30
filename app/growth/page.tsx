"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';
import Link from 'next/link';

// ─── BORDER DEFINITIONS ───────────────────────────────────────────────────────
const BORDERS = [
  { id: 'sakura',    icon: '🌸', label: 'Sakura Bloom',    bg: '#1a0a18', accent: '#f472b6', accent2: '#e879f9', emoji: ['🌸','🌸','🌺','🌸'] },
  { id: 'galaxy',   icon: '🌌', label: 'Galaxy',           bg: '#050b1f', accent: '#818cf8', accent2: '#6366f1', emoji: ['⭐','✨','💫','🌟'] },
  { id: 'chick',    icon: '🐥', label: 'Golden Chick',     bg: '#1a1200', accent: '#fbbf24', accent2: '#f59e0b', emoji: ['🐥','🌻','🐣','🐥'] },
  { id: 'ocean',    icon: '🌊', label: 'Ocean Tide',       bg: '#020f1e', accent: '#22d3ee', accent2: '#0ea5e9', emoji: ['🌊','🐚','💙','🌊'] },
  { id: 'forest',   icon: '🌿', label: 'Enchanted Forest', bg: '#061210', accent: '#4ade80', accent2: '#22c55e', emoji: ['🌿','🍀','🌱','✨'] },
  { id: 'candy',    icon: '🍭', label: 'Candy Pop',        bg: '#1a0a1a', accent: '#f9a8d4', accent2: '#fb7185', emoji: ['🍭','🍬','🎀','💕'] },
  { id: 'dragon',   icon: '🐉', label: 'Dragon Fire',      bg: '#1a0500', accent: '#f97316', accent2: '#ef4444', emoji: ['🐉','🔥','⚔️','🐉'] },
  { id: 'snow',     icon: '❄️', label: 'Arctic Frost',     bg: '#050d1a', accent: '#bae6fd', accent2: '#e0f2fe', emoji: ['❄️','🌨️','⛄','✨'] },
  { id: 'neon',     icon: '⚡', label: 'Neon Surge',       bg: '#050010', accent: '#a855f7', accent2: '#06b6d4', emoji: ['⚡','💜','🔮','✨'] },
  { id: 'rose',     icon: '🌹', label: 'Royal Rose',       bg: '#150510', accent: '#fb7185', accent2: '#e11d48', emoji: ['🌹','👑','💎','🌹'] },
];

// ─── CHART (inside the 1x1 card, self-contained, no overlap) ─────────────────
const CardChart = ({ data, color }: { data: { week: string; value: number }[]; color: string }) => {
  if (!data || data.length < 2) return (
    <div style={{ color: '#ffffff44', fontSize: 11, fontWeight: 900, textAlign: 'center', marginTop: 20 }}>
      NOT ENOUGH DATA
    </div>
  );

  const W = 360, H = 180, padL = 45, padR = 10, padT = 10, padB = 24;
  const vals = data.map(d => d.value);
  let minV = Math.min(...vals);
  let maxV = Math.max(...vals);
  
  // Add buffer to top and bottom
  const actualRange = maxV - minV;
  const buffer = actualRange === 0 ? (maxV * 0.1 || 1) : actualRange * 0.1;
  minV -= buffer;
  maxV += buffer;
  const range = maxV - minV;

  const px = (i: number) => padL + (i / (data.length - 1)) * (W - padL - padR);
  const py = (v: number) => padT + (1 - (v - minV) / range) * (H - padT - padB);

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)},${py(d.value).toFixed(1)}`).join(' ');
  const area = `${path} L ${px(data.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L ${px(0).toFixed(1)},${(H - padB).toFixed(1)} Z`;

  const labelStep = Math.max(1, Math.floor((data.length - 1) / 4));

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`cg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid + Labels */}
      {[0, 1, 2].map(i => {
        const y = padT + (i / 2) * (H - padT - padB);
        const val = maxV - (i / 2) * range;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#ffffff0d" strokeWidth="1" />
            <text x={padL - 8} y={y + 3} textAnchor="end" fill="#ffffff22" fontSize="7" fontWeight="900">
              {val.toFixed(1)}M
            </text>
          </g>
        );
      })}
      {/* Area fill */}
      <path d={area} fill={`url(#cg-${color.replace('#','')})`} />
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots (thinned) */}
      {data.map((d, i) => {
        if (data.length > 12 && i % 4 !== 0 && i !== data.length - 1) return null;
        return <circle key={i} cx={px(i)} cy={py(d.value)} r="3.5" fill="#050010" stroke={color} strokeWidth="2" />;
      })}
      {/* X labels */}
      {data.map((d, i) => {
        if (i % labelStep !== 0 && i !== data.length - 1) return null;
        return (
          <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fill="#ffffff40" fontSize="8" fontWeight="700">
            {d.week}
          </text>
        );
      })}
    </svg>
  );
};

// ─── THE SHAREABLE 1×1 CARD ──────────────────────────────────────────────────
const ShareCard = React.forwardRef<HTMLDivElement, {
  border: typeof BORDERS[0];
  playerName: string;
  data: { week: string; value: number }[];
  color: string;
  title: string;
  isMocking: boolean;
}>(({ border, playerName, data, color, title, isMocking }, ref) => {
  const SIZE = 480;

  return (
    <div
      ref={ref}
      style={{
        width: SIZE, height: SIZE,
        background: border.bg,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Dot grid texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.07,
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 0)',
        backgroundSize: '20px 20px',
        pointerEvents: 'none',
      }} />

      {/* Glow blobs */}
      <div style={{
        position: 'absolute', top: -60, left: -60,
        width: 200, height: 200,
        borderRadius: '50%',
        background: border.accent,
        opacity: 0.12, filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, right: -60,
        width: 200, height: 200,
        borderRadius: '50%',
        background: border.accent2,
        opacity: 0.12, filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      {/* ── SVG Border Frame ── */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 480 480" fill="none">
        <defs>
          <linearGradient id="fg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={border.accent} />
            <stop offset="100%" stopColor={border.accent2} />
          </linearGradient>
        </defs>

        {/* Outer subtle rect */}
        <rect x="14" y="14" width="452" height="452" rx="24" stroke={border.accent} strokeOpacity="0.15" strokeWidth="1" />

        {/* Corner L-shapes */}
        {/* TL */}
        <path d={`M14,70 L14,28 Q14,14 28,14 L70,14`} stroke="url(#fg1)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* TR */}
        <path d={`M410,14 L452,14 Q466,14 466,28 L466,70`} stroke="url(#fg1)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* BL */}
        <path d={`M14,410 L14,452 Q14,466 28,466 L70,466`} stroke="url(#fg1)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* BR */}
        <path d={`M410,466 L452,466 Q466,466 466,452 L466,410`} stroke="url(#fg1)" strokeWidth="3" strokeLinecap="round" fill="none"/>

        {/* Mid tick lines */}
        <line x1="240" y1="14" x2="240" y2="24" stroke={border.accent} strokeOpacity="0.5" strokeWidth="2"/>
        <line x1="240" y1="456" x2="240" y2="466" stroke={border.accent} strokeOpacity="0.5" strokeWidth="2"/>
        <line x1="14" y1="240" x2="24" y2="240" stroke={border.accent} strokeOpacity="0.5" strokeWidth="2"/>
        <line x1="456" y1="240" x2="466" y2="240" stroke={border.accent} strokeOpacity="0.5" strokeWidth="2"/>

        {/* Corner dots */}
        {[[28,28],[452,28],[28,452],[452,452]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="3" fill={border.accent} opacity="0.6"/>
        ))}
      </svg>

      {/* ── Corner emojis ── */}
      <div style={{ position: 'absolute', top: 22, left: 22, fontSize: 22, lineHeight: 1 }}>{border.emoji[0]}</div>
      <div style={{ position: 'absolute', top: 22, right: 22, fontSize: 22, lineHeight: 1 }}>{border.emoji[1]}</div>
      <div style={{ position: 'absolute', bottom: 54, left: 22, fontSize: 18, lineHeight: 1 }}>{border.emoji[2]}</div>
      <div style={{ position: 'absolute', bottom: 54, right: 22, fontSize: 22, lineHeight: 1 }}>{border.emoji[3]}</div>

      {/* ── Content ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        padding: '44px 36px 50px 36px',
      }}>
        {/* Header: username + title */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
          }}>
            <div style={{
              width: 6, height: 28, borderRadius: 3,
              background: `linear-gradient(to bottom, ${border.accent}, ${border.accent2})`,
              flexShrink: 0,
            }} />
            <div>
              <div style={{
                color: '#ffffff', fontWeight: 900, fontSize: 20,
                letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: 1,
              }}>
                {playerName}
              </div>
              <div style={{
                color: border.accent, fontWeight: 700, fontSize: 9,
                letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2, opacity: 0.8,
              }}>
                {title}
              </div>
            </div>
          </div>
          {/* Divider */}
          <div style={{
            height: 1, background: `linear-gradient(to right, ${border.accent}33, transparent)`,
            marginTop: 6,
          }} />
        </div>

        {/* Chart area — takes remaining space */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '100%' }}>
            <CardChart data={data} color={color} />
          </div>
        </div>

        {/* Latest value pill + Growth Summary */}
        {data.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 2,
          }}>
            {data.length >= 2 && (
              <div style={{
                color: (data[data.length-1].value - data[0].value) >= 0 ? '#4ade80' : '#f87171',
                fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                {(data[data.length-1].value - data[0].value) >= 0 ? '+' : ''}
                {(data[data.length-1].value - data[0].value).toFixed(1)}M 
                ({(((data[data.length-1].value - data[0].value) / (data[0].value || 1)) * 100).toFixed(1)}%)
              </div>
            )}
            <div style={{
              background: `${border.accent}22`,
              border: `1px solid ${border.accent}55`,
              borderRadius: 100, padding: '4px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: border.accent }} />
              <span style={{ color: border.accent, fontWeight: 900, fontSize: 13, letterSpacing: '-0.02em' }}>
                {data[data.length - 1].value.toFixed(1)}M
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer: cute 020 Alliance ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 42,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(to right, ${border.accent}10, ${border.accent2}18, ${border.accent}10)`,
        borderTop: `1px solid ${border.accent}22`,
        gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>{border.emoji[0]}</span>
        <span style={{
          color: border.accent, fontWeight: 900, fontSize: 10,
          letterSpacing: '0.25em', textTransform: 'uppercase',
        }}>
          020 Alliance
        </span>
        <div style={{
          width: 4, height: 4, borderRadius: '50%',
          background: border.accent2, opacity: 0.8,
        }} />
        <span style={{
          color: '#ffffff55', fontWeight: 700, fontSize: 9,
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          {isMocking ? 'TEST_DATA' : 'Power Tracker'}
        </span>
        <span style={{ fontSize: 14 }}>{border.emoji[1]}</span>
      </div>
    </div>
  );
});
ShareCard.displayName = 'ShareCard';

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function GrowthPage() {
  const stack = useStackApp();
  const user = stack.useUser();
  const { t, language } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'total' | 'squad' | 'arena'>('total');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMocking, setIsMocking] = useState(false);
  const [activeBorderId, setActiveBorderId] = useState('sakura');
  const [viewRange, setViewRange] = useState(0);
  const [memberUsername, setMemberUsername] = useState<string | null>(null);

  const activeBorder = BORDERS.find(b => b.id === activeBorderId) || BORDERS[0];

  const ranges = [
    { label: '1M', weeks: 4 },
    { label: '3M', weeks: 12 },
    { label: '6M', weeks: 24 },
    { label: '12M', weeks: 52 },
    { label: 'ALL', weeks: 0 },
  ];

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    async function loadInitialData() {
      // Fetch Growth Snapshots
      const { data: snapData } = await supabase.from('growth_snapshots').select('*').eq('user_id', user!.id).order('captured_at', { ascending: true });
      if (snapData) setSnapshots(snapData);

      // Fetch Member Profile for Username
      const { data: memberData } = await supabase.from('members').select('username').eq('user_id', user!.id).single();
      if (memberData) setMemberUsername(memberData.username);
      
      setIsLoading(false);
    }

    loadInitialData();
  }, [user]);

  const getChartData = () => {
    const factor = 1_000_000;
    let ud = viewRange > 0 ? snapshots.slice(-viewRange) : [...snapshots];
    return ud.map(s => ({
      week: s.week_label || new Date(s.captured_at).toLocaleDateString(language, { month: 'short', day: 'numeric' }),
      value: (activeTab === 'total' ? s.total_hero_power : activeTab === 'squad' ? s.squad_1_power : s.arena_power) / factor,
    }));
  };

  const loadMockData = () => {
    setSnapshots(Array.from({ length: 20 }, (_, i) => ({
      id: i, user_id: 'mock',
      total_hero_power: (150 + i * 5 + Math.random() * 8) * 1_000_000,
      squad_1_power: (40 + i * 2 + Math.random() * 4) * 1_000_000,
      arena_power: (20 + i * 1.5 + Math.random() * 2) * 1_000_000,
      captured_at: new Date(Date.now() - (19 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      week_label: `W${i + 1}`,
    })));
    setIsMocking(true);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `020-growth-${activeTab}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch { alert('Failed to generate image.'); }
    finally { setTimeout(() => setIsGenerating(false), 1500); }
  };

  const chartData = getChartData();
  const isLocked = snapshots.length < 2;
  const playerName = (memberUsername || user?.displayName || (user as any)?.username || user?.primaryEmail?.split('@')[0] || 'COMMANDER').toUpperCase();
  const chartColor = activeTab === 'total' ? '#f472b6' : activeTab === 'squad' ? '#60a5fa' : '#fbbf24';
  const chartTitle = activeTab === 'total' ? 'Total Hero Power' : activeTab === 'squad' ? 'Squad 1 Power' : 'Arena Power';

  if (isLoading) return (
    <div className="h-screen bg-[#050010] flex items-center justify-center text-white font-black animate-pulse uppercase tracking-[0.4em] text-sm">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050010] text-white pt-20 pb-32 px-4 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">

        {/* ── Header ── */}
        <div className="flex items-end justify-between px-2">
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-300 to-pink-400">
              {t('growth')}
            </h1>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">{t('growthDesc').split('.')[0]}</p>
          </div>
          <Link href="/hub">
            <button className="text-slate-600 hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              ← HUB
            </button>
          </Link>
        </div>

        {/* ── Tab + Range Controls ── */}
        <div className="flex flex-wrap gap-3 items-center justify-between px-2">
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            {(['total','squad','arena'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>
                {tab === 'total' ? 'Hero' : tab === 'squad' ? 'Squad' : 'Arena'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            {ranges.map(r => (
              <button key={r.label} onClick={() => setViewRange(r.weeks)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${viewRange === r.weeks ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Card Preview */}
          <div className="flex-shrink-0 flex items-center justify-center w-full lg:w-auto">
            <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ boxShadow: `0 0 60px ${activeBorder.accent}30` }}>
              <ShareCard
                ref={cardRef}
                border={activeBorder}
                playerName={playerName}
                data={chartData}
                color={chartColor}
                title={chartTitle}
                isMocking={isMocking}
              />
            </div>
          </div>

          {/* Controls Panel */}
          <div className="flex-1 space-y-6 min-w-0">

            {/* Border selector */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeBorder.accent }}>
                🎨 Choose Your Style
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {BORDERS.map(b => (
                  <button key={b.id} onClick={() => setActiveBorderId(b.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-center ${activeBorderId === b.id ? 'ring-2 scale-105' : 'opacity-50 hover:opacity-80'}`}
                    style={activeBorderId === b.id ? {
                      background: `${b.accent}18`,
                      boxShadow: `0 0 12px ${b.accent}40`,
                      outline: `2px solid ${b.accent}`,
                    } : { background: 'rgba(255,255,255,0.03)' }}
                    title={b.label}>
                    <span className="text-xl">{b.icon}</span>
                    <span className="text-[7px] font-black uppercase tracking-tight text-slate-400 leading-tight">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Export + Status */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-3">
              <button onClick={handleDownload} disabled={isGenerating || isLocked}
                className="w-full py-4 font-black rounded-xl uppercase tracking-widest text-sm transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: isLocked ? undefined : `linear-gradient(135deg, ${activeBorder.accent}, ${activeBorder.accent2})`, color: isLocked ? undefined : '#000' }}>
                {isGenerating ? '⏳ Generating...' : isLocked ? `🔒 ${t('locked')}` : `📸 Download Card`}
              </button>

              {isLocked ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
                  <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wide leading-relaxed">{t('growthLockedDesc')}</p>
                  {!isMocking && (
                    <button onClick={loadMockData} className="text-[8px] font-black text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest">
                      → Load Demo Data
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                  <p className="text-[9px] text-green-400 font-bold uppercase tracking-widest">
                    ✓ {snapshots.length} snapshots captured — Share your card!
                  </p>
                </div>
              )}
            </div>

            {/* Current border info */}
            <div className="flex items-center gap-3 px-1">
              <span className="text-2xl">{activeBorder.icon}</span>
              <div>
                <p className="text-sm font-black uppercase tracking-tight" style={{ color: activeBorder.accent }}>{activeBorder.label}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Active Frame Style</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
