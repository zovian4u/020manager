import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "./stack";
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
                        {children}
                    </StackTheme>
                </StackProvider>
            </body>
        </html>
    );
}