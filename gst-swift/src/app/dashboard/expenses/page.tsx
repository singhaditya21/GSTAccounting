import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { AiOcrUploader } from "@/components/expenses/ai-ocr-uploader";
import { getTranslations } from "next-intl/server";
import { enforceRoleAccess } from "@/lib/auth-guard";

export default async function ExpensesPage() {
  const t = await getTranslations("Sidebar");

  const { member, isAuthorized, UnauthorizedNode } = await enforceRoleAccess(["OWNER", "ACCOUNTANT", "BRANCH_MANAGER"]);
  if (!isAuthorized || !member) return UnauthorizedNode;

  const expenses = await db.expense.findMany({
    where: { orgId: member.orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t("expenses")}</h1>
          <p className="text-zinc-500 text-sm">Manage vendor payments, internal cost tracking, and RCM compliances.</p>
        </div>
        {/* We keep the manual sheet as a fallback if AI isn't wanted */}
      </div>

      <div className="mb-6">
        <AiOcrUploader orgId={member.orgId} />
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md shadow-sm overflow-hidden transition-all">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Base Amount</TableHead>
              <TableHead className="text-right">Input Tax (GST)</TableHead>
              <TableHead>ITC Status</TableHead>
              <TableHead>RCM Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors group">
                <TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400 align-middle">
                  {expense.date.toISOString().split("T")[0]}
                </TableCell>
                <TableCell className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {expense.description}
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-zinc-800 dark:text-zinc-200">
                  {formatCurrency(expense.amount, expense.currency)}
                </TableCell>
                <TableCell className="text-right font-mono text-zinc-600 dark:text-zinc-400">
                  {expense.taxAmount > 0 ? formatCurrency(expense.taxAmount, expense.currency) : "-"}
                </TableCell>
                <TableCell>
                  {expense.taxAmount > 0 && expense.isEligibleITC && !expense.isReverseCharge ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">ITC Eligible</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-zinc-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">Ineligible</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {expense.isReverseCharge ? (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">Reverse Charge Act</Badge>
                  ) : (
                    <span className="text-zinc-400 text-sm ml-2">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-500 font-medium tracking-wide">
                  No expenses recorded. Run your business by logging vendor costs!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
