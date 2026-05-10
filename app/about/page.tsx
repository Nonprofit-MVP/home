import Link from "next/link";
import {
  Atom,
  GitBranch,
  Shield,
  Zap,
  GraduationCap,
  Ban,
  LockOpen,
} from "lucide-react";

export const metadata = {
  title: "About Journality",
  description:
    "A consolidated research platform: journal, reviews, replications, and AI assistance. Open, transparent, alive.",
};

const values = [
  {
    icon: LockOpen,
    title: 'Open by default',
    body: 'Every paper, every review, every revision. Public.',
  },
  {
    icon: GitBranch,
    title: 'Papers that live',
    body: 'Versioned. Correctable. Linked to every replication attempt.',
  },
  {
    icon: Shield,
    title: 'Review in the open',
    body: 'No more black box. The full deliberation is part of the record.',
  },
  {
    icon: Zap,
    title: 'AI that earns its place',
    body: 'Summaries, contradiction flags, instant context. Nothing decorative.',
  },
  {
    icon: GraduationCap,
    title: 'For every researcher',
    body: 'High school to postdoc. Judged in the right context.',
  },
  {
    icon: Ban,
    title: 'Not extractive',
    body: 'Free to publish. Free to read. That is the whole policy.',
  },
]

const team = [
  {
    name: "Eldiiar Bekbolotov",
    role: "Co-founder · Engineering",
    institution: "",
  },
  {
    name: "Hasan Ahmed",
    role: "Co-founder · Finance",
    institution: "",
  },
  {
    name: "Cameron Lemoine",
    role: "Co-founder · Research",
    institution: "",
  },
];

export default function AboutPage() {
  return (
     <div className="min-h-screen">

      {/* Hero */}
      <section className="relative border-b border-white/5 py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5A3FF]/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-xl mx-auto text-center relative">
          <h1 className="font-mono text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
            Science is moving too slow.
          </h1>
          <p className="text-zinc-500 text-base leading-relaxed">
            We built Journality because the tools researchers use to share their
            work belong in a museum. This is the replacement.
          </p>
        </div>
      </section>

      {/* One-liner mission */}
      <section className="py-24 px-4 border-b border-white/5">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs text-[#F5A3FF] uppercase tracking-widest mb-8 center">
            Why we exist
          </p>
          <p className="text-zinc-300 text-lg sm:text-xl leading-relaxed">
            Publishing a research paper today takes over a year. Review happens
            in secret. Corrections get buried. Good work disappears behind
            paywalls nobody asked for.
          </p>
          <p className="text-zinc-500 text-lg sm:text-xl leading-relaxed mt-6">
            Journality fixes that. Not by improving the old system. By
            replacing it.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-4 border-b border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs text-[#F5A3FF] uppercase tracking-widest mb-12 text-center">
            What we stand for
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-[#111111] border border-white/8 rounded-xl p-5 hover:border-white/12 transition-colors"
              >
                <v.icon className="w-4 h-4 text-[#F5A3FF] mb-4" />
                <h3 className="font-mono text-sm font-semibold text-zinc-200 mb-1.5">
                  {v.title}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-md mx-auto text-center">
          <h2 className="font-mono text-2xl font-bold text-white mb-4">
            Ready when you are.
          </h2>
          <p className="text-sm text-zinc-600 mb-10">
            Free to publish. Free to read. No institution required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/papers/submit"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#F5A3FF] text-black text-sm font-mono font-semibold hover:bg-[#F5A3FF]/90 transition-colors"
            >
              Submit Research
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-white/10 text-zinc-400 text-sm font-mono hover:text-zinc-200 hover:border-white/20 transition-colors"
            >
              Browse Papers
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
