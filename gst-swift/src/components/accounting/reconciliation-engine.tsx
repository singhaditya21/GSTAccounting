"use client";

import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function ReconciliationEngine({ orgId }: { orgId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleReconcile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResults(null);

    try {
      // Typically, parsing CSV happens here. For brevity, converting simple text.
      const csvText = await file.text();
      
      const res = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData: csvText, orgId })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setResults(json.data);
      toast.success("AI Logic Engine processed statement successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to process bank statement.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-white/50 dark:bg-zinc-950/50 shadow-sm col-span-2">
      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
        <RefreshCw className="w-6 h-6 text-indigo-500" />
        <div>
          <h2 className="text-lg font-semibold">AI Auto-Reconciliation</h2>
          <p className="text-sm text-zinc-500">Upload ICICI/HDFC CSVs to auto-match thousands of records via Fuzzy Name/Amount logic.</p>
        </div>
      </div>

      {!results ? (
        <div className="space-y-4">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleUpload}
            className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
          />
          <Button 
            onClick={handleReconcile} 
            disabled={!file || isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isProcessing ? "AI Analyzing Matrix..." : "Commence Fuzzy Match"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {results.matches && results.matches.map((m: any, idx: number) => (
             <div key={idx} className="flex flex-col p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900">
               <div className="flex justify-between items-start">
                  <span className="font-mono text-xs">{m.bankNarrative}</span>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600">Matched {m.confidenceScore}%</Badge>
               </div>
               <div className="mt-2 text-sm flex gap-2 items-center text-emerald-700 dark:text-emerald-400">
                 <CheckCircle2 className="w-4 h-4" /> 
                 Assigned to Invoice ID: <b>{m.matchedInvoiceId}</b>
               </div>
             </div>
          ))}

          {results.unmatchedCredits && results.unmatchedCredits.map((um: string, idx: number) => (
             <div key={`u-${idx}`} className="flex flex-col p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
               <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-amber-800 dark:text-amber-500">{um}</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">Unmatched</Badge>
               </div>
               <div className="mt-2 text-xs flex gap-2 items-center text-amber-700">
                 <AlertCircle className="w-3 h-3" /> 
                 AI could not find an unpaid invoice matching this magnitude or name.
               </div>
             </div>
          ))}

          <Button variant="outline" onClick={() => { setFile(null); setResults(null); }} className="w-full mt-4">
            Upload Another Statement
          </Button>
        </div>
      )}
    </div>
  );
}
