"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateTenantSettings } from "./actions";
import { Settings2, Loader2, ShieldCheck } from "lucide-react";

export function SettingsForm({ initialData, maxIdle }: { initialData: any, maxIdle: number }) {
  const [isPending, startTransition] = useTransition();
  const [errorObj, setError] = useState<string | null>(null);
  
  const [enablePO, setEnablePO] = useState(initialData.enableAutomatedPOEmails);
  const [idleTime, setIdleTime] = useState(initialData.idleTimeoutMinutes || 30);

  const onSubmit = (formData: FormData) => {
    formData.set("enableAutomatedPOEmails", enablePO ? "on" : "off");
    
    if (idleTime > maxIdle) {
      setError(`Platform Policy Violation: You cannot configure a timeout greater than the SaaS global limit of ${maxIdle} minutes.`);
      return;
    }
    
    formData.set("idleTimeoutMinutes", idleTime.toString());
    
    startTransition(async () => {
      try {
        await updateTenantSettings(formData);
        window.location.reload();
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  return (
    <Card>
      <form action={onSubmit}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" /> Automation Intelligence</CardTitle>
          <CardDescription>
            Configure exact operational thresholds to trigger platform-wide headless mechanics.
            {errorObj && <div className="text-red-500 font-bold mt-2">{errorObj}</div>}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Inventory Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 uppercase">Procurement Engine</h3>
            
            <div className="grid gap-2">
              <Label>Global Reorder Depletion Threshold (Units)</Label>
              <Input 
                name="inventoryReorderThreshold" 
                type="number" 
                defaultValue={initialData.inventoryReorderThreshold} 
                className="max-w-[200px]"
              />
              <p className="text-xs text-zinc-500">The exact quantitative limit before the algorithm alerts the PO engine.</p>
            </div>

            <div className="flex items-center justify-between border p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
              <div className="space-y-0.5">
                <Label className="text-base font-bold text-zinc-800 dark:text-zinc-200">Headless API Supplier Dispatches</Label>
                <div className="text-sm text-zinc-500 max-w-[80%]">
                  Empower GSTSwift to physically contact the Vendor email listed below the millisecond stock drops below threshold. 
                </div>
              </div>
              <Switch checked={enablePO} onCheckedChange={setEnablePO} />
            </div>

            {enablePO && (
              <div className="grid gap-2 mt-4 animate-in fade-in slide-in-from-top-4">
                <Label>Vendor Procurement Email</Label>
                <Input 
                  name="procurementEmail" 
                  type="email" 
                  placeholder="suppliers@b2b-manufacturer.com" 
                  defaultValue={initialData.procurementEmail || ""} 
                />
              </div>
            )}
          </div>
          {/* Security Bounds */}
          <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold tracking-tight text-rose-600 dark:text-rose-500 flex items-center gap-2 uppercase">
               <ShieldCheck className="w-4 h-4" /> Identity Security Parameters
            </h3>
            
            <div className="grid gap-2">
              <Label>Session Inactivity Logout (Minutes)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  name="idleTimeoutMinutes" 
                  type="number"
                  min={1}
                  max={maxIdle}
                  value={idleTime}
                  onChange={(e) => setIdleTime(parseInt(e.target.value) || 1)}
                  className="max-w-[200px]"
                />
                <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                  MAXIMUM LIMIT: {maxIdle} MINS
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                To comply with strict data-privacy laws, employees will be violently logged out and their browser token purged if no mouse movement is detected within this bound.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-zinc-50 dark:bg-zinc-900/30 border-t justify-end py-4">
          <Button disabled={isPending} type="submit" className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200">
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Configuration Map"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
