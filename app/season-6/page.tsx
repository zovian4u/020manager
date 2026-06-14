"use client";

import React, { useState, useEffect, useRef } from "react";
import { useStackApp } from "@stackframe/stack";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { useLanguage } from "../../lib/LanguageContext";

interface TradePostRecord {
    id: string;
    alliance_name: string;
    server_number: number;
    trade_posts_count: number;
    created_at?: string;
}

interface MemberProfile {
    user_id: string;
    username: string;
    role?: string;
}

const DEEPWOOD_SERVERS = [773, 772, 744, 681, 736];
const WETLAND_SERVERS = [800, 804, 699, 677];

function getFaction(server: number): "Deepwood" | "Wetland" | "Other" {
    if (DEEPWOOD_SERVERS.includes(server)) return "Deepwood";
    if (WETLAND_SERVERS.includes(server)) return "Wetland";
    return "Other";
}

function getFactionName(faction: "Deepwood" | "Wetland" | "Other", t: any): string {
    if (faction === "Deepwood") return t("deepwood") || "Deepwood (Dear)";
    if (faction === "Wetland") return t("wetland") || "Wetland (Crocodile)";
    return "Other";
}

// ─── SVG COLUMN CHART FOR SERVERS ─────────────────────────────────────────────
const ServerColumnChart = ({ data }: { data: { server: number; count: number; faction: "Deepwood" | "Wetland" | "Other" }[] }) => {
    if (data.length === 0) return (
        <div className="text-center py-12 text-slate-500 font-mono uppercase text-xs tracking-widest">
            No Server Data Available
        </div>
    );

    const chartW = 600;
    const chartH = 260;
    const padT = 30;
    const padB = 40;
    const padL = 40;
    const padR = 20;

    const maxCount = Math.max(...data.map(d => d.count), 5);
    const yMax = Math.ceil(maxCount * 1.15); // Add buffer on top

    const scaleX = (idx: number) => padL + (idx / data.length) * (chartW - padL - padR);
    const scaleY = (val: number) => chartH - padB - (val / yMax) * (chartH - padT - padB);

    const barWidth = Math.max(10, ((chartW - padL - padR) / data.length) * 0.55);

    return (
        <div className="w-full bg-[#010905]/60 border border-emerald-950/40 rounded-2xl p-4 shadow-inner overflow-x-auto">
            <div className="min-w-[500px]">
                <svg width="100%" height="100%" viewBox={`0 0 ${chartW} ${chartH}`} className="overflow-visible">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                        const yVal = Math.round(yMax * p);
                        const y = scaleY(yVal);
                        return (
                            <g key={idx}>
                                <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#10b981" strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="3,3" />
                                <text x={padL - 8} y={y + 3} textAnchor="end" fill="#047857" className="text-[9px] font-mono font-bold" opacity="0.6">
                                    {yVal}
                                </text>
                            </g>
                        );
                    })}

                    {/* Columns */}
                    {data.map((d, idx) => {
                        const x = scaleX(idx) + ((chartW - padL - padR) / data.length) * 0.5 - barWidth * 0.5;
                        const y = scaleY(d.count);
                        const h = chartH - padB - y;

                        // Theme colors based on faction
                        const fillGrad = d.faction === "Deepwood" 
                            ? "url(#deepwoodGrad)" 
                            : d.faction === "Wetland" 
                            ? "url(#wetlandGrad)" 
                            : "url(#otherGrad)";
                        
                        const strokeColor = d.faction === "Deepwood" 
                            ? "#10b981" 
                            : d.faction === "Wetland" 
                            ? "#06b6d4" 
                            : "#64748b";

                        return (
                            <g key={d.server} className="group cursor-pointer">
                                {/* Defs inside chart for gradients */}
                                <defs>
                                    <linearGradient id="deepwoodGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
                                    </linearGradient>
                                    <linearGradient id="wetlandGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#0891b2" stopOpacity="0.2" />
                                    </linearGradient>
                                    <linearGradient id="otherGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#64748b" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#475569" stopOpacity="0.2" />
                                    </linearGradient>
                                </defs>

                                {/* Bar rect */}
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={Math.max(2, h)}
                                    rx="3"
                                    fill={fillGrad}
                                    stroke={strokeColor}
                                    strokeWidth="1.5"
                                    strokeOpacity="0.4"
                                    className="hover:stroke-opacity-100 transition-all duration-300"
                                />

                                {/* Value label on top of bar */}
                                <text
                                    x={x + barWidth / 2}
                                    y={y - 6}
                                    textAnchor="middle"
                                    fill="#e2e8f0"
                                    className="text-[10px] font-mono font-black"
                                >
                                    {d.count}
                                </text>

                                {/* Server label at bottom */}
                                <text
                                    x={x + barWidth / 2}
                                    y={chartH - padB + 16}
                                    textAnchor="middle"
                                    fill={d.faction === "Deepwood" ? "#a7f3d0" : d.faction === "Wetland" ? "#cffafe" : "#94a3b8"}
                                    className="text-[9px] font-mono font-black"
                                >
                                    #{d.server}
                                </text>
                                <text
                                    x={x + barWidth / 2}
                                    y={chartH - padB + 26}
                                    textAnchor="middle"
                                    fill={d.faction === "Deepwood" ? "#047857" : d.faction === "Wetland" ? "#0891b2" : "#475569"}
                                    className="text-[7px] font-black uppercase tracking-wider"
                                >
                                    {d.faction === "Deepwood" ? "DEER" : d.faction === "Wetland" ? "CROC" : "OTHER"}
                                </text>
                            </g>
                        );
                    })}

                    {/* Bottom axis line */}
                    <line x1={padL} y1={chartH - padB} x2={chartW - padR} y2={chartH - padB} stroke="#047857" strokeOpacity="0.3" strokeWidth="1" />
                </svg>
            </div>
        </div>
    );
};

// ─── SVG HORIZONTAL BAR CHART FOR ALLIANCES ───────────────────────────────────
const AllianceBarChart = ({ data }: { data: { alliance: string; count: number; server: number }[] }) => {
    if (data.length === 0) return (
        <div className="text-center py-12 text-slate-500 font-mono uppercase text-xs tracking-widest">
            No Alliance Data Available
        </div>
    );

    // Show top 10 alliances for neatness
    const topData = data.slice(0, 10);

    const chartW = 600;
    const barH = 18;
    const gap = 12;
    const padL = 120; // Room for alliance name
    const padR = 40;  // Room for value on the right
    const padT = 15;
    const padB = 15;

    const chartH = padT + padB + topData.length * (barH + gap) - gap;

    const maxCount = Math.max(...topData.map(d => d.count), 5);
    const xMax = Math.ceil(maxCount * 1.1);

    const scaleX = (val: number) => padL + (val / xMax) * (chartW - padL - padR);

    return (
        <div className="w-full bg-[#010905]/60 border border-emerald-950/40 rounded-2xl p-4 shadow-inner overflow-x-auto">
            <div className="min-w-[500px]">
                <svg width="100%" height={chartH} className="overflow-visible">
                    {topData.map((d, idx) => {
                        const y = padT + idx * (barH + gap);
                        const barW = scaleX(d.count) - padL;

                        const isMyAlliance = d.alliance.trim().toLowerCase() === "020";
                        const faction = getFaction(d.server);

                        // Colors
                        let fillGrad = "url(#allOtherGrad)";
                        let strokeColor = "#475569";
                        let textColor = "#94a3b8";

                        if (isMyAlliance) {
                            fillGrad = "url(#allMineGrad)";
                            strokeColor = "#3b82f6";
                            textColor = "#60a5fa";
                        } else if (faction === "Deepwood") {
                            fillGrad = "url(#allDeepwoodGrad)";
                            strokeColor = "#10b981";
                            textColor = "#10b981";
                        } else if (faction === "Wetland") {
                            fillGrad = "url(#allWetlandGrad)";
                            strokeColor = "#06b6d4";
                            textColor = "#06b6d4";
                        }

                        return (
                            <g key={idx} className="group cursor-pointer">
                                <defs>
                                    <linearGradient id="allMineGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.6" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                                    </linearGradient>
                                    <linearGradient id="allDeepwoodGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#064e3b" stopOpacity="0.6" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                                    </linearGradient>
                                    <linearGradient id="allWetlandGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#164e63" stopOpacity="0.6" />
                                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                                    </linearGradient>
                                    <linearGradient id="allOtherGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#334155" stopOpacity="0.6" />
                                        <stop offset="100%" stopColor="#64748b" stopOpacity="0.8" />
                                    </linearGradient>
                                </defs>

                                {/* Alliance Label */}
                                <text
                                    x={padL - 10}
                                    y={y + barH / 2 + 4}
                                    textAnchor="end"
                                    fill={isMyAlliance ? "#93c5fd" : "#e2e8f0"}
                                    className={`text-[10px] uppercase ${isMyAlliance ? "font-black tracking-tight" : "font-bold"}`}
                                >
                                    {d.alliance}
                                </text>

                                {/* Bar */}
                                <rect
                                    x={padL}
                                    y={y}
                                    width={Math.max(4, barW)}
                                    height={barH}
                                    rx="3"
                                    fill={fillGrad}
                                    stroke={strokeColor}
                                    strokeWidth="1.2"
                                    strokeOpacity="0.4"
                                    className="hover:stroke-opacity-100 transition-all duration-300"
                                />

                                {/* Value label */}
                                <text
                                    x={padL + barW + 8}
                                    y={y + barH / 2 + 4}
                                    textAnchor="start"
                                    fill="#ffffff"
                                    className="text-[10px] font-mono font-black"
                                >
                                    {d.count}
                                </text>

                                {/* Server small tag inside bar */}
                                <text
                                    x={padL + 8}
                                    y={y + barH / 2 + 3}
                                    fill="#ffffff"
                                    fillOpacity="0.5"
                                    className="text-[7px] font-mono font-bold"
                                >
                                    #{d.server}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="mt-2 text-center text-[8px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                Showing top 10 alliances by trade posts claimed
            </div>
        </div>
    );
};

export default function Season6Page() {
    const stack = useStackApp();
    const user = stack.useUser();
    const { t } = useLanguage();
    const shareCardRef = useRef<HTMLDivElement>(null);
    const serverChartRef = useRef<HTMLDivElement>(null);
    const allianceChartRef = useRef<HTMLDivElement>(null);

    const [hasMounted, setHasMounted] = useState(false);
    const [records, setRecords] = useState<TradePostRecord[]>([]);
    const [userData, setUserData] = useState<MemberProfile | null>(null);
    const [loading, setLoading] = useState(true);
    
    // View tab states: 'list' | 'server' | 'alliance'
    const [viewMode, setViewMode] = useState<'list' | 'server' | 'alliance'>('list');
    
    // Image export state
    const [isExporting, setIsExporting] = useState(false);

    // Form States
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<TradePostRecord | null>(null);
    const [allianceName, setAllianceName] = useState("");
    const [serverNumber, setServerNumber] = useState<number | "">("");
    const [tradePostsCount, setTradePostsCount] = useState<number | "">("");
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [factionFilter, setFactionFilter] = useState<"All" | "Deepwood" | "Wetland" | "Other">("All");

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;

        async function loadData() {
            setLoading(true);
            try {
                const { data: tpData, error: tpError } = await supabase
                    .from("season6_trade_posts")
                    .select("*")
                    .order("trade_posts_count", { ascending: false });

                if (!tpError && tpData) {
                    setRecords(tpData as TradePostRecord[]);
                } else if (tpError) {
                    console.error("Error loading trade posts:", tpError.message);
                }

                if (user) {
                    const { data: memberData, error: memberError } = await supabase
                        .from("members")
                        .select("user_id, username, role")
                        .eq("user_id", user.id)
                        .single();

                    if (!memberError && memberData) {
                        setUserData(memberData as MemberProfile);
                    }
                }
            } catch (err) {
                console.error("Database connection failed:", err);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [hasMounted, user]);

    if (!hasMounted) return null;

    const isR4OrR5 = userData?.role === "R4" || userData?.role === "R5";

    // KPI Calculations
    const deepwoodTotal = records
        .filter((r) => getFaction(r.server_number) === "Deepwood")
        .reduce((sum, r) => sum + r.trade_posts_count, 0);

    const wetlandTotal = records
        .filter((r) => getFaction(r.server_number) === "Wetland")
        .reduce((sum, r) => sum + r.trade_posts_count, 0);

    const server773Total = records
        .filter((r) => r.server_number === 773)
        .reduce((sum, r) => sum + r.trade_posts_count, 0);

    const myAllianceTotal = records
        .filter((r) => r.alliance_name.trim().toLowerCase() === "020")
        .reduce((sum, r) => sum + r.trade_posts_count, 0);

    const totalFactionsTradePosts = deepwoodTotal + wetlandTotal;
    const deepwoodPercent = totalFactionsTradePosts > 0 ? (deepwoodTotal / totalFactionsTradePosts) * 100 : 50;

    // Charts data aggregation
    // Server aggregates
    const serverMap = records.reduce((acc, r) => {
        if (!acc[r.server_number]) {
            acc[r.server_number] = { server: r.server_number, count: 0, faction: getFaction(r.server_number) };
        }
        acc[r.server_number].count += r.trade_posts_count;
        return acc;
    }, {} as Record<number, { server: number; count: number; faction: "Deepwood" | "Wetland" | "Other" }>);

    const serverChartData = Object.values(serverMap).sort((a, b) => b.count - a.count);

    // Alliance aggregates
    const allianceMap = records.reduce((acc, r) => {
        const key = r.alliance_name.trim();
        if (!acc[key]) {
            acc[key] = { alliance: key, count: 0, server: r.server_number };
        }
        acc[key].count += r.trade_posts_count;
        return acc;
    }, {} as Record<string, { alliance: string; count: number; server: number }>);

    const allianceChartData = Object.values(allianceMap).sort((a, b) => b.count - a.count);

    // Image Export Handler
    const handleGenerateImage = async () => {
        if (!shareCardRef.current) return;
        setIsExporting(true);
        try {
            const { toPng } = await import("html-to-image");
            const dataUrl = await toPng(shareCardRef.current, { 
                quality: 1, 
                pixelRatio: 2.5,
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                }
            });
            const link = document.createElement("a");
            link.download = `020-season6-domination-${new Date().toISOString().split("T")[0]}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Image generation failed:", err);
            alert("Failed to generate image report. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    // Chart Export Handler
    const handleDownloadChart = async (chartType: 'server' | 'alliance') => {
        const ref = chartType === 'server' ? serverChartRef : allianceChartRef;
        if (!ref.current) return;
        setIsExporting(true);
        try {
            const { toPng } = await import("html-to-image");
            const dataUrl = await toPng(ref.current, { 
                quality: 1, 
                pixelRatio: 2.5,
                backgroundColor: '#020f0a', // Solid dark forest green/black background for the downloaded PNG
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                }
            });
            const link = document.createElement("a");
            link.download = `020-season6-${chartType}-chart-${new Date().toISOString().split("T")[0]}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Chart generation failed:", err);
            alert("Failed to generate chart image. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    // CRUD functions
    const handleAddOrEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!isR4OrR5) {
            setFormError("Unauthorized: Only R4/R5 members can modify records.");
            return;
        }

        if (!allianceName.trim()) {
            setFormError("Alliance name is required.");
            return;
        }
        if (serverNumber === "" || isNaN(Number(serverNumber)) || Number(serverNumber) <= 0) {
            setFormError("Please enter a valid server number (e.g. 773).");
            return;
        }
        if (tradePostsCount === "" || isNaN(Number(tradePostsCount)) || Number(tradePostsCount) < 0) {
            setFormError("Trade posts count cannot be negative.");
            return;
        }

        setSaving(true);
        const payload = {
            alliance_name: allianceName.trim(),
            server_number: Number(serverNumber),
            trade_posts_count: Number(tradePostsCount),
            updated_at: new Date().toISOString(),
        };

        try {
            if (editingRecord) {
                const { error } = await supabase
                    .from("season6_trade_posts")
                    .update(payload)
                    .eq("id", editingRecord.id);

                if (error) throw error;

                setRecords(
                    records.map((r) =>
                        r.id === editingRecord.id
                            ? { ...r, ...payload }
                            : r
                    )
                );
            } else {
                const { data, error } = await supabase
                    .from("season6_trade_posts")
                    .insert([payload])
                    .select()
                    .single();

                if (error) throw error;
                if (data) setRecords([...records, data as TradePostRecord]);
            }

            setAllianceName("");
            setServerNumber("");
            setTradePostsCount("");
            setEditingRecord(null);
            setShowForm(false);
        } catch (err: any) {
            setFormError(err.message || "An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (record: TradePostRecord) => {
        setEditingRecord(record);
        setAllianceName(record.alliance_name);
        setServerNumber(record.server_number);
        setTradePostsCount(record.trade_posts_count);
        setShowForm(true);
        setFormError("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDeleteClick = async (id: string) => {
        if (!isR4OrR5) {
            alert("Unauthorized: Only R4/R5 members can delete records.");
            return;
        }

        if (!confirm(t("confirmDelete") || "Are you sure you want to delete this record?")) return;

        try {
            const { error } = await supabase
                .from("season6_trade_posts")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setRecords(records.filter((r) => r.id !== id));
        } catch (err: any) {
            alert(err.message || "An error occurred while deleting.");
        }
    };

    const handleCancel = () => {
        setAllianceName("");
        setServerNumber("");
        setTradePostsCount("");
        setEditingRecord(null);
        setShowForm(false);
        setFormError("");
    };

    const filteredRecords = records
        .filter((r) => {
            const matchesQuery =
                r.alliance_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.server_number.toString().includes(searchQuery);

            const faction = getFaction(r.server_number);
            const matchesFaction = factionFilter === "All" || faction === factionFilter;

            return matchesQuery && matchesFaction;
        })
        .sort((a, b) => b.trade_posts_count - a.trade_posts_count);

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#021f11] via-[#010c06] to-[#041a13] text-[#e2e8f0] px-4 sm:px-6 pt-12 md:pt-20 pb-20 relative overflow-hidden">
            {/* Ambient forest-themed background decoration */}
            <div className="absolute top-[-10%] right-[20%] w-[38rem] h-[38rem] bg-emerald-600/15 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[10%] left-[-5%] w-[35rem] h-[35rem] bg-lime-600/10 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute top-[30%] left-[45%] w-[25rem] h-[25rem] bg-teal-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-full max-w-7xl h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent blur-sm pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 border-b border-emerald-900/50 pb-8">
                    <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-500/20 rounded-full mb-3 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                            🌴 Jungle Operations Tab
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-teal-400 uppercase italic tracking-tighter drop-shadow-2xl">
                            {t("season6Title") || "Season 6 Trade Posts"}
                        </h1>
                        <p className="text-emerald-500/70 font-bold uppercase text-[9px] tracking-[0.4em] mt-2 font-mono">
                            {t("allianceName") || "020 ALLIANCE"} • Season 6 Warzone Tracker
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 justify-center">
                        {/* Generate Report Image Button */}
                        <button
                            onClick={handleGenerateImage}
                            disabled={isExporting || records.length === 0}
                            className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-755 text-slate-950 font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.2)] disabled:opacity-40 disabled:scale-100 flex items-center gap-2 cursor-pointer border border-amber-400/30"
                        >
                            <span>📸</span> {isExporting ? "Capturing..." : "Generate VS Image"}
                        </button>

                        {/* Download Active Graph Button */}
                        {(viewMode === "server" || viewMode === "alliance") && (
                            <button
                                onClick={() => handleDownloadChart(viewMode)}
                                disabled={isExporting || records.length === 0}
                                className="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] disabled:opacity-40 disabled:scale-100 flex items-center gap-2 cursor-pointer border border-emerald-400/20"
                            >
                                <span>📈</span> {isExporting ? "Capturing..." : viewMode === "server" ? "Download Server Graph" : "Download Alliance Graph"}
                            </button>
                        )}

                        {isR4OrR5 && !showForm && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.25)] border border-emerald-400/20"
                            >
                                + {t("addAlliance") || "Add Alliance Record"}
                            </button>
                        )}
                    </div>
                </header>

                {/* Form to Add/Edit Record */}
                {showForm && isR4OrR5 && (
                    <div className="bg-slate-950/90 border border-emerald-700/30 rounded-3xl p-6 sm:p-8 mb-12 animate-in fade-in duration-300 shadow-2xl max-w-2xl mx-auto ring-1 ring-emerald-500/10">
                        <h2 className="text-xl font-black text-emerald-300 uppercase italic mb-6 flex items-center gap-2">
                            <span>🌿</span>
                            {editingRecord
                                ? t("editAlliance") || "Edit Alliance Record"
                                : t("addAlliance") || "Add Alliance Record"}
                        </h2>
                        <form onSubmit={handleAddOrEdit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                        {t("alliance") || "Alliance Name"}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 020"
                                        value={allianceName}
                                        onChange={(e) => setAllianceName(e.target.value)}
                                        className="bg-[#020e08] border border-emerald-800/80 rounded-xl px-4 py-3 outline-none text-sm font-bold text-white focus:border-emerald-500 transition-colors placeholder:text-emerald-950"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                        {t("server") || "Server Number"}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 773"
                                        value={serverNumber}
                                        onChange={(e) =>
                                            setServerNumber(
                                                e.target.value === "" ? "" : Number(e.target.value)
                                            )
                                        }
                                        className="bg-[#020e08] border border-emerald-800/80 rounded-xl px-4 py-3 outline-none text-sm font-bold text-white focus:border-emerald-500 transition-colors placeholder:text-emerald-950"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                        {t("tradePosts") || "Trade Posts"}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 10"
                                        value={tradePostsCount}
                                        onChange={(e) =>
                                            setTradePostsCount(
                                                e.target.value === "" ? "" : Number(e.target.value)
                                            )
                                        }
                                        className="bg-[#020e08] border border-emerald-800/80 rounded-xl px-4 py-3 outline-none text-sm font-bold text-white focus:border-emerald-500 transition-colors placeholder:text-emerald-950"
                                    />
                                </div>
                            </div>

                            {formError && (
                                <p className="text-xs font-bold text-red-400 bg-red-950/20 border border-red-900/40 rounded-xl px-4 py-3">
                                    ⚠️ {formError}
                                </p>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-5 py-3 bg-emerald-950/50 hover:bg-emerald-950/80 text-emerald-300 border border-emerald-900/40 font-black uppercase text-[10px] tracking-widest rounded-xl transition-colors"
                                >
                                    {t("cancel") || "Cancel"}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                                >
                                    {saving ? (t("syncing") || "Syncing...") : (t("saveRecords") || "Save Record")}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* KPI Metrics Dashboard */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Deepwood (Deer) Card */}
                    <div className="bg-[#042111]/70 border border-emerald-500/20 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_30px_rgba(4,33,17,0.5)] flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
                        <div className="absolute right-3 top-3 w-14 h-14 rounded-full overflow-hidden border border-emerald-500/30 shadow-md">
                            <img src="/images/season-6/deer.jpg" alt="Deepwood Deer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="pr-14">
                            <span className="text-[8px] text-emerald-500 font-extrabold tracking-widest uppercase block mb-1">
                                Faction Emblem
                            </span>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2">
                                {t("deepwood") || "Deepwood (Dear)"}
                            </h3>
                            <div className="text-4xl font-black text-emerald-400">{deepwoodTotal}</div>
                        </div>
                        <p className="text-[8px] text-emerald-600/80 font-bold uppercase mt-4 tracking-wider">
                            Servers: #773, #772, #744, #681, #736
                        </p>
                    </div>

                    {/* Wetland (Crocodile) Card */}
                    <div className="bg-[#021f24]/70 border border-cyan-500/20 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_30px_rgba(2,31,36,0.5)] flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
                        <div className="absolute right-3 top-3 w-14 h-14 rounded-full overflow-hidden border border-cyan-500/30 shadow-md">
                            <img src="/images/season-6/crocodile.jpg" alt="Wetland Crocodile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="pr-14">
                            <span className="text-[8px] text-cyan-500 font-extrabold tracking-widest uppercase block mb-1">
                                Faction Emblem
                            </span>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2">
                                {t("wetland") || "Wetland (Crocodile)"}
                            </h3>
                            <div className="text-4xl font-black text-cyan-400">{wetlandTotal}</div>
                        </div>
                        <p className="text-[8px] text-cyan-600/80 font-bold uppercase mt-4 tracking-wider">
                            Servers: #800, #804, #699, #677
                        </p>
                    </div>

                    {/* Server 773 Card */}
                    <div className="bg-[#1b210f]/70 border border-lime-500/20 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_30px_rgba(27,33,15,0.5)] flex flex-col justify-between relative overflow-hidden group hover:border-lime-500/40 transition-all duration-300">
                        <div className="absolute right-4 top-4 text-2xl filter drop-shadow-[0_0_5px_rgba(234,179,8,0.3)]">🛡️</div>
                        <div>
                            <span className="text-[8px] text-lime-500 font-extrabold tracking-widest uppercase block mb-1">
                                {t("server773") || "Server #773"}
                            </span>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2">
                                Our Server Progress
                            </h3>
                            <div className="text-4xl font-black text-lime-400">{server773Total}</div>
                        </div>
                        <p className="text-[8px] text-lime-600/80 font-bold uppercase mt-4 tracking-wider">
                            Total claimed by 773 alliances
                        </p>
                    </div>

                    {/* My Alliance Card */}
                    <div className="bg-[#0b1c2f]/70 border border-blue-500/20 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_30px_rgba(11,28,47,0.5)] flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300">
                        <div className="absolute right-4 top-4 text-2xl filter drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]">🏆</div>
                        <div>
                            <span className="text-[8px] text-blue-500 font-extrabold tracking-widest uppercase block mb-1">
                                {t("myAlliance") || "My Alliance (020)"}
                            </span>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2">
                                Alliance Control
                            </h3>
                            <div className="text-4xl font-black text-blue-400">{myAllianceTotal}</div>
                        </div>
                        <p className="text-[8px] text-blue-600/80 font-bold uppercase mt-4 tracking-wider">
                            Direct contribution from 020
                        </p>
                    </div>
                </section>

                {/* Domination Balance Ratio Bar */}
                <div className="bg-[#051c11]/40 border border-emerald-950 backdrop-blur-md rounded-3xl p-5 mb-8 shadow-md">
                    <div className="flex justify-between items-center mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <span className="text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            Deepwood (Dear): {deepwoodTotal}
                        </span>
                        <span className="text-cyan-400 flex items-center gap-1.5">
                            Wetland (Crocodile): {wetlandTotal}
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        </span>
                    </div>

                    <div className="w-full bg-[#010905] h-3.5 rounded-full overflow-hidden flex border border-emerald-900/60 p-0.5 shadow-inner">
                        <div
                            style={{ width: `${deepwoodPercent}%` }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-l-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        />
                        <div
                            style={{ width: `${100 - deepwoodPercent}%` }}
                            className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-r-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                        />
                    </div>
                </div>

                {/* Main Views Panel (List Table & Graphical Charts) */}
                <div className="bg-[#03150d]/80 border border-emerald-950/80 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-emerald-950/30 mb-8">
                    {/* View mode toggle bar */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                        <div className="flex bg-[#010a05] rounded-xl p-1.5 border border-emerald-900/40 w-full sm:w-auto shadow-inner">
                            {(["list", "server", "alliance"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex-1 sm:flex-none transition-all ${
                                        viewMode === mode
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md border border-emerald-400/20"
                                            : "text-emerald-600/75 hover:text-emerald-400"
                                    }`}
                                >
                                    {mode === "list"
                                        ? "📋 Table List"
                                        : mode === "server"
                                        ? "📊 Server Graph"
                                        : "🏆 Alliance Graph"}
                                </button>
                            ))}
                        </div>

                        {/* Search (only for table view) */}
                        {viewMode === "list" && (
                            <div className="w-full sm:w-64 relative">
                                <input
                                    type="text"
                                    placeholder="Search by name/server..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#010a05] border border-emerald-900/50 rounded-xl px-4 py-2 outline-none text-xs font-bold text-white focus:border-emerald-500 transition-colors placeholder:text-emerald-950 font-mono shadow-inner"
                                />
                            </div>
                        )}
                    </div>

                    {/* View content switch */}
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {viewMode === "list" && (
                                <>
                                    {filteredRecords.length === 0 ? (
                                        <div className="text-center py-20 text-emerald-800/80 font-bold uppercase text-xs tracking-widest italic font-mono">
                                            {t("noTradePosts") || "No trade post records found."}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Mobile Responsive Cards View */}
                                            <div className="md:hidden space-y-4 animate-in fade-in duration-300">
                                                {filteredRecords.map((r, index) => {
                                                    const faction = getFaction(r.server_number);
                                                    const isMyAlliance = r.alliance_name.trim().toLowerCase() === "020";

                                                    return (
                                                        <div
                                                            key={r.id}
                                                            className={`bg-[#010c06]/85 border border-emerald-950/60 rounded-2xl p-4 shadow-md transition-all relative overflow-hidden ${
                                                                isMyAlliance ? "ring-1 ring-blue-500/20 bg-blue-950/10" : ""
                                                            }`}
                                                        >
                                                            {/* Background ambient glow inside card if it's our alliance */}
                                                            {isMyAlliance && (
                                                                <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full pointer-events-none" />
                                                            )}

                                                            <div className="flex justify-between items-center mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-black text-emerald-600/80 font-mono bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                                                                        Rank {index + 1}
                                                                    </span>
                                                                    <span className={`text-sm uppercase font-black tracking-tight ${isMyAlliance ? "text-blue-400" : "text-white"}`}>
                                                                        {r.alliance_name}
                                                                    </span>
                                                                    {isMyAlliance && (
                                                                        <span className="bg-blue-500/20 text-blue-400 text-[7px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest animate-pulse">
                                                                            MINE
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="font-mono text-xs text-emerald-400 font-bold">
                                                                    #{r.server_number}
                                                                </span>
                                                            </div>

                                                            <div className="flex justify-between items-center bg-[#010804]/50 border border-emerald-950/30 p-2.5 rounded-xl text-[11px] mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Faction:</span>
                                                                    {faction === "Deepwood" ? (
                                                                        <div className="inline-flex items-center gap-1.5 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                                                                            <img src="/images/season-6/deer.jpg" alt="Deer" className="w-4 h-4 rounded-full object-cover border border-emerald-500/30" />
                                                                            Deer
                                                                        </div>
                                                                    ) : faction === "Wetland" ? (
                                                                        <div className="inline-flex items-center gap-1.5 text-cyan-400 text-[9px] font-black uppercase tracking-wider">
                                                                            <img src="/images/season-6/crocodile.jpg" alt="Crocodile" className="w-4 h-4 rounded-full object-cover border border-cyan-500/30" />
                                                                            Crocodile
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-500 text-[9px] font-black uppercase">Other</span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Posts:</span>
                                                                    <span className="font-mono font-black text-white text-xs">{r.trade_posts_count}</span>
                                                                </div>
                                                            </div>

                                                            {/* R4/R5 Action Buttons directly inside the card */}
                                                            {isR4OrR5 && (
                                                                <div className="flex gap-2 pt-2 border-t border-emerald-950/30">
                                                                    <button
                                                                        onClick={() => handleEditClick(r)}
                                                                        className="flex-1 py-2 bg-emerald-950/50 hover:bg-emerald-900/40 text-emerald-400 hover:text-white rounded-lg border border-emerald-800/30 font-black uppercase text-[9px] tracking-widest transition-all text-center"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClick(r.id)}
                                                                        className="flex-1 py-2 bg-red-950/20 hover:bg-red-900/10 text-red-400 hover:text-red-500 rounded-lg border border-red-900/20 font-black uppercase text-[9px] tracking-widest transition-all text-center"
                                                                    >
                                                                        {t("deleteRecord") || "Delete"}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Desktop Table View */}
                                            <div className="hidden md:block overflow-x-auto rounded-2xl border border-emerald-900/50 bg-[#010905]/40 shadow-inner">
                                                <table className="w-full border-collapse text-left">
                                                    <thead>
                                                        <tr className="border-b border-emerald-900 text-[10px] font-black text-emerald-500/85 uppercase tracking-widest bg-[#010c06]/90">
                                                            <th className="px-6 py-4 w-12 text-center">Rank</th>
                                                            <th className="px-6 py-4">{t("alliance") || "Alliance"}</th>
                                                            <th className="px-6 py-4 text-center">{t("server") || "Server"}</th>
                                                            <th className="px-6 py-4">{t("faction") || "Faction"}</th>
                                                            <th className="px-6 py-4 text-center">{t("tradePosts") || "Trade Posts"}</th>
                                                            {isR4OrR5 && <th className="px-6 py-4 text-center w-28">Actions</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-xs font-bold text-emerald-100 divide-y divide-emerald-950/50">
                                                        {filteredRecords.map((r, index) => {
                                                            const faction = getFaction(r.server_number);
                                                            const isMyAlliance = r.alliance_name.trim().toLowerCase() === "020";

                                                            return (
                                                                <tr
                                                                    key={r.id}
                                                                    className={`hover:bg-emerald-950/20 transition-colors ${
                                                                        isMyAlliance ? "bg-blue-950/15 hover:bg-blue-950/30" : ""
                                                                    }`}
                                                                >
                                                                    <td className="px-6 py-4 text-center font-black text-emerald-800 font-mono">
                                                                        {index + 1}
                                                                    </td>

                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <span
                                                                                className={`uppercase tracking-tighter ${
                                                                                    isMyAlliance
                                                                                        ? "text-blue-400 font-extrabold"
                                                                                        : "text-white"
                                                                                }`}
                                                                            >
                                                                                {r.alliance_name}
                                                                            </span>
                                                                            {isMyAlliance && (
                                                                                <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest animate-pulse">
                                                                                    MINE
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    <td className="px-6 py-4 text-center font-mono text-emerald-400/80">
                                                                        #{r.server_number}
                                                                    </td>

                                                                    <td className="px-6 py-4">
                                                                        {faction === "Deepwood" ? (
                                                                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">
                                                                                <img src="/images/season-6/deer.jpg" alt="Deer" className="w-4.5 h-4.5 rounded-full object-cover border border-emerald-500/30" />
                                                                                {getFactionName(faction, t)}
                                                                            </div>
                                                                        ) : faction === "Wetland" ? (
                                                                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/70 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase tracking-wider">
                                                                                <img src="/images/season-6/crocodile.jpg" alt="Crocodile" className="w-4.5 h-4.5 rounded-full object-cover border border-cyan-500/30" />
                                                                                {getFactionName(faction, t)}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="bg-slate-900/80 text-slate-500 border border-slate-800 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                                                                                Other
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    <td className="px-6 py-4 text-center font-mono font-extrabold text-white text-sm">
                                                                        {r.trade_posts_count}
                                                                    </td>

                                                                    {isR4OrR5 && (
                                                                        <td className="px-6 py-4 text-center">
                                                                            <div className="flex justify-center gap-2">
                                                                                <button
                                                                                    onClick={() => handleEditClick(r)}
                                                                                    className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white transition-colors"
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteClick(r.id)}
                                                                                    className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors"
                                                                                >
                                                                                    {t("deleteRecord") || "Delete"}
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {viewMode === "server" && (
                                <div ref={serverChartRef}>
                                    <ServerColumnChart data={serverChartData} />
                                </div>
                            )}

                            {viewMode === "alliance" && (
                                <div ref={allianceChartRef}>
                                    <AllianceBarChart data={allianceChartData} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ─── HIDDEN SHARE CARD CAPTURE BLOCK ──────────────────────────────────── */}
            <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
                <div 
                    ref={shareCardRef}
                    style={{
                        width: "600px",
                        height: "400px",
                        background: "linear-gradient(135deg, #021a0e 0%, #010c06 100%)",
                        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                        color: "#e2e8f0",
                        padding: "30px",
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        border: "3px solid #f59e0b", // Gold/Amber border
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                        position: "relative",
                        overflow: "hidden"
                    }}
                >
                    {/* Background glows */}
                    <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(16,185,129,0.15)", filter: "blur(50px)" }} />
                    <div style={{ position: "absolute", bottom: "-50px", left: "-50px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(6,182,212,0.15)", filter: "blur(50px)" }} />

                    {/* Top Section */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(16,185,129,0.2)", paddingBottom: "12px" }}>
                        <div>
                            <span style={{ fontSize: "9px", fontWeight: "900", color: "#f59e0b", letterSpacing: "0.25em", textTransform: "uppercase", display: "block" }}>
                                Season 6 Warzone Report
                            </span>
                            <span style={{ fontSize: "18px", fontWeight: "900", letterSpacing: "-0.02em", color: "#ffffff", display: "block", textTransform: "uppercase" }}>
                                Faction Domination Status
                            </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "8px", fontWeight: "900", color: "#10b981", letterSpacing: "0.15em", textTransform: "uppercase", display: "block" }}>
                                020 Alliance
                            </span>
                            <span style={{ fontSize: "9px", fontWeight: "700", color: "#64748b", fontFamily: "monospace" }}>
                                {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    {/* Main Scoreboard VS */}
                    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", margin: "25px 0" }}>
                        {/* Deepwood */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "180px" }}>
                            <img 
                                src="/images/season-6/deer.jpg" 
                                alt="Deer" 
                                style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2px solid #10b981", boxShadow: "0 0 15px rgba(16,185,129,0.4)" }} 
                            />
                            <span style={{ fontSize: "10px", fontWeight: "900", color: "#10b981", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "8px" }}>
                                Deepwood (Dear)
                            </span>
                            <span style={{ fontSize: "40px", fontWeight: "950", color: "#10b981", lineHeight: "1" }}>
                                {deepwoodTotal}
                            </span>
                        </div>

                        {/* VS Divider */}
                        <div style={{ fontSize: "20px", fontWeight: "950", color: "#f59e0b", fontStyle: "italic", textShadow: "0 0 10px rgba(245,158,11,0.5)" }}>
                            VS
                        </div>

                        {/* Wetland */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "180px" }}>
                            <img 
                                src="/images/season-6/crocodile.jpg" 
                                alt="Crocodile" 
                                style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2px solid #06b6d4", boxShadow: "0 0 15px rgba(6,182,212,0.4)" }} 
                            />
                            <span style={{ fontSize: "10px", fontWeight: "900", color: "#06b6d4", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "8px" }}>
                                Wetland (Crocodile)
                            </span>
                            <span style={{ fontSize: "40px", fontWeight: "950", color: "#06b6d4", lineHeight: "1" }}>
                                {wetlandTotal}
                            </span>
                        </div>
                    </div>

                    {/* Proportional balance bar */}
                    <div style={{ padding: "0 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", fontWeight: "900", textTransform: "uppercase", color: "#94a3b8", marginBottom: "4px" }}>
                            <span style={{ color: "#10b981" }}>Deepwood: {deepwoodPercent.toFixed(0)}%</span>
                            <span style={{ color: "#06b6d4" }}>Wetland: {(100 - deepwoodPercent).toFixed(0)}%</span>
                        </div>
                        <div style={{ width: "100%", height: "10px", background: "#010905", borderRadius: "5px", overflow: "hidden", display: "flex", border: "1px solid rgba(16,185,129,0.2)" }}>
                            <div style={{ width: `${deepwoodPercent}%`, height: "100%", background: "linear-gradient(90deg, #10b981, #059669)" }} />
                            <div style={{ width: `${100 - deepwoodPercent}%`, height: "100%", background: "linear-gradient(90deg, #06b6d4, #0891b2)" }} />
                        </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(16,185,129,0.2)", paddingTop: "12px", fontSize: "8px", fontWeight: "900", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        <span>Server 773 Claimed: <strong style={{ color: "#ffffff", marginLeft: "2px" }}>{server773Total} Posts</strong></span>
                        <span style={{ display: "inline-block", width: "4px", height: "4px", borderRadius: "50%", background: "#f59e0b" }} />
                        <span>020 Alliance Claimed: <strong style={{ color: "#ffffff", marginLeft: "2px" }}>{myAllianceTotal} Posts</strong></span>
                    </div>
                </div>
            </div>
        </main>
    );
}
