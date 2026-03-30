"use client";

import { useState } from "react";
import { Download, FileJson, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadGstr1 } from "@/app/actions/compliance-actions";
import { toast } from "sonner";

export default function ComplianceHub() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const jsonData = await downloadGstr1(selectedMonth, selectedYear);
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GSTR1_${selectedMonth}_${selectedYear}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("GSTR-1 JSON Compiled successfully for the Portal!");
    } catch (e: any) {
      toast.error(e.message || "Failed to compile GST data.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
          <FileJson className="w-8 h-8 text-indigo-500" />
          Compliance & Returns Hub
        </h1>
        <p className="text-zinc-500 text-sm">Automate your rigorous Government Tax Portal filings by transcribing your ledgers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/60 dark:bg-zinc-950/60 p-6 shadow-sm backdrop-blur-md">
          <h2 className="text-lg font-semibold mb-2">GSTR-1 Engine (Outbound Sales)</h2>
          <p className="text-sm text-zinc-500 mb-6">Instantly compile all B2B/B2C Outward tax invoices into the mathematically pure JSON schema required by the GST portal.</p>
          
          <div className="flex items-center gap-4 mb-6">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[2024, 2025, 2026, 2027].map(yr => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          </div>

          <Button 
            onClick={handleDownload} 
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20"
          >
            {isGenerating ? "Compiling Cryptography..." : "Generate GSTR-1 JSON"}
            {!isGenerating && <Download className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10 p-6 flex flex-col justify-center opacity-70">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            GSTR-3B Final Reckoning <CheckCircle2 className="w-4 h-4 text-emerald-500 hidden" />
          </h2>
          <p className="text-sm text-zinc-500">Cross-reference Output Tax against GSTR-2A Input Credits to finalize net tax payment JSON payloads. (Enterprise Scale Release)</p>
          <div className="mt-4"><span className="text-xs bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded-md text-zinc-600 dark:text-zinc-400 font-medium tracking-wide">COMING PHASE 2</span></div>
        </div>
      </div>
    </div>
  );
}
