import { db } from "@/lib/db";
import { CustomerFormSheet } from "./customer-form-sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { enforceRoleAccess } from "@/lib/auth-guard";

export default async function CustomersPage() {
  const { member, isAuthorized, UnauthorizedNode } = await enforceRoleAccess(["OWNER", "ACCOUNTANT", "BRANCH_MANAGER"]);
  if (!isAuthorized || !member) return UnauthorizedNode;

  const customers = await db.customer.findMany({
    where: { orgId: member.orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Parties</h1>
          <p className="text-zinc-500 text-sm">Manage your registered customers and suppliers for B2B & B2C invoicing.</p>
        </div>
        <CustomerFormSheet />
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-sm overflow-hidden transition-all">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableHead>Legal Name</TableHead>
              <TableHead>GSTIN / PAN</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors group">
                <TableCell className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {customer.legalName}
                </TableCell>
                <TableCell>
                  {customer.gstin ? (
                    <span className="font-mono text-sm px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-700 dark:text-zinc-300">{customer.gstin}</span>
                  ) : (
                    <span className="text-zinc-400 text-sm italic">Unregistered ({customer.pan || "No PAN"})</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono bg-white dark:bg-zinc-900">{customer.billingState}</Badge>
                </TableCell>
                <TableCell>
                  {customer.gstin ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">Registered Business</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-zinc-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">Unregistered Consumer</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                  No parties found. Click &quot;Add Party&quot; to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
