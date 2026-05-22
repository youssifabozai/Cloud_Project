"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Box, ChevronRight, Key, Mail, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const INITIAL_USERS = [
  { userId: "user-ali", name: "Ali Bin-Ahmed", role: "Manager", teamId: "" },
  { userId: "user-sara", name: "Sara Jenkins", role: "Employee", teamId: "Frontend" },
  { userId: "user-omar", name: "Omar Farooq", role: "Employee", teamId: "Backend" },
  { userId: "user-diana", name: "Diana Prince", role: "Employee", teamId: "QA" },
  { userId: "user-bruce", name: "Bruce Wayne", role: "Admin", teamId: "" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"api" | "mock">("mock");
  const auth = useAuth();
  const theme = auth.theme;

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
      const matchingUser = INITIAL_USERS.find((u) =>
        u.name.toLowerCase().includes(email.split("@")[0].toLowerCase()),
      );

      const sessionUser = matchingUser || {
        userId: `user-${Date.now()}`,
        name: email.split("@")[0],
        role: email.includes("manager") ? "Manager" : "Employee",
        teamId: email.includes("backend") ? "Backend" : "Frontend",
      };

      try {
        auth.setMode("mock");
        if (matchingUser) {
          auth.loginMock(matchingUser.userId);
        } else {
          await auth.register({
            email,
            password: "mock",
            fullName: sessionUser.name,
            role: sessionUser.role as any,
            team: sessionUser.teamId,
          });
        }
        router.push("/dashboard");
      } catch {
        setError("Mock login failed");
        setLoading(false);
      }
    }
  };

  const handleQuickLogin = (user: typeof INITIAL_USERS[0]) => {
    setLoading(true);
    auth.setMode("mock");
    auth.loginMock(user.userId);
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
          <p className="text-sm font-medium text-[#475569]">Sign in through sandbox mode or the live NestJS API.</p>
        </div>

        <div className="cloud-card mb-5 grid grid-cols-2 rounded-2xl p-1.5 text-xs font-black">
          {(["mock", "api"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setLoginMode(mode);
                setError(null);
              }}
              className={`rounded-xl py-2.5 transition ${loginMode === mode ? "cloud-button" : "text-[#475569] hover:bg-white/38"}`}
            >
              {mode === "mock" ? "Dev Sandbox" : "Live API"}
            </button>
          ))}
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

          {loginMode === "mock" && (
            <div className="mt-6 border-t border-white/60 pt-5">
              <span className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase text-[#475569]">
                <UserCheck className="h-4 w-4 text-[#A21BF4]" />
                Quick cloud profiles
              </span>

              <div className="flex flex-col gap-2">
                {INITIAL_USERS.slice(0, 3).map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => handleQuickLogin(user)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/40 p-3 text-left text-xs font-black hover:bg-white/65"
                  >
                    <span>
                      <span className="block">{user.name}</span>
                      <span className="mt-1 block text-[10px] uppercase text-[#64748B]">
                        {user.role} {user.teamId ? `- ${user.teamId}` : "- Company view"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#A21BF4]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-white/60 pt-4 text-center text-[11px] font-bold text-[#475569]">
            Need new credentials?{" "}
            <Link href="/register" className="text-[#A21BF4] hover:underline">
              Create local profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
