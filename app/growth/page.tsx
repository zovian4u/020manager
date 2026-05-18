"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useStackApp } from "@stackframe/stack";
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';
import Link from 'next/link';

// ─── RESPONSIVE CARD SCALER ───────────────────────────────────────────────────
const CARD_SIZE = 480;
const ScaledCardWrapper = ({ children, accentColor }: { children: React.ReactNode; accentColor: string }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setScale(Math.min(1, w / CARD_SIZE));
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="w-full max-w-[280px] sm:max-w-[340px] md:max-w-[420px] mx-auto"
      style={{
        height: CARD_SIZE * scale,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        boxShadow: `0 0 60px ${accentColor}30`,
      }}
    >
      <div style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}>
        {children}
      </div>
    </div>
  );
};

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

// ─── CHART ────────────────────────────────────────────────────────────────────
const CardChart = ({ lines }: { lines: { data: { week: string; value: number }[]; color: string; name: string; isMain?: boolean }[] }) => {
  if (!lines || lines.length === 0 || !lines[0].data || lines[0].data.length < 2) return (
    <div style={{ color: '#ffffff44', fontSize: 11, fontWeight: 900, textAlign: 'center', marginTop: 20 }}>
      NOT ENOUGH DATA
    </div>
  );

  const W = 360, H = 180, padL = 45, padR = 10, padT = 10, padB = 24;
  const allVals = lines.flatMap(l => l.data.map(d => d.value));
  if (allVals.length === 0) return null;

  let minV = Math.min(...allVals);
  let maxV = Math.max(...allVals);
  
  const actualRange = maxV - minV;
  const buffer = actualRange === 0 ? (maxV * 0.1 || 1) : actualRange * 0.1;
  minV -= buffer;
  maxV += buffer;
  const range = maxV - minV;

  const mainData = lines[0].data;
  const px = (i: number) => padL + (i / (mainData.length - 1)) * (W - padL - padR);
  const py = (v: number) => padT + (1 - (v - minV) / range) * (H - padT - padB);

  const labelStep = Math.max(1, Math.floor((mainData.length - 1) / 4));

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        {lines.filter(l => l.isMain).map((l, idx) => (
          <linearGradient key={`cg-${idx}`} id={`cg-${l.color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={l.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={l.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
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
      {/* Reverse loop so main line is drawn last (on top) */}
      {[...lines].reverse().map((l) => {
        const path = l.data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)},${py(d.value).toFixed(1)}`).join(' ');
        const area = `${path} L ${px(l.data.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L ${px(0).toFixed(1)},${(H - padB).toFixed(1)} Z`;
        
        return (
          <g key={l.name}>
            {l.isMain && <path d={area} fill={`url(#cg-${l.color.replace('#','')})`} />}
            <path d={path} fill="none" stroke={l.color} strokeWidth={l.isMain ? "2.5" : "1.5"} strokeLinecap="round" strokeLinejoin="round" opacity={l.isMain ? 1 : 0.7} />
            {l.data.map((d, i) => {
              if (l.data.length > 12 && i % 4 !== 0 && i !== l.data.length - 1) return null;
              return <circle key={i} cx={px(i)} cy={py(d.value)} r={l.isMain ? "3.5" : "2"} fill="#050010" stroke={l.color} strokeWidth={l.isMain ? "2" : "1"} opacity={l.isMain ? 1 : 0.7} />;
            })}
          </g>
        );
      })}
      {mainData.map((d, i) => {
        if (i % labelStep !== 0 && i !== mainData.length - 1) return null;
        return (
          <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fill="#ffffff40" fontSize="8" fontWeight="700">
            {d.week}
          </text>
        );
      })}
    </svg>
  );
};

// ─── SHARE CARD ───────────────────────────────────────────────────────────────
const ShareCard = React.forwardRef<HTMLDivElement, {
  border: typeof BORDERS[0];
  playerName: string;
  lines: { data: { week: string; value: number }[]; color: string; name: string; isMain?: boolean }[];
  title: string;
  isMocking: boolean;
  allianceLabel: string;
  trackerLabel: string;
}>(({ border, playerName, lines, title, isMocking, allianceLabel, trackerLabel }, ref) => {
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
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.07,
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 0)',
        backgroundSize: '20px 20px',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute', top: -60, left: -60, width: 200, height: 200, borderRadius: '50%',
        background: border.accent, opacity: 0.12, filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, right: -60, width: 200, height: 200, borderRadius: '50%',
        background: border.accent2, opacity: 0.12, filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 480 480" fill="none">
        <defs>
          <linearGradient id="fg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={border.accent} />
            <stop offset="100%" stopColor={border.accent2} />
          </linearGradient>
        </defs>
        <rect x="14" y="14" width="452" height="452" rx="24" stroke={border.accent} strokeOpacity="0.15" strokeWidth="1" />
        <path d={`M14,70 L14,28 Q14,14 28,14 L70,14`} stroke="url(#fg1)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d={`M410,14 L452,14 Q466,14 466,28 L466,70`} stroke="url(#fg1)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d={`M14,410 L14,452 Q14,466 28,466 L70,466`} stroke="url(#fg1)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d={`M410,466 L452,466 Q466,466 466,452 L466,410`} stroke="url(#fg1)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <line x1="240" y1="14" x2="240" y2="24" stroke={border.accent} strokeOpacity="0.5" strokeWidth="2"/>
        <line x1="240" y1="456" x2="240" y2="466" stroke={border.accent} strokeOpacity="0.5" strokeWidth="2"/>
        <line x1="14" y1="240" x2="24" y2="240" stroke={border.accent} strokeOpacity="0.5" strokeWidth="2"/>
        <line x1="456" y1="240" x2="466" y2="240" stroke={border.accent} strokeOpacity="0.5" strokeWidth="2"/>
        {[[28,28],[452,28],[28,452],[452,452]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="3" fill={border.accent} opacity="0.6"/>
        ))}
      </svg>

      <div style={{ position: 'absolute', top: 22, left: 22, fontSize: 22, lineHeight: 1 }}>{border.emoji[0]}</div>
      <div style={{ position: 'absolute', top: 22, right: 22, fontSize: 22, lineHeight: 1 }}>{border.emoji[1]}</div>
      <div style={{ position: 'absolute', bottom: 54, left: 22, fontSize: 18, lineHeight: 1 }}>{border.emoji[2]}</div>
      <div style={{ position: 'absolute', bottom: 54, right: 22, fontSize: 22, lineHeight: 1 }}>{border.emoji[3]}</div>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '44px 36px 50px 36px' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 6, height: 28, borderRadius: 3, background: `linear-gradient(to bottom, ${border.accent}, ${border.accent2})`, flexShrink: 0 }} />
            <div>
              <div style={{ color: '#ffffff', fontWeight: 900, fontSize: 20, letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: 1 }}>
                {playerName}
              </div>
              <div style={{ color: border.accent, fontWeight: 700, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2, opacity: 0.8 }}>
                {title} {lines.length > 1 && ' + COMP'}
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: `linear-gradient(to right, ${border.accent}33, transparent)`, marginTop: 6 }} />
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '100%' }}>
            <CardChart lines={lines} />
          </div>
        </div>

        {lines.length > 0 && lines[0].data.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 2, flexWrap: 'wrap' }}>
            {lines.length === 1 && lines[0].data.length >= 2 && (
              <div style={{
                color: (lines[0].data[lines[0].data.length-1].value - lines[0].data[0].value) >= 0 ? '#4ade80' : '#f87171',
                fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4
              }}>
                {(lines[0].data[lines[0].data.length-1].value - lines[0].data[0].value) >= 0 ? '+' : ''}
                {(lines[0].data[lines[0].data.length-1].value - lines[0].data[0].value).toFixed(1)}M 
                ({(((lines[0].data[lines[0].data.length-1].value - lines[0].data[0].value) / (lines[0].data[0].value || 1)) * 100).toFixed(1)}%)
              </div>
            )}
            {lines.map((l, i) => {
              const data = l.data;
              if (data.length < 1) return null;
              return (
                <div key={l.name} style={{
                  background: `${l.color}15`,
                  border: `1px solid ${l.color}55`,
                  borderRadius: 100, padding: '4px 10px',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
                  {i !== 0 && <span style={{ color: '#ffffffaa', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {l.name.length > 6 ? l.name.substring(0,6) + '..' : l.name}
                  </span>}
                  <span style={{ color: l.color, fontWeight: 900, fontSize: i === 0 ? 12 : 10, letterSpacing: '-0.02em' }}>
                    {data[data.length - 1].value.toFixed(1)}M
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 42,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(to right, ${border.accent}10, ${border.accent2}18, ${border.accent}10)`,
        borderTop: `1px solid ${border.accent}22`, gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>{border.emoji[0]}</span>
        <span style={{ color: border.accent, fontWeight: 900, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          020 {allianceLabel}
        </span>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: border.accent2, opacity: 0.8 }} />
        <span style={{ color: '#ffffff55', fontWeight: 700, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {isMocking ? 'TEST_DATA' : trackerLabel}
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

  // Compare States
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [allMembers, setAllMembers] = useState<{user_id: string, username: string, total_hero_power: number}[]>([]);
  const [compareMembers, setCompareMembers] = useState<{user_id: string, username: string, color: string}[]>([]);
  const [compareSnapshots, setCompareSnapshots] = useState<Record<string, any[]>>({});
  const [showAllianceAvg, setShowAllianceAvg] = useState(false);
  const [avgSnapshots, setAvgSnapshots] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const activeBorder = BORDERS.find(b => b.id === activeBorderId) || BORDERS[0];
  const chartColor = activeTab === 'total' ? '#f472b6' : activeTab === 'squad' ? '#60a5fa' : '#fbbf24';

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
      const { data: snapData } = await supabase.from('growth_snapshots').select('*').eq('user_id', user!.id).order('captured_at', { ascending: true });
      if (snapData) setSnapshots(snapData);

      const { data: membersData } = await supabase.from('members').select('user_id, username, total_hero_power');
      if (membersData) {
        setAllMembers(membersData);
        const me = membersData.find(m => m.user_id === user!.id);
        if (me) setMemberUsername(me.username);
      }
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

  const normalizeData = (mainData: {week: string, value: number}[], rawSnapshots: any[]) => {
    const factor = 1_000_000;
    let lastVal = 0;
    if (rawSnapshots.length > 0) {
       const first = rawSnapshots[0];
       lastVal = (activeTab === 'total' ? first.total_hero_power : activeTab === 'squad' ? first.squad_1_power : first.arena_power) / factor;
    }
    
    return mainData.map(md => {
       const cd = rawSnapshots.find(c => {
           const wLabel = c.week_label || new Date(c.captured_at).toLocaleDateString(language, { month: 'short', day: 'numeric' });
           return wLabel === md.week;
       });
       if (cd) {
           lastVal = (activeTab === 'total' ? cd.total_hero_power : activeTab === 'squad' ? cd.squad_1_power : cd.arena_power) / factor;
       }
       return { week: md.week, value: lastVal };
    });
  };

  const fetchAvgData = async () => {
    const { data } = await supabase.from('growth_snapshots').select('week_label, total_hero_power, squad_1_power, arena_power, captured_at');
    if (data) {
       const grouped = data.reduce((acc: any, curr) => {
          const w = curr.week_label || new Date(curr.captured_at).toLocaleDateString(language, { month: 'short', day: 'numeric' });
          if (!acc[w]) acc[w] = { count: 0, total_hero_power: 0, squad_1_power: 0, arena_power: 0, captured_at: curr.captured_at, week_label: curr.week_label };
          acc[w].count++;
          acc[w].total_hero_power += curr.total_hero_power;
          acc[w].squad_1_power += curr.squad_1_power;
          acc[w].arena_power += curr.arena_power;
          return acc;
       }, {});
       
       const avg = Object.values(grouped).map((g: any) => ({
          week_label: g.week_label,
          captured_at: g.captured_at,
          total_hero_power: g.total_hero_power / g.count,
          squad_1_power: g.squad_1_power / g.count,
          arena_power: g.arena_power / g.count,
       })).sort((a: any, b: any) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
       setAvgSnapshots(avg);
    }
  };

  const toggleAllianceAvg = async () => {
    if (!showAllianceAvg) {
       if (avgSnapshots.length === 0) await fetchAvgData();
       setShowAllianceAvg(true);
    } else {
       setShowAllianceAvg(false);
    }
  };

  const toggleCompareMember = async (member: any) => {
    const exists = compareMembers.find(m => m.user_id === member.user_id);
    if (exists) {
        setCompareMembers(prev => prev.filter(m => m.user_id !== member.user_id));
    } else {
        if (compareMembers.length >= 4) {
            alert("You can only compare up to 4 other players at once.");
            return;
        }
        const colorPalette = ['#4ade80', '#22d3ee', '#a855f7', '#fbbf24', '#f87171'];
        const usedColors = compareMembers.map(m => m.color);
        const availColor = colorPalette.find(c => !usedColors.includes(c)) || colorPalette[0];
        
        setCompareMembers(prev => [...prev, { ...member, color: availColor }]);
        
        if (!compareSnapshots[member.user_id]) {
           const { data } = await supabase.from('growth_snapshots').select('*').eq('user_id', member.user_id).order('captured_at', { ascending: true });
           if (data) {
               setCompareSnapshots(prev => ({ ...prev, [member.user_id]: data }));
           }
        }
    }
  };

  const playerName = (memberUsername || user?.displayName || (user as any)?.username || user?.primaryEmail?.split('@')[0] || 'COMMANDER').toUpperCase();
  
  const mainChartData = getChartData();
  const buildLines = () => {
    if (mainChartData.length === 0) return [];
    const lines = [{ data: mainChartData, color: chartColor, name: playerName, isMain: true }];
    if (showAllianceAvg && avgSnapshots.length > 0) {
       lines.push({ data: normalizeData(mainChartData, avgSnapshots), color: '#ffffff', name: 'ALLIANCE AVG', isMain: false });
    }
    compareMembers.forEach(cm => {
       const snaps = compareSnapshots[cm.user_id] || [];
       lines.push({ data: normalizeData(mainChartData, snaps), color: cm.color, name: cm.username, isMain: false });
    });
    return lines;
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

  const chartLines = buildLines();
  const isLocked = snapshots.length < 2;
  const chartTitle = activeTab === 'total' ? t('totalHeroPowerGrowth') : activeTab === 'squad' ? t('squad1PowerGrowth') : t('arenaPowerGrowth');
  const allianceLabel = t('allianceName');
  const trackerLabel = t('growthChart');

  if (isLoading) return (
    <div className="h-screen bg-[#050010] flex items-center justify-center text-white font-black animate-pulse uppercase tracking-[0.4em] text-sm">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050010] text-white pt-8 pb-16 px-2 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-4">

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

        <div className="flex flex-wrap gap-3 items-center justify-between px-2">
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            {(['total','squad','arena'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>
                {tab === 'total' ? t('heroRanking') : tab === 'squad' ? t('squadRanking') : t('arenaRanking')}
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

        <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
          <div className="flex-shrink-0 flex items-center justify-center w-full md:w-auto">
            <div className="w-full flex justify-center">
              <ScaledCardWrapper accentColor={activeBorder.accent}>
                <ShareCard
                  ref={cardRef}
                  border={activeBorder}
                  playerName={playerName}
                  lines={chartLines}
                  title={chartTitle}
                  isMocking={isMocking}
                  allianceLabel={allianceLabel}
                  trackerLabel={trackerLabel}
                />
              </ScaledCardWrapper>
            </div>
          </div>

          <div className="flex-1 space-y-4 min-w-0 w-full">
            {/* Export + Status moved to top to reduce scrolling */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-2">
              <button onClick={handleDownload} disabled={isGenerating || isLocked}
                className="w-full py-3 font-black rounded-xl uppercase tracking-widest text-sm transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: isLocked ? undefined : `linear-gradient(135deg, ${activeBorder.accent}, ${activeBorder.accent2})`, color: isLocked ? undefined : '#000' }}>
                {isGenerating ? `⏳ ${t('syncing')}` : isLocked ? `🔒 ${t('locked')}` : `📸 ${t('downloadImage')}`}
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
                    ✓ {snapshots.length} {t('captureProgress').replace('...', '')} — {t('downloadImage')}!
                  </p>
                </div>
              )}
            </div>

            {/* Compare Box */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                   📊 COMPARE GROWTH
                 </h3>
                 <button onClick={() => setShowCompareModal(true)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[9px] font-black uppercase transition-all border border-white/10">
                   + ADD PLAYER
                 </button>
              </div>
              <div className="flex flex-wrap gap-2">
                 <button onClick={toggleAllianceAvg} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${showAllianceAvg ? 'bg-white text-black border-white' : 'bg-transparent text-slate-400 border-white/10 hover:border-white/30'}`}>
                    ALLIANCE AVG {showAllianceAvg && '✓'}
                 </button>
                 {compareMembers.map(cm => (
                    <div key={cm.user_id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10" style={{ background: `${cm.color}15`, borderColor: `${cm.color}40` }}>
                       <div className="w-2 h-2 rounded-full" style={{ background: cm.color }} />
                       <span className="text-[9px] font-black uppercase text-white">{cm.username}</span>
                       <button onClick={() => toggleCompareMember(cm)} className="ml-1 text-white/50 hover:text-white">✕</button>
                    </div>
                 ))}
                 {!showAllianceAvg && compareMembers.length === 0 && (
                    <span className="text-[9px] font-bold text-slate-600 uppercase italic py-1.5 px-1">No comparisons active</span>
                 )}
              </div>
            </div>

            {/* Border selector */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeBorder.accent }}>
                🎨 {t('growthChart')}
              </h3>
              <div className="grid grid-cols-5 gap-1.5">
                {BORDERS.map(b => (
                  <button key={b.id} onClick={() => setActiveBorderId(b.id)}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all text-center ${activeBorderId === b.id ? 'ring-2 scale-105' : 'opacity-50 hover:opacity-80'}`}
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

            <div className="hidden md:flex items-center gap-3 px-1">
              <span className="text-2xl">{activeBorder.icon}</span>
              <div>
                <p className="text-sm font-black uppercase tracking-tight" style={{ color: activeBorder.accent }}>{activeBorder.label}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{t('growthChart')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCompareModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#0a0f1d] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[80vh]">
               <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Select Player to Compare</h3>
                  <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:bg-red-500/20 hover:text-red-500 transition-all font-black">✕</button>
               </div>
               <div className="p-4 border-b border-white/5">
                  <input type="text" placeholder="SEARCH COMMANDER..." className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-white/30 text-white font-black uppercase text-[10px] tracking-widest" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
               </div>
               <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-black/20">
                  {allMembers.filter(m => m.user_id !== user?.id && m.username.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a,b) => b.total_hero_power - a.total_hero_power)
                    .map(m => {
                     const isSelected = compareMembers.some(cm => cm.user_id === m.user_id);
                     return (
                        <button key={m.user_id} onClick={() => toggleCompareMember(m)} className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all border ${isSelected ? 'bg-white/10 border-white/20' : 'bg-white/[0.03] border-transparent hover:bg-white/5'}`}>
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${isSelected ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'}`}>
                                 {m.username.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                 <span className="block font-black uppercase text-xs text-white truncate max-w-[150px] sm:max-w-[200px]">{m.username}</span>
                                 <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest mt-0.5 block">{(m.total_hero_power / 1000000).toFixed(1)}M POWER</span>
                              </div>
                           </div>
                           {isSelected && <span className="text-xs text-green-400 font-black px-2">✓</span>}
                        </button>
                     )
                  })}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
