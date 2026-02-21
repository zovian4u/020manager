import { StackProvider, StackTheme } from "@stackframe/stack";
import React, { Suspense } from "react";
import { stackServerApp } from "./stack";
import { LanguageProvider } from "../lib/LanguageContext";
import MenuBar from "./MenuBar";
import "./globals.css";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <StackProvider app={stackServerApp}>
                    <StackTheme>
                        <LanguageProvider>
                            <Suspense fallback={null}>
                                <MenuBar />
                            </Suspense>
                            <main className="pt-[160px] min-h-screen">
                                {children}
                            </main>
                        </LanguageProvider>
                    </StackTheme>
                </StackProvider>
            </body>
        </html>
    );
}