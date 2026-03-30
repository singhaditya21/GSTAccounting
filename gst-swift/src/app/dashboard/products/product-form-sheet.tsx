"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { createProduct } from "./actions";
import { suggestHsn } from "./ai-actions";
import { Plus, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

export function ProductFormSheet() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "", description: "", hsnSac: "", unit: "NOS", gstRate: "18", defaultPrice: "", isService: false
  });

  const handleAiSuggest = async () => {
    if (!formData.name) return toast.error("Enter a product name first");
    setIsAiLoading(true);
    const result = await suggestHsn(formData.name);
    setIsAiLoading(false);

    if (result && result.hsn) {
      setFormData(prev => ({
        ...prev,
        hsnSac: result.hsn,
        gstRate: result.rate?.toString() || "18",
        description: result.description || prev.description,
        isService: result.isService || false,
        unit: result.isService ? "SRV" : "NOS"
      }));
      toast.success("AI Classification Applied!");
    } else {
      toast.error("Failed to classify item.");
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createProduct(data as unknown as FormData);
        toast.success("Item saved successfully!");
        setOpen(false);
      } catch (error) {
        toast.error("Failed to add Item. Please verify details.");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Goods / Services</SheetTitle>
          <SheetDescription>
            Enter the details of the product or service you supply, including HSN/SAC code and GST Rate.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <div className="flex gap-2">
                <Input id="name" name="name" required placeholder="Wireless Earphones" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <Button type="button" variant="outline" size="icon" onClick={handleAiSuggest} disabled={isAiLoading || !formData.name}>
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-amber-500" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input id="description" name="description" placeholder="Bluetooth 5.0, Noise Cancelling" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hsnSac">HSN / SAC Code *</Label>
                <Input id="hsnSac" name="hsnSac" required placeholder="8518" minLength={4} maxLength={8} value={formData.hsnSac} onChange={e => setFormData({...formData, hsnSac: e.target.value})} />
                <p className="text-[10px] text-zinc-500">4, 6 or 8 digits mandated by CBIC</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Input id="unit" name="unit" required placeholder="NOS" className="uppercase" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                <p className="text-[10px] text-zinc-500">UQC (e.g., NOS, KGS, MTR)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstRate">GST Rate % *</Label>
                <Input id="gstRate" name="gstRate" type="number" step="0.01" required placeholder="18" value={formData.gstRate} onChange={e => setFormData({...formData, gstRate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultPrice">Default Price (₹) *</Label>
                <Input id="defaultPrice" name="defaultPrice" type="number" step="0.01" required placeholder="1499.00" value={formData.defaultPrice} onChange={e => setFormData({...formData, defaultPrice: e.target.value})} />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input type="checkbox" id="isService" name="isService" checked={formData.isService} onChange={e => setFormData({...formData, isService: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
              <Label htmlFor="isService" className="font-normal cursor-pointer text-sm">This is a Service (SAC)</Label>
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isPending ? "Saving..." : "Save Item"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
