"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings2, ShieldCheck, Users } from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: "Tenant Core", href: "/dashboard/settings", icon: Settings2 },
    { name: "Identity & RBAC", href: "/dashboard/settings/rbac", icon: ShieldCheck },
    { name: "Team Provisioning", href: "/dashboard/settings/team", icon: Users },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 h-full">
      <div className="w-full md:w-64 space-y-2">
        {tabs.map(tab => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800" 
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? "" : "opacity-70"}`} />
              {tab.name}
            </Link>
          );
        })}
      </div>
      
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
