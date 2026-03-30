import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { GlobalChatWidget } from "@/components/layout/chat-widget";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { IdleTimeoutListener } from "@/components/auth/idle-timeout-listener";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Ensure they have completed onboarding
  const member = await db.organizationMember.findFirst({
    where: { userId },
    include: { organization: { include: { tenantSettings: true } } },
  });

  if (!member) {
    redirect("/onboarding");
  }

  const user = await currentUser();
  const currentEmail = user?.emailAddresses[0]?.emailAddress?.toLowerCase() || "";
  const adminEmailsList = (process.env.PLATFORM_ADMIN_EMAILS || "singhaditya21@gmail.com").toLowerCase().split(",");
  const isPlatformAdmin = adminEmailsList.includes(currentEmail);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      <Sidebar orgName={member.organization.name} isPlatformAdmin={isPlatformAdmin} />
      <div className="flex-1 flex flex-col pl-[250px]">
        {/* Global Dashboard Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md flex items-center justify-end px-8 z-10 sticky top-0">
          <LanguageSwitcher />
        </header>
        
        {/* Main Content Area */}
        <main className="p-8 flex-1">{children}</main>
      </div>
      <Toaster />
      <GlobalChatWidget orgId={member.orgId} />
      <IdleTimeoutListener timeoutMinutes={member.organization.tenantSettings?.idleTimeoutMinutes || 30} />
    </div>
  );
}
