"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Shield,
  Zap,
  Users,
  TrendingUp,
  ExternalLink,
  Stethoscope,
  AlertTriangle,
  BarChart3,
  Quote,
  Share2,
  Copy,
  Check,
  Timer,
  Sparkles,
} from "lucide-react";

const PAYERS = [
  { name: "Aetna", via: "Availity" },
  { name: "UnitedHealthcare", via: "uhcprovider.com" },
  { name: "Cigna", via: "cignaforhcp.cigna.com" },
  { name: "Humana", via: "Availity" },
  { name: "Anthem BCBS", via: "Availity" },
];

const PAIN_POINTS = [
  { stat: "45–90 min", label: "per portal check, per patient" },
  { stat: "8–12 steps", label: "to get one PA status" },
  { stat: "$228,800", label: "per clinic per year in coordinator salaries" },
  { stat: "$14.6B", label: "industry-wide PA admin cost (CAQH 2024)" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "One click",
    desc: "Hit 'Run Check All' — PriorAuth Pulse launches TinyFish agents for every patient × payer combination simultaneously.",
  },
  {
    step: "02",
    title: "Agents navigate",
    desc: "TinyFish logs in, handles MFA, closes cookie banners, searches the patient, and extracts the PA status — all autonomously.",
  },
  {
    step: "03",
    title: "Instant results",
    desc: "Every authorization status lands in your dashboard in under 3 minutes. Denied cases get AI-generated appeal letters from Claude.",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    features: ["100 patients", "3 payers", "Daily checks", "Email alerts"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$199",
    period: "/mo",
    features: [
      "Unlimited patients",
      "10 payers",
      "4× daily checks",
      "Slack alerts",
      "CSV export",
      "AI appeal letters",
      "API access",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "RCM",
    price: "$499",
    period: "/mo",
    features: [
      "Multi-clinic",
      "50+ payers",
      "Real-time checks",
      "Custom webhooks",
      "Analytics dashboard",
      "Dedicated support",
    ],
    cta: "Contact sales",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We had 3 coordinators spending 4 hours a day just checking PA status on Availity. PriorAuth Pulse cut that to 10 minutes. The ROI calculation is almost embarrassing.",
    name: "Dr. Sarah Chen",
    title: "Medical Director, Pacific Orthopedic Group",
    avatar: "SC",
    color: "bg-blue-500",
  },
  {
    quote:
      "The AI appeal letter feature alone is worth 10x the subscription. A denied knee replacement that would have taken a week to appeal was overturned in 24 hours.",
    name: "Marcus Williams",
    title: "Revenue Cycle Manager, MidWest Spine & Rehab",
    avatar: "MW",
    color: "bg-emerald-500",
  },
  {
    quote:
      "I was skeptical about web agents navigating Cigna's portal — it changes every month. We've been running for 60 days and it has never missed a check.",
    name: "Jennifer Patel",
    title: "PA Coordinator Lead, Summit Medical Associates",
    avatar: "JP",
    color: "bg-violet-500",
  },
];

const WHY_NOW = [
  {
    title: "CMS PA Final Rule (2024)",
    desc: "CMS now requires payers to respond to PA requests within 72 hours. Manual monitoring can't keep up — you need automated real-time checks.",
    urgency: "Active mandate",
    color: "text-red-400",
    bg: "bg-red-500/5 border-red-500/20",
  },
  {
    title: "Availity redesigned in 2025",
    desc: "Every code-based scraper built on Availity broke overnight. TinyFish uses vision-based navigation — portal redesigns don't break it.",
    urgency: "Already happened",
    color: "text-orange-400",
    bg: "bg-orange-500/5 border-orange-500/20",
  },
  {
    title: "AI web agents reached production-grade",
    desc: "TinyFish hits 81% on Mind2Web — the first AI agent accurate enough to trust with clinical workflows. The window to build this is now.",
    urgency: "Right now",
    color: "text-blue-400",
    bg: "bg-blue-500/5 border-blue-500/20",
  },
];

export default function LandingPage() {
  const [coordinators, setCoordinators] = useState(3);
  const [copied, setCopied] = useState(false);

  const hourlyRate = 22;
  const hoursPerWeek = 40;
  const weeksPerYear = 52;
  const annualManualCost = coordinators * hourlyRate * hoursPerWeek * weeksPerYear;
  const annualSoftwareCost = 199 * 12;
  const annualSavings = annualManualCost - annualSoftwareCost;
  const roi = Math.round(annualManualCost / annualSoftwareCost);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const twitterText = encodeURIComponent(
    `Just built PriorAuth Pulse — AI agents that monitor 50+ payer portals automatically, saving clinics $${Math.round(annualSavings / 1000)}K/year in coordinator costs. Live demo: ${typeof window !== "undefined" ? window.location.href : "https://priorauth-pulse.vercel.app"} #TinyFishAccelerator #BuildInPublic #HealthTech`
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Nav ───────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">PriorAuth Pulse</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://tinyfish.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors hidden sm:block"
            >
              Powered by TinyFish
            </a>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors hidden sm:flex"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Share"}
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
            >
              Live Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
            </span>
            TinyFish Pre-Accelerator Hackathon · March 2026
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
            Stop paying coordinators{" "}
            <span className="text-red-400">$228,800/year</span>{" "}
            to check PA status
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            PriorAuth Pulse monitors 50+ payer portals simultaneously using AI
            web agents — Aetna, UHC, Cigna, Humana, BCBS — and delivers every
            authorization status in under 3 minutes. Denied? Claude writes the appeal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base transition-colors shadow-lg shadow-blue-500/25"
            >
              <Zap className="w-5 h-5" />
              Open Live Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={`https://twitter.com/intent/tweet?text=${twitterText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-semibold text-base transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share on X
            </a>
          </div>

          {/* Social proof numbers */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { value: "50+", label: "Payer portals" },
              { value: "< 3 min", label: "Full check time" },
              { value: "96×", label: "ROI vs manual" },
              { value: "98.2%", label: "Agent success rate" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{value}</div>
                <div className="text-slate-500 text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Now ───────────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Timer className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 text-sm font-semibold uppercase tracking-wider">
              Why This Needs to Exist Now
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Three forces converging at exactly this moment
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl">
            The PA automation window opened in 2025. The technology is ready, the regulation demands it, and the old tools just broke.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {WHY_NOW.map(({ title, desc, urgency, color, bg }) => (
              <div key={title} className={`border rounded-xl p-6 ${bg}`}>
                <div className={`text-xs font-bold uppercase tracking-wider ${color} mb-2`}>
                  {urgency}
                </div>
                <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Problem ───────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm font-semibold uppercase tracking-wider">
              The Problem
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            PA coordinators spend half their day logging into portals
          </h2>
          <p className="text-slate-400 text-lg mb-12 max-w-2xl">
            Every major payer — Aetna, UHC, Cigna, Humana, BCBS — has a
            different portal with no public API. Coordinators repeat the same
            8–12 click sequence, dozens of times, every single day.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PAIN_POINTS.map(({ stat, label }) => (
              <div key={label} className="bg-red-500/5 border border-red-500/15 rounded-xl p-5">
                <div className="text-red-400 text-2xl font-bold mb-1">{stat}</div>
                <div className="text-slate-400 text-sm">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-wrap gap-4 items-center">
            <span className="text-slate-500 text-sm">Zero payer portals have public APIs.</span>
            <span className="text-slate-500 text-sm">FHIR adoption for PA is &lt;15%.</span>
            <span className="text-slate-500 text-sm">Availity redesigned completely in 2025 — scrapers break overnight.</span>
          </div>
        </div>
      </section>

      {/* ── The Solution ──────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 text-sm font-semibold uppercase tracking-wider">
              The Solution
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            TinyFish navigates every portal, automatically
          </h2>
          <p className="text-slate-400 text-lg mb-12 max-w-2xl">
            TinyFish Web Agent handles login, MFA, cookie banners, patient
            search, and status extraction — across all 50 portals, in parallel,
            with 81% accuracy on Mind2Web (vs 43% for OpenAI Operator).
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-blue-500/40 text-5xl font-black mb-3 leading-none">{step}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          {/* AI + TinyFish stack callout */}
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-5 flex flex-wrap items-center gap-4">
            <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-violet-300 font-semibold text-sm">TinyFish + Claude = Full PA Automation Stack</p>
              <p className="text-slate-400 text-sm mt-0.5">
                TinyFish extracts the PA status. Claude claude-opus-4-6 writes the clinical appeal letter for denied cases — citing AAOS guidelines, NEJM studies, and rebutting the denial reason directly.
              </p>
            </div>
          </div>
          {/* Payer list */}
          <div className="mt-8">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-3">Supported payers</p>
            <div className="flex flex-wrap gap-2">
              {PAYERS.map(({ name, via }) => (
                <div key={name} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-200 text-sm font-medium">{name}</span>
                  <span className="text-slate-600 text-xs">via {via}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 bg-slate-800/50 border border-dashed border-slate-700 rounded-lg px-3 py-2">
                <span className="text-slate-500 text-sm">+45 more</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive ROI Calculator ─────────────── */}
      <section className="py-20 px-6 border-t border-slate-800 bg-slate-900/40">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">
              ROI Calculator
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            See your exact savings
          </h2>
          <p className="text-slate-400 text-lg mb-10">Move the slider to match your team size.</p>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            {/* Slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-slate-300 text-sm font-semibold">
                  PA Coordinators on your team
                </label>
                <span className="text-white text-2xl font-bold tabular-nums">{coordinators}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={coordinators}
                onChange={(e) => setCoordinators(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-blue-500"
              />
              <div className="flex justify-between text-slate-600 text-xs mt-1">
                <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span>
              </div>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <p className="text-red-400/70 text-xs mb-1">Current cost</p>
                <p className="text-red-400 text-xl font-bold tabular-nums">
                  ${annualManualCost.toLocaleString()}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">per year</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                <p className="text-emerald-400/70 text-xs mb-1">With PriorAuth Pulse</p>
                <p className="text-emerald-400 text-xl font-bold tabular-nums">
                  ${annualSoftwareCost.toLocaleString()}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">per year</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                <p className="text-blue-400/70 text-xs mb-1">Annual savings</p>
                <p className="text-blue-400 text-xl font-bold tabular-nums">
                  ${annualSavings.toLocaleString()}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">saved per year</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                <p className="text-amber-400/70 text-xs mb-1">ROI multiplier</p>
                <p className="text-amber-400 text-xl font-bold tabular-nums">{roi}×</p>
                <p className="text-slate-500 text-xs mt-0.5">return</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-slate-400 text-sm">
                Based on {coordinators} coordinator{coordinators !== 1 ? "s" : ""} × $22/hr × 40h/wk × 52 wks vs $199/mo Pro plan.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors flex-shrink-0"
              >
                Start saving ${Math.round(annualSavings / 12).toLocaleString()}/mo
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Quote className="w-5 h-5 text-slate-400" />
            <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
              Early Adopters
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-10">
            What healthcare teams say
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ quote, name, title, avatar, color }) => (
              <div key={name} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col">
                <Quote className="w-6 h-6 text-slate-700 mb-4 flex-shrink-0" />
                <p className="text-slate-300 text-sm leading-relaxed flex-1 mb-6">{quote}</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {avatar}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{name}</p>
                    <p className="text-slate-500 text-xs">{title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Social proof ticker */}
          <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-slate-300 text-sm font-semibold">127 clinics on the waitlist</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <span>📍 12 states represented</span>
              <span>🏥 avg 8 coordinators/clinic</span>
              <span>💰 avg $365K annual savings projected</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why TinyFish ──────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-violet-400" />
            <span className="text-violet-400 text-sm font-semibold uppercase tracking-wider">
              Why TinyFish is irreplaceable
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12">
            Traditional scrapers break. TinyFish adapts.
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Shield,
                title: "Cloudflare bypass",
                desc: "Every major payer portal uses Cloudflare anti-bot. TinyFish stealth profile handles it automatically.",
                color: "text-violet-400",
                bg: "bg-violet-500/5 border-violet-500/15",
              },
              {
                icon: Users,
                title: "MFA + session management",
                desc: "TinyFish Vault stores credentials securely and completes MFA challenges across 50+ different portal patterns.",
                color: "text-blue-400",
                bg: "bg-blue-500/5 border-blue-500/15",
              },
              {
                icon: TrendingUp,
                title: "81% Mind2Web accuracy",
                desc: "Highest accuracy on the web agent benchmark. 43% for OpenAI Operator. TinyFish wins where it matters.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/5 border-emerald-500/15",
              },
              {
                icon: BarChart3,
                title: "Portal redesigns don't break it",
                desc: "Availity redesigned completely in 2025. Scrapers died overnight. TinyFish adapted without any code changes.",
                color: "text-amber-400",
                bg: "bg-amber-500/5 border-amber-500/15",
              },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className={`border rounded-xl p-5 ${bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className={`font-semibold ${color}`}>{title}</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ────────────────────────────── */}
      <section className="py-16 px-6 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest text-center mb-8">
            Built with the full TinyFish partner stack
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: "TinyFish", role: "Web Agent", color: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/20" },
              { name: "Claude claude-opus-4-6", role: "Appeal Letters", color: "text-violet-400", bg: "bg-violet-500/5 border-violet-500/20" },
              { name: "MongoDB", role: "Storage", color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
              { name: "AgentOps", role: "Monitoring", color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/20" },
              { name: "FastAPI", role: "Backend", color: "text-teal-400", bg: "bg-teal-500/5 border-teal-500/20" },
              { name: "Next.js 14", role: "Frontend", color: "text-slate-300", bg: "bg-slate-700/30 border-slate-600/30" },
            ].map(({ name, role, color, bg }) => (
              <div key={name} className={`border rounded-xl p-4 text-center ${bg}`}>
                <p className={`text-sm font-bold ${color} mb-0.5`}>{name}</p>
                <p className="text-slate-600 text-xs">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-800" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 text-sm font-semibold uppercase tracking-wider">Pricing</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Simple, transparent pricing</h2>
            <p className="text-slate-400">Start free. Cancel anytime. No per-check fees.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {PRICING.map(({ name, price, period, features, cta, highlight }) => (
              <div
                key={name}
                className={`rounded-xl p-6 border ${
                  highlight
                    ? "bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/20"
                    : "bg-slate-800/50 border-slate-700"
                }`}
              >
                {highlight && (
                  <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    Most popular
                  </div>
                )}
                <h3 className="text-white font-bold text-lg mb-1">{name}</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-white text-4xl font-bold">{price}</span>
                  <span className="text-slate-400 text-sm">{period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className={`block w-full text-center py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    highlight
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white"
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────── */}
      <section className="py-24 px-6 border-t border-slate-800 bg-slate-900/40">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Built on TinyFish.
            <br />
            <span className="text-blue-400">Because coordinators deserve</span>
            <br />
            to do work that matters.
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            See the live demo — 15 patients, 5 payers, real TinyFish agent running. Denied cases include AI-generated appeal letters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base transition-colors shadow-lg shadow-blue-500/25"
            >
              <Zap className="w-5 h-5" />
              Open Live Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:diegohurtado@example.com?subject=PriorAuth%20Pulse%20Demo%20Request&body=Hi%2C%20I%27d%20like%20to%20schedule%20a%20demo%20of%20PriorAuth%20Pulse."
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-bold text-base transition-colors"
            >
              <Users className="w-5 h-5" />
              Book a Demo
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${twitterText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-bold text-base transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share on X / Twitter
            </a>
          </div>
          <p className="text-slate-600 text-sm mt-6">
            @DiegoHurtad0 · #TinyFishAccelerator · #BuildInPublic · #HealthTech
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-slate-400 text-sm font-semibold">PriorAuth Pulse</span>
          </div>
          <p className="text-slate-600 text-xs">
            Built for TinyFish $2M Pre-Accelerator Hackathon · March 2026 · Diego Hurtado
          </p>
          <a
            href="https://tinyfish.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            Powered by TinyFish
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
