"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Box, Briefcase, Key, Mail, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Manager" | "Employee" | "Admin">("Employee");
  const [team, setTeam] = useState("Frontend");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerMode, setRegisterMode] = useState<"api" | "mock">("mock");
  const auth = useAuth();
  const theme = auth.theme;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    setError(null);
    setLoading(true);

    try {
      await auth.register({ email, password, fullName, role: role.toUpperCase() as any, team });
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
          <h1 className="text-3xl font-black">Create Staff Profile</h1>
          <p className="text-sm font-medium text-[#475569]">Provision a cloud workspace identity for the demo.</p>
        </div>

        <div className="cloud-card mb-5 grid grid-cols-2 rounded-2xl p-1.5 text-xs font-black">
          {(["mock", "api"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setRegisterMode(mode);
                setError(null);
              }}
              className={`rounded-xl py-2.5 transition ${registerMode === mode ? "cloud-button" : "text-[#475569] hover:bg-white/38"}`}
            >
              {mode === "mock" ? "Sandbox Setup" : "Live API"}
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

          <form onSubmit={handleRegister} className="flex flex-col gap-4 text-xs font-bold">
            <Field icon={User} label="Full Staff Name">
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="cloud-input"
                required
              />
            </Field>

            <Field icon={Mail} label="Cognito Account Email">
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cloud-input"
                required
              />
            </Field>

            <Field icon={Key} label="Account Password">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cloud-input"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase text-[#475569]">Corporate Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="rounded-2xl border border-white/70 bg-white/44 p-3 outline-none focus:ring-2 focus:ring-[#C832FF]/35"
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase text-[#475569]">Team</span>
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  disabled={role !== "Employee"}
                  className="rounded-2xl border border-white/70 bg-white/44 p-3 outline-none disabled:opacity-50 focus:ring-2 focus:ring-[#C832FF]/35"
                >
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="QA">QA</option>
                  <option value="DevOps">DevOps Cloud</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cloud-button mt-2 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black disabled:opacity-50"
            >
              {loading ? "Registering..." : "Provision Account"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-5 border-t border-white/60 pt-4 text-center text-[11px] font-bold text-[#475569]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#A21BF4] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Briefcase;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase text-[#475569]">{label}</span>
      <span className="relative">
        <Icon className="absolute left-4 top-3.5 h-4 w-4 text-[#64748B]" />
        {children}
      </span>
    </label>
  );
}
