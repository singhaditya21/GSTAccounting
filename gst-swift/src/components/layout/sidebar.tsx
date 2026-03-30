"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  Receipt, 
  Landmark, 
  ShieldCheck,
  Settings,
  Bot,
  ShieldAlert
} from "lucide-react";
import { useTranslations } from "next-intl";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "parties", href: "/dashboard/customers", icon: Users },
  { key: "items", href: "/dashboard/products", icon: Package },
  { key: "invoices", href: "/dashboard/invoices", icon: FileText },
  { key: "expenses", href: "/dashboard/expenses", icon: Receipt },
  { key: "accounting", href: "/dashboard/accounting", icon: Landmark },
  { key: "compliance", href: "/dashboard/compliance", icon: ShieldCheck },
  { key: "settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ orgName, isPlatformAdmin }: { orgName: string, isPlatformAdmin?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  return (
    <div className="fixed inset-y-0 left-0 w-[250px] bg-zinc-950 text-zinc-300 border-r border-zinc-800 flex flex-col shadow-xl z-50">
      <div className="p-6 border-b border-zinc-800/60 bg-zinc-950/50 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-1 rounded-md text-sm shadow-sm ring-1 ring-white/10">GS</span>
          GSTSwift
        </h2>
        <p className="text-[10px] text-zinc-500 mt-2 truncate font-semibold uppercase tracking-widest pl-1">
          {orgName}
        </p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive 
                  ? "bg-indigo-600/15 text-indigo-400 font-medium shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] ring-1 ring-indigo-500/20" 
                  : "hover:bg-zinc-900/80 hover:text-zinc-100"
              }`}
            >
              <item.icon className={`w-4 h-4 transition-colors ${isActive ? "text-indigo-400 drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]" : "text-zinc-500 group-hover:text-zinc-300"}`} />
              {t(item.key as any)}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-3">
        {isPlatformAdmin && (
           <Link href="/admin">
              <button className="w-full flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-900 text-rose-400 py-2 rounded-md text-xs font-bold transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                 <ShieldAlert className="w-4 h-4" /> Global Control Panel
              </button>
           </Link>
        )}
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{t("version")}</span>
        </div>
      </div>
    </div>
  );
}
