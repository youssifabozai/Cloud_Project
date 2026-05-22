"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Box, Key, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/context/ToastContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const theme = auth.theme;
  const { pushToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);
    setLoading(true);

    try {
      await auth.login(email, password);
      pushToast("success", "Login success", "Your session is active.");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to reach NestJS auth server. Ensure backend is running.";
      setError(message);
      pushToast("error", "Login failed", "Check your email and password, then try again.");
      setLoading(false);
    }
  };

  return (
    <div className="cloud-page flex min-h-screen items-center justify-center p-6 text-[#202633]">
      <ThemeToggle
        theme={theme}
        onToggle={() => auth.setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed right-5 top-5 z-20"
      />
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Link href="/" className="cloud-logo mb-1 flex h-14 w-14 items-center justify-center rounded-2xl text-white">
            <Box className="h-7 w-7" />
          </Link>
          <h1 className="text-3xl font-black">Access Cloud Workspace</h1>
          <p className="text-sm font-medium text-[#475569]">
            Sign in with your Cognito account. All data is loaded from DynamoDB via the API.
          </p>
        </div>

        <div className="cloud-card rounded-[30px] p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-300/50 bg-rose-100/50 p-4 text-xs font-bold text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs font-bold">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase text-[#475569]">Cognito Account Email</span>
              <span className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-[#64748B]" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/70 bg-white/44 py-3 pl-11 pr-4 outline-none placeholder:text-[#64748B] focus:ring-2 focus:ring-[#C832FF]/35"
                  required
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase text-[#475569]">Account Password</span>
              <span className="relative">
                <Key className="absolute left-4 top-3.5 h-4 w-4 text-[#64748B]" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/70 bg-white/44 py-3 pl-11 pr-4 outline-none placeholder:text-[#64748B] focus:ring-2 focus:ring-[#C832FF]/35"
                  required
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="cloud-button mt-2 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Connect Session"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-5 border-t border-white/60 pt-4 text-center text-[11px] font-bold text-[#475569]">
            Need new credentials?{" "}
            <Link href="/register" className="text-[#A21BF4] hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
