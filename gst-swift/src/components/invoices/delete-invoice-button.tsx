"use client";

import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTransition } from "react";
import { deleteInvoice } from "@/app/dashboard/invoices/actions";

export function DeleteInvoiceButton({ invoiceId, disabled }: { invoiceId: string, disabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to permanently delete this Invoice? This cannot be undone.")) {
      startTransition(async () => {
        try {
          await deleteInvoice(invoiceId);
          toast.success("Invoice deleted permanently.");
        } catch (error: any) {
          toast.error(error.message || "Failed to delete.");
        }
      });
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending || disabled} title={disabled ? "Accountants cannot delete Invoices" : "Delete Document"}>
      {isPending ? <Loader2 className="w-4 h-4 text-rose-500 animate-spin" /> : <Trash2 className={`w-4 h-4 ${disabled ? 'text-zinc-300' : 'text-rose-500'}`} />}
    </Button>
  );
}
