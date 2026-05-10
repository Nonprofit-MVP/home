"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
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
            Welcome back
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to Journality</p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-white/8 rounded-xl p-6">
          {/*
            OAuth options intentionally hidden for now:
            - Continue with GitHub
            - Continue with Google
          */}

          {/* Email/password form */}
          <form onSubmit={handleLogin} className="space-y-4">
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
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4 font-mono">
          No account?{" "}
          <Link href="/auth/signup" className="text-[#F5A3FF] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
