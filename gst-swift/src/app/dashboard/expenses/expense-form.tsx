"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { createExpense } from "./actions";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export function ExpenseFormSheet() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createExpense(data);
        toast.success("Expense logged & ledgers updated!");
        setOpen(false);
      } catch (error) {
        toast.error("Failed to log expense.");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-indigo-600 text-white hover:bg-indigo-700 h-9 rounded-md px-3 shadow-sm">
        <Plus className="w-4 h-4" />
        Log Expense
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Record New Expense</SheetTitle>
          <SheetDescription>
            Log vendor payments and internal expenses. ITC eligible taxes will automatically debit to the Input Tax Credit Ledger.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Expense Date *</Label>
              <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description / Vendor Name *</Label>
              <Input id="description" name="description" required placeholder="AWS Hosting / Office Supplies" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Base Amount (₹) *</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required placeholder="5000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxAmount">Tax Amount (₹)</Label>
                <Input id="taxAmount" name="taxAmount" type="number" step="0.01" defaultValue="0" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Checkbox id="isEligibleITC" name="isEligibleITC" defaultChecked={true} value="on" />
                <Label htmlFor="isEligibleITC" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  ITC Eligible (Input Tax Credit)
                </Label>
              </div>
              <p className="text-[10px] text-zinc-500 pl-6">Check this if you intend to claim GST input credit for this expense against your GSTR-3B.</p>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="isReverseCharge" name="isReverseCharge" value="on" />
                <Label htmlFor="isReverseCharge" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Subject to Reverse Charge (RCM)
                </Label>
              </div>
              <p className="text-[10px] text-zinc-500 pl-6">Check this if the liability to pay tax falls on you instead of the supplier (e.g. GTA services).</p>
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isPending ? "Connecting to Ledger..." : "Save Expense & Ledger"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
