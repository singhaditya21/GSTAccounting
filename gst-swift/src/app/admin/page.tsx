import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TenantManualOverride } from "@/components/admin/tenant-manual-override";
import { PlatformSettingsCard } from "@/components/admin/PlatformSettingsCard";

export default async function AdminDashboardPage() {
  // 1. Unconstrained Global Data Fetching (God-Mode)
  const allOrganizations = await db.organization.findMany({
    include: {
      tenantSettings: true,
      members: true
    },
    orderBy: { createdAt: "desc" }
  });

  // Calculate high-level MRR approximations for Platform Revenue
  const activeProCount = allOrganizations.filter(o => o.tenantSettings?.subscriptionTier === "PRO").length;
  const activeEnterpriseCount = allOrganizations.filter(o => o.tenantSettings?.subscriptionTier === "ENTERPRISE").length;
  
  const mrrPro = activeProCount * 999;
  const mrrEnterprise = activeEnterpriseCount * 1999;
  const totalMRR = mrrPro + mrrEnterprise;

  let platformOpts = await db.platformSettings.findUnique({ where: { id: "GLOBAL" } });
  if (!platformOpts) {
    platformOpts = await db.platformSettings.create({ data: { id: "GLOBAL", maxIdleTimeoutMinutes: 60 } });
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
       <div>
         <h1 className="text-3xl font-black text-rose-950 dark:text-rose-100 flex items-center gap-3">
            SaaS Telemetry
            <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 px-2 py-0">LIVE PRODUCTION</Badge>
         </h1>
         <p className="text-zinc-600 dark:text-zinc-400 font-medium">Global Multi-Tenant Matrix & MRR Tracking</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="border-rose-100 shadow-md bg-white dark:bg-zinc-900 border-t-4 border-t-rose-500">
           <CardHeader className="pb-2">
             <CardTitle className="text-rose-950 dark:text-rose-100">Monthly Recurring Revenue</CardTitle>
             <CardDescription>Aggregate SaaS Earnings across all active paying Tenants.</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="text-5xl font-black tabular-nums tracking-tighter text-emerald-600 dark:text-emerald-400">
               ₹{totalMRR.toLocaleString("en-IN")}
             </div>
             <p className="text-sm font-bold mt-2 text-zinc-500">+{activeProCount} PRO, +{activeEnterpriseCount} ENTERPRISE</p>
           </CardContent>
         </Card>

         <Card className="border-rose-100 shadow-md bg-white dark:bg-zinc-900">
           <CardHeader className="pb-2">
             <CardTitle>Total Organizations</CardTitle>
             <CardDescription>Active Root Tenants registered.</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="text-5xl font-black tabular-nums tracking-tighter">
               {allOrganizations.length}
             </div>
           </CardContent>
         </Card>
         <Card className="border-rose-100 shadow-md bg-white dark:bg-zinc-900">
           <CardHeader className="pb-2">
             <CardTitle>Platform Utilization</CardTitle>
             <CardDescription>Total AI OCR Tokens sitting inside Tenant wallets.</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="text-5xl font-black tabular-nums tracking-tighter text-indigo-500">
               {allOrganizations.reduce((acc, org) => acc + (org.tenantSettings?.aiOcrTokensRemaining || 0), 0)}
             </div>
           </CardContent>
         </Card>
       </div>

       <div>
         <h2 className="text-xl font-bold mb-4">Master Tenant Directory</h2>
         <div className="border border-rose-200 dark:border-rose-900/40 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-zinc-950">
           <Table>
             <TableHeader className="bg-rose-50 dark:bg-rose-950/20">
               <TableRow>
                 <TableHead>Organization Name</TableHead>
                 <TableHead>Members</TableHead>
                 <TableHead>SaaS Tier</TableHead>
                 <TableHead>Llama Quota</TableHead>
                 <TableHead className="text-right">Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
                {allOrganizations.map(org => {
                  const settings = org.tenantSettings;
                  return (
                    <TableRow key={org.id} className="hover:bg-rose-50/50">
                      <TableCell>
                        <div className="font-bold text-base">{org.name}</div>
                        <div className="font-mono text-[10px] text-zinc-400 mt-1">{org.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-zinc-100">{org.members.length} Users</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`uppercase font-bold ${settings?.subscriptionTier === 'PRO' ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-zinc-300 text-zinc-800'}`}>
                          {settings?.subscriptionTier || "UNKNOWN"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-zinc-500">
                        {settings?.aiOcrTokensRemaining} <span className="text-xs">Left</span>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                         <TenantManualOverride org={org} />
                      </TableCell>
                    </TableRow>
                  );
                })}
             </TableBody>
           </Table>
         </div>
       </div>

       <div>
         <PlatformSettingsCard initialMaxIdle={platformOpts.maxIdleTimeoutMinutes} />
       </div>
    </div>
  );
}
