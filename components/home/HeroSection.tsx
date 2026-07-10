"use client";

import Link from "next/link";
import { BookOpen, Lightbulb, PenLine, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.2252 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
}

const RESEARCH_STEPS: {
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Ideas",
    description:
      "Pick a topic, shape a research question, and get mentor feedback before you write.",
    icon: Lightbulb,
  },
  {
    title: "Drafting",
    description:
      "Structure your paper, receive peer review, and revise through each draft.",
    icon: PenLine,
  },
  {
    title: "Publication",
    description:
      "Submit for review and publish your finished work on Journality.",
    icon: BookOpen,
  },
];

export function HeroSection() {
  return (
    <section className="relative px-2 sm:px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl p-4 sm:p-6 md:p-8">
          <div className="absolute inset-0 bg-zinc-950" />

          <div className="relative mx-auto max-w-5xl rounded-2xl bg-zinc-950 px-6 py-10 sm:px-10 sm:py-14">
            <div className="relative mx-auto max-w-3xl text-center">
              <h1 className="font-mono text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-10">
                Research publishing, rebuilt.
              </h1>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="#feed">
                  <Button variant="primary" size="lg">
                    Browse Research
                  </Button>
                </Link>
                <Link href="/papers/submit">
                  <Button variant="outline" size="lg">
                    Submit a Paper
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative mx-auto max-w-3xl mt-12 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-sm bg-[#F5A3FF]/40 shrink-0" />
                  <span className="font-mono text-xs font-medium tracking-wide text-zinc-400">
                    Journality Mentorship
                  </span>
                </div>

                <div className="text-left">
                  <h2 className="font-mono text-base sm:text-lg font-semibold text-zinc-200 mb-2 leading-snug">
                    Free research mentorship for everyone.
                  </h2>

                  <p className="text-zinc-500 text-sm sm:text-base leading-relaxed mb-3">
                    A community for researchers at every stage, from high school
                    students to lifelong learners, that guides you through the
                    entire research process.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                    {RESEARCH_STEPS.map((step) => (
                      <div
                        key={step.title}
                        className="rounded-sm border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                      >
                        <div className="flex items-center mb-2.5">
                          <step.icon
                            className="w-4 h-4 text-[#F5A3FF]"
                            strokeWidth={1.5}
                          />
                        </div>
                        <h3 className="font-mono text-xs font-semibold text-zinc-300 mb-1">
                          {step.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="https://discord.gg/UF23ddWgDK"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button
                      size="md"
                      className="font-mono bg-[#5865F2] text-white border border-[#5865F2] hover:bg-[#4752C4] hover:border-[#4752C4] active:bg-[#3c45a5]"
                    >
                      <DiscordIcon className="w-4 h-4" />
                      Join the free Discord
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
