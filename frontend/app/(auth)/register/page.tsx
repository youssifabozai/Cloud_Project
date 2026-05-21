"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Shield, Key, Mail, User, Briefcase, PlusCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Manager" | "Employee" | "Admin">("Employee");
  const [team, setTeam] = useState("Frontend");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerMode, setRegisterMode] = useState<"api" | "mock">("mock");

  const auth = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    setError(null);
    setLoading(true);

    try {
      await auth.register({ email, password, fullName, role: role.toUpperCase() as any, team });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
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
          <h2 className="font-extrabold text-xl tracking-tight">Create Staff Profile</h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium">Provision new accounts in Mini-Jira AWS environment</p>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-bold shadow-sm">
          <button
            onClick={() => {
              setRegisterMode("mock");
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all ${registerMode === "mock"
                ? "bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
          >
            Dev Sandbox Setup
          </button>
          <button
            onClick={() => {
              setRegisterMode("api");
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all ${registerMode === "api"
                ? "bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
          >
            Live NestJS API
          </button>
        </div>

        {/* Main Form container */}
        <div className="p-8 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4 text-xs font-semibold">
            {/* Full name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Full Staff Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-xs"
                  required
                />
              </div>
            </div>

            {/* Email Input */}
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

            {/* Role and Team details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Corporate Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="p-2.5 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs"
                >
                  <option value="Employee">Employee (Staff)</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>

              {role === "Employee" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Team Assignment</label>
                  <select
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    className="p-2.5 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs"
                  >
                    <option value="Frontend">Frontend Team</option>
                    <option value="Backend">Backend Team</option>
                    <option value="QA">QA Team</option>
                    <option value="DevOps">DevOps Cloud Team</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-95 rounded-xl font-bold mt-2 shadow-premium cursor-pointer disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? "Registering Account..." : "Provision Account"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Footer Back Link */}
          <div className="text-center text-[11px] text-[var(--text-secondary)] font-semibold border-t border-[var(--border-color)]/50 pt-4 flex items-center justify-center gap-1.5">
            <span>Already have an account?</span>
            <Link href="/login" className="text-[var(--primary)] hover:underline">
              Sign In
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
