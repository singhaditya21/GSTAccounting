"use client";

import { useState } from "react";
import { updateGlobalPlatformSettings } from "@/app/admin/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Loader2 } from "lucide-react";

export function PlatformSettingsCard({ initialMaxIdle }: { initialMaxIdle: number }) {
  const [maxIdle, setMaxIdle] = useState(initialMaxIdle);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
     try {
       setLoading(true);
       await updateGlobalPlatformSettings(maxIdle);
       alert("Global Security Policy Enforced Successfully.");
     } catch (err: any) {
       alert("Failed to mutate Global node: " + err.message);
     } finally {
       setLoading(false);
     }
  };

  return (
    <Card className="border-rose-200 shadow-md bg-white dark:bg-zinc-950 border-t-4 border-t-rose-600">
      <CardHeader className="pb-4">
        <CardTitle className="text-rose-950 dark:text-rose-100 flex items-center gap-2">
           <ShieldAlert className="w-5 h-5 text-rose-600" /> Root Security Engine
        </CardTitle>
        <CardDescription>Govern absolute strict parameters that supersede all Tenant configurations universally.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
         <div className="space-y-2">
           <label className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Global Absolute Maximum Session Timeout (Minutes)</label>
           <Input 
             type="number" 
             value={maxIdle}
             onChange={(e) => setMaxIdle(parseInt(e.target.value) || 1)}
             className="max-w-[200px]"
             min={1}
           />
           <p className="text-xs text-zinc-500">
             No Tenant Admin will be allowed to configure an employee session expiry longer than this boundary mathematically.
           </p>
         </div>
      </CardContent>
      <CardFooter className="bg-rose-50/50 dark:bg-rose-950/10 border-t py-4">
         <Button onClick={handleUpdate} disabled={loading} className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700">
           {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Enforce Global Firewall"}
         </Button>
      </CardFooter>
    </Card>
  );
}
