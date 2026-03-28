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
    desc: "Every authorization status lands in your dashboard in under 3 minutes. Status changes trigger Slack alerts automatically.",
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

export default function LandingPage() {
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
          <div className="flex items-center gap-4">
            <a
              href="https://tinyfish.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors hidden sm:block"
            >
              Powered by TinyFish
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
            >
              Open Dashboard
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
            authorization status in under 3 minutes.
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
              href="https://tinyfish.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-semibold text-base transition-colors"
            >
              Powered by TinyFish
              <ExternalLink className="w-4 h-4" />
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
              <div
                key={label}
                className="bg-red-500/5 border border-red-500/15 rounded-xl p-5"
              >
                <div className="text-red-400 text-2xl font-bold mb-1">{stat}</div>
                <div className="text-slate-400 text-sm">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-wrap gap-2 items-center">
            <span className="text-slate-500 text-sm">
              Zero payer portals have public APIs.
            </span>
            <span className="text-slate-500 text-sm">
              FHIR adoption for PA is &lt;15%.
            </span>
            <span className="text-slate-500 text-sm">
              Availity redesigned completely in 2025 — scrapers break overnight.
            </span>
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
              <div
                key={step}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
              >
                <div className="text-blue-500/40 text-5xl font-black mb-3 leading-none">
                  {step}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Payer list */}
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-3">
              Supported payers
            </p>
            <div className="flex flex-wrap gap-2">
              {PAYERS.map(({ name, via }) => (
                <div
                  key={name}
                  className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                >
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

      {/* ── ROI Section ───────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-800 bg-slate-900/40">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">
              The ROI
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12">
            96× return on investment, day one
          </h2>

          <div className="grid sm:grid-cols-3 gap-6 items-center">
            {/* Before */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
              <p className="text-red-400/70 text-xs font-semibold uppercase tracking-wider mb-2">
                Before
              </p>
              <p className="text-red-400 text-4xl font-bold mb-1">$228,800</p>
              <p className="text-slate-400 text-sm mb-4">per year</p>
              <div className="space-y-1.5 text-sm text-slate-500">
                <p>5 PA coordinators</p>
                <p>$22/hr × 40h/week × 52 weeks</p>
                <p>45–90 min per portal check</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-slate-500 text-sm">Replace with</span>
            </div>

            {/* After */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
              <p className="text-emerald-400/70 text-xs font-semibold uppercase tracking-wider mb-2">
                After
              </p>
              <p className="text-emerald-400 text-4xl font-bold mb-1">$199</p>
              <p className="text-slate-400 text-sm mb-4">per month</p>
              <div className="space-y-1.5 text-sm text-slate-500">
                <p>Unlimited patients</p>
                <p>50+ payers, 4× daily checks</p>
                <p>Under 3 minutes per run</p>
              </div>
            </div>
          </div>

          {/* Savings callout */}
          <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-slate-400 text-sm">Annual savings</p>
              <p className="text-white text-3xl font-bold">$226,412</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">ROI multiplier</p>
              <p className="text-emerald-400 text-3xl font-bold">96×</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Payback period</p>
              <p className="text-blue-400 text-3xl font-bold">&lt; 1 day</p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
            >
              See live demo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why TinyFish ──────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-800">
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
              <div
                key={title}
                className={`border rounded-xl p-5 ${bg}`}
              >
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

      {/* ── Pricing ───────────────────────────────── */}
      <section className="py-20 px-6 border-t border-slate-800 bg-slate-900/40" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 text-sm font-semibold uppercase tracking-wider">
                Pricing
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-400">
              Start free. Cancel anytime. No per-check fees.
            </p>
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
      <section className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Built on TinyFish.
            <br />
            <span className="text-blue-400">Because coordinators deserve</span>
            <br />
            to do work that matters.
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            See the live demo — 15 patients, 5 payers, real TinyFish agent running.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base transition-colors shadow-lg shadow-blue-500/25"
            >
              <Zap className="w-5 h-5" />
              Open Live Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-slate-600 text-sm mt-6">
            @DiegoHurtad0 · #TinyFishAccelerator · #BuildInPublic
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
            Built for TinyFish $2M Pre-Accelerator Hackathon · March 2026 ·
            Diego Hurtado
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
