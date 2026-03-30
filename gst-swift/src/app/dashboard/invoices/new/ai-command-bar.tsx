"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { generateInvoiceFromText } from "./ai-actions";

interface AiCopilotProps {
  onAiParsed: (data: { customerId: string, items: any[] }) => void;
}

export function AiCommandBar({ onAiParsed }: AiCopilotProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSpark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError("");

    try {
      const parsedData = await generateInvoiceFromText(prompt);
      
      if (parsedData.customerId || (parsedData.items && parsedData.items.length > 0)) {
        onAiParsed(parsedData);
        setPrompt(""); // Clear indicating success
      } else {
        setError("AI could not map any entities to your request.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong parsing AI command.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSpark} className="mb-8 p-1 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20">
      <div className="bg-white dark:bg-zinc-950 rounded-lg p-2 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-indigo-500 ml-2 animate-pulse" />
        <Input 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Magic Draft: 'Create an invoice for Reliance for 5 laptops at 45,000 each...'" 
          className="border-0 bg-transparent ring-0 focus-visible:ring-0 shadow-none text-base"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !prompt.trim()} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shrink-0 transition-all font-bold tracking-tight"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Auto-Draft"}
        </Button>
      </div>
      {error && <p className="text-red-500 text-xs px-3 pt-2 font-medium bg-white dark:bg-zinc-950 pb-2 rounded-b-lg -mt-2">{error}</p>}
    </form>
  );
}
