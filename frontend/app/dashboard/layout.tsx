import {
  Stethoscope,
  LayoutDashboard,
  Users,
  Bell,
  ExternalLink,
  Activity,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Patients", icon: Users, active: false },
  { label: "Alerts", icon: Bell, active: false },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full flex bg-slate-950">
      {/* ── Fixed Sidebar ─────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
        {/* Logo — links back to landing */}
        <div className="px-6 py-5 border-b border-slate-800">
          <Link href="/" className="block group">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-base leading-tight group-hover:text-blue-400 transition-colors">
                PriorAuth Pulse
              </span>
            </div>
            <p className="text-slate-400 text-xs pl-11 font-medium tracking-wide">
              50 portals. 2 min. $199/mo.
            </p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Live indicator */}
        <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold">
              System Operational
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5 pl-5.5">
            Checks every 4 hours
          </p>
        </div>

        {/* Footer — TinyFish attribution + GitHub */}
        <div className="px-4 py-4 border-t border-slate-800 space-y-2">
          <a
            href="https://tinyfish.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors group"
          >
            <span className="text-xs">Powered by</span>
            <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300">
              TinyFish
            </span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <p className="text-slate-600 text-xs">81% accuracy on Mind2Web</p>
          <a
            href="https://github.com/DiegoHurtad0/priorauth-pulse-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-400 transition-colors"
          >
            <span className="text-xs">#BuildInPublic</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
