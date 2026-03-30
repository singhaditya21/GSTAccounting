"use client";

import { useTransition, useState } from "react";
import { setupSaaSTenant } from "./actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket } from "lucide-react";

export default function OnboardingPage() {
  const [isPending, startTransition] = useTransition();
  const [errorObj, setError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await setupSaaSTenant(formData);
        window.location.href = "/dashboard";
      } catch (e: any) {
        setError(e.message);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />

      <Card className="max-w-md w-full relative z-10 shadow-2xl border-indigo-100 dark:border-indigo-900/50">
        <form action={onSubmit}>
          <CardHeader className="text-center pb-8 border-b">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-200 dark:border-indigo-800 shadow-inner">
              <Rocket className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">Setup Your Workspace</CardTitle>
            <CardDescription className="pt-2 text-zinc-500">
              Welcome to GSTSwift Enterprise. Let's configure your mathematical physics and initialize your Private Ledger.
            </CardDescription>
            {errorObj && <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold rounded flex items-center justify-center">{errorObj}</div>}
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Legal Sub-Tenant Identifier</Label>
              <Input 
                name="companyName" 
                required 
                placeholder="e.g. Acme Corporation Pvt. Ltd." 
                className="h-12 font-medium bg-white dark:bg-zinc-900"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Primary GSTIN (Optional)</Label>
              <Input 
                name="gstin" 
                placeholder="27AADCB2230M1Z2" 
                className="h-12 font-mono text-sm uppercase bg-white dark:bg-zinc-900 tracking-widest"
              />
              <p className="text-[10px] text-zinc-400">Your Master Goods & Services Tax network identity.</p>
            </div>
          </CardContent>

          <CardFooter className="bg-zinc-50/50 dark:bg-zinc-900/30 pt-6 rounded-b-xl border-t">
            <Button disabled={isPending} type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-bold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all">
              {isPending ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : null}
              {isPending ? "Generating Secure Tenant Vault..." : "Initialize SaaS Engine ->"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
