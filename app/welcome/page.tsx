"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function HatchPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [progress, setProgress] = useState(0);

    // 1. Preload 162 Frames
    useEffect(() => {
        const frameCount = 162;
        const loadedImages: HTMLImageElement[] = [];
        let loadedCount = 0;

        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            img.src = `/hatch/ezgif-frame-${i.toString().padStart(3, "0")}.jpg`;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === frameCount) {
                    setImages(loadedImages);
                }
            };
            loadedImages.push(img);
        }
    }, []);

    // 2. Animation Loop (Scroll Sync)
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const p = Math.max(0, Math.min(1, scrollTop / scrollHeight));
            setProgress(p);

            if (images.length > 0 && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                const frameIndex = Math.floor(p * (images.length - 1));
                const img = images[frameIndex];

                if (img && ctx) {
                    canvasRef.current.width = img.naturalWidth;
                    canvasRef.current.height = img.naturalHeight;
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    ctx.drawImage(img, 0, 0);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial frame
        return () => window.removeEventListener('scroll', handleScroll);
    }, [images]);

    // 3. Butterfly System
    useEffect(() => {
        const garden = document.getElementById('bf-garden');
        if (!garden) return;

        const bfCount = 30;
        const bfs: any[] = [];

        for (let i = 0; i < bfCount; i++) {
            const el = document.createElement('div');
            el.className = `global-butterfly ${['blue-b', 'pink-b', 'orange-b'][i % 3]}`;
            el.innerHTML = '<div class="b-wing b-wing-left"></div><div class="b-wing b-wing-right"></div>';
            garden.appendChild(el);

            bfs.push({
                el,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4
            });
        }

        let mx = window.innerWidth / 2;
        let my = window.innerHeight / 2;

        const handleInput = (e: any) => {
            mx = e.touches ? e.touches[0].clientX : e.clientX;
            my = e.touches ? e.touches[0].clientY : e.clientY;
        };

        window.addEventListener('mousemove', handleInput);
        window.addEventListener('touchmove', handleInput);

        function animateButterflies() {
            bfs.forEach(b => {
                const dx = mx - b.x;
                const dy = my - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 300) {
                    b.vx += dx * 0.001;
                    b.vy += dy * 0.001;
                }
                b.vx += (Math.random() - 0.5) * 0.5;
                b.vy += (Math.random() - 0.5) * 0.5;
                b.vx *= 0.98; b.vy *= 0.98;
                b.x += b.vx; b.y += b.vy;

                if (b.x < -50) b.x = window.innerWidth + 50;
                if (b.x > window.innerWidth + 50) b.x = -50;
                if (b.y < -50) b.y = window.innerHeight + 50;
                if (b.y > window.innerHeight + 50) b.y = -50;

                const angle = Math.atan2(b.vy, b.vx) * (180 / Math.PI) + 90;
                b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) rotate(${angle}deg)`;
            });
            requestAnimationFrame(animateButterflies);
        }

        animateButterflies();
        return () => {
            window.removeEventListener('mousemove', handleInput);
            window.removeEventListener('touchmove', handleInput);
        };
    }, []);

    return (
        <div className="relative bg-[#f1f5f9] min-h-[300vh] text-slate-900 overflow-x-hidden">
            <div id="bf-garden" className="fixed inset-0 pointer-events-none z-[1000]" />

            {/* Header */}
            <header className="fixed top-0 w-full px-[5%] py-6 flex justify-between items-center z-[2000] bg-white/20 backdrop-blur-md border-b border-black/5">
                <div className="text-2xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">020 ALLIANCE.</div>
                <nav>
                    <ul className="flex list-none gap-8">
                        <li><Link href="/signin" className="no-underline text-slate-600 font-bold hover:text-pink-500 transition-colors uppercase text-sm tracking-widest">Sign In</Link></li>
                        <li><Link href="/" className="no-underline text-slate-600 font-bold hover:text-pink-500 transition-colors uppercase text-sm tracking-widest">Hub</Link></li>
                    </ul>
                </nav>
            </header>

            {/* Sticky Pill Animation */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10 bg-[radial-gradient(circle_at_center,#ffffff_0%,#cbd5e1_100%)]">
                <div className="relative w-[85vw] max-w-[950px] aspect-video rounded-[40px] bg-black overflow-hidden border-8 border-white/50 shadow-2xl">
                    <canvas ref={canvasRef} className="w-full h-full object-contain" />
                    <div className="absolute bottom-[-15px] right-[-15px] bg-[#f472b6] px-12 py-5 rounded-tl-[40px] text-white font-black text-xl shadow-2xl z-50">
                        ᴬᴶ ThinkK ʚଓ
                    </div>
                </div>
            </div>

            {/* Scrolling Content Overlays */}
            <main className="relative z-[100]">
                <section className="h-screen flex flex-col items-center justify-center text-center px-[10%]">
                    <div className="bg-slate-900/95 border-2 border-[#f472b6] backdrop-blur-md px-8 py-3 rounded-full mb-6 shadow-2xl">
                        <span className="text-white font-black tracking-widest text-lg">ᴬᴶ ThinkK ʚଓ</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 leading-[1.1] mb-6 drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">Incubate <br />The Victory.</h1>
                    <p className="text-xl text-slate-900 font-bold max-w-[500px] leading-relaxed drop-shadow-[0_1px_5px_rgba(255,255,255,0.9)]">
                        Experience the power of 020 Alliance. Witness the rebirth of our top player&apos;s breakthrough skin.
                    </p>
                </section>

                <section className="h-screen flex flex-col items-center justify-center text-center px-[10%]">
                    <div className="bg-slate-900/95 border-2 border-[#f472b6] backdrop-blur-md px-8 py-3 rounded-full mb-6 shadow-2xl">
                        <span className="text-white font-black tracking-widest text-lg">ᴬᴶ ThinkK ʚଓ</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 leading-[1.1] mb-6 drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">Beyond <br />Boundaries.</h1>
                    <p className="text-xl text-slate-900 font-bold max-w-[500px] leading-relaxed drop-shadow-[0_1px_5px_rgba(255,255,255,0.9)]">
                        Real strength isn&apos;t just power—it&apos;s the courage to break the shell and rise.
                    </p>
                </section>

                <section className="h-screen flex flex-col items-center justify-center text-center px-[10%]">
                    <div className="bg-slate-900/95 border-4 border-[#f472b6] backdrop-blur-md px-10 py-4 rounded-full mb-8 shadow-2xl">
                        <span className="text-white font-black tracking-widest text-xl uppercase italic">1st Breakthrough Completed</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 leading-[1.1] mb-10 drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">The Arrival.</h1>
                    <Link href="/hub" className="px-12 py-5 bg-gradient-to-r from-pink-400 to-purple-600 text-white font-black rounded-full hover:scale-110 transition-transform shadow-[0_20px_40px_rgba(236,72,153,0.3)] no-underline text-lg tracking-widest pointer-events-auto">
                        ENTER STRATEGIC HUB
                    </Link>
                </section>
            </main>
        </div>
    );
}
