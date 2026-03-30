import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { PaymentLinkButton } from "@/components/invoices/payment-link-button";
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button";
import { enforceRoleAccess } from "@/lib/auth-guard";

export default async function InvoicesPage() {
  const { member, isAuthorized, UnauthorizedNode } = await enforceRoleAccess(["OWNER", "ACCOUNTANT", "BRANCH_MANAGER"]);
  if (!isAuthorized || !member) return UnauthorizedNode;

  const orgData = await db.organization.findUnique({
    where: { id: member.orgId },
    include: { rolePolicies: true }
  });

  const policy = orgData?.rolePolicies.find(p => p.roleName === member.role);
  const canDelete = member.role === "OWNER" || (policy?.permissions.includes("INVOICE_DELETE") ?? false);

  let invoiceQueryFilter: any = { orgId: member.orgId };

  // Enterprise RBAC: Isolate Branch Managers down to their assigned territory
  if (member.role === "BRANCH_MANAGER" && member.branchId) {
    invoiceQueryFilter.branchId = member.branchId;
  }

  const invoices = await db.invoice.findMany({
    where: invoiceQueryFilter,
    include: {
      customer: true,
      branch: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Invoices</h1>
          <p className="text-zinc-500">View and manage B2B/B2C Tax invoices and generate PDFs</p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </Link>
      </div>

      <div className="border rounded-md bg-white dark:bg-zinc-950/50 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableHead>Invoice No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>PoS (State)</TableHead>
              <TableHead className="text-right">Grand Total</TableHead>
              <TableHead className="text-right">Razorpay</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <div className="font-mono text-sm font-medium">{invoice.number}</div>
                  <Badge variant={invoice.status === "PAID" ? "default" : "outline"} className={`mt-1 text-[10px] ${invoice.status === "PAID" ? "bg-emerald-500 hover:bg-emerald-600 border-none" : ""}`}>{invoice.status}</Badge>
                </TableCell>
                <TableCell>
                  {invoice.date.toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{invoice.customer.legalName}</div>
                  {invoice.customer.gstin && <div className="text-xs text-zinc-500">{invoice.customer.gstin}</div>}
                </TableCell>
                <TableCell>
                  <span className="font-mono">{invoice.placeOfSupply}</span>
                  {invoice.placeOfSupply !== invoice.branch.state ? (
                    <Badge className="ml-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">IGST</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">CGST/SGST</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {new Intl.NumberFormat(
                    invoice.customer.preferredLanguage === "hi" ? "en-IN" : "en-US", 
                    { style: 'currency', currency: invoice.currency }
                  ).format(invoice.grandTotal)}
                </TableCell>
                <TableCell className="text-right">
                  {invoice.status !== "PAID" ? (
                    <PaymentLinkButton invoiceId={invoice.id} existingLink={invoice.razorpayPaymentLinkId} />
                  ) : (
                    <Badge variant="outline" className="text-zinc-500 border-zinc-200">Reconciled</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right flex items-center justify-end gap-1">
                  <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                  {member && <DeleteInvoiceButton invoiceId={invoice.id} disabled={!canDelete} />}
                </TableCell>
              </TableRow>
            ))}
            
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                  No invoices generated yet. Click &quot;Create Invoice&quot; to start billing.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
