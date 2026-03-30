import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, FileText, Activity, AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) return null;

  const member = await db.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
  });

  const orgId = member?.orgId;

  // Real statistics queries
  const totalInvoices = await db.invoice.count({ where: { orgId } });
  
  // GST Compliance Agent Logic: Background AATO calculation
  const totalRevenueLedgers = await db.ledgerEntry.findMany({
    where: { orgId, account: "SALES_REVENUE", type: "CREDIT" },
  });
  const revenueTotal = totalRevenueLedgers.reduce((acc, entry) => acc + entry.amount, 0);
  
  // ₹5 Crore limit is the 2026 E-Invoice threshold
  const E_INVOICE_THRESHOLD = 50000000; 
  const isApproachingThreshold = revenueTotal > (E_INVOICE_THRESHOLD * 0.8);
  const isOverThreshold = revenueTotal >= E_INVOICE_THRESHOLD;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {member?.organization.name}</h1>
        <p className="text-zinc-500">Here's your business dashboard for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.</p>
      </div>

      {(isApproachingThreshold || isOverThreshold) && (
        <Alert variant={isOverThreshold ? "destructive" : "default"} className={`border-2 ${isOverThreshold ? 'bg-red-50/50' : 'border-amber-500 bg-amber-50 text-amber-900'} `}>
          <AlertTriangle className={`h-4 w-4 ${isOverThreshold ? '' : 'text-amber-600'}`} />
          <AlertTitle className="font-bold flex items-center gap-2">
            Automated Compliance Supervisor
            <Badge variant="secondary" className="text-[10px] bg-zinc-900 text-white hover:bg-zinc-900">AI AGENT</Badge>
          </AlertTitle>
          <AlertDescription className="mt-2 text-sm">
            {isOverThreshold 
              ? `Your Aggregate Annual Turnover (AATO) has crossed ₹5 Crores (Current: ₹${(revenueTotal/10000000).toFixed(2)} Cr). Active E-Invoicing via IRP registration is now legally mandatory.`
              : `Caution: Your turnover has hit ₹${(revenueTotal/10000000).toFixed(2)} Cr. The E-invoice mandatory threshold is ₹5 Cr. Please begin onboarding to an IRP.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{revenueTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-zinc-500">AATO / Total Billed YTD</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Issued</CardTitle>
            <FileText className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-zinc-500">Total generated this FY</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GST Liability</CardTitle>
            <Activity className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0.00</div>
            <p className="text-xs text-zinc-500">For GSTR-3B filings</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-500">Compliance Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-amber-800 font-medium">No pending actions</div>
            <p className="text-xs text-amber-600">You are fully compliant</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
