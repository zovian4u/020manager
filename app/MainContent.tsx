"use client";

import { usePathname } from "next/navigation";
import React from "react";

export default function MainContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isFullscreenPage = pathname === '/' || pathname === '/signin' || pathname === '/signup' || pathname === '/welcome';

    return (
        <main className={isFullscreenPage ? "min-h-screen" : "pt-[140px] md:pt-[160px] min-h-screen"}>
            {children}
        </main>
    );
}
