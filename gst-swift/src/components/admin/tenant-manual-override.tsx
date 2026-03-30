"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, ShieldAlert, Loader2 } from "lucide-react";
import { forceSaaSTierUpdate } from "@/app/admin/actions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function TenantManualOverride({ org }: { org: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [tier, setTier] = useState(org.tenantSettings?.subscriptionTier || "FREE");
  const [tokens, setTokens] = useState((org.tenantSettings?.aiOcrTokensRemaining || 0).toString());

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await forceSaaSTierUpdate(org.id, tier, parseInt(tokens));
      setOpen(false);
    } catch (err: any) {
      alert(`SaaS Override Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200">
          <Settings className="w-4 h-4 mr-2" /> Adjust
        </Button>
      </DialogTrigger>
      <DialogContent className="border-rose-200 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
             </div>
             <div>
               <DialogTitle className="text-rose-900">Tenant Manual Override</DialogTitle>
               <DialogDescription className="font-medium text-xs font-mono mt-1">{org.id}</DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Force Subscription Tier</label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger>
                <SelectValue placeholder="Select Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">FREE</SelectItem>
                <SelectItem value="PRO">PRO (₹999/mo)</SelectItem>
                <SelectItem value="ENTERPRISE">ENTERPRISE (₹1999/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700">Manual Llama Quota Injection</label>
            <Input 
              type="number" 
              value={tokens}
              onChange={(e) => setTokens(e.target.value)}
              className="font-mono text-indigo-600 font-bold text-lg h-12"
            />
          </div>
        </div>

        <DialogFooter className="bg-rose-50 -mx-6 -mb-6 p-4 rounded-b-lg border-t border-rose-100">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={loading} className="bg-rose-600 hover:bg-rose-700 font-bold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Commit God-Mode Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
