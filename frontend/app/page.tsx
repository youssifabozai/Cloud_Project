"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowRight,
  BarChart3,
  Box,
  Cloud,
  Database,
  Layers,
  LockKeyhole,
  MessageSquare,
  Send,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Cognito Access", text: "Secure roles for Admins, Managers, and Employees." },
  { icon: Database, title: "DynamoDB Scope", text: "Team-based partitions keep every workspace isolated." },
  { icon: Workflow, title: "Cloud Events", text: "SNS, SQS, and Lambda-ready task assignment flows." },
  { icon: BarChart3, title: "Live Metrics", text: "CloudWatch-style health and task signals." },
];

export default function LandingPage() {
  const auth = useAuth();
  const theme = auth.theme;
  const setTheme = auth.setTheme;

  return (
    <div className="cloud-page text-[#202633]">
      <header className="px-4 pt-6 sm:px-8">
        <div className="cloud-nav mx-auto flex h-[76px] max-w-7xl items-center justify-between rounded-[24px] px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="cloud-logo flex h-10 w-10 items-center justify-center rounded-xl text-white">
              <Box className="h-5 w-5" />
            </span>
            <span className="text-2xl font-black">CloudJira</span>
          </Link>

          <nav className="hidden items-center gap-10 text-base font-semibold md:flex">
            <a href="#home" className="hover:text-[#A21BF4]">Home</a>
            <a href="#features" className="hover:text-[#A21BF4]">Features</a>
            <a href="#pricing" className="hover:text-[#A21BF4]">Services</a>
            <a href="#blog" className="hover:text-[#A21BF4]">Dashboard</a>
            <a href="#contact" className="hover:text-[#A21BF4]">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
            <Link href="/login" className="cloud-button rounded-xl px-6 py-3 text-base font-extrabold">
              Try for free
            </Link>
          </div>
        </div>
      </header>

      <main id="home">
        <section className="mx-auto flex min-h-[760px] max-w-7xl flex-col justify-end px-5 pb-12 pt-20 text-center sm:px-8">
          <div className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/42 px-4 py-2 text-sm font-bold shadow-sm backdrop-blur-xl">
            <Send className="h-4 w-4 text-[#A21BF4]" />
            AWS-powered project workspace in the clouds
          </div>

          <h1 className="mx-auto max-w-5xl text-6xl font-black leading-[0.95] text-[#202633] sm:text-7xl lg:text-8xl">
            Manage cloud tasks with a softer sky view
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-xl font-medium leading-9 text-[#334155]">
            A Mini-Jira experience with Cognito login, DynamoDB team isolation, task queues, and audit events wrapped in a clean cloud SaaS interface.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/dashboard" className="cloud-button inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-lg font-extrabold">
              Back to Dashboard <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/register"
              className="rounded-2xl border border-white/70 bg-white/46 px-8 py-4 text-lg font-extrabold shadow-sm backdrop-blur-xl hover:bg-white/65"
            >
              Create profile
            </Link>
          </div>
        </section>

        <section id="features" className="px-5 pb-16 sm:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="cloud-card rounded-3xl p-6 hover-lift">
                  <span className="cloud-logo mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h2 className="text-xl font-black">{feature.title}</h2>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#475569]">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="pricing" className="px-5 pb-20 sm:px-8">
          <div className="cloud-card mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 rounded-[32px] p-8 md:grid-cols-[0.85fr_1.15fr] md:p-10">
            <div>
              <div className="cloud-logo mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white">
                <Cloud className="h-7 w-7" />
              </div>
              <h2 className="text-4xl font-black leading-tight">One workspace, many cloud services.</h2>
              <p className="mt-4 text-base font-medium leading-8 text-[#475569]">
                Keep the friendly cloud look while showing real backend ideas: authentication, team partitioning, tasks, notifications, and metrics.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                [Layers, "Projects", "Manager-owned cloud workspaces"],
                [LockKeyhole, "Isolation", "Employees see only team tasks"],
                [MessageSquare, "Comments", "Task collaboration timelines"],
                [Database, "Storage", "DynamoDB and S3-ready flows"],
              ].map(([Icon, title, text]) => {
                const LucideIcon = Icon as typeof Layers;
                return (
                  <div key={title as string} className="rounded-2xl border border-white/70 bg-white/38 p-5 backdrop-blur-xl">
                    <LucideIcon className="mb-4 h-5 w-5 text-[#A21BF4]" />
                    <h3 className="font-black">{title as string}</h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#475569]">{text as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
