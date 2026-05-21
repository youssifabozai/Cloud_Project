"use client";

import React, { useEffect } from "react";
import { useAuth } from '@/context/AuthContext';
import Link from "next/link";
import {
  Layers,
  Shield,
  Zap,
  Cpu,
  BarChart3,
  Mail,
  HardDrive,
  Network,
  ArrowRight,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";

export default function LandingPage() {
  const auth = useAuth();
  const theme = auth.theme;
  const setTheme = auth.setTheme;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 flex flex-col justify-between">

      {/* HEADER NAV */}
      <header className="h-20 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white shadow-premium">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight flex items-center gap-1.5">
              Mini-Jira
              <span className="text-[10px] font-bold py-0.5 px-2 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">AWS</span>
            </h1>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">High-Availability SaaS</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--text-secondary)]">
          <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">AWS Architecture</a>
          <a href="#demo" className="hover:text-[var(--text-primary)] transition-colors">Demo Scenarios</a>
          <a href="#team" className="hover:text-[var(--text-primary)] transition-colors">Team Isolation</a>
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-xl hover:bg-[var(--border-color)]/50 transition-colors text-[var(--text-secondary)]"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-zinc-500" />}
          </button>

          <Link
            href="/login"
            className="px-5 py-2 text-sm font-bold border border-[var(--border-color)] hover:bg-[var(--border-color)]/30 rounded-xl transition-all"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 text-sm font-bold bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-90 rounded-xl shadow-premium hidden sm:inline-block transition-opacity"
          >
            Create Staff Profile
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col">
        <section className="relative overflow-hidden py-24 md:py-32 px-6 sm:px-12 text-center flex flex-col items-center justify-center gap-6">
          {/* Background glowing decorations */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none -z-10 dark:bg-blue-500/5"></div>
          <div className="absolute bottom-10 left-1/3 w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none -z-10 dark:bg-purple-500/5"></div>

          <span className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[var(--primary)] bg-blue-500/10 rounded-full border border-blue-500/20 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Fully Configured for AWS Cloud Deployment
          </span>

          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-none">
            Modern Project Workspaces. <br />
            <span className="text-gradient font-black">Powered by High Availability.</span>
          </h2>

          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl leading-relaxed mt-2 font-medium">
            Mini-Jira is an ultra-premium, team-isolated, event-driven agile dashboard.
            Engineered to deploy programmatically across AWS regions behind dynamic load balancers.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-95 text-sm font-bold rounded-2xl shadow-premium flex items-center gap-2 transition-opacity"
            >
              Launch Workspace Dashboard <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border border-[var(--border-color)] hover:bg-[var(--border-color)]/30 text-sm font-bold rounded-2xl transition-all"
            >
              Sign In to Sandbox
            </Link>
          </div>
        </section>

        {/* AWS SERVICES GRID */}
        <section id="features" className="py-20 px-6 sm:px-12 bg-[var(--bg-secondary)]/30 border-t border-b border-[var(--border-color)]">
          <div className="max-w-6xl mx-auto flex flex-col gap-12">
            <div className="text-center flex flex-col items-center gap-2">
              <h3 className="text-2xl font-bold tracking-tight">Engineered AWS Infrastructure</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md">Our backend utilizes AWS ecosystem services for high-availability database operations and events.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Box 1 */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover-lift flex flex-col gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 w-fit">
                  <Shield className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm">AWS Cognito Auth</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Authenticates logins securely. Stores dynamic employee custom:team attributes to govern system routing.
                </p>
              </div>

              {/* Box 2 */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover-lift flex flex-col gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 w-fit">
                  <Zap className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm">DynamoDB Indexing</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Enforces database-level isolation checks. Utilizes teamId and assigneeId Global Secondary Indexes.
                </p>
              </div>

              {/* Box 3 */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover-lift flex flex-col gap-4">
                <div className="p-3 rounded-xl bg-teal-500/10 text-teal-500 w-fit">
                  <Cpu className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm">Lambda Resizer & S3</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Stores original attachments on S3. An event-driven Lambda triggers automatically to generate optimized thumbnails.
                </p>
              </div>

              {/* Box 4 */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover-lift flex flex-col gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 w-fit">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm">CloudWatch Metrics</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Active dashboards displaying tasks completion latency, EC2 loading stats, and automated alarm triggers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DEMO SCENARIO HIGHLIGHT */}
        <section id="demo" className="py-24 px-6 sm:px-12">
          <div className="max-w-4xl mx-auto rounded-3xl p-8 md:p-12 border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium relative overflow-hidden flex flex-col gap-6 text-center md:text-left md:flex-row items-center justify-between">
            <div className="flex flex-col gap-3 max-w-lg">
              <span className="px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-[var(--secondary)] bg-purple-500/10 rounded-full border border-purple-500/15 w-fit mx-auto md:mx-0">
                Grading Demonstration
              </span>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight">Active Demo-Day Isolation Scenarios</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Log in as <strong>Sara (Frontend Employee)</strong> to view only Frontend tasks, then swap instantly with our header role-switcher to <strong>Omar (Backend Employee)</strong> or <strong>Ali (Manager)</strong> to witness immediate visual partition isolating database queries.
              </p>
            </div>
            <Link
              href="/login"
              className="px-6 py-3.5 bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] rounded-2xl text-xs font-bold shadow-sm whitespace-nowrap"
            >
              Try Scenarios Now
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="h-16 border-t border-[var(--border-color)] px-6 sm:px-12 flex items-center justify-between bg-[var(--bg-secondary)]/30 text-[10px] text-[var(--text-secondary)] font-semibold">
        <span>© 2026 Mini-Jira AWS Team. All cloud resources stop programmatically.</span>
        <span>Cloud Computing Project</span>
      </footer>

    </div>
  );
}
