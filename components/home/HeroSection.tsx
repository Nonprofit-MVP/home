"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface Stats {
  papers: number;
  peerVerified: number;
  replications: number;
}

function AnimatedCounter({
  target,
  duration = 1500,
}: {
  target: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export function HeroSection({ initialStats }: { initialStats: Stats }) {
  const stats = initialStats;

  return (
    <section className="relative px-2 sm:px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl p-4 sm:p-6 md:p-8">
          <div className="absolute inset-0 bg-zinc-950" />

          <div className="relative mx-auto max-w-5xl rounded-2xl bg-zinc-950 px-6 py-10 sm:px-10 sm:py-14">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 60% 40% at 50% 45%, rgba(245, 163, 255, 0.12) 0%, transparent 70%)",
              }}
            />

            <div className="relative mx-auto max-w-3xl text-center">
              <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-widest text-[#F5A3FF]">
                Free research support from idea to publication
              </p>

              <h1 className="font-mono text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
                Journality helps students do real research for free.
              </h1>

              <p className="text-zinc-300/80 text-lg sm:text-xl leading-relaxed mb-4 max-w-2xl mx-auto">
                A community for high school students that guides you through
                the entire research process: ideas, structure, feedback,
                revisions, and publication.
              </p>

              <p className="text-zinc-300/80 text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
                We do what $10,000 summer research programs promise, but for
                free.
              </p>

              <div className="flex flex-col items-center justify-center gap-3 mb-14 sm:flex-row">
                <Link
                  href="https://discord.gg/UF23ddWgDK"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="primary" size="lg">
                    Join the free Discord
                  </Button>
                </Link>
                <Link href="#feed">
                  <Button variant="outline" size="lg">
                    See Student Research
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-mono">
                <div className="flex items-center gap-2 text-zinc-300/70">
                  <AnimatedCounter target={stats.papers} />
                  <span className="text-zinc-400/60">papers published</span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2 text-zinc-300/70">
                  <AnimatedCounter target={stats.peerVerified} />
                  <span className="text-zinc-400/60">peer verified</span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2 text-zinc-300/70">
                  <AnimatedCounter target={stats.replications} />
                  <span className="text-zinc-400/60">
                    replication attempts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
