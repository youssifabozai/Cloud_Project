"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Shield, Key, Mail, Sparkles, AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import { useAuth } from '@/context/AuthContext';

const INITIAL_USERS = [
  { userId: "user-ali", name: "Ali Bin-Ahmed", role: "Manager", teamId: "" },
  { userId: "user-sara", name: "Sara Jenkins", role: "Employee", teamId: "Frontend" },
  { userId: "user-omar", name: "Omar Farooq", role: "Employee", teamId: "Backend" },
  { userId: "user-diana", name: "Diana Prince", role: "Employee", teamId: "QA" },
  { userId: "user-bruce", name: "Bruce Wayne", role: "Admin", teamId: "" }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"api" | "mock">("mock"); // Default mock for easy testing
  const auth = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);
    setLoading(true);

    if (loginMode === "api") {
      try {
        await auth.loginApi(email, password);
      } catch (err: any) {
        setError(err.message || "Failed to reach NestJS auth server. Ensure backend is running.");
        setLoading(false);
      }
    } else {
      // Mock Login Mode for Demo sandbox
      const matchingUser = INITIAL_USERS.find(u => u.name.toLowerCase().includes(email.split("@")[0].toLowerCase()));

      const sessionUser = matchingUser || {
        userId: `user-${Date.now()}`,
        name: email.split("@")[0],
        role: email.includes("manager") ? "Manager" : "Employee",
        teamId: email.includes("backend") ? "Backend" : "Frontend"
      };
      try {
        auth.setMode('mock');
        if (matchingUser) {
          auth.loginMock(matchingUser.userId);
        } else {
          // Register ephemeral mock account and auto-login
          await auth.register({ email, password: 'mock', fullName: sessionUser.name, role: sessionUser.role as any, team: sessionUser.teamId });
        }
      } catch (err) {
        setError('Mock login failed');
        setLoading(false);
      }
    }
  };

  const handleQuickLogin = (user: typeof INITIAL_USERS[0]) => {
    setLoading(true);
    auth.setMode('mock');
    auth.loginMock(user.userId);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 relative overflow-hidden transition-all duration-300">

      {/* Background glowing decorations */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none -z-10 dark:bg-blue-500/5"></div>
      <div className="absolute bottom-10 left-1/4 w-[250px] h-[250px] rounded-full bg-purple-500/10 blur-[90px] pointer-events-none -z-10 dark:bg-purple-500/5"></div>

      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center gap-2">
          <Link href="/" className="p-2.5 rounded-2xl bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white shadow-premium w-fit flex items-center justify-center mb-1">
            <Layers className="h-6 w-6" />
          </Link>
          <h2 className="font-extrabold text-xl tracking-tight">Access Cloud Workspace</h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium">Verify credentials via AWS Cognito directory</p>
        </div>

        {/* Auth Mode Tabs Selector */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-bold shadow-sm">
          <button
            onClick={() => {
              setLoginMode("mock");
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all ${loginMode === "mock"
                ? "bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
          >
            Dev Sandbox Mode
          </button>
          <button
            onClick={() => {
              setLoginMode("api");
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all ${loginMode === "api"
                ? "bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
          >
            Live NestJS API
          </button>
        </div>

        {/* Main login card */}
        <div className="p-8 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs font-semibold">
            {/* Username/Email Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Cognito Account Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--text-tertiary)]" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-xs"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Account Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-[var(--text-tertiary)]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-xs"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-95 rounded-xl font-bold mt-2 shadow-premium cursor-pointer disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating..." : "Connect Session"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Sandbox Profiles Switcher for Grading Day */}
          {loginMode === "mock" && (
            <div className="flex flex-col gap-3 border-t border-[var(--border-color)] pt-5">
              <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                Quick-Login Grading Shortcuts:
              </span>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handleQuickLogin(INITIAL_USERS[0])}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-blue-500/50 hover:bg-blue-500/5 text-xs text-left font-bold flex items-center justify-between"
                >
                  <div>
                    <h4 className="leading-3">Ali Bin-Ahmed</h4>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wide block mt-1">Role: Manager (Full Company GSI)</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleQuickLogin(INITIAL_USERS[1])}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-teal-500/50 hover:bg-teal-500/5 text-xs text-left font-bold flex items-center justify-between"
                >
                  <div>
                    <h4 className="leading-3">Sara Jenkins</h4>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wide block mt-1">Role: Employee (Frontend Team locked)</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>

                <button
                  onClick={() => handleQuickLogin(INITIAL_USERS[2])}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-purple-500/50 hover:bg-purple-500/5 text-xs text-left font-bold flex items-center justify-between"
                >
                  <div>
                    <h4 className="leading-3">Omar Farooq</h4>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wide block mt-1">Role: Employee (Backend Team locked)</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>
          )}

          {/* Footer Register prompt */}
          <div className="text-center text-[11px] text-[var(--text-secondary)] font-semibold border-t border-[var(--border-color)]/50 pt-4 flex items-center justify-center gap-1.5">
            <span>Need new credentials?</span>
            <Link href="/register" className="text-[var(--primary)] hover:underline">
              Create local profile
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}

// Minimal placeholder component
function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
