"use client";

import Link from "next/link";
import { useLanguage } from "../lib/LanguageContext";
import UserStatusButton from "./UserStatusButton";
import { usePathname } from "next/navigation";
import { useStackApp } from "@stackframe/stack";
import { useState } from "react";

export default function MenuBar() {
    const { t } = useLanguage();
    const pathname = usePathname();
    const stack = useStackApp();
    const user = stack.useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const NavLink = ({ href, label, isActive }: { href: string, label: string, isActive: boolean }) => (
        <Link href={href} onClick={() => setMobileMenuOpen(false)}>
            <button className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap shadow-sm border w-full sm:w-auto ${isActive
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent scale-105 shadow-[0_4px_20px_rgba(236,72,153,0.5)]'
                : 'bg-transparent text-slate-300 border-transparent hover:bg-slate-800 hover:text-white'
                }`}>
                {label}
            </button>
        </Link>
    );

    return (
        <>
            <nav
                style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 99999 }}
                className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-700 shadow-2xl"
            >
                {/* Logo Section */}
                <Link href="/" className="font-black text-xl sm:text-2xl italic tracking-tighter hover:scale-105 transition-transform flex-shrink-0">
                    <span className="text-white">020</span>
                    <span className="text-pink-500">ALLIANCE</span>
                </Link>

                {/* Middle Action Bar - Desktop Only */}
                <div className="hidden md:flex items-center gap-1 p-1 bg-slate-800 rounded-2xl shadow-inner">
                    <NavLink href="/" label={t('homePage')} isActive={pathname === '/'} />
                    {user ? (
                        <>
                            <NavLink href="/hub" label={t('hubTitle')} isActive={pathname === '/hub'} />
                            <NavLink href="/desert-storm" label={t('desertStorm')} isActive={pathname === '/desert-storm'} />
                            <NavLink href="/about" label={t('aboutUs')} isActive={pathname === '/about'} />
                            <NavLink href="/contact" label={t('contactUs')} isActive={pathname === '/contact'} />
                        </>
                    ) : (
                        <NavLink href="/about" label={t('aboutUs')} isActive={pathname === '/about'} />
                    )}
                </div>

                {/* Desktop Auth Section */}
                <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                    {user ? (
                        <>
                            {pathname === '/hub' ? (
                                <button onClick={() => window.dispatchEvent(new Event('open-settings'))} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm border border-slate-700 whitespace-nowrap">
                                    ⚙️ {t('settings')}
                                </button>
                            ) : (
                                <Link href="/hub?settings=true">
                                    <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm border border-slate-700 whitespace-nowrap">
                                        ⚙️ {t('settings')}
                                    </button>
                                </Link>
                            )}
                            <UserStatusButton />
                            <button onClick={() => stack.signOut()} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-lg whitespace-nowrap">
                                {t('logout')}
                            </button>
                        </>
                    ) : (
                        <Link href="/signin">
                            <button className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:scale-105 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl whitespace-nowrap">
                                {t('signIn')}
                            </button>
                        </Link>
                    )}
                </div>

                {/* Mobile Hamburger Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="sm:hidden flex flex-col gap-1.5 p-2 rounded-xl bg-slate-800 border border-slate-700"
                    aria-label="Toggle menu"
                >
                    <span className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                    <span className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
                    <span className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </button>
            </nav>

            {/* Mobile Slide-Down Menu */}
            {mobileMenuOpen && (
                <div
                    style={{ position: 'fixed', top: '56px', left: 0, width: '100%', zIndex: 99998 }}
                    className="sm:hidden bg-slate-900/98 backdrop-blur-xl border-b border-slate-700 shadow-2xl animate-in slide-in-from-top"
                >
                    <div className="flex flex-col gap-2 p-4">
                        <NavLink href="/" label={t('homePage')} isActive={pathname === '/'} />
                        {user ? (
                            <>
                                <NavLink href="/hub" label={t('hubTitle')} isActive={pathname === '/hub'} />
                                <NavLink href="/desert-storm" label={t('desertStorm')} isActive={pathname === '/desert-storm'} />
                                <NavLink href="/about" label={t('aboutUs')} isActive={pathname === '/about'} />
                                <NavLink href="/contact" label={t('contactUs')} isActive={pathname === '/contact'} />
                                <div className="border-t border-slate-700 my-2" />
                                {pathname === '/hub' ? (
                                    <button onClick={() => { window.dispatchEvent(new Event('open-settings')); setMobileMenuOpen(false); }} className="px-5 py-3 bg-slate-800 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-700 w-full">
                                        ⚙️ {t('settings')}
                                    </button>
                                ) : (
                                    <Link href="/hub?settings=true" onClick={() => setMobileMenuOpen(false)}>
                                        <button className="px-5 py-3 bg-slate-800 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-700 w-full">
                                            ⚙️ {t('settings')}
                                        </button>
                                    </Link>
                                )}
                                <button onClick={() => { stack.signOut(); setMobileMenuOpen(false); }} className="px-5 py-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl font-black text-[10px] uppercase tracking-widest w-full">
                                    {t('logout')}
                                </button>
                            </>
                        ) : (
                            <Link href="/signin" onClick={() => setMobileMenuOpen(false)}>
                                <button className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl w-full">
                                    {t('signIn')}
                                </button>
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
