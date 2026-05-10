"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  const p = password || "";
  const lengthScore = p.length >= 12 ? 2 : p.length >= 10 ? 1 : 0;
  const hasLower = /[a-z]/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  const hasNumber = /\d/.test(p);
  const hasSymbol = /[^A-Za-z0-9]/.test(p);
  const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(
    Boolean,
  ).length;

  // Strong: 12+ chars AND at least 1 uppercase, lowercase, and symbol
  if (lengthScore === 2 && hasLower && hasUpper && hasSymbol) return "strong";

  // Medium: 10+ chars AND at least 2 classes (or 12+ chars with 2 classes)
  if ((p.length >= 10 && variety >= 2) || (p.length >= 12 && variety >= 2))
    return "medium";

  return "weak";
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"reader" | "researcher">("reader");
  const [institution, setInstitution] = useState("");
  const [orcid, setOrcid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const strength = getPasswordStrength(password);
  const isStrongPassword = strength === "strong";

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!isStrongPassword) {
        setError("Password must be Strong to create an account.");
        return;
      }
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role, institution, orcid },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const username =
        email
          .split("@")[0]
          .replace(/[^a-z0-9]/gi, "")
          .toLowerCase() + Math.floor(Math.random() * 999);

      if (data.session) {
        // Email confirmation disabled — signed in immediately
        await supabase.from("users").upsert({
          id: data.user!.id,
          username,
          full_name: fullName,
          institution,
          orcid: orcid || null,
          role,
        });
        window.location.href = "/dashboard";
      } else if (data.user) {
        // Email confirmation required — show success state
        setEmailSent(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-[#F5A3FF]" />
          </div>
          <h1 className="font-mono text-xl font-bold text-white mb-2">
            Check your email
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            We sent a confirmation link to{" "}
            <span className="text-zinc-300">{email}</span>. Click the link to
            activate your account.
          </p>
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Image
              src="/favicon/favicon-32x32.png"
              width={32}
              height={32}
              alt="Journality"
              className="w-5 h-5"
            />
          </div>
          <h1 className="font-mono text-xl font-bold text-white">
            Join Journality
          </h1>
          <p className="text-sm text-zinc-500 mt-1"></p>
        </div>

        <div className="bg-[#111111] border border-white/8 rounded-xl p-6">
          {/*
            OAuth options intentionally hidden for now:
            - Continue with GitHub
          */}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                Full Name
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30"
                placeholder="Full Name"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30"
                placeholder="Your Email"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                Password (never use a password you use for other accounts)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30"
                placeholder="••••••••"
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={[
                        "h-1.5 flex-1 rounded-full transition-colors",
                        strength === "weak"
                          ? "bg-red-400/70"
                          : strength === "medium" || strength === "strong"
                            ? "bg-[#F5A3FF]/60"
                            : "bg-white/10",
                      ].join(" ")}
                    />
                    <div
                      className={[
                        "h-1.5 flex-1 rounded-full transition-colors",
                        strength === "medium"
                          ? "bg-yellow-400/70"
                          : strength === "strong"
                            ? "bg-[#F5A3FF]/60"
                            : "bg-white/10",
                      ].join(" ")}
                    />
                    <div
                      className={[
                        "h-1.5 flex-1 rounded-full transition-colors",
                        strength === "strong"
                          ? "bg-emerald-400/70"
                          : "bg-white/10",
                      ].join(" ")}
                    />
                  </div>
                  <div className="mt-1">
                    <div className="text-[11px] font-mono text-zinc-600">
                      Strength:{" "}
                      <span
                        className={
                          strength === "strong"
                            ? "text-emerald-300"
                            : strength === "medium"
                              ? "text-yellow-300"
                              : "text-red-300"
                        }
                      >
                        {strength.toUpperCase()}
                      </span>
                    </div>
                    {!isStrongPassword && (
                      <div className="mt-0.5 text-[11px] font-mono text-zinc-700">
                        Need 12+ characters with at least one uppercase,
                        lowercase, and special character.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-2">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["reader", "researcher"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-2 p-3 rounded border text-xs font-mono transition-all ${
                      role === r
                        ? "border-[#F5A3FF]/40 bg-[#F5A3FF]/5 text-[#F5A3FF]"
                        : "border-white/10 text-zinc-500 hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        role === r
                          ? "border-[#F5A3FF] bg-[#F5A3FF]"
                          : "border-white/20"
                      }`}
                    >
                      {role === r && (
                        <Check className="w-2.5 h-2.5 text-black" />
                      )}
                    </div>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Researcher fields */}
            {role === "researcher" && (
              <>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    Institution
                  </label>
                  <input
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30"
                    placeholder="Your School or Organization"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    ORCID <span className="text-zinc-700">(optional)</span>
                  </label>
                  <input
                    value={orcid}
                    onChange={(e) => setOrcid(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30 font-mono"
                    placeholder="0000-0000-0000-0000"
                  />
                </div>
              </>
            )}

            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={!isStrongPassword || loading}
            >
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4 font-mono">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#F5A3FF] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
