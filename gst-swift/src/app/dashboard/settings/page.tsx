import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsForm } from "./settings-form";
import { SaaSUpgradeButton } from "@/components/SaaSUpgradeButton";
import { enforceRoleAccess } from "@/lib/auth-guard";

export default async function SettingsPage() {
  const { member, isAuthorized, UnauthorizedNode } = await enforceRoleAccess(["OWNER"]);
  if (!isAuthorized || !member) return UnauthorizedNode;

  const orgData = await db.organization.findUnique({
    where: { id: member.orgId },
    include: { tenantSettings: true }
  });

  // Ensure settings exist (auto-create if missing for legacy orgs)
  let settings = orgData?.tenantSettings;
  if (!settings) {
    settings = await db.tenantSettings.create({
      data: { orgId: member.orgId }
    });
  }
  // Extract God-Mode Global Limits
  let platformOpts = await db.platformSettings.findUnique({ where: { id: "GLOBAL" } });
  if (!platformOpts) {
    platformOpts = await db.platformSettings.create({ data: { id: "GLOBAL", maxIdleTimeoutMinutes: 60 } });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SaaS Settings</h1>
        <p className="text-zinc-500">Manage Subscription Quotas, Automation Hooks, and General Tenant Configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Tier</CardTitle>
              <CardDescription>Your current active plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 justify-between">
                <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 uppercase text-sm font-bold shadow-lg shadow-indigo-500/20">
                  {settings.subscriptionTier}
                </Badge>
                {settings.subscriptionTier !== "PRO" && <SaaSUpgradeButton />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI OCR Quota</CardTitle>
              <CardDescription>Llama 3.2 Vision Automations Available.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black tabular-nums tracking-tighter text-emerald-500">{settings.aiOcrTokensRemaining}</span>
                <span className="text-sm font-medium text-zinc-500 uppercase mb-1">Tokens</span>
              </div>
              {settings.aiOcrTokensRemaining <= 2 && (
                <p className="text-xs text-rose-500 font-bold mt-3 bg-rose-50 px-2 py-1 rounded w-fit">Upgrade required to resume Automation.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <SettingsForm initialData={settings} maxIdle={platformOpts.maxIdleTimeoutMinutes} />
        </div>
      </div>
    </div>
  );
}
