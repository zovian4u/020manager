"use client";

import Link from "next/link";
import { useLanguage } from "../lib/LanguageContext";
import UserStatusButton from "./UserStatusButton";
import { usePathname } from "next/navigation";
import { useStackApp } from "@stackframe/stack";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function MenuBar() {
    const { language, setLanguage, t } = useLanguage();
    const pathname = usePathname();
    const stack = useStackApp();
    const user = stack.useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
    const [desktopCalculatorsDropdownOpen, setDesktopCalculatorsDropdownOpen] = useState(false);
    const [mobileCalculatorsSubmenuOpen, setMobileCalculatorsSubmenuOpen] = useState(false);
    const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(false);
    const [desktopSettingsOpen, setDesktopSettingsOpen] = useState(false);
    const [userData, setUserData] = useState<{ username: string; role: string } | null>(null);

    useEffect(() => {
        if (!user) {
            setUserData(null);
            return;
        }
        async function fetchUser() {
            const { data, error } = await supabase
                .from('members')
                .select('username, role')
                .eq('user_id', user!.id)
                .single();
            if (data && !error) setUserData(data);
        }
        fetchUser();
    }, [user]);

    const NavLink = ({ href, label, isActive }: { href: string, label: string, isActive: boolean }) => (
        <Link href={href} onClick={() => { setMobileMenuOpen(false); setMobileSubmenuOpen(false); setMobileCalculatorsSubmenuOpen(false); }}>
            <button className={`px-2 xl:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap shadow-sm border w-full sm:w-auto ${isActive
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent scale-105 shadow-[0_4px_20px_rgba(236,72,153,0.5)]'
                : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800 hover:text-white'
                }`}>
                {label}
            </button>
        </Link>
    );

    const isActivityActive = ['/desert-storm', '/canyon-storm', '/alliance-duel', '/train'].includes(pathname);
    const isCalculatorsActive = ['/calculators/drone', '/calculators/t11'].includes(pathname);

    return (
        <>
            <nav
                style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 99999 }}
                className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-700 shadow-2xl"
            >
                {/* Logo Section */}
                <Link href="/" className="flex flex-col items-start leading-none group transition-transform hover:scale-105 flex-shrink-0">
                    <span className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-0.5">020</span>
                    <span className="text-pink-500 font-black text-lg italic tracking-tighter">ALLIANCE</span>
                </Link>

                            {/* Conditional Navigation for Guests */}
                            {!user ? (
                                <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-2xl shadow-inner">
                                    <NavLink href="/" label={t('homePage')} isActive={pathname === '/'} />
                                    <NavLink href="/about" label={t('aboutUs')} isActive={pathname === '/about'} />
                                    <NavLink href="/contact" label={t('contactUs')} isActive={pathname === '/contact'} />
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Navigation for Authenticated Users */}
                                    <div className="hidden xl:flex items-center gap-1 p-1 bg-slate-800 rounded-2xl shadow-inner relative">
                                        <NavLink href="/" label={t('homePage')} isActive={pathname === '/'} />
                                        <NavLink href="/hub" label={t('hubTitle')} isActive={pathname === '/hub'} />
                                        
                                        <div className="relative group" onMouseEnter={() => setDesktopDropdownOpen(true)} onMouseLeave={() => setDesktopDropdownOpen(false)}>
                                            <button className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap shadow-sm border flex items-center gap-2 ${isActivityActive ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                                                {t('allianceActivity')}
                                                <svg className={`w-3 h-3 transition-transform duration-300 ${desktopDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {desktopDropdownOpen && (
                                                <div className="absolute top-full left-0 pt-2 w-48 z-50">
                                                    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 ring-1 ring-white/5">
                                                        <Link href="/desert-storm" className="block w-full text-left px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white">{t('desertStorm')}</Link>
                                                        <Link href="/canyon-storm" className="block w-full text-left px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white">{t('canyonStorm')}</Link>
                                                        <Link href="/alliance-duel" className="block w-full text-left px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white">{t('allianceDuel')}</Link>
                                                        <Link href="/train" className="block w-full text-left px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white">{t('train')}</Link>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative group" onMouseEnter={() => setDesktopCalculatorsDropdownOpen(true)} onMouseLeave={() => setDesktopCalculatorsDropdownOpen(false)}>
                                            <button className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap shadow-sm border flex items-center gap-2 ${isCalculatorsActive ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                                                {t('calculators')}
                                                <svg className={`w-3 h-3 transition-transform duration-300 ${desktopCalculatorsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {desktopCalculatorsDropdownOpen && (
                                                <div className="absolute top-full left-0 pt-2 w-48 z-50">
                                                    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 ring-1 ring-white/5">
                                                        <Link href="/calculators/drone" className="block w-full text-left px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white">{t('droneCalculator')}</Link>
                                                        <Link href="/calculators/t11" className="block w-full text-left px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white">{t('t11Calculator')}</Link>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <NavLink href="/guide" label={t('guide')} isActive={pathname === '/guide'} />
                                        <NavLink href="/about" label={t('aboutUs')} isActive={pathname === '/about'} />
                                        <NavLink href="/contact" label={t('contactUs')} isActive={pathname === '/contact'} />
                                    </div>

                                    {/* "More" dropdown for screens below xl (1280px) */}
                                    <div className="xl:hidden flex items-center gap-1 p-1 bg-slate-800 rounded-2xl shadow-inner relative">
                                        <div className="flex items-center gap-1">
                                            <NavLink href="/" label={t('homePage')} isActive={pathname === '/'} />
                                            <NavLink href="/hub" label={t('hubTitle')} isActive={pathname === '/hub'} />
                                        </div>
                                        <div className="relative group" 
                                            onMouseEnter={() => setDesktopDropdownOpen(true)}
                                            onMouseLeave={() => setDesktopDropdownOpen(false)}
                                        >
                                            <button 
                                                onClick={() => setDesktopDropdownOpen(!desktopDropdownOpen)}
                                                className="px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2"
                                            >
                                                {t('more')}
                                                <div className="flex flex-col gap-0.5 items-center">
                                                    <span className="w-3.5 h-0.5 bg-current rounded-full" />
                                                    <span className="w-3.5 h-0.5 bg-current rounded-full" />
                                                    <span className="w-3.5 h-0.5 bg-current rounded-full" />
                                                </div>
                                            </button>
                                            {desktopDropdownOpen && (
                                                <div className="absolute top-full right-0 pt-2 w-56 z-50">
                                                    <div className="bg-slate-900/98 backdrop-blur-2xl border border-slate-700/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3 animate-in fade-in slide-in-from-top-3 ring-1 ring-white/10">
                                                        {user && userData && (
                                                            <div className="mb-3 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('loggedInAs')}</div>
                                                                <div className="text-pink-400 font-black text-[10px] uppercase truncate">{userData.username}</div>
                                                                <div className="text-slate-500 font-bold text-[8px] uppercase">({userData.role || 'Member'})</div>
                                                            </div>
                                                        )}

                                                        <div className="border-b border-slate-700/50 pb-2 mb-2 px-4 pt-1 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('allianceActivity')}</div>
                                                        <Link href="/desert-storm" className="block px-4 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-white transition-colors">{t('desertStorm')}</Link>
                                                        <Link href="/canyon-storm" className="block px-4 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-white transition-colors">{t('canyonStorm')}</Link>
                                                        
                                                        <div className="border-b border-slate-700/50 pb-2 my-2 px-4 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('calculators')}</div>
                                                        <Link href="/calculators/drone" className="block px-4 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-white transition-colors">{t('droneCalculator')}</Link>
                                                        <Link href="/calculators/t11" className="block px-4 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-white transition-colors">{t('t11Calculator')}</Link>
                                                        
                                                        <div className="border-b border-slate-700/50 pb-2 my-2 px-4 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Info</div>
                                                        <Link href="/guide" className="block px-4 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-white transition-colors">{t('guide')}</Link>
                                                        <Link href="/about" className="block px-4 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-white transition-colors">{t('aboutUs')}</Link>
                                                        <Link href="/contact" className="block px-4 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-white transition-colors">{t('contactUs')}</Link>
                                                        
                                                        {user && (
                                                            <div className="mt-3 pt-3 border-t border-slate-700/80 space-y-2">
                                                                <button 
                                                                    onClick={() => { window.dispatchEvent(new Event('open-settings')); setDesktopDropdownOpen(false); }} 
                                                                    className="w-full text-left px-4 py-2.5 bg-slate-800/30 hover:bg-slate-800 text-[9px] font-black uppercase text-slate-300 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-700"
                                                                >
                                                                    ⚙️ {t('settings')}
                                                                </button>
                                                                <button 
                                                                    onClick={() => { stack.signOut(); setDesktopDropdownOpen(false); }} 
                                                                    className="w-full text-center px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-[9px] font-black uppercase text-red-500 rounded-xl transition-all border border-red-500/20 hover:border-red-500/40"
                                                                >
                                                                    {t('logout')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                {/* Desktop Auth Section */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {/* Global Language Selector (Globe Icon) */}
                    <div className="relative group p-1 bg-slate-800 rounded-2xl shadow-inner flex items-center gap-1 border border-slate-700/50">
                        <div className="pl-3 pr-1 text-slate-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9-3-9m-9 9a9 9 0 019-9" />
                            </svg>
                        </div>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="bg-transparent text-slate-300 px-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-white transition-all appearance-none pr-6 font-mono"
                        >
                            <option className="bg-slate-900" value="en">EN</option>
                            <option className="bg-slate-900" value="zh">ZH</option>
                            <option className="bg-slate-900" value="ja">JA</option>
                            <option className="bg-slate-900" value="th">TH</option>
                            <option className="bg-slate-900" value="vi">VI</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {user ? (
                        <>
                            <div className="hidden xl:flex items-center gap-2">
                                <UserStatusButton />
                                <div className="relative group" 
                                    onMouseEnter={() => setDesktopSettingsOpen(true)}
                                    onMouseLeave={() => setDesktopSettingsOpen(false)}
                                >
                                    <button 
                                        className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white transition-all shadow-sm border border-slate-700 active:scale-95"
                                    >
                                        ⚙️
                                    </button>
                                    {desktopSettingsOpen && (
                                        <div className="absolute top-full right-0 pt-2 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-2 ring-1 ring-white/5 overflow-hidden">
                                                {pathname === '/hub' ? (
                                                    <button 
                                                        onClick={() => { window.dispatchEvent(new Event('open-settings')); setDesktopSettingsOpen(false); }} 
                                                        className="block w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                                                    >
                                                        {t('settings')}
                                                    </button>
                                                ) : (
                                                    <Link href="/hub?settings=true" className="block" onClick={() => setDesktopSettingsOpen(false)}>
                                                        <button className="block w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                                                            {t('settings')}
                                                        </button>
                                                    </Link>
                                                )}
                                                <div className="h-px bg-slate-700/50 my-1 mx-2" />
                                                <button 
                                                    onClick={() => { stack.signOut(); setDesktopSettingsOpen(false); }} 
                                                    className="block w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500/80 hover:bg-red-500/10 hover:text-red-500 transition-all font-black"
                                                >
                                                    {t('logout')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <Link href="/signin">
                            <button className="px-5 sm:px-8 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:scale-105 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl whitespace-nowrap ring-2 ring-pink-500/20 active:scale-95">
                                {t('signIn')}
                            </button>
                        </Link>
                    )}
                </div>

            </nav>

        </>
    );
}
