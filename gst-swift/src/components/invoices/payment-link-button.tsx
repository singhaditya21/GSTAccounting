"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function PaymentLinkButton({ invoiceId, existingLink }: { invoiceId: string, existingLink?: string | null }) {
  const [isLoading, setIsLoading] = useState(false);
  const [link, setLink] = useState<string | null>(existingLink || null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Payment Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setLink(data.paymentLink);
      toast.success("Active UPI/Card link generated securely!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={link ? "default" : "outline"} 
      size="sm" 
      onClick={handleGenerateLink} 
      disabled={isLoading}
      className={link ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
    >
      {isLoading ? (
        "Syncing..."
      ) : link ? (
        copied ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</> : <><Copy className="w-4 h-4 mr-2" /> Copy Link</>
      ) : (
        <><LinkIcon className="w-4 h-4 mr-2" /> Get Link</>
      )}
    </Button>
  );
}
