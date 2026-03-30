"use client";

import { useState } from "react";
import { Camera, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { createExpenseFromOcr } from "@/app/dashboard/expenses/actions";

export function AiOcrUploader({ orgId }: { orgId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const base64String = (event.target?.result as string).split(',')[1];

      setIsUploading(true);
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64String, orgId })
        });
        
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        
        setExtractedData(json.data);
        toast.success("Llama-3.2 Vision extracted details perfectly!");
      } catch (err: any) {
        toast.error(err.message || "Failed to parse receipt visually.");
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleDraftToDatabase = async () => {
    try {
      if (!extractedData) return;
      await createExpenseFromOcr(extractedData);
      toast.success("Succesfully mapped OCR text to Ledger!");
      setExtractedData(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to draft entry.");
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-950 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Camera className="w-32 h-32" />
      </div>
      
      <div className="relative z-10 flex flex-col items-start gap-4 h-full min-h-[160px]">
        <div>
          <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-400 flex items-center gap-2">
            <Camera className="w-5 h-5" /> AI Vision OCR (Receipts)
          </h2>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm">Capture a JPEG of a supplier bill. Our Llama 3.2 VLM instantly reads the typography and extracts Amount, GSTIN, and Date into your ledger without typing.</p>
        </div>

        {!extractedData ? (
          <div className="mt-auto w-full">
            <label className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md cursor-pointer transition-colors text-sm font-medium shadow-sm">
              {isUploading ? "Scanning Pixels via VLM..." : "Upload Receipt Image"}
              <input type="file" accept="image/jpeg, image/png" onChange={handleFileChange} className="hidden" disabled={isUploading} />
            </label>
          </div>
        ) : (
          <div className="mt-4 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between border-b pb-2 mb-2">
              <span className="text-xs text-zinc-500 uppercase font-semibold">LLM Extraction</span>
              <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50"><CheckCircle2 className="w-3 h-3 mr-1"/> Validated</Badge>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mt-3">
              <div>
                 <span className="text-xs text-zinc-400 block mb-1">Total Amount</span>
                 <span className="font-mono font-medium">₹{extractedData.amount || "0.00"}</span>
              </div>
              <div>
                 <span className="text-xs text-zinc-400 block mb-1">Tax Found</span>
                 <span className="font-mono font-medium text-indigo-500">₹{extractedData.taxAmount || "0.00"}</span>
              </div>
              <div>
                 <span className="text-xs text-zinc-400 block mb-1">GSTIN</span>
                 <span className="font-mono text-xs">{extractedData.gstin || "Not Detected"}</span>
              </div>
              <div>
                 <span className="text-xs text-zinc-400 block mb-1">Date</span>
                 <span className="font-medium text-xs">{extractedData.date || "Unknown"}</span>
              </div>
            </div>
            
            <Button className="w-full mt-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" onClick={handleDraftToDatabase}>
              Draft Expense to Database
            </Button>
            <Button variant="ghost" className="w-full mt-1 text-xs text-zinc-500 hover:text-red-500 h-8" onClick={() => setExtractedData(null)}>
              Reset Image
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
