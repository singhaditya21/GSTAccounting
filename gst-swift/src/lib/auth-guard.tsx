import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export async function enforceRoleAccess(allowedRoles: string[]) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const member = await db.organizationMember.findFirst({
    where: { userId },
    include: { organization: true }
  });

  if (!member) redirect("/onboarding");

  // If God Mode Founder, theoretically override, but standard RBAC applies for now
  if (!allowedRoles.includes(member.role)) {
    return {
      isAuthorized: false,
      UnauthorizedNode: (
        <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center p-4">
          <Card className="max-w-md w-full border border-rose-900 bg-rose-950/20 text-center text-rose-100 shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <CardTitle className="text-xl font-bold text-rose-400">Strict Clearance Denied</CardTitle>
              <CardDescription className="text-zinc-400">
                Your designated Role (<span className="font-mono font-bold text-rose-300">{member.role}</span>) does not carry authorizations into this Core Engine.
                <br /><br />
                <span className="text-xs">Required Policies: {allowedRoles.join(" | ")}</span>
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )
    };
  }

  return { isAuthorized: true, member };
}
