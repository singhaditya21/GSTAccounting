"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { matchBankStatement } from "./actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function BankReconciliationTab() {
  const [csvText, setCsvText] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleMatch = () => {
    if (!csvText) return;
    startTransition(async () => {
      const matches = await matchBankStatement(csvText);
      setResults(matches);
    });
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-md bg-white dark:bg-zinc-950 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" /> Vector Reconciliation Engine
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            Paste raw lines from your bank statement. The engine will use string similarity algorithms to automatically map them to open invoices.
          </p>
        </div>
        
        <Textarea 
          placeholder="04/03/2026, NEFT-HDFC-Reliance Industries, ₹45000..." 
          className="min-h-[150px] font-mono text-sm"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
        
        <Button onClick={handleMatch} disabled={isPending || !csvText} className="bg-indigo-600 hover:bg-indigo-700">
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Run Vector Match
        </Button>
      </div>

      {results.length > 0 && (
        <div className="border rounded-md bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead>Raw Bank Transaction String</TableHead>
                <TableHead>Predicted Invoice Match</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{r.transactionRaw}</TableCell>
                  <TableCell>
                    <Badge variant={r.invoiceNumber === "UNMATCHED" ? "destructive" : "outline"} className="font-mono">
                      {r.invoiceNumber}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{r.customerName}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${r.confidence > 80 ? 'text-emerald-600' : r.confidence > 45 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {r.confidence}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
