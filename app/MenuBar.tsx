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
            <button className={`px-2 xl:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap shadow-sm border ${isActive
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
            {/* Desktop Navigation Bar - Hidden on Mobile */}
            <nav
                style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 99999 }}
                className="hidden xl:flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700 shadow-2xl"
            >
                {/* Logo Section */}
                <Link href="/" className="flex flex-col items-start leading-none group transition-transform hover:scale-105 flex-shrink-0">
                    <span className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-0.5">020</span>
                    <span className="text-pink-500 font-black text-lg italic tracking-tighter">ALLIANCE</span>
                </Link>

                            {/* Conditional Navigation for Guests */}
                            {!user ? (
                                <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-2xl shadow-inner ml-2 sm:ml-4 mr-auto">
                                    <NavLink href="/" label={t('homePage')} isActive={pathname === '/'} />
                                    {/* Desktop view for guests */}
                                    <div className="hidden lg:flex items-center gap-1">
                                        <NavLink href="/about" label={t('aboutUs')} isActive={pathname === '/about'} />
                                        <NavLink href="/contact" label={t('contactUs')} isActive={pathname === '/contact'} />
                                    </div>
                                    {/* Mobile/Medium view for guests - "More" dropdown */}
                                    <div className="lg:hidden relative">
                                        <button 
                                            onClick={() => setDesktopDropdownOpen(!desktopDropdownOpen)}
                                            onMouseEnter={() => setDesktopDropdownOpen(true)}
                                            onMouseLeave={() => setDesktopDropdownOpen(false)}
                                            className="px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 border border-transparent"
                                        >
                                            <div className="flex flex-col gap-0.5 items-center">
                                                <span className="w-3.5 h-0.5 bg-current rounded-full" />
                                                <span className="w-3.5 h-0.5 bg-current rounded-full" />
                                                <span className="w-3.5 h-0.5 bg-current rounded-full" />
                                            </div>
                                        </button>
                                        {desktopDropdownOpen && (
                                            <div 
                                                className="absolute top-full right-0 pt-2 w-48 z-[99999]"
                                                onMouseEnter={() => setDesktopDropdownOpen(true)}
                                                onMouseLeave={() => setDesktopDropdownOpen(false)}
                                            >
                                                <div className="bg-slate-900/98 backdrop-blur-2xl border border-slate-700/60 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-3 ring-1 ring-white/10">
                                                    <Link href="/about" onClick={() => setDesktopDropdownOpen(false)} className="block px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">{t('aboutUs')}</Link>
                                                    <Link href="/contact" onClick={() => setDesktopDropdownOpen(false)} className="block px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">{t('contactUs')}</Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
                                         {(userData?.role === 'R4' || userData?.role === 'R5') && (
                                             <NavLink href="/tactical-dashboard" label={t('r4')} isActive={pathname === '/tactical-dashboard'} />
                                         )}
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
                                                                <Link href="/settings" onClick={() => setDesktopDropdownOpen(false)}>
                                                                    <button className="w-full text-left px-4 py-2.5 bg-slate-800/30 hover:bg-slate-800 text-[9px] font-black uppercase text-slate-300 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-700">
                                                                        ⚙️ {t('settings')}
                                                                    </button>
                                                                </Link>
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
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
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
                            <div className="hidden lg:flex items-center gap-2">
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
                                                <Link href="/settings" onClick={() => setDesktopSettingsOpen(false)}>
                                                    <button className="block w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                                                        {t('settings')}
                                                    </button>
                                                </Link>
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

            {/* Mobile Header - Logo & Auth Only */}
            <div className="xl:hidden fixed top-0 left-0 right-0 z-[99999] bg-slate-900/95 backdrop-blur-xl border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                <Link href="/" className="flex flex-col items-start leading-none group transition-transform hover:scale-105 flex-shrink-0">
                    <span className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-0.5">020</span>
                    <span className="text-pink-500 font-black text-lg italic tracking-tighter">ALLIANCE</span>
                </Link>
                <div className="flex items-center gap-2">
                    <UserStatusButton />
                </div>
            </div>

            <MobileDock />
        </>
    )
}

function MobileDock() {
    const pathname = usePathname();
    const { language, setLanguage, t } = useLanguage();
    const stack = useStackApp();
    const user = stack.useUser();
    const [userData, setUserData] = useState<{ username: string; role: string } | null>(null);
    const [registrationOpen, setRegistrationOpen] = useState(false);
    const [csRegistrationOpen, setCsRegistrationOpen] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [showCalcs, setShowCalcs] = useState(false);
    const [showBattle, setShowBattle] = useState(false);
    const [showR4Menu, setShowR4Menu] = useState(false);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);

    useEffect(() => {
        async function fetchSettings() {
            const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
            if (data) {
                setRegistrationOpen(data.registration_open);
                setCsRegistrationOpen(data.cs_registration_open);
            }
        }
        fetchSettings();

        if (!user) {
            setUserData(null);
            return;
        }
        async function fetchUser() {
            const { data } = await supabase.from('members').select('username, role').eq('user_id', user!.id).single();
            if (data) setUserData(data);
        }
        fetchUser();
    }, [user]);

    const NavIcon = ({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) => (
        <Link href={href} className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0" onClick={() => { closeAll(); }}>
            <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)] scale-110' : 'text-slate-500 hover:text-slate-300'}`}>
                {icon}
            </div>
            <span className={`text-[8px] font-black uppercase tracking-tighter truncate w-full text-center ${isActive ? 'text-pink-500' : 'text-slate-500'}`}>
                {label}
            </span>
        </Link>
    );

    const closeAll = () => {
        setShowMore(false);
        setShowCalcs(false);
        setShowBattle(false);
        setShowR4Menu(false);
        setShowLanguageMenu(false);
    };

    const toggleStatus = async (type: 'ds' | 'cs') => {
        const isDS = type === 'ds';
        const currentStatus = isDS ? registrationOpen : csRegistrationOpen;
        const newStatus = !currentStatus;
        const column = isDS ? 'registration_open' : 'cs_registration_open';
        
        const { error } = await supabase.from('settings').update({ [column]: newStatus }).eq('id', 1);
        if (!error) {
            if (isDS) setRegistrationOpen(newStatus);
            else setCsRegistrationOpen(newStatus);
            
            await supabase.from('audit_logs').insert({ 
                user_id: user?.id, 
                username: userData?.username, 
                action: newStatus ? `OPEN_${type.toUpperCase()}_SIGNUPS` : `CLOSE_${type.toUpperCase()}_SIGNUPS`,
                details: { context: "Mobile Command Dock" } 
            });
        }
    };

    const languages: { id: string; label: string; icon: string }[] = [
        { id: 'en', label: 'English', icon: '🇺🇸' },
        { id: 'zh', label: '中文', icon: '🇨🇳' },
        { id: 'ja', label: '日本語', icon: '🇯🇵' },
        { id: 'th', label: 'ไทย', icon: '🇹🇭' },
        { id: 'vi', label: 'Tiếng Việt', icon: '🇻🇳' }
    ];

    const isR4 = userData?.role === 'R4' || userData?.role === 'R5';

    return (
        <div className="xl:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-slate-900/95 backdrop-blur-2xl border-t border-slate-700/50 pb-safe-area-inset-bottom ring-1 ring-white/5">
            {/* Battle Menu Popup */}
            {showBattle && (
                <div className="absolute bottom-full left-[35%] -translate-x-1/2 mb-4 w-48 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-900/98 backdrop-blur-3xl border border-slate-700/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 ring-1 ring-white/10">
                        <Link href="/desert-storm" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-pink-500/10 hover:text-pink-500 transition-all font-black">
                            <span>🏜️</span> {t('desertStorm')}
                        </Link>
                        <Link href="/canyon-storm" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-orange-500/10 hover:text-orange-500 transition-all font-black">
                            <span>🔥</span> {t('canyonStorm')}
                        </Link>
                        <div className="h-px bg-slate-800/50 my-1 mx-2" />
                        <Link href="/alliance-duel" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-blue-500/10 hover:text-blue-500 transition-all font-black">
                            <span>⚔️</span> {t('allianceDuel')}
                        </Link>
                    </div>
                </div>
            )}

            {/* R4 Menu Popup */}
            {showR4Menu && (
                <div className="absolute bottom-full left-[50%] -translate-x-1/2 mb-4 w-56 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-900/98 backdrop-blur-3xl border border-slate-700/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 ring-1 ring-white/10 flex flex-col gap-1">
                        <Link href="/command-center" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-purple-500/10 hover:text-purple-500 transition-all font-black">
                            <span>🛡️</span> {t('commandCenter')}
                        </Link>
                        <Link href="/tactical-dashboard" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all font-black">
                            <span>📊</span> {t('tacticalDashboard')}
                        </Link>
                        <Link href="/tactical-dashboard/manage-ranks" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-blue-500/10 hover:text-blue-500 transition-all font-black">
                            <span>⭐</span> {t('manageRanks')}
                        </Link>
                    </div>
                </div>
            )}

            {/* Calculators Menu Popup */}
            {showCalcs && (
                <div className="absolute bottom-full left-[65%] -translate-x-1/2 mb-4 w-48 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-900/98 backdrop-blur-3xl border border-slate-700/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 ring-1 ring-white/10">
                        <Link href="/calculators/drone" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-teal-500/10 hover:text-teal-500 transition-all font-black">
                            <span>🧮</span> {t('droneCalculator').replace('Calculator', 'Calc')}
                        </Link>
                        <Link href="/calculators/t11" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-blue-500/10 hover:text-blue-500 transition-all font-black">
                            <span>🚀</span> {t('t11Calculator').replace('Calculator', 'Calc')}
                        </Link>
                    </div>
                </div>
            )}

            {/* More Menu Popup */}
            {showMore && (
                <div className="absolute bottom-full right-10 mb-4 w-48 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-900/98 backdrop-blur-3xl border border-slate-700/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 ring-1 ring-white/10">
                        <Link href="/guide" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white transition-all font-black">
                            <span>📖</span> {t('guide')}
                        </Link>
                        <Link href="/about" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-pink-500/10 hover:text-pink-500 transition-all font-black">
                            <span>👥</span> {t('aboutUs')}
                        </Link>
                        <Link href="/contact" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-pink-500/10 hover:text-pink-500 transition-all font-black">
                            <span>📧</span> {t('contactUs')}
                        </Link>
                        <div className="h-px bg-slate-800 my-1 mx-2" />
                        <Link href="/settings" onClick={closeAll}>
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-left font-black">
                                <span>⚙️</span> {t('settings')}
                            </button>
                        </Link>
                        <button 
                            onClick={() => { stack.signOut(); closeAll(); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500/80 hover:bg-red-500/10 hover:text-red-500 transition-all text-left font-black"
                        >
                            <span>🚪</span> {t('logout')}
                        </button>
                    </div>
                </div>
            )}

            {/* Language Menu Popup */}
            {showLanguageMenu && (
                <div className="absolute bottom-full right-1 mb-4 w-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-900/98 backdrop-blur-3xl border border-slate-700/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 ring-1 ring-white/10">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-3 py-1 mb-1">{t('language')}</div>
                        {languages.map(lang => (
                            <button 
                                key={lang.id}
                                onClick={() => { setLanguage(lang.id as any); closeAll(); }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === lang.id ? 'bg-pink-500/10 text-pink-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <span>{lang.label}</span>
                                <span className="text-sm">{lang.icon}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between h-16 px-0.5">
                <NavIcon 
                    href="/" 
                    label={t('home')} 
                    isActive={pathname === '/'}
                    icon={<svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
                />

                {user ? (
                    <>
                        <NavIcon 
                            href="/hub" 
                            label={t('hubTitle')} 
                            isActive={pathname === '/hub'}
                            icon={<svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                        />

                        <button 
                            onClick={() => { const newState = !showBattle; closeAll(); setShowBattle(newState); }}
                            className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0"
                        >
                            <div className={`p-1.5 rounded-lg md:rounded-xl transition-all duration-300 ${showBattle || (pathname === '/desert-storm' || pathname === '/canyon-storm') ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                                <svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-tighter ${showBattle || (pathname === '/desert-storm' || pathname === '/canyon-storm') ? 'text-pink-500' : 'text-slate-500'}`}>{t('battle')}</span>
                        </button>

                        {isR4 && (
                            <button 
                                onClick={() => { const newState = !showR4Menu; closeAll(); setShowR4Menu(newState); }}
                                className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0"
                            >
                                <div className={`p-1.5 rounded-lg md:rounded-xl transition-all duration-300 ${showR4Menu || pathname === '/tactical-dashboard' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-tighter ${showR4Menu || pathname === '/tactical-dashboard' ? 'text-red-500' : 'text-slate-500'}`}>{t('r4')}</span>
                            </button>
                        )}
                        
                        <button 
                            onClick={() => { const newState = !showCalcs; closeAll(); setShowCalcs(newState); }}
                            className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0"
                        >
                            <div className={`p-1.5 rounded-lg md:rounded-xl transition-all duration-300 ${showCalcs || pathname.startsWith('/calculators') ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                                <svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-tighter ${showCalcs || pathname.startsWith('/calculators') ? 'text-pink-500' : 'text-slate-500'}`}>{t('calcs')}</span>
                        </button>

                        <NavIcon 
                            href="/train" 
                            label={t('train')} 
                            isActive={pathname === '/train'}
                            icon={<span className="text-lg md:text-xl">🚂</span>}
                        />
                    </>
                ) : (
                    <>
                        <NavIcon 
                            href="/about" 
                            label={t('aboutUs')} 
                            isActive={pathname === '/about'}
                            icon={<svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                        />
                        <NavIcon 
                            href="/contact" 
                            label={t('contactUs')} 
                            isActive={pathname === '/contact'}
                            icon={<svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                        />
                    </>
                )}

                <button 
                    onClick={() => { const newState = !showMore; closeAll(); setShowMore(newState); }}
                    className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0"
                >
                    <div className={`p-1.5 rounded-lg md:rounded-xl transition-all duration-300 ${showMore ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                        <svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </div>
                    <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-tighter ${showMore ? 'text-pink-500' : 'text-slate-500'}`}>{t('more')}</span>
                </button>

                <button 
                    onClick={() => { const newState = !showLanguageMenu; closeAll(); setShowLanguageMenu(newState); }}
                    className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 group"
                >
                    <div className={`p-1.5 rounded-lg md:rounded-xl transition-all border ${showLanguageMenu ? 'bg-pink-500 text-white border-transparent' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        <svg className="w-5 h-5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s-1.343-9-3-9m-9 9a9 9 0 019-9" /></svg>
                    </div>
                    <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-tighter ${showLanguageMenu ? 'text-pink-500' : 'text-slate-500'}`}>{language}</span>
                </button>
            </div>
        </div>
    );
}
