"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash, ArrowRight } from "lucide-react";
import { AiCommandBar } from "./ai-command-bar";

export function InvoiceForm({ customers, products, branches }: any) {
  const [items, setItems] = useState([{ productId: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const handleAiHydration = (data: any) => {
    if (data.customerId) {
      setSelectedCustomerId(data.customerId);
    }
    if (data.items && data.items.length > 0) {
      // Validate mapping logic to prevent silent crashes
      const validatedItems = data.items.map((i: any) => ({
        productId: i.productId || "",
        quantity: i.quantity || 1,
        unitPrice: i.unitPrice || 0,
        discount: i.discount || 0
      }));
      setItems(validatedItems);
    }
  };

  const activeCustomer = customers.find((c: any) => c.id === selectedCustomerId);
  const activeCurrency = activeCustomer?.defaultCurrency || "INR";

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: activeCurrency }).format(amount);
  };

  const handleProductChange = (index: number, val: string) => {
    const newItems = [...items];
    const product = products.find((p: any) => p.id === val);
    newItems[index] = { ...newItems[index], productId: val, unitPrice: product?.defaultPrice || 0 };
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice - curr.discount), 0);
  };

  return (
    <div className="space-y-6">
      {/* SaaS Auto-Draft AI Tooling */}
      <AiCommandBar onAiParsed={handleAiHydration} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Billed To (Customer) *</Label>
          <Select name="customerId" required onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select a Customer" /></SelectTrigger>
            <SelectContent>
              {customers.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.legalName} {c.gstin && `(${c.gstin})`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Issue From (Branch) *</Label>
          <Select name="branchId" defaultValue={branches[0]?.id}>
            <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
            <SelectContent>
              {branches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name} ({b.state})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Invoice Date *</Label>
        <Input type="date" name="date" required defaultValue={new Date().toISOString().split("T")[0]} />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Item Name / HSN</th>
                <th className="px-4 py-3 font-medium text-right w-24">Qty</th>
                <th className="px-4 py-3 font-medium text-right w-32">Rate ({activeCurrency})</th>
                <th className="px-4 py-3 font-medium text-right w-32">Discount</th>
                <th className="px-4 py-3 font-medium text-right w-32">Amount</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <Select value={item.productId} onValueChange={(val) => handleProductChange(idx, val)}>
                      <SelectTrigger className="border-0 bg-transparent ring-0 focus:ring-0 shadow-none"><SelectValue placeholder="Select Item" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.hsnSac})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2">
                    <Input type="number" step="0.01" min="1" className="text-right border-0" value={item.quantity} onChange={e => {
                      const newItems = [...items]; newItems[idx].quantity = parseFloat(e.target.value) || 0; setItems(newItems);
                    }} />
                  </td>
                  <td className="px-4 py-2">
                    <Input type="number" step="0.01" className="text-right border-0" value={item.unitPrice} onChange={e => {
                      const newItems = [...items]; newItems[idx].unitPrice = parseFloat(e.target.value) || 0; setItems(newItems);
                    }} />
                  </td>
                  <td className="px-4 py-2">
                    <Input type="number" step="0.01" className="text-right border-0 text-rose-600" value={item.discount} onChange={e => {
                      const newItems = [...items]; newItems[idx].discount = parseFloat(e.target.value) || 0; setItems(newItems);
                    }} />
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {((item.quantity * item.unitPrice) - item.discount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                      <Trash className="w-4 h-4 text-rose-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t flex justify-between items-center">
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { productId: "", quantity: 1, unitPrice: 0, discount: 0 }])}>
              <Plus className="w-4 h-4 mr-2" /> Add Row
            </Button>
            <div className="text-right">
              <span className="text-zinc-500 mr-4">Taxable Subtotal:</span>
              <span className="text-xl font-bold text-indigo-700 dark:text-indigo-400">
                {formatMoney(calculateSubtotal())}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <input type="hidden" name="itemsData" value={JSON.stringify(items)} />
      
      <div className="flex justify-end pt-6 border-t font-medium">
         <p className="text-zinc-500 text-sm italic mr-6 mt-2">GST amounts will be algorithmically computed based on the specific Place of Supply.</p>
         <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8">
            Calculate Tax & Generate Invoice <ArrowRight className="ml-2 w-4 h-4" />
         </Button>
      </div>
    </div>
  );
}
