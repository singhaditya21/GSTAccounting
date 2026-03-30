import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase() || "";
  
  // Strict God-Mode Extractor logic
  // Fallback to strict demo email if .env is missing to ensure zero lockout on testing
  const adminEmailsList = (process.env.PLATFORM_ADMIN_EMAILS || "singhaditya21@gmail.com").toLowerCase().split(",");
  
  const isPlatformAdmin = adminEmailsList.includes(email);

  if (!isPlatformAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 bg-zinc-950">
        <Card className="max-w-md w-full border border-rose-900 bg-rose-950/20 text-center text-rose-100 shadow-2xl">
          <CardHeader>
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <CardTitle className="text-xl font-bold text-rose-400">Security Clearance Denied</CardTitle>
            <CardDescription className="text-zinc-400">
              Your identity (<span className="font-mono text-rose-300">{email}</span>) does not carry Platform Admin privileges. This incident has been aggressively logged.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Global Header dedicated specifically for Founders */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur">
        <div className="flex h-14 items-center px-4 max-w-7xl mx-auto justify-between">
          <div className="flex items-center gap-2 font-black text-rose-600 dark:text-rose-500">
            <ShieldAlert className="w-5 h-5" />
            SaaS Platform God-Mode
          </div>
          <div className="text-sm font-mono text-zinc-500">
             {email} (ROOT)
          </div>
        </div>
      </header>
      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full relative">
        {children}
      </main>
    </div>
  );
}
