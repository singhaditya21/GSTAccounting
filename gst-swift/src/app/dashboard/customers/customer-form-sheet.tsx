"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { createCustomer } from "./actions";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function CustomerFormSheet() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createCustomer(data);
        toast.success("Customer added successfully!");
        setOpen(false);
      } catch (error) {
        toast.error("Failed to add customer. Check your connection or constraints.");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-indigo-600 text-white hover:bg-indigo-700 h-9 rounded-md px-3 shadow-sm">
          <Plus className="w-4 h-4" />
          Add Party
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Customer / Supplier</SheetTitle>
          <SheetDescription>
            Enter their GST and billing details. The state code is crucial for PoS calculations.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name *</Label>
              <Input id="legalName" name="legalName" required placeholder="Rajesh Enterprises" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN (Optional)</Label>
                <Input id="gstin" name="gstin" placeholder="27ABCDE1234..." className="uppercase" maxLength={15} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" name="pan" placeholder="ABCDE1234F" className="uppercase" maxLength={10} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingAddress">Billing Address *</Label>
              <Input id="billingAddress" name="billingAddress" required placeholder="123 Market Road" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingState">State Code * (e.g., MH)</Label>
                <Input id="billingState" name="billingState" required maxLength={2} className="uppercase" placeholder="MH" />
                <p className="text-[10px] text-zinc-500">2-letter GST state code.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingPincode">Pincode *</Label>
                <Input id="billingPincode" name="billingPincode" required maxLength={6} placeholder="400001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency" className="text-zinc-600 dark:text-zinc-400">Default Currency</Label>
                <select id="defaultCurrency" name="defaultCurrency" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                   <option value="INR">INR (₹)</option>
                   <option value="USD">USD ($)</option>
                   <option value="EUR">EUR (€)</option>
                   <option value="GBP">GBP (£)</option>
                   <option value="AED">AED (د.إ)</option>
                </select>
                <p className="text-[10px] text-zinc-500">Auto-applies when drafting Invoices.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredLanguage" className="text-zinc-600 dark:text-zinc-400">Invoice Language</Label>
                <select id="preferredLanguage" name="preferredLanguage" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                   <option value="en">English (US)</option>
                   <option value="es">Español (ES)</option>
                   <option value="hi">Hindi (IN)</option>
                   <option value="fr">Français (FR)</option>
                   <option value="ar">Arabic (AE)</option>
                </select>
                <p className="text-[10px] text-zinc-500">Translates PDF dynamically.</p>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isPending ? "Saving..." : "Save Party"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
